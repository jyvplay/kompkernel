# Blind native test — NOT_RUN

No basic-chat model endpoint is available in this session. This status must not be
changed by passing TypeScript/Python inverse tests, by the assistant reading the
source during development, or by merging the PR.

## Exact protocol

1. Fix and record model/version, UTC date, output limits and sampling settings
   before submitting a trial. Open a fresh basic chat with no custom system prompt,
   skills file, tools, hidden reference, examples or conversation history.
2. Paste ONLY receipts/native-packet.txt as the single user message. Its complete
   price is549 o200k_base tokens; don't append extra decoding instructions.
3. Save the model's raw output, without stripping code fences, trimming whitespace,
   normalizing line endings or adding a final newline. Compare bytes to
   fixtures/python-maps.txt with `cmp` and SHA256. Any difference is failure.
4. Retain raw response and metadata. Report unsupported output export separately
   from correctness. A single pass is evidence for that exact trial, not universal
   model ability. Test a prospectively chosen second process map afterward.

The packet's coupled hexadecimal arithmetic is a plausible behavioral failure
point even though its formal inverse is simple. The independent protocol must
remain blind to the source. This assistant has already inspected source/receipts,
so its own reconstruction now cannot be labeled a blind independent trial.

Highest-information continuation: run that exact packet in an available basic
chat and preserve the unmodified output. No fabricated response is provided.
