# X149 research notes — fresh searches, individually inspected to the depth stated

New search terms this turn (not used by any earlier codec turn): "token-efficient
columnar notation", "fixed-width columnar log format compression tokenization",
"whitespace padding removal column alignment reversible lossless".

Fetched / inspected live:

- **ONTO: a Token-Efficient Columnar Notation for LLM Input Optimization**
  (arXiv 2604.17512, fetched HTML, April 2026): declares field names once and
  emits pipe-delimited single-spaced rows; 46–51% vs JSON on synthetic IoT data;
  token-composition analysis shows savings are structural, values are
  format-invariant. RELEVANCE: strong 2026 external confirmation that
  single-spaced columnar geometry is where operational-data tokens live. It is
  a WIRE DESIGN for payloads you control; our constraint is byte-perfect
  REVERSAL of text you are given, so ΠΟΛΥΣΤΗΛΗ is the inverse-problem twin:
  same geometry insight, reconstruction from recorded widths instead of a
  chosen format. Cited as prior art for the mechanism class, not as a solution.
- **zip2zip (2025, search snippet only)**: inference-time adaptive vocabularies
  ("hypertokens"), needs parameter-efficient fine-tuning (10 GPU-hours).
  INADMISSIBLE under the unchanged-native-chat constraint — recorded boundary.
- **AlphaZip (arXiv 2409.15046, 2024)**: LLM-prediction + adaptive
  Huffman/LZ77/Gzip rank coding. Requires the model to decode ARITHMETIC
  bitstreams — not directly readable; INADMISSIBLE for the native gate.
- **LLMLingua / LLMLingua-2** (via ONTO's related work): perplexity-based
  deletion, explicitly LOSSY. Inadmissible.
- **ZFP / DCTZ (arXiv 2503.17078, 2025)**: reversible-mode scientific floating
  point compression — different data class (floats, bit-plane), no interface to
  UTF-8 text transport.

Frontier-lab artifacts: carried over from X148 at the same stated depth
(no Lean replay available in this sandbox); no new lab artifact changes the
codec conclusions this turn. DoubleAI girth PDF remains UNFETCHED (transport
failure last turn; not retried successfully).

## Boundary conclusion

The 2026 literature is converging on exactly the lever this stack already
exploits (structural/columnar geometry), which supports ΠΟΛΥΣΤΗΛΗ's direction;
no fetched source offers a byte-perfect native-readable mechanism the stack
lacks. Vocabulary-adding and arithmetic-decoding families remain inadmissible.
