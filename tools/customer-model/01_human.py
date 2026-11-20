"""Creates the MPFB human for a customer (same body settings as hand.glb unless overridden), adds the default skeleton with weights and saves it."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import WORK
import bpy
from mpfb_boot import boot

boot()
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

macro = TargetService.get_default_macro_info_dict()
macro.update({'gender': 0.0, 'age': 0.5, 'muscle': 0.4, 'weight': 0.4, 'proportions': 0.5, 'height': 0.5, 'cupsize': 0.5, 'firmness': 0.5})
macro['race'] = {'asian': 0.0, 'caucasian': 1.0, 'african': 0.0}

body = HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
rig = HumanService.add_builtin_rig(body, 'default', import_weights=True)
print('mesh', len(body.data.vertices), 'vertices; rig', len(rig.data.bones), 'bones; height', round(body.dimensions.z, 3), 'm')
bpy.ops.wm.save_as_mainfile(filepath=f'{WORK}/human.blend')
