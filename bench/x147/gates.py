"""Acceptance ledger, not a theorem prover or behavioral evaluator."""
import json
from pathlib import Path
r=Path('bench/x147/receipts')
f=json.loads((r/'final.json').read_text())
checks={'source_exact':f['sourceRead'] and f['parentRead'],'strict_parent_gain':f['gain']>0,'over_ten_tokens':f['gain']>10,'native_basic_chat':False,'significant_whole_stack_speed':False,'broad_canonical_gain':False}
# Modal shortcut: existence of an exact program inverse does NOT discharge
# the independent behavioral gate. Keep this as an executable regression.
assert checks['source_exact'] and not checks['native_basic_chat']
assert not all(checks.values())
# Finite pigeonhole bound, not a domain-specific optimality result.
assert 95**100>sum(1000000**i for i in range(11))
out={'checks':checks,'overallPareto':False,'mergeEligible':False,'modalShortcutRejected':True,'finiteInjectivityBound':True}
(r/'gates.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
