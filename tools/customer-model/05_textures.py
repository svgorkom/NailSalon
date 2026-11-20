"""Procedural textures for the customer, baked in UV space: base colour, normal map and roughness (2048², like hand.glb).

One set of images serves the skin and the face features (eyes, lashes, teeth, tongue), which have their own UV islands. Everything is
a function of the 3D position on the body (so it is seamless over UV seams), except the fine pores, which are noise in texture space.
The average colour of the skin is the one of the hand texture (`TEXTURE_AVERAGE` in src/ui/skin.ts), so the skin tint of the app works unchanged.
"""
import json
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import CUSTOMER, srgb, WORK

SIZE = 2048
TARGET_AVERAGE = np.array([219.0, 163.0, 136.0])   # #dba388, average of the hand texture
NAIL_COLOUR = np.array([227.0, 169.0, 157.0])      # nail colour in the hand texture
LIP_COLOUR = np.array(srgb(CUSTOMER['lips']))
BROW_COLOUR = np.array(srgb(CUSTOMER['hair']['colour'])) * 0.9 + 12.0   # a little lighter than the hair
IRIS_COLOUR = np.array(srgb(CUSTOMER['eyes']))
SCLERA = np.array([238.0, 236.0, 230.0])
TEETH = np.array([232.0, 226.0, 210.0])
TONGUE = np.array([196.0, 98.0, 104.0])
LASHES = np.array([28.0, 20.0, 18.0])
SKIN, EYES, LASH, TEETH_SLOT, TONGUE_SLOT = 0, 1, 2, 3, 4
rng = np.random.default_rng(20261120)

data = np.load(f'{WORK}/bake_input.npz')
tri_uv, tri_v, tri_slot, pos, nrm, nail, lips = (data[k] for k in ('tri_uv', 'tri_v', 'tri_slot', 'pos', 'nrm', 'nail', 'lips'))
bones = {k: np.array(v) for k, v in json.load(open(f'{WORK}/bones.json')).items()}

# --- rasterise the triangles into position / normal / tag / metres-per-texel maps -----------------------------------------------
pos_map = np.zeros((SIZE, SIZE, 3), np.float32)
nrm_map = np.zeros((SIZE, SIZE, 3), np.float32)
nail_map = np.zeros((SIZE, SIZE), np.float32)
lip_map = np.zeros((SIZE, SIZE), np.float32)
mpt_map = np.zeros((SIZE, SIZE), np.float32)
slot_map = np.zeros((SIZE, SIZE), np.int8)
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
    lip_map[rows, cols] = w @ lips[v]
    slot_map[rows, cols] = tri_slot[t]
    area3 = 0.5 * np.linalg.norm(np.cross(pos[v[1]] - pos[v[0]], pos[v[2]] - pos[v[0]]))
    mpt_map[rows, cols] = np.sqrt(area3 / (0.5 * abs(den)))
    covered[rows, cols] = True
print('covered texels: %.1f%%' % (100 * covered.mean()))

# Fill the texels outside the islands from the nearest island texel (padding against bleeding in mip maps).
_, (iy, ix) = ndimage.distance_transform_edt(~covered, return_indices=True)
for m in (pos_map, nrm_map):
    m[...] = m[iy, ix]
nail_map, lip_map, mpt_map, slot_map = nail_map[iy, ix], lip_map[iy, ix], mpt_map[iy, ix], slot_map[iy, ix]
nrm_map /= np.maximum(np.linalg.norm(nrm_map, axis=2, keepdims=True), 1e-6)
P = pos_map.astype(np.float64)
skin = slot_map == SKIN

# --- noise -------------------------------------------------------------------------------------------------------------------------
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


# --- skin -------------------------------------------------------------------------------------------------------------------------
tone = 1.0 + 0.05 * noise3(P, 28.0) + 0.025 * noise3(P, 140.0)
warm = 0.05 * noise3(P + 7.3, 45.0)
colour = np.empty((SIZE, SIZE, 3))
colour[..., 0] = TARGET_AVERAGE[0] * tone * (1.0 + 0.5 * warm)
colour[..., 1] = TARGET_AVERAGE[1] * tone * (1.0 - 0.8 * warm)
colour[..., 2] = TARGET_AVERAGE[2] * tone * (1.0 - 0.6 * warm)
colour += rng.normal(0, 1.2, (SIZE, SIZE, 1))
mean = colour[covered & skin].mean(0)
colour *= TARGET_AVERAGE / mean                                      # same average colour as the hand texture
print('average skin colour', colour[covered & skin].mean(0).round(1))


def mix(base, other, amount):
    return base * (1 - amount[..., None]) + np.asarray(other) * amount[..., None]


colour = mix(colour, NAIL_COLOUR, np.clip((nail_map - 0.4) / 0.2, 0, 1))
colour = mix(colour, LIP_COLOUR, np.clip((lip_map - 0.3) / 0.4, 0, 1) * 0.85)

# --- the eyes: where they look, and the eyebrows above them ---------------------------------------------------------------------------
eye_c = {s: bones[f'eye.{s}'][0] for s in 'LR'}
eye_f = {s: (bones[f'eye.{s}'][1] - bones[f'eye.{s}'][0]) / np.linalg.norm(bones[f'eye.{s}'][1] - bones[f'eye.{s}'][0]) for s in 'LR'}
up = bones['head'][1] - bones['head'][0]
up /= np.linalg.norm(up)
forward = eye_f['L'] + eye_f['R']
forward /= np.linalg.norm(forward)
side = np.cross(up, forward)
side /= np.linalg.norm(side)

nearest = np.where(np.linalg.norm(P - eye_c['L'], axis=2) < np.linalg.norm(P - eye_c['R'], axis=2), 0, 1)
centre = np.where(nearest[..., None] == 0, eye_c['L'], eye_c['R'])
gaze = np.where(nearest[..., None] == 0, eye_f['L'], eye_f['R'])
radial = P - centre
radial /= np.maximum(np.linalg.norm(radial, axis=2, keepdims=True), 1e-9)
theta = np.arccos(np.clip((radial * gaze).sum(2), -1, 1))
iris = np.clip((0.50 - theta) / 0.03, 0, 1)
pupil = np.clip((0.20 - theta) / 0.02, 0, 1)
ring = np.exp(-(((theta - 0.46) / 0.05) ** 2))
eye = np.where(iris[..., None] > 0, 1, 1) * SCLERA
eye = mix(eye, IRIS_COLOUR * (0.75 + 0.5 * (0.5 + noise3(P, 700.0))[..., None]), iris)
eye = mix(eye, IRIS_COLOUR * 0.35, ring * iris)
eye = mix(eye, np.array([8.0, 8.0, 10.0]), pupil)
colour = np.where((slot_map == EYES)[..., None], eye, colour)
colour = np.where((slot_map == LASH)[..., None], LASHES, colour)
colour = np.where((slot_map == TEETH_SLOT)[..., None], TEETH, colour)
colour = np.where((slot_map == TONGUE_SLOT)[..., None], TONGUE * (0.92 + 0.16 * (0.5 + noise3(P, 500.0))[..., None]), colour)

brow = np.zeros((SIZE, SIZE))
for s in 'LR':
    anchor = eye_c[s] + eye_f[s] * 0.015 + up * 0.0235
    d = P - anchor
    q = ((d @ side) / 0.019) ** 2 + ((d @ up) / 0.0048) ** 2 + ((d @ forward) / 0.013) ** 2
    brow = np.maximum(brow, np.exp(-q))
brow *= skin * (nrm_map @ forward > 0.2) * (0.8 + 0.4 * (0.5 + noise3(P, 900.0)))
colour = mix(colour, BROW_COLOUR, np.clip(brow, 0, 0.9))

# --- normal map: pores, as a height in metres so that they have the same size everywhere on the body ---------------------------------
PORE_HEIGHT = 0.00009
height = PORE_HEIGHT * (noise3(P, 900.0) + 0.6 * noise3(P + 3.1, 1900.0))
hr, hc = np.gradient(ndimage.gaussian_filter(height, 0.7))
pore_gain = skin * (1.0 - 0.8 * np.clip((nail_map - 0.4) / 0.2, 0, 1)) * (1.0 - 0.7 * np.clip((lip_map - 0.3) / 0.4, 0, 1))
slope_x = hc / np.maximum(mpt_map, 1e-6) * pore_gain
slope_y = hr / np.maximum(mpt_map, 1e-6) * pore_gain
nx, ny, nz = -slope_x, slope_y, np.ones_like(slope_x)
length = np.sqrt(nx * nx + ny * ny + nz * nz)
normal_img = np.stack([nx / length, ny / length, nz / length], axis=2) * 0.5 + 0.5

# --- roughness (glTF: green channel) ---------------------------------------------------------------------------------------------------
roughness = 0.5 + 0.05 * noise3(P, 60.0) - 0.16 * np.clip((nail_map - 0.4) / 0.2, 0, 1) - 0.1 * np.clip((lip_map - 0.3) / 0.4, 0, 1)
roughness = np.where(slot_map == EYES, 0.08, roughness)
roughness = np.where(slot_map == TEETH_SLOT, 0.3, roughness)
roughness = np.where(slot_map == TONGUE_SLOT, 0.4, roughness)
roughness = np.where(slot_map == LASH, 0.6, roughness)
rough_img = np.stack([np.full((SIZE, SIZE), 1.0), np.clip(roughness, 0.05, 1.0), np.full((SIZE, SIZE), 1.0)], axis=2)


def save(array, name, quality):
    Image.fromarray(np.clip(array, 0, 255).astype(np.uint8)).save(f'{WORK}/{name}.jpg', quality=quality, subsampling=0)


save(colour, 'customer_basecolor', 90)
save(normal_img * 255.0, 'customer_normal', 80)
save(rough_img * 255.0, 'customer_roughness', 85)
Image.fromarray(np.clip(colour * covered[..., None], 0, 255).astype(np.uint8)).resize((1024, 1024)).save(f'{WORK}/preview_basecolor.png')
print('wrote textures')
