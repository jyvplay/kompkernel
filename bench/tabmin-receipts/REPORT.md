# TABMIN measurement (2026-10-10)

Corpus: 169 files = 167 CSVs in bench/tmp/csvcorpus (statsmodels 160, sklearn 3, vega-datasets 4) + 2 holdouts in bench/holdout-tab (list: files-169.txt).
Per file the bench runs LAKONIKOS on the table (row arm) and on its transpose with a one-sentence column note (column arm).
Both arms are full one-chat messages (decoder contract and note included), o200k_base tokens. Each column arm is only chosen
if its wire decodes back to the input exactly and it is strictly fewer tokens. Raw bench output: tabmin-bench-169.jsonl.

## Results
- Round trip: 169/169 exact.
- Non-rectangular or quoted files (row-ineligible): 77; unchanged.
- Rectangular files: 92; column arm chosen on 35; row arm on 57 (ties count as row).
- All files: row-only 519210 tokens, TABMIN 507582 tokens, delta -2.24%.
- Rectangular only: row 289730, TABMIN 278102, delta -4.01%.
- Token gain from column wins: 11628. Top 5 files supply 8068 of it.
- Every column win is from the CSV corpus; the 2 holdout files are all row-arm or ineligible. 160 of 167 corpus files are statsmodels test/data fixtures, so the corpus is not representative.

## Decision
The gain is real but small corpus-wide (-2.2%). It is concentrated in a few numeric time-series tables. The column arm also asks the reader to rebuild rows from columns. Literature points against column-only text serialization (arXiv 2606.32029, Jun 2026; Springer AFS-TU, Sep 2026: row-only and column-only linearizations lose to row-column-preserving formats). One readability test (iris, table 1) decoded exactly; tables 2 and 3 were not decoded. The bench measures tokens and codec exactness, not reader accuracy.
Therefore TABMIN is NOT registered in src/lib/omega/registry.ts. The module (src/lib/omega/tabmin.ts) and receipts are kept as an unregistered experiment.

## Round-trip unit test
bench/tabmin-roundtrip.ts: 4000 random rectangular tables (empty cells, unicode, tabs): transpose->untranspose exact 4000/4000; 6/6 ineligible inputs rejected.

## Readability fixtures
bench/llm-blind-tab/: table 1 (iris, column arm) decoded blind, exact. Tables 2 (grunfeld) and 3 (statsmodels tsa) not decoded.
