# X74 receipts

Every number in `bench/x74/REPORT.md` comes from one of these files. They are written
by the harnesses in `bench/x74/`, not by hand.

| file | produced by | establishes |
|---|---|---|
| `gate.json` | `bench/x74/gate.ts` via `tagstackEncode` | the 29-lane complete-message gate: per-lane tokens, the X72 prior, byte-exactness, wall clock, memo stats |
| `prosphysis.json` | `bench/x74/t25.ts` | PROSPHYSIS key cost, rewritten rows, entailed characters, delta per lane |
| `floor.json` | `bench/x74/t26.ts` | per-lane unreadable floor (brotli −q 11) in o200k tokens, so "the frontier is 1.0–1.4× of the floor" is a measurement |
| `cutrule.json` | `bench/x74/t26.ts` | the cut-placement rules for STOICHEION, measured side by side |
| `broad.json` | `bench/x74/broad.ts` | STOICHEION as a candidate on all 29 lanes: applied/refused, both clocks |
| `memo.json` | `bench/x74/memo.ts` | the document memo: identical token ids on a second pass, 10 429 ms → 0 ms |
| `warm.json` | `bench/x74/warm4.ts` | cold vs warmed first-encode, tokens identical |
| `key.json` | `bench/x74/key4.ts` | every PROSPHYSIS key variant with its o200k cost (105 / 31 / 54) |
| `gate73-det.json` | `bench/x74/gate73.ts` | **the control**: the same 29 lanes through the X73 identity only (`tagstackEncodeUncached`), in the same process mode |
| `gate-det.json` | `bench/x74/gate.ts` under `OMEGA_DET=1` | the treatment: the full X74 chain, same lanes, same mode |
| `ab.json` | derived from the two above | per-lane control-vs-treatment, so the codec's contribution is not confounded with search drift |
| `density.json` | `bench/x74/t41.ts` | relation density per lane: is PROSPHYSIS a one-lane accident or a mechanism with a population? |
| `standin.json` | `bench/x74/t42.ts` | the generalized stand-in relation (any field position, vertical transfer) and why it refills the frontier |
