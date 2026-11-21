# X146 A–J review: EKDYSIS and scoped configuration experiment

## Runtime honesty
Executed: local git/GitHub CLI, web search/fetch, Node 22.22.3, esbuild, TypeScript, Vite build, Python 3.11.2, gpt-tokenizer, repository codecs and readers. Several explicitly identified benchmark processes ran concurrently; isolated speed measurements ran after those processes exited. No independent agent, simulator, external model inference, database service, expert review, Lean/Lake, comparator or nanoda execution occurred. `command -v lean` and `lake` found no installed toolchain. Web/CLI downloads and proof-source inspection are not proof replay.

## A–G. Formal model
**Objects.** Source x is a valid UTF-8 byte string with a round-tripping JavaScript representation. The experimental transform domain is at most 100,000 UTF-16 code units, excluding its reserved envelope prefixes and frame delimiters. Selected substrings must be complete JSON string literals exactly equal to `JSON.stringify(JSON.parse(s))`; value equivalence is insufficient. Up to four complete quoting layers may be peeled. Whole-source literals need no per-span brackets; otherwise nonoverlapping `⟦text⟧` spans are used. A complete in-band instruction states the inverse.

**Access.** Encoder has x, repository code, a fixed tokenizer and ordinary CPU memory. Program decoder receives only emitted text. The proposed behavioral reader receives one basic user message, no source, skills, tools or added system instructions. The current coding conversation is NOT that clean-chat setting. No external dictionary, hidden residual, training or new tokenizer vocabulary is allowed.

**Resources.** Count complete o200k_base message tokens, including both contracts and frame characters; independently reprice using gpt-tokenizer. Count source/transport fidelity in bytes (zero tolerance). Record elapsed milliseconds and process CPU milliseconds separately. Planner scans once, considers at most 12 framed plans plus four whole plans, at most 10,000 scanned strings, and four quoting layers. Plans use bounded work, not a clock cutoff. Composite reader caps expanded rules/output at 100,000 units, 128 grammar rules and conservative layout expansion; unsupported operators/parents refuse. Full parent encoding is not bounded by these planner limits. Benchmarks use an 1,800 MiB Node heap limit, not a claim that the entire operating-system process fits that amount.

**Quantifiers.** Conditional program theorem: for every admitted x and every applied E(x), D(E(x))=x byte-for-byte. For each successful selector call, token cost is strictly less than that call's measured baseline; ties retain baseline. This is not `exists E, forall x, E is shorter`. Requested deployment success additionally needs all mandatory empirical gates: no measured regressions, at least one >10-token gain, adequate basic-chat native reconstruction evidence, and significant whole-stack acceleration without loss of fidelity. A single codec/program test cannot establish `forall LLMs forall inputs` behavioral exactness.

Declared practical speed threshold: at least 10% wall reduction in both warmed ABBA and BAAB schedules on the selected prose/ops lanes, with identical messages. This threshold was not met. EKDYSIS itself also incurs a second parent search: its isolated HTTPX encoder time is **1.887× baseline**, so the 16-token saving is NOT overall Pareto dominance.

**Adjacent problems not substituted.** JSON value equality; whitespace normalization; compact binary serialization; a new tokenizer or embeddings; semantic comprehension without exact output; retrieval requiring external state; standalone-vs-raw improvement instead of parent improvement; CPU microbenchmarks instead of stack latency; native readability inferred from a program; finite empirical no-regression versus universal compression; synthetic stress cases versus real heldouts; a theorem about substring counts versus billed BPE tokens; proof-source inspection versus kernel replay; asymptotic SAT feasibility versus a practical solver.

## H. Outcome space and thresholds
- **H+**: serialization-layer removal can expose representation structure the existing parent exploits. Supported narrowly: exact HTTPX PyPI description token, **1040→1024**, reproduced by the final wrapper.
- **H−**: universal strictly shrinking compression is impossible under finite message alphabets. `gates.py` gives a counting witness for 100 printable-ASCII characters versus at most 10 tokens over an alphabet bounded by one million symbols. This does not exclude a particular corpus gain. The stronger practical claim of overall Pareto superiority is not established; the measured encoder-runtime dimension regresses.
- **H∂**: gains depend on quoting depth, serializer spelling, parent coverage, source size, frame overhead and native reliability. Three full GitHub API snapshots lose 33–40 tokens under the framed route; small Jieba loses two with the final whole contract. Large-source parent searches hit resource limits. No canonical lane exposes an eligible paying quoted span.

Do not promote a candidate merely because H+ has an existence witness. Merge acceptance is the conjunction of all required gates, not a vote among them.

## C. Frontier and imported results
Default configuration exactly matches X145: DET=1, NO_MEMO=1, ENGRAM=0, OURA_MEMO=0, NO_OROTHESIA=1, SCALAR=0, o200k_base. Fresh 29-lane sweep: **11,962 tokens, every message identical**. SCALAR Vite was freshly rebuilt and reconfirmed at 260. The entire optional SCALAR 29-lane sweep was not rerun in X146; its X145 result remains historical.

Category body-token leaders: prose wordlike (3429 tokens), ops/tabular glyph (5580), code/structured wordlike (2636), other 317/no tape leader. This is token-class anatomy, not a universal winning codec theorem.

The 2018 string-attractor result concerns finite strings and occurrence-crossing positions; a size-γ attractor yields an O(γ max(1, log(n/γ))) bidirectional parse, not an LLM-readable priced prompt. The 2023 L-system result adds a finite morphism, depth d, output length n and coding τ; orthogonality to substring complexity is exhibited on string families, not all prose. The 2024 PathPiece result optimizes segmentation for a fixed vocabulary while changing tokenization; our ordinary chat endpoint does not accept arbitrary token segmentations. None closes the interface between a short exact symbolic representation and behavioral native reconstruction. See research.md for source-access limits and individual lab inspections.

## D. Negative space: 18 invalid shapes
1. Raw payload saving with omitted instruction cost.
2. Comparison against raw text while the parent is already smaller.
3. Encoder self-report used as sole source verification.
4. JSON values equal but escape bytes different.
5. UTF-16 equality with broken UTF-8 transport.
6. Hidden quoting-depth metadata.
7. Frame delimiter collision.
8. Unbounded expansion of an acyclic grammar.
9. Unbounded layout padding after a bounded grammar.
10. Source-aware decoder secretly using the encoder's folded text to disambiguate.
11. Unknown parent format silently declared decoded.
12. Synthetic diagnostic repetitions presented as real workloads.
13. Extracted API fields called independent documents from the same response.
14. A killed/heap-exhausted search counted as no-gain or success.
15. Cold-cache ordering presented as speedup.
16. Parser proof presented as native-model proof.
17. A size win plus 1.887× encoder time presented as full Pareto superiority.
18. A fresh source download presented as a verified mathematical proof.

**Modal shortcut.** `There exists a program inverse` does not imply `this basic-chat model executes it exactly`. `gates.py` rejects the actual program-pass/native-NOT_RUN record. Separately, unit.ts tests the explicit collision between `"\\u0061"` and `"a"`: equal JSON values but different source bytes. The planner refuses canonicalizing the former. These tests catch the logical and serialization shortcuts; they do not simulate an LLM. Native prompts and a strict response checker are provided, with no inference result fabricated.

## E–F. Six independent mechanisms / concrete artifacts
| Route | Central construction | Artifact / proved part | Exact gap | Cheapest falsifier / locality |
|---|---|---|---|---|
| EKDYSIS | Partial inverse of complete JSON quoting powers before parent coding | ekdysis.ts, ekdysis-frontier.ts; source-exact replay and strict complete-cost gate | native behavior, broad gains, runtime regression | clean-chat HTTPX reconstruction; global behavioral gap, local serializer edge tests |
| Entropy coding | Brotli then base64 | controls.ts, byte inverse and full price | native execution; zero canonical wins | basic-chat bitstream inversion; effectively original native-access problem |
| Backward copying | Code-point offset/length references | controls.ts, executable exact reconstruction | arithmetic reliability and overhead; zero wins | index/Unicode boundaries; local program gap, global behavioral gap |
| Numeric prediction | Existing DIAPHORA deltas | delta_control.ts, exact inverse and pricing | standalone not better; no new primitive claimed | sign/leading-zero/version boundaries; local |
| Layout factorization | Existing PTYCHE folded margins | layout.ts, reversible eligible blocks | header cost and applicability; zero wins | tabs/CRLF/overflow; local |
| Semantic normalization | Delete distinctions such as case/space | semantic-collision.json, constructive noninjectivity | cannot be exact without residual information | two colliding source strings; global under residual-free contract |

Controls were rerun independently rather than borrowing EKDYSIS's result. Four priced controls have zero canonical wins; normalization is refuted, not silently accepted. Only EKDYSIS is the new repository codec. The scope snapshot is a separate speed experiment, not a seventh compression primitive.

## G. Structure-derived adversaries
- Quoting layers: exact canonical spellings, slash escapes, uppercase/lowercase Unicode escape variants, quotes/backslashes, CRLF/NUL/backspace/formfeed, supplementary scalars, U+2028/U+2029, source/decoded delimiter collisions and depth 0/5/NaN/infinity.
- Scanner: nearly 100k units of unterminated escaped quotes. Replaced a retry-prone regex with a deterministic scan; reran tests.
- Composite reader: forward/self references, exponentially expanding unreachable rules, giant STELI offsets, reserved envelope collisions, and literal-looking parent headers. Admission now uses the actual message-only decoder rather than a source-aware shortcut.
- Config scope: late binding after import, nested scope, exceptions and return to dynamic reads. No mutation of scoped environment knobs is permitted inside the synchronous callback; this is not a general async configuration cache.
- Measurements: mirrored ordering and discarded warmups; source-byte hashes and independent full prices. Larger inputs expose parent memory limits rather than being removed from the ledger.

## H–I. Verification and repair ledger
8,208 unit assertions / 2,047 accepted diagnostic representations. 1,008 config-scope checks. Independent Python replay: 2,079 reads including repeated/synthetic outputs, NOT 2,079 real documents. Final gate: 36 full prices and transport/token-ID checks, 28 supported source-byte reconstructions; eight inherited frontier formats unsupported by the final reader.

Repairs rerun: scanner (unterminated-quote attack); final root contract (repricing, decoder replay, current full wrapper integration); composite grammar/layout bounds (bomb attacks); source-aware ambiguity (message-only attack). Python initially split JSONL with splitlines(), incorrectly splitting U+2028/U+2029 inside JSON strings; repaired to split LF only and reran all independent reads. The first parent harness omitted the tokenizer encoding argument and failed before recording a result; fixed and rerun. No result from that failed attempt is claimed.

TypeScript and production build pass. No native inference, Lean replay, independent agent or expert verification. Source inspection and language-independent Python replay receive their actual, limited evidential weight.

## J. Stopping / acceptance
The new module and a >10-token parent-representation gain are delivered, but **overall Pareto success is false**: native NOT_RUN, EKDYSIS encoder latency +88.7% on the measured win, significant-speed gate failed, no broad canonical prose/ops gain. PR remains draft/unmerged under the conditional merge instruction.

Highest-information next test is the provided clean-chat HTTPX prompt with byte-exact response comparison. If it fails, shrinking another header is irrelevant. If it passes, test additional frozen API descriptions and measure a one-parent admission strategy with an honest token-regression bound. Memory-bounded parent search is a distinct necessary engineering task: Pypinyin process exit 137 (cause not established), Rich sequence heap-exhausted/exit 134 at the explicit 1800 MiB heap limit; FastAPI was never reached. Do not promote raw-token improvements on those inputs to parent wins.

### Additional baseline source audit
The independent reader separately checks saved baseline messages, not just
candidates: nine supported byte-exact reads; two unsupported entries are the
same Node API baseline repeated in exploratory/final receipts. The HTTPX
1040-token baseline is independently source-read. Unsupported baseline reads
are not counted as passes and do not underpin the claimed win.
