"""Procedural skin textures for the foot, baked in UV space: base colour, normal map and roughness (2048², like hand.glb).

Everything is a function of the 3D position on the foot (so it is seamless over UV seams), except the fine pores, which are
noise in texture space. The average colour of the base colour map is the same as in the hand texture (`TEXTURE_AVERAGE`
in src/ui/skin.ts), so the skin tint of the app works unchanged.
"""
import json
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK

SIZE = 2048
TARGET_AVERAGE = np.array([219.0, 163.0, 136.0])   # #dba388, average of the hand texture
NAIL_COLOUR = np.array([227.0, 169.0, 157.0])      # nail colour in the hand texture
rng = np.random.default_rng(20261116)

data = np.load(f'{WORK}/bake_input.npz')
tri_uv, tri_v, pos, nrm, nail = (data[k] for k in ('tri_uv', 'tri_v', 'pos', 'nrm', 'nail'))
bones = {k: np.array(v) for k, v in json.load(open(f'{WORK}/bones.json')).items()}

# --- rasterise the triangles into position / normal / nail weight / metres-per-texel maps --------------------------------
pos_map = np.zeros((SIZE, SIZE, 3), np.float32)
nrm_map = np.zeros((SIZE, SIZE, 3), np.float32)
nail_map = np.zeros((SIZE, SIZE), np.float32)
mpt_map = np.zeros((SIZE, SIZE), np.float32)
covered = np.zeros((SIZE, SIZE), bool)

for t in range(len(tri_v)):
    uv = tri_uv[t]
    px = np.stack([uv[:, 0] * SIZE, (1.0 - uv[:, 1]) * SIZE], axis=1)          # column, row
    x0, y0 = np.floor(px.min(0)).astype(int)
    x1, y1 = np.ceil(px.max(0)).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, SIZE - 1), min(y1, SIZE - 1)
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    a, b, c = px
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9:
        continue
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den
    l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
    l2 = 1.0 - l0 - l1
    inside = (l0 >= -1e-3) & (l1 >= -1e-3) & (l2 >= -1e-3)
    if not inside.any():
        continue
    v = tri_v[t]
    ys, xs = np.nonzero(inside)
    w = np.stack([l0[inside], l1[inside], l2[inside]], axis=1)
    rows, cols = ys + y0, xs + x0
    pos_map[rows, cols] = w @ pos[v]
    nrm_map[rows, cols] = w @ nrm[v]
    nail_map[rows, cols] = w @ nail[v]
    area3 = 0.5 * np.linalg.norm(np.cross(pos[v[1]] - pos[v[0]], pos[v[2]] - pos[v[0]]))
    areau = 0.5 * abs(den)
    mpt_map[rows, cols] = np.sqrt(area3 / areau)
    covered[rows, cols] = True
print('covered texels: %.1f%%' % (100 * covered.mean()))

# Fill the texels outside the islands from the nearest island texel (padding against bleeding in mip maps).
_, (iy, ix) = ndimage.distance_transform_edt(~covered, return_indices=True)
for m in (pos_map, nrm_map):
    m[...] = m[iy, ix]
nail_map = nail_map[iy, ix]
mpt_map = mpt_map[iy, ix]
nrm_map /= np.maximum(np.linalg.norm(nrm_map, axis=2, keepdims=True), 1e-6)

P = pos_map.astype(np.float64)
dorsal = np.clip((-nrm_map[..., 1] + 0.2) / 0.6, 0, 1)      # the top of the foot faces -y in the Blender frame of the model
sole = np.clip((nrm_map[..., 1] - 0.2) / 0.6, 0, 1)

# --- noise ----------------------------------------------------------------------------------------------------------------
LATTICE = rng.random((64, 64, 64)).astype(np.float32)

def noise3(p, frequency):
    q = p * frequency
    i = np.floor(q).astype(np.int64)
    f = (q - i).astype(np.float32)
    f = f * f * (3.0 - 2.0 * f)
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                out = out + w * LATTICE[(i[..., 0] + dx) & 63, (i[..., 1] + dy) & 63, (i[..., 2] + dz) & 63]
    return out - 0.5

# --- toe geometry: joints (wrinkles, slightly redder) and tips -------------------------------------------------------------
height = np.zeros((SIZE, SIZE))            # metres, wrinkles
redness = np.zeros((SIZE, SIZE))
for n in range(1, 6):
    names = [f'toe{n}-{k}.R' for k in (1, 2, 3) if f'toe{n}-{k}.R' in bones]
    joints = names[1:]                      # the joints between the toe bones
    for name in joints:
        head, tail = bones[name]
        axis = (tail - head) / np.linalg.norm(tail - head)
        rel = P - head
        s = rel @ axis
        r = np.linalg.norm(rel - s[..., None] * axis, axis=2)
        near = np.clip(1.0 - r / 0.016, 0, 1)                        # only on this toe
        jitter = 1.0 + 0.5 * noise3(P, 400.0)
        for offset, depth in ((-0.0007, 0.00022), (0.0007, 0.00018)):   # two fine lines per joint
            height -= depth * jitter * near * np.exp(-(((s - offset) / 0.00045) ** 2))
        redness += 0.5 * near * np.exp(-((s / 0.0045) ** 2)) * (0.4 + 0.6 * dorsal)
    tip = bones[names[-1]][1]
    redness += 0.8 * np.exp(-((np.linalg.norm(P - tip, axis=2) / 0.007) ** 2))

# --- base colour -----------------------------------------------------------------------------------------------------------
tone = 1.0 + 0.05 * noise3(P, 28.0) + 0.025 * noise3(P, 140.0)       # blotchy on a 3 cm and a 7 mm scale
warm = 0.05 * noise3(P + 7.3, 45.0)                                     # reddish / yellowish variation
colour = np.empty((SIZE, SIZE, 3))
colour[..., 0] = TARGET_AVERAGE[0] * tone * (1.0 + 0.5 * warm)
colour[..., 1] = TARGET_AVERAGE[1] * tone * (1.0 - 0.8 * warm)
colour[..., 2] = TARGET_AVERAGE[2] * tone * (1.0 - 0.6 * warm)
colour[..., 0] *= 1.0 + 0.045 * redness
colour[..., 1] *= 1.0 - 0.07 * redness
colour[..., 2] *= 1.0 - 0.06 * redness
colour *= (1.0 + sole[..., None] * np.array([0.03, 0.025, 0.0]))     # the sole is a little paler and yellower
colour += rng.normal(0, 1.2, (SIZE, SIZE, 1))                          # slight grain
alpha = np.clip((nail_map - 0.4) / 0.2, 0, 1)[..., None]
colour = colour * (1 - alpha) + NAIL_COLOUR * alpha
mean = colour[covered].mean(0)
colour *= TARGET_AVERAGE / mean                                         # same average colour as the hand texture
print('average colour', colour[covered].mean(0).round(1))

# --- normal map: toe-joint lines (physical slope) + pores ---------------------------------------------------------------------
height_s = ndimage.gaussian_filter(height, 0.7)
hr, hc = np.gradient(height_s)
slope_x = hc / np.maximum(mpt_map, 1e-6)
slope_y = -hr / np.maximum(mpt_map, 1e-6) * -1.0                         # image row grows downwards; the green channel points up
pore = ndimage.gaussian_filter(rng.normal(0, 1, (SIZE, SIZE)), 1.5)
pore_r, pore_c = np.gradient(pore)
pore_scale = 0.04 / np.std(pore_c)
pore_gain = (1.0 - 0.7 * sole) * (1.0 - 0.8 * np.clip((nail_map - 0.4) / 0.2, 0, 1))
slope_x = slope_x + pore_scale * pore_c * pore_gain
slope_y = slope_y + pore_scale * pore_r * pore_gain
nx, ny, nz = -slope_x, slope_y, np.ones_like(slope_x)
length = np.sqrt(nx * nx + ny * ny + nz * nz)
normal_img = np.stack([nx / length, ny / length, nz / length], axis=2) * 0.5 + 0.5

# --- roughness (glTF: green channel) ---------------------------------------------------------------------------------------------
roughness = 0.48 + 0.05 * noise3(P, 60.0) + 0.06 * sole - 0.16 * np.clip((nail_map - 0.4) / 0.2, 0, 1)
rough_img = np.stack([np.full((SIZE, SIZE), 1.0), np.clip(roughness, 0.05, 1.0), np.full((SIZE, SIZE), 1.0)], axis=2)

def save(array, name, quality):
    Image.fromarray(np.clip(array, 0, 255).astype(np.uint8)).save(f'{WORK}/{name}.jpg', quality=quality, subsampling=0)

save(colour, 'foot_basecolor', 92)
save(normal_img * 255.0, "foot_normal", 80)
save(rough_img * 255.0, 'foot_roughness', 85)
# Preview with the islands only.
Image.fromarray(np.clip(colour * covered[..., None], 0, 255).astype(np.uint8)).resize((1024, 1024)).save(f'{WORK}/preview_basecolor.png')
print('wrote textures')
