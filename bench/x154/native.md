# Native one-basic-chat gate: NOT_RUN

No independent basic-chat model endpoint was exposed or called. The assistant
knows the source and encoder; an in-context explanation from it is not a blind
behavioral trial. Python/TypeScript inverses do not certify native model reading.

Use `receipts/native-packet.txt` as the **entire** input to a fresh ordinary chat.
No skills.md, system instruction, source, examples, external tools, hints or hidden
vocabulary. Record product/model version, timestamp and the first response bytes.
The packet currently corresponds to the winning VS Code JSON manifest; verify the
source identity in gate.json rather than guessing from token count.

Compare the response, without stripping prose/fences or normalizing whitespace,
to `bench/x152/fixtures/vscode-json-package.json` as UTF-8 bytes. All comments,
commas, escape spellings, key order, duplicate keys if present, indentation and
final newline count. One changed byte fails that trial. A repaired instruction is
a new candidate: reprice the complete message and rerun inverse/transport/attacks
and a new blind native trial. Then test unseen structures, not only this packet.

One success would establish only that trial, not every model or every source.
