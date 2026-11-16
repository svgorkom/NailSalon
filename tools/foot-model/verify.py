"""Checks a foot.glb (or hand.glb): joints, bounds, skin weights, the world frames of the nail anchors, and that the fitted nail
surface of every anchor lies on the skin.

    python -I verify.py FILE.glb
"""
import json
import struct
import sys

import numpy as np
from scipy.spatial import cKDTree


def load(path):
    """The JSON and the binary chunk of a .glb."""
    data = open(path, 'rb').read()
    offset, chunks = 12, []
    while offset < len(data):
        length, _kind = struct.unpack('<II', data[offset:offset + 8])
        chunks.append(data[offset + 8:offset + 8 + length])
        offset += 8 + length
    return json.loads(chunks[0]), chunks[1]


def local_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix']).reshape(4, 4).T
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    matrix = np.eye(4)
    matrix[:3, :3] = rotation * np.array(node.get('scale', [1, 1, 1]))
    matrix[:3, 3] = node.get('translation', [0, 0, 0])
    return matrix


def world_matrices(gltf):
    """World matrix of every node, through the whole node hierarchy."""
    parent = {child: i for i, node in enumerate(gltf['nodes']) for child in node.get('children', [])}
    cache = {}

    def world(i):
        if i not in cache:
            local = local_matrix(gltf['nodes'][i])
            cache[i] = world(parent[i]) @ local if i in parent else local
        return cache[i]

    return {i: world(i) for i in range(len(gltf['nodes']))}


def accessor(gltf, binary, index, components):
    acc = gltf['accessors'][index]
    view = gltf['bufferViews'][acc['bufferView']]
    return np.frombuffer(binary, dtype='<f4', count=acc['count'] * components, offset=view.get('byteOffset', 0) + acc.get('byteOffset', 0)).reshape(-1, components)


def main(path):
    gltf, binary = load(path)
    names = [node.get('name') for node in gltf['nodes']]
    world = world_matrices(gltf)
    print('generator:', gltf['asset'].get('generator'))
    print('joints:', len(gltf['skins'][0]['joints']), [names[i] for i in gltf['skins'][0]['joints']])
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            bounds = gltf['accessors'][primitive['attributes']['POSITION']]
            print('mesh', mesh['name'], bounds['count'], 'vertices; min', np.round(bounds['min'], 4), 'max', np.round(bounds['max'], 4))
    for image in gltf['images']:
        print('image', image.get('name'), image['mimeType'], gltf['bufferViews'][image['bufferView']]['byteLength'], 'bytes')

    primitive = gltf['meshes'][0]['primitives'][0]
    skin = cKDTree(accessor(gltf, binary, primitive['attributes']['POSITION'], 3))
    weights = accessor(gltf, binary, primitive['attributes']['WEIGHTS_0'], 4)
    print('weights per vertex sum to', weights.sum(1).min().round(4), 'to', weights.sum(1).max().round(4))

    for i, node in enumerate(gltf['nodes']):
        if not (node.get('name') or '').startswith('NailBed_'):
            continue
        extras, matrix = node['extras'], world[i]
        print(f"{node['name']}: origin {np.round(matrix[:3, 3], 4)} x {np.round(matrix[:3, 0], 2)} y {np.round(matrix[:3, 1], 2)} z {np.round(matrix[:3, 2], 2)}")
        xs = np.linspace(-0.4 * extras['nailWidth'], 0.4 * extras['nailWidth'], 7)
        ys = np.linspace(0.1 * extras['bedLength'], 0.95 * extras['bedLength'], 7)
        x, y = np.meshgrid(xs, ys)
        z = extras['gx'] * x + extras['gy'] * y + extras['gxx'] * x ** 2 + extras['gxy'] * x * y + extras['gyy'] * y ** 2
        points = (matrix @ np.stack([x.ravel(), y.ravel(), z.ravel(), np.ones(x.size)]))[:3].T
        distance, _ = skin.query(points)
        print(f"    width {extras['nailWidth'] * 1000:.1f} mm, bed {extras['bedLength'] * 1000:.1f} mm, distance of the nail surface to the skin: "
              f"mean {distance.mean() * 1000:.2f} mm, max {distance.max() * 1000:.2f} mm")


if __name__ == '__main__':
    main(sys.argv[1])
