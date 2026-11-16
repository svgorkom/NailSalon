"""Writes the UV triangles of the foot with per-vertex position, normal and nail weight, plus the bone segments, for the texture bake."""
import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
import numpy as np
from mpfb_boot import boot

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/foot_sub.blend')
body = bpy.data.objects['Human']
rig = bpy.data.objects['Human.rig']
mesh = body.data
mesh.calc_loop_triangles()
uv = mesh.uv_layers.active.data
print('uv layer', mesh.uv_layers.active.name, 'tris', len(mesh.loop_triangles))

# The foot islands sit in a small corner of the body UV map: scale them (uniformly) to fill the texture, with a margin.
MARGIN = 0.02
coords = np.array([d.uv[:] for d in uv])
lo, hi = coords.min(0), coords.max(0)
scale = (1.0 - 2 * MARGIN) / float((hi - lo).max())
for d in uv:
    d.uv = ((d.uv[0] - lo[0]) * scale + MARGIN, (d.uv[1] - lo[1]) * scale + MARGIN)
print('uv scale %.3f' % scale)
bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/foot_uv.blend')

gi = body.vertex_groups['toenails'].index
nail = np.zeros(len(mesh.vertices))
for v in mesh.vertices:
    for g in v.groups:
        if g.group == gi:
            nail[v.index] = g.weight
pos = np.array([v.co[:] for v in mesh.vertices])
nrm = np.array([v.normal[:] for v in mesh.vertices])

T = len(mesh.loop_triangles)
tri_uv = np.zeros((T, 3, 2)); tri_v = np.zeros((T, 3), dtype=np.int64)
for i, t in enumerate(mesh.loop_triangles):
    for k in range(3):
        tri_uv[i, k] = uv[t.loops[k]].uv
        tri_v[i, k] = t.vertices[k]
np.savez(f'{WORK}/bake_input.npz', tri_uv=tri_uv, tri_v=tri_v, pos=pos, nrm=nrm, nail=nail)
bones = {b.name: [list(b.head_local), list(b.tail_local)] for b in rig.data.bones}
json.dump(bones, open(f'{WORK}/bones.json', 'w'))
print('uv range', tri_uv.reshape(-1, 2).min(0), tri_uv.reshape(-1, 2).max(0))
