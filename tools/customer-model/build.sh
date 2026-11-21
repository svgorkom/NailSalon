#!/bin/sh
# Builds customers (all of customers.json, or the ones named as arguments) into ../../public/assets/customers/<id>.glb and writes manifest.json.
# PART=foot builds the pedicure model (<id>-foot.glb): PART=foot ./build.sh emma
# Run from this folder, with the setup of README.md done.
set -e
OUT=../../public/assets/customers
mkdir -p "$OUT"
if [ $# -eq 0 ]; then set -- $(python3 -I -c "import json;print(' '.join(c['id'] for c in json.load(open('customers.json'))['customers']))"); fi
for id in "$@"; do
  export CUSTOMER="$id"
  NAME="$id"; if [ "$PART" = "foot" ]; then NAME="$id-foot"; fi
  for step in 01_human 02_cut_and_pose 03_subdivide 04_bake_input 05_textures; do
    python3 -I $step.py
  done
  python3 -I 06_export.py "$OUT/$NAME.glb"
  # Meshopt compression with 16-bit positions, 12-bit normals: a third of the size, no visible difference (pixel-compared in the browser).
  npx --yes @gltf-transform/cli@4.5.1 meshopt "$OUT/$NAME.glb" "$OUT/$NAME.glb" --level high --quantize-position 16 --quantize-normal 12 --quantize-texcoord 14 --quantize-weight 10
done
python3 -I manifest.py
