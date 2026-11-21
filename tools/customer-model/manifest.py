"""Writes public/assets/customers/manifest.json from customers.json and the .glb files that exist: python -I manifest.py"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'assets', 'customers')

with open(os.path.join(HERE, 'customers.json'), encoding='utf-8') as file:
    customers = json.load(file)['customers']

entries = []
for customer in customers:
    # The hand model is <id>.glb, the pedicure model <id>-foot.glb (PART=foot in build.sh); a customer may have either or both.
    for part, entry_id in (('hand', customer['id']), ('foot', customer['id'] + '-foot')):
        path = os.path.join(OUT, entry_id + '.glb')
        if not os.path.exists(path):
            continue
        entries.append({'id': entry_id, 'name': customer['name'], 'part': part, 'file': entry_id + '.glb', 'bytes': os.path.getsize(path), 'skin': customer['skin'], 'about': customer['about']})

with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as file:
    json.dump({'customers': entries}, file, indent=2, ensure_ascii=False)
    file.write('\n')
print('manifest:', [e['id'] for e in entries])
