"""Imports a glb into an empty scene and renders a top and a side view (Cycles, CPU): python -I render_preview.py FILE.glb OUT_PREFIX"""
import math
import sys
import bpy
from mathutils import Vector

path, out_prefix = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 700, 900

world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.85, 0.87, 0.92, 1); bg.inputs['Strength'].default_value = 0.9
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.0
sun.rotation_euler = (math.radians(40), math.radians(15), math.radians(-30)); scene.collection.objects.link(sun)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 70

# glTF Y-up is imported as Blender Z-up with y -> -z... the importer converts, so just aim at the toes.

meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Foot')]
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
center = (lo + hi) / 2
print('bounds (Blender after import)', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))

def shot(name, direction, up):
    cam.location = center + Vector(direction).normalized() * 0.9
    look = (center - cam.location).to_track_quat('-Z', up)
    cam.rotation_euler = look.to_euler()
    scene.render.filepath = f'{out_prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)

# glTF +Z (toward the viewer of the model) is Blender -Y after import; glTF +Y is Blender +Z.
shot('top', (0, -1, 0.0), 'Y')
shot('side', (-1, -0.6, 0.35), 'Y')
