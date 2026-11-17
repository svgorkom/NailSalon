"""Builds the final foot scene (skin material, nail anchors) and exports it as foot.glb."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
import bmesh
from mpfb_boot import boot

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/foot_uv.blend')
body = bpy.data.objects['Human']
rig = bpy.data.objects['Human.rig']
mesh = body.data

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else f'{WORK}/foot.glb'

TOES = {1: 'BigToe', 2: 'SecondToe', 3: 'ThirdToe', 4: 'FourthToe', 5: 'LittleToe'}
DISTAL = {1: 'toe1-2.R', 2: 'toe2-3.R', 3: 'toe3-3.R', 4: 'toe4-3.R', 5: 'toe5-3.R'}

# --- nail anchors ------------------------------------------------------------------------------------------------------------------
toenail_index = body.vertex_groups['toenails'].index
nail_verts = [v for v in mesh.vertices if any(g.group == toenail_index and g.weight > 0.5 for g in v.groups)]
segs = {n: (rig.data.bones[b].head_local.copy(), rig.data.bones[b].tail_local.copy()) for n, b in DISTAL.items()}

def dist_to_segment(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + t * ab)).length

clusters = {n: [] for n in TOES}
for v in nail_verts:
    d = {n: dist_to_segment(v.co, *segs[n]) for n in TOES}
    n = min(d, key=d.get)
    if d[n] < 0.02:
        clusters[n].append(v)

# The skin as it is posed, to measure the height of the skin under each nail.
evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
skin_bm = bmesh.new()
skin_bm.from_mesh(evaluated.to_mesh())
skin_bm.transform(evaluated.matrix_world)
skin_tree = BVHTree.FromBMesh(skin_bm)

# The app draws the nail over its footprint: the cuticle corners are pulled in by 22% over the first 45% of the nail bed
# (CUTICLE_PULL and CUTICLE_ZONE in src/scene/nailGeometry.ts). Fit the surface to the skin inside that footprint.
CUTICLE_PULL, CUTICLE_ZONE = 0.22, 0.45
UPPER_WEIGHT = 8.0      # skin above the surface weighs more, so the fit follows the upper envelope
CLEARANCE = 0.0001      # the nail plate ends 0.1 mm above the highest skin (the app lifts its top 0.6 mm and is 0.5 mm thick)

collection = bpy.context.scene.collection
for n, verts in clusters.items():
    P = np.array([v.co[:] for v in verts])
    N = np.array([v.normal[:] for v in verts])
    z = Vector(N.mean(0)).normalized()                       # up from the nail
    head, tail = segs[n]
    along = tail - head
    y = (along - along.dot(z) * z).normalized()               # cuticle -> tip
    x = y.cross(z).normalized()                                # across; right-handed: x = y × z
    c = P.mean(0)
    rel = P - c
    lx, ly, lz = rel @ np.array(x[:]), rel @ np.array(y[:]), rel @ np.array(z[:])
    near = ly < ly.min() + 0.15 * (ly.max() - ly.min())
    origin = Vector(c) + float(lx[near].mean()) * x + float(ly.min()) * y + float(lz[near].mean()) * z   # on the cuticle, mid nail
    q = P - np.array(origin[:])
    ax, ay, az = q @ np.array(x[:]), q @ np.array(y[:]), q @ np.array(z[:])
    A = np.stack([ax, ay, ax * ax, ax * ay, ay * ay], axis=1)
    coef, *_ = np.linalg.lstsq(A, az, rcond=None)

    # Skin heights over the footprint, measured by rays along -z, relative to the origin.
    width, length = float(ax.max() - ax.min()), float(ay.max())
    xs, ys, hs = [], [], []
    for iy in range(11):
        yy = length * iy / 10
        half = width / 2 * (1 - CUTICLE_PULL * (1 - min(yy / (CUTICLE_ZONE * length), 1)) ** 2)
        for ix in range(-4, 5):
            xx = ix / 4 * half
            top = Vector(origin) + xx * x + yy * y + 0.01 * z
            hit = skin_tree.ray_cast(top, -z, 0.03)
            if hit[0] is not None:
                xs.append(xx); ys.append(yy); hs.append(0.01 - hit[3])
    xs, ys, hs = np.array(xs), np.array(ys), np.array(hs)
    G = np.stack([xs, ys, xs * xs, xs * ys, ys * ys], axis=1)
    weights = np.ones(len(hs))
    for _ in range(10):
        coef, *_ = np.linalg.lstsq(G * weights[:, None], hs * weights, rcond=None)
        weights = np.where(hs - G @ coef > 0, UPPER_WEIGHT, 1.0)
    gx, gy, gxx, gxy, gyy = (float(k) for k in coef)
    # The surface has no constant term, so lifting it means moving the origin up along z.
    lift = max(0.0, float((hs - G @ coef).max()) - CLEARANCE)
    origin = Vector(origin) + lift * z
    print(f'{TOES[n]}: lift {lift * 1000:.2f} mm, skin below the surface {(-(hs - G @ coef - lift)).mean() * 1000:.2f} mm on average')

    # In the glTF export the local axes of an empty (x, y, z) become (x, z, -y): the frame in Blender is (across, -up, along).
    frame = Matrix(((x[0], -z[0], y[0], origin[0]),
                    (x[1], -z[1], y[1], origin[1]),
                    (x[2], -z[2], y[2], origin[2]),
                    (0.0, 0.0, 0.0, 1.0)))
    empty = bpy.data.objects.new(f'NailBed_{TOES[n]}', None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.005
    collection.objects.link(empty)
    empty.parent = rig
    empty.parent_type = 'BONE'
    empty.parent_bone = DISTAL[n]
    bpy.context.view_layer.update()
    empty.matrix_world = frame
    empty['toe'] = TOES[n]
    empty['nailWidth'] = float(ax.max() - ax.min())
    empty['bedLength'] = float(ay.max())
    for key, value in zip(('gx', 'gy', 'gxx', 'gxy', 'gyy'), (gx, gy, gxx, gxy, gyy)):
        empty[key] = value

# --- clean up ----------------------------------------------------------------------------------------------------------------------
body.vertex_groups.remove(body.vertex_groups['toenails'])
for key in list(body.keys()):          # MPFB bookkeeping that the app does not need
    if key not in ('MPFB_HUM_gender', 'MPFB_HUM_age', 'MPFB_HUM_muscle', 'MPFB_HUM_weight', 'MPFB_HUM_proportions', 'MPFB_HUM_height',
                   'MPFB_HUM_cupsize', 'MPFB_HUM_firmness', 'MPFB_HUM_asian', 'MPFB_HUM_caucasian', 'MPFB_HUM_african'):
        del body[key]
body.name = body.data.name = 'Foot'
rig.name = rig.data.name = 'FootRig'

# --- skin material -------------------------------------------------------------------------------------------------------------------
mat = bpy.data.materials.new('Skin')
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial')
bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Metallic'].default_value = 0.0
nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

def image_node(name, path, colour_space):
    node = nt.nodes.new('ShaderNodeTexImage')
    img = bpy.data.images.load(path)
    img.name = name
    img.colorspace_settings.name = colour_space
    img.pack()
    node.image = img
    return node

base = image_node('foot_basecolor', f'{WORK}/foot_basecolor.jpg', 'sRGB')
nt.links.new(base.outputs['Color'], bsdf.inputs['Base Color'])
rough = image_node('foot_roughness', f'{WORK}/foot_roughness.jpg', 'Non-Color')
sep = nt.nodes.new('ShaderNodeSeparateColor')
nt.links.new(rough.outputs['Color'], sep.inputs['Color'])
nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
normal = image_node('foot_normal', f'{WORK}/foot_normal.jpg', 'Non-Color')
nmap = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(normal.outputs['Color'], nmap.inputs['Color'])
nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
mesh.materials.clear()
mesh.materials.append(mat)
mat.use_backface_culling = False

bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/foot_final.blend')

# --- export ------------------------------------------------------------------------------------------------------------------------------
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
    export_skins=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False,
    export_image_format='JPEG', export_jpeg_quality=85, export_texcoords=True, export_normals=True, export_tangents=False,
    export_materials='EXPORT')
print('exported', OUT)
