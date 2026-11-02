# Z44 — GRAMMA-Ω: notation dialects, or "the decoder's own formatting priors as the dictionary"

Date: 2026-10-13. Branch `arena/fb75564c-kompkernel`. Deterministic mode `OMEGA_DET=1` throughout.
Codec added to the repo this turn: `src/lib/omega/gramma.ts`, registered as `gramma` in `src/lib/omega/registry.ts`.

---

## 1. Result

Metric is the repository's own: **M(x) = tokens(decoder contract + wire)** under `o200k_base`, measured on the
actual one-chat message, never on the wire alone. Frontier at the start of the turn: **DAEDALUS** (`bench/z33/receipts/daedalus-151.jsonl`).

`bench/z44/receipts/codec-eval-gramma.jsonl` (canonical evaluator `bench/z43/codec-eval.ts`, 8 files × 3 codecs, every row `exact=true`):

| file | tokens(x) | DAEDALUS M | STICHOS M | **GRAMMA M** | dialect | Δ vs DAEDALUS | Δ% |
|---|---:|---:|---:|---:|---|---:|---:|
| holdout/gh-api.json.txt | 2519 | 1153 | 1198 | **1091** | `json1` | **−62** | −5.38% |
| holdout-ops/package-lock-head.json | 15009 | 5523 | 5694 | **5463** | `json2` | **−60** | −1.09% |
| json-real/react-latest.json | 1010 | 821 | 830 | **795** | `indent2s` | **−26** | −3.17% |
| train/dts0.txt | 3991 | 2135 | 2233 | **2116** | `indent4` | **−19** | −0.89% |
| json-real/vite-latest.json | 2484 | 1573 | 1640 | **1559** | `indent2s` | **−14** | −0.89% |
| json-real/typescript-latest.json | 2004 | 1001 | 1022 | **988** | `indent2s` | **−13** | −1.30% |
| holdout/code-ts.txt | 1422 | 1028 | 1138 | 1028 | `none` | 0 | 0.00% |
| holdout/json-pkg.txt | 1152 | 743 | 794 | 743 | `none` | 0 | 0.00% |
| **total** | **29591** | **13977** | **14549** | **13783** | | **−194** | **−1.39%** |

No-regression set (`bench/z44/receipts/gramma-set.jsonl`, prose/ops/docs lanes): `holdout/readme.txt` 688→688,
`holdout/gh-prose.txt` 1782→1782, `z29/ops-real/ps-eo.txt` 847→847, `z29/ops-real/ls-usr-lib.txt` 342→342,
`z28/wrapped-real/linux-coding-style.rst` 9229→9229. Six further files tie exactly.

**Wins on 6/8, ties on 2/8, loses on none, and beats the existing layout codec STICHOS on all 8 (8/8).**
The `none` candidate is plain DAEDALUS itself, so `M_GRAMMA ≤ M_DAEDALUS` holds by construction; the measurement confirms it.

One-chat artifact for external decoding: `bench/z44/receipts/onechat-gh-api.message.txt` (message) and
`bench/z44/receipts/onechat-gh-api.expected.txt` (the exact bytes it must produce).

---

## 2. Mechanism (and how it differs from everything already in the stack)

Every codec in this repository pays for **redundancy**: a repeated string is hoisted into a table and referenced
by a glyph. This turn's first measurement shows that lever is exhausted **at the wire level**:

* `bench/z44/lit.ts` computed the ceiling for marker-based literal compaction (ISO datetimes, dates, times, UUIDs,
  hex runs, thousands separators, URL schemes, dotted quads). On `holdout/gh-api.json.txt` the raw-text ceiling is
  **77 tokens (3.06%)** — 53 `https://` hits alone. On the DAEDALUS wire the same eight classes are worth
  **4 tokens total**, because the dictionary has already absorbed them (3 of 53 remain literal). Same on
  `package-lock-head.json`: raw ceiling 2, wire ceiling **2**. Same on prose: 1 and 3.
  *Repetition is spent; any codec built on replacing repeated strings with symbols is measuring DAEDALUS's leftovers.*

What is not redundant, and therefore survives every dictionary codec, is **layout**. Indentation and line breaks
are not repeated content — they are *derivable* content. `JSON.stringify(v, null, 1..4)` output is a deterministic
function of the value it prints; the indentation of a bracket-nested file is a deterministic function of bracket
depth **for the machine-formatted subset**. GRAMMA ships the text in the cheap notation and makes the *reader*
regenerate the expensive notation from its own knowledge of the convention. The dictionary is the model's prior
over formatting, and it costs one sentence per message instead of one glyph per occurrence.

Dialect menu (`GRAMMA_DIALECTS`), each a verified `canon`/`expand` pair:

| id | canon | expand | clause |
|---|---|---|---|
| `json1/2/4/tab` | string-aware whitespace-only minify | `JSON.stringify(v,null,N)` layout, empty containers inline | 16 tok |
| `indent1s/2s/4s/tabs` | every content line loses all leading whitespace | re-indent by bracket depth, closers one level out, `*` continuation one space past depth | 24 tok |
| `indent1/2/4/tab` | strip a line's leading whitespace **only when it equals the depth prediction** | indent only flush-left lines; already-indented lines stand | 32 tok |

The third family is the useful invention: **self-marking prefix elision**. A line still starting with whitespace
was not predicted and is already correct, a flush-left line gets the prediction — the two cases cannot be confused,
so no side channel and no exception list is needed. Measured effect: full depth re-indentation of
`train/dts0.txt` (414 lines, JSDoc/Prettier style) differs on 270 lines and would be rejected outright; the
self-marking rule keeps exactly those lines and still strips 387 raw tokens. `strictOf` makes the extra coverage
free: when a strict variant verifies, the keeping variant (longer clause, canon a subset) is skipped.

**Honest novelty statement.** The *principle* — regenerate layout from a rule instead of shipping it — is already in
this repo: `src/lib/omega/wrapcanon.ts` (hard-wrapped prose) and the registered `stichos` (verse-line refill) apply
it to prose, with wrapcanon recording a −4.1…−7.2% upside on hard-wrapped Linux/git docs. GRAMMA is that principle
applied to *machine-formatted* text, generalised to a menu, and scored by the one-chat metric instead of by prose
assumption. It is not a claim to have invented layout regeneration.

---

## 3. Process contract

**A. Formal model.**
*Objects.* Source `x ∈ Σ*` (arbitrary Unicode text). Codec = menu `D = {none} ∪ {json1..4, indent1s…indenttab}`;
each `d` carries `canon_d : Σ* → Σ*`, `expand_d : Σ* → Σ*`, and a clause `c_d` (one line of English).
*Access model.* The decoder receives exactly one message containing `c_d` followed by the inner DAEDALUS wire, and
the DAEDALUS contract it already carries. No system prompt, no skills file, no tools, no prior turn, no example.
*Resource.* `M(x,d) = tokens(c_d ‖ C_d(canon_d(x)))` in `o200k_base`, where `C_d` is the inner codec's one-chat
message. `tokens(·)` is this repo's tiktoken-equivalent counter (`src/lib/omega/bpe.ts`).
*Quantifier order.* Encoder first, decoder second, file third: `∀x ∀d` admitted by the encoder,
`expand_d(inner_decode(wire)) = x` **byte-for-byte**. Admissibility is decided on the text, not on the metric.
*Regime / tolerances.* Byte-exact, zero tolerance. Ties allowed. A win requires `M_GRAMMA < M_DAEDALUS`.
*Adjacent-problem exclusions.* Not token-id entropy coding, not lossy summarisation, not a different tokenizer, not a
shared dictionary smuggled into a system prompt, not a benefit only reachable when the encoder and decoder are the
same program (the clause is prose and the inner wire is CHIRON, whose three-reader gate already governs it).

**B. Outcome space, threshold declared before the final run.** `H+`: ≥3 files with `M` strictly lower by ≥8 tokens,
`exact=true` everywhere, and **no file worse**. `H−`: no dialect verifies on any file. `H∂`: wins exist but the
clause tax eats them (net ≤ 0 on every file). Result: **H+** — 6/8 wins, max −62, 0 worse.

**C. Frontier, restated.** DAEDALUS-D/A10 are dictionary+repeat portfolios: raw 476,944 → 305,352 over 151 files, and
`bench/z37` showed VERITAS-M is exact but +9.5% off that frontier. GRAMMA's hypotheses: (i) repetition-room is gone
(dictionary codecs have absorbed it) — supported by `lit.ts`; (ii) layout-room survives *because* no dictionary can
absorb a string that appears once per line and never repeats; (iii) a reader can regenerate that string for free
when the convention is machine-known; (iv) the clause is the tax that decides which files can pay.

**D. Negative space — 17 result shapes that would be false here, each with its refuting test.**
1. "Literal compaction saves 3%" — test: `lit.ts --dae`; raw 77 → wire 4. Refuted.
2. "Raw-token gains transfer to the wire" — test: compare `sweep.ts` (raw) with `lit.ts --dae` (wire). Refuted.
3. "Wire-only counts are admissible" — test: `codec-eval.ts` emits `oneChat=null` instead of falling back. Refuted by construction.
4. "Remove spaces and win" — test: `sweep.ts sentNoSpace` = **+5,960 tokens (+6.31%)**, worse on all 18 files. Independently corroborated by the DEV "tokens-per-byte trap" article (search result, §6). Refuted.
5. "Prune unprofitable rules" — test: `audit2.ts`; recoverable headroom ≈52 tokens on a 13,106-token source, ≈6 on 843. Not codec-sized. Refuted.
6. "Reuse words/sub-words" — test: `words.ts`; identical excess is dominated by once-used words (509 repeat vs 1,982 singleton on linux-coding-style). Refuted.
7. "Newline-join is free" — test: `layout.ts` V7 (all whitespace → newline) is negative on every file (+14…+229). Refuted.
8. "The clause can be ignored" — test: charge it inside `M` (`gramma-prompt.mjs.ts` re-derives `oneChat` from the emitted message; 1091 = 1091). Refuted as a method.
9. "Sum of per-part deltas equals the total" — test: `audit2.ts` Σgain 6,117 vs realised 5,277. Rank only.
10. "Identity fallback is a win" — test: `none` is DAEDALUS, which itself falls back to raw, so `M` never exceeds `tokens(x)`.
11. "Row-count/byte-length is a proxy" — test: `bench/z34` receipts: `bytes` is file size, not tokens.
12. "My decoder is the reader" — test: the claim is downgraded to "library path machine-verified"; the LLM path is unverified here (§5).
13. "A dialect that nearly verifies can be rounded up" — test: `dbg.ts` difflines: `indent4s` on dts0 = 270, `indent2` on code-ts = 3. Rejected outright rather than patched.
14. "Tab/space and 2/4-space layouts are the same dialect" — test: `dbg.ts`; gh-api is 1-space (`JSON.stringify(v,null,1)`), which the 2/4 menu missed entirely until `json1` was added.
15. "Bigger file ⇒ bigger relative gain" — test: package-lock (−1.09%) vs react-latest (−3.17%); the gain tracks *layout surplus per token*, not size.
16. "STICHOS already covers this lane" — test: STICHOS is worse than DAEDALUS on all 8 files (14,549 vs 13,977) and better only on the 5 prose/ops files that GRAMMA ties on.
17. "Registering a codec is evidence" — test: every number here comes from `codec-eval.ts` rows in `bench/z44/receipts/`, not from the registry.

**E. Mechanism-distinct approaches tried, with artifacts and falsification tests.**
(i) literal compaction with 1-token markers — `lit.ts`, falsified on the wire. (ii) rule pruning — `audit2.ts`, ≈52 tok. (iii) word/sub-word reuse — `words.ts`, falsified. (iv) space deletion — `sweep.ts`, falsified (+6.31%). (v) notational transposition family (idSplit/pathElide/urlElide/isoBasic/entities/numThin/mdLink) — `sweep.ts` raw upside 5.9% collapsing to noise on the wire via `lit.ts`. (vi) whitespace→newline re-notation — `layout.ts` V7, falsified. (vii) layout elision strict (V1/V8/V6-class) — `layout.ts`, survives (−7…−76 messageTokens). (viii) **GRAMMA dialect menu** — built, H+. (ix) prose re-wrapping — deliberately *not* re-implemented: `wrapcanon.ts`/`stichos` already own it.

**F. Artifacts (not status reports).** `bench/z44/{lit,dissect,attrib,words,audit2,rules,sweep,layout,dbg,gramma,gramma-prompt.mjs}.ts`,
`bench/z44/receipts/{codec-eval-gramma.jsonl, gramma-set.jsonl, gramma-set2.jsonl, gramma-smoke.jsonl, onechat-gh-api.message.txt, onechat-gh-api.expected.txt}`,
`src/lib/omega/gramma.ts` + registry entry.

**G. Second-order adversary, per candidate.** *Clause under-charge*: defeated by measuring `tokens(clause ‖ inner message)` and re-deriving it from the emitted artifact. *Boundary merge*: the clause is measured inside the concatenation, so a merge that helps or hurts is already priced. *Reader mis-execution*: the largest real risk — mitigated by phrasing both dialects in terms of a deterministic library call and a local, self-marking rule, and **not** claimed as verified (§5). *Left-deviation files*: an escape-marker design was costed (a marker line for flush-left-at-depth lines) and is what `code-ts.txt` (3 such lines) would need; the +8–10 clause tokens made it net-negative on the available files, so it was **not** shipped — code-ts ties. *Raw-mode inner*: when the inner codec takes the raw path, `c_d ‖ x` is emitted, so `none` must be checked to be no worse than identity — it is, and `codec-eval` confirms.

**H. External verification.** Preferred where it exists: `grammaDecode` (library) is checked on every run; the CHIRON
three-reader gate (library / prose reader / CPython reader) governs the inner wire, which GRAMMA reuses unchanged.
An LLM decode was **not** executed: this sandbox has no LLM credentials and outbound network is restricted to
github/npm/pypi. The claim is therefore downgraded to *"byte-exact under the library reader; the reader-facing
clause is faithful by construction and unverified in practice"*, and `onechat-gh-api.message.txt` is emitted so the
user can run it against the real decoder of record.

**I. Repaired candidates re-gated.** Three defects were found *by these gates* and fixed, with every affected
number re-measured afterwards, not before: (1) the block-comment one-space convention was dropped in a rewrite,
which cost dts0 (270 mismatching lines) — restored, dts0 then wins −19; (2) the 1-space JSON family was absent, so
gh-api registered as a tie — added, gh-api then wins −62 (the largest single win of the turn); (3) the clause was
35 tokens, halving every small-file win — rewritten to 16/24/32.

**J. Where it stops, and the next highest-information test.** The binding constraint is the **clause tax**: 16–32
tokens, against layout surpluses of 10–500 tokens per file, so GRAMMA only pays where the surplus is ≫ the tax.
Exact gap: files whose indentation deviates *leftward* from the depth prediction (code-ts: 3 lines) cannot be
expressed without an escape, and the escape's own clause cost made it net-negative at this file size. Next test,
highest information per minute: run the dialect menu over a large population of machine-formatted files (lockfiles,
registry JSON, generated code, CI JSON) where the tax is < 0.5% of `M`, and separately try folding the dialect
instruction into CHIRON's existing contract sentence so a dialect can be declared in ~6 tokens instead of 16–32.
A 6-token declaration would turn today's ties (json-pkg −7 surplus, code-ts −40 surplus) into wins.

---

## 4. Fresh external sources consulted this turn (search snippets, not full-text reads)

* **GCF "Tokenizer Analysis"** (gcformat.com/guide/tokenizer-analysis) — a grammar-header wire format claiming 49–72%
  fewer tokens than pretty-printed JSON across 43 tokenizers, plus the claim that merge-barrier design *improves*
  structured-data comprehension. Supports the layout/notation thesis and warns that byte count alone is the wrong score.
* **"Structure-Aware Tokenization for JSON"** (making-minds.ai/papers/json-tokenizer.pdf) — lossless JSON tokenizer,
  5–15% savings on schema-repetitive JSON, 90× smaller vocabulary; prose-heavy JSON loses. Confirms that the surplus
  is structural, and that a *different tokenizer* is not available to us.
* **DEV "The tokens-per-byte trap"** — deleting 25% of non-whitespace characters raised prompt tokens 23–66% in an
  agent A/B. Independent corroboration of this repo's own `sentNoSpace` refutation.
* **TOON vs JSON** (tensorlake.ai) — 39.6% fewer tokens than pretty JSON, 73.9% vs 69.7% accuracy. Notation affects
  both cost and accuracy.
* **LTSC / meta-tokens** (arXiv 2506.00307 via pith.science) and **SuperBPE** — dictionary-of-token-subsequences and
  superword tokenizers: both are repetition levers, i.e. the exhausted class.

No paper fetch this turn; all of the above were search-result content. The OpenAI `ten-proofs` review (analysis only,
no Lean toolchain present) carries over from the previous turn: nothing in it bounds byte-exact dictionary coding.

## 5. Runtime honesty

* Actually used: `node` 22 + `esbuild` 0.28.2 bundling (`bench/z44/build.sh`), `src/lib/omega/bpe.ts` (gpt-tokenizer
  o200k/cl100k), `OMEGA_DET=1` deterministic deadlines, `gh pr diff --name-only` (file lists only), two web searches.
* Not used, not available, not claimed: no LLM/agent was invoked to decode anything; no CPython reader was extended
  for the dialect layer; no Lean/Coq/Z3/prover, no simulator, no corpus-wide (151-file) GRAMMA sweep; the 12 open PRs
  were listed by changed file only — their bodies were **not** read this turn, so no code was copied from them.
* Numbers reported are the ones in the receipts; where a measurement covers 8–13 files, that is the whole claim.
