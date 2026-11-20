#!/bin/sh
# Runs all steps in order; usage: ./build.sh [OUT.glb]  (from this folder, with the setup of README.md done)
set -e
for step in 01_human 02_cut_and_pose 03_subdivide 04_bake_input 05_textures; do
  python3 -I $step.py
done
python3 -I 06_export.py "$@"
