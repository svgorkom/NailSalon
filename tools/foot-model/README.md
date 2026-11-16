# Foot model

Generates `public/assets/foot/foot.glb`: the right foot of an MPFB human (same body settings as `hand.glb`) with a piece of shin,
a skeleton, a procedural skin and one nail anchor per toe. The specification is in the *Foot model* section of
[`docs/plans/Design.md`](../../docs/plans/Design.md). You only need this folder to regenerate or change the model.

## Setup

- Python 3.13 with `pip install bpy==5.3.0 numpy pillow scipy` (`bpy` is Blender as a module, about 430 MB).
- A checkout of MPFB 2.0.18 (CC0 base mesh, targets, skeleton and weights): `git clone https://github.com/makehumancommunity/mpfb2 tools/foot-model/mpfb2`,
  or point `MPFB_SRC` at its `src/mpfb` folder. `FOOT_WORK` moves the folder for intermediate files (default `tools/foot-model/work`).

## Run

Run the steps in order from this folder; each one reads the file the previous one wrote. Use `python -I` (isolated mode).

| Step | Script | Result in `work/` |
|---|---|---|
| 1 | `01_human.py` | `human.blend`: the human with the default skeleton and weights |
| 2 | `02_cut_and_pose.py` | `foot_posed.blend`: right foot and 10 cm of shin, foot pointed 60°, ankle in the origin, toes along +y and the top of the foot towards +z (glTF axes) |
| 3 | `03_subdivide.py` | `foot_sub.blend`: subdivision level 2 |
| 4 | `04_uv_and_bake_input.py` | `foot_uv.blend` (UVs scaled to fill the texture) and the input of the texture bake |
| 5 | `05_textures.py` | `foot_basecolor.jpg`, `foot_normal.jpg`, `foot_roughness.jpg` (2048²; the average colour is the one of the hand texture) |
| 6 | `06_export.py [OUT.glb]` | `foot.glb` (or `OUT.glb`): material, nail anchors, export |

Then check the result with `python -I verify.py FILE.glb` (joints, weights, world frames of the anchors, distance of the nail surfaces to the skin)
and look at it with `python -I render_preview.py FILE.glb OUT_PREFIX` (Cycles, CPU). Copy the file to `public/assets/foot/foot.glb`.

## Keep when changing

Names and axes are the contract with the app: `NailBed_BigToe|SecondToe|ThirdToe|FourthToe|LittleToe`, each a child of the last toe bone, with local
axes x across the nail, y from cuticle to tip, z up, and `nailWidth`, `bedLength`, `gx`, `gy`, `gxx`, `gxy`, `gyy` in `extras`. In Blender's glTF export the
local axes of an empty are the Blender axes `(x, y, z) → (x, z, −y)`, so step 6 builds the frame as `(across, −up, along)`.
