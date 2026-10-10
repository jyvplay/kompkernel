# STICHOS — the verse-line fold (hard-wrapped layout as a codec lane)

Research + artifact record for `src/lib/omega/stichos.ts`, `bench/stichos-bench.ts`,
`bench/stichos-metatron-bench.ts`, registry keys `stichos` and `stichos-metatron`.
Branch `arena/da2b9818-kompkernel`.

---

## 0. RUNTIME HONESTY — what actually ran

**Used and produced numbers in this turn:** Node v22 + esbuild (bundling), `tsc --noEmit`
(TypeScript 5.9.3, exit 0 after every edit), the repo's own `bpe.ts` `countTokens` with
`o200k_base` (live `gpt-tokenizer`, not an estimate), `chironEncode` (CHIRON),
`metatronEncode` / `metatronDecode` (METATRON, episteme arm observed), `git`, `npm install`
(to make `gpt-tokenizer` resolvable), `web_search`, `fetch_page`, GitHub REST API
(`api.github.com`) for byte-exact file contents, background processes for long benches.

**Not available and therefore never claimed:** any LLM or chat model (nothing in this
sandbox reads a wire), a Lean toolchain (no proof was machine-checked here), any parallel
agent. **No experiment in this report has a language model in the loop.** Every
"verification" is a program agreeing with another program, and the decode check is
the only exactness evidence.

**Not done:** a full registry tournament rerun (METATRON alone takes 1–5 minutes per
36 KB document, so the full 80-codec leaderboard was not rerun). Numbers below compare
STICHOS against the incumbents named explicitly in each table, not against the whole
tournament.

---

## 1. FORMAL MODEL

- **Object.** `text: string` (UTF-8). Codec `E: text → wire`, `D: wire → text`, total.
- **Contract.** `STICHOS_CONTRACT` (42 o200k tokens) travels in-band with the wire.
- **Resource.** `M = |wire|_tok + |contract|_tok` (for the CHIRON/METATRON stacks the
  inner codec's own prompt is inside its message count, so it is not double-billed).
- **Success.** `∀ text: D(E(text)) = text` **and** `∃` a lane where `M_STICHOS + 3 < M_incumbent`
  (repo's "> few" threshold). Exactness is enforced at encode time: every non-raw
  winner must pass `stichosStackDecode(wire) === text` (or `stichosMetatronDecode`).
- **Parameters.** Width `W ∈ [20, 9999]`, mark `M` from `¦ ◆ ⧫ ◊ ⁋ ⟂` (first one absent from
  the text; none of CHIRON's operators `§ ¶ × …`), CRLF and tab texts are rejected.
- **Adjacent problems not substituted.** Optimal line breaking (Knuth–Plass 1981) —
  STICHOS only *recovers* a greedy layout, it does not choose W or optimise breaks. Lossy
  re-wrap is excluded by `D(E(x)) = x`. Markdown/list/code layout belongs to other codecs.

## 2. OUTCOME SPACE

- **H⁺ (achieved, narrow):** on greedy-wrapped documents with substantial wrapping,
  STICHOS∘{CHIRON, METATRON} is strictly below the incumbent by > few tokens (Section 4).
- **H⁻ (falsified):** STICHOS as a *general* prose/ops gain. On unwrapped prose and
  code it never wins; its 42-token contract is a fixed tax that wrapped-newline savings
  (≈1 token per interior newline) do not cover unless ~50+ paragraphs are wrapped.
- **H∂ (boundary):** documents with 5–50 wrapped blocks: sign of Δ depends on the inner
  codec and on the contract tax. Measured in Section 4 (losses listed, not hidden).

## 3. HOW THE CODEC WORKS

Wire: `STICHOS\n<W>\n<M>\n<block>\n\n<block>…`

- Blocks are the text split at `\n\n`.
- A block that is exactly the greedy fill of its own words at `W` becomes `M + joined`.
- Every other block is emitted **byte-identical**.

Decoder: split the body at `\n\n`; blocks starting with `M` are refilled greedily at `W`;
all others are returned unchanged.

Width lemma (used by the encoder, and checked by decode): if the true width is `W`, every
line is ≤ `W`, and each break happened because `line + " " + word > W`. So refilling at
`max(line lengths of the block)` makes the same breaks whenever that max is ≤ `W`. The
encoder picks the candidate width that explains the most blocks.

Arms (the codec is a minimum over a set containing identity):
`raw` · `CHIRON alone` · `STICHOS` · `STICHOS→CHIRON` (`stichosEncode`), and
`raw` · `STICHOS` · `STICHOS→METATRON` (`stichosMetatronEncode`).

Every non-raw winner passes a final decode gate; a failure silently becomes `raw`
(never a false claim).

## 4. RESULTS (all numbers measured in this checkout, o200k_base)

### 4.1 Self-test (`stichosSelfTest`, 9 cases)
All 9 PASS. Exactness cases: empty, single line, ragged (non-greedy), CRLF, tabs, long
single line, mark glyph present. Winning case: 30 non-repetitive greedy-wrapped
paragraphs (LCG vocabulary) → `stichos-chiron`, M = 2187 vs raw 3231 (CHIRON alone is
larger, since the arm is a minimum). Repetitive synthetic text was rejected as a test
because CHIRON dominates it (`chiron` winner, M 164) — that is a design fix, recorded here.

### 4.2 CHIRON-incumbent bench (`bench/stichos-bench.ts`, 596 real files, distinct by path)
Corpus: repo holdouts + every `*.md|*.txt|LICENSE*` under `node_modules` in 400–12000 bytes.
- Files where the minimum was not identity: 239. Of these, 235 were CHIRON-alone (no STICHOS arm helped) and 4 were STICHOS→CHIRON.
- Strict wins vs CHIRON-alone (M+3 < CHIRON): **4 — the same Apache LICENSE file at four
  paths** (`sharp/LICENSE`, `@img/sharp-linux-x64/LICENSE`, `…linuxmusl-x64…`, `…wasm32…`):
  1887 → 1842 (**−45 each, −2.4%**), exact.
- Totals over the applicable set: incumbent 251 642 → STICHOS-family 251 462 (−180, all from
  the four copies).
- Count of distinct documents behind the win: **1**.

### 4.3 METATRON-incumbent bench (`bench/stichos-metatron-bench.ts`, 30 of 30 completed)
Selection rule (printed by the script): distinct files (identical copies collapsed) whose
greedy layout explains ≥ 5 wrapped blocks. METATRON is slow (up to ~5 min per file), so
only these 30 are measured. Every row is an exact decode.

- **Strict wins vs METATRON-alone (Δ < −3): 2 of 30.**
  - `sharp/LICENSE` (Apache-2.0): 1835 → **1779** (−56)
  - `js-tokens/README.md`: 1640 → **1621** (−19)
- **Losses: 28 of 30**, by +22 to +75 tokens. The loss is the 42-token contract plus the
  mark prefixes, not a decode problem. Full per-file table is in `bench/tmp/stichos-metatron-bench.out`.
- **Set totals:** raw 52 601, METATRON 36 989, STICHOS∘METATRON 38 451 → **Δ = +1 462 (+3.95%)**.
  On this set the arm is a net loss. It is only worth keeping as a minimum arm, because
  the registry takes the minimum across codecs.

Representative rows (raw / METATRON / STICHOS∘METATRON / Δ):

| file | raw | METATRON | STICHOS∘METATRON | Δ |
|---|---:|---:|---:|---:|
| sharp/LICENSE (Apache-2.0) | 2082 | 1835 | **1779** | **−56** |
| js-tokens/README.md | 1792 | 1640 | **1621** | **−19** |
| @img/colour/LICENSE.md | 919 | 388 | 410 | +22 |
| json5/README.md | 2669 | 2361 | 2396 | +35 |
| next docs `unauthorized.md` | 2475 | 1412 | 1485 | +73 |
| next docs `use-pathname.md` | 1687 | 1215 | 1290 | +75 |
| next/compiled browserify-zlib/LICENSE | 718 | 383 | 453 | +70 |

Reading: STICHOS∘METATRON wins on **2 distinct documents out of 30** here, and the GPL-3.0
text (Section 4.4) is a third win from outside this selection.

### 4.4 Second corpus: GNU GPL-3.0 (byte-exact from the GitHub API, not the web fetch tool)
Source: `github/choosealicense.com` `_licenses/gpl-3.0.txt` (36 408 bytes, includes YAML
front matter). Layout: W = 70, 48 wrapped blocks, 83 literal blocks.

| arm | M |
|---|---:|
| raw | 7737 |
| CHIRON alone | 6673 |
| STICHOS family (best of raw/CHIRON/STICHOS/STICHOS→CHIRON) | 6546 (STICHOS→CHIRON, −127 vs CHIRON) |
| METATRON alone | 6404 |
| **STICHOS→METATRON** | **6227** (−177 vs METATRON, −19.5% vs raw) |

All exact. Caveat: METATRON carries a codebook that includes license phrases (e.g.
`'Permission is hereby granted'`, `'Apache License, Version 2.0'` in `metatron.ts`), so
part of the license-lane gain may be codebook knowledge rather than reflow alone. The
reflow is what changes between the two arms, so the −177 is the layer's contribution on
top of that codebook.

### 4.5 Registry
`stichos` (CHIRON-inner) and `stichos-metatron` (METATRON-inner) are registered in
`src/lib/omega/registry.ts`. `tsc --noEmit` passes.

---

## 5. NEGATIVE SPACE (look-alikes that failed, with receipts)

1. **Most-common non-final line length as W.** Gave 0 applicable files on 714. The
   greedy rule needs W = max line length (proof in Section 3).
2. **Per-newline mark inside verbatim blocks.** sharp: 2180 > raw 2082. The mark `⟂`
   costs 3 o200k tokens, and `\n` + indent tokens inside code/lists get broken.
3. **Literal blocks left unescaped.** Fixed by keeping them byte-identical.
4. **Mark `§`.** Collides with CHIRON's start glyph; excluded.
5. **85-token contract.** sharp M = 2180 vs raw 2082 (loss). Shortened to 42 with
   the same rules.
6. **Single-layer STICHOS vs CHIRON on the 152 non-sharp applicable files.** Loses by
   50–75 tokens each: the contract tax exceeds the interior-newline savings. (Measured with
   the earlier 58-token contract; the minimum over arms now prevents this loss.)
7. **Title block poisons the whole doc.** Apache's unwrapped title made the first version
   return null for the entire 2 KB license. Fixed by per-block literal fallback.
8. **Single long line > W.** Would be refilled wrongly; rejected by construction.
9. **CRLF and tabs.** Rejected (encoder returns raw; the holdout `license.txt` is CRLF
   with unwrapped paragraphs, so it is *not* a reflow lane, and this codec correctly
   declines it).
10. **MIT lic-mit reflow.** `joinMidWord` reaches 207 vs raw 223, but the contract alone
    costs more than the 16-token gap, so it is not a codec win.
11. **Cross-lingual glyph deck (19 DE/ES/FR/IT contraction pairs, 1-token glyph vs
    2-token English gloss).** Net on repo holdouts: gh-prose +6, kb-article +1,
    readme −14, meeting −20, email −24, llm-answer −25. Only the English Apache text is
    positive (+49), and that is English "of the" ×14, not a cross-lingual effect. Rejected.
12. **Repetitive synthetic prose as a win test.** CHIRON dominates it. Replaced with
    non-repetitive text (Section 4.1).
13. **STICHOS∘METATRON on READMEs and docs.** Loses by +22…+75 tokens on 28 of 30
    layout-rich files (set total +1 462). Kept as a minimum arm, not as a claim.
14. **CHIRON-inner on non-wrapped text.** Adds the contract tax with no reflow gain;
    the CHIRON-alone arm is therefore included in the minimum so the codec can never
    be worse than CHIRON within its own set.
15. **Modal shortcut** ("greedy wrapping is always recoverable"): fails on ragged,
    CRLF, and title/list blocks (items 2, 7, 9). Detected by the encode-time decode
    check, which returns raw rather than a wrong wire.

**Correction to the earlier ORACLE claim (Y9).** ORACLE's bibliography exactness does not
come from the model: `ORACLE_MAP` is a hardcoded table in `oracle.ts`, and decode is
exact because the code holds the citations. The "expand bentley93 via training" step is a
readability *hypothesis*, not a verified property. It is not tested here.

---

## 6. ARTIFACT / VERIFICATION GATES

| gate | status |
|---|---|
| `tsc --noEmit` | PASS (exit 0) |
| self-test (9 cases) | 9/9 PASS |
| exact decode on every emitted wire (encode-time gate) | PASS (0 failures in 596-file CHIRON bench, 30-file METATRON bench, and the GPL-3 probe) |
| registry entries compile | PASS |
| wins vs incumbent | CHIRON: 4 copies of 1 doc (−45 each). METATRON: 3 distinct docs (sharp −56, js-tokens −19, GPL-3 −177); 28 of 30 layout-rich files lose (+22…+75) |
| LLM reads the wire in one chat turn | **NOT VERIFIED. No model in this sandbox.** |
| full 80-codec tournament rerun | **NOT RUN** (too slow in this session) |

---

## 7. FRONTIER AND SEARCH (new sources this turn)

Web searches and fetches (new terms and sites; earlier codecs cite some of these, noted):

- arXiv 2510.08102 / ICLR 2026 "Lossless Vocabulary Reduction for Auto-Regressive Language
  Models" (mlanthology.org, papernotes.org): nested tokenization, exact sub-vocabulary
  reduction. Not used by any codec; relevant as a *model-side* idea only (out of contract).
- ACL 2025 "Cross-Lingual Generalization and Compression: From Language-Specific to Shared
  Neurons" (aclanthology.org/2025.acl-long.661): neuron-level cross-lingual alignment.
  Out of contract (needs model internals).
- arXiv 2508.04796 Parity-aware BPE: already cited by METATRON; reconfirmed.
- LTSC (2506.00307, via pith.science review) and arXiv 2604.13066 (dictionary encoding):
  already cited by CHIRON/ORACLE; the pith review flags an unresolved pseudocode ambiguity
  in LTSC Algorithm 2, which we did not re-verify.
- `github.com/openai/math` via GitHub API: `CONTENTS.md` (719 manuscripts, 372 result
  families). News coverage read: unite.ai, shattered.io, splitfeed.ai, tech-insider.org.
- GitHub API: `github/choosealicense.com` GPL-3.0 text (byte-exact), `sharp` and
  `next` docs (node_modules).

**What was NOT done:** the 372-result triage is keyword-level only (47 abstracts read).
No Lean proof was checked by this agent. Abstract-level relevance, none of which yields
a measured codec gain here:

- #128 factor-two shortest common superstring (overlap-merge idea): a dictionary-free
  overlap merge is in the same family as CHIRON's copy arm; no gain measured, not built.
- #120 / #121 almost-linear exact matching and edit-distance approximation: a possible
  speed lane for diff-like inputs; no speed measured here.
- #134 generalized star height, #142 deterministic factorisation over F_p, #109/#130
  fast integer multiplication and Fourier transforms, #122 trace reconstruction: no
  path to a token-cost gain under this contract.

The question "are there isomorphic/orthogonal ideas we have not explored" gets this
honest answer: the reflow lane was unexplored in this stack and is real but narrow;
the cross-lingual glyph deck and the superstring analogy were measured and are not gains.

---

## 8. VERDICT

- **Repo change:** new codec `STICHOS` (plus two stacked registry arms), decode-verified
  on every emitted wire.
- **Honest gain:** narrow Pareto point on *greedy-wrapped* documents, measured against
  named incumbents: −177 vs METATRON on the GPL-3.0 text (−2.8%), −56 on the Apache
  LICENSE, −19 on js-tokens README; −45 vs CHIRON on the Apache LICENSE (four copies, one
  document).
- **Not a general prose or ops gain.** On the 30 layout-rich METATRON-set files the arm
  is +1 462 tokens (+3.95%) in total and wins on 2 files. On the unwrapped repo holdouts it
  is a no-op (CHIRON arm wins, or raw).
- **Not LLM-verified.** The decoder prompt is 42 tokens; whether a chat model reproduces
  the refill exactly from it is untested.

**Next highest-information test:** put one wire (the GPL-3.0 STICHOS∘METATRON wire, ~6.2 k
tokens) in a single chat message with its contract, and diff the model's output against
the original text. That is the only test that could downgrade the readability claim
further or confirm it. Second: widen the wrapped corpus to RFC-style text from GitHub
mirrors (wrapped at 72), which is the largest real class of hard-wrapped plain text.
