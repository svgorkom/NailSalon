"""Gives the sweater its thickness, subdivides the body and the sweater and smooths the shading."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
from mpfb_boot import boot

BODY_SUBDIVISIONS = int(os.environ.get('CUSTOMER_BODY_SUBDIVISIONS', '1'))
CLOTH_SUBDIVISIONS = 1
CLOTH_THICKNESS = 0.004

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/customer_posed.blend')
rig = bpy.data.objects['Human.rig']
objects = {name: bpy.data.objects[name] for name in ('Human', 'Cloth', 'Hair')}


def select_only(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


for name, levels in (('Human', BODY_SUBDIVISIONS), ('Cloth', CLOTH_SUBDIVISIONS), ('Hair', 0)):
    obj = objects[name]
    select_only(obj)
    bpy.ops.object.modifier_remove(modifier='Armature')
    if name == 'Cloth':
        solid = obj.modifiers.new('Solidify', 'SOLIDIFY')
        solid.thickness = CLOTH_THICKNESS
        solid.offset = -1.0          # inwards: the outer side stays where it was, so the sweater still clears the skin
        bpy.ops.object.modifier_apply(modifier='Solidify')
    if levels:
        sub = obj.modifiers.new('Subdivision', 'SUBSURF')
        sub.levels = sub.render_levels = levels
        sub.uv_smooth = 'PRESERVE_BOUNDARIES'
        bpy.ops.object.modifier_apply(modifier='Subdivision')
    bpy.ops.object.shade_smooth()
    obj.modifiers.new('Armature', 'ARMATURE').object = rig
    print(name, 'vertices', len(obj.data.vertices), 'triangles', sum(len(p.vertices) - 2 for p in obj.data.polygons))
bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/customer_sub.blend')
