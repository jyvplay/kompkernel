# X114 compression prior-art screen (2026-11-14)

Purpose: find a mechanism that can beat the shipped parent stack, not merely
shorten the source. The stack's own X88 SYNTAXIS ledger already states the
constraint that killed the first screen: for any wire this stack emits,
F(wire)/raw(wire) >= 0.563, so a pre-transform must land below ~1.78 x F(source)
to have a chance. Removing plain repetition makes the wire denser and reduces the
parent glyph pool's yield. Admissible new shapes must delete something a
substring dictionary cannot represent: recomputable values, positional
constants, geometry, numeric templates.

## External sources read

- Kozma & Voderholzer, ESA 2026, DOI 10.4230/LIPIcs.ESA.2026.80, arXiv
  2411.08671: optimal BPE pair encoding APX-complete; greedy BPE worst-case
  0.333-0.625 of optimal. Negative result for claims of optimal local merges.
- Kipf et al., CIDR'26, p34-kipf.pdf: LLM arithmetic coding amortisation ~10 yr
  (~120 yr vs traditional); determinism needs identical weights/tokenizer/batch.
  Supports CPU-only symbolic coding and separate entropy-tier reporting.
- Diaz-Dominguez, SEA 2025, DOI 10.4230/LIPIcs.SEA.2025.14: stable local
  consistency + parallel grammar; 7.9 TB in 9 h, 85x. Engineering scale, not a
  new exact message operator.
- arXiv 2604.13066v1: training-free dictionary prompt compression, dictionary in
  system prompt; exact-match >0.99 template but Levenshtein ~0.91 algorithmic ->
  not byte-exact, inadmissible.
- Pith 2506.00307 (LTSC): LZ77 meta-tokens, 18-27%, needs fine-tuning; review
  flags Algorithm 2 reversibility ambiguity, no code released. Inadmissible.
- arXiv 2510.18043v1 (CompactPrompt): lossy numeric quantization. Inadmissible.
- ACL 2024.emnlp-main.40 (PathPiece): min-token segmentation does not improve
  downstream quality. Negative result for token-count-only objectives.
- Also surveyed: arXiv 2605.12928 (byte-vs-BPE efficiency gap), 2411.12439 (LCG),
  biorxiv 2025.07.22.666196v2 (RLZ-RePair, -83% memory/+34.5% time), 2606.19857
  (BabelTele, lossy), 2605.24541 (SemanticZip, lossy), 2608.26263 (SKILL.state),
  2404.03626 (Equal-Info Windows). None supplies a byte-exact readable operator
  that the stack lacks.

## Internal collision map (why the screens were chosen)

Hard-wrap/reflow: wrapcanon/stichos/periodos. Whitespace/padding:
ltp/hyle/padtab/syntaxis/caesura/kenon/parataxis. Letter-spacing/fullwidth:
procrustes. Hex separators: syncope. Digit-shape fitting: kerma/synizesis/stigme.
Re-Pair: repair. Version patches: diorthosi. Near-dup blocks: ARCHETYPON
self-canon. Public canon: anagnorisis. Tape search:
isomorphia/metataxis/gennadas/proagoge. Contract rewriting:
perikopi/tachygrafia/pinax/syntomia. Punctuation fusion: crasis. Shared-prefix
fields: koine. Numeric deltas: diaphora/onomasia/akolouthia. Case canon:
stentor/morph. Apostrophes: orthos. Static/cross-turn dictionaries:
phrase/persistent-dict/input-memory (cross-message inadmissible). Token-boundary
dictionary: praxis. Permutations: anastrophe (closed). Adjacent-span RLE:
anadiplosis. Entropy/glyph tier: aither/cm/atom-codec (shipped, non-readable).

## X114 screens

Screen 1 (`bench/x114/receipts/screen.json`): words-per-line layout +342,
delta-layout +304, sentence-case canon +90 over 29 raw lanes. All exact where
they fired; all cost more tokens. Closed.

Screen 2 (`bench/x114/receipts/screen2.json`): same-row percentage recomputation
+78, findmnt-style tree geometry +9, column unit template +11. Fired/exact:
pct 2/2, tree 1/1, unit 3/3. The unit screen has one raw lane win (df-h table
570 -> 535) but loses on df-real and df-h x42 and is net +11; it was not
parent-gated and is not shipped. Under the dense-wire law a raw win is necessary
not sufficient, and the parent stack already prices df-h at 162.

## Shipped instead

SYNEDRIA (`src/lib/omega/synedria.ts`): encoder-only scoped cross-parent replay.
It does not attempt to beat the dense-wire law; it removes duplicate computation
while preserving the exact wire and the deterministic meter trajectory.
