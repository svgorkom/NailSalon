# Customer model

Generates `public/assets/customers/proto/customer-proto.glb`: one seated customer of the salon game, from the head to the table, as **one skinned mesh**,
so the hand is the end of her own arm and there is no seam at the wrist. Same MPFB body settings as `hand.glb` and `foot.glb`
(female, Caucasian, age 0.5, muscle and weight 0.4). This is the proof of the plan's phase 1; see *Customer model* in
[`docs/plans/Design.md`](../../docs/plans/Design.md).

## Setup

Same as [`tools/foot-model`](../foot-model/README.md): Python 3.13 with `pip install bpy==5.3.0 numpy pillow scipy`, and MPFB 2.0.18
(`git clone https://github.com/makehumancommunity/mpfb2 tools/customer-model/mpfb2`, or point `MPFB_SRC` at its `src/mpfb` folder).
`CUSTOMER_WORK` moves the folder for intermediate files (default `tools/customer-model/work`, ignored by git).

## Run

`./build.sh` runs everything; or run the steps in order from this folder with `python -I`:

| Step | Script | Result in `work/` |
|---|---|---|
| 1 | `01_human.py` | `human.blend`: human with the default skeleton and weights |
| 2 | `02_cut_and_pose.py` | `customer_posed.blend`: upper body, right hand palm down on the table, left hand in the lap, hair and sweater as separate objects |
| 3 | `03_subdivide.py` | subdivision: body level 1, sweater level 1 with 4 mm thickness |
| 4 | `04_bake_input.py` | input of the texture step |
| 5 | `05_textures.py` | 2048² colour, normal and roughness textures (skin, lips, nails, eyes, brows, pores) |
| 6 | `06_export.py [OUT.glb]` | `customer.glb`: materials `Skin`, `Features`, `Hair`, `Cloth`, nail anchors, export |

Check with `python -I ../foot-model/verify.py work/customer.glb Customer` (the last argument is the mesh whose skin the anchors are measured against)
and look with `render_blend.py` (quick, Workbench) or `render_preview.py` (Cycles).

## Keep when changing

- Origin on the table top under the right wrist, the customer behind it facing +z, y up (metres, glTF axes). The player looks from +z.
- Anchors `NailBed_Thumb|Index|Middle|Ring|Pinky` with the same axes and `extras` as `hand.glb` (checked by `tests/scene/customerModel.test.ts`).
- Material `Skin` is the one the app tints; keep the other materials flat or textured separately.
- Budget: file ≤ 6 MB.
