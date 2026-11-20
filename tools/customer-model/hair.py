"""Hair of a customer as ribbons ("cards") that drape over the head: numpy only, no Blender, so it can be tried and tested on its own.

Each strand starts on the scalp, is pushed along by gravity and a flow field (front hair sweeps to the side and behind the ear, as a
parting does), slides over an ellipsoid that stands for the skull and hangs down until its end height. Every strand becomes a ribbon of
a few segments facing outwards; the texture (see `strand_texture`) cuts several thin hairs out of each ribbon.
"""
import numpy as np

SEGMENTS = 8           # quads along a ribbon
STEP = 0.008           # metres per simulation step
RIBBON_WIDTH = 0.013
SOLID_V = 0.96          # ribbons use the texture from 0 to this; above it the texture is solid (see `strand_texture`), for the scalp cap
MARGIN = 0.004         # the hair lies this far above the skull, plus the layer offset


def head_ellipsoid(head_points):
    """The skull as an ellipsoid (centre, radii) from the skin vertices of the head (N,3)."""
    top = head_points[:, 2].max()
    upper = head_points[head_points[:, 2] > top - 0.16]
    a = float(np.abs(upper[:, 0]).max())
    front, back = float(np.percentile(upper[:, 1], 5)), float(upper[:, 1].max())
    b = (back - front) / 2
    c = 0.55 * (a + b)
    return np.array([0.0, (front + back) / 2, top - c]), np.array([a, b, c])


def _inside(p, centre, radii, grow):
    q = (p - centre) / (radii + grow)
    return float(q @ q)


def _push_out(p, centre, radii, grow):
    """Moves p to the inflated ellipsoid if it is inside."""
    r = radii + grow
    q = (p - centre) / r
    n2 = float(q @ q)
    return p if n2 >= 1.0 else centre + q / np.sqrt(n2) * r


def _tangent(d, n):
    """d with its part along the surface normal n removed, normalised."""
    t = d - n * float(d @ n)
    length = np.linalg.norm(t)
    return t / length if length > 1e-6 else d / np.linalg.norm(d)


def _strand(root, centre, radii, p, rng, end_z, cap):
    """One strand as a polyline (K,3)."""
    a, b, c = radii
    layer = rng.uniform(0.0, 1.0) * p['volume'] * 0.012
    grow = MARGIN + layer
    side = 1.0 if (root[0] - p['parting'] * a) >= 0 else -1.0
    # How much of the front the strand is in: 1 at the forehead, 0 from the crown backwards.
    front = float(np.clip((centre[1] - root[1]) / (b * 0.75), 0.0, 1.0))
    outward = (root - centre) / radii
    outward /= np.linalg.norm(outward)
    flow = np.array([side, 0.55, 0.0])
    flow /= np.linalg.norm(flow)
    down = np.array([0.0, 0.0, -1.0])
    radial = np.array([outward[0], outward[1], 0.0])
    radial /= np.linalg.norm(radial) + 1e-9
    d = (1 - front) * (radial * 0.6 + down * 0.4) + front * flow
    d = _tangent(d, outward)
    pos = _push_out(root, centre, radii, grow)
    pts = [pos.copy()]
    phase = rng.uniform(0, 2 * np.pi)
    travelled = 0.0
    for _ in range(400):
        gravity = 0.25 if cap else min(1.0, 0.5 + travelled / 0.04)   # cap strands lie on the scalp; the others fall
        d = d + down * gravity * 1.1 + front * flow * 0.25 * (pos[2] > centre[2] - 0.02)
        if p['curl'] > 0:                                    # waves and curls: a sideways wobble that grows along the strand
            wobble = np.array([np.cos(travelled * p['curl_freq'] + phase), 0.0, 0.0])
            d = d + wobble * p['curl'] * min(1.0, travelled / 0.05)
        d /= np.linalg.norm(d)
        n_here = (pos - centre) / radii
        n_here /= np.linalg.norm(n_here)
        if _inside(pos, centre, radii, grow * 1.6) < 1.0:
            d = _tangent(d, n_here)             # lying on the skull: slide along it, do not lift off
        pos = pos + d * STEP
        pos = _push_out(pos, centre, radii, grow)
        # Below the eyes the hair stays beside and behind the ear, so it does not cover the cheeks.
        if pos[2] < centre[2] + c - 0.065 and pos[1] < centre[1] - 0.02:
            pos[1] = centre[1] - 0.02
        travelled += STEP
        pts.append(pos.copy())
        if pos[2] <= end_z or (cap and travelled > 0.05):
            break
    return np.array(pts)


def _resample(pts, count):
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0.0], np.cumsum(seg)])
    t = np.linspace(0.0, s[-1], count)
    return np.stack([np.interp(t, s, pts[:, k]) for k in range(3)], axis=1)


def build_hair(scalp_triangles, head_points, params, seed):
    """Ribbons for the hair.

    scalp_triangles: (T,3,3) triangles of the scalp. head_points: (N,3) skin vertices of the head.
    params: colour is not used here; `length_z` (end height), `count`, `volume` (0-1), `parting` (-1..1), `curl` (0-1), `curl_freq` (waves per metre).
    Returns (vertices (V,3), quads (Q,4) of vertex indices, uvs (V,2)); u runs across a ribbon, v from the root to the tip.
    """
    rng = np.random.default_rng(seed)
    centre, radii = head_ellipsoid(head_points)
    areas = 0.5 * np.linalg.norm(np.cross(scalp_triangles[:, 1] - scalp_triangles[:, 0], scalp_triangles[:, 2] - scalp_triangles[:, 0]), axis=1)
    picks = rng.choice(len(scalp_triangles), size=params['count'], p=areas / areas.sum())
    uv = rng.random((params['count'], 2))
    flip = uv.sum(1) > 1
    uv[flip] = 1 - uv[flip]
    roots = [scalp_triangles[i, 0] + u * (scalp_triangles[i, 1] - scalp_triangles[i, 0]) + v * (scalp_triangles[i, 2] - scalp_triangles[i, 0]) for i, (u, v) in zip(picks, uv)]

    verts, quads, uvs = [], [], []
    for root in roots:
        end_z = params['length_z'] + rng.uniform(-0.012, 0.012)
        if root[2] < end_z + 0.03:
            continue                                         # roots at the nape of a short cut
        line = _strand(np.asarray(root, dtype=float), centre, radii, params, rng, end_z, cap=rng.random() < 0.35)
        if len(line) < 3:
            continue
        line = _resample(line, SEGMENTS + 1)
        tangents = np.gradient(line, axis=0)
        tangents /= np.linalg.norm(tangents, axis=1, keepdims=True) + 1e-9
        out = (line - centre) / radii
        out /= np.linalg.norm(out, axis=1, keepdims=True) + 1e-9
        across = np.cross(tangents, out)
        across /= np.linalg.norm(across, axis=1, keepdims=True) + 1e-9
        half = RIBBON_WIDTH * (0.85 + 0.3 * rng.random()) / 2
        base = len(verts)
        for k, (point, side) in enumerate(zip(line, across)):
            v = SOLID_V * k / SEGMENTS
            verts.append(point - side * half)
            verts.append(point + side * half)
            uvs.append((0.0, v))
            uvs.append((1.0, v))
        for k in range(SEGMENTS):
            i = base + 2 * k
            quads.append((i, i + 1, i + 3, i + 2))
    return np.array(verts), np.array(quads), np.array(uvs)


def strand_texture(width=128, height=512, seed=1):
    """RGBA image (H,W,4) uint8: about six thin hairs side by side, tapering to a point; grey shading (the material colour tints it), darker at the root. The top rows (v above SOLID_V) are one solid grey."""
    rng = np.random.default_rng(seed)
    u = (np.arange(width) + 0.5) / width
    v = (np.arange(height) + 0.5) / height
    U, V = np.meshgrid(u, v)
    alpha = np.zeros((height, width))
    shade = np.zeros((height, width))
    count = 14
    for k in range(count):
        centre = (k + 0.5) / count + rng.uniform(-0.03, 0.03)
        half = 0.5 / count * rng.uniform(0.9, 1.15)
        end = rng.uniform(0.84, 0.95)
        taper = np.clip((end - V) / 0.25, 0, 1)             # narrows to a point over the last quarter
        inside = np.abs(U - centre) < half * (0.25 + 0.75 * taper) * (1.0 - 0.15 * V)
        inside &= V < end
        alpha = np.maximum(alpha, inside)
        shade = np.where(inside, rng.uniform(0.9, 1.0), shade)
    shade *= 0.88 + 0.12 * np.clip(V / 0.3, 0, 1)             # darker at the root
    solid = V > SOLID_V + 0.01
    alpha = np.where(solid, 1.0, alpha)
    shade = np.where(solid, 0.92, shade)
    grey = np.clip(shade * 255, 0, 255).astype(np.uint8)
    # Row 0 of an image is v = 1 in glTF and the root is v = 0 here, so the root goes to the bottom row.
    return np.flipud(np.dstack([grey, grey, grey, (alpha * 255).astype(np.uint8)]))
