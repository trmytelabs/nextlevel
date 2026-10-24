"""Build Daytona-style stock cars in Blender and export them as GLB for the racer.

Run headless:  blender -b -P tools/blender/car.py -- <out_dir>
Produces car_0.glb .. car_12.glb (player first) plus preview_*.png turntable renders.

Everything is procedural: the body is lofted from cross-sections and smoothed with
subdivision, wheel wells are cut with booleans, numbers and sponsor words are real
text geometry wrapped onto the panels, and materials are Principled BSDF so the
glTF carries PBR colour, metalness and roughness.
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.getcwd(), 'public', 'models')
os.makedirs(OUT, exist_ok=True)

# ---------- liveries: body, stripe, stripe2, number, sponsor ----------
LIVERY = [
    ((0.96, 0.96, 0.96), (0.85, 0.12, 0.18), (0.14, 0.28, 0.85), '41', 'MAXIMAL'),
    ((0.95, 0.76, 0.14), (0.05, 0.05, 0.06), (0.05, 0.05, 0.06), '7', 'TURN IT UP'),
    ((0.16, 0.72, 0.33), (1, 1, 1), (1, 1, 1), '12', 'ONE DESK'),
    ((0.16, 0.42, 0.9), (1, 1, 1), (1, 0.88, 0.35), '3', 'PIPELINE'),
    ((1.0, 0.46, 0.08), (0.05, 0.05, 0.06), (1, 1, 1), '22', 'THEN SOME'),
    ((0.52, 0.22, 0.85), (1, 0.88, 0.35), (1, 0.88, 0.35), '9', 'BOX TALKS'),
    ((0.08, 0.08, 0.1), (0.85, 0.12, 0.18), (0.85, 0.12, 0.18), '14', 'NO BACKLOG'),
    ((0.12, 0.78, 0.75), (1, 1, 1), (0.05, 0.05, 0.06), '28', 'HUNDRED HANDS'),
    ((0.85, 0.12, 0.18), (1, 1, 1), (1, 1, 1), '5', 'ASK ONCE'),
    ((1, 1, 1), (0.16, 0.72, 0.33), (0.16, 0.72, 0.33), '17', 'SECTOR 07'),
    ((0.9, 0.22, 0.48), (1, 1, 1), (1, 1, 1), '33', 'LEVEL UP'),
    ((0.6, 0.6, 0.66), (1.0, 0.46, 0.08), (0.05, 0.05, 0.06), '8', 'THREAD THE GAP'),
    ((0.1, 0.16, 0.48), (1, 0.88, 0.35), (1, 0.88, 0.35), '44', 'WIRE LIGHTS'),
]

# body cross-sections: z (front +), half width, shoulder y, roof y, greenhouse fraction
STATIONS = [(-2.4, 0.92, 0.84, 0.90, 0.86), (-2.0, 1.02, 0.94, 0.98, 0.86), (-1.5, 1.06, 0.98, 1.06, 0.84),
            (-1.1, 1.07, 0.99, 1.22, 0.74), (-0.7, 1.07, 1.0, 1.38, 0.66), (-0.1, 1.07, 1.0, 1.41, 0.64),
            (0.35, 1.07, 1.0, 1.40, 0.65), (0.8, 1.06, 1.0, 1.24, 0.74), (1.2, 1.04, 0.98, 1.03, 0.86),
            (1.7, 1.0, 0.92, 0.94, 0.9), (2.15, 0.96, 0.82, 0.84, 0.92), (2.4, 0.9, 0.7, 0.74, 0.95)]
Y0 = 0.34


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, metallic=0.1, rough=0.45, emission=None, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    m.diffuse_color = (*rgb, 1); m.metallic = metallic; m.roughness = rough
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 0.6 if metallic < 0.5 else 0.0
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 3.0
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    return m


def section(st):
    z, w, ys, yt, gf = st
    wg = w * gf
    # right half from bottom to roof centre (x, y)
    return [(w * 0.92, Y0), (w, Y0 + 0.18), (w, ys - 0.08), (w * 0.985, ys), (wg + 0.06, yt - 0.03), (wg, yt), (0.0, yt)]


def build_body(body_m, glass_m, trim_m):
    bm = bmesh.new()
    rings = []
    for st in STATIONS:
        pts = section(st)
        full = [(-x, y) for (x, y) in reversed(pts[:-1])] + pts
        ring = [bm.verts.new((x, y, st[0])) for (x, y) in full]
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    n = len(rings[0])
    faces = []
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n - 1):
            f = bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
            faces.append((f, i, k))
    # floor and end caps to make it a solid
    for ring, flip in ((rings[0], False), (rings[-1], True)):
        f = bm.faces.new(ring if flip else list(reversed(ring)))
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        bm.faces.new((a[-1 - 0], b[-1 - 0], b[0], a[0])) if False else None
    # floor strip
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        bm.faces.new((a[0], b[0], b[n - 1], a[n - 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('body')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('body', me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(body_m)
    ob.data.materials.append(glass_m)
    ob.data.materials.append(trim_m)
    # assign glass to the greenhouse faces: upper side slopes and sloped roof sections
    for p in me.polygons:
        c = p.center
        cabin = -1.45 < c.z < 1.15
        upper_side = c.y > 0.98 and abs(c.x) > 0.55
        sloped_roof = abs(c.x) < 0.6 and c.y > 1.0 and ((-1.45 < c.z < -0.75) or (0.3 < c.z < 1.2))
        if (cabin and upper_side and c.y > 1.0) or sloped_roof:
            p.material_index = 1
        if c.y < Y0 + 0.05:
            p.material_index = 2
    for p in me.polygons:
        p.use_smooth = True
    bev = ob.modifiers.new('bevel', 'BEVEL')
    bev.width = 0.03
    bev.segments = 2
    bev.limit_method = 'ANGLE'
    sub = ob.modifiers.new('subsurf', 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 1
    return ob


def add_cyl(name, r, depth, loc, rot=(0, 0, 0), m=None, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
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
        b = ob.modifiers.new('bevel', 'BEVEL')
        b.width = bevel
        b.segments = 2
    return ob


def cut_wells(body, trim_m):
    for x, z in ((-1.0, 1.5), (1.0, 1.5), (-1.0, -1.45), (1.0, -1.45)):
        cutter = add_cyl('cutter', 0.56, 0.5, (x, 0.5, z), rot=(0, math.pi / 2, 0))
        mod = body.modifiers.new('well', 'BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.object = cutter
        cutter.hide_render = True
        cutter.hide_viewport = True
        cutter.display_type = 'WIRE'
        # inner well wall so the cut reads as a wheel arch
        add_cyl('well', 0.55, 0.42, (x * 0.98, 0.5, z), rot=(0, math.pi / 2, 0), m=trim_m)


def wheels(trim_m, rim_m, tyre_m):
    for x, z in ((-1.0, 1.5), (1.0, 1.5), (-1.0, -1.45), (1.0, -1.45)):
        t = add_cyl('tyre', 0.44, 0.34, (x * 1.06, 0.44, z), rot=(0, math.pi / 2, 0), m=tyre_m)
        b = t.modifiers.new('bevel', 'BEVEL'); b.width = 0.04; b.segments = 3
        r = add_cyl('rim', 0.3, 0.36, (x * 1.07, 0.44, z), rot=(0, math.pi / 2, 0), m=rim_m, verts=16)
        for s in range(5):
            a = s * 2 * math.pi / 5
            add_box('spoke', (0.04, 0.26, 0.18), (x * 1.24, 0.44 + math.sin(a) * 0.13, z + math.cos(a) * 0.13), rim_m, rot=(a, 0, 0), bevel=0)
        add_cyl('hub', 0.08, 0.4, (x * 1.08, 0.44, z), rot=(0, math.pi / 2, 0), m=trim_m, verts=10)


def text_decal(txt, size, loc, rot, m, project_axis, target, depth=0.012):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.data.body = txt
    ob.data.size = size
    ob.data.align_x = 'CENTER'
    ob.data.align_y = 'CENTER'
    ob.data.extrude = depth
    ob.data.resolution_u = 3
    try:
        ob.data.font = bpy.data.fonts.load(r'C:\Windows\Fonts\arialbd.ttf')
    except Exception:
        pass
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.append(m)
    sw = ob.modifiers.new('wrap', 'SHRINKWRAP')
    sw.wrap_method = 'PROJECT'
    sw.target = target
    sw.use_negative_direction = True
    sw.use_positive_direction = True
    setattr(sw, 'use_project_' + project_axis, True)
    sw.offset = 0.012
    return ob


def strip_decal(name, size, loc, m, target, axis='z'):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (size[0], size[1], 1)
    ob.rotation_euler = (0, math.pi / 2, 0) if axis == 'x' else (-math.pi / 2, 0, 0)
    sub = ob.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 3
    sw = ob.modifiers.new('wrap', 'SHRINKWRAP')
    sw.wrap_method = 'PROJECT'; sw.target = target; sw.use_negative_direction = True; sw.use_positive_direction = True
    setattr(sw, 'use_project_' + ('x' if axis == 'x' else 'y'), True)
    sw.offset = 0.008
    sol = ob.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.004
    ob.data.materials.append(m)
    return ob


def build_car(idx, liv):
    clear()
    body_rgb, s1, s2, num, sponsor = liv
    body_m = mat('body', body_rgb, metallic=0.15, rough=0.32)
    glass_m = mat('glass', (0.03, 0.05, 0.09), metallic=0.6, rough=0.08)
    trim_m = mat('trim', (0.03, 0.03, 0.035), metallic=0.2, rough=0.6)
    rim_m = mat('rim', (0.75, 0.76, 0.8), metallic=0.95, rough=0.25)
    tyre_m = mat('tyre', (0.06, 0.06, 0.07), metallic=0.0, rough=0.9)
    s1_m = mat('stripe', s1, metallic=0.15, rough=0.32)
    s2_m = mat('stripe2', s2, metallic=0.15, rough=0.32)
    num_m = mat('number', (0.05, 0.05, 0.06) if sum(body_rgb) > 1.5 else (1, 1, 1), rough=0.4)
    white_m = mat('white', (1, 1, 1), rough=0.4)
    head_m = mat('headlight', (1, 0.97, 0.85), emission=(1, 0.95, 0.8))
    tail_m = mat('tail', (0.6, 0.02, 0.02), emission=(1, 0.1, 0.1))

    body = build_body(body_m, glass_m, trim_m)
    cut_wells(body, trim_m)
    wheels(trim_m, rim_m, tyre_m)
    # bumpers, splitter, spoiler, mirror, exhaust, roof flaps, window net
    add_box('bumperF', (1.9, 0.16, 0.14), (0, 0.5, 2.43), body_m)
    add_box('splitter', (1.96, 0.05, 0.32), (0, 0.37, 2.44), trim_m)
    add_box('bumperR', (1.9, 0.16, 0.14), (0, 0.54, -2.43), body_m)
    sp = add_box('spoiler', (2.0, 0.05, 0.42), (0, 1.1, -2.3), trim_m); sp.rotation_euler = (-0.3, 0, 0)
    for k in (-1, 1):
        add_box('strut', (0.06, 0.24, 0.26), (k * 0.8, 0.98, -2.3), trim_m, bevel=0)
        add_box('flap', (0.5, 0.02, 0.16), (k * 0.3, 1.43, -0.5), trim_m, bevel=0)
        add_box('headlight', (0.5, 0.2, 0.03), (k * 0.6, 0.62, 2.42), head_m, bevel=0)
    add_box('tail', (1.8, 0.14, 0.03), (0, 0.66, -2.43), tail_m, bevel=0)
    add_box('mirror', (0.16, 0.08, 0.12), (1.13, 1.02, 0.75), body_m)
    add_cyl('exhaust', 0.06, 0.5, (0.98, 0.42, -1.0), rot=(0, math.pi / 2, 0), m=rim_m, verts=10)
    net = add_box('net', (0.02, 0.34, 0.78), (-1.0, 1.18, 0.25), mat('net', (0.9, 0.9, 0.9), rough=0.9, alpha=0.45), bevel=0)
    # livery: hood and roof stripes, door and roof numbers, sponsor on the quarter panel
    strip_decal('hoodL', (0.34, 2.2), (-0.3, 1.0, 1.4), s1_m, body)
    strip_decal('hoodR', (0.34, 2.2), (0.3, 1.0, 1.4), s2_m, body)
    strip_decal('roofL', (0.34, 1.2), (-0.3, 1.45, -0.3), s1_m, body)
    strip_decal('roofR', (0.34, 1.2), (0.3, 1.45, -0.3), s2_m, body)
    for k in (-1, 1):
        strip_decal('sideS', (4.6, 0.14), (k * 1.08, 0.46, 0), s1_m, body, axis='x')
        text_decal(num, 0.62, (k * 1.14, 0.7, -0.05), (0, k * math.pi / 2, 0), num_m, 'x', body)
        text_decal(sponsor, 0.16, (k * 1.12, 0.93, -1.6), (0, k * math.pi / 2, 0), num_m, 'x', body)
    text_decal(num, 0.9, (0, 1.5, -0.3), (-math.pi / 2, 0, 0), num_m, 'y', body)
    # the car is modelled Y-up; stand it up into Blender's Z-up world so the exporter and camera agree
    root = bpy.data.objects.new('root', None); bpy.context.collection.objects.link(root); root.rotation_euler = (math.pi / 2, 0, 0)
    for ob in list(bpy.context.collection.objects):
        if ob.type == 'MESH' and ob.parent is None:
            ob.parent = root
    bpy.context.view_layer.update()
    # export, modifiers applied, +Y up
    out = os.path.join(OUT, f'car_{idx}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, use_selection=False)
    # quick turntable preview with Workbench (reliable headless)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x, sc.render.resolution_y = 640, 360
    sc.display.shading.background_type = 'VIEWPORT'; sc.display.shading.background_color = (0.09, 0.09, 0.11)
    cam = bpy.data.cameras.new('cam'); cam_ob = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(cam_ob)
    cam.lens = 40
    cam_ob.location = (7.4, -8.4, 3.4)
    tgt = bpy.data.objects.new('tgt', None); bpy.context.collection.objects.link(tgt); tgt.location = (0, 0, 0.8)
    con = cam_ob.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    sc.camera = cam_ob
    sc.render.filepath = os.path.join(OUT, f'preview_{idx}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', out)


which = [int(a) for a in ARGS[1:]] if len(ARGS) > 1 else list(range(len(LIVERY)))
for i in which:
    build_car(i, LIVERY[i])
