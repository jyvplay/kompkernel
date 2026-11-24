#!/bin/sh
set -eu
# One actual replay, started in X175 and completed in X176. Not two runs.
sh bench/x175/finalize.sh
cp bench/x175/receipts/frontier.jsonl bench/x176/receipts/frontier.jsonl
for f in frontier-compare.json frontier-gate.json replay-independent.json leaders.json local-leaders.json source-role-leaders.json; do
  if [ -f "bench/x175/receipts/$f" ]; then cp "bench/x175/receipts/$f" "bench/x176/receipts/$f"; fi
done
python3 - <<'PY'
import json,hashlib,subprocess
from pathlib import Path
paths=list(Path('src/lib/omega').glob('*.ts'))
existing=[p for p in paths if p.name not in ['strofos.ts','kyklograf.ts']]
assert subprocess.check_output(['git','diff','bd0943724eaca663c2edd3323b317c2014774f68','--',*[str(p) for p in existing]])==b''
r={'scope':'One carried-forward canonical worker started X175, completed X176. Production stack unchanged; not two independent reruns.', 'replay':'bench/x175/receipts/frontier.jsonl','sha256':hashlib.sha256(Path('bench/x175/receipts/frontier.jsonl').read_bytes()).hexdigest(),'productionFiles':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in existing}}
Path('bench/x176/receipts/frontier-provenance.json').write_text(json.dumps(r,indent=2))
PY
