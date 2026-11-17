"""Cuts the right foot (with a piece of shin) out of the MPFB human, poses it and orients it like hand.glb."""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mpfb_boot import boot

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/human.blend')

SHIN_ABOVE_ANKLE = 0.10   # metres of shin kept above the ankle joint
PLANTAR_DEG = 60.0        # how far the foot is pointed (plantar flexion) in the fixed pose

body = bpy.data.objects['Human']
rig = bpy.data.objects['Human.rig']
for name in ('Camera', 'Cube', 'Light'):
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

def select_only(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

# Bake the macro-detail shape keys into the mesh.
if body.data.shape_keys:
    select_only(body)
    bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
print('shape keys left', body.data.shape_keys)

# --- cut -----------------------------------------------------------------------------------------------------------
KEEP_BONES = ['lowerleg02.R', 'foot.R'] + [f'toe1-{i}.R' for i in (1, 2)] + [f'toe{n}-{i}.R' for n in (2, 3, 4, 5) for i in (1, 2, 3)]
ankle = rig.matrix_world @ rig.data.bones['foot.R'].head_local
z_cut = ankle.z + SHIN_ABOVE_ANKLE
groups = {g.index: g.name for g in body.vertex_groups}
body_index = next(i for i, n in groups.items() if n == 'body')
keep = {v.index for v in body.data.vertices
        if v.co.x < 0 and v.co.z < z_cut and any(g.group == body_index and g.weight > 0.5 for g in v.groups)}
bm = bmesh.new()
bm.from_mesh(body.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context='VERTS')
bm.to_mesh(body.data)
bm.free()
print('verts kept', len(body.data.vertices), 'faces', len(body.data.polygons))

# Keep only the bones that carry weight on the cut mesh; normalise the weights over them (max 4 influences, as glTF).
keep_names = set(KEEP_BONES)
for g in list(body.vertex_groups):
    if g.name not in keep_names and g.name != 'toenails':
        body.vertex_groups.remove(g)
bone_groups = {g.index: g.name for g in body.vertex_groups if g.name in keep_names}
lost = 0.0
for v in body.data.vertices:
    ws = sorted(((g.weight, g.group) for g in v.groups if g.group in bone_groups), reverse=True)[:4]
    total = sum(w for w, _ in ws)
    if total < 0.999:
        lost = max(lost, 1.0 - total)
    for g in v.groups:
        if g.group in bone_groups:
            body.vertex_groups[g.group].remove([v.index])
    for w, gi in ws:
        body.vertex_groups[gi].add([v.index], w / total, 'REPLACE')
print('max weight share outside kept bones before normalising: %.3f' % lost)

select_only(rig)
bpy.ops.object.mode_set(mode='EDIT')
for eb in list(rig.data.edit_bones):
    if eb.name not in keep_names:
        rig.data.edit_bones.remove(eb)
rig.data.edit_bones['lowerleg02.R'].parent = None
bpy.ops.object.mode_set(mode='OBJECT')
print('bones', [b.name for b in rig.data.bones])

# --- pose: point the foot -------------------------------------------------------------------------------------------
select_only(rig)
bpy.ops.object.mode_set(mode='POSE')
pb = rig.pose.bones['foot.R']
about_ankle = Matrix.Translation(ankle) @ Matrix.Rotation(math.radians(PLANTAR_DEG), 4, 'X') @ Matrix.Translation(-ankle)
pb.matrix = about_ankle @ pb.matrix
bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode='OBJECT')

select_only(body)
bpy.ops.object.modifier_apply(modifier='Armature')
select_only(rig)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')

# --- orient: ankle in the origin, toes +Y, top of the foot +Z in glTF (Blender: toes +Z, top of the foot -Y) -----------
ball = sum((rig.data.bones[f'toe{n}-1.R'].head_local for n in range(1, 6)), Vector()) / 5.0
e_x = Vector((1.0, 0.0, 0.0))
f = (ball - ankle)
f = (f - f.dot(e_x) * e_x).normalized()
e_u = f.cross(e_x).normalized()
src = Matrix((e_x, f, e_u)).transposed()                       # columns: across, foot axis, top of the foot
dst = Matrix(((-1.0, 0.0, 0.0), (0.0, 0.0, 1.0), (0.0, -1.0, 0.0))).transposed()  # across -> -x, axis -> +z, top -> -y
rot = dst @ src.inverted()
assert abs(rot.determinant() - 1.0) < 1e-6, rot.determinant()
M = rot.to_4x4() @ Matrix.Translation(-ankle)

body.parent = None
for obj in (rig, body):
    obj.matrix_world = M
    select_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.parent = rig
body.matrix_parent_inverse = Matrix.Identity(4)
select_only(body)
mod = body.modifiers.new('Armature', 'ARMATURE')
mod.object = rig

bb = np.array([v.co[:] for v in body.data.vertices])
print('bounds (Blender, m) min', bb.min(0).round(4), 'max', bb.max(0).round(4))
tail = bb[:, 2].min()
print('foot tip z', bb[:, 2].max().round(4), 'shin end z', tail.round(4))
bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/foot_posed.blend')
