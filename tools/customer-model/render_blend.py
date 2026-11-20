"""Quick look at a .blend of the customer (Workbench, no textures): python -I render_blend.py FILE.blend OUT_PREFIX [table]

Renders the salon view (from the player's side, a little above the table) and a close-up of the right hand and wrist.
The table top is at z = 0 in the file; `table` adds a plane there.
"""
import math
import sys
import bpy
from mathutils import Vector

path, out_prefix = sys.argv[-3], sys.argv[-2]
bpy.ops.wm.open_mainfile(filepath=path)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.render.resolution_x, scene.render.resolution_y = 900, 700
COLOURS = {'Skin': (0.86, 0.64, 0.53), 'Hair': (0.25, 0.15, 0.08), 'Cloth': (0.15, 0.45, 0.55), 'Eyes': (0.95, 0.95, 0.95),
           'Lashes': (0.05, 0.03, 0.02), 'Teeth': (0.95, 0.93, 0.88), 'Tongue': (0.8, 0.3, 0.35)}
for material in bpy.data.materials:
    if material.name in COLOURS:
        material.diffuse_color = (*COLOURS[material.name], 1.0)
for name in ('Camera', 'Cube', 'Light'):
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
if sys.argv[-1] == 'table':
    bpy.ops.mesh.primitive_plane_add(size=1.4, location=(0, -0.15, -0.012))
    bpy.context.object.scale = (1.0, 0.7, 1.0)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam


def shot(name, location, target, lens):
    cam.data.lens = lens
    cam.location = Vector(location)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out_prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)


# The player sits on the -Y side of the origin and looks towards +Y; the customer sits behind the hand, on the +Y side.
shot('salon', (0.0, -0.95, 0.75), (0.0, 0.0, 0.3), 38)
shot('hand', (0.05, -0.45, 0.35), (0.0, -0.08, 0.0), 50)
shot('side', (-0.9, -0.1, 0.35), (0.0, 0.0, 0.25), 38)
