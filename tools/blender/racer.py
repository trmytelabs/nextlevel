"""Build the era 3 (Saturn racer) scenery kit in Blender and export one GLB per asset.

Run headless:
  blender -b -P tools/blender/racer.py -- <out_dir> [names...]
  e.g. "C:/Users/iangi/Tools/blender-4.2.23-windows-x64/blender.exe" -b -P tools/blender/racer.py -- "C:/dev/maximalist/public/models/racer"

Everything is modelled in Blender's Z-up world with the front facing -Y; export_yup turns that into glTF/three.js
axes (+Y up, front facing +Z). Metres, origin on the ground. One material per object, so each named object becomes
one three.js mesh, and src/era3gl.ts flattens each GLB into named parts (merged per material) for instancing.

  grandstand.glb  10 m section along X, seats rise away from the track (+Z in three = towards the track);
                  meshes: crowd (seat rows, takes the game's crowd texture; u = 1 per 8 m, v = 1 per 4 rows),
                  concrete, steel, roof, trim
  pits.glb        12 m pit garage section (three bays): wall, door (roller doors), sign (0..1 UVs), roof, trim
  gantry.glb      lyric gantry spanning x = +-14.2: truss legs + truss beam (truss), backing (panel), sign (23 x 3.8,
                  centre y = 7, 0..1 UVs), lamp housings (housing) and four lens meshes lamp_0..lamp_3 at the lanes
  pine.glb        low-poly conifer, 10 m tall: needles, bark
  tower.glb       light tower, lamp bank at ~16 m: steel, frame, lamp (emissive)
  billboard.glb   trackside billboard: face (13.4 x 4.4, centre y = 6.5, 0..1 UVs), frame, steel
Previews (Eevee, daylight) land in tools/blender/previews/racer_<name>.png.
"""
import bpy, bmesh, math, sys, os, tempfile
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.getcwd(), 'public', 'models', 'racer')
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'previews')
TMP = os.path.join(tempfile.gettempdir(), 'racer_tex')
os.makedirs(OUT, exist_ok=True); os.makedirs(PREV, exist_ok=True); os.makedirs(TMP, exist_ok=True)

ROADW = 11.0
LANES = [-0.62, -0.21, 0.21, 0.62]


def lin(h):
    """sRGB hex -> linear rgb tuple (Blender base colours are linear)."""
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, hexcol, rough=0.8, metallic=0.0, emission=None, strength=2.0, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    rgb = lin(hexcol)
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    m.diffuse_color = (*rgb, 1)
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*lin(emission), 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    if image is not None:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.interpolation = 'Closest'
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def pixel_image(name, w, h, fn):
    """Small pixel-art texture: fn(x, y) -> 0xRRGGBB (y = 0 is the bottom row). Saved as PNG so the exporter embeds it."""
    img = bpy.data.images.new(name, w, h, alpha=False)
    px = []
    for y in range(h):
        for x in range(w):
            c = fn(x, y)
            px += [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, 1.0]
    img.pixels = px
    path = os.path.join(TMP, name + '.png')
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()
    img.colorspace_settings.name = 'sRGB'
    return img


def hsh(n):
    x = math.sin(n * 127.1 + 311.7) * 43758.5453
    return x - math.floor(x)


def new_obj(name, bm, m, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    return ob


def box(bm, x0, x1, y0, y1, z0, z1):
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    bmesh.ops.scale(bm, vec=(x1 - x0, y1 - y0, z1 - z0), verts=vs)
    bmesh.ops.translate(bm, vec=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), verts=vs)
    return vs


def strut(bm, p0, p1, w):
    """Square-section bar of width w from p0 to p1."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    bmesh.ops.scale(bm, vec=(w, w, d.length), verts=vs)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=rot, verts=vs)
    bmesh.ops.translate(bm, vec=(p0 + p1) / 2, verts=vs)


def cyl(bm, r, depth, loc, segs=8, r2=None):
    res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=res['verts'])
    return res['verts']


def quad(bm, uvl, pts, uvs):
    vs = [bm.verts.new(p) for p in pts]
    f = bm.faces.new(vs)
    for l, uv in zip(f.loops, uvs):
        l[uvl].uv = uv
    return f


def front_quad(name, x0, x1, z0, z1, y, m):
    """Quad facing -Y (towards the track) with 0..1 UVs, u left->right, v bottom->top as seen from the front."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    f = quad(bm, uvl, [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], [(0, 0), (1, 0), (1, 1), (0, 1)])
    f.normal_update()
    if f.normal.y > 0:
        f.normal_flip()
    return new_obj(name, bm, m)


def truss(bm, a, b, w, h, bay, chord=0.16, web=0.09, axis='x'):
    """Rectangular box truss between points a and b (along x or z). w, h are the cross-section sizes."""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    n = max(1, round(L / bay))
    if axis == 'x':
        offs = [Vector((0, sy * w / 2, sz * h / 2)) for sy, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    else:
        offs = [Vector((sx * w / 2, sy * h / 2, 0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for o in offs:
        strut(bm, a + o, b + o, chord)
    for i in range(n + 1):
        p = a + (b - a) * (i / n)
        for k in range(4):
            strut(bm, p + offs[k], p + offs[(k + 1) % 4], web)
        if i < n:
            q = a + (b - a) * ((i + 1) / n)
            for k in range(4):
                s, e = (offs[k], offs[(k + 1) % 4]) if i % 2 == 0 else (offs[(k + 1) % 4], offs[k])
                strut(bm, p + s, q + e, web)


# ---------------------------------------------------------------- textures
def crowd_image():
    # 4 rows x 16 seats of 8x8 px people (blue seats, shirts, skin) - the game swaps in its own canvas texture
    shirts = [0xf04040, 0xf0d040, 0x40a0f0, 0xf0f0f0, 0x40d060, 0xf080c0, 0x202030, 0xff8a30]
    skins = [0xffd0a8, 0xe0a070, 0x9a6040, 0xf0c090]

    def px(x, y):
        cx, cy = x // 8, y // 8
        lx, ly = x % 8, y % 8
        seat = 0x2a4ad8 if (cx + cy) % 2 else 0x3050e0
        if ly == 0:
            return 0x1a2050
        if hsh(cx * 7 + cy * 13) < 0.12:
            return seat
        sh = shirts[int(hsh(cx * 3 + cy * 5) * 8)]
        sk = skins[int(hsh(cx * 11 + cy) * 4)]
        if 1 <= ly <= 4 and 1 <= lx <= 6:
            return sh
        if 5 <= ly <= 7 and 2 <= lx <= 5:
            return sk
        return seat
    return pixel_image('crowd_tex', 128, 32, px)


def door_image():
    return pixel_image('door_tex', 16, 32, lambda x, y: 0xb8c0cc if y % 4 else (0x7a8290 if y % 8 else 0x6a7280))


# ---------------------------------------------------------------- assets
def build_grandstand():
    crowd_m = mat('crowd', 0xffffff, rough=0.9, image=crowd_image())
    conc = mat('concrete', 0xd8d8de, rough=0.9)
    steel = mat('steel', 0xf0f0f4, rough=0.5)
    roof_m = mat('roof', 0xe4e6ec, rough=0.7)
    trim = mat('trim', 0xd82a3a, rough=0.6)
    N, T, RH, Z0, Y0 = 18, 1.0, 0.55, 1.5, 0.4      # rows, tread, riser, first-row height, first-row y
    XA = 4.2                                        # seating spans x = +-XA, aisles out to +-5
    BASE = -9.0                                     # structure runs below the origin so it buries into embankments
    # seat rows: tread + riser per row, crowd texture u = x / 8 m, v = 1 per 4 rows
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    for r in range(N):
        y0, z = Y0 + r * T, Z0 + r * RH
        v0 = r / 4
        quad(bm, uvl, [(-XA, y0, z), (XA, y0, z), (XA, y0 + T * 0.62, z), (-XA, y0 + T * 0.62, z)],
             [(0, v0), (2 * XA / 8, v0), (2 * XA / 8, v0 + 0.1), (0, v0 + 0.1)])
        quad(bm, uvl, [(-XA, y0 + T * 0.62, z), (XA, y0 + T * 0.62, z), (XA, y0 + T * 0.62, z + RH), (-XA, y0 + T * 0.62, z + RH)],
             [(0, v0 + 0.1), (2 * XA / 8, v0 + 0.1), (2 * XA / 8, v0 + 0.25), (0, v0 + 0.25)])
        quad(bm, uvl, [(-XA, y0 + T * 0.62, z + RH), (XA, y0 + T * 0.62, z + RH), (XA, y0 + T, z + RH), (-XA, y0 + T, z + RH)],
             [(0, v0 + 0.25), (2 * XA / 8, v0 + 0.25), (2 * XA / 8, v0 + 0.25), (0, v0 + 0.25)])
    new_obj('crowd', bm, crowd_m)
    # concrete: front parapet, aisle stairs (two steps per row), side walls down to BASE, back wall, vomitory
    bm = bmesh.new()
    box(bm, -5, 5, 0, Y0, BASE, Z0 + 1.0)
    for sx in (-1, 1):
        xa, xb = sorted((sx * XA, sx * 5.0))
        for r in range(N):
            y0, z = Y0 + r * T, Z0 + r * RH
            box(bm, xa, xb, y0, y0 + T / 2, BASE, z)
            box(bm, xa, xb, y0 + T / 2, y0 + T, BASE, z + RH / 2)
        # handrail posts along the aisle edge
    for r in range(N):
        y0, z = Y0 + r * T, Z0 + r * RH
        box(bm, -XA, XA, y0, y0 + T, BASE, z - 0.02)      # solid under the rows (hidden, keeps the section closed)
    YB = Y0 + N * T
    box(bm, -5, 5, YB, YB + 0.5, BASE, Z0 + N * RH + 1.4)
    new_obj('concrete', bm, conc)
    # steel: masts at the back, roof stays, aisle handrails
    bm = bmesh.new()
    ZR_B, ZR_F, YF = Z0 + N * RH + 4.6, Z0 + N * RH + 5.4, 4.0
    for x in (-2.5, 2.5):
        strut(bm, (x, YB + 0.25, BASE), (x, YB + 0.25, ZR_B + 3.4), 0.45)
        strut(bm, (x, YB + 0.25, ZR_B + 3.3), (x, YF + 1.0, ZR_F + 0.25), 0.14)
        strut(bm, (x, YB + 0.25, ZR_B + 3.3), (x, YF + 7.0, ZR_F + 0.05), 0.12)
    for sx in (-1, 1):
        x = sx * XA
        strut(bm, (x, Y0, Z0 + 1.0), (x, YB, Z0 + N * RH + 1.0), 0.07)
        for r in range(0, N, 3):
            strut(bm, (x, Y0 + r * T + 0.5, Z0 + r * RH + 0.3), (x, Y0 + r * T + 0.5, Z0 + r * RH + 1.1), 0.07)
    new_obj('steel', bm, steel)
    # cantilever roof slab, slight rise towards the track
    bm = bmesh.new()
    vs = box(bm, -5.05, 5.05, YF, YB + 0.6, -0.18, 0.18)
    for v in vs:
        t = (v.co.y - YF) / (YB + 0.6 - YF)
        v.co.z += ZR_F + (ZR_B - ZR_F) * t
    new_obj('roof', bm, roof_m)
    # red fascia along the roof's front edge and a red cap on the parapet
    bm = bmesh.new()
    box(bm, -5.05, 5.05, YF - 0.25, YF + 0.05, ZR_F - 0.55, ZR_F + 0.45)
    box(bm, -5, 5, -0.05, Y0 + 0.05, Z0 + 1.0, Z0 + 1.2)
    new_obj('trim', bm, trim)
    return {'cam': (-14, -24, 9), 'target': (0, 8, 7), 'lens': 32}


def build_pits():
    wall = mat('wall', 0xe8e8ec, rough=0.85)
    door = mat('door', 0xffffff, rough=0.6, image=door_image())
    sign = mat('sign', 0x1a2a7a, rough=0.6)
    roof = mat('roof', 0x8a8e98, rough=0.85)
    trim = mat('trim', 0xd82a3a, rough=0.6)
    bm = bmesh.new()
    box(bm, -6, 6, 0.6, 9, 0, 4.7)                         # main block
    for x0, x1 in ((-6, -5.7), (-2.3, -1.7), (1.7, 2.3), (5.7, 6)):
        box(bm, x0, x1, 0.0, 0.6, 0, 3.7)                  # piers between bays
    box(bm, -6, 6, 0.0, 0.6, 3.5, 3.75)                    # lintel
    box(bm, 2.0, 4.2, 5.5, 7.5, 4.9, 5.7)                  # rooftop plant
    new_obj('wall', bm, wall)
    # roller doors: recessed panels with slat texture, 4 texture repeats tall
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    for cx in (-4.0, 0.0, 4.0):
        x0, x1 = cx - 1.7, cx + 1.7
        quad(bm, uvl, [(x0, 0.58, 0), (x1, 0.58, 0), (x1, 0.58, 3.5), (x0, 0.58, 3.5)], [(0, 0), (2, 0), (2, 3.5), (0, 3.5)])
        quad(bm, uvl, [(x0, 0.3, 3.2), (x1, 0.3, 3.2), (x1, 0.58, 3.5), (x0, 0.58, 3.5)], [(0, 0), (2, 0), (2, 0.2), (0, 0.2)])
    bm.normal_update()
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    new_obj('door', bm, door)
    front_quad('sign', -6, 6, 3.78, 4.68, -0.06, sign)
    bm = bmesh.new()
    box(bm, -6.05, 6.05, 0.6, 9.05, 4.7, 4.9)              # roof slab
    new_obj('roof', bm, roof)
    bm = bmesh.new()
    box(bm, -6.05, 6.05, -0.7, 0.6, 4.7, 5.25)             # red roof edge, overhanging the apron
    box(bm, -6.05, 6.05, -0.05, 0.6, 3.75, 3.8)
    new_obj('trim', bm, trim)
    return {'cam': (-9, -16, 6), 'target': (0, 3, 2.5), 'lens': 32}


def build_gantry():
    tr = mat('truss', 0xd82a3a, rough=0.55)
    legm = mat('legs', 0x3a4a6a, rough=0.6)
    panel = mat('panel', 0x0a0c1c, rough=0.7)
    hous = mat('housing', 0x22242c, rough=0.5)
    sign = mat('sign', 0xffffff, rough=0.8)
    XL, ZB0, ZB1 = 13.6, 8.8, 10.2
    bm = bmesh.new()
    truss(bm, (-14.2, 0, (ZB0 + ZB1) / 2), (14.2, 0, (ZB0 + ZB1) / 2), 1.2, ZB1 - ZB0, 1.42, axis='x')
    new_obj('truss', bm, tr)
    bm = bmesh.new()
    for sx in (-1, 1):
        truss(bm, (sx * XL, 0, -1.5), (sx * XL, 0, ZB0), 1.0, 1.0, 1.05, axis='z')
        box(bm, sx * XL - 0.9, sx * XL + 0.9, -0.9, 0.9, -1.5, 0.25)   # footing
        box(bm, sx * XL - 0.7, sx * XL + 0.7, -0.7, 0.7, ZB0 - 0.1, ZB0 + 0.05)  # cap plate
    new_obj('legs', bm, legm)
    bm = bmesh.new()
    box(bm, -11.95, 11.95, -0.95, -0.65, 4.85, 9.1)        # sign backing / cabinet
    for x in (-8.0, 8.0):
        box(bm, x - 0.15, x + 0.15, -0.8, 0.0, 9.0, ZB0 + 0.1)  # hangers
    new_obj('backing', bm, panel)
    front_quad('sign', -11.5, 11.5, 5.1, 8.9, -0.97, sign)
    bm = bmesh.new()
    for k, ln in enumerate(LANES):
        x = ln * ROADW
        box(bm, x - 1.15, x + 1.15, -0.7, 0.3, ZB1, ZB1 + 0.85)          # housing
        box(bm, x - 1.2, x + 1.2, -1.05, 0.3, ZB1 + 0.85, ZB1 + 0.95)    # visor
    new_obj('housing', bm, hous)
    for k, ln in enumerate(LANES):
        x = ln * ROADW
        lm = mat(f'lamp_{k}', 0x3cff6a if k == 1 else 0x203028, rough=0.3, emission=0x3cff6a if k == 1 else None, strength=3)
        front_quad(f'lamp_{k}', x - 1.0, x + 1.0, ZB1 + 0.1, ZB1 + 0.75, -0.72, lm)
    return {'cam': (-10, -30, 4), 'target': (0, 0, 5), 'lens': 30}


def build_pine():
    needles = mat('needles', 0x2a6a34, rough=0.9)
    bark = mat('bark', 0x6a4a2a, rough=0.95)
    bm = bmesh.new()
    cyl(bm, 0.32, 3.2, (0, 0, 1.6), segs=6, r2=0.16)
    new_obj('bark', bm, bark)
    bm = bmesh.new()
    tiers = [(1.6, 4.6, 3.0), (3.4, 6.1, 2.55), (5.1, 7.5, 2.05), (6.7, 8.8, 1.55), (8.2, 10.0, 1.0)]
    S = 12
    for ti, (zb, zt, r) in enumerate(tiers):
        # jagged, drooping skirt (alternate long/short branch tips), a mid ring, then the tip
        rot = ti * 0.37
        bot, mid = [], []
        for i in range(S):
            a = rot + i / S * 2 * math.pi
            rr = r * (1.0 if i % 2 == 0 else 0.72) * (0.92 + 0.16 * hsh(ti * 31 + i))
            droop = -0.35 if i % 2 == 0 else 0.1
            bot.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, zb + droop)))
            rm = r * 0.55
            am = a + math.pi / S
            mid.append(bm.verts.new((math.cos(am) * rm, math.sin(am) * rm, zb + (zt - zb) * 0.42)))
        top = bm.verts.new((0.05 * math.sin(ti), 0.05 * math.cos(ti), zt))
        inner = bm.verts.new((0, 0, zb + 0.45))
        for i in range(S):
            j = (i + 1) % S
            bm.faces.new((bot[i], bot[j], mid[i]))
            bm.faces.new((mid[i], bot[j], mid[j]))
            bm.faces.new((mid[i], mid[j], top))
            bm.faces.new((bot[j], bot[i], inner))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    new_obj('needles', bm, needles)
    return {'cam': (-8, -14, 6), 'target': (0, 0, 5), 'lens': 35}


def build_tower():
    steel = mat('steel', 0xc8ccd4, rough=0.5)
    frame = mat('frame', 0x3a3e48, rough=0.6)
    lamp = mat('lamp', 0xfff4c8, rough=0.3, emission=0xfff4c8, strength=4)
    bm = bmesh.new()
    cyl(bm, 0.45, 16.2, (0, 0, 8.1), segs=8, r2=0.24)
    box(bm, -0.8, 0.8, -0.8, 0.8, 0, 0.6)                  # plinth
    for i in range(14):                                    # ladder rungs on the back
        box(bm, -0.25, 0.25, 0.38 + i * 0.0, 0.46, 1.0 + i * 1.05, 1.06 + i * 1.05)
    strut(bm, (0, 0, 15.6), (0, -0.9, 16.4), 0.18)
    new_obj('steel', bm, steel)
    bm = bmesh.new()
    box(bm, -2.3, 2.3, -1.25, -0.85, 16.2, 18.8)           # lamp bank back plate
    box(bm, -2.4, 2.4, -1.6, -0.2, 16.0, 16.15)            # catwalk
    strut(bm, (-2.4, -1.6, 16.15), (-2.4, -1.6, 17.0), 0.06)
    strut(bm, (2.4, -1.6, 16.15), (2.4, -1.6, 17.0), 0.06)
    strut(bm, (-2.4, -1.6, 17.0), (2.4, -1.6, 17.0), 0.06)
    for r in range(3):
        for c in range(4):
            x, z = -1.7 + c * 1.13, 16.6 + r * 0.85
            box(bm, x - 0.46, x + 0.46, -1.45, -1.25, z - 0.36, z + 0.36)  # lamp hoods
    new_obj('frame', bm, frame)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    for r in range(3):
        for c in range(4):
            x, z = -1.7 + c * 1.13, 16.6 + r * 0.85
            quad(bm, uvl, [(x - 0.38, -1.46, z - 0.3), (x + 0.38, -1.46, z - 0.3), (x + 0.38, -1.46, z + 0.3), (x - 0.38, -1.46, z + 0.3)],
                 [(0, 0), (1, 0), (1, 1), (0, 1)])
    bm.normal_update()
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    new_obj('lamp', bm, lamp)
    return {'cam': (-9, -16, 10), 'target': (0, 0, 9), 'lens': 30}


def build_billboard():
    face = mat('face', 0xffffff, rough=0.7)
    frame = mat('frame', 0xf2f2f6, rough=0.55)
    steel = mat('steel', 0x50586a, rough=0.6)
    front_quad('face', -6.7, 6.7, 4.3, 8.7, -0.12, face)
    bm = bmesh.new()
    box(bm, -7.1, 7.1, -0.25, 0.25, 8.7, 9.1)
    box(bm, -7.1, 7.1, -0.25, 0.25, 3.9, 4.3)
    box(bm, -7.1, -6.7, -0.25, 0.25, 4.3, 8.7)
    box(bm, 6.7, 7.1, -0.25, 0.25, 4.3, 8.7)
    box(bm, -7.0, 7.0, -0.1, 0.25, 4.3, 8.7)               # back panel
    new_obj('frame', bm, frame)
    bm = bmesh.new()
    for x in (-4.5, 4.5):
        box(bm, x - 0.22, x + 0.22, 0.3, 0.74, 0, 8.9)         # legs behind the board
        strut(bm, (x, 0.5, 0.0), (x, 3.0, 0.0 + 0.3), 0.2)
        strut(bm, (x, 3.0, 0.3), (x, 0.55, 4.2), 0.2)          # rear brace
        box(bm, x - 0.5, x + 0.5, 0.0, 1.0, -0.6, 0.25)        # footing
    for x in (-3.4, 3.4):                                       # lamp arms over the top
        strut(bm, (x, 0.2, 9.1), (x, -1.4, 9.7), 0.1)
        box(bm, x - 0.45, x + 0.45, -1.7, -1.1, 9.55, 9.8)
    new_obj('steel', bm, steel)
    return {'cam': (-8, -18, 5), 'target': (0, 0, 5), 'lens': 32}


ASSETS = {'grandstand': build_grandstand, 'pits': build_pits, 'gantry': build_gantry, 'pine': build_pine,
          'tower': build_tower, 'billboard': build_billboard}


def tri_count():
    dg = bpy.context.evaluated_depsgraph_get()
    n, per = 0, {}
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH':
            continue
        e = ob.evaluated_get(dg); me = e.to_mesh()
        me.calc_loop_triangles(); per[ob.name] = len(me.loop_triangles); n += per[ob.name]
        e.to_mesh_clear()
    return n, per


def preview(name, view):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.eevee.taa_render_samples = 16
    sc.render.resolution_x, sc.render.resolution_y = 720, 450
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*lin(0x8cc4f0), 1); bg.inputs['Strength'].default_value = 0.9
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.5; sun.color = (1.0, 0.96, 0.88); sun.angle = math.radians(3)
    so = bpy.data.objects.new('sun', sun); bpy.context.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(-35))
    pts = [o.matrix_world @ Vector(c) for o in sc.objects if o.type == 'MESH' for c in o.bound_box]
    lo_, hi_ = Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
    centre, radius = (lo_ + hi_) / 2, (hi_ - lo_).length / 2
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=radius * 6)
    new_obj('floor', bm, mat('floor', 0x4aa040, rough=0.95))
    vfov = 2 * math.atan(18 * 450 / 720 / view['lens'])
    d = (Vector(view['cam']) - Vector(view['target'])).normalized()
    cam = bpy.data.cameras.new('cam'); cam.lens = view['lens']; cam.clip_start = 0.05; cam.clip_end = 2000
    co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co)
    co.location = centre + d * (radius * 1.02 / math.sin(vfov / 2))
    co.rotation_euler = (centre - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = os.path.join(PREV, f'racer_{name}.png')
    bpy.ops.render.render(write_still=True)


def build(name):
    clear()
    view = ASSETS[name]()
    bpy.context.view_layer.update()
    n, per = tri_count()
    out = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, use_selection=False,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT', export_lights=False,
                              export_cameras=False)
    print(f'RACER {name}: {n} tris {per} -> {out} ({os.path.getsize(out)} bytes)')
    preview(name, view)


which = ARGS[1:] if len(ARGS) > 1 else list(ASSETS)
for nm in which:
    build(nm)
