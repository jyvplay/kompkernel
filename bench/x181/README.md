# X181 — FOTIA and strict parent verification

**Scientific acceptance: false. New codec implemented; no Pareto breakthrough.**
Production remains unchanged. This follows APOUSIA, without renaming it.

## What is new

`src/lib/omega/fotia.ts` implements bounded Foata second-fundamental
transformation on ASCII-space-separated fields, retaining empty fields and all
other bytes. Comparison-delimited block rotations rearrange content without a
dictionary, primary index or occurrence tape. Both directions and block widths
16/64/256 are enumerated; complete raw prices select one plan for paid parent
search. This is not greedy or globally optimal paid search. The classical
maj/inv bijection is explicit ancestry, not an AI-only invention. Focused source
search found no existing Foata implementation; exhaustive semantic novelty is
unproved. See model.md and research.md for contracts, hypotheses and bounds.

`src/lib/omega/akribos-parent.ts` adds an unwired strict bounded reader. It handles
fused decimal restoration and layout after numeric progression, and refuses
unknown instruction-looking envelopes rather than returning encoded bytes.
It is a verification improvement, not a new compression operation.

## Full paid outcomes

| Source | Frontier tokens | FOTIA complete tokens | Change |
|---|---:|---:|---:|
| Email | 486 | 638 | +152 |
| Knowledge base | 620 | 777 | +157 |
| LLM prose answer | 664 | 798 | +134 |
| ps | 381 | 601 | +220 |
| ps-ef | 296 | 583 | +287 |
| JSON | 653 | 926 | +273 |
| Diff | 411 | 566 | +155 |
| TypeScript | 949 | 1159 | +210 |

All eight completed paid candidates reconstruct original bytes in both the
project reader and separate Python reader. All lose. No raw wins across 34
sources. Only the raw-best plan per source was parent-priced; this does not
establish that every other plan loses or that the goal is impossible.

## Tests and source coverage

- **41,773** source/unit checks across **34** sources; exhaustive ternary field
  words through length eight, 500 seeded cases, both inverse identities,
  histogram preservation and inv(Φ(w))=maj(w), Unicode/empty fields and bounds.
- **20,874** separate Python checks, including all eight completed paid wires.
- Two new pinned source fixtures: CPython exception tutorial and Git corrupted
  blob recovery guide, with licenses and hashes. Fetched after mechanism fixed;
  exact/raw-screen checks only, not full paid/native tests. Three older external
  fixtures are reused rather than called freshly blinded data.
- Current-plan/key matching, original-byte comparison and tokenizer roundtrip
  are rerun after the exported-block size guard. Oversized fields and 257 fields
  are the targeted attacks. Native prompts are prepared, **NOT_RUN**.
- Strict-reader attacks include missing dictionary, malformed decimals,
  instruction refusal, invalid Unicode and expansion caps. Fresh frontier reader
  diagnostics and source-role leaders are in receipts/summary.json.

## Fresh frontier and generalized leaders

**29 identical wires / 11,962 tokens**, confirmed against X180 with original-byte
and complete-token checks. These are fixture-role leaders, not causal per-codec
ablations or an assertion of a global optimum:

| Category | Lanes | Raw → frontier tokens | Largest absolute-saving fixture |
|---|---:|---:|---|
| Prose | 3 | 2018 → 1770 | email, 629 → 486 |
| Ops/tabular | 22 | 22332 → 8078 | ls-l, 5194 → 1310 |
| Code/structured | 3 | 3152 → 2013 | JSON, 1152 → 653 |
| Other | 1 | 513 → 101 | cue sheet, 513 → 101 |

Ops relative leader remains prices, 582→118. Fresh reader diagnostics:
readPlainParent **21 exact / 8 mismatches**; ANTIKLEIS **23 exact / 6 mismatches**;
AKRIBOS **25 exact / 4 refused / 0 mismatches**. Separate Python frontier reader:
**22 exact / 7 unsupported / 0 mismatches**. No reader covers every envelope.
Compiler and application build pass. Five native prompts remain NOT_RUN.

## Parent bottleneck and speed

The unresolved APOUSIA ls-l parent was sampled with V8 and a 180-second wall cap;
it again timed out. The profile retained **104,124 ticks**, with an explicit
unknown-overflow warning. Top named JavaScript entries: mergeCount 4.9% of total,
pretoken regex 3.6%, scoreRunCostDeltaSlots 3.0%, chunkCountFast 2.3%. About 69.7%
was attributed to the Node shared library. These are sampled self percentages,
not a complete causal decomposition or isolated speed proof; profiles overlap
other diagnostics. Blind timeout increases are not a demonstrated improvement.

A bundle-only speed experiment replaces the two-UTF16-unit Map with a 2 MiB
direct-mapped exact cache. Collisions evict rather than alias. Unlike X178's
Latin-1 dense cache, it covers all signed 32-bit pair keys. **400,004** targeted
cache checks include **60,023** collisions; full count/vector/pair A/B gates
precede six-source cold ABBA whole-stack timing. Final ratios and acceptance
are in receipts/runtime-summary.json. **Rejected:** 24 identical wires, CPU B/A
**1.009904**, wall B/A **1.010630**, with protected regressions. No production
patch is applied. Tokenizer gates include 16,192 count checks, 12,124 vector
checks and 524,338 pair checks; A/B outputs match. The fresh replay CPU profile
contains 102,947 samples, retained as a hashed summary rather than a large raw
profile. Its self-attribution is diagnostic, not a separate speed benchmark.

One orchestration mistake (multiple --pid options in one tail command) started
validation before the replay ended. It was stopped before any speed trial.
The interruption log and correction note are retained; separate sequential waits
precede the fresh validation and isolated ABBA run. No timings from that mistake
are promoted as isolated evidence.

## Reproduce

`npm ci`; bundle test.ts, worker.ts and x164/frontier.ts with esbuild for Node ESM.
`python3 bench/x181/run.py` performs eight serial paid trials. Profile replay via
`node --cpu-prof --cpu-prof-interval=10000 --cpu-prof-dir=.cache/x181
bench/x181/frontier.mjs bench/x181/lanes.txt bench/x181/receipts/frontier.jsonl`.
`profile-parent.py` requires x180/worker.ts bundled to
`.cache/x181/apousia-worker.mjs`. Never overwrite receipts during an active run.
After all workers finish: `sh bench/x181/validate.sh`, then run isolated
`python3 bench/x181/runtime-run.py`, `profile-summary.py` and `summarize.py`.
Generated bundles/profiles are ignored; results and hashes are retained.

## Exact remaining gap

No broad paid wins, verified native behavior or terminal-codec theorem. The
new reader still refuses four parent grammars; refusals are not successes.
No theorem kernel or exhaustive all-labs proof audit was performed. A merge
publishes the bounded research record, not acceptance. Highest-information
follow-up: isolate/tokenize the dominant mergeCount and slot-delta workloads
from the parent profile with identical candidate sets, rather than another
blind timeout escalation; separately implement a message-only reader for one
remaining declared grammar and attack its malformed inputs. Those tests can
improve engineering evidence, but neither promises general compression gains.
