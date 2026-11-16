"""Loads MPFB (the MakeHuman add-on, run from source) inside plain `bpy`, without the Blender UI.

MPFB 2.0.18 is a Blender extension, so it is made available through a local extension repository that contains a link to
(or, where links are not allowed, a copy of) its source.
"""
import importlib
import os
import shutil

from config import MPFB_SRC, WORK

EXT_DIR = os.path.join(WORK, 'ext')
REPO_MODULE = 'user_default'
PACKAGE = f'bl_ext.{REPO_MODULE}.mpfb'


def _make_available() -> None:
    os.makedirs(EXT_DIR, exist_ok=True)
    target = os.path.join(EXT_DIR, 'mpfb')
    if os.path.exists(target):
        return
    if not os.path.isdir(MPFB_SRC):
        raise FileNotFoundError(f'MPFB source not found at {MPFB_SRC}; clone https://github.com/makehumancommunity/mpfb2 or set MPFB_SRC.')
    try:
        os.symlink(MPFB_SRC, target, target_is_directory=True)
    except OSError:
        shutil.copytree(MPFB_SRC, target)


def boot():
    """Registers the MPFB extension and returns its module."""
    import addon_utils
    import bpy

    _make_available()
    repos = bpy.context.preferences.extensions.repos
    repo = next((r for r in repos if r.module == REPO_MODULE), None)
    if repo is None:
        repo = repos.new(name='local', module=REPO_MODULE, custom_directory=EXT_DIR, remote_url='')
    repo.use_custom_directory = True
    repo.custom_directory = EXT_DIR
    repo.enabled = True
    addon_utils.extensions_refresh(ensure_wheels=False)
    if not any(m.__name__ == PACKAGE for m in addon_utils.modules(refresh=True)):
        raise RuntimeError(f'MPFB extension not found in {EXT_DIR}')
    addon_utils.enable(PACKAGE, default_set=True, persistent=True)
    return importlib.import_module(PACKAGE)
