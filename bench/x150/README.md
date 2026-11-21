# X150 — review, repair, and candidate evidence

## A–J: contract and runtime honesty

**A — Admissible objects and access.** A source is a finite UTF-8 transport-stable text file;
exact bytes, including terminal controls, punctuation, whitespace, order,
Unicode, and final line endings, must be reproduced. The recipient gets one
self-contained text message (including any decoding instructions). No hidden
system prompt, skills file, model retraining, new vocabulary, secret dictionary,
or earlier context may carry reconstruction information. The program may use
the existing codec library and explicitly declared bounded computations.

**B — Resources and cost model.** Primary score is o200k_base token count of the entire message
including all instructions and parent envelope; actual CPU time, wall time and
peak memory are separate dimensions, not interchangeable with token count.
Fixtures and o200k implementation/flags are part of each result. Encoder must
provide original bytes to a verifier independent of its success flag. A true
Pareto improvement is measured relative to a specified incumbent and workload;
including extra search time invalidates claims of joint token/time dominance.

**C — Quantifier order, verification and evidence threshold.** Candidate source reader must be total or explicitly
refuse outside its domain: ∀ admitted x, decode(encode(x)) = x, with no silent
fallback pretending to be a win. For a claimed lane gain, ∃ real held-out x
such that its *complete serialized* candidate beats the actual configured
parent, while all specified fallback lanes do not worsen and measured runtime
costs are disclosed. Native LLM behavior is empirical, model- and task-specific:
a fresh chat must receive only the self-contained message and its task, and
its bytes and downstream answers must be compared with independently held-out
source. No finite experiment proves ∀ models, all prompts or all inputs.
Transport stability, inverse correctness, encoded length, actual final-chain
admission, and native reading are separate gates. A repair inherits no trust.
**Shipping/merge evidence threshold:** all gates pass on real held-out data,
with at least one meaningful frontier gain, and no measured regressions under
the declared workload; any added runtime is part of the comparison. This turn
has not met that threshold. This is stricter than accepting a debug artifact.

**D — Parameter regime and boundary cases.** The CHRISMATA implementation caps at 50,000 UTF-16 code
units and declines CR-containing inputs; ΠΟΛΥΣΤΗΛΗ uses 400,000 code units,
no tabs/CR in fitted rows, reserved-marker refusal, and bounded inverse output.
Costs are integer o200k_base tokens, not bytes; exactness has zero tolerance.
Parent calls run with `OMEGA_DET=1`, `OMEGA_NO_MEMO=1`, `OMEGA_ENGRAM=0`,
`OMEGA_OURA_MEMO=0`, `OMEGA_NO_OROTHESIA=1`; stopwatch readings in concurrent
runs are not isolated speed benchmarks. Decoding `TagstackResult.decoded` is
not an independent parser test.

**E — Adjacent problems not substitutes.** Lossy summary, semantic similarity,
compressed transport with a separate decoder process, hidden external context,
trained soft tokens, binary/arithmetic-only bitstreams, byte reduction rather
than chat-token reduction, raw-candidate gain without parent pricing, and
faster batched throughput versus faster individual calls are different tasks.

**F — H+, H−, H∂ outcome space.** H+ is possible for some structured distributions (the
repository contains source-checked empirical candidates, not native proofs).
H−: no injective code maps all 2ⁿ fixed-length binary strings to binary strings
of length <n, since there are only 2ⁿ−1 shorter binary strings. This simple
pigeonhole statement counts bits, not o200k tokens, and does **not** prove a
lower bound for the 29 lanes. H∂ depends on structure, envelope cost, tokenizer,
reader/model, error tolerance, and runtime budget. No terminal optimum has been
proved.

**G — Runtime actually used.** One Arena coding agent; Node 22, TypeScript/esbuild,
Python 3, Git/gh and the repo's gpt-tokenizer. Two actual concurrent Node
frontier workers and separate candidate processes were started. No independent
agents, fresh-chat model API, Lean/Lake, theorem-prover execution, remote
simulator, GPU, or private database were used. Live web searches and selected
page/GitHub API reads are recorded in `research.md`; lab-provider claims are not
our own verification.

## Corrections to X149

1. In the committed X149 implementation the transform pushed `rebuilt` (the
   original padded line), not the compact fields. The 22-check inverse suite
   passed despite this. A test that specifically asserts `aa   bb ...` becomes
   `aa bb ...` would have caught it; X150 adds it. The reported X149 A/B does
   not evaluate the intended compact representation; its causal explanation is
   withdrawn.
2. The X149 default-on frontier worker was still running when its result was
   announced and committed. `git show cee288d:bench/x149/receipts/frontier-polysteliA.jsonl`
   has 0 lines and the corresponding B file has 14. No 28/28 result was proven.
   The process was stopped in X150 after it appended two further B records;
   those additions are preserved. The old default-on kubectl 316 vs 300 was an
   observed isolated comparison, not proof of the proposed clock mechanism.
3. `digitbound.ts` maps all digit runs to `0`, and `decide.ts` collapses
   whitespace. Their 237 and 138 are deltas for particular lossy rewrites,
   not upper bounds for all possible codecs. `decide.ts` counted one adjacent
   -/+ pair but omitted the common prefix and suffix from its 11-token
   representation. `12` and `34` both mapping to `0`, and the pair
   `'  return total;'`/`'  let total = 0;'` whose shared `'  '` and `';'` are
   dropped, are concrete modal-shortcut detectors. Their earlier inferences
   and general word-substitution break-even claim are withdrawn.

## H — Candidate portfolio and adversaries

Each row is a distinct mechanism family, not six renamings of the new module.
A historical receipt is labelled as such; no historical claim is promoted to
native verification.

| Branch | Concrete artifact and proved/measured portion | Attacker / gap / cheapest falsifier |
|---|---|---|
| Content-conditioned terminal style | `src/lib/omega/chrismata.ts`; 44 total assertions across CHRISMATA and ΠΟΛΥΣΤΗΛΗ, Python byte inverse on four real Git captures, 29/29 canonical no-fit. Full parent candidates 499→580, 617→704, 721→806, plus a 106-line prefix of the large Git diff 1188→1269, all refused. | Literal `+` collision, nested escape, double-wrapped empty, CRLF, astral and lone surrogate, counterfeited key. Native control-byte behavior unknown; broader useful held-out gain is the original problem, not established. Test fresh chat and new real patches. |
| Fixed right-edge layout | Repaired `polysteli.ts`, patch-target tests including near-cap fail-closed refusal, four Python source-byte inverses. Raw full-marker ls-l 5194→4786 and ps-aux 3054→2901. Repaired opt-in final ps-aux 980→989 and kubectl 300→316; ps-ef 296→296. | Marker overflow/truncation, trailing spaces, Unicode, false admitted local score, outer-chain competition. Gap is global chain admission and model readability, not inverse alone. Compare after *all* parent finalizers; keep default-off. |
| Style overstrike | X148 `epitypos.ts` and `bench/x148/receipts/probe.jsonl`, plus rerun `controls-rerun.log`: raw-contract 574 on a real manual; historical parent 594→502 on this manual. | Nested/mixed styles, delimiter collisions, BS and final LF. Exact source checks existed but fresh-chat gate remains open; test unseen real renderer output and independent model. Not an X150 invention. |
| Threshold implication | X147 `horion.ts`, `bench/x147/receipts/summary.json`: historical geyser candidate 787→775; exact reader and controls recorded. | Numeric boundary equality and wrong partition, changing decimal spelling or CSV quoting; bounded source-specific gain, not broad prose. Verify held-out byte output and native arithmetic; original objective remains open. |
| Line dictionary | Re-ran `bench/x148/controls.mjs`, historical control receipt reproduced byte-identically, 814 tokens on the same real manual. Algorithmic inverse reconstructs that source. | Duplicates, empty/final line, index order and actual dictionary transmission; parent price and direct behavior unknown. It loses to the cited historical manual candidate (502), not evidence of a universal lower bound. |
| Binary Brotli | Same rerun: 863 tokens including its instruction and base64, program-decompresses exactly. | Human/LLM must execute base64 and Brotli in a basic chat; exact machine decoding does not verify that. An independent native-chat test is the falsifier; opaque method is inadmissible until then. |
| Exact memo/time | Prior `periballon.ts`, X148 ABBA/BAAB (`speed-summary.json`); measured wall ratios 0.972–1.004 on two lanes, no ≥10% improvement. | Mutating environment, cache-key omissions, state leak, deadline-dependent search; local cache-equality proof does not prove global speed under shared state. Re-run isolated repeated CPU/wall A/B with exact identical outputs. |

The requested two-width investigation found 12+37 ps-aux rows in two distinct
eligible right-edge runs vs the shipped suffix-only 37 (`width-probe.jsonl`).
`polysteli-split.ts` is explicitly **an extension of that same geometry**, not a
new independent mechanism. Its two-grid raw representation is 2871 vs the
single-grid 2901, including both markers; any parent-chain gain must be tested
separately and must pay an in-band instruction.

## I — Negative space: at least 15 false substitutes

1. Encoder returning its input as `decoded` without reading the serialized wire.
2. Reversible transform that accidentally emits an unchanged padded row.
3. A raw saving compared against a fully compressed parent.
4. Comparing a candidate with an intermediate incumbent before later finalizers.
5. Reporting fewer tokens while omitting the decoder contract.
6. Comparing distinct tokenizer configurations, source datasets, or flags.
7. A non-injective numerical/whitespace rewrite presented as an upper bound.
8. A diff-pair surrogate dropping shared prefix and suffix.
9. Equality of JS strings that do not survive UTF-8 transport.
10. Hidden dictionary, prior turn, system prompt, or skills file.
11. Model-generated approximate reconstruction substituted for exact bytes.
12. A convenient result from one model generalized to every model and source.
13. An LLM plausibly answering from a modal default instead of the coded data.
14. Binary decompression by software claimed as an unaided LLM read.
15. Treating a timeout, partial JSONL, or masked pipeline exit as completion.
16. Two-worker throughput compared as if individual library latency improved.
17. A fitted domain-specific win claimed as a universal best codec.
18. A claimed lab theorem's informal summary substituted for a checked proof.
19. A proof of reversibility of a representation substituted for correct parent
    envelope parsing, admission, and behavioral reliability.
20. A strict token fallback claimed as Pareto dominance while ignoring added
    compute or early admission changing later choices.

**Modal-shortcut attack:** place two examples with the same visible semantic
content but different exact bytes or one changed encoded value (e.g. differently
colored signed lines, or `12` versus `34`); ask for exact bytes and blinded
questions requiring that difference. Compare program-independent output with
each real source. Answering the plausible common meaning passes neither the
inverse nor the question's discriminating requirement. `native.md` contains a
small proposed packet; it was not run.

## J — Completed measurements, local leaders and next test

The fresh default-off baseline completed with both process exit codes 0:
29/29 wires match X149 byte-for-byte, **11,962 tokens** total. The runner
source-checks its returned `decoded` fields. A separate bounded repository
reader reconstructs 21/29 wires from messages against original source files;
8 grammar families are unsupported, not silently counted as verified.
All 29 costs and tokenizer encode/decode round-trips were independently checked
against gpt-tokenizer (`frontier-gate.json`). There is no fresh-chat test.

X134's classifier was rerun on these actual wires (`receipts/leaders.json`);
`local-leaders.py` additionally lists the largest observed source-to-frontier
token savings within each category, not a global proof or a codec ablation:

| Category (lanes) | Sum raw→frontier | Largest absolute saving (raw→frontier) | Largest relative saving | Tape body class leader |
|---|---:|---|---|---|
| Prose (5) | 5856→3429 | apt-real 2739→813 (1926) | apt-real 70.32% | word, 1629 |
| Ops/tabular (16) | 17278→5580 | ls-l-real 5194→1310 (3884) | prices.csv 79.73% | glyph, 1202 |
| Code/structured (4) | 4152→2636 | json-pkg 1152→653 (499) | json-pkg 43.32% | word, 945 |
| Other (4) | 729→317 | cue-sheet 513→101 (412) | cue-sheet 80.31% | none (no parsed tape) |

The `apt-real` category and all other classifications are inherited from the
X133/X134 classifier; they are not claims that the files are representative of
all prose or that the token class is an individual codec's contribution.

The suggested two-grid ps-aux extension produced 2871 raw tokens including
markers, vs 2901 with one grid, but the complete parent message and extra
instruction cost **1046 vs the incumbent 980**, with a successful source-byte
read (`split-composite.json`); reject it. Repaired ΠΟΛΥΣΤΗΛΗ opt-in tests
produced ps-aux 989, ps-ef 296, kubectl 316. They are fresh-process final
chain outputs, not isolated runtime benchmarks; the conservative default
remains off. The opt-in ls-l run was not performed in X150. A near-cap repair exposed by a
new failing test now catches decoder size-limit exceptions before invoking the
parent. The three opt-in lanes were rerun after that repair and were byte-for-
byte wire-identical to the earlier X150 opt-in outputs (`compare-cap.json`).

The X150 two-process run had **935,816 ms** wall time; X149's historical run
had 899,136 ms and X148's historical sequential sum was 1,594,918 ms. The
latter differs in wire output on some lanes and these are single runs with
non-isolated load, so none proves a new significant identical-output speedup.
No whole-stack speed improvement is claimed this turn. TypeScript
`npx tsc --noEmit --incremental false`, `git diff --check`, and the listed
local inverse tests passed after the near-cap patch. `npm run build` passed
before that patch; a post-patch build while two large benchmark jobs were
running was killed with exit 137 (cause not confirmed). The retry after both
jobs exited passed; both builds emitted CSS warnings.

**Highest-information next tests:** the entire large colored Git diff's parent
tournament timed out at 1200 seconds with no completed result (exit 124,
`full-trial-status.json`); no token result is inferred. A targeted profiled
trial or appropriately bounded parent search is needed rather than extrapolating
its raw saving. Run a blinded fresh-chat byte/meaning test from `native.md` using a genuinely
independent model session. For speed, profile and compare the unchanged final
wire under isolated, repeated A/B CPU and wall measurements on multiple typical
lanes; concurrent frontier wall time is not an adequate substitute. For the
remaining 8 canonical parent grammars, build or use a separate wire reader and
compare with source bytes. These tests may falsify the candidates and do not
presume a win.

## Provenance and reproducibility

Fixtures are real output of Git 2.39.5, not simulated patches. For example:

```sh
git -c color.diff.old=red -c color.diff.new=green -c color.diff.meta=bold \
    -c color.diff.frag=cyan show --color=always cee288d --format= -- \
    src/lib/omega/polysteli.ts > bench/x150/fixtures/git-polysteli-color.diff
```

The other captures use `cee288d -- src/lib/omega/tagstack.ts`, `49a5af2 --
src/lib/omega/tagstack.ts`, and `81b2ce7 -- src/lib/omega/epitypos.ts` with the
same options. SHA-256s are recorded by the independent verifier. For fast tests:

```sh
npx esbuild bench/x150/unit.ts --bundle --platform=node --format=esm --outfile=bench/x150/unit.mjs
node bench/x150/unit.mjs
python3 bench/x150/independent.py
python3 bench/x150/polysteli-independent.py
python3 bench/x150/compare-frontier.py
node bench/x134/leaders.mjs bench/x150/receipts/frontier.jsonl > bench/x150/receipts/leaders.json
python3 bench/x150/local-leaders.py
```

Python readers are distinct implementations of the raw transformations, not a
fresh model or independent decoder of every parent grammar. The colored-diff
fixtures are not the canonical 29 lanes. The stated shipping/merge threshold has not been met; experimental work may be
shared in the draft PR without being admitted to the default stack.
