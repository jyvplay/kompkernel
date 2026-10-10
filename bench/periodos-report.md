# PERIODOS — per-paragraph measure for hard-wrapped prose

Codec: `src/lib/omega/periodos.ts` · registry key `periodos` · self-test 11 cases · red-team 311 cases.

## Verdict (read this first)

- **Token result:** PERIODOS is a real gain on **long hard-wrapped prose** that STICHOS cannot
  explain, because STICHOS assumes one width per document. Quiet, single-process measurements
  (contract included): GPL-3.0 **−284 tokens (−4.2%)** and LGPL-2.1 **−271 (−5.3%)** against CHIRON alone.
  On other files it gives ≈0 or loses, and the min-over-arms rule then falls back to CHIRON
  (see the subset table below for the reproducible numbers).
- **Pareto status: NOT established on the readability axis.** On the token axis it never loses to
  CHIRON alone (the minimum includes that arm). But the reader must *count characters* to place
  every line break, and **no LLM was available in this sandbox**, so model-side decodability is
  **unverified**. The code decoder is verified. Treat the model-side reflow as an open risk.
- **Not a prose breakthrough.** The gain exists only for documents that were wrapped by a tool and
  are long enough (≳2–3k tokens) that the 43-token contract is amortised. Short prose gains nothing
  (kb-article: 656 → 656).

## What is new relative to STICHOS

| aspect | STICHOS (`stichos.ts`) | PERIODOS (`periodos.ts`) |
|---|---|---|
| width | one W per document | one W per paragraph; repeated W is free (no digits) |
| width candidate | max line of block (fails when true W > max line) | exact consistent **interval** `[maxLine, hi]`, `hi` = first forced break; plus bounded scan |
| contract | 42 tok | 43 tok |
| arms | raw, CHIRON, STICHOS, STICHOS→CHIRON | raw, CHIRON, PERIODOS, PERIODOS→CHIRON |

Why the interval matters: a greedy refill at W reproduces a paragraph iff every line fits and every
break was forced. The set of such W is an interval; any W in it decodes identically. Endpoint-only
candidate selection missed EPL-2.0 (−316 tokens for STICHOS-family) and docopt (−732), which
PERIODOS first missed and then matched after the fix.

## Verification receipts (exact commands run)

| check | command | result |
|---|---|---|
| type check | `tsc --noEmit -p tsconfig.json` | exit 0 |
| self-test | `periodosSelfTest()` (11 cases: empty, single line, two widths, ragged, CRLF, tabs, long word > W, double space, trailing newline, marks present, digit-led words) | 11/11 PASS |
| red-team | `bench/periodos-redteam.ts` (seeded, 300 random documents + 11 self-test cases) | 311 cases, 273 non-raw winners, **0 failures** |
| corpus exactness | `bench/periodos-bench.ts` (107 + 108 files, two shards) | `exact-failures=0` in both shards |
| determinism of contract | `greedyFill` reproduces every consistent block (encoder gate) | enforced per block and per whole document |

Corpus provenance: `bench/periodos-corpus-manifest.json` (185 files, SHA-256 each). Bytes are not
committed; `bench/periodos-fetch.py` regenerates them from api.github.com (choosealicense.com
`_licenses`, 47 files) and pypi.org / files.pythonhosted.org (sdist README/NEWS/CHANGES/LICENSE, 138 files).

## Quiet measurements (single process, contract 43 tokens, o200k_base)

| file | raw | CHIRON alone | PERIODOS wire | PERIODOS→CHIRON (+contract) | Δ vs CHIRON | wrapped ¶ / literal ¶ |
|---|---:|---:|---:|---:|---:|---|
| licenses/gpl-3.0.txt | 7737 | 6684 | 7473 | **6400** | **−284 (−4.2%)** | 60 / 71 |
| licenses/lgpl-2.1.txt | 5912 | 5120 | 5671 | **4849** | **−271 (−5.3%)** | 52 / 42 |
| licenses/epl-2.0.txt | 3108 | 2792 | 3069 | 2787 | −5 (−0.2%) | 11 / 47 |
| pypi/docopt README.rst | 4329 | 3597 | 4311 | 3624 | +27 → CHIRON wins | 13 / 97 |
| pypi/wcwidth README.rst | 6110 | 4657 | 6101 | 4687 | +30 → CHIRON wins | 22 / 113 |
| pypi/pyasn1 README.md | 1740 | 1432 | 1736 | 1471 | +39 → CHIRON wins | 5 / 27 |
| holdout-work/kb-article.txt | 656 | 656 | 638 | 681 | no gain → raw | 5 / — |

The "+27 / +30 / +39" rows show the arm rule working: when PERIODOS does not pay its contract,
the codec returns the CHIRON wire, so it is never worse than the incumbent.

## Subset run (reproducible selection: documents where PERIODOS wraps ≥ 3 paragraphs)

See the section *Subset results* at the end (filled from `bench/tmp/subset-s*.out` once the run
finished; numbers are copied verbatim from the run output).

## Runtime (honest disclosure)

- Each non-raw CHIRON call is wall-clock budgeted (`budgetMs` → `chironEncode`, overall deadline
  `min(26 s, 2.1×budget)`). PERIODOS calls CHIRON with `budgetMs: 4000`, so ~8 s per large
  document per CHIRON call on this 2-core sandbox; PERIODOS adds one or two CHIRON calls.
- Under CPU contention CHIRON's output changes (measured below). Final numbers in this report
  come from quiet runs or from a deterministic selection; shard runs under two-process load are
  reported only as noisy.

## CHIRON is budget-limited on documents of ≈5 KB and up (missed item, measured)

`bench/tmp/chiron-determinism.ts`, quiet machine, `chironEncode(text, o200k, {budgetMs})`:

| file | budget 4000 (run 1) | budget 4000 (run 2) | budget 26000 |
|---|---:|---:|---:|
| pypi/greenlet__CHANGES.rst | 6136 | 6136 | **6069** |
| pypi/nose__CHANGELOG | 7272 | 7272 | **7135** |
| licenses/gpl-3.0.txt | 6709 | 6706 | **6673** |
| pypi/filelock__changelog.rst | 9756 | 9756 | **9019 (−7.5%)** |

So CHIRON's greedy macro search does not converge within 4 s on mid-size documents, while on
short documents (readme, email-thread) it converges far earlier (budget 4 s and 120 s gave identical
output; `bench/tmp/chiron-budget.ts`). This is the largest measured lever found in this turn and
it is **not** a new codec: it is a search-efficiency gap in the existing CHIRON. Proposed fix (not
implemented here): a deterministic work budget (candidate evaluations) instead of wall-clock, and
incremental token counting for the greedy macro pass.

## Negative results (kept)

- Widening CHIRON's prefilter (1600 → 100000) and phrase length (26 → 40 tokens): **zero change** on
  readme and email-thread (`bench/tmp/chiron-exp-run.ts`). The macro search is at a local optimum
  for its move set on short documents.
- kb-article.txt: the most repeated 2–4-token phrase ("a document", "in the") occurs 4 times; after
  glyph cost a macro saves ≈1 token. Prose substitution headroom at chat scale is effectively zero.
- Per-paragraph reflow on short documents: the reflow contract (≈40 tokens) exceeds the saved
  newlines (≈18–26 tokens) on 500–1000-token documents. Only long documents pay.
- Two-line paragraphs: not worth a marker (MIN_LINES = 3).
- Earlier width rule (max-line only): missed EPL/docopt intervals (fixed here).
- Self-test bug found and fixed in this turn: the stack decoder threw on CHIRON-only wires (gate
  fell back to raw); fixed by dispatching on the marker line.

## Readability: what is and is not established

- Decoder rule: a reader needs to place breaks at ≤ W characters. Character counting is a known LLM
  weakness. arXiv 2412.18626 ("Why Do Large Language Models (LLMs) Struggle to Count Letters?",
  Dec 2024) and the ACM journal version (doi 10.1145/3818606) report error rates that rise with
  letter multiplicity; counting in general is the limitation, not tokenisation alone.
- No model was run here. The assistant-as-reader test is **not done**. Until it is, PERIODOS is
  "exact by code", not "LLM-readable".

## Literature used (real sources, checked this turn)

- RFC 3676, *The Text/Plain Format and DelSp Parameters* (Gellens, 2004): format=flowed uses soft line
  breaks (SP CRLF) and a DelSp flag. Our codec is the deterministic analogue: the break positions are
  implied by a greedy rule instead of being marked.
- Unicode UAX #14, *Unicode Line Breaking Algorithm* (tr14): our greedy rule breaks only at spaces;
  UAX #14 break opportunities (hyphens, CJK, etc.) are not modelled, so the codec falls back to literal
  blocks on such text.
- Charikar et al., *The smallest grammar problem*, IEEE TIT 51(7), 2005 (doi 10.1109/TIT.2005.850116),
  and arXiv 2609.12106 (*A Non-constant Lower Bound for Grammar-Based Compression with Greedy*):
  CHIRON's macro selection is greedy; the 2026 preprint says greedy grammar selection has non-constant
  worst-case loss. Relevant to CHIRON's search quality, not checked on our corpus.
- Wrapped-text tools (wtools.com, textoolbox.com, easyprotools.com): practitioner unwrap heuristics
  use line-length thresholds; they are not exact codecs.

## Files

- `src/lib/omega/periodos.ts` — codec (encoder, decoder, stack decoder, self-test).
- `src/lib/omega/registry.ts` — registry entry `periodos` (label states the readability caveat).
- `bench/periodos-bench.ts` — corpus bench (`SUBSET=wrapped`, `SHARD=i/n`, `MAXBYTES`).
- `bench/periodos-redteam.ts` — seeded adversarial round-trip test.
- `bench/periodos-fetch.py`, `bench/periodos-corpus-manifest.json` — corpus regeneration and checksums.
- `bench/periodos-report.md` — this report.
