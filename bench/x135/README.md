# X135 results — ANAKYKLI (experimental, unwired)

**Acceptance failed. No Pareto-superior codec, native-LLM verification, or
whole-stack speedup was established. PR #74 remains draft; no merge warranted.**

ANAKYKLI adds cyclic-cut parent preconditioning in `src/lib/omega/anakykli.ts`:
rotate ordinary input around one line boundary, encode with the existing parent,
then describe the inverse in-band. First-line rotation can omit the cut marker.
It is a repository candidate, not a claim of a new mathematical primitive.
Selection requires a strictly cheaper complete message and exact source recovery.
It is not wired into TAGSTACK; ALLOMORPH also remains unwired.

## Executed evidence

| Experiment | Result |
|---|---|
| Fresh canonical baseline | 29 lanes, 11,962 tokens, 1,217,179 ms; inherited decoded mismatch 0 |
| X134 comparison | All 29 complete messages and token counts identical |
| Cyclic cuts | 28 trials, 7 lanes, all regress **+3 through +36 tokens**; 920,154 ms total trial time |
| Independent rotation recovery | **28/28** UTF-8 byte-exact, Python CHIRON + independently implemented STELI + cyclic inverse |
| Repaired TS reader / tokenizer re-audit | 28/28 source-exact and actual library token counts agree |
| Joint escaped alias packages | 25 lanes, 89,045 probes, **zero gain**, 43,192 ms |
| Baseline independent reader | CHIRON-only 19/29; CHIRON+STELI **21/29**, eight unsupported |
| Gzip+base64 control | 29/29 machine-exact, 20,704 full-message tokens; no native-reader verification |
| Mechanical tests | **111 checks pass**, including marker exhaustion and corrupt-parent attack |
| TypeScript | `tsc --noEmit` exit 0 |

The first 14 rotations regressed +10..+32; the remaining 14 widened the range.
Best near miss: ps-aux cut 3268, baseline 980, inner parent 969, complete message
983. Dropping the inverse would misrepresent an 11-token inner saving as a win.
No alternatives are additive, and these finite failures prove no impossibility.

Original `rotation.jsonl` exact flags retain historical reader scope (one false
flag lacked a STELI inverse). `reaudit.jsonl` and `steli-audit.json` supersede
those flags for fidelity, without altering frozen candidate messages. The
limited `coldread.py` remains a coverage diagnostic, not the final source audit.
Independent means separately implemented message decoding—not an external
reviewer or a blind model. No native LLM was tested.

## Category leaders refreshed

Same messages imply unchanged leaders; `receipts/leaders.json` was regenerated.
Counts below describe tokens in CHIRON bodies, not global incompressibility.

| Category | Lanes | Raw → encoded | Body glyph / word / numeric / other | Leader |
|---|---:|---:|---|---|
| Prose | 5 | 5856 → 3429 | 839 / 1629 / 108 / 231 | word-like |
| Ops/tabular | 16 | 17278 → 5580 | 1202 / 1105 / 808 / 380 | glyph-bearing |
| Code/structured | 4 | 4152 → 2636 | 639 / 945 / 102 / 307 | word-like |
| Other | 4 | 729 → 317 | no CHIRON tapes | none inferred |

## Runtime and next test

Fixed four-cut enumeration is not greedy descent or global optimization. For
input length n, transform/inverse work is O(n) per cut, plus whole-message token
pricing and parent encode/decode costs. Four additional parent invocations are
not a whole-stack acceleration. Wall times are not CPU bounds; deterministic
flags do not remove every parent clock gate. These runs are not a controlled
speed comparison. No speedup is claimed.

The highest-information next test is to jointly express the cyclic inverse and
existing parent instruction, especially the ps-aux near miss, while preserving
explicit ordering and independent source recovery. Shorter wording is a header
optimization of this candidate, not another mechanism. It still needs whole-wire
pricing, held-out benefit, and blind one-message native reading. More rotation
trials alone do not close the native-reading or speed gates.

## Reproduction

From repository root, bundle each TypeScript harness with the installed esbuild:
`node_modules/.bin/esbuild bench/x135/NAME.ts --bundle --platform=node --format=esm --outfile=bench/x135/NAME.mjs`.
Generated bundles are ignored. Run `frontier` first (expensive; overwrites its
receipt), then `rotation` (default first two cuts, overwrites receipt) and
`CUT_START=2 CUTS=2 node bench/x135/rotation.mjs` (appends remaining cuts).
Do not repeat the append command against an already complete receipt.
Run `unit`, `packages`, `controls`, and `reaudit`, redirecting stdout to their
corresponding receipt files. Run `python3 bench/x135/steli_audit.py >
bench/x135/receipts/steli-audit.json`, then `python3 bench/x135/summarize.py`.
Full formal model, adversaries, and bounded external literature review: REVIEW.md.
