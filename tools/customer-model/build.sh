#!/bin/sh
# Builds customers (all of customers.json, or the ones named as arguments) into ../../public/assets/customers/<id>.glb and writes manifest.json.
# Run from this folder, with the setup of README.md done.
set -e
OUT=../../public/assets/customers
mkdir -p "$OUT"
if [ $# -eq 0 ]; then set -- $(python3 -I -c "import json;print(' '.join(c['id'] for c in json.load(open('customers.json'))['customers']))"); fi
for id in "$@"; do
  export CUSTOMER="$id"
  for step in 01_human 02_cut_and_pose 03_subdivide 04_bake_input 05_textures; do
    python3 -I $step.py
  done
  python3 -I 06_export.py "$OUT/$id.glb"
done
python3 -I manifest.py
