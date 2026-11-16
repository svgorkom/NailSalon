"""Subdivides the cut foot (the hand has about the same density) and smooths the shading."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
from mpfb_boot import boot

SUBDIVISIONS = 2

boot()
bpy.ops.wm.open_mainfile(filepath=f'{WORK}/foot_posed.blend')
body = bpy.data.objects['Human']
rig = bpy.data.objects['Human.rig']

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_remove(modifier='Armature')
sub = body.modifiers.new('Subdivision', 'SUBSURF')
sub.levels = sub.render_levels = SUBDIVISIONS
sub.uv_smooth = 'PRESERVE_BOUNDARIES'
bpy.ops.object.modifier_apply(modifier='Subdivision')
bpy.ops.object.shade_smooth()
mod = body.modifiers.new('Armature', 'ARMATURE')
mod.object = rig
print('verts after subdivision', len(body.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/foot_sub.blend')
