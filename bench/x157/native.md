# Native/basic-chat verification: NOT_RUN

No independent basic-chat model endpoint is available. This assistant has seen
the source and cannot relabel a reconstruction as a blind test. Program inverses,
compiler output and a merged PR do not satisfy this gate.

## Next highest-information test

The prior X156549-token packet remains a ready blinded test. For the new codec,
use receipts/native-packet.txt (937 tokens, complete three-file patch message)
after the post-reader-extension full API replay has completed.

1. Predeclare model/version, UTC date, output limit and sampling parameters.
2. Open a fresh ordinary chat with no skills file, custom system prompt, tools,
   source file, examples or earlier conversation.
3. Paste ONLY the packet as the single user message.
4. Export raw output without trimming, code-fence removal, newline conversion,
   adding a final LF or any other normalization.
5. Compare bytes to fixtures/io-streams.diff. Any differing byte is a failure;
   output/export limitations are separate unsupported outcomes.
6. Retain raw response and metadata, then test a prospectively selected unrelated
   patch. One pass certifies only that trial, not all models or patches.

Specific adversary: zero-count hunks require offset corrections; deletion lines
can start with multiple minus signs; no-newline notes count on neither side;
file changes reset balance. The parent grammar also needs exact expansion. All
are potential behavioral failures even though software inversion is verified.

A second complete packet, receipts/native-large-packet.txt, costs1905 tokens and
reconstructs fixtures/io-U0.diff. It passed post-extension software gates, not a
native trial. Its larger dictionary is an additional behavioral risk.
