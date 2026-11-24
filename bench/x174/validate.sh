#!/bin/sh
# Rebuild the current codec gates; paid trial/frontier receipts must exist.
set -eu
for name in test portfolio gate tournament-gate refusal-gate; do
 npx esbuild bench/x174/$name.ts --bundle --platform=node --format=esm --outfile=bench/x174/$name.mjs
done
node bench/x174/test.mjs > bench/x174/receipts/test.log
node bench/x174/portfolio.mjs > bench/x174/receipts/portfolio.log
node bench/x174/gate.mjs > bench/x174/receipts/gate.log
node bench/x174/tournament-gate.mjs > bench/x174/receipts/tournament-gate.log
node bench/x174/refusal-gate.mjs > bench/x174/receipts/refusal-gate.log
python3 bench/x174/independent.py
python3 bench/x174/modal.py
sh bench/x174/finalize.sh > bench/x174/receipts/finalize.log 2>&1
npx tsc --noEmit > bench/x174/receipts/tsc.log 2>&1
npm run build > bench/x174/receipts/build.log 2>&1
python3 - <<'PY'
import hashlib,json
from pathlib import Path
files=['src/lib/omega/kymatia.ts','bench/x174/test.ts','src/lib/omega/bpe-fast.ts']
r=dict(status='PASS',gates=['unit','portfolio','selector','tournament reader classification','malformed-parent refusal','independent inverse','modal countermodels','frontier finalization','TypeScript','build'],sourceHashes={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files},native='NOT_RUN',kernel='NOT_RUN')
Path('bench/x174/receipts/validation.json').write_text(json.dumps(r,indent=2)+'\n')
PY
python3 bench/x174/summarize.py
