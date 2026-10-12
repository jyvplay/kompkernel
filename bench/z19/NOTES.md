# z19 receipts (PHALANX-P1 turn)

Codec committed: `src/lib/omega/phalanx.ts` (PHALANX-P1), with `src/lib/omega/dirfold-a.ts` (DIRFOLD-A1, the ASCII-marker variant of DIRFOLD-D1).
Registry key: `phalanx`.

Receipts
- `stack-probe.receipt.txt`   fixed-order pipelines of the stages (V,H,T,U,UT,UV,UTV,UDTV,UDT,DV,TV,TH,UTH,UDTH,UDV) on 7 ops + 10 prose/code files; full inverse chain checked. NOTE: this probe used the committed DIRFOLD-D1 ('↑' marker) for the D stage, so D pipelines are non-ASCII (flagged '*' in the table); PHALANX uses DIRFOLD-A.
- `phalanx-probe.receipt.txt` PHALANX module output vs identity, VERITAS-VX and holographic, all 17 files, decode-checked.
- `minlen-probe.receipt.txt`  DITTO min field length {3,4,6,8} inside the fixed order. Length 3 kept (npm-ls regression is not a length effect).
- `phalanx-redteam.receipt.txt` 18 edge cases (stage headers and escapes, '='/'^' fields, uuid, CRLF, tabs, prose, unicode) + 2000 fuzzed structured listings; ALL EXACT.

Sweep / stats caveats
- Stacked AMPHORA numbers from z16/z18 used a wall-clock budget; this turn's probes do not use AMPHORA.
- Each stage gates itself; the fixed order is not chosen per file.
