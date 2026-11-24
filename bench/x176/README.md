# X176 — KYKLOGRAF / completing X175

**Scientific status: not accepted.** New experimental codec implemented; no broad paid-frontier or native-model breakthrough established. Production defaults remain unchanged. The carried-forward canonical replay and clean speed experiment are complete. `sh bench/x176/validate.sh` passed, including current-source gates, TypeScript and the production build.

## New executable mechanism

`src/lib/omega/kyklograf.ts` implements a blockwise bijective Burrows–Wheeler transform over ASCII-space-separated fields. It retains empty fields and all other bytes. Duval factorization → omega-order sort of factor rotations → preceding-field sequence. The reader computes stable LF, extracts/reverses cycles, chooses their least rotations, sorts factors descending and joins with ASCII spaces. No primary index or external dictionary is needed.

This is classical BBWT, explicitly attributed in [research.md](research.md), implemented as a bounded parent-visible textual transform. It is not a new mathematical primitive or AI-only insight. It differs from STROFOS's independently rotated words with transmitted offsets and from the existing ordinary BWT control's primary-index reconstruction. Inventory triage covers 419 other modules, not an exhaustive semantic originality proof.

### Technical design / resources

- ASCII source domain, ≤50,000 bytes. Non-ASCII is refused, not normalized. Unicode support is a remaining boundary, not an accepted universal claim.
- Fixed-count blocks of 32, 128 or 512 fields, including empty ones. Three emitted-plan candidates, deduplicated. Whole direct wire priced with reference o200k tokenizer.
- Not greedy grammar repair. Finite block-width search; selected direct-price plan gets at most one complete parent call. Direct-price selection is **not** parent-price optimal.
- Duval's scan is linear in symbol comparisons; the simple rotation comparator and explicit inverse rotations here are not the cited linear-time BBWT construction. For m fields, maximum field length L and block width b, a conservative comparison-sort bound is O(m b log b · L), plus bounded allocations. Parent work is separately paid. No wall-clock cutoff controls the wire.
- Full in-band inverse instructions included; executable byte equality is required before adoption. This does not prove a basic-chat LLM executes the instructions exactly.

## Executed evidence

| Gate | Result |
|---|---|
| Codec unit tests | 20,252 checks; 32 sources including three newly fetched whole heldouts, 31 supported, 80 plans |
| Direct raw screen | Five source files have raw wins; these are **not strong-parent wins** |
| Structural attacks | 9,863 checks; actual wrong-lex-order counterexample, inverse surjectivity, malformed/oversized/non-ASCII parent refusal |
| Independent Python | 9,946 checks, including six KYKLOGRAF paid candidates and seven STROFOS tournament candidates exact; zero unsupported primary candidates |
| Paid selector replay | 48 checks |
| Count gate for speed experiment | 16,192 per arm, identical receipts |
| Vector gate for speed experiment | 12,124 per arm, identical receipts |
| Native model | Two supported heldout prompts prepared; **NOT_RUN** |
| TypeScript / production build | Passed |
| Contract-repair gate | 33 checks; full prices recomputed |
| Canonical frontier | 29 byte-identical wires / 11,962 tokens |

### Paid parent results

All prices include the full outer contract and the full encoded parent:

| Source | Incumbent | KYKLOGRAF | Result |
|---|---:|---:|---|
| Email thread | 486 | 632 | Rejected |
| KB article | 620 | 765 | Rejected |
| Process listing | 381 | 546 | Rejected |
| Package JSON | 653 | 845 | Rejected |
| Unified diff | 411 | 546 | Rejected |
| TypeScript | 949 | 1,133 | Rejected |

The grouping instruction was repaired from ambiguous “at most N” to consecutive groups of N, with only the final group shorter. The old source/receipts are archived. Complete wire costs rose by 13 tokens; the table uses repaired prices. `repair-gate.ts` revalidates unchanged parent bodies, reprices full messages, and adds a 33-field boundary attack (33 checks). Unit, structural, saved-parent, Python and native-handoff preparation gates were rerun; parent search itself was not repeated because exact transformed bodies are unchanged.

Incumbent fallback protects message price, **not encoder runtime**. No candidate was installed in tagstack.

### X175 highest-information follow-up completed

All emitted STROFOS plans were priced through the real parent for email and ps, with fresh unchanged-source controls. Email candidates: 545, 560, 605, 720 vs incumbent 486. Ps: 445, 458, 513 vs incumbent 381. All seven candidates exact; none wins. Thus direct-price selection happened to select the cheapest parent plan on these two sources, but this is not a general theorem.

## Speed experiment and evidence hygiene

The new speed arm replaces three-byte rank open addressing with lazily allocated 16+8-bit radix pages. Vocabulary, rank precedence and merge order stay unchanged. Only an esbuild benchmark plugin applies it; production tokenizer is untouched.

An initial six-row partial timing run overlapped compilation/gates. It was stopped, archived as `runtime-contaminated-partial.*`, and excluded. The replacement ABBA crossover paused the canonical worker and ran without codec/build overlap. It completed with 24 identical wires, CPU B/A **1.023177**, wall B/A **1.019854**: slower overall, so **rejected**. Node-help CPU 1.040056 / wall 1.037053 is a protected-lane regression. Full results are in `receipts/runtime-summary.json`. No speed acceptance is inferred from the count gates.

## Contract, portfolio, research, reproduction

- [model.md](model.md): admissible objects, quantifiers, H+/H−/H∂, gates and actual available systems.
- [portfolio.md](portfolio.md): at least six mechanism-distinct artifacts, structural attacks, precise gaps.
- [research.md](research.md): fresh primary compression sources and individual seven-project math follow-ups; no kernel audit claimed.
- `test.ts`, `attacks.ts`, `independent.py`, `gate.ts`: executable verification.
- `trial.ts`, `strofos-tournament.ts`: real paid parent experiments, not mocked encoders.
- `speed-build.mjs`, `runtime-run.py`: exact alternative build and whole-stack crossover.
- `native-handoff.py`: prepares/verifies external response bytes only; does not invoke a model.

## Remaining interface / next highest-information test

The new preconditioner does not yet produce paid broad gains. Changing the BBWT alphabet order can change locality; a next test could derive a deterministic frequency order from the invariant transmitted multiset (tie-break ASCII), then price **all** width/order plans through the parent and compare to unchanged-source controls. It requires fresh inverse/empty-field/periodic-cycle tests and full instruction pricing. Do not substitute absolute-Lyndon factorization: the new thesis lead specifically warns that its proposed replacement loses bijectivity.

No native evaluator is available in this session. Exact single-chat model decoding, including this assistant on unseen long wires, cannot honestly be confirmed by the software tests. Merge, if requested, records the reproducible negative result; it does not satisfy the user's stronger scientific acceptance predicate.

## Final frontier and generalized local leaders

One real canonical replay was started in X175 and completed during X176; it is
**not counted as two runs**. Production source hashes and replay identity are
bound in `receipts/frontier-provenance.json`. All 29 wires match the X174 baseline
exactly, totaling **11,962 tokens**. Original-source equality is checked
separately from the encoder's decoded field. TS reader: 21 exact / 8 unsupported;
Python reader: 22 exact / 7 unsupported / 0 mismatches. All 29 wire token prices
and tokenizer transport checks pass. Unsupported is not exact or native success.

| Source role | Lanes | Raw → frontier tokens | Largest absolute saving |
|---|---:|---:|---|
| Prose | 3 | 2,018 → 1,770 | email: 629 → 486 |
| Ops / tabular | 22 | 22,332 → 8,078 | ls-l-real: 5,194 → 1,310 |
| Code / structured | 3 | 3,152 → 2,013 | package JSON: 1,152 → 653 |
| Other | 1 | 513 → 101 | cue sheet: 513 → 101 |

Ops relative-saving leader is prices.csv (582 → 118). Word-reference tokens
lead the observed tape-body classes in prose/ops/code; OTHER has no comparable
tape class. This is a fixture-role census, not a causal per-codec ablation or a
global optimality claim. `receipts/source-role-leaders.json` retains every row;
`local-leaders.json` also preserves the older category classification.

The repaired direct raw wins are ls-l 5,194→4,967; ps-aux 3,054→2,794; ps-ef
1,144→1,123; ps 1,106→1,084; and whole CPython classes chapter 8,632→8,608.
These are useful preconditioner measurements but are **not** paid frontier wins.

`receipts/summary.json` records `accepted=false`. `receipts/validation.json`
binds current code/scripts and receipts to hashes. Validation re-executes small
gates and checks saved long-run evidence; it does not claim to rerun all parent
searches, timings, or native models. Canonical wall times include deliberate
pauses and are not speed measurements.
