"""Build the finale (era 5) prop kit in Blender and export one GLB per asset.

Run headless:
  blender -b -P tools/blender/finale.py -- <out_dir> [names...]
  e.g. "C:/Users/iangi/Tools/blender-4.2.23-windows-x64/blender.exe" -b -P tools/blender/finale.py -- "C:/dev/maximalist/public/models/finale"

Assets (metres; three.js / glTF axes after export: +Y up, +Z towards the viewer):
  saber.glb    hilt only, along +Y, origin at the guard; meshes grip / guard / pommel / emitter (blade attaches above y=EMIT_TOP)
  copilot.glb  centred; meshes core / shell / fins / ring_a (horizontal) / ring_b (vertical)
  arch.glb     spans x = +-2.4 in the XY plane, origin at the base centre; meshes body / trim
  pillar.glb   0.5 m square column, 4.1 m tall, origin at the base; meshes body / trim
  panel.glb    2.8 x 1.5 m board facing +Z, origin at the board centre, stand down to y=-2.4; meshes body / face / trim
  ring.glb     radius 2.9 in the XY plane (normal +Z), centred; meshes body / trim
  block.glb    0.9 (x) x 0.62 (y) x 0.62 (z), centred, recessed front facing +Z; meshes body / face / edge

Unlike car.py (which authors in Y-up coordinates and stands them up with a +90 deg X root), everything here is
modelled in Blender's own Z-up world (front = -Y) and the glTF exporter's export_yup does the conversion, so the
files come out Y-up with the front facing +Z. One material per object, so every named object is one three.js mesh.
Emissive trim / edge / core / emitter materials carry an Emission colour + strength (exported as glTF emissive);
the game recolours those meshes per piece. `face` meshes have 0..1 UVs (u left->right, v bottom->top) for the
word texture. Previews (Eevee + glare) land in tools/blender/previews/finale_<name>.png.
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.getcwd(), 'public', 'models', 'finale')
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'previews')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)

MAGENTA = (1.0, 0.36, 0.88)
CYAN = (0.30, 0.94, 1.0)
GREEN = (0.36, 1.0, 0.36)
EMIT_TOP = 0.05   # saber: top of the emitter cap (y, metres above the guard)


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, metallic=0.0, rough=0.45, emission=None, strength=4.0, alpha=1.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    m.diffuse_color = (*(emission or rgb), 1)
    m.metallic = metallic; m.roughness = rough
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    if coat and 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = coat
        bsdf.inputs['Coat Roughness'].default_value = 0.06
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
        m.diffuse_color = (*rgb, alpha)
    return m


def metal(name='metal', rgb=(0.07, 0.075, 0.11), rough=0.32):
    return mat(name, rgb, metallic=0.85, rough=rough, coat=0.4)


def obj_from_bm(name, bm, m, smooth=False):
    me = bpy.data.meshes.new(name)
    if smooth:   # smooth shading, but keep creases above ~35 degrees sharp so ridges and steps stay crisp
        bm.normal_update()
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(35):
                e.smooth = False
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    return ob


def box_bm(bm, size, loc, rot=None):
    """Add an axis box (size = full extents) to bm, optionally rotated about the origin by matrix rot."""
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    bmesh.ops.scale(bm, vec=Vector(size), verts=vs)
    if rot is not None:
        bmesh.ops.transform(bm, matrix=rot, verts=vs)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=vs)
    return vs


def cyl_bm(bm, r, depth, loc, segs=24, r2=None, rot=None):
    res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    vs = res['verts']
    if rot is not None:
        bmesh.ops.transform(bm, matrix=rot, verts=vs)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=vs)
    return vs


def torus_bm(bm, R, r, segs=48, rsegs=8, axis='Z', loc=(0, 0, 0), arc=2 * math.pi, square=False):
    """Torus / partial torus. axis = ring normal. square=True gives a square cross-section (rsegs ignored)."""
    prof = [(r, r), (-r, r), (-r, -r), (r, -r)] if square else [(r * math.cos(a), r * math.sin(a)) for a in [i / rsegs * 2 * math.pi for i in range(rsegs)]]
    full = abs(arc - 2 * math.pi) < 1e-6
    n = segs if full else segs + 1
    rings = []
    for i in range(n):
        a = arc * i / segs
        ca, sa = math.cos(a), math.sin(a)
        ring = []
        for (dr, dz) in prof:
            p = Vector(((R + dr) * ca, (R + dr) * sa, dz))
            ring.append(bm.verts.new(p))
        rings.append(ring)
    k = len(prof)
    for i in range(segs if full else segs):
        a_, b_ = rings[i], rings[(i + 1) % n]
        for j in range(k):
            bm.faces.new((a_[j], a_[(j + 1) % k], b_[(j + 1) % k], b_[j]))
    if not full:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    vs = [v for ring in rings for v in ring]
    if axis == 'Y':   # ring in the XZ plane
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=vs)
    elif axis == 'X':
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'), verts=vs)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=vs)
    return vs


def bevel(ob, width, segs=2, angle=40):
    b = ob.modifiers.new('bevel', 'BEVEL')
    b.width = width; b.segments = segs; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(angle)
    b.harden_normals = False
    ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
    ob.data.polygons.foreach_set('use_smooth', [True] * len(ob.data.polygons))
    return b


def face_quad(name, w, h, loc, m):
    """A front-facing (-Y) quad w (x) by h (z) with 0..1 UVs, u left->right and v bottom->top as seen from the front."""
    bm = bmesh.new()
    x0, x1, z0, z1 = -w / 2, w / 2, -h / 2, h / 2
    vs = [bm.verts.new((x0, 0, z0)), bm.verts.new((x1, 0, z0)), bm.verts.new((x1, 0, z1)), bm.verts.new((x0, 0, z1))]
    f = bm.faces.new(vs)
    f.normal_update()
    if f.normal.y > 0:
        f.normal_flip()
    uv = bm.loops.layers.uv.new('UVMap')
    for l in f.loops:
        l[uv].uv = ((l.vert.co.x - x0) / w, (l.vert.co.z - z0) / h)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=vs)
    return obj_from_bm(name, bm, m)


def boolean_cut(ob, cutter):
    mod = ob.modifiers.new('cut', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cutter; mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ---------------------------------------------------------------- assets
def build_saber():
    dark = mat('grip_rubber', (0.03, 0.03, 0.036), metallic=0.3, rough=0.55)
    steel = metal('hilt_steel', (0.55, 0.57, 0.62), rough=0.22)
    gun = metal('hilt_gunmetal', (0.08, 0.085, 0.1), rough=0.3)
    glow = mat('emitter_glow', (0.9, 0.9, 1.0), emission=(1.0, 1.0, 1.0), strength=4.0)
    # grip: lathe a ridged profile (8 ridges) from y=-0.215 to -0.02
    bm = bmesh.new()
    prof = [(0.0, -0.215), (0.0185, -0.215)]
    z = -0.205
    for i in range(8):
        prof += [(0.0185, z), (0.0185, z + 0.004), (0.0207, z + 0.006), (0.0207, z + 0.016), (0.0185, z + 0.018)]
        z += 0.0235
    prof += [(0.0185, -0.02), (0.0, -0.02)]
    vs = [bm.verts.new((r, 0, zz)) for r, zz in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=20, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    grip = obj_from_bm('grip', bm, dark, smooth=True)
    # guard: collar + flared ring + two short quillon nubs, and the slotted emitter shroud above it
    bm = bmesh.new()
    cyl_bm(bm, 0.026, 0.02, (0, 0, -0.01), segs=24)
    torus_bm(bm, 0.03, 0.007, segs=32, rsegs=8, loc=(0, 0, 0.0))
    for s in (-1, 1):
        box_bm(bm, (0.03, 0.012, 0.012), (s * 0.045, 0, 0.0))
    cyl_bm(bm, 0.022, 0.034, (0, 0, 0.017), segs=24, r2=0.019)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    guard = obj_from_bm('guard', bm, steel)
    bevel(guard, 0.002, 1, 35)
    # pommel: stepped cap with a ring
    bm = bmesh.new()
    cyl_bm(bm, 0.023, 0.018, (0, 0, -0.224), segs=24)
    cyl_bm(bm, 0.019, 0.02, (0, 0, -0.243), segs=24, r2=0.012)
    torus_bm(bm, 0.0215, 0.004, segs=24, rsegs=6, loc=(0, 0, -0.232))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    pommel = obj_from_bm('pommel', bm, gun)
    bevel(pommel, 0.0015, 1, 35)
    # emitter: the glowing cap the blade grows out of
    bm = bmesh.new()
    cyl_bm(bm, 0.017, 0.016, (0, 0, EMIT_TOP - 0.008), segs=24, r2=0.014)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    emitter = obj_from_bm('emitter', bm, glow, smooth=True)
    return dict(target=(0, 0, -0.095), cam=(0.36, -0.62, 0.16), lens=60)


def build_copilot():
    corem = mat('core_glow', (0.05, 0.3, 0.08), emission=GREEN, strength=3.0)
    glass = mat('shell_glass', (0.55, 0.95, 0.7), metallic=0.2, rough=0.05, alpha=0.32)
    finm = metal('fin_metal', (0.06, 0.08, 0.07), rough=0.28)
    ringm = mat('ring_glow', (0.1, 0.4, 0.15), emission=GREEN, strength=2.5)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.2)
    core = obj_from_bm('core', bm, corem, smooth=False)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.34)
    shell = obj_from_bm('shell', bm, glass, smooth=False)
    # fins: four swept blades around the equator + a keel above and below
    bm = bmesh.new()
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        rot = Matrix.Rotation(a, 4, 'Z')
        vs = box_bm(bm, (0.2, 0.018, 0.09), (0, 0, 0))
        bmesh.ops.transform(bm, matrix=Matrix.Shear('XZ', 4, (0, 0.35)), verts=vs)
        bmesh.ops.translate(bm, vec=Vector((0.4, 0, 0)), verts=vs)
        bmesh.ops.transform(bm, matrix=rot, verts=vs)
    for s in (-1, 1):
        cyl_bm(bm, 0.05, 0.08, (0, 0, s * 0.37), segs=6, r2=0.02 if s > 0 else 0.05, rot=None if s > 0 else None)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    fins = obj_from_bm('fins', bm, finm)
    bevel(fins, 0.006, 1, 30)
    # orbit rings with three beads each so their spin reads
    for name, R, axis in (('ring_a', 0.52, 'Z'), ('ring_b', 0.45, 'Y')):
        bm = bmesh.new()
        torus_bm(bm, R, 0.011, segs=64, rsegs=6, axis='Z')
        for k in range(3):
            a = k * 2 * math.pi / 3
            v = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.026)['verts']
            bmesh.ops.translate(bm, vec=Vector((R * math.cos(a), R * math.sin(a), 0)), verts=v)
        if axis == 'Y':
            bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=bm.verts)
        obj_from_bm(name, bm, ringm, smooth=True)
    return dict(target=(0, 0, 0), cam=(1.1, -1.5, 0.7), lens=50)


def trim_mat(col=MAGENTA):
    return mat('trim_glow', (0.03, 0.02, 0.04), emission=col, strength=3.0)


def build_arch():
    body_m = metal('arch_metal'); tm = trim_mat(MAGENTA)
    R, Y0, segs = 2.4, 0.35, 36
    bm = bmesh.new()
    # main beam: square-section half torus in the XZ plane, centred at height Y0
    vs = torus_bm(bm, R, 0.1, segs=segs, axis='Y', arc=math.pi, square=True)
    bmesh.ops.translate(bm, vec=Vector((0, 0, Y0)), verts=vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = obj_from_bm('body', bm, body_m)
    # ribs every 15 degrees with a heavier keystone, placed as separate geometry then joined
    bm = bmesh.new()
    for k in range(1, 12):
        a = k * math.pi / 12
        big = k == 6
        sz = (0.3, 0.3, 0.08) if not big else (0.38, 0.36, 0.16)
        vs = box_bm(bm, sz, (0, 0, 0))
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(-a, 3, "Y"), verts=vs)
        bmesh.ops.translate(bm, vec=Vector((R * math.cos(a), 0, Y0 + R * math.sin(a))), verts=vs)
    # legs + feet
    for s in (-1, 1):
        box_bm(bm, (0.2, 0.2, Y0 + 0.02), (s * R, 0, (Y0 + 0.02) / 2))
        box_bm(bm, (0.46, 0.46, 0.08), (s * R, 0, 0.04))
        box_bm(bm, (0.3, 0.3, 0.1), (s * R, 0, Y0 - 0.02))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ribs = obj_from_bm('ribs', bm, body_m)
    join(body, [ribs])
    bevel(body, 0.018, 2, 40)
    # trim: a strip along the inner face and two thin lines on the front face, both following the arch
    bm = bmesh.new()
    vs = torus_bm(bm, R - 0.104, 0.008, segs=segs * 2, axis='Y', arc=math.pi, square=True)
    bmesh.ops.scale(bm, vec=Vector((1, 5.0, 1)), verts=vs)   # wide, flat band on the inside of the curve
    bmesh.ops.translate(bm, vec=Vector((0, 0, Y0)), verts=vs)
    for rr in (R - 0.06, R + 0.06):
        vs = torus_bm(bm, rr, 0.009, segs=segs * 2, axis='Y', arc=math.pi, square=True)
        bmesh.ops.translate(bm, vec=Vector((0, -0.104, Y0)), verts=vs)
    for s in (-1, 1):   # lit band on each leg
        box_bm(bm, (0.21, 0.21, 0.035), (s * R, 0, 0.17))
    trim = obj_from_bm('trim', bm, tm)
    return dict(target=(0, 0, 1.4), cam=(3.4, -6.2, 2.4), lens=40)


def join(target, others):
    bpy.ops.object.select_all(action='DESELECT')
    for o in others:
        o.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    return target


def build_pillar():
    body_m = metal('pillar_metal'); tm = trim_mat(CYAN)
    bm = bmesh.new()
    box_bm(bm, (0.72, 0.72, 0.22), (0, 0, 0.11))           # plinth
    box_bm(bm, (0.6, 0.6, 0.1), (0, 0, 0.27))
    box_bm(bm, (0.44, 0.44, 3.62), (0, 0, 0.32 + 1.81))    # shaft
    for zc in (1.35, 2.65):                                 # collars
        box_bm(bm, (0.54, 0.54, 0.14), (0, 0, zc))
    box_bm(bm, (0.6, 0.6, 0.14), (0, 0, 3.93))              # capital
    box_bm(bm, (0.5, 0.5, 0.08), (0, 0, 4.06))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = obj_from_bm('body', bm, body_m)
    bevel(body, 0.03, 2, 40)
    # trim: a vertical strip down the middle of each face (broken at the collars), a lit band under the capital,
    # and a glowing crown on top
    bm = bmesh.new()
    spans = [(0.4, 1.26), (1.44, 2.56), (2.74, 3.82)]
    for k in range(4):
        rot = Matrix.Rotation(k * math.pi / 2, 4, 'Z')
        for z0, z1 in spans:
            vs = box_bm(bm, (0.05, 0.02, z1 - z0), (0, -0.225, (z0 + z1) / 2))
            bmesh.ops.transform(bm, matrix=rot, verts=vs)
    box_bm(bm, (0.462, 0.462, 0.04), (0, 0, 3.84))
    box_bm(bm, (0.42, 0.42, 0.04), (0, 0, 4.11))
    trim = obj_from_bm('trim', bm, tm)
    return dict(target=(0, 0, 2.0), cam=(3.0, -5.6, 2.8), lens=40)


def build_panel():
    body_m = metal('panel_metal'); tm = trim_mat(MAGENTA)
    screen = mat('panel_screen', (0.02, 0.02, 0.05), metallic=0.0, rough=0.4, emission=(0.12, 0.1, 0.25), strength=1.0)
    W_, H_, D_ = 2.8, 1.5, 0.12
    bm = bmesh.new()
    box_bm(bm, (W_, D_, H_), (0, 0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = obj_from_bm('body', bm, body_m)
    bevel(body, 0.035, 3, 40)
    cut = bpy.data.objects.new('cutter', bpy.data.meshes.new('cutter')); bpy.context.collection.objects.link(cut)
    bm = bmesh.new(); box_bm(bm, (2.6, 0.08, 1.3), (0, -D_ / 2, 0)); bm.to_mesh(cut.data); bm.free()
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier='bevel')
    boolean_cut(body, cut)
    # stand: post, brace and foot (the panel's centre sits 2.4 m up in the arena)
    bm = bmesh.new()
    box_bm(bm, (0.16, 0.16, 1.7), (0, 0.04, -H_ / 2 - 0.85))
    box_bm(bm, (0.9, 0.1, 0.1), (0, 0.04, -H_ / 2 + 0.02))
    box_bm(bm, (0.7, 0.5, 0.08), (0, 0.04, -2.36))
    box_bm(bm, (0.26, 0.26, 0.2), (0, 0.04, -2.22))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    stand = obj_from_bm('stand', bm, body_m)
    bevel(stand, 0.015, 1, 40)
    bpy.context.view_layer.objects.active = stand
    bpy.ops.object.modifier_apply(modifier='bevel')
    join(body, [stand])
    body.modifiers.new('wn', 'WEIGHTED_NORMAL')
    face_quad('face', 2.6, 1.3, (0, -D_ / 2 + 0.035, 0), screen)
    # trim: lit rails along the top and bottom of the screen recess, short uprights at the ends
    bm = bmesh.new()
    for s in (-1, 1):
        box_bm(bm, (2.5, 0.02, 0.025), (0, -D_ / 2 - 0.004, s * 0.69))
        box_bm(bm, (0.025, 0.02, 0.9), (s * 1.345, -D_ / 2 - 0.004, 0))
        box_bm(bm, (0.04, 0.03, 1.0), (s * 1.41, 0, 0))
    box_bm(bm, (0.17, 0.17, 0.03), (0, 0.04, -1.6))
    trim = obj_from_bm('trim', bm, tm)
    return dict(target=(0, 0, -0.5), cam=(2.4, -5.8, 0.9), lens=38)


def build_ring():
    body_m = metal('ring_metal'); tm = trim_mat(CYAN)
    R = 2.9
    bm = bmesh.new()
    torus_bm(bm, R, 0.1, segs=64, axis='Y', square=True)
    for k in range(8):   # bulkheads
        a = k * math.pi / 4
        vs = box_bm(bm, (0.42, 0.34, 0.34), (0, 0, 0))
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(-a, 3, 'Y'), verts=vs)
        bmesh.ops.translate(bm, vec=Vector((R * math.cos(a), 0, R * math.sin(a))), verts=vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = obj_from_bm('body', bm, body_m)
    bevel(body, 0.022, 2, 40)
    # trim: inner band split into 8 arcs between the bulkheads, a thin line on both faces, a light on each bulkhead
    bm = bmesh.new()
    for k in range(8):
        a0 = k * math.pi / 4 + 0.09
        vs = torus_bm(bm, R - 0.104, 0.008, segs=10, axis='Z', arc=math.pi / 4 - 0.18, square=True)
        bmesh.ops.scale(bm, vec=Vector((1, 1, 5.0)), verts=vs)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(a0, 3, 'Z'), verts=vs)
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=vs)
    for y in (-0.104, 0.104):
        vs = torus_bm(bm, R + 0.03, 0.008, segs=96, axis='Y', square=True)
        bmesh.ops.translate(bm, vec=Vector((0, y, 0)), verts=vs)
    for k in range(8):
        a = k * math.pi / 4
        for y in (-0.172, 0.172):
            vs = box_bm(bm, (0.2, 0.012, 0.06), (0, y, 0))
            bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(-a, 3, 'Y'), verts=vs)
            bmesh.ops.translate(bm, vec=Vector(((R + 0.06) * math.cos(a), 0, (R + 0.06) * math.sin(a))), verts=vs)
    trim = obj_from_bm('trim', bm, tm)
    return dict(target=(0, 0, 0), cam=(4.6, -7.4, 2.2), lens=40)


def build_block():
    body_m = mat('block_shell', (0.025, 0.025, 0.05), metallic=0.6, rough=0.28, coat=0.6)
    screen = mat('block_face', (0.02, 0.02, 0.06), rough=0.5, emission=(0.1, 0.08, 0.2), strength=1.0)
    em = mat('edge_glow', (0.03, 0.02, 0.04), emission=MAGENTA, strength=3.5)
    Wb, Hb, Db = 0.9, 0.62, 0.62
    bm = bmesh.new(); box_bm(bm, (Wb, Db, Hb), (0, 0, 0))
    body = obj_from_bm('body', bm, body_m)
    b = body.modifiers.new('bevel', 'BEVEL'); b.width = 0.06; b.segments = 3
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier='bevel')
    cut = bpy.data.objects.new('cutter', bpy.data.meshes.new('cutter')); bpy.context.collection.objects.link(cut)
    bm = bmesh.new(); box_bm(bm, (0.76, 0.06, 0.46), (0, -Db / 2, 0)); bm.to_mesh(cut.data); bm.free()
    boolean_cut(body, cut)
    body.data.polygons.foreach_set('use_smooth', [True] * len(body.data.polygons))
    body.modifiers.new('wn', 'WEIGHTED_NORMAL')
    face_quad('face', 0.76, 0.46, (0, -Db / 2 + 0.03 - 0.001, 0), screen)
    # edge: glowing lines along the 12 rounded edges (a wire cage that just breaks the bevel surface) + a recess rim
    cage = bpy.data.objects.new('cage', bpy.data.meshes.new('cage')); bpy.context.collection.objects.link(cage)
    bm = bmesh.new(); box_bm(bm, (Wb - 0.034, Db - 0.034, Hb - 0.034), (0, 0, 0)); bm.to_mesh(cage.data); bm.free()
    wf = cage.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.016; wf.use_even_offset = True; wf.use_replace = True
    bpy.context.view_layer.objects.active = cage
    bpy.ops.object.modifier_apply(modifier='wf')
    bm = bmesh.new()
    for s in (-1, 1):
        box_bm(bm, (0.8, 0.012, 0.016), (0, -Db / 2 - 0.002, s * 0.245))
        box_bm(bm, (0.016, 0.012, 0.506), (s * 0.4, -Db / 2 - 0.002, 0))
    edge = obj_from_bm('edge', bm, em)
    cage.data.materials.append(em)
    join(edge, [cage])
    return dict(target=(0, 0, 0), cam=(1.15, -2.3, 0.85), lens=50)


ASSETS = {'saber': build_saber, 'copilot': build_copilot, 'arch': build_arch, 'pillar': build_pillar,
          'panel': build_panel, 'ring': build_ring, 'block': build_block}


def tri_count():
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    per = {}
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
    sc.eevee.taa_render_samples = 32
    sc.render.resolution_x, sc.render.resolution_y = 720, 450
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.03, 0.02, 0.06, 1); bg.inputs['Strength'].default_value = 1.0
    # key / rim / fill area lights in synthwave colours
    for nm, loc, energy, col, size in (('key', (3, -4, 5), 600, (1.0, 0.8, 0.75), 3),
                                       ('rim', (-4, 3, 3), 500, (0.4, 0.8, 1.0), 3),
                                       ('fill', (-3, -4, 0.5), 150, (1.0, 0.4, 0.85), 4)):
        L = bpy.data.lights.new(nm, 'AREA'); L.energy = energy; L.color = col; L.size = size
        lo = bpy.data.objects.new(nm, L); bpy.context.collection.objects.link(lo); lo.location = loc
        tc = lo.constraints.new('TRACK_TO'); tc.target = None
        lo.rotation_euler = (Vector(view['target']) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        lo.constraints.remove(tc)
    # scale the lights with the asset
    span = (Vector(view['cam']) - Vector(view['target'])).length
    for lo in [o for o in sc.objects if o.type == 'LIGHT']:
        lo.location = Vector(view['target']) + (lo.location.normalized() * span * 1.2)
        lo.rotation_euler = (Vector(view['target']) - lo.location).to_track_quat('-Z', 'Y').to_euler()
        lo.data.energy *= 2.5 * (span / 5.0) ** 2
        lo.data.size *= span / 5.0
    # floor so it reads as a prop on a stage
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=span * 4)
    fl = obj_from_bm('floor', bm, mat('floor', (0.02, 0.015, 0.035), metallic=0.6, rough=0.25))
    zmin = min((o.matrix_world @ Vector(c)).z for o in sc.objects if o.type == 'MESH' and o.name != 'floor' for c in o.bound_box)
    fl.location.z = zmin - 0.001
    # frame the whole asset: keep the view direction, pull back until its bounding sphere fits the vertical field of view
    pts = [o.matrix_world @ Vector(c) for o in sc.objects if o.type == 'MESH' and o.name != 'floor' for c in o.bound_box]
    lo_, hi_ = Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
    centre, radius = (lo_ + hi_) / 2, (hi_ - lo_).length / 2
    vfov = 2 * math.atan(18 * 450 / 720 / view['lens'])
    d = (Vector(view['cam']) - Vector(view['target'])).normalized()
    cam = bpy.data.cameras.new('cam'); cam.lens = view['lens']; cam.clip_start = 0.01
    co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co); co.location = centre + d * (radius * 1.08 / math.sin(vfov / 2))
    co.rotation_euler = (centre - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    # glare on the compositor so emissive strips bloom like they will in game
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new('CompositorNodeRLayers'); gl = nt.nodes.new('CompositorNodeGlare'); out = nt.nodes.new('CompositorNodeComposite')
    gl.glare_type = 'FOG_GLOW'; gl.quality = 'HIGH'; gl.threshold = 0.9; gl.size = 7; gl.mix = -0.55
    nt.links.new(rl.outputs['Image'], gl.inputs['Image']); nt.links.new(gl.outputs['Image'], out.inputs['Image'])
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = os.path.join(PREV, f'finale_{name}.png')
    bpy.ops.render.render(write_still=True)


def build(name):
    clear()
    view = ASSETS[name]()
    bpy.context.view_layer.update()
    n, per = tri_count()
    out = os.path.join(OUT, f'{name}.glb')
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, use_selection=False,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT', export_lights=False,
                              export_cameras=False)
    print(f'FINALE {name}: {n} tris {per} -> {out} ({os.path.getsize(out)} bytes)')
    preview(name, view)


which = ARGS[1:] if len(ARGS) > 1 else list(ASSETS)
for nm in which:
    build(nm)
