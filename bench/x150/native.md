# CHRISMATA native-readability test packet — NOT RUN

This is a proposed external test, not evidence of a model response. Use a fresh
basic single user-message chat, no custom instructions, system prompt,
skills.md, tools, model fine-tuning, or prior turns. The actual task below is
self-contained. Do not show the expected answer to the test model. Repeat on
multiple unseen examples and include plain `+` collision/empty-line cases.

## Single user message

After decoding, for each line starting with + means 32, insert ESC[code m before its first character, ESC[m after it, ESC[code m after that, and ESC[m at line end. If the line is only that character, insert only ESC[code m before it and ESC[m after it. ESC is U+001B; omit the space in code m. Preserve other characters and line endings.
+cat
+

Output only the complete resulting UTF-8 bytes as lowercase hex, including the
final LF after each displayed line. Do not use a code block or prose.

## Expected bytes, kept out of the model prompt

`1b5b33326d2b1b5b6d1b5b33326d6361741b5b6d0a1b5b33326d2b1b5b6d0a`

This checks a tiny sample of exact control-byte reconstruction, not direct
reasoning over compressed operational documents, arbitrary payloads, any
specific model's reliability, or chain-composite grammar. To assess direct
reasoning, run separate blinded questions against full original and encoded
held-out patches, with answer keys independent of the codec and byte comparison
for reconstruction. Merely producing the modal/semantically plausible answer
without reconstructing/checking every byte does not pass.
