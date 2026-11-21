"""Writes the UV triangles of the body with per-vertex position, normal and tags (nails, lips) plus the material slot of every triangle, the
bone segments and the eyes, for the texture bake."""
import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
import numpy as np
from mpfb_boot import boot

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/customer_sub.blend')
body = bpy.data.objects['Human']
rig = bpy.data.objects['Human.rig']
mesh = body.data
mesh.calc_loop_triangles()
uv = mesh.uv_layers.active.data
print('uv layer', mesh.uv_layers.active.name, 'tris', len(mesh.loop_triangles))


def weights(group):
    out = np.zeros(len(mesh.vertices))
    if group not in body.vertex_groups:
        return out
    gi = body.vertex_groups[group].index
    for v in mesh.vertices:
        for g in v.groups:
            if g.group == gi:
                out[v.index] = g.weight
    return out


nail, lips = np.maximum(weights('fingernails'), weights('toenails')), weights('lips')
pos = np.array([v.co[:] for v in mesh.vertices])
nrm = np.array([v.normal[:] for v in mesh.vertices])
T = len(mesh.loop_triangles)
tri_uv = np.zeros((T, 3, 2)); tri_v = np.zeros((T, 3), dtype=np.int64); tri_slot = np.zeros(T, dtype=np.int64)
for i, t in enumerate(mesh.loop_triangles):
    tri_slot[i] = t.material_index
    for k in range(3):
        tri_uv[i, k] = uv[t.loops[k]].uv
        tri_v[i, k] = t.vertices[k]
np.savez(f'{WORK}/bake_input.npz', tri_uv=tri_uv, tri_v=tri_v, tri_slot=tri_slot, pos=pos, nrm=nrm, nail=nail, lips=lips)
bones = {b.name: [list(b.head_local), list(b.tail_local)] for b in rig.data.bones}
json.dump(bones, open(f'{WORK}/bones.json', 'w'))
print('slots', np.bincount(tri_slot), 'uv range', tri_uv.reshape(-1, 2).min(0), tri_uv.reshape(-1, 2).max(0))
