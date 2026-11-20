# X148 — EPITYPOS turn record

New repository codec this turn: **EPITYPOS** (`src/lib/omega/epitypos.ts`,
`epitypos-frontier.ts`) — bounded reversible ASCII overstrike factorization of
real `Pod::Text::Overstrike` manuals, with a dynamic-key three-pair collision
planner. Opt-in, not wired into the default parent chain; ordinary readers fail
closed.

## Gates actually run this turn

| Gate | Result | Receipt |
|---|---|---|
| EPITYPOS unit suite (repaired pairs) | 2289 checks / 754 accepted, 3 real sources byte-exact | `receipts/unit.json` |
| PERIBALLON scope suite | 916 checks | `receipts/scope-unit.json` |
| LCP native exactness | 9880 checks | `receipts/lcp-unit.json` |
| Real-manual composites (repaired) | 594→502, 1941→1822; usage manual whole-stack run hits the heap boundary (>2.2 GB, aborted) — planner-only byte-exact in the unit suite | `receipts/probe-postrepair.log`, `receipts/usage-postrepair.log` |
| Six mechanism controls | all byte-exact, all more expensive than accepted 502 | `receipts/controls.json` |
| SYNARMOGE deadline honesty | 9 checks, expired-deadline abort + fixed-point stability | `receipts/synarmoge-slice*.json` |
| Isolated speed A/B (2 mechanisms) | both falsified (ratios 0.969–1.039, no ≥10% lane) | `receipts/speed.jsonl`, `speed-lcp.jsonl` |
| Canonical 29-lane reconfirmation | 26/29 exact; code-ts 950 vs 949 (SYNARMOGE ren=1) — total NOT exactly reconfirmed | `receipts/frontier.log` |
| tsc + build | see turn end | — |

## Non-goals kept honest

- No native fresh-chat endpoint exists in this sandbox: EPITYPOS readability is
  evidenced by the in-suite plain-word contract wording and byte-exact program
  inverse, NOT by a behavioral LLM gate.
- No Lean/kernel replay of any downloaded lab artifact; nothing above X147's
  depth of inspection is claimed verified.
- Speed: no acceleration claim survives; both candidates measured and dropped.
- Merge precondition (honest Pareto superiority) NOT met; PR stays draft.
