import json, base64, re

with open('C:/Users/admin/Desktop/Walrus Forum/mini-forum-app/suins-pkg.json') as f:
    data = json.load(f)

mod_map = data.get('content', {}).get('Package', {}).get('module_map', {})
for mod_name, b64_bytes in mod_map.items():
    try:
        padding = 4 - len(b64_bytes) % 4
        if padding != 4:
            b64_bytes += '=' * padding
        b = base64.b64decode(b64_bytes).decode('latin-1')
        funcs = set(re.findall(r'[a-z_]{5,50}', b))
        walrus = [f for f in funcs if 'walrus' in f.lower()]
        if walrus:
            print(f'=== {mod_name} ===')
            for f in sorted(walrus):
                print(f'  {f}')
    except Exception as e:
        pass
