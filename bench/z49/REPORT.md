# Z49 — X5 tier-5 ultrareview: ≡ PARADEIGMA (template entailment for JSON records)

Turn 5 on the DAEDALUS-D/A10 frontier (after ANAGNORISIS, ENTHYMEME, EPAGOGE, ELLEIPSIS). Metric
everywhere: `M = o200k tokens(decoder contract) + tokens(wire)` of ONE chat message, byte-exact
round trip, `OMEGA_DET=1`. Everything below was executed in this sandbox; every number has a file
under `bench/z49/receipts/`.

## A. Runtime honesty

Tools actually available: bash (node 22, python 3, esbuild bundling via `bench/tmp/run.sh`), file
read/write, `gh`/`git`, web search + page fetch, process tools. NO LLM API: "the reader" in any
measurement is the native TypeScript decoder plus an independent CPython reader
(`bench/paradeigma_decode.py`); the only LLM reading is my own blind in-context decode (§G.4).
The sandbox was recreated mid-turn (node_modules and `bench/tmp/` lost, local git reset to the branch
point); the branch was re-attached to `origin/arena/5b3a22ac-kompkernel` (c6cc844) with
`git reset FETCH_HEAD`, tooling reinstalled, and every receipt that matters was (re)produced with the
final build — which is how the decoder-state leak (§A.1) was found: the same file gave 788, 869 and
706 in different process histories.

### A.1 Frontier bug found and fixed: gpt-tokenizer decoder-state leak (`src/lib/omega/bpe.ts`)

gpt-tokenizer decodes through ONE module-global `TextDecoder` in streaming mode and never flushes it
(`esm/BytePairEncodingCore.js:6,203,216`). The trailing bytes of an incomplete UTF-8 sequence — the first
token of a two-token character such as `≡`, or the last id of ARIADNE's 200 006-id vocabulary scan —
stay buffered and are prepended to the NEXT, unrelated decode. `ariadne.buildOn` rejects per-token
strings that do not re-join to their chunk, so an entire search arm (the no-blocks grammar, the
`span12+words` arm) silently vanished depending on what had been decoded earlier in the process, under
`OMEGA_DET=1`. Evidence `receipts/det-leak.log`: same composed text, one process, DAEDALUS 787 → 706 →
706; 869 when a plain run preceded it; SIBYL trace shows the missing grammar. Fix: flush before every
public decode and APPEND the final flush to the result (non-streaming semantics). A first version that
discarded the tail was rejected with receipts (`receipts/fix-v1-discarded/`): o200k id 439 =
`о` + dangling 0xD0 then decoded to a counterfeit one-token `о`, the glyph pools gained duplicates and
followers-20 plain went 840 → 922. Final: pools identical to before minus four counterfeit glyphs,
followers-20 plain 840 / 840, composed tags-20 706 / 706 / 706 (`receipts/fixed/det-leak-after.log`),
22-lane DAEDALUS reference 20 329 → 20 322 (dpkg-l −10, ls-usr-bin +3, 20 lanes unchanged). Earlier
same-process comparisons in this PR stay valid (both arms shared the leak); their absolute numbers
may move by a few tokens under the fixed decoder. Runtimes: encoder = 2 DAEDALUS passes (composed + plain arm), 14–106 s per corpus file,
353 s for the 40 KB package-lock head (left plain).

## B. Formal model and the seam

Let a document be a list of pretty-printed JSON objects. A **template** for key `k` is a string
`c0 <s1> c1 <s2> … cn` (constants `ci`, slots `si` = sibling keys) such that in every object that
has `k` and all `si`, `value(k) = c0 ∥ raw(s1) ∥ c1 ∥ …` (raw = the sibling's JSON text with quotes
dropped; slot text ≥ 3 chars; the value must be a JSON string or bare scalar). This is exactly the
`Concat(ConstStr, sibling-field)` fragment of the FlashFill DSL (Gulwani, POPL 2011) and the
string-template special case of a *nested functional dependency* `{s1…sn} → k` (arXiv 2111.10398);
PARADEIGMA induces it from the document, verifies it on every record, states it once in-band, and
elides the dependent field.

Cost model under DAEDALUS (measured, §C): a line `"k": "<template>"` costs about **2 tokens per
slot** (slot-value glyph + following constant-run glyph; measured 1.7–2.0) and ≈ 0 for a line with no
slots (its constant text is absorbed by the neighbouring glyphs). A stated template costs ≈ 4 tokens
more than the dictionary rule it replaces. Hence the encoder's margin for a template with `n`
members and `s` slots is `n·2·s − 4`, constants (s = 0) are never templated (measured: comments-10
1034 with constants vs 1018 without), and the contract (84 tokens, once) is paid only when
Σ margin ≥ 24. The gate is then re-checked by actually measuring: the plain DAEDALUS arm always runs
and wins ties, so `M(PARADEIGMA) ≤ M(DAEDALUS)` on every input.

**H+** (where it wins): ≥ ~15–20 objects of one shape with ≥ 1 templated field, or ≥ 3 objects with
tens of templated fields (GitHub user/repo/issue/comment/tag/contents objects, any REST dump whose
URLs are built from ids). **H−** (floor): prose, logs, tables, code, single-object documents,
compact or JSONL serialisations — nothing is entailed by siblings, or the sentence costs more than
the ~2 tokens/slot it removes. **H∂** (boundary): 2–6 objects (npm-left-pad 2974 vs 2844,
gh-api holdout "estimated gain 8"), one-template dumps (branches-20: 774 vs 739), own-key /
nested-parent slots (package-lock `resolved`, npm `dist.tarball`) — stated as not supported in v1.

## C. Frontier and measured results (real mode, native + CPython byte-identical)

`bench/z49/receipts/fixed/xcheck-real.log` (final build, fixed decoder; 7/7 byte-identical under both readers):

| file (`gh api …`, indent 2) | raw | DAEDALUS | **PARADEIGMA** | Δ | templates / lines removed |
|---|---:|---:|---:|---:|---|
| users/nodejs/followers?per_page=20 | 6041 | 840 | **557** | −33.7 % | 12 / 240 |
| repos/nodejs/node/tags?per_page=20 | 3792 | 951 | **788** | −17.1 % | 3 / 60 |
| repos/nodejs/node/contents/lib (25) | 6705 | 1411 | **1269** | −10.1 % | 5 / 116 |
| repos/nodejs/node/issues/comments?per_page=10 | 6053 | 1127 | **1017** | −9.8 % | 15 / 147 |
| users/nodejs/repos?per_page=3 | 5155 | 1210 | **1135** | −6.2 % | 54 / 162 |
| repos/nodejs/node/pulls?per_page=1 | 5660 | 2251 | **2185** | −2.9 % | 13 / 62 |
| repos/nodejs/node/commits?per_page=4 | 8544 | 3696 | **3658** | −1.0 % | 14 / 104 |
| synthetic 20-user list (`fixed/adversary.log`, real mode) | — | 480 | **403** | −16.0 % | — |
| branches-20 / runs-1 / releases-1 / npm-left-pad / package-lock head / holdout gh-api (2 issues) / json-pkg | | 739 / 2178 / 544 / 2845 / 5523* / 1153 / 743 | ties | 0 | plain arm kept (*package-lock measured under the leaky decoder, 353 s, not re-run) |
| 22 canonical prose/ops lanes (`fixed/lanes.jsonl`, DAEDALUS re-measured with the fixed decoder) | | 20 322 | 20 322 | ties | all exact |

Σ over the 7 applied files: 11 486 → 10 609 (−7.6 %); the 6 other JSON files tie. The earlier in-turn
figures (try-3.log: 566/1034/1133/1304/807/2178; xcheck-real.log 2191/3656) came from the 98-token
contract + META-line build and from the leaky decoder respectively and are superseded. Forced wires for
all 11 files (`fixed/xcheck-forced.log`, 11/11 byte-identical) show the gate's work: branches-20 774 vs
739, npm-left-pad 2974 vs 2845, runs-1 2186 vs 2178, holdout gh-api 1270 vs 1153 — all correctly left
plain.

Copy floor context (z46): the DAEDALUS → PARADEIGMA step on followers-20 (840 → 557) is larger than
the whole remaining DAEDALUS-vs-copy-floor gap on gh-api (1153 vs 893).

## D. Negative space (≥ 15 shapes, each checked for a modal shortcut)

Reasoned or measured ≈ 0 and NOT shipped: (1) constant whole fields (`"site_admin": false`) — ≈ 0
under DAEDALUS, measured; (2) `}`/`],` closer-line prediction — APOCOPE ≈ 1 tok/line at best, needs
counting; (3) ISO timestamp deltas — reader arithmetic; (4) same-second prefix markers — char-level
edits (CUTE); (5) log template slots (Drain-style) — logs rarely repeat whole constant+slot lines in
one paste; (6) smaller contract for short texts — contract is already 84 tokens, 2-object dumps still
cannot pay; (7) scaffold READMEs / GitHub key names as public canon — world-knowledge canon rejected
again (ANAGNORISIS covers licenses); (8) compact JSON / JSONL — refused (no line structure to anchor
on; measured not applied); (9) own-key slots `<@key>` for package-lock `resolved` (~7 % of 5523) —
v2 idea, not started; (10) nested-parent slots (npm `dist.tarball` ← `version`) — v2; (11) numeric
derivations (`id` → `node_id` base64) — reader must not compute; (12) `html_url` ↔ `url` host
rewriting — a transform, not a copy; (13) reordering fields to make templates adjacent — breaks
byte-exactness unless undone; (14) TOON/CSV re-serialisation — SpreadsheetLLM-style, measured ≈ 0
under DAEDALUS in X4 and inexact without a reorder step; (15) speed-only encoder — not
mechanism-distinct (ANAMNESIS PR #28 territory); (16) percent-encoded label URLs — the minority
literal is simply kept (that is the mechanism's exception path, costs nothing extra); (17) chaining
across objects (`<repository_url>` of the issue reused by its `user`) — a cross-object slot needs a
path language the 84-token contract cannot carry.

Modal-shortcut test for each: "would a reader with the contract but without reasoning produce the
bytes?" — only the shipped copy-into-slot family passes (every restored character is a verbatim copy
of text already in the message).

## E. ≥ 6 mechanism-distinct approaches tried this turn (artifacts)

1. **STRIP measurement** (`measure-strip.ts/.log`): gross savings when templated fields are removed
   — overstated (ignores the sentence and seam), kept as an upper bound.
2. **Prototype in Python** (`proto.py`, superseded): templates + dictionary, raw clause outside
   DAEDALUS — cost ~750 tokens; killed.
3. **Clause folded into the DAEDALUS text** (shipped): the clause's repeated stems share the
   dictionary; `measure-proto.log`.
4. **Exact key-set object types** → split optional-key objects; replaced by (key, anchor, skeleton)
   groups + dynamic "objects having" key selection (`plan()`).
5. **Constant templates** in/out: measured out.
6. **META line + in-clause contract** (114 tokens) vs one outer contract (84): outer wins.
7. **Repair loop** (encoder runs its own reader, drops the culprit template until byte-exact) — after
   the mutual-slot / same-key / `before()` ordering fixes it fires 0 times on all 10 corpus files.
8. **Independent CPython reader** written from the contract text, not from the TS code.

## F. Second-order adversary (`adversary.ts`, `receipts/fixed/adversary.log`, final build)

23/23 PASS, native + CPython byte-identical on every case: minority literal in a templated field,
optional field, `<`/`>` inside values, forward and mutual references, nested shapes, trailing shell
noise after the JSON, truncated paste, numeric copies, inline containers, duplicate keys,
substring-sibling, container before anchor, anchor after an array; refusals (plain arm): payload
beginning with `≡`, compact JSON, JSONL, CRLF, 2-object list.

## G. External verification receipts

1. `receipts/fixed/xcheck-real.*` — 7 real wires (final build, fixed decoder) decoded by native and
   CPython readers, sha256 of the source text recorded per file.
2. `receipts/fixed/xcheck-forced.*` — forced wires for the 10 corpus files + holdout, 11/11 byte-identical.
3. `receipts/fixed/lanes.jsonl` — 22 canonical lanes, DAEDALUS and PARADEIGMA both Σ 20 322, all exact
   (`receipts/lanes-paradeigma.jsonl` is the pre-fix run: Σ 20 329 = old reference, also all ties).
5. `receipts/fixed/adversary.log` — 23/23 with the final build; `receipts/det-leak.log`,
   `receipts/fixed/det-leak-after.log`, `receipts/fix-v1-discarded/` — the decoder-leak evidence.
4. **Blind self-decode** `receipts/selftest-tags-6.*`: I read the one-chat prompt text only
   (14 DAEDALUS rules + a 2-block ≡ clause), expanded it by hand and wrote the result;
   `sha256 4e7676c6703e1c164b3aab7aeb1429e506a1b2ad62f57950b9a1b70df243992a` on both sides,
   `cmp` byte-identical. (Forced wire: 6 objects sit below the break-even — 449 vs 387 — so this is a
   readability receipt, not a gain claim.)

## H. Prior art, web (new this turn) and the ten proofs

- Nested FDs on JSON (arXiv 2111.10398, 2021) and Pyro (VLDB 2018): dependency discovery is the
  database-theory ancestor; PARADEIGMA is the exact string-template FD stated in-band for an LLM.
- FlashFill (POPL 2011): same DSL fragment, learned by example; here learned from all records with
  exact verification.
- SPARTAN (SIGMOD 2001), LogShrink (ICSE 2024), Denum (2024): model-based / inter-field compressors —
  binary or lossy; none is a chat message.
- RoundTripCodeEval (arXiv 2601.13398v2): LLMs ≤ 32B fail at executing classical coders → only
  substitution-level mechanisms are admissible; CUTE (EMNLP 2024): word-level edits fine,
  character-level poor → whole-field copies, never character surgery.
- OpenAI `ten-proofs` (read individually): #7 GapCVP / syndrome-decoding hardness is the only one that
  touches this work — template/kind selection is a set-cover-like optimisation, so a greedy plan with
  verification is the right shape; #5 Permanent (counting hardness) is the reminder that the reader
  must never count; #2 MetricCodes concerns noisy channels (ours is noiseless, exact). The other
  seven (Compactness/Degeneracy, Connes rigidity, Ehrhart, multicolor triangle Ramsey, non-sofic group,
  quantum parallel repetition, sphere packing) do not bear on source coding into a token budget.
- Rosetta's known-form concept: a shared form is a precondition; prose and hybrid prose have no
  shared form — nothing to broaden (unchanged from X1–X4).
- Open PRs re-checked (`gh pr list`, 2026-10-14): #28, #27, #23, #20, #18, #17, #13, #11, #8, #7, #6,
  #4, #3, #2 unchanged since X4 — nothing new to copy.

## I. Repair log (bugs found and fixed this turn; none reintroduced)

strict parse on truncated pastes → tolerant tail; raw clause outside DAEDALUS; exact key-set types;
kind separation against the current removal state; kind reuse across shapes; anchor-dependent kind
choice; static `mayLose`; META line; constant values with spaces/`,`/`;`/`|`/quotes (Scanner) →
JSON-string-or-scalar only; slots < 3 chars; constant templates; mutual-slot pairs
(`_npmVersion` ↔ `_nodeVersion`); clause order by raw field index across shapes (`_id` before its
anchor) → `before()` comparator; same key templated twice with different anchors. Frontier: gpt-tokenizer
decoder-state leak in `bpe.ts` (§A.1) — fix v1 (discard tail) rejected, fix v2 (append tail) shipped;
`sibyl.ts` gained env-gated (`OMEGA_TRACE=1`) traces of swallowed exceptions and arm evaluations.

## J. Stopping

Stopped when (a) the plan fires zero repair rounds on every corpus file, (b) every applied file is
byte-identical under two readers, (c) all negative lanes tie, (d) the remaining ideas (own-key and
nested-parent slots) are v2 scope with a known ceiling (~7 % of package-lock lines). What we missed
all this time: the biggest redundancy in machine-made JSON is not repetition of *text* (DAEDALUS
already folds that) but repetition of *construction* — fields that are functions of their siblings.
A dictionary cannot see a function; a one-sentence template can, and the reader needs nothing but
copy-and-paste to apply it. And a second thing we missed for five turns: the frontier itself was not a
pure function of its input — a library decoder's buffered byte made search arms appear and disappear
with process history, which no amount of `OMEGA_DET=1` discipline could see until one file was
measured in three different histories.
