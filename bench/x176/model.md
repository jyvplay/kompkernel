# X176 contract and evidence thresholds

## A–B. Objects, access, units, quantifiers

Let D be finite ASCII byte strings of length ≤50,000. This is KYKLOGRAF's declared experimental domain, not the whole product's domain. A field is a maximal space-separated piece, possibly empty; LF, CR, tab, NUL and punctuation remain inside fields. Only U+0020 splits. Block width b∈{32,128,512}; a final shorter block is allowed. Source bytes are never normalized.

E(x) is the complete single-user-message string, including inverse instructions, all metadata, and the complete parent wire. P is the fixed current tagstack configuration, with deterministic work flags in `trial.ts`. T is o200k token count from the reference tokenizer; cl100k is not the optimization target of this codec. Decoder V is executable; decoder M is a named deployed model with an explicitly specified configuration and single fresh user message. M has no earlier source, system instruction, skill file, tool, training update, or external dictionary.

Resources: final message tokens, exact original-source bytes, process CPU milliseconds and wall milliseconds, candidate/parent-call counts, domain coverage, and memory are separate. No weighted scalar conceals a protected regression. The selector calls the parent at most once; that call is not free merely because it ultimately falls back.

**Executable claim:** for every x admitted by E, V(E(x))=x byte-for-byte. The structural argument uses BBWT bijection over an ordered alphabet of fields, followed by independent fixed-count block inversion; finite tests and independent reader are implementation evidence, not a kernel proof of every execution.

**Requested behavioral claim:** there exists one fixed codec and complete in-band contract such that, for each protected setting and heldout source x, the specified M emits exactly x under the declared protocol. A program V existing for every x does not imply this statement about M. We have no native endpoint here and cannot confirm it, including for this assistant on unseen long wires.

**Compression acceptance:** exact bytes and complete prices on all protected lanes, no lane worse than its strong incumbent, and savings >10 tokens on multiple materially different ordinary prose/ops sources, including whole heldouts. No synthetic-only or one-document-family acceptance. A finite benchmark pass would not prove terminal/global optimality.

**Speed acceptance:** paired ABBA whole-stack process runs, cold processes, same settings and output hashes; aggregate CPU and wall B/A ≤0.90, each protected lane ≤1.00, count/vector gates exact. These thresholds are practical acceptance criteria, not confidence intervals. A noisy finite timing trial cannot prove universal runtime dominance. Compiling/testing concurrently invalidates isolation; the first six X176 speed rows are explicitly archived as contaminated and excluded.

## H+, H−, H∂

H+: the conjunction of executable, native, paid broad-gain, and runtime gates passes. Do not declare this with a missing conjunct.

H−: universal strict shortening of every fixed-length source over a finite alphabet is impossible by injectivity/pigeonhole counting. There are |Σ|^n sources and at most Σ_{i=0}^k |V|^i token strings of length ≤k; if the latter is smaller, no exact injective codec covers all sources with that bound. This is not a lower bound equal to Brotli output, nor a ban on gains on a nonuniform corpus.

For an individual candidate, a paid loss refutes its claimed win on that source; it does not prove the research target impossible. Missing native evaluation yields H∂ (conditional/undetermined behavior), not H− for all LLMs.

H∂: ASCII vs Unicode; block width; field alphabet; cold vs warm process; external decoder vs single-chat behavior; fixed vocabulary vs different tokenizer; known-source vs genuinely blinded evaluation. Current executable evidence belongs here until all H+ gates pass.

## Adjacent problems that are not substitutes

Character-count reduction; binary archive compression; lossy semantic summaries; hidden vector/embedding inputs; model fine-tuning; shared cross-message dictionaries; model logits or arithmetic decoders; microbenchmark speed; encoder self-report; raw-vs-candidate instead of frontier-vs-candidate; synthetic correlated integers; run-count bounds instead of BPE tokens; theorem challenge instead of solution; source inspection instead of kernel replay; partial replay instead of all lanes; unsupported readers instead of exact reads; theoretical algorithm existence instead of executable practical speed; merged code instead of scientific acceptance.

## Actual systems

Node, npm/esbuild, TypeScript compiler, Vite build, Python 3, local git, authenticated gh, web search and page retrieval. Files/JSON are the experimental database; no separate database query or external model service was used. Independent Python implementation means different decoder code, not an independent human or agent. No simulator, independent agent, Lean/lake/Coq executable, or native-model endpoint was exposed. Parallel tool calls are only independent retrieval tasks; expensive codec workers are serialized. Every timing repair requires new affected gates.
