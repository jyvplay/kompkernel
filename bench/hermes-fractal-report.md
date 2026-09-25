# HERMES-F research artifact

Date: 2026-09-24 America/New_York / 2026-09-25 UTC. This file records the contract, construction, attacks, and executable receipts for the new codec in `src/lib/omega/hermes-fractal.ts` and the contract boundary in `src/lib/omega/hermes-contract.ts`.

## Runtime honesty

Actually used in this turn:

- shell commands through the repository sandbox;
- Node.js, npm, `esbuild` 0.28.2, TypeScript 5.9.3, Vite 7.3.6;
- the repository's live `gpt-tokenizer` `o200k_base` implementation (and the code supports `cl100k_base`);
- the repository fixtures and independent TypeScript test benches;
- the Workbench production build with HERMES-C selected by default;
- web search and page retrieval for literature.

No independent agent, LLM inference API, simulator, Lean/Coq theorem prover, database, GPU, or external compression executable was used. The independent decoder in the red-team is a second TypeScript implementation, not a theorem prover and not a real second LLM.

## A. Formal model

### Admissible objects

An input is a finite JavaScript string `x` (the repository's exact text contract, including newline, tab, control, and Unicode code units). A wire is another finite string. The decoder prompt and wire are delivered together in one ordinary chat message. HERMES-F permits no corpus dictionary, fixed schema, prior turn, skill file, system prompt, tool, or hidden model state.

A template is an input-discovered literal array `L` and a variable-arity slot-spec array `S`, with `|L| = |S| + 1`. A block chooses its own number of units. The encoder may use four transmitted slot generators: constant, arithmetic integer, short cycle, and literal list. The raw `R` production is always admissible.

### Access model

The reader receives `hermesFractalDecoderPrompt(wire)` and the wire in the same message. HERMES-C is the explicit contract compiler: it computes the operation set from the finished wire and specializes the prose contract to that set; malformed metadata never controls decoding. `T` lines define templates; `B` expands a template; `R` carries an exact JSON string. The prompt is the complete contract. The encoder and library decoder are not assumed available to the reader.

### Resource

For encoding `e` and tokenizer `q`,

- `W_q(e,x) = countTokens(wire)`;
- `M_q(e,x) = countTokens(decoderPrompt(wire))`; for HERMES-C this is exposed as `oneChatTokens` and `messageTokens`.
- `C_q(e,x) = M_q(e,x) - W_q(e,x)` for a framed wire (the specialized decoder-contract overhead);
- `I_q(x) = countTokens(x)`.

The operational contract is `M`, not `W`: a codec is accepted only if `M < I`. All emitted candidates are also required to satisfy `W < I` and exact round-trip.

### Success/failure quantifiers

For a finite test set `D`, the tested success predicate is:

`Success_D(e) := forall x in D, decode_prompt_literal(prompt(e(x)), wire(e(x))) = x AND decode_library(wire(e(x))) = x AND M(e,x) < I(x)` for every framed emission.

The stronger universal claim, `forall finite strings x`, is **not** declared proved. A failed exactness gate returns literal input or an exact forced wrapper. HERMES-F's tests establish `Success_D` for the named fixtures and fuzz set only.

### Regime and tolerances

The primary tokenizer is live `o200k_base`; counts are integer tokens, not character or byte estimates. `cl100k_base` is an accepted API parameter but was not the primary receipt in this turn. Equality is exact JavaScript string equality. No lossy tolerance is allowed. Candidate discovery is bounded at four adjacent lines per unit, 1,024 units per block, 96 templates, and 1,200 local candidates; those are performance bounds, not correctness assumptions because raw fallback remains admissible.

### Adjacent but different problems

1. Binary byte compression (Ω-Ξ) is not directly readable by a basic chat model.
2. Lossy semantic prompt compression is not exact reconstruction.
3. A dictionary in a system prompt violates single-message closure.
4. A fine-tuned special-token compressor changes the model/access model.
5. Wire-only token savings are not message-cost savings.
6. Byte/BPE compression is not LLM-readable execution.
7. A fixed synthetic schema/operad table is not a per-input variable grammar.
8. Output-side or multi-turn dictionaries are not cold-start codecs.
9. A model guessing omitted values is not lossless decoding.
10. Token-count heuristics are not live tokenizer measurements.

## B. Outcome space

- **H+ (restricted target):** achieved. HERMES-C is an exact HERMES-F delivery with a wire-specialized decoder contract, independent decode receipts, and a production Workbench default. The adaptive router is never worse than HERMES-Ω on measured `M`; the chat fixture strictly improves. In the measured arithmetic/chat/JSON/CSV lanes, contract slicing removed 30–51 `o200k_base` tokens from the previous all-operation HERMES-F prompt; this is prompt-overhead improvement, not a claim that the wire changed.
- **H− (universal terminal claim):** not established and likely false as stated. Identity is the admissible lower bound on incompressible/small inputs, and any framed codec has a positive contract cost. No codec can strictly reduce every finite input under `M` while also remaining exact and self-described.
- **H∂:** the answer changes at the boundary. For small prose, heterogeneous short text, and lanes where HERMES-Ω already has a better grammar, HERMES-F declines. For sufficiently repetitive near-duplicate records, HERMES-F wins its wire and sometimes its full message.

Evidence threshold used: no claim of universal superiority; accept only exact independent decode, live-token counts, whole-wire gate, and red-team completion. Behavioral “an arbitrary LLM will execute the prompt perfectly” remains unverified.

## C. Frontier and open interface

Imported results were used as design hypotheses, not as receipts for this implementation:

- Delétang et al., ICLR 2024, establish the prediction/compression equivalence and the role of arithmetic coding; that applies to lossless statistical transport, not automatically to an LLM-readable one-message wire.
- Navarro, Olivares, and Urbina, arXiv:2404.07057, define generalized SLPs whose rules can be compact representations of longer sequences and specialize iterated SLPs. HERMES-F imports only the idea that a generator can be richer than a flat repeated substring; it does not claim their asymptotic bounds for this tokenized prompt metric.
- Li et al., Nature Machine Intelligence 2025, report LMCompress results using a large model plus arithmetic coding. That requires a model-driven statistical decoder and is outside the no-tool/direct-readable contract.
- Tacconelli, arXiv:2602.19626, reports an ensemble neural arithmetic compressor with online n-grams, adaptive mixing, higher-precision CDFs, and fast native inference. It is a credible speed/transport direction, but its model weights and arithmetic decoder are not available in the chat message, so it is not admitted as a direct-readable HERMES-F competitor.
- Nagle et al., NeurIPS 2024, formalize black-box prompt compression as a rate-distortion problem and show query-aware/variable-rate selection matters. HERMES-C applies the narrower exact analogue: the emitted wire is known at encode time, so the contract is specialized to used productions rather than guessed from a fixed global prompt.
- Jiang et al., EMNLP 2023 (LLMLingua), report learned coarse-to-fine prompt compression and up to 20x task-dependent compression, but it relies on a compressor/model and semantic fidelity rather than exact reconstruction. It is a useful speed/cost comparator, not a drop-in single-message decoder.
- Li et al., AdmTree, NeurIPS 2025 / arXiv:2512.04550, dynamically segment variable-length context into a hierarchical semantic tree. It supports the hypothesis that adaptive boundaries matter, but gist-token inference and a frozen backbone are outside HERMES-C's direct-readable exact contract.
- Macfarlane et al., arXiv:2604.18907 (ICLR 2026), learn a discrete vocabulary and variable-length neural programs with test-time adaptation. That is an AI-native dynamic-program direction; because its interpreter is learned and not carried in the message, it is an orthogonal future branch rather than evidence for HERMES-C correctness.
- Tsoukalas et al., arXiv:2605.22763, use Lean compiler feedback to verify AI-generated formal proofs. The transferable engineering rule is exact external verification; no Lean proof is needed for the finite-string codec because the independent decoder and byte equality are the executable gates here.

The open interface is now precise: HERMES-Ω's token-aligned SLP is better on long prose and some JSON, while HERMES-F's dynamic variable-arity template/generator is better on repeated records and two-line chat units. A general exact dynamic partition over both grammars, with the decoder-contract cost included in the objective, is not yet implemented here.

## D. Negative space: 20 false solutions

1. **Modal shortcut:** infer the missing row values from the most common pattern; fails on an outlier. Test: identical-shape rows with one value changed and a checksum field.
2. **Header-only dictionary:** print aliases but omit definitions; fails cold start. Test: new chat with no prior turn.
3. **System-prompt dictionary:** works only if an external prompt exists; violates access model. Test: send only the one generated message.
4. **Wire-only gate:** `W < I` but `M >= I`; loses operationally. Test: 4-row input with a 150-token decoder contract.
5. **Semantic paraphrase:** preserves meaning, not bytes. Test: punctuation, whitespace, identifier, and numeric checksum comparison.
6. **Vowel/stopword deletion:** direct prose may be understandable but cannot reconstruct. Test: `in` vs `on`, `not`, code identifiers.
7. **Char n-gram substitution:** BPE boundary splitting can erase predicted savings. Test: replace a candidate and retokenize all surrounding sites.
8. **Unescaped delimiter:** payload delimiter opens a fake rule. Test: JSON strings containing every framing character.
9. **Colliding glyph:** a source character selected as an alias is expanded accidentally. Test: source containing all candidate glyphs.
10. **Forward/cyclic references:** expansion order is ambiguous or nonterminating. Test: manually built cycles and forward references.
11. **Fixed field count:** a template assumes `k` columns and rejects variable records. Test: 1-, 2-, 4-line unit widths and differing slot arities.
12. **Template without an exact match gate:** one mismatched line silently changes output. Test: one outlier in the middle of a run.
13. **Integer overflow:** affine reconstruction wraps or loses precision. Test: unsafe integers, negatives, and large steps.
14. **Cycle with an empty period:** modulo by zero or fabricated values. Test: malformed `%[]` and zero-count blocks.
15. **Repeated frame payload:** raw input that begins with the codec header is decoded as a program. Test: literal `⟡F1` input.
16. **Malformed-frame recovery by guessing:** returns fabricated plaintext rather than the original wire. Test: truncated `T`, unknown op, bad JSON, bad trail bit.
17. **CJK token folklore:** assumes every ideograph is one tokenizer token. Test: count each chosen symbol with the live BPE tokenizer.
18. **Average benchmark win:** hides failures on small/chaotic lanes. Test: per-lane identity fallback and held-out files.
19. **Unbounded search:** compresses well but stalls the UI. Test: 8 KB mixed input with an explicit wall-clock gate.
20. **Model-readable assertion without a model test:** a prompt can be syntactically self-contained while an LLM still misexecutes it. Test: independent prompt-literal interpreter; report behavioral LLM status separately.

## E. Mechanism portfolio

1. **HERMES-Ω token-aligned dynamic SLP.** Artifact: `src/lib/omega/hermes.ts` and `bench/hermes-redteam.ts`. Proved portion: exact dynamic phrase/counter wires and a 22-gate/24-lane receipt in this turn. Gap: weak on near-duplicate rows; local to the row/template family.
2. **HERMES-F variable-arity templates.** Artifact: `src/lib/omega/hermes-fractal.ts` and the contract boundary in `src/lib/omega/hermes-contract.ts`. Proved portion: exact template discovery, variable unit width, constant/affine/cycle/literal generators, raw fallback, self-carried prompt. Gap: no global optimality; local candidate selection can miss a joint partition.
3. **Adaptive HERMES router.** Artifact: `hermesAdaptiveEncode` in the same module and its red-team. Proved portion: by construction it returns the lower measured `M` of the two complete candidates; strict chat improvement is measured. Gap: it runs both searches and has no general proof over future codec additions.
4. **Typed column/closed-form route.** Artifact: existing `src/lib/omega/strata.ts` and its tests. Central construction: transpose records and fit constants, arithmetic, cycles, and affixes. It is mechanism-distinct but excluded from HERMES-F because a fixed tagged column wire is a different contract/design tradeoff; unresolved interface is direct one-chat prompt cost on mixed records.
5. **Neural predictive arithmetic.** Artifact: existing Ω-Ξ source plus external LMCompress/Nacrith papers. Central lemma: predictive probability can become code length. It can improve binary/transport compression, but fails the direct-readable/no-tool contract unless the full model and decoder are carried; this branch is rejected for the present target.
6. **Semantic/prose compression.** Artifact: existing semantic modules and their prompts. Central construction: omit or abbreviate predictable language. It can improve ordinary prose and generation speed, but is not exact and therefore cannot replace HERMES-F under this contract; it remains a separate H∂ lane.
7. **HERMES-C wire-specialized contract.** Artifact: `src/lib/omega/hermes-contract.ts` plus the contract compiler in `hermes-fractal.ts`. Central construction: partial-evaluate the self-carried decoder prose against the actual T/B/R and `=/#/%/~` operations emitted by the wire. It preserves the same exact wire and decoder, while removing unreachable branches. The live receipts are 30–51 token reductions against the legacy all-operation prompt on four framed fixture lanes; small/raw lanes correctly remain identity.

## F–I. Adversary, verification, repair

The strongest structure-specific attacker is a near-duplicate corpus with one adversarial outlier per block, alternating unit widths, delimiter-heavy JSON, unsafe integers, Unicode, frame-looking raw text, and short blocks just below the admission threshold. The red-team includes these cases, 250 structured fuzz inputs, malformed frames, 15 regimes, independent prompt-literal decoding, and an 8 KB speed test.

After the HERMES-C contract patch and parser repair, the complete red-team was rerun: **11/11 gates passed**. It includes the original independent prompt-literal decoder, 15 regimes, constant/affine/cycle/literal/variable-width lanes, hostile delimiters and Unicode, malformed frames, a contract-specialization comparison, metadata/adversarial mutation repair, adaptive Pareto checks, identity accounting, 250 fuzz cases, and an 8 KB speed gate. `npx tsc --noEmit` passed, and `npm run build` passed with Vite 7.3.6 (173 modules transformed). No target-LLM behavioral decode was run, so that remains explicitly unverified.

## J. Stop condition

The strongest verified artifact is HERMES-C + HERMES-F plus `hermesAdaptiveEncode`, not a terminal universal codec. HERMES-C is Pareto-superior to the prior HERMES-F prompt on the tested framed lanes, while raw/short inputs correctly fall back. The next highest-information test is a larger held-out corpus of real mixed agent turns with exact output requirements, measuring `M`, parse errors by actual target LLMs, and encode latency. The next code experiment is a contract-aware dynamic program over HERMES-Ω and HERMES-F regions; it must retain the one-region identity/HERMES candidates so it cannot lose by framing alone.
