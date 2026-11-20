"""Imports the customer glb into an empty scene with a table and renders three views (Cycles, CPU): python -I render_preview.py FILE.glb OUT_PREFIX

Views: the salon view (the player's side, a little above the table), a close-up of the right hand and a view from the side.
"""
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
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 900, 700

world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.80, 0.84, 0.92, 1); bg.inputs['Strength'].default_value = 0.8
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-25)); scene.collection.objects.link(sun)

# The glTF importer turns glTF +Y (up) into Blender +Z and glTF +Z (towards the player) into Blender -Y. The table top is at 0.
bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.15, -0.35, -0.004))
table = bpy.context.object
table.scale = (1.2, 0.9, 1.0)
mat = bpy.data.materials.new('table'); mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.62, 0.45, 0.30, 1)
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.5
table.data.materials.append(mat)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam


def shot(name, location, target, lens):
    cam.data.lens = lens
    cam.location = Vector(location)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out_prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)


shot('salon', (0.18, -0.85, 0.65), (0.18, 0.05, 0.28), 38)
shot('hand', (0.12, -0.38, 0.30), (0.03, 0.02, 0.0), 50)
shot('side', (-0.75, 0.05, 0.30), (0.12, 0.05, 0.25), 38)
