# X152 — HOMOSEMA: parser-state terminal coalescing

## Result, without upgrading the claim

**A new unwired codec has a source-verified 20-token complete-message win on a real
VS Code configuration manifest.** It does not establish broad prose gains, reliable
native single-chat decoding, or significant whole-stack speedup. Keep PR 76 draft.

| Source | Whole-stack incumbent | Best ordinary HOMOSEMA | Fused complete message | Selected |
|---|---:|---:|---:|---:|
| Canonical json-pkg | 653 | 680 | 664 | 653, unchanged |
| Chalk v5.6.2 package.json | 387 | 404 | **385** | 385 (−2) |
| VS Code JSON-extension package.json | 915 | 914 | **895** | 895 (−20, 2.19%) |

The 24 ordinary trials are 11 dialects on each of json-pkg/Chalk and two close-only
dialects on VS Code. Six fused trials reuse those actual emitted parent messages;
they are new complete-wire prices, **not six fresh parent encodes**. All 30 messages
pass original-source UTF-8 byte reconstruction in an independent Python implementation,
reference o200k pricing, UTF-8 transport and tokenizer-ID round trips. Fresh external
fixtures were selected during exploration, not preregistered blinded validation.
VS Code was the third full-parent source; this is a narrow structured-data result.

New modules: `src/lib/omega/homosema.ts`, `homosema-frontier.ts`.
No import into TAGSTACK or default production behavior. No manifest changes.

A fresh call to the complete public `homosemaFrontierEncode` API subsequently
recomputed the original and both folded parents (not replay), returned the same
895-token wire, and passed another independent Python source-byte read.
Elapsed 115136 ms; CPU 122307 ms for that one
complete call. This is an observed cost, not a speed comparison.

## A–B. Formal model and admissible objects

For source x, incumbent F(x), message m, exact decoder D, and fixed tokenizer T,
count C(m)=|T(m)| over the **entire emitted message**, not its payload alone.
Sources are UTF-8-stable lexical JSON texts, at most 50,000 UTF-16 code units,
maximum recursive value depth 128, with original whitespace, duplicate keys,
escapes, numeric spelling and final newline retained. Valid JSON numbers are
never converted to JS Number. Invalid JSON and unsupported parent envelopes are
refused. Empty containers and scalar roots are handled; unchanged scalars supply
no candidate. No tolerance for byte changes, rounding or normalization.

### Construction and exactness lemma

A JSON parser knows that a separator after an object key is a colon; a separator
after a completed member/element is a comma. Its stack knows whether the innermost
container closes with `}` or `]`. HOMOSEMA merges those terminal spellings, keeping
all other characters literally unchanged. The inverse consumes the same lexical
stream and selects the original terminal using parser state. Induction on JSON
values: scalar lexemes are copied; string contents/escapes are never transformed;
container interiors recurse; each expected separator and close has one restored
type. Thus the accepted source reconstructs exactly. This reasoning is backed by
bounded tests, not a machine-checked universal proof.

The 11 dialects are separator in {unchanged, comma, colon, semicolon} × close in
{unchanged, ], )}, excluding identity. All are enumerated, no greedy hill climb.
The optional composed selector tests only the two close-only dialects, selected
as a policy after the initial experiments. Parent search remains its existing
heuristic search. Fusion supports one exact ordinary CHIRON header only and keeps
an explicit string exclusion:

    ¶ k=v; expand repeatedly. Outside JSON strings, ] closes either container; print only.

This replaces the ordinary grammar preamble plus a separate restoration header.
It does not omit the restoration instruction or change strings. The generic grammar
reader is still required. No claim that this instruction has been behaviorally
validated on an independent language model.

## C–F. Access model, resources, quantifiers, thresholds

Encoder access: source, tokenizer, whole-stack incumbent, and at most two additional
parent calls in the optional selector. Decoder access: only the final ordinary-text
message, no external dictionary, skills.md, system prompt, source file or tools.
The Python and TS readers are verification instruments, not the intended user
interface. Source file bytes are the ground truth, not the encoder's decoded field.

Claim threshold:
- For every tested accepted output, D(m)=x exactly and C(m)<=C(F(x)); otherwise
  retain the source-matched incumbent byte-for-byte.
- There exists an ordinary-work source with a **>10-token** strict complete-message
  gain: met on the new VS Code manifest (20). Not met on the canonical 29 lanes.
- Reliable native reading needs a real independent basic single-chat test on emitted
  wires, followed by a broader held-out protocol. **NOT_RUN** here.
- Significant speed needs isolated repeated whole-encoder evidence with the same
  budgets, flags, sources and exact outputs. Predeclared experiment: all tested
  lanes nonregressing and >=10% aggregate wall AND CPU reduction. **Failed**.

Therefore a limited token-cost achievability result is established; the conjunctive
full task is not. There is no claim of runtime Pareto superiority: optional encoding
adds two parent searches. Token cost plus source fidelity is not the full resource
vector. No unconditional H+ commitment or merge follows from a single win.

H+: full target achievable — remains possible, not established.
H−: impossible under these constraints — not established.
H∂: structured JSON benefits while prose/canonical lanes do not, and model behavior
and extra encoder work remain decisive boundaries — supported by these experiments.

Adjacent tasks excluded: data-model losslessness, canonical reprinting, gzip storage,
semantic summarization, format-valid generation, custom tokenizer training, token-ID
submission, compression capacity, fast grammar-guided inference, minimum character
superstrings, and in-context self-reading instead of blind model verification.

## Frontier reconfirmation and category leaders

Fresh default run: **29/29 wires identical to X151, 11,962 tokens**, workers both
exit zero, 628,685 ms concurrent elapsed. This timing is NOT compared as a speedup
to X151: machine load/environment and concurrency differ. Reference prices and token
round trips pass on all 29. Bounded project reader matches 21 source files and
reports eight unsupported; those are not passes. No default production code changed.

Identity-bound inherited category summaries (`receipts/local-leaders.json`):

| Category | Lanes | Raw tokens | Frontier tokens | Tape-body class leader |
|---|---:|---:|---:|---|
| Prose | 5 | 5856 | 3429 | word |
| Ops/tabular | 16 | 17278 | 5580 | glyph |
| Code/structured | 4 | 4152 | 2636 | word |
| Other | 4 | 729 | 317 | no tape |

Largest absolute raw-relative savings remain apt-real 2739→813, ls-l 5194→1310,
json-pkg 1152→653 and cue-sheet 513→101. These are inherited fixture/class leaders,
not per-codec ablations or global optimality. New external structured-source local
leaders: HOMOSEMA 385 for Chalk, 895 for VS Code against measured TAGSTACK baselines;
not inserted into the unchanged canonical aggregate.

## E–G. Six mechanism-distinct tracks and their falsifiers

Distinct constructions, not six claimed new primitives or six shipped codecs.
Prior overlap and rejected directions are preserved rather than renamed.

| Track / construction | Artifact; established part | Exact gap, falsifier, adversary |
|---|---|---|
| Grammar-state terminal coalescing | HOMOSEMA modules, 24 parent trials, 6 fused prices, 30 independent inverses | Behavioral/native and broad domain gap (original target); cold single-chat VS Code packet. Attack escaped quotes, punctuation inside strings, duplicate keys, number spelling, depth/cap, unsupported parent and source mismatch. |
| Grammar-order information carrier | `portfolio.ts` reprices shorter X151 rank contracts (15/23 tokens), records missing semantics | Existing DIATHESIS, not a new primitive. Missing window/order/padding makes shortened versions inadmissible (local contract gap); a changed window/key order falsifies decoding. No cold test exists. |
| First-line layout anchor | `portfolio.ts` exact wrap/undo construction, 29-lane census; four eligible lanes | Endogenous width instead of sending W, but related to PTYCHE/KREMA, not novel enough. Raw complete candidates lose (KB 686 vs raw 656 and incumbent 620). Parent interaction untested (local); attack unequal widths, repeated spaces, CRLF, trailing LF. |
| English number-word recoding | Deterministic zero–nineteen map with reserved marker and exact inverse in `portfolio.ts`; four lanes eligible | Distinct from native-digit glyph offset, still classical recoding. All complete raw candidates lose; no parent win inferred (local). Attack literal marker, case, compounds, zero and unrelated digit text. |
| Shortest-superstring representation | Inspected OpenAI statement/solution interface; `portfolio.ts` live symbol/token nonmonotonicity witness | Symbol metric is not our BPE/reference/protocol metric (original objective gap). 10-char `1234567890` costs 4 tokens; 14-char `authentication` costs 1. Cannot import a factor-two symbol bound as a token bound. |
| Allocation-free vocabulary rejection | `speed-build.mjs`, exact script-pool hash equality for both tokenizers, cold whole-stack ABBA | Local implementation optimization; isolated whole-stack gate failed. Attack overlapping script ranges, supplementary code points, first-char-only acceptance, invalid token decode and pool ordering. Full pool values/order checked, not counts alone. |

Preserved independence: the constructions address parser syntax, permutation capacity,
layout, lexical spelling, global overlap and implementation allocation respectively.
They were not selected by assuming one representation's raw savings transfer to others.
No all-stack novelty proof is claimed; audit found normalization, percent decoding,
native numeral offsets, closure/tag inference and layout ancestors already present.

## D. Negative space and modal shortcut

Reject these 20 lookalikes: raw-fold saving; omitted header; payload-only child win;
synthetic inflated baseline; data-model equality; parse/stringify normalization;
encoder self-report; decoder inverse as native behavior; custom tokenizer IDs;
external dictionary; changed fixture; only supported cases called all-pass; incomplete
frontier; concurrent timing as speedup; microbenchmark as whole-stack speedup;
changed search budget; challenge `sorry` mistaken for a submitted proof;
formal statement treated as proof replay; symbol-space bound treated as token bound;
small structured win generalized to prose or runtime Pareto superiority.

Modal shortcut: existence of a program inverse does not imply that an unassisted
model reliably executes it on every emitted wire. `verify.py` deliberately evaluates
full acceptance with program-readability=true, native gate=NOT_RUN, speed gate=false.
The result remains false despite the 20-token win. This detects evidentiary
substitution, not latent model errors; those require the external behavioral trial.

## H–I. Verification and repaired-candidate trust

- 2,231 constructed codec/unit/boundary checks; 16 fusion attacks; 13 optional-selector
  checks replayed over actual measured folded-parent outputs (not invented encodes).
- 30/30 independent Python inverses and both fresh-source baseline reads.
- 120 TS full-message/source/transport/token-price checks across those 30 messages.
- TypeScript and production build pass; logs retained. No theorem prover executed.
- Python reader initially supported Cyrillic only; Arabic parent on one dialect was
  unsupported. Extended the script range selection, reran all affected wires, and
  added five targeted script/forward-reference tests. An initial attack incorrectly
  demanded rejection of a foreign-script literal; such literals are legal. Corrected
  the test expectation, documented in `independent-patch.json`, not silently rewritten
  as a discovered codec defect.
- Portfolio receipt initially serialized source rows instead of computed result rows;
  fixed, reran all 29 screens, checked the receipt schema. No frontier result relied
  on the broken receipt.
- OpenAPI example fetches failed with 404; no empty file was benchmarked. Used a
  separately retrieved real VS Code manifest and verified its bytes at the saved commit.

Runtime tools actually used: Node 22.22.3, TypeScript 5.9.3/esbuild, Python 3.11.2,
Vite, shell/git/gh, web search/fetch. Actual concurrent frontier workers and parent
jobs are recorded. No independent agents, simulators, Lean/Lake/Docker replay,
private database, or independent native-chat model endpoint was used. `research.md`
records individual lab claims, hypotheses, deeper source checks and exhaustive-audit
limits. Repo restoration fetched the already-pushed session branch and used mixed
reset to synchronize Git metadata without discarding working files.

## Whole-stack speed experiment (rejected)

The candidate avoids allocating an array of all code points for each vocabulary
entry before rejecting its first character. Both script-pool snapshots hash exactly
the same (both encodings, pool order, chars, pairs, degree and ngrams). This does not
establish faster overall encoding.

One timing run overlapped a short contract-pricing compilation; it is excluded and
kept in `receipts/speed-contaminated/`. After all other jobs exited, reran **12 cold
processes** sequentially in ABBA order across KB prose, ps-real ops and json-pkg.
Every wire was identical across arms. Clean B/A aggregate ratios: **CPU 1.015625,
process wall 1.012454**. KB CPU 1.008553, ps 1.022027, JSON 1.012248; respective wall
ratios 0.996778, 1.016213, 1.013609. The predeclared >=10% aggregate and nonregression
gate fails. **No production speed patch applied.** Results are a small noisy regression,
not proof the optimization is always slower. The dominant whole-stack cost remains.

## J. Next highest-information tests / reproduction

1. Run `native.md` with the frozen real 895-token VS Code packet in a fresh basic
   chat, with no source/hints/tools. Byte-compare the first unedited response.
2. If it passes, test a preregistered unseen manifest/schema corpus including quote
   punctuation and mixed containers. The two observed wins are discovery evidence,
   not a held-out distributional guarantee.
3. Measure the extra two parent searches separately against actual user latency;
   do not claim token/fidelity Pareto improvement implies runtime improvement.

Bundle `.ts` entrypoints with esbuild `--bundle --platform=node --format=esm`, then
run Node. Reuse x149 frontier-worker with x151 lane lists. `compare-frontier.py`
requires all 29 fresh rows. `parent-trial.ts` accepts source/output path and optional
`close` argument. `fused.ts` consumes the actual JSONL parent receipts; `wrapper.ts`
replays only exact folded-source matches. `independent.py`, `verify.py` use Python
stdlib. `speed-build.mjs` creates both experimental bundles without modifying
production; run `speed-run.py` only when other CPU jobs have exited.

The full requested breakthrough is **not** claimed. The strongest verified artifact
is a modest real-work JSON token reduction with a bounded byte-preserving codec,
plus honest negative speed evidence and an unrun native-readability gate.
