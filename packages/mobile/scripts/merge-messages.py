"""Deep-merges a JSON fragment {"ar": {...}, "en": {...}} into src/messages/{ar,en}.json (dev helper)."""
import json, sys, os

def merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            merge(a[k], v)
        else:
            a[k] = v
    return a

frag = json.load(open(sys.argv[1]))
for loc in ('ar', 'en'):
    p = os.path.join(os.path.dirname(__file__), '..', 'src', 'messages', f'{loc}.json')
    cur = json.load(open(p)) if os.path.exists(p) else {}
    merge(cur, frag[loc])
    with open(p, 'w') as f:
        json.dump(cur, f, ensure_ascii=False, indent=2)
        f.write('\n')
print('merged', list(frag['ar'].keys()))
