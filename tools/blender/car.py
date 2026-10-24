"""Build Daytona-style stock cars in Blender and export them as GLB for the racer.

Run headless:  blender -b -P tools/blender/car.py -- <out_dir> [indices...]
Produces car_0.glb .. car_12.glb (player first). Previews (front and rear three-quarter
renders) and the livery sheets land in tools/blender/previews/.

Everything is procedural and deterministic:
  * the body is lofted from analytic cross-sections (hood line, cowl, raked windshield,
    roof, fastback rear glass, short deck) and smoothed with one level of subdivision;
  * wheel wells are cut with booleans and lined with a dark arch;
  * the livery (stripes, door and roof numbers, sponsor words, contingency stickers) is a
    single 1024x1024 texture *rendered by Blender itself* from flat text and planes, then
    mapped onto the body with a three-band box projection (top / right / left), so the
    paint reads like the sprite-textured cars of a Saturn-era racer and the mesh stays
    around 4-5k triangles with no decal geometry;
  * materials are Principled BSDF so the glTF carries PBR colour, roughness and clearcoat.
"""
import bpy, bmesh, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.getcwd(), 'public', 'models')
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'previews')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)

# ---------- liveries ----------
# body, stripe, stripe2, number, sponsor (rear quarter), sponsor2 (front fender), style, spoiler
#   style 0 = twin hood/roof stripes   1 = single centre stripe + side wedge
#   style 2 = side swoosh, clean roof  3 = checker band on the hood + roof
#   spoiler 'blade' = low deck blade,  'wing' = tall wing with end plates
LIVERY = [
    ((0.96, 0.96, 0.96), (0.85, 0.12, 0.18), (0.14, 0.28, 0.85), '41', 'MAXIMAL', 'GoA', 0, 'wing'),
    ((0.95, 0.76, 0.14), (0.05, 0.05, 0.06), (0.05, 0.05, 0.06), '7', 'TURN IT UP', 'ONE DESK', 1, 'blade'),
    ((0.16, 0.72, 0.33), (1, 1, 1), (1, 1, 1), '12', 'SPEED OF LIGHT', 'PIPELINE', 2, 'blade'),
    ((0.16, 0.42, 0.9), (1, 1, 1), (1, 0.88, 0.35), '3', 'EVERYTHING', 'THEN SOME', 0, 'wing'),
    ((1.0, 0.46, 0.08), (0.05, 0.05, 0.06), (1, 1, 1), '22', 'BOX TALKS', 'BACK', 3, 'blade'),
    ((0.52, 0.22, 0.85), (1, 0.88, 0.35), (1, 0.88, 0.35), '9', 'NO BACKLOG', 'RACING', 1, 'wing'),
    ((0.08, 0.08, 0.1), (0.85, 0.12, 0.18), (0.85, 0.12, 0.18), '14', 'HUNDRED', 'HANDS', 2, 'blade'),
    ((0.12, 0.78, 0.75), (1, 1, 1), (0.05, 0.05, 0.06), '28', 'DESK CO', 'TOOLS', 0, 'blade'),
    ((0.85, 0.12, 0.18), (1, 1, 1), (1, 1, 1), '5', 'ASK ONCE', 'ANSWERS', 3, 'wing'),
    ((1, 1, 1), (0.16, 0.72, 0.33), (0.16, 0.72, 0.33), '17', 'SECTOR 07', 'BUILDS', 1, 'blade'),
    ((0.9, 0.22, 0.48), (1, 1, 1), (1, 1, 1), '33', 'LEVEL UP', 'GARAGE', 2, 'wing'),
    ((0.6, 0.6, 0.66), (1.0, 0.46, 0.08), (0.05, 0.05, 0.06), '8', 'THREAD', 'THE GAP', 0, 'blade'),
    ((0.1, 0.16, 0.48), (1, 0.88, 0.35), (1, 0.88, 0.35), '44', 'WIRE', 'LIGHTS', 3, 'wing'),
]

Y0 = 0.34          # floor height (wheel centre is 0.44, tyre radius 0.44)
HALF_L = 2.6       # the body runs z = -2.6 (rear) .. +2.6 (front)
STATION_Z = [-2.6, -2.38, -2.1, -1.75, -1.45, -1.15, -0.85, -0.5, -0.12, 0.3, 0.58, 0.84, 1.05, 1.35, 1.75, 2.15, 2.42, 2.6]
# atlas bands in v: left side [0, 0.28), right side [0.28, 0.56), top [0.56, 1]
BAND_L, BAND_R, BAND_T = (0.0, 0.28), (0.28, 0.56), (0.56, 1.0)
SIDE_H = 0.75      # metres of body height covered by a side band (floor .. sill)
TOP_W = 1.1        # half width covered by the top band


def lerp_keys(keys, z):
    """Piecewise-linear interpolation of (z, value) pairs."""
    if z <= keys[0][0]:
        return keys[0][1]
    for (z0, v0), (z1, v1) in zip(keys, keys[1:]):
        if z <= z1:
            t = (z - z0) / (z1 - z0)
            t = t * t * (3 - 2 * t)  # smoothstep for gentle curvature
            return v0 + (v1 - v0) * t
    return keys[-1][1]


W_KEYS = [(-2.6, 0.86), (-2.3, 0.98), (-1.9, 1.05), (-1.5, 1.07), (1.3, 1.07), (1.9, 1.03), (2.35, 0.95), (2.6, 0.86)]
YS_KEYS = [(-2.6, 0.94), (-2.1, 1.0), (-1.6, 1.02), (0.9, 1.02), (1.5, 0.99), (2.1, 0.93), (2.6, 0.84)]
YT_KEYS = [(-2.6, 0.94), (-1.75, 1.0), (-1.4, 1.2), (-0.95, 1.42), (-0.5, 1.46), (-0.1, 1.46), (0.3, 1.43), (0.6, 1.3), (0.84, 1.14), (1.05, 1.03), (1.35, 1.0), (2.6, 0.84)]


def profile(z):
    w = lerp_keys(W_KEYS, z)
    ys = lerp_keys(YS_KEYS, z)
    yt = max(lerp_keys(YT_KEYS, z), ys + 0.04)
    cab = min(1.0, max(0.0, (yt - ys - 0.05) / 0.12))   # 0 = hood/deck, 1 = full cabin
    return w, ys, yt, cab


def section(z):
    """Right half of the cross-section at z, floor to roof centre: 9 points (x, y)."""
    w, ys, yt, cab = profile(z)
    wg = 0.64 + (1 - cab) * (w * 0.3 - 0.64)             # roof half width, widens on the hood
    pts_cab = [(w - 0.07, ys + 0.04), (wg + 0.10, yt - 0.05), (wg, yt), (0.0, yt + 0.015)]
    pts_hood = [(w * 0.9, ys + 0.03), (w * 0.6, ys + 0.065), (w * 0.3, ys + 0.08), (0.0, ys + 0.085)]
    top = [(a[0] * cab + b[0] * (1 - cab), a[1] * cab + b[1] * (1 - cab)) for a, b in zip(pts_cab, pts_hood)]
    return [(w * 0.9, Y0), (w * 0.99, Y0 + 0.14), (w, Y0 + 0.46), (w, ys - 0.06), (w * 0.975, ys)] + top


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, metallic=0.0, rough=0.45, emission=None, alpha=1.0, coat=0.0, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    m.diffuse_color = (*rgb, 1); m.metallic = metallic; m.roughness = rough
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = coat
        bsdf.inputs['Coat Roughness'].default_value = 0.08
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 3.0
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    if image is not None:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        tex.interpolation = 'Linear'
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


# ---------- livery sheet: a flat 2D scene rendered with Workbench ----------
def flat_mat(rgb):
    m = bpy.data.materials.new('flat')
    m.diffuse_color = (*rgb, 1)
    return m


def rect(u, v, w, h, rgb, layer=1, rot=0.0):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(u, v, 0.001 * layer), rotation=(0, 0, rot))
    ob = bpy.context.active_object
    ob.scale = (w, h, 1)
    ob.data.materials.append(flat_mat(rgb))
    return ob


def ellipse(u, v, rx, ry, rgb, layer=1):
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=1, fill_type='NGON', location=(u, v, 0.001 * layer))
    ob = bpy.context.active_object
    ob.scale = (rx, ry, 1)
    ob.data.materials.append(flat_mat(rgb))
    return ob


FONT = None
def font():
    global FONT
    if FONT is None:
        for f in (r'C:\Windows\Fonts\ariblk.ttf', r'C:\Windows\Fonts\impact.ttf', r'C:\Windows\Fonts\arialbd.ttf'):
            try:
                FONT = bpy.data.fonts.load(f)
                break
            except Exception:
                pass
    return FONT


def text(txt, u, v, size, rgb, layer=2, rot=0.0, italic=0.0):
    bpy.ops.object.text_add(location=(u, v, 0.001 * layer), rotation=(0, 0, rot))
    ob = bpy.context.active_object
    ob.data.body = txt
    ob.data.size = size
    ob.data.align_x = 'CENTER'
    ob.data.align_y = 'CENTER'
    ob.data.shear = italic
    ob.data.resolution_u = 4
    f = font()
    if f:
        ob.data.font = f
    ob.data.materials.append(flat_mat(rgb))
    return ob


def dark_on(rgb):
    """Pick a legible ink for text drawn over rgb."""
    return (0.06, 0.06, 0.07) if (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 0.45 else (1, 1, 1)


def render_sheet(idx, liv, path):
    """Render the 1024x1024 livery atlas: top band (v .56..1), right side (.28..56), left side (0..28)."""
    clear()
    body, s1, s2, num, spon, spon2, style, _ = liv
    ink = dark_on(body)
    s1_ink, s2_ink = dark_on(s1), dark_on(s2)
    # band backgrounds
    for (v0, v1) in (BAND_L, BAND_R, BAND_T):
        rect(0.5, (v0 + v1) / 2, 1.0, v1 - v0, body, layer=0)

    # ---- top band: u along the car (rear u=0 .. front u=1), v across (left x<0 low, right high) ----
    tv0, tv1 = BAND_T
    tc = (tv0 + tv1) / 2
    xv = lambda x: tc + (x / TOP_W) * (tv1 - tv0) / 2        # car x -> sheet v
    uz = lambda z: (z + HALF_L) / (2 * HALF_L)                # car z -> sheet u
    if style == 0:   # twin stripes with a pinstripe gap
        for sgn in (-1, 1):
            rect(0.5, xv(sgn * 0.3), 1.0, 0.055, s1, 1)
            rect(0.5, xv(sgn * 0.3 + sgn * 0.085), 1.0, 0.012, s2, 1)
    elif style == 1: # one wide centre stripe flanked by thin ones
        rect(0.5, tc, 1.0, 0.09, s1, 1)
        for sgn in (-1, 1):
            rect(0.5, xv(sgn * 0.42), 1.0, 0.018, s2, 1)
    elif style == 2: # clean roof, hood accent chevrons
        for k in range(4):
            rect(uz(1.3 + k * 0.28), tc, 0.025, 0.26, s1 if k % 2 == 0 else s2, 1, rot=0.0)
    else:            # checker band across the hood and roof front
        for i in range(10):
            for j in range(2):
                if (i + j) % 2 == 0:
                    rect(uz(1.15) + i * 0.022, tc + (j - 0.5) * 0.044, 0.022, 0.044, s1, 1)
        rect(0.5, xv(-0.75), 1.0, 0.014, s1, 1)
        rect(0.5, xv(0.75), 1.0, 0.014, s1, 1)
    # roof number reads across the car (upright from the chase camera behind)
    ellipse(uz(-0.35), tc, 0.085, 0.13, (1, 1, 1), 2)
    text(num, uz(-0.35), tc, 0.19, s1 if s1 != (1, 1, 1) else (0.06, 0.06, 0.07), 3, rot=math.pi / 2)
    # hood: sponsor word across the nose, a dark cowl vent strip
    text(spon, uz(1.75), tc, 0.05, ink, 3, rot=math.pi / 2)
    rect(uz(1.02), tc, 0.012, 0.3, (0.05, 0.05, 0.06), 2)
    # deck lid: second sponsor
    text(spon2, uz(-2.1), tc, 0.04, ink, 3, rot=math.pi / 2)

    # ---- side bands ----
    def side(v0, v1, front_u):
        """front_u = 0: front of the car at u=0 (right side); 1: front at u=1 (left side)."""
        h = v1 - v0
        yv = lambda y: v0 + min(1.0, max(0.0, (y - Y0) / SIDE_H)) * h   # car y -> sheet v
        zu = (lambda z: (HALF_L - z) / (2 * HALF_L)) if front_u == 0 else (lambda z: (z + HALF_L) / (2 * HALF_L))
        rear_u, front_uu = zu(-1.9), zu(1.9)
        # rocker: dark skirt
        rect(0.5, yv(Y0 + 0.06), 1.0, yv(Y0 + 0.12) - v0, (0.05, 0.05, 0.06), 1)
        # main side stripe along the beltline / swoosh by style
        if style in (0, 1):
            rect(0.5, yv(0.60), 1.0, 0.028, s1, 1)
            rect(0.5, yv(0.66), 1.0, 0.008, s2, 1)
        elif style == 2:
            rect(0.5, yv(0.58), 1.0, 0.03, s1, 1, rot=0.018 if front_u == 0 else -0.018)
            rect(0.5, yv(0.52), 1.0, 0.010, s2, 1, rot=0.018 if front_u == 0 else -0.018)
        else:
            rect(0.5, yv(0.62), 1.0, 0.02, s1, 1)
            for i in range(24):
                if i % 2 == 0:
                    rect(i / 24 + 1 / 48, yv(0.52), 1 / 24, 0.02, s1, 1)
        # door number on a white panel
        ellipse(0.5, yv(0.76), 0.115, 0.095, (1, 1, 1), 2)
        text(num, 0.5, yv(0.75), 0.15, s1 if s1 != (1, 1, 1) else (0.06, 0.06, 0.07), 3, italic=0.12)
        # sponsors: rear quarter panel and front fender, on contrasting plates
        rect(rear_u, yv(0.86), 0.17, 0.045, s2, 2)
        text(spon, rear_u, yv(0.86), 0.028, s2_ink, 3)
        rect(front_uu, yv(0.86), 0.15, 0.04, (1, 1, 1), 2)
        text(spon2, front_uu, yv(0.86), 0.026, (0.06, 0.06, 0.07), 3)
        # contingency stickers behind the front wheel
        cols = [(0.9, 0.25, 0.17), (0.16, 0.29, 0.85), (1, 0.88, 0.35), (0.18, 0.72, 0.35), (1, 1, 1), (0.06, 0.06, 0.07), (1, 0.46, 0.08), (0.52, 0.22, 0.85)]
        for k, c in enumerate(cols):
            cu = zu(1.25 if front_u == 0 else 1.25) + ((k % 4) - 1.5) * 0.021 * (1 if front_u == 0 else -1)
            rect(cu, yv(0.47) + (k // 4) * 0.02, 0.018, 0.016, c, 2)
        # fuel filler / window-net anchors read as small dark marks
        rect(zu(-1.7), yv(0.95), 0.012, 0.012, (0.05, 0.05, 0.06), 2)

    side(*BAND_R, 0)
    side(*BAND_L, 1)

    # camera + render settings
    sc = bpy.context.scene
    cam = bpy.data.cameras.new('sheetcam'); cam.type = 'ORTHO'; cam.ortho_scale = 1.0
    cam_ob = bpy.data.objects.new('sheetcam', cam); bpy.context.collection.objects.link(cam_ob)
    cam_ob.location = (0.5, 0.5, 5)
    sc.camera = cam_ob
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'FLAT'
    sc.display.shading.color_type = 'MATERIAL'
    sc.display.render_aa = '8'
    sc.display.shading.background_type = 'VIEWPORT'; sc.display.shading.background_color = body
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.resolution_x = sc.render.resolution_y = 1024
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.compression = 90
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ---------- body ----------
def seg_of(j, n_right=9):
    """Ring index j (0..16) -> (segment 0..7, side +1/-1)."""
    return (j, 1) if j < n_right - 1 else (2 * n_right - 3 - j, -1)


def build_body(body_m, glass_m, trim_m):
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new('UVMap')
    rings = []
    for z in STATION_Z:
        pts = section(z)
        full = pts + [(-x, y) for (x, y) in reversed(pts[:-1])]
        rings.append([bm.verts.new((x, y, z)) for (x, y) in full])
    n = len(rings[0])  # 17
    face_info = {}
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        zm = (STATION_Z[i] + STATION_Z[i + 1]) / 2
        for j in range(n - 1):
            f = bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
            face_info[f] = (seg_of(j), zm)
        f = bm.faces.new((a[0], b[0], b[n - 1], a[n - 1]))      # floor strip
        face_info[f] = ((-1, 0), zm)
    rear = bm.faces.new(list(reversed(rings[0]))); face_info[rear] = ((8, 0), STATION_Z[0])
    front = bm.faces.new(rings[-1]); face_info[front] = ((8, 0), STATION_Z[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    for f, ((seg, side), zm) in face_info.items():
        _, ys, yt, cab = profile(zm)
        # material: side glass on the cabin, windshield / rear window on the sloped roof segment, floor dark
        m = 0
        if seg == -1:
            m = 2
        elif seg in (5, 6) and cab > 0.35 and -1.62 < zm < 0.98:
            m = 1
        elif seg == 7 and ((-1.72 < zm < -0.92) or (0.3 < zm < 1.05)):
            m = 1
        f.material_index = m
        f.smooth = True
        for loop in f.loops:
            x, y, z = loop.vert.co
            if seg >= 5 or seg == 8:
                u = (z + HALF_L) / (2 * HALF_L)
                v = (BAND_T[0] + BAND_T[1]) / 2 + (x / TOP_W) * (BAND_T[1] - BAND_T[0]) / 2
            elif seg == -1:
                u, v = 0.5, 0.01
            else:
                band = BAND_R if side > 0 else BAND_L
                u = (HALF_L - z) / (2 * HALF_L) if side > 0 else (z + HALF_L) / (2 * HALF_L)
                v = band[0] + min(1.0, max(0.0, (y - Y0) / SIDE_H)) * (band[1] - band[0])
            loop[uv_layer].uv = (u, v)

    me = bpy.data.meshes.new('body')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('body', me)
    bpy.context.collection.objects.link(ob)
    for m in (body_m, glass_m, trim_m):
        ob.data.materials.append(m)
    bev = ob.modifiers.new('bevel', 'BEVEL'); bev.width = 0.025; bev.segments = 1; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40)
    sub = ob.modifiers.new('subsurf', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
    return ob


def add_cyl(name, r, depth, loc, rot=(0, 0, 0), m=None, verts=24, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    if m:
        ob.data.materials.append(m)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def add_box(name, size, loc, m, rot=(0, 0, 0), bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    ob.data.materials.append(m)
    if bevel:
        b = ob.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 1
    return ob


WHEELS = ((-1.0, 1.55), (1.0, 1.55), (-1.0, -1.5), (1.0, -1.5))


def cut_wells(body, trim_m):
    for x, z in WHEELS:
        cutter = add_cyl('cutter', 0.57, 0.5, (x, 0.5, z), rot=(0, math.pi / 2, 0), m=trim_m)
        mod = body.modifiers.new('well', 'BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.object = cutter
        if hasattr(mod, 'material_mode'):
            mod.material_mode = 'TRANSFER'
        cutter.hide_render = True
        cutter.hide_viewport = True
        cutter.display_type = 'WIRE'
        # inner arch so the cut reads as a wheel well from every angle
        add_cyl('well', 0.56, 0.44, (x * 0.98, 0.5, z), rot=(0, math.pi / 2, 0), m=trim_m, verts=20)


def wheels(trim_m, rim_m, dish_m, tyre_m):
    for x, z in WHEELS:
        t = add_cyl('tyre', 0.44, 0.33, (x * 1.06, 0.44, z), rot=(0, math.pi / 2, 0), m=tyre_m, verts=22)
        b = t.modifiers.new('bevel', 'BEVEL'); b.width = 0.05; b.segments = 2
        add_cyl('rim', 0.30, 0.35, (x * 1.07, 0.44, z), rot=(0, math.pi / 2, 0), m=rim_m, verts=16)
        add_cyl('dish', 0.24, 0.37, (x * 1.085, 0.44, z), rot=(0, math.pi / 2, 0), m=dish_m, verts=16)
        for s in range(5):
            a = s * 2 * math.pi / 5
            add_box('spoke', (0.03, 0.22, 0.07), (x * 1.245, 0.44 + math.sin(a) * 0.12, z + math.cos(a) * 0.12), rim_m, rot=(a, 0, 0), bevel=0)
        add_cyl('hub', 0.07, 0.40, (x * 1.09, 0.44, z), rot=(0, math.pi / 2, 0), m=trim_m, verts=10)


def build_car(idx, liv):
    body_rgb, s1, s2, num, sponsor, sponsor2, style, spoiler = liv
    sheet = os.path.join(PREV, f'livery_{idx}.png')
    render_sheet(idx, liv, sheet)

    clear()
    img = bpy.data.images.load(sheet)
    img.colorspace_settings.name = 'sRGB'
    body_m = mat('body', (1, 1, 1), metallic=0.05, rough=0.32, coat=0.5, image=img)
    glass_m = mat('glass', (0.03, 0.05, 0.09), metallic=0.3, rough=0.1, coat=0.0)
    trim_m = mat('trim', (0.03, 0.03, 0.035), metallic=0.1, rough=0.7)
    rim_m = mat('rim', (0.82, 0.83, 0.86), metallic=0.5, rough=0.3)
    dish_m = mat('dish', (0.22, 0.22, 0.25), metallic=0.4, rough=0.5)
    tyre_m = mat('tyre', (0.05, 0.05, 0.06), metallic=0.0, rough=0.92)
    accent_m = mat('accent', s1, metallic=0.05, rough=0.35, coat=0.3)
    paint_m = mat('paint', body_rgb, metallic=0.05, rough=0.32, coat=0.5)
    head_m = mat('headlight', (1, 0.97, 0.85), emission=(1, 0.95, 0.8))
    tail_m = mat('tail', (0.6, 0.02, 0.02), emission=(1, 0.1, 0.1))

    body = build_body(body_m, glass_m, trim_m)
    cut_wells(body, trim_m)
    wheels(trim_m, rim_m, dish_m, tyre_m)

    # nose: bumper cover, splitter, grille, headlight decals
    add_box('bumperF', (1.86, 0.2, 0.18), (0, 0.52, 2.56), paint_m)
    add_box('splitter', (1.96, 0.04, 0.36), (0, 0.36, 2.58), trim_m)
    add_box('grille', (0.8, 0.1, 0.03), (0, 0.66, 2.63), trim_m, bevel=0)
    for k in (-1, 1):
        add_box('headlight', (0.46, 0.17, 0.03), (k * 0.6, 0.68, 2.62), head_m, bevel=0)
        add_box('mirror', (0.15, 0.08, 0.11) if k < 0 else (0.11, 0.06, 0.09), (k * 1.13, 1.04, 0.82), paint_m)
        add_box('flap', (0.5, 0.02, 0.16), (k * 0.3, 1.47, -0.6), trim_m, bevel=0)
    # tail: bumper, light bar, deck, exhausts on the right
    add_box('bumperR', (1.84, 0.2, 0.18), (0, 0.56, -2.56), paint_m)
    add_box('tail', (1.7, 0.12, 0.03), (0, 0.78, -2.62), tail_m, bevel=0)
    add_box('plate', (0.5, 0.14, 0.02), (0, 0.62, -2.62), trim_m, bevel=0)
    for dz in (0.0, -0.14):
        add_cyl('exhaust', 0.055, 0.46, (0.96, 0.40, -1.0 + dz), rot=(0, math.pi / 2, 0), m=rim_m, verts=10)
    # spoiler variants
    if spoiler == 'wing':
        blade = add_box('spoiler', (2.0, 0.05, 0.42), (0, 1.3, -2.36), trim_m); blade.rotation_euler = (-0.28, 0, 0)
        for k in (-1, 1):
            add_box('strut', (0.06, 0.34, 0.26), (k * 0.78, 1.12, -2.34), trim_m, bevel=0)
            add_box('endplate', (0.03, 0.22, 0.5), (k * 1.0, 1.33, -2.36), accent_m, bevel=0)
    else:
        blade = add_box('spoiler', (1.96, 0.04, 0.38), (0, 1.1, -2.42), trim_m); blade.rotation_euler = (-0.35, 0, 0)
        for k in (-1, 1):
            add_box('strut', (0.05, 0.16, 0.22), (k * 0.78, 1.02, -2.38), trim_m, bevel=0)
            add_box('endplate', (0.03, 0.12, 0.36), (k * 0.98, 1.12, -2.42), accent_m, bevel=0)
    # roof antenna, window net on the driver's (left) side
    add_cyl('antenna', 0.012, 0.5, (0.42, 1.68, -0.9), m=trim_m, verts=6)
    add_box('net', (0.02, 0.32, 0.8), (-1.02, 1.2, 0.2), mat('net', (0.9, 0.9, 0.9), rough=0.9, alpha=0.45), bevel=0)

    # stand the Y-up model up into Blender's Z-up world so the exporter and camera agree
    root = bpy.data.objects.new('root', None); bpy.context.collection.objects.link(root); root.rotation_euler = (math.pi / 2, 0, 0)
    for ob in list(bpy.context.collection.objects):
        if ob.type == 'MESH' and ob.parent is None:
            ob.parent = root
    bpy.context.view_layer.update()

    out = os.path.join(OUT, f'car_{idx}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, use_selection=False,
                              export_image_format='AUTO', export_texcoords=True, export_normals=True)

    # previews: textured Workbench renders, front and rear three-quarter
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'TEXTURE'
    sc.display.shading.show_cavity = True
    sc.display.render_aa = '8'
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = 800, 450
    sc.display.shading.background_type = 'VIEWPORT'; sc.display.shading.background_color = (0.09, 0.09, 0.11)
    cam = bpy.data.cameras.new('cam'); cam_ob = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(cam_ob)
    cam.lens = 50
    tgt = bpy.data.objects.new('tgt', None); bpy.context.collection.objects.link(tgt); tgt.location = (0, 0, 0.75)
    con = cam_ob.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    sc.camera = cam_ob
    for tag, loc in (('', (5.4, -6.2, 2.6)), ('_rear', (5.0, 6.4, 2.7))):
        cam_ob.location = loc
        sc.render.filepath = os.path.join(PREV, f'preview_{idx}{tag}.png')
        bpy.ops.render.render(write_still=True)
    print('wrote', out)


which = [int(a) for a in ARGS[1:]] if len(ARGS) > 1 else list(range(len(LIVERY)))
for i in which:
    build_car(i, LIVERY[i])
