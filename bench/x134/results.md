## X134 final measured results

Authoritative aggregate: `bench/x134/receipts/summary.json`.

### Frontier restatement

- 29 canonical lanes, raw **28,015**, shipped **11,962** tokens.
- Prior wired receipt: **11,961**. Only `bench/holdout-x41/ls-real.txt` differs,
  **413 -> 414**. The preliminary comparison of llm-answer against the condensed
  notes was misleading: the actual prior receipt already has 664, as does this
  run. Compare receipts, not recollection.
- Encoder `.decoded` attributes equal source on 29/29; this is an inherited
  attribute check, not 29 independent emitted-message reconstructions.
- Independent existing CPython CHIRON reader reconstructs source bytes on
  **19/29**. Ten require further parent decoding; this run does **not** certify
  their complete-message inversion. This is not evidence of ten corruptions.
- Wall time **1,191,329 ms**. Uncontrolled single run with some overlapping
  post-processing. No speed ratio against the old machine/run is claimed.

### Candidate table

| Experiment | Eligible/measured lanes | Aggregate token change versus frozen X133 | Interpretation |
|---|---:|---:|---|
| ALLOMORPH, full 29-lane fallback | 29 | **−2** | kb-article −1; ps-aux-real −1 |
| Glyph eviction + alias | 20 | −1 | same ps-aux-real gain, not additive |
| Context specialization | 20 | −5 | json-pkg −2, metrics.tsv −2, apt-real −1; related grammar induction |
| Escaped Latin alphabet | 25 | 0 after fallback | new header and escaping never paid |
| ALLOMORPH with existing VELTISTOS beam | 25 | −2 | same two gains; no further win |
| Full-carrier character reversal | 29 | +6,319 before fallback | rejected |
| ASCII case plane + positional restoration | 29 | +2,730 before fallback | rejected |
| Sorted lines + explicit inverse permutation | 29 | +1,000 before fallback | rejected |

The new codec's own final probe took **12,736 ms** over the 29 frozen outputs.
This is additional work, not an end-to-end stack speedup. The beam variant's
11,274 ms over eligible lanes is not claimed as a controlled stack comparison.
The various rows are alternative experiments; their deltas must not be summed.

Both ALLOMORPH accepted messages are stored in `accepted.jsonl`. The independent
Python reader confirms unchanged prefix, unchanged expanded layer, **and exact
UTF-8 source bytes for both winners**. The installed library tokenizer recounts
every accepted message independently of the optimized countTokens path.
Compiler: `tsc --noEmit`, exit 0. Adversarial unit suite: **34 cases**, including
three constructed positive witnesses. The witnesses are not corpus gains.

### Generalized local leaders, refreshed from emitted rule names

Body BPE token categories—not word frequencies and not a lower-bound proof:

| Category | Lanes / tape lanes | Raw -> shipped | Glyph | Word-like | Numeric | Other | Body leader |
|---|---:|---:|---:|---:|---:|---:|---|
| PROSE | 5 / 5 | 5,856 -> 3,429 | 839 | **1,629** | 108 | 231 | word-like (58.0%) |
| OPS/TABULAR | 16 / 16 | 17,278 -> 5,580 | **1,202** | 1,105 | 808 | 380 | glyph (34.4%), modest lead |
| CODE/STRUCT | 4 / 4 | 4,152 -> 2,636 | 639 | **945** | 102 | 307 | word-like (47.4%) |
| OTHER | 4 / 0 | 729 -> 317 | — | — | — | — | no dictionary-body census |

Full paths and per-lane leaders are in `leaders.json`. Tape-free lanes are not
misclassified as glyph-led. Compared to the X133 census, rule names now come
from the actual script parser; framing marks do not become glyphs just because
they are absent from the source. Therefore class totals are not directly
interchangeable with the old source-derived census. In particular **58% word-like
BPE tokens does not mean 58% of prose consists of individually one-token words**.

### Requested neighbor-class test

`matrix.ts` tabulates **4,493 glyph sites** by left/right class and records
`T(left + glyph + right) - T(left + right)`. **2,951** are nonpositive in this
three-character measure. This is not an exact deletion cost for the full message.
Examples:

- Latin/Latin: 130 sites, marginal sum 249, none nonpositive.
- glyph/glyph: 1,410 sites, marginal sum 224, 962 nonpositive.
- Latin/glyph: 644 sites, marginal sum 71, 573 nonpositive.
- glyph/Latin: 322 sites, marginal sum 42, 280 nonpositive.
- digit/digit: 115 sites, marginal sum 230, none nonpositive.

The asymmetry is measurable: glyph-adjacent contexts already merge frequently;
Latin on both sides remains expensive. The escaped-Latin experiment explicitly
tested exploiting that interface and did not repay its full description cost.
This does not prove all possible shared-alphabet constructions impossible.

### Decision

**Acceptance threshold NOT met.** ALLOMORPH is a real new experimental module
with two independently verified one-token wins, but not the requested material
Pareto-superior advancement. There is no whole-stack speed win and no blind LLM
reader result. It remains unwired; the PR is a draft and must not be merged on
these results. No claim of a terminal codec, globally novel mechanism, or
exhaustive mathematical-literature audit is justified.

Next high-information tests: joint multi-alias allocation with literal escaping
priced as one package (the single-alias/one-victim experiments do not cover this),
on frozen parent outputs plus held-out real documents; and a separate message-only
model reader. A raw-input parent-preconditioning experiment is still outstanding:
the experiments here change the emitted representation and reuse the parent
parser, not a successful new transform of the original source before F.
