"""Paths and the customer being built for the customer-model scripts.

The customer is chosen with the environment variable CUSTOMER (an id from customers.json, default the first); intermediate files go to
`work/<id>/`. WORK and MPFB_SRC can be overridden with environment variables.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
# `src/mpfb` of a checkout of https://github.com/makehumancommunity/mpfb2 (version 2.0.18).
MPFB_SRC = os.environ.get('MPFB_SRC', os.path.join(HERE, 'mpfb2', 'src', 'mpfb'))

with open(os.path.join(HERE, 'customers.json'), encoding='utf-8') as _file:
    CUSTOMERS = json.load(_file)['customers']
CUSTOMER_ID = os.environ.get('CUSTOMER', CUSTOMERS[0]['id'])
CUSTOMER = next(c for c in CUSTOMERS if c['id'] == CUSTOMER_ID)
# What the player paints on this model: 'hand' (the right arm rests on the table) or 'foot' (pedicure: the right leg rests on a footrest).
PART = os.environ.get('PART', 'hand')
assert PART in ('hand', 'foot'), PART

# Intermediate files (.blend, textures, ...). Git-ignored.
WORK = os.path.join(os.environ.get('CUSTOMER_WORK', os.path.join(HERE, 'work')), CUSTOMER_ID if PART == 'hand' else f'{CUSTOMER_ID}-foot').replace('\\', '/')
os.makedirs(WORK, exist_ok=True)


def srgb(hex_colour):
    """'#rrggbb' as 0-255 floats."""
    return [float(int(hex_colour[i:i + 2], 16)) for i in (1, 3, 5)]


def linear(hex_colour):
    """'#rrggbb' as linear RGBA (0-1), the form Blender materials take."""
    def channel(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in srgb(hex_colour))
    return (r, g, b, 1.0)
