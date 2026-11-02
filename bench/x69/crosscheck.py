"""Independent Python inverse; JS code-unit offsets use utf-16-le units."""
import json
from pathlib import Path
case = json.loads(Path('bench/x69/crosscheck-case.json').read_text())
sep, base, patches = json.loads(case['message'].split('\n',1)[1])
docs = ['\n'.join(base)]
for patch in patches:
    lines = base.copy()
    for entry in patch:
        i = entry[0]
        if len(entry) == 2:
            lines[i] = entry[1]
        else:
            _, pre, suf, mid = entry
            raw = lines[i].encode('utf-16-le', 'surrogatepass')
            prefix = raw[:pre*2]
            suffix = raw[len(raw)-suf*2:] if suf else b''
            lines[i] = (prefix + mid.encode('utf-16-le','surrogatepass') + suffix).decode('utf-16-le','surrogatepass')
    docs.append('\n'.join(lines))
assert sep.join(docs) == case['source']
print('independent Python UTF-16 decoder: exact')
