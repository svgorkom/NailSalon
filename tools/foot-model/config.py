"""Paths for the foot-model scripts. Both can be overridden with environment variables."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# Intermediate files (.blend, textures, ...). Git-ignored.
WORK = os.environ.get('FOOT_WORK', os.path.join(HERE, 'work')).replace('\\', '/')
# `src/mpfb` of a checkout of https://github.com/makehumancommunity/mpfb2 (version 2.0.18).
MPFB_SRC = os.environ.get('MPFB_SRC', os.path.join(HERE, 'mpfb2', 'src', 'mpfb'))

os.makedirs(WORK, exist_ok=True)
