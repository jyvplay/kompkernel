# X67 — PROBOLE (repeated-frame projection) + OURA entry memo: full record

Date: 2026-11-01. Branch `arena/5802fc3a-kompkernel`. Every number below comes from a
receipt written by a script in this directory and named next to it. Nothing in this
file is a projection, an estimate, or a claim of work that did not run.

## 0. Honesty ledger (read this first)

| Claim | Status |
| --- | --- |
| New codec `probole` implemented, unit-tested, registered, exact | **done** (`src/lib/omega/probole.ts`, `bench/x67/probole-unit.ts`, `src/lib/omega/registry.ts`) |
| New codec is Pareto superior on a real lane | **NO — it loses on both lanes fully gated** (labels +239, commits +255). Reported as a measured negative, not hidden. |
| The stack is made worse by it | **No.** It fails closed: when the complete message is not strictly cheaper it returns the exact source frontier message. The frontier is unchanged (`frontier-ab.json` is byte-identical to the pre-change run). |
| Whole-stack speed honestly improved | **Yes — 1.601×** on the recorded lane, with the complete message SHA-256 and per-codec cost vector byte-identical (`bench/x67/receipts/frontier-ab.json`). |
| Native-LLM decode performed | **Yes, one, in-chat, with the message as the only input** — §4.4. Not a statistical study; one worked instance, decoded by the model writing this file. |
| Decoder tested on an *external* model | **No.** No external model was called. |

## 1. Frontier confirmation (asked: is it still exactly last turn's configuration?)

Re-run of `bench/x67/frontier-ab.ts` on `bench/holdout-x40/metrics.tsv`
(1,203 ch, 811 raw tokens) reproduced, bit for bit:

```
frontierCosts: synkrisis 237 · kanon 236 · akolouthia2 210 · apographe 237 · metron 237 · diastema 237
frontierComplete: true   decodedEqualsSource: true   messageTok: 210
message SHA-256 f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628
```

That is the configuration from the previous turn, **unchanged**. The winner is
`akolouthia2` at 210 tokens. The memo lane below reproduces the *same* SHA with the
memo on, which is the proof that it did not move.

## 2. Speed lane — OURA entry memo (`src/lib/omega/oura.ts`)

### 2.1 What it is
The deterministic work meter (`workmeter.ts`) makes the frontier's search reproducible:
the same text with the same budget takes the same path. The stack therefore re-derives
the *same* answer for a memo key. OURA memoises the tuple
`{key → (result wire+message, work state, chiron state)}` at the frontier entry
(`depth === 1 && used === 0 && chironUsed === 0`) and replays it on a hit.

### 2.2 The soundness trap that was actually hit and fixed
The first version cached only the *result*. That is unsound: skipping the deterministic
work meter on a hit hands the caller free budget. Measured on the instrumented lane:
DIASTEMA ran 36.5 s → 49.9 s and METRON stopped reporting `bound`. The fixed version
replays the recorded `used` / `chironUsed` — the cache is a *replay of the work*, not a
shortcut around it. After the fix METRON and DIASTEMA are `bound` again and the per-codec
cost vector is identical.

### 2.3 Measurement (`bench/x67/receipts/frontier-ab.json`)
| | memo OFF | memo ON |
| --- | --- | --- |
| wall clock | 110,478 ms | **68,991 ms** |
| speed-up | — | **1.601×** |
| complete message | SHA `f0e0ffb9…8664628` | SHA `f0e0ffb9…8664628` (identical) |
| frontier costs | 237/236/210/237/237/237 | identical |
| memo counters | — | hits 3, misses 1, size 1 |

**Post-change re-run** (after the new codec was registered, i.e. the final state of this
branch): memo OFF 107,554 ms → memo ON 68,179 ms = **1.578×**, same message SHA
`f0e0ffb9…8664628`, same cost vector 237/236/210/237/237/237, winner `akolouthia2` at 210,
`ALL LANES BYTE-IDENTICAL`. So the speed lane is stable at **1.58–1.60× across two runs**,
and the frontier is provably unmoved by the new codec.

Per-codec with the memo on: synkrisis 27,077 ms · kanon 27 ms · akolouthia2 913 ms ·
apographe 3 ms / 0 units · metron 22,811 ms (bound) · diastema 25,150 ms (bound).
Off switch: `OMEGA_OURA_MEMO=0`. Env-honest caveat: this is a single recorded lane on a
2-core sandbox, not a benchmark suite; the 1.601× is the wall-clock ratio of the same
process doing the same recorded work twice.

### 2.4 Why it is wire-preserving
The memo key is the option tuple after `APOGRAPHE_ONLY_OPTION_KEYS` stripping
(`src/lib/omega/apographe.ts`). A closure scan over 110 files / 45 option keys found that
none of `apographe|kanon|forceLifts|forceSep|noGate` is *read* inside the OURA chain, so
stripping those keys cannot change the wire (`kanon ≡ {}`, measured M = 237 either way).

## 3. The mechanism search: what was NOT new

Before the new codec, fifteen mechanisms were checked against the stack and the public
record. All were rejected as prior art or as already present:

| # | Mechanism | Verdict |
| --- | --- | --- |
| 1 | key catalogue + like-shaped-objects → table with constant columns hoisted | prior art: `json_compress` crate, `compress-json`, `compress-json-rs`, `JSON-Compress` (six languages) |
| 2 | value/key dedup with base-62 back-references | prior art: `compress-json` `[values, rootIndex]` |
| 3 | schema/text-template induction (log templates) | in-repo `logtpl`, `paradeigma`; prior art LogShrink (ICSE 2024) |
| 4 | decimal shift + exception frames for float columns | prior art ALP (PACMMOD 2024) |
| 5 | field entailment for JSON records (a field = concat of constants and sibling fields) | in-repo PARADEIGMA/EIRMOS/SYLLOGISMOS |
| 6 | run-length of a repeated frame | in-repo ANADIPLOSIS (adjacency only — §5 explains why that is not enough) |
| 7 | dictionary/in-context prompt compression | prior art arXiv:2604.13066; in-repo FOTAR/VERITAS |
| 8 | column-store layout | decades old, and measured to lose (§5) |
| 9 | sorted-order/permutation codes | in-repo KIONES/TAXIS; no win on the fixtures |
| 10 | BPE-alphabet re-coding of the wire | in-repo STOICHEION/LEXIS |
| 11 | tag-closing elision | in-repo TAGSTACK (in the frontier already) |
| 12 | number punctuation elision | in-repo PSEPHOS (−185 on sp500) |
| 13 | periodic/dyadic bands | X66 PROBOLE-1 — measured negative |
| 14 | grammar over the *token* stream instead of the byte stream | no in-chat decoder can be checked without the tokenizer; rejected on the in-band rule |
| 15 | entropy coding (rANS/Huffman) inside the message | unreadable in-chat: a model cannot invert arithmetic coding reliably; violates the one-chat-turn rule |

## 4. PROBOLE — the mechanism that was built

### 4.1 The one thing the rest of the stack cannot do
Every mechanism in the frontier is a *substitution at the point of use*. APOGRAPHE's own
law: a repeated unit costs at least one token per use, forever. On canonical JSON the unit
is the whole multi-line record frame, and it is paid per record.

PROBOLE's claim is narrow and it is the only new thing claimed:
**emit the frame once, project it onto its instances, and let the parent frontier compress
the projection.**

### 4.2 Wire (complete, in-band, 673 chars for the worked example)
```
PROBOLE-1: <one-sentence rule statement>
^S <JSON string: the record separator>
^O <JSON string: the outer text, ⟨n⟩ = run n's records joined by ^S>
^T0 <JSON string: the record template, ~ = slot>
^V0 <k: records in the run>
<slot-major values, one per line; `*k v` means v repeated k times>
```
The contract is self-contained: it names the separator, the outer text, the template, the
slot count, the arrangement, and the RLE rule. There is no external dictionary, no skills
file, no system prompt, no hidden encoder state. Protected here: 112 tokens (measured).

### 4.3 Domain (exact, verified before use)
The source must be regenerable as `JSON.stringify(JSON.parse(text), null, unit)` plus at
most one trailing `\n`; that is checked byte for byte, so anything not in canonical form is
refused rather than mis-decoded (CRLF, `\u003c`-escaped, non-canonical indentation, keys
containing `~`, fewer than 3 same-shape records, non-contiguous shapes → refused, tested).
Runs must share one child depth; deeper candidates are skipped, not adapted.

### 4.4 Native-LLM decode, actually performed
Source 1,349 ch / 522 tokens → envelope 673 ch / 317 tokens. I (the model writing this)
read only the printed message and reconstructed the source in one pass: `^S` = `",\n  "`;
`^O` = `[\n  ⟨0⟩\n]\n`; `^T0` = the 3-line object with three `~`; `^V0 20` = three columns of
20 — `100…119`, `"u0"…"u19"`, and `true,*4 false,true,*4 false,true,*4 false,true,*4 false`
(i.e. `i % 5 === 0`); join with `",\n  "`, splice into `^O`. The result is the source
character for character. `worked-example.ts` prints the case and asserts
`proboleRestore(envelope) === source`. This is one worked instance, not a study.

### 4.5 What it measured (the honest part)
`bench/x67/probole-fullgate.ts`, receipts in `bench/x67/receipts/`:

| fixture | raw | envelope | envelope-restore exact | source frontier | **PROBOLE candidate** | delta |
| --- | --- | --- | --- | --- | --- | --- |
| `gh-labels-50.json` (14,670 ch) | 4,371 | 3,275 | yes | 1,400 (synkrisis) | **1,639** | **+239 (loses)** |
| `gh-commits-4.json` (21,293 ch) | 7,777 | 6,966 | yes | 3,567 (synkrisis) | **3,822** | **+255 (loses)** |
| `gh-tags-60.json` (24,128 ch) | 9,890 | 8,999 | yes | not gated | screen only: envelope −891 (−9 %) |

Both gated fixtures are real `gh api` captures (compact single-line JSON, canonical with
`unit=''`). Both are **exact**, and both **fail the emission gate**, so the codec returns the
parent message and the frontier is untouched.

### 4.6 Why it loses — the finding worth keeping
Decompose the labels case:

* removing the frame saves ≈ 350 tokens of raw key/punctuation text (7 keys × 50 records);
* the parent then compresses the *envelope* to 1,527 tokens, against 1,370 for the **source**;
* so the parent lost ≈ 500 tokens of compressive power on a text that was 1,096 raw tokens
  smaller.

The reason is mechanical: a substitution grammar binds **a key to the prefix of its value**.
`"url":"https://api.github.com/repos/nodejs/node/labels/` is one rule covering key *and*
URL prefix. Delete the keys and that rule dies; the same prefix must be matched alone, per
record. **On nested JSON, a record's keys are not overhead — they are context.** This also
explains, after the fact, why sixty turns of the stack never shipped a JSON template codec.

The commits case shows the same arithmetic: envelope −811 raw, envelope frontier 3,710 vs
source 3,537, contract difference +82 → +255.

## 5. Cross-lane state: where the frontier stands, and what the floors look like

Local leaders measured this turn or last (lower is better; `xz -9e` is on the same bytes):

| lane | fixture | raw tok | **frontier (codec)** | `xz -9e` | 2×(xz+2) token reference |
| --- | --- | --- | --- | --- | --- |
| ops table | `holdout-x40/metrics.tsv` | 811 | **210** (akolouthia2) | 396 B | ~796 |
| prose article | `holdout/kb-article.txt` | 526 | **622** (synkrisis) | 1,652 B | ~3,308 |
| code/markup | `holdout/pom.xml` | 1,178 | **544** (synkrisis) | 420 B | ~844 |
| JSON small | `holdout/json-pkg.txt` | 1,038 | **681** (synkrisis) | 1,308 B | ~2,620 |
| JSON API | `fixtures/gh-api.json.txt` | 2,239 | **2,519** (synkrisis) | 1,936 B | ~3,876 |
| listing | `holdout/find-listing.txt` | 2,013 | **1,142** (diastema) | 2,096 B | ~4,196 |
| JSON API (new) | `fixtures/gh-labels-50.json` | 4,371 | **1,400** (synkrisis) | 2,348 B | ~4,700 |
| JSON API (new) | `fixtures/gh-commits-4.json` | 7,777 | **3,567** (synkrisis) | 5,144 B | ~10,292 |
| prose answer | `holdout/llm-answer.txt` | 596 | 601 (gz 1,437 B) | 1,500 B | ~3,004 |

Two honest readings of this table:

1. On every structured lane the frontier is **2–3× below** the `2×(xz+2)` token reference,
   because frontier tokens buy ~3.2 characters while an xz byte costs ~2 tokens to emit.
   The frontier is not "close to a floor" on structured text; it is past the point where a
   binary compressor is even a fair comparison.
2. The only lane where the frontier is *at* identity is prose (622 vs 526 raw — it does not
   even win there; the win is elsewhere in the family). Prose is the frontier's weak lane
   and it is weak because prose has no repetition to substitute. That is a property of the
   input, not a missing trick.

**Generalized local leaders** (by structure category, from the measurements above):

| category | leader | mechanism that wins | why |
| --- | --- | --- | --- |
| delimited numeric columns | `akolouthia2` | second-difference elision down a column | the column *is* an arithmetic sequence |
| prose / narrative | `synkrisis` → apographe chain | substitution tape over the OURA/EUTELEIA chain | only repeated spans exist; contract tax ≈ 30 tok is the floor |
| markup / code with closing tags | `synkrisis` | TAGSTACK closing-tag elision + grammar | closing tag text is derivable |
| JSON with nesting | `synkrisis` | grammar rules that bind key + value prefix | keys are context (§4.6) |
| flat listings | `diastema` | interval elision | every line is (prefix, counter, suffix) |
| mixed / hybrid | `synkrisis` | portfolio + gate | no single clause dominates |

## 6. Web sources consulted this turn (and what each actually contributed)

* `docs.rs/json-compress`, `docs.rs/compress-json-rs`, `github.com/beenotung/compress-json`,
  `github.com/eharain/JSON-Compress` — key catalogue, column tables, constant-column
  hoisting, six-language wire format, explicit key-order preservation. **Used to refuse four
  "new" ideas as prior art** (§3 rows 1–2) and to force PROBOLE to carry the outer text and
  separator explicitly.
* `arxiv.org/pdf/2309.09479` (LogShrink, ICSE 2024) — commonality/variability skeleton +
  numbers, but binary framed. Reinforced "skeleton separate from values" as a *known*
  direction; not single-message readable.
* `dl.acm.org/doi/10.1145/3626717` + `ir.cwi.nl/pub/33334` (ALP, PACMMOD 2024) — decimal
  shift + exception frames for floats. Relevant only as a column-numeric idea; binary
  framing disqualifies it under the in-band rule.
* Earlier in this line of work (kept for provenance): arXiv:2604.13066 (dictionary +
  in-context lossless prompt compression), `github.com/openai/math`,
  `github.com/anthropics/formal-math`, arXiv:2605.22763 (AlphaProof Nexus),
  `github.com/AxiomMath/CFSG`, arXiv:2605.29955 (Meta ATLAS), arXiv:2610.08144.

**Do the recent formal-math results help codec design?** Evaluated and answered honestly:
no. AlphaProof-style search over formal proofs improves *search* over a fixed language; a
codec needs a *shorter description*, and shortening is bounded by the entropy of the input
plus the reader's prior. What transfers is the methodology the stack already uses: meter
the search, memoise the deterministic path, gate on a measured total. That is exactly what
§2 and §4 are.

## 7. What was not done / what is next

* No external-model decode test was run. The one decode in §4.4 is mine.
* `gh-tags-60.json` was screened but not gated (time); its envelope loses only 9 % raw, so
  the prior says it loses the gate too.
* Next mechanism, given §4.6: **field entailment over JSON** (a field that is a function of
  sibling fields — `node_id = base64("Label" + id)`, `url = prefix + name`). That attacks the
  1,400-token frontier on labels where the true content is ~100 tokens, i.e. 14× headroom.
  PARADEIGMA/EIRMOS claim the idea for tables and JSON but are **not in the frontier** and
  have no measured win. That is where the next turn should go — and it must be priced as a
  complete message against `synkrisis:1400`, the same gate as here.
