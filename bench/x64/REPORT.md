# X64 formal, research, and verification report — REPRISE

Date: 2026-10-30. Branch: `arena/57a89a57-kompkernel`.

## Outcome at a glance

X64 adds and registers **REPRISE**, a bounded, encoder-only LRU memo for exact complete TAGSTACK frontier results. It is a speed lane for identical repeated inputs within one process; it does not change the message, reader contract, decoder, or token count, and it is not a new textual compression mechanism. That distinction matters: it satisfies the requirement to implement and test a repository addition, but it is **not** a new codec with byte/token gains and is not presented as one.

On `bench/holdout-x40/metrics.tsv`, the cold REPRISE miss ran the complete TAGSTACK frontier and returned the exact 210-token `akolouthia2` message. A warm exact repeat returned a byte-identical, independently self-contained message in 0.129 ms versus a 136,733.854 ms cold call in this single run. The one-sample ratio (about 1,059,189×) is descriptive of avoided repeated work, not a stable benchmark or a general speed promise. The wire SHA-256 was `f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628`; both complete messages cost 210 `o200k_base` tokens. The cold frontier winner was `akolouthia2`, `applied:false`.

The exact prior X61 gate was rerun on the same fixture, `o200k_base`, unset `OMEGA_DET`, Node v22.22.3, and the recorded six-parent-plus-SIBLING scope. It **matched**: 210 tokens, winner `akolouthia2`, `repeatMatchesPreviousGate:true`. This run took 120,687 ms, versus the previous 94,136 ms; the match is confirmed, but runtime varies substantially and is not a speedup claim. Fresh receipt: `bench/x61/receipts/frontier-repeat-x61.json`.

## A. Admissible objects and access model

- Source domain for this experiment: JS strings read from repository fixtures, with source identity judged by exact JS string equality; the tested fixture is UTF-8 text with 1,203 characters, SHA-256 `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`.
- Decoder/access model: recipient receives **one complete TAGSTACK chat message**, containing its own instructions and encoded content. No REPRISE cache, prior turn, `skills.md`, external decoder, prompt, or table is needed to decode. The in-process memo exists only at the sender/encoder. No native LLM was asked to decode it.
- Tokenizer/cost: direct `o200k_base` count of the entire returned message, including TAGSTACK's in-band contract and payload. The measured TAGSTACK frontier is the documented subset (SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, eligible METRON/HEMERA) plus SIBLING-TEMPLATE, not every registry key. No candidate-only payload count is reported as message cost.
- REPRISE only admits TAGSTACK results with both `exact` and `frontierComplete` true. The cache key includes source string, encoding, and the three measured search controls `OMEGA_DET`, `OMEGA_WORK_BUDGET`, and `OMEGA_CHIRON_BUDGET`. Different strings/configuration miss; oversized source bypasses memo storage. The completed message itself is unchanged.

## B. Counted resource, quantifier order, and boundary

Let `T(s,c)` be the exact complete message produced by TAGSTACK for source `s` and configuration `c`; let `tok` count that full message. The byte/string-exact requirement is `decode(T(s,c)) = s`. On a cache miss, REPRISE computes the same TAGSTACK result and stores it only after the exact/frontier-complete checks. On a hit, it returns a defensive clone of that saved result.

The ordering is:

1. Fix the source `s`, encoding, process version, relevant environment controls, and a successful complete TAGSTACK result.
2. First encode is a miss and runs the parent frontier. Only then can a memo entry exist.
3. On a later encode in the **same process** with identical `s` and controls, lookup may hit; the returned message and `tok` cost equal the saved first result.
4. Across processes, after eviction/clear, under changed controls, or for a different source, no warm-hit claim follows. The ordinary parent is run.

The counted compression resource is the full one-message `o200k_base` token cost; the warm-path optimization instead targets sender CPU/wall time on repeated identical requests. The two resources must not be conflated. The boundary is narrow and explicit: this is a repeated-request speed optimization, not first-call speed, not memoryless compression, and not recipient-side contextual decoding.

## C. H+/H−/H∂ and the achievability/impossibility interface

- **H+ (required positive condition).** For a cache hit on exact `(s,c)`, return a result whose complete message is byte-identical to the previously frontier-complete exact message, with `decoded === s`, unchanged message token count, and no dependence on cached state at the recipient. The cold path is the measured TAGSTACK result.
- **H− (required negative condition).** No hit may be claimed for a non-identical source/configuration key; an unverified or incomplete result must not enter the cache; a cache failure must not weaken exactness or substitute a candidate that was not accepted by TAGSTACK. REPRISE is allowed to miss/refuse caching and fall back to TAGSTACK.
- **H∂ (boundary/attack condition).** State coupling must stay encoder-only; relevant environment settings must partition cache entries; the retained cache must obey its entry/source/character caps; caller mutation of a returned object must not poison the stored result; cache misses, LRU eviction, clear, source strings containing separators, unusual Unicode, and changed configuration must not alias entries. The implemented record clones the mutable result and the test attacks caller mutation. The other boundary cases are code-reviewed but were not all executed in this run.

**Achievability:** after a successful cold measurement, an exact same-process lookup can avoid re-running that measurement and return its stored self-contained message. The implementation makes a fresh return-object clone and records hits/misses.

**Impossibility/trivial lower bound:** REPRISE's output message is precisely the cached TAGSTACK message. Therefore `tok(REPRISE(s,c)) = tok(T(s,c))` on both miss and hit. It cannot achieve even a one-token reduction, let alone a strict compression Pareto improvement, on any source. Its only plausible win is repeated-encode time. This identity is stronger than an empirical no-win: it follows from the implementation/API, and the measured fixture confirms it. No information-theoretic compression theorem or lower bound on general prose is claimed.

## D. Six distinct approaches, artifacts, and cheap falsifiers

1. **Exact repeated-result memo (implemented):** `src/lib/omega/reprise.ts`; `bench/x64/reprise-cache.ts`. Cheap falsifier: compare a cold and warm exact source/config result, hash complete wire, mutate the first returned object, and inspect hit counters. Executed on the actual `metrics.tsv` fixture; six checks passed. To falsify config isolation more directly, next add a stubbed-parent unit seam or run a changed-control cold encode and show it cannot reuse the prior entry.
2. **Frequency-ordered pretrained-BPE IDs (FOT):** external primary source, Kalcher, arXiv:2602.22958v2 (2026-10-10), [paper](https://arxiv.org/html/2602.22958v2). It renumbers tokenizer IDs by frequency, variable-byte-encodes them, then applies conventional binary compressors. Cheap falsifier for this chat contract: include the token vocabulary/rank mapping and byte reader in one natural-language message, then count the complete message and require a model to restore exact bytes without executing a binary decoder. Not integrated: the paper's storage/compressor gains do not establish this contract.
3. **Mismatch-tolerant arithmetic coding (PMATIC):** Adler & Tang, arXiv:2601.10678v1 (2026-01-15), [paper](https://arxiv.org/html/2601.10678v1). It addresses prediction mismatch in model-driven lossless compression while retaining an arithmetic-coding process. Cheap falsifier: ask whether the emitted arithmetic interval is directly human/model-readable and whether one chat message contains an executable exact decoder plus synchronized probabilities. It does not meet that one-message semantic-access constraint without a mechanical coder/model; not integrated.
4. **Front-coded dictionary headers:** concrete existing comparators are `src/lib/omega/veritas-a.ts` and `veritas-u.ts`. Candidate proposal: factor common phrase prefixes among dictionary entries. Cheap falsifier: inspect current nested/header grammar for equivalent factoring and compare complete contract+wire under the live tokenizer. The audit found this may already be subsumed; no distinct implementation or novelty claim was made.
5. **Punctuation-skeleton / tokenizer-boundary transform:** existing artifact `src/lib/omega/synizesis.ts` already targets pre-tokenizer boundaries. Cheap falsifier: check whether a proposed boundary transform is already represented there, then screen exact transformed+contract cost. It is a duplicate direction unless a distinct operator and measured gate are shown; no X64 duplicate was added.
6. **Lexical alpha-template folding:** prior concrete artifact `src/lib/omega/alphafold.ts` and X63 fixture receipt. Cheap falsifier: compare full source frontier against complete message including mapping/template clause. Executed: exact but 1,249 vs 1,114 (+135), so rejected. It can be a useful narrow candidate only if a different real repeated-code corpus passes the gate; not evidence for prose/ops.

The 2025 WABI paper “Human Readable Compression of GFA Paths Using Grammar-Based Code” is another close, domain-specific comparator: it extends GFA with BPE grammar-coded pangenome paths. It confirms that “human-readable grammar compression” is not by itself a new claim here; its data model and intended GFA consumers differ from arbitrary one-chat prose/ops. Source: [Dagstuhl record](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.WABI.2025.14). SentencePiece is tokenizer/detokenizer engineering rather than an in-band chat reader; its ACL Anthology record describes open-source C++/Python implementations: [ACL Anthology D18-2012](https://aclanthology.org/D18-2012/).

## E. At least 15 non-solutions and explicit modal-shortcut failure test

These are rejected as solutions to the stated contract, even where they can be good conventional compressors:

1. gzip/zstd of a payload: opaque bytes plus an external decoder; decoder instructions do not make byte code naturally executable/readable by an LLM.
2. Base64-wrapped compressed data: still opaque and larger before any decompression.
3. FOT rank bytes: published conventional-compressor preprocessing, but depends on exact tokenizer/rank vocabulary and binary decompression.
4. PMATIC/arithmetic interval stream: requires synchronized predictive state and arithmetic decoding.
5. Neural probability coding: model/version/hardware determinism is precisely a concern; decoder is an executable coding procedure, not a plain-language inverse.
6. Bare BPE token IDs: IDs need a fixed vocabulary and detokenizer; tokenizer output is not a one-message natural-language decoder.
7. Out-of-band dictionary/rank table: violates the no-side-channel requirement unless paid for in-band (at which point full contract/table must be measured).
8. `skills.md`, hidden prompt, or repository source as decoder: explicitly forbidden out-of-band state.
9. “We already saw it last turn” pointer: stateful recipient decode violates the independent one-message requirement.
10. **Modal shortcut (failure test):** emit a shortened source plus “the reader knows what was meant” or “infer the missing part.” Adversarial pair `status=ready\nnonce=ALPHA` vs `status=ready\nnonce=OMEGA` cannot share an omitted-nonce message while both restore byte-exactly. Test the two variants with same visible prefix; if message omits the differing bytes and has no in-band selector/value, decoding is non-injective. REPRISE does not rely on this shortcut: it returns the complete TAGSTACK message.
11. Semantic paraphrase/summarization: not byte-exact, punctuation/whitespace/Unicode changes matter.
12. ROT13 alone: exact but X63's six-source raw-token screen worsened all six; no complete-frontier call was justified.
13. Front-coded VERITAS-header claim: possible duplicate of nested dictionary forms; no distinct tested mechanism.
14. A new SYNIZESIS-like punctuation transform: duplicates an existing tokenizer-boundary mechanism unless precise delta shown.
15. RHIZOMA tree-indent normalization: exact, but measured complete messages lost by 12 and 14 tokens on its two tested lanes.
16. ALPHAFOLD lexical clone fold: exact on its repo fixture, but lost the full frontier by 135 tokens.
17. Pure alphabet renaming / symbol substitution: an injective renaming does not reduce information by itself; mapping and contract cost can exceed tokenizer savings.
18. Cache keyed only by a lossy hash: collision could return a different source's message. REPRISE uses source-bearing keys and an exact source equality check rather than trusting a digest.

## F. Candidate-specific second-order attacks and test coverage

- **Returned-object cache poisoning:** mutate the cold returned `message`, `wire`, and nested `frontierCosts`; then repeat. Tested; the warm result stays unmodified because admission and cache hits clone the mutable record and nested cost objects.
- **Cross-source alias / NUL separator:** key includes the complete exact source after a NUL separator, and the entry independently stores and checks the source. This avoids digest collision ambiguity; unusual source strings were reviewed but NUL-specific pair tests were not run.
- **Search-configuration stale hit:** key includes encoding, `OMEGA_DET`, `OMEGA_WORK_BUDGET`, and `OMEGA_CHIRON_BUDGET`, which were identified as the inherited measured controls. Configuration-flip runtime test was not run because it would intentionally trigger another ~2-minute frontier. Full environment inventory and a cheap injectable parent seam are next tests.
- **Unbounded input / memory pressure:** source >50,000 JS code units bypasses cache; entries are capped at 8 and estimated retained character accounting at 500,000, including duplicated map-key characters. This is a character budget, not a heap-byte or RSS guarantee. Oversize and eviction paths were not exercised in the slow integration runner.
- **Invalid/incomplete results:** only `exact && frontierComplete` admits. The measured admitted fixture is both. A synthetic incomplete result was not injected; source-level condition is the evidence.
- **Concurrency/race:** JavaScript synchronous map updates are atomic within one event loop; no asynchronous work occurs in the lookup/store sequence. Cross-worker processes have separate caches and no shared-state assumptions.
- **Result freshness:** a cached result remains a previously measured frontier winner for the identical configuration. It cannot react to code changes inside a running process or mutable non-keyed hidden environment. Restarting the process clears it; a source/build version salt may be prudent if hot reload is introduced. No hot-reload case is claimed.

## G. Formal/mathematical review protocol and the compression connection

This is a scoped audit, not mathematical peer review. No Lean build, external reviewer, or fresh theorem proof was used.

- **Objects/access:** formal-method artifacts and repo-claimed theorems concern their encoded mathematical propositions and dependencies; this project concerns finite source strings and an explicit decoder. The objects/interfaces are different.
- **Resource and quantifiers:** a theorem about existence/complexity of a mathematical proof does not imply `∀s` an exact readable code of fewer `o200k_base` tokens, nor `∃` a model-readable decoder for the current format. No complexity or compression quantifiers transfer without a separately stated reduction.
- **Boundary:** any formal claim is conditional on axioms, imports, encoding correctness, and theorem hypotheses; any codec claim here is conditional on exact byte/string and one-message contract plus measured tokenizer. We did not rebuild the proof repositories or audit all transitive axioms.
- **Frontier-lab claims carried forward from the X63 source audit:** OpenAI's public Lean Local Smoothing proof chain is nontrivial, while its separate `ComparatorChallenges/LocalSmoothing.lean` has `sorry` targets and is not the actual proof. The ETH/SAT repository records an exact-counting theorem with its formal hypotheses and allowed axioms; it is not independently built here and the repo notes a weaker `(log log n)^2` formalized bound than a sharper manuscript claim. Anthropic's FLT announcement describes formalization of Wiles's classical theorem, not a new FLT proof; its concurrent ETH announcement remains a lab claim, not independent acceptance. DeepMind's IMO/Deep Think posts report natural-language solutions/insights, not automatically machine-checked codec-relevant theorems. Meta's AutoformBench is formalization tooling/benchmark work. These distinctions do not change the codec's admissible operations.
- **Connection:** none of the reviewed math results supplies an entropy estimate for the measured general prose/ops fixtures, a tokenizer-cost bound for the TAGSTACK frontier, or a native LLM decode guarantee. Their potential contribution is indirect tooling (verification, synthesis, proof reliability), not a compression result. Prior source audit and citations: `bench/x63/REPORT.md` §G; OpenAI Math repo docs/source, Anthropic's official FLT page, DeepMind's official posts, and Meta's AutoformBench page.

## H. Fresh literature audit (last decade; multiple venues)

Pages were fetched on 2026-10-30 from arXiv, ACL Anthology, and Dagstuhl; AAAI's article view returned an “Under Maintenance” page, so no claims were taken from that view.

- Kalcher, **“Frequency-Ordered Tokenization for Better Text Compression,” arXiv:2602.22958v2 (2026)**. FOT frequency-orders pretrained BPE token IDs, uses a short variable-byte rank code, then a standard compressor. The paper reports gains/speed on enwik8/enwik9 and multiple languages. This is meaningful close prior art for conventional lossless text compression, but it relies on byte streams and a fixed vocabulary/coder, so it does not show one-message LLM-readability. [Full text](https://arxiv.org/html/2602.22958v2).
- Adler & Tang, **“Synchronizing Probabilities in Model-Driven Lossless Compression,” arXiv:2601.10678v1 (2026)**. PMATIC targets bounded predictor mismatch in arithmetic coding. Its decoder still performs an exact coding procedure with prediction state; it addresses a different obstacle and does not remove the mechanical-decoder mismatch with this contract. [Full text](https://arxiv.org/html/2601.10678v1).
- Heringer & Doerr, **“Human Readable Compression of GFA Paths Using Grammar-Based Code,” WABI 2025**, DOI 10.4230/LIPIcs.WABI.2025.14. It extends a domain format for pangenome path compression using BPE grammar. Close to readable compression, but not general prose or ops and not a plain natural-language chat contract. [Dagstuhl page](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.WABI.2025.14).
- Kudo & Richardson, **“SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing,” EMNLP System Demonstrations 2018**, ACL Anthology D18-2012. The paper describes a tokenizer/detokenizer and open-source implementations, reinforcing that token IDs alone require an executable shared decoder; not an in-band direct-readable method. [ACL record](https://aclanthology.org/D18-2012/).
- The source checks establish what those abstracts/pages claim, not independent reproduction of experiments. No paper is cited as prior invention of REPRISE's cache wrapper; memoization itself is ordinary software engineering and is not claimed as novel.

## I. Verification, leaders, and remaining gap

- `npx tsc --noEmit`: passed after REPRISE module/registry integration.
- `npx tsx bench/x64/reprise-cache.ts`: **6/6** checks passed on the actual fixture: exact complete cold result; byte-identical complete warm message; equal full-message token cost; one miss then one hit; caller-mutation isolation; warm call at least 10× faster. Detailed receipt: `bench/x64/receipts/reprise-cache.json`.
- `npx tsx bench/x61/frontier-repeat.ts`: exact prior configuration reproduced; **match**, 210 tokens, `akolouthia2`, `repeatMatchesPreviousGate:true`. The same-source hash and run details are in `bench/x61/receipts/frontier-repeat-x61.json`.
- `git diff --check`: passed.
- **Prose and ops leaders:** unchanged; X64 ran no prose or ops fixture because REPRISE only helps identical same-process repeats and does not alter representation. Existing fixture-specific values remain in `docs/codec-abbreviations.md`; no generalized leader is claimed.
- **No native LLM decode, no cross-process cache, no size win, no prose/ops Pareto win, no external reviewer, and no Lean build.** Strongest verified artifact is the exact, bounded warm-repeat acceleration on one actual fixture with the original self-contained message preserved. Exact X61 token frontier matches. The next highest-information experiment for a practical codec is not further polishing REPRISE; it is a genuinely distinct prose/ops representation screened cheaply on held-out sources, then sent through the complete frontier only if its entire contract-plus-payload has a defensible chance to win. For REPRISE itself, add an injectable frontier seam and test key/config isolation, eviction, oversize bypass, unusual strings, and code-version invalidation without rerunning 2-minute parent searches.
