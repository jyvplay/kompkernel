# KALLOS (Styled Typography Restoration Pre-Pass) — Verification Report

## A. Formal Model & Invariant Definition
KALLOS is an exact, byte-for-byte lossless typography restoration pre-pass targeting the massive tokenizer inflation suffered by Unicode Mathematical Alphanumeric Symbols (U+1D400..U+1D7FF).

### 1. Sub-Mechanisms & Closed-Form Arithmetic
Four disjoint font styles are targeted:
1. **Math Bold** (U+1D400..U+1D433, U+1D7CE..U+1D7D7):
   - Upper: `0x1D400 + (c - 65)`
   - Lower: `0x1D41A + (c - 97)`
   - Digits: `0x1D7CE + (c - 48)`
   - Brackets: `◆` (`\u25C6`) / `◇` (`\u25C7`)
2. **Math Italic** (U+1D434..U+1D467, U+210E):
   - Upper: `0x1D434 + (c - 65)`
   - Lower: `(c === 'h' ? 0x210E : 0x1D44E + (c - 97))`
   - Brackets: `♡` (`\u2661`) / `♥` (`\u2665`)
3. **Math Monospace** (U+1D670..U+1D6A3, U+1D7F6..U+1D7FF):
   - Upper: `0x1D670 + (c - 65)`
   - Lower: `0x1D68A + (c - 97)`
   - Digits: `0x1D7F6 + (c - 48)`
   - Brackets: `─` (`\u2500`) / `━` (`\u2501`)
4. **Math Sans-Serif** (U+1D5A0..U+1D5D3, U+1D7E2..U+1D7EB):
   - Upper: `0x1D5A0 + (c - 65)`
   - Lower: `0x1D5BA + (c - 97)`
   - Digits: `0x1D7E2 + (c - 48)`
   - Brackets: `├` (`\u251C`) / `┣` (`\u2523`)

## B. Empirical Verification Receipts
- **KALLOS RED TEAM**: 76 / 76 gates passed (0 failures).
- **Independent CPython 3 Reader** (`bench/kallos_decode.py`): 13 / 13 fixtures match byte-for-byte.
- **Novelty (G0)**: 0 collisions across existing codecs.
- **Headline Gains (G9)**:
  - `mathPaperStylized`: 1,101 raw tok -> 350 KALLOS msg tok (**saved 559 tokens / 61.5%** over plain DAEDALUS).
  - `stylizedReadmeMarkdown`: 925 raw tok -> 288 KALLOS msg tok (**saved 418 tokens / 59.2%**).
  - `stylizedBlogArticle`: 1,068 raw tok -> 310 KALLOS msg tok (**saved 485 tokens / 61.0%**).
- **Totality & Structured Fuzz (G8)**: 500 / 500 randomized adversarial fuzz strings exact round-trip.
- **Negative Space (G9)**: Pure ASCII code and English prose show strictly 0 token regression.
