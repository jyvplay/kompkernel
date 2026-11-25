#!/bin/sh
set -eu
# Serialize against canonical replay to avoid memory pressure. These timings
# are diagnostics, not the isolated A/B speed experiment.
canonical=${1:-}
if [ -n "$canonical" ]; then
 kill -STOP "$canonical"
 trap 'kill -CONT "$canonical" 2>/dev/null || true' EXIT INT TERM
fi
node --max-old-space-size=900 bench/x177/controls.mjs \
 bench/holdout-work/email-thread.txt bench/holdout-work/kb-article.txt \
 bench/holdout-x41/ps-real.txt bench/holdout/json-pkg.txt \
 bench/holdout-work/unified-diff.patch bench/holdout/code-ts.txt \
 bench/holdout-x41/ls-l-real.txt bench/holdout-x41/ps-aux-real.txt \
 bench/holdout-x42/ps-ef.txt bench/x177/fixtures/python_cpython-datastructures.rst
node --max-old-space-size=900 bench/x177/trial.mjs all \
 bench/holdout-x41/ls-l-real.txt bench/holdout-x41/ps-aux-real.txt \
 bench/holdout-x42/ps-ef.txt bench/x177/fixtures/python_cpython-datastructures.rst
python3 bench/x177/independent.py
python3 - <<'PY'
import json
from pathlib import Path
root=Path('bench/x177/receipts');rows=[]
for file in root.glob('trial-*.json'):
 r=json.loads(file.read_text());c=json.loads((root/('control-'+Path(r['path']).name+'.json')).read_text())
 assert c['path']==r['path'] and c['status']=='exact'
 assert c['message']==r['base']['message'] and c['tokens']==r['base']['tokens']
 rows.append(dict(path=r['path'],control=c['tokens'],best=min(p['tokens'] for p in r['candidates']),plans=len(r['candidates']),exact=all(p['status']=='exact' for p in r['candidates'])))
(root/'paid-summary.json').write_text(json.dumps(dict(rows=rows,native='NOT_RUN',accepted=False),indent=2))
print(rows)
PY
