"""Cuts the upper body of the MPFB human, sets the material slots and poses the customer seated at a table.

The customer faces +Z in glTF (the player's side), sits with the lower body hidden under the table, and rests the right arm
stretched out on the table: palm down, fingers towards the player, thumb towards the middle of the table. The left hand rests in
the lap, below the table top. The origin of the result is on the table top, straight below the right wrist.
"""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import CUSTOMER, WORK
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mpfb_boot import boot
from hair import build_hair

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/human.blend')

# The heights below were measured on the first customer (1.637 m, hair included); they are scaled to the height of this one.
REFERENCE_HEIGHT = 1.637
SCALE_Z = bpy.data.objects['Human'].dimensions.z / REFERENCE_HEIGHT
CUT_Z = 0.86 * SCALE_Z           # metres; below this (standing human) the body is hidden under the table
SMILE_LIFT = 0.006               # metres the mouth corners rise (standing human)
HEAD_PITCH_DEG = 5.0            # looking at the hand, but not so far down that the face looks sad
HAIR_MIN_Z = CUSTOMER['hair']['cutZ'] * SCALE_Z               # the hair of the MPFB helper is waist long; cut it at the neck (standing human, metres)
FRINGE = dict(x=0.085, y=-0.065, z=1.58 * SCALE_Z)   # no hair in front of the face: the helper has a fringe over the eyes
FACE_FRONT_Y, FACE_FRONT_Z = -0.06, 1.52 * SCALE_Z     # no strand ends in front of the cheeks, chin or mouth
CLOTH_OFFSET = 0.007             # the sweater lies this far above the skin
CLOTH_THICKNESS = 0.004
CLOTH_BONES = ('spine', 'clavicle', 'shoulder01', 'upperarm', 'lowerarm', 'breast')
CLOTH_MAX_Z = 1.335 * SCALE_Z              # the neckline of the sweater, in standing coordinates
CLOTH_SMOOTHING = 4              # rounds the shape of the torso so the sweater is loose, not skin tight
# Directions in Blender axes of the standing human: the front is -Y, the customer's right is -X, up is +Z.
UPPER_ARM = Vector((-0.12, -0.33, -0.93)).normalized()       # shoulder to elbow: down and a little forward
FOREARM = Vector((0.10, -1.0, 0.0)).normalized()              # elbow to wrist: forward over the table, a little inwards
LEFT_UPPER_ARM = Vector((0.12, -0.25, -0.96)).normalized()
LEFT_FOREARM = Vector((-0.45, -0.75, -0.50)).normalized()     # towards the lap

body = bpy.data.objects['Human']
rig = bpy.data.objects['Human.rig']
for name in ('Camera', 'Cube', 'Light'):
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)


def select_only(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


if body.data.shape_keys:
    select_only(body)
    bpy.ops.object.shape_key_remove(all=True, apply_mix=True)

# --- which vertices belong where -------------------------------------------------------------------------------------------
groups = {g.name: g.index for g in body.vertex_groups}


def members(name, threshold=0.5):
    gi = groups[name]
    return {v.index for v in body.data.vertices if any(g.group == gi and g.weight > threshold for g in v.groups)}


EYES = members('helper-l-eye') | members('helper-r-eye')
LASHES = members('helper-l-eyelashes-1') | members('helper-l-eyelashes-2') | members('helper-r-eyelashes-1') | members('helper-r-eyelashes-2')
TEETH = members('helper-upper-teeth') | members('helper-lower-teeth')
TONGUE = members('helper-tongue')
HAIR = members('helper-hair')
# Hands and forearms are always kept: in the standing pose of the helper skeleton they hang close to the cut, and a smaller body would lose fingers.
HAND_GROUPS = [index for name, index in groups.items() if name.startswith(('wrist', 'metacarpal', 'finger', 'lowerarm'))]
SKIN = {v.index for v in body.data.vertices if v.co.z > CUT_Z or any(g.group in HAND_GROUPS and g.weight > 0.5 for g in v.groups)} & members('body')
KEEP = SKIN | EYES | LASHES | TEETH | TONGUE | HAIR
SLOTS = [('Skin', SKIN), ('Eyes', EYES), ('Lashes', LASHES), ('Teeth', TEETH), ('Tongue', TONGUE), ('Hair', HAIR)]
print('kept', len(KEEP), {name: len(s) for name, s in SLOTS})

bm = bmesh.new()
bm.from_mesh(body.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in KEEP], context='VERTS')
bm.to_mesh(body.data)
bm.free()

# Material slots by the vertices of every face (the faces of a helper share its vertices).
for _, _ in SLOTS:
    pass
for name, _ in SLOTS:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    body.data.materials.append(material)
# Indices of the kept vertices changed: look the groups up again on the cut mesh.
groups = {g.name: g.index for g in body.vertex_groups}
cut = {name: members(name) for name in ('helper-l-eye', 'helper-r-eye', 'helper-l-eyelashes-1', 'helper-l-eyelashes-2', 'helper-r-eyelashes-1',
                                        'helper-r-eyelashes-2', 'helper-upper-teeth', 'helper-lower-teeth', 'helper-tongue', 'helper-hair')}
sets = [None, cut['helper-l-eye'] | cut['helper-r-eye'],
        cut['helper-l-eyelashes-1'] | cut['helper-l-eyelashes-2'] | cut['helper-r-eyelashes-1'] | cut['helper-r-eyelashes-2'],
        cut['helper-upper-teeth'] | cut['helper-lower-teeth'], cut['helper-tongue'], cut['helper-hair']]
for poly in body.data.polygons:
    poly.material_index = 0
    for index, s in enumerate(sets):
        if s is not None and all(v in s for v in poly.vertices):
            poly.material_index = index
print('faces per slot', [sum(1 for p in body.data.polygons if p.material_index == i) for i in range(len(SLOTS))])

# --- hair: the helper's hair is dropped; ribbons are generated over the scalp (hair.py) ---------------------------------------------
HAIR_SLOT, CLOTH_SLOT = 5, 6
body.data.materials.append(bpy.data.materials.get('Cloth') or bpy.data.materials.new('Cloth'))
scalp_group = body.vertex_groups['scalp'].index
on_scalp = {v.index for v in body.data.vertices if any(g.group == scalp_group and g.weight > 0.5 for g in v.groups)}
co = np.array([v.co[:] for v in body.data.vertices])
head_top = max(co[i][2] for i in on_scalp)
# The scalp group stops below the hairline at the front: every triangle near the crown is a root area too.
roots_area = [poly for poly in body.data.polygons if poly.material_index == 0 and (all(i in on_scalp for i in poly.vertices) or sum(co[i][2] for i in poly.vertices) / len(poly.vertices) > head_top - 0.06)]
scalp_triangles = np.array([[co[poly.vertices[0]], co[poly.vertices[k + 1]], co[poly.vertices[k + 2]]] for poly in roots_area for k in range(len(poly.vertices) - 2)])
head_points = np.array([co[v.index] for v in body.data.vertices if v.co.z > head_top - 0.25 and abs(v.co.x) < 0.2 and abs(v.co.y) < 0.25 and v.index not in HAIR])
HAIR_PARAMS = dict(length_z=CUSTOMER['hair']['cutZ'] * SCALE_Z, count=CUSTOMER['hair'].get('count', 1000), volume=CUSTOMER['hair'].get('volume', 0.5),
                   parting=CUSTOMER['hair'].get('parting', 0.3), curl=CUSTOMER['hair'].get('curl', 0.0), curl_freq=CUSTOMER['hair'].get('curlFreq', 60.0))
hair_verts_np, hair_quads, hair_uvs = build_hair(scalp_triangles, head_points, HAIR_PARAMS, seed=sum(ord(c) for c in CUSTOMER['id']))
# A thin cap over the root area, so no skin shows between the ribbons; the strands lie 1.5 mm or more above it.
cap_index = {}
cap_points = []
cap_faces = []
for poly in roots_area:
    face = []
    for i in poly.vertices:
        if i not in cap_index:
            cap_index[i] = len(cap_points)
            cap_points.append(co[i] + np.array(body.data.vertices[i].normal[:]) * 0.0025)
        face.append(cap_index[i])
    cap_faces.append(face)
base = len(hair_verts_np)
hair_verts_np = np.concatenate([hair_verts_np, np.array(cap_points)])
hair_faces = [list(q) for q in hair_quads] + [[base + i for i in face] for face in cap_faces]
hair_uvs = np.concatenate([hair_uvs, np.tile([0.5, 0.99], (len(cap_points), 1))])
print('hair ribbons', len(hair_quads) // 8, 'vertices', len(hair_verts_np), 'scalp triangles', len(scalp_triangles))

bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == HAIR_SLOT], context='FACES')
# --- sweater: a copy of the torso and arm skin, lifted off the skin -------------------------------------------------------------------
deform = bm.verts.layers.deform.active
names = {g.index: g.name for g in body.vertex_groups}


def cloth_share(v):
    return sum(w for i, w in v[deform].items() if names[i].startswith(CLOTH_BONES))


region = {v for v in bm.verts if v.co.z < CLOTH_MAX_Z and cloth_share(v) > 0.5}
source = [f for f in bm.faces if f.material_index == 0 and all(v in region for v in f.verts)]
bm.normal_update()
copied = bmesh.ops.duplicate(bm, geom=source)
cloth_faces = [g for g in copied['geom'] if isinstance(g, bmesh.types.BMFace)]
for f in cloth_faces:
    f.material_index = CLOTH_SLOT
for v in {v for f in cloth_faces for v in f.verts}:
    v.co += v.normal * CLOTH_OFFSET
cloth_verts = list({v for f in cloth_faces for v in f.verts})
# A straight neckline: the stair steps of the top row are snapped to one height.
for v in cloth_verts:
    if v.co.z > CLOTH_MAX_Z - 0.015 and abs(v.co.x) < 0.12 and any(not e.is_manifold for e in v.link_edges):
        v.co.z = CLOTH_MAX_Z - 0.008
torso = [v for v in cloth_verts if sum(w for i, w in v[deform].items() if names[i].startswith(('spine', 'breast'))) > 0.5 and not any(not e.is_manifold for e in v.link_edges)]
bmesh.ops.smooth_vert(bm, verts=torso, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
for _ in range(CLOTH_SMOOTHING - 1):
    bmesh.ops.smooth_vert(bm, verts=torso, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
print('sweater faces', len(cloth_faces))
bm.to_mesh(body.data)
bm.free()

# Hair and sweater become their own objects, skinned to the same skeleton.
parts = {}
for slot, label in ((CLOTH_SLOT, 'Cloth'),):
    select_only(body)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    body.active_material_index = slot
    bpy.ops.object.material_slot_select()
    before = set(bpy.data.objects)
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    part = (set(bpy.data.objects) - before).pop()
    part.name = part.data.name = label
    parts[label] = part

# The hair object: ribbons weighted completely to the head bone.
hair_mesh = bpy.data.meshes.new('Hair')
hair_mesh.from_pydata([tuple(v) for v in hair_verts_np], [], [tuple(f) for f in hair_faces])
hair_mesh.uv_layers.new(name='UVMap').data.foreach_set('uv', hair_uvs[[i for f in hair_faces for i in f]].ravel())
hair_obj = bpy.data.objects.new('Hair', hair_mesh)
bpy.context.scene.collection.objects.link(hair_obj)
hair_obj.vertex_groups.new(name='head').add(list(range(len(hair_verts_np))), 1.0, 'REPLACE')
parts['Hair'] = hair_obj
print('separated', {k: len(p.data.vertices) for k, p in parts.items()})

# --- bones: keep the ones that carry weight; at most 4 influences per vertex, as glTF ------------------------------------
bone_names = {b.name for b in rig.data.bones}
skinned = [body, *parts.values()]


def carries_weight(obj, group):
    return any(any(x.group == group.index and x.weight > 0 for x in v.groups) for v in obj.data.vertices)


used = {g.name for obj in skinned for g in obj.vertex_groups if g.name in bone_names and carries_weight(obj, g)}
for obj in skinned:
    for g in list(obj.vertex_groups):
        if g.name not in used and g.name not in ('fingernails', 'lips', 'ears', 'scalp'):
            obj.vertex_groups.remove(g)
    bone_groups = {g.index: g.name for g in obj.vertex_groups if g.name in used}
    for v in obj.data.vertices:
        ws = sorted(((g.weight, g.group) for g in v.groups if g.group in bone_groups), reverse=True)[:4]
        total = sum(w for w, _ in ws)
        for g in v.groups:
            if g.group in bone_groups:
                obj.vertex_groups[g.group].remove([v.index])
        if total > 0:
            for w, gi in ws:
                obj.vertex_groups[gi].add([v.index], w / total, 'REPLACE')

select_only(rig)
bpy.ops.object.mode_set(mode='EDIT')
for eb in list(rig.data.edit_bones):
    if eb.name not in used:
        rig.data.edit_bones.remove(eb)
bpy.ops.object.mode_set(mode='OBJECT')
print('bones kept', len(rig.data.bones))

# --- pose ----------------------------------------------------------------------------------------------------------------------------
pose = rig.pose.bones


def refresh():
    bpy.context.view_layer.update()


def rotate_about(name, rotation, pivot=None):
    pb = pose[name]
    p = pb.head.copy() if pivot is None else pivot
    pb.matrix = Matrix.Translation(p) @ rotation.to_4x4() @ Matrix.Translation(-p) @ pb.matrix
    refresh()


def segment(a, b):
    return pose[b].head - pose[a].head


def align(name, current, target):
    rotate_about(name, current.rotation_difference(target).to_matrix())


def dorsal():
    """The back of the right hand (unit vector), from the knuckle line and the direction of the middle finger."""
    across = pose['metacarpal4.R'].head - pose['metacarpal2.R'].head
    along = pose['finger3-1.R'].head - pose['wrist.R'].head
    return across.cross(along).normalized()


select_only(rig)
bpy.ops.object.mode_set(mode='POSE')
refresh()

# For a right hand the vector from the index to the little-finger knuckle crossed with the direction of the fingers is the back of the hand
# (checked after posing: the nails face up).
DORSAL_SIGN = 1.0
print('rest back of the hand', (DORSAL_SIGN * dorsal()).to_tuple(3))

# Right arm.
align('upperarm01.R', segment('upperarm01.R', 'lowerarm01.R'), UPPER_ARM)
align('lowerarm01.R', segment('lowerarm01.R', 'wrist.R'), FOREARM)
align('wrist.R', segment('wrist.R', 'finger3-1.R'), FOREARM)
# Turn the palm down by turning the forearm (half in each of its two bones), about the direction of the forearm.
for _ in range(2):
    back = DORSAL_SIGN * dorsal()
    flat = (back - back.dot(FOREARM) * FOREARM).normalized()
    angle = flat.angle(Vector((0, 0, 1)))
    if flat.cross(Vector((0, 0, 1))).dot(FOREARM) < 0:
        angle = -angle
    rotate_about('lowerarm01.R', Matrix.Rotation(angle / 2, 3, FOREARM))
    rotate_about('lowerarm02.R', Matrix.Rotation(angle / 2, 3, FOREARM))
print('hand back after posing', (DORSAL_SIGN * dorsal()).to_tuple(3))


# Left arm: the hand rests in the lap, below the table.
align('upperarm01.L', segment('upperarm01.L', 'lowerarm01.L'), LEFT_UPPER_ARM)
align('lowerarm01.L', segment('lowerarm01.L', 'wrist.L'), LEFT_FOREARM)

# A friendly mouth: the corners of the lips go up a little (the helper's neutral mouth looks sad from the front).
lips_group = body.vertex_groups['lips'].index
lip_verts = [v for v in body.data.vertices if any(g.group == lips_group and g.weight > 0.3 for g in v.groups)]
half_width = max(abs(v.co.x) for v in lip_verts)
mouth_z = sum(v.co.z for v in lip_verts) / len(lip_verts)
mouth_y = sum(v.co.y for v in lip_verts) / len(lip_verts)
for v in body.data.vertices:
    across = abs(v.co.x) / half_width
    if across > 2.5 or v.co.y > mouth_y + 0.03:      # only the front of the face around the mouth
        continue
    v.co.z += SMILE_LIFT * SCALE_Z * min(across, 1.0) ** 2 * math.exp(-max(0.0, across - 1.0) * 2.5) * math.exp(-((v.co.z - mouth_z) / (0.014 * SCALE_Z)) ** 2)

# Head down, looking at the hand.
rotate_about('head', Matrix.Rotation(math.radians(HEAD_PITCH_DEG), 3, Vector((1, 0, 0))))
bpy.ops.object.mode_set(mode='OBJECT')

for obj in skinned:
    if 'Armature' not in obj.modifiers:
        obj.modifiers.new('Armature', 'ARMATURE').object = rig
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier='Armature')
select_only(rig)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')

# --- origin: on the table top (lowest point of the right hand), under the right wrist -------------------------------------------
right_hand = [v for v in body.data.vertices if v.co.x < -0.1 and v.co.y < -0.2 and v.co.z < 1.15]
table_z = min(v.co.z for v in right_hand)
wrist = rig.data.bones['wrist.R'].head_local
shift = Vector((-wrist.x, -wrist.y, -table_z))
for obj in skinned:
    select_only(obj)
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for obj in (rig, *skinned):
    obj.location = obj.location + shift
    select_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for obj in skinned:
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)
    select_only(obj)
    obj.modifiers.new('Armature', 'ARMATURE').object = rig

bb = np.array([v.co[:] for v in body.data.vertices])
nail_group = body.vertex_groups['fingernails'].index
nails = [v for v in body.data.vertices if v.co.y < -0.05 and v.co.z < 0.15 and any(g.group == nail_group and g.weight > 0.5 for g in v.groups)]
print('nail vertices found', len(nails))
nail_normal = sum((v.normal for v in nails), Vector()).normalized()
print('mean nail normal', nail_normal.to_tuple(2))
assert nail_normal.z > 0.3, 'the nails of the right hand must face up'
print('table z (Blender) was', round(table_z, 4), '; bounds min', bb.min(0).round(3), 'max', bb.max(0).round(3))
tips = [rig.data.bones[f'finger{n}-3.R'].tail_local for n in range(1, 6)]
print('fingertips', [tuple(round(c, 3) for c in t) for t in tips])
print('left wrist z', round(rig.data.bones['wrist.L'].head_local.z, 3), '(below 0 is under the table)')
bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/customer_posed.blend')
