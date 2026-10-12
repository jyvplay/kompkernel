# Z38 — VERITAS-Q, frontier re-check, PR review, decodability kit (o200k one-chat tokens)

## 0. Runtime honesty (what actually ran)
- Sandbox tools used: git, gh (GitHub API), node 22.22.3, npm (reinstalled `node_modules` from the lockfile this turn; the
  environment had lost it), tsc 5.9.3, esbuild, python3, web search and page fetch, git clone of openai/ten-proofs.
- NOT available: Lean / lake / mathlib (no proof checker was run), any LLM endpoint (the sandbox cannot reach one; the only
  allowed hosts are github, npm, pypi), any GPU, any parallel agents. The two 151-file runs used 2 shell processes on 2 cores.
- Environment reset at the start of this turn: `/home/user/z31`, `/home/user/z37` and `/home/user/z20-work` were gone; the
  repository was a fresh clone of `main` with the session branch checked out at `main`. Recovered: the session branch was
  fetched and checked out at `7b7e694` (the Z37 commit). 729 untracked files were backed up (`/home/user/z38`) and verified
  byte-identical after checkout. The z31 corpus was rebuilt from npm with the committed script (111/111 length matches).
- Runtime of the 151-file VERITAS-Q run: about 100 minutes wall clock on 2 shared cores (per-file up to ~200 s on the
  largest standard-mode inputs). The run was restarted once after the legend was changed; both runs are not reported.

## 1. Formal model (short)
- Admissible objects: UTF-8 texts T (lanes: prose, ops, ops_real, fresh, wrapped_docs, code, realjson; 151 files).
- Access: a single user message M (no system prompt, no prior context). A decoder D must return T byte-for-byte from M.
- Resource: o200k_base token count of M, **including every instruction the message needs** (Z38 correction: VXR-family
  counts before this turn excluded the output instruction, about 8 tokens per file).
- Success: for every T in the lane, D(M)=T (exact, checked by the shipped decoder) AND for a lane L, sum tokens(M) < sum
  frontier(L) where frontier(T) = min(DAEDALUS, A10) per file (Z33 definition). Pareto-superior in lane L := this strict
  inequality on the lane total, with the per-file exactness gate.
- Quantifiers: for all T in corpus: exact; then exists lane L: total(L) < frontier(L). Order matters: exactness is universal,
  the lane claim is existential.
- Parameter regime: input <= 10000 chars uses the wide search; larger inputs use the standard budget. Budgets are counts.
- Adjacent problems NOT substituted: (a) LLM decodability (not measured); (b) lossy prompt compression (LLMLingua-type);
  (c) LZ77-with-meta-tokens that needs fine-tuning (LTSC, 2506.00307); (d) tokenizer-retraining (2512.03989, 2402.01035).

## 2. Outcome space
- H+ (a codec beats the frontier by a large margin in a general lane): NOT established. Evidence below does not reach it.
- H− (impossible under dictionary + legend + exact-count, for these lanes): supported for the prose lane at the current
  selection quality, by the free-dictionary bound (ARIADNE header: 1415 tokens on gh-prose with a free dictionary) and by
  the 60-vs-28 rule-count gap; NOT proven, because the selection space is not searched exhaustively.
- H∂ (answer changes at a boundary): the prose lane changes sign between files (readme is below the frontier by 5 tokens,
  gh-prose is above it by 39) and between legend variants (escape vs minimal). This is the live boundary.
- Commitment threshold used: a lane claim needs an exact 151-file total below the frontier total. Met for nothing below.

## 3. Frontier (restated with hypotheses)
- F1 (achievability, repo): DAEDALUS (ARIADNE optimal parse + CHIRON structure + feature-selected arm). Totals: prose 4234,
  ops 16689, ops_real 10860, fresh 231785, wrapped 35324, code 3065, realjson 3395. Hypothesis: outputs are exact (tested by
  its own gates, not re-verified here); the 20 files where DAEDALUS returns identity (winningArm 'none') are counted as
  frontier values equal to the input length.
- F2 (bound, repo ARIADNE header): free-dictionary optimal parse on gh-prose = 1415 vs identity 1934. Hypothesis: charging
  legend cost is the whole gap; the bound is for symbol-space costs, not exact o200k counts.
- F3 (external, arXiv 2604.13066, Mar 2026): dictionary-encoded logs decoded by Claude 3.7 Sonnet with the dictionary in the
  SYSTEM PROMPT: exact match > 0.99 on template compression, Levenshtein > 0.91 on algorithmic compression. Hypothesis: the
  result carries over to a user-message dictionary. Not byte-exact by the paper's own measure; not reproduced here.
- F4 (external, arXiv 2506.00307, LTSC): lossless meta-token compression, requires fine-tuning. Excluded by constraint.
- F5 (external, Drain, ICWS 2017 and Drain3): fixed-depth log template mining. Hypothesis: template+slot factoring is what
  CHIRON already does; not measured here as a separate codec.
- Interface between F1 and F3: F1 is exact; F3 is probabilistic in the decoder. There is no imported result that makes an LLM
  decode exact; the interface is the gap.

## 4. Negative space (>= 15 shapes that look like solutions and are not)
1. Greedy with exact-count single-step acceptance (VXR). Misses rules that pay only jointly. Observed: 28 rules on gh-prose vs DAEDALUS 60.
2. Additive ILP over token-aligned candidates (Z35). Over-credits replacements: readme 745 vs VXR 706.
3. Character-level ILP (Z35). readme 1003 at best vs 706.
4. Per-site selective parse (Z37 H1). 0 expansions.
5. Script-ordered key pools alone (Z37 H2). within +-3 tokens.
6. Look-past alone (Z37). 0 tokens.
7. Key swap without decode gate. Produces invalid wires (VXN: alias cycle).
8. Wider search budgets beyond saturation (Z37). 0 tokens.
9. Whole-word candidates first, DAEDALUS-style word arm (Z38). readme 704->704, gh-prose 1846->1846. 0 tokens.
10. Whitespace collapse on the compressed wire body (Z38). 2.3% of ops_real output BEFORE paying for width models; ops 0.2%.
11. Whitespace collapse on raw text as a codec. An upper bound only; not reversible without a width model. Rejected as a codec.
12. Markdown table separator elision (Z38). 0.1% of tokens. Negligible.
13. Minified JSON + VXR (Z36). 756 > DAEDALUS 743 on json-pkg.
14. Line-prefix delta with markers (Z36). mixed; rejected.
15. ASTRAEA-A2 straight-line grammar (PR #13). worse than VXR on every file tested (Z36).
16. TERMINUS-T1 (PR #2). Exact, but larger than VXM on gh-prose 1910 vs 1831, readme 730 vs 693, license 1090 vs 1036 (Z38).
17. OBLIVION-O1 (PR #2). Decode rules are supplied as a SYSTEM PROMPT. Violates the single-chat constraint. Not measured further.
18. Newline vs space vs no separator in headers (Z38). 0.5 token per entry. Negligible.
19. Basename join of 151 receipts. 151 paths map to 77 basenames; the basename join mis-pairs files (Z36 bug, fixed this turn).
20. Using the stale `dae` field of the VXR receipt as a denominator (Z36 ZeroDivisionError). The field is 0 for the 40 on-disk files; the DAEDALUS receipt is the source.
21. Counting DAEDALUS identity fallbacks (20 of 151) as frontier wins. Inflates progress claims; both totals are reported here.
22. "Min over codecs" wrapper (PR #23 OPTIMAL). It is the frontier by definition, not a new surface; it is a tournament.
23. Lean-free "verification" of OpenAI proofs by reading statements. Only mechanical checks (sorry/axiom counts) were performed.
24. Assuming the LLM decodes because the legend reads clearly. Not evidence; the kit in bench/z38/llm-kit is the test.

### Modal-shortcut test (required)
- Shortcut: drop the output instruction from the legend, which lowers the count by about 8 tokens and makes the wire look
  smaller. Why it fails: the single user message must tell the model what to output; without it the message is not a
  one-chat decode. Detector: `legend-probe2.ts` counts the instruction; `vxq-pareto.py` uses the instruction-inclusive VXQ
  counts; the VXQ legend is generated only by `vxqRewireLegend`, which always includes `VXQ_INSTRUCTION` (checked by
  construction; a unit assertion would be the next test).
- Shortcut 2: count the body only. The header is ~10% of the wire (readme 77 of 693; gh-prose 182 of 1831). Detector: the
  split script reports preamble, header, and body separately, and `sumCheck` equals the total.

## 5. Mechanism portfolio (>= 6, mechanism-distinct)
| # | approach | central construction | concrete artifact | proved | unresolved interface | cheapest falsification | local or global gap |
|---|---|---|---|---|---|---|---|
| M1 | exact-count greedy phrase dictionary | single-step exact recount + cyrillic pool + look-past + decode-gated swap | `veritas-m.ts`, 151/151 exact | exactness (151 + edge 421) | selection quality vs joint rules | word-arm probe (done: 0) | global (selection) |
| M2 | token-aligned optimal parse (ARIADNE/DAEDALUS) | shortest path over symbols with Lagrangian prices | in repo (`ariadne.ts`), not re-implemented here | frontier F1 | exact-count acceptance | none run here | global |
| M3 | structural block/template factoring (CHIRON, Drain-style) | repeat/fill, column lists, slot templates | in repo (`chiron.ts`) | DAEDALUS ops numbers | integrating with M1 | padding bound (done: 2.3%) | ops gap is local to structure |
| M4 | legend economy (VERITAS-Q) | instruction-carrying minimal legend, escape-conditional | `veritas-q.ts`, 151/151 exact | exactness; counts | LLM reads the legend | the LLM kit (not run) | local (fixed cost per file) |
| M5 | rule-derived markup elision | separator and whitespace regeneration | measured bounds only | bound (0.1%; 2.3%) | — | bound already negative | negligible |
| M6 | LLM-native copy references (induction) | "repeat the line that starts with X" | none built | none | exact copy by the decoder | the LLM kit, once run | unknown (not verifiable here) |
| M7 | fixed codebook / known-form frames (ROSETTA K1/K2) | archetype frames | analysis only | — | generality | — | benchmaxxed on own fixtures; not general |

## 6. Artifacts and verification
- VERITAS-Q (`src/lib/omega/veritas-q.ts`, registry key `veritas-q`): 151/151 byte-exact through `veritasRDecode`.
  Edge suite (`bench/z38/vxq-edge.ts`, 421 cases incl. sentinel-like and escape fuzz): 421/421.
- Lane totals vs frontier (`vxq-pareto-summary.json`):
  - all 151: VXQ 333116 vs frontier 305352 (+9.09%); 26 files smaller than the frontier.
  - excluding DAEDALUS identity fallbacks (131 files): +9.97%.
  - prose: 4271 vs 4234 (+0.87%). readme 683 vs 688 (smaller); gh-prose 1821 vs 1782; license 1018 vs 1015; lic-mit, md-vite, md-react are raw.
  - ops 18066 vs 16689 (+8.25%); ops_real 12289 vs 10860 (+13.16%); fresh 253463 vs 231785 (+9.35%); wrapped 38482 vs 35324 (+8.94%); code +1.57%; realjson +1.09%.
- VERITAS-Q vs VERITAS-M on the same search: total −1376 tokens (−0.41%). The gain is the legend economy, measured.
- Gate result: Pareto-superior in at least one lane with a large general gain: NOT MET. Prose misses by 37 tokens in total,
  and the remaining gap is entirely gh-prose (39 tokens vs DAEDALUS).

## 7. Second-order adversary on VERITAS-Q
- A1 (hidden assumption: the LLM reads "# X=T" as a key definition). Strongest attack: the model reads the key lines as prose.
  Exactness depends on the model, not the codec. Status: NOT tested; the LLM kit is the only test.
- A2 (limiting regime: '~' in the body). Escape legend is used; the escape legend names '~~', '~N', '~R'. Attack: the body
  contains '~' followed by a letter that is not an escape. Status: escBody doubles every '~'; the decoder rejects unknown
  escapes; the edge fuzz covers '~'. Holds.
- A3 (quantifier order / imported theorem): none imported; the round-trip is the only verification.
- A4 (global compatibility): the wire must not start with a '# ' line that is part of a key. Keys come from aliasPool, which
  starts at U+00A1 and contains no ASCII '#'. Holds by construction.
- A5 (terminator collision): a body line equal to ']]' cannot be confused with the header terminator, because the header
  ends at the first ']]' line and header lines start with a key character. Holds.
- A6 (modal shortcut): see section 4.
- A7 (counting): the 151-file counts are from the shipped encoder and the o200k counter; the instruction is inside every
  counted message.
- Result: no attack broke exactness; the open attack is A1 (LLM reading), which is an external test.

## 8. PR review (open PRs in jyvplay/kompkernel, checked this turn)
- #26 (this session's branch): updated by the Z37 push; not re-reviewed beyond its state.
- #23 (audited one-message selector): contributes `arithmos.ts`, `aether.ts`, `codec-synthesis.ts`, `harmonia.ts`, `panacea.ts`
  (present) and absent `kalligraphos.ts` and `optimal.ts`. OPTIMAL is a min-over-candidates wrapper: no new codec surface.
  KALLIGRAPHOS restores Unicode mathematical alphanumerics: a niche class, exact by design; not measured on the corpus.
- #20, #18, #17 (benchmark and red-team suites): #17 adds `codec-map.ts`, a taxonomy file, not a codec. The rest are benchmark
  harnesses; not codec surfaces.
- #13, #11, #8, #7, #6, #4, #3: codec modules that are present in this tree (ASTRAEA, AETHER, ROSETTA variants, hyperion,
  phoenix, valence, tensor, etc.). Only #13 was measured (Z36: worse than VXR everywhere).
- #2 (STARLIGHT): absent modules TERMINUS-T1 (measured: dominated), OBLIVION-O1 (system-prompt dependent: excluded),
  CHRONOS-X1, PALLAS-P1, STARLIGHT-PRIME, YGGDRASIL-Y1 (same CJK-alias micro-header family as TERMINUS; not measured
  individually; expected dominated by VXM on the evidence of TERMINUS, which is the same family).
- Net: no open PR contributes a codec surface that beats the frontier. The absent modules are either the same dictionary family
  as VERITAS (dominated or excluded) or non-codec files (taxonomy, selector, niche normaliser).

## 9. OpenAI proofs, one by one (primary artifacts checked where possible)
- Source: `openai/ten-proofs` (cloned, depth 1, commit 94bc0fe). Mechanical checks on all 10 Lean files: sorry 0, admit 0,
  native_decide 0, axiom 0, opaque 0, unsafe 0, extern 0. The manifest lists axioms propext, Classical.choice, Quot.sound.
  Lean is NOT installed, so no file was compiled. The manifest's claims are unverified here.
- 1. Sphere packing (SpherePacking.lean): density upper bound, Cohn–Elkies threshold. Compression relevance: none (a packing
  bound). Relevance to our stack: none.
- 2. Binary and spherical codes (MetricCodes.lean): exponential upper bounds on code size at a given minimum distance.
  Relevance: an upper bound on the number of distinct messages at fixed distance; it constrains fixed-length error-correcting
  codes, not an exact lossless text codec. No construction.
- 3. Non-sofic group (NonSoficGroup.lean): existence. Relevance: none.
- 4. Connes rigidity counterexample (ConnesRigidity.lean): operator algebras. Relevance: none.
- 5. Permanent circuit/formula lower bounds (Permanent.lean): complexity lower bounds. Relevance: none to codecs.
- 6. Quantum parallel repetition (QuantumParallelRepetition.lean): quantum games. Relevance: none.
- 7. Closest vector problem hardness (GapCVP.lean): hardness of approximation. Relevance: none to lossless text.
- 8. Ehrhart volume inequality (EhrhartVolumeInequality.lean): convex geometry. Relevance: none.
- 9. Multicolor triangle Ramsey (MulticolorTriangleRamsey.lean): combinatorics (Erdős 183). Relevance: none.
- 10. Compactness and degeneracy counterexamples (CompactnessAndDegeneracy.lean): extremal graphs (Erdős 146, 180). Relevance: none.
- Called out earlier: the May 2026 unit-distance disproof (OpenAI announcement, 20 May 2026). Secondary sources report a
  construction with n^(1+0.014) unit-distance pairs, checked by a nine-mathematician companion paper. One aggregator claims a
  Lean 4 proof; the other sources do not, and I did not find the Lean artifact, so that claim is treated as unverified.
  Relevance to compression: none; it is a geometric construction. Verification evidence is human review, not a compiler.
- Conclusion: none of the ten (or the unit-distance result) yields a compression method. Their value to this project is as
  a verification-process example (formal artifacts plus mechanical checks), not as codec ideas.

## 10. Rosetta (analysis only, no measurement this turn)
- The general mechanisms in `rosetta.ts` are templated line families, columnar blocks, and run-length or arithmetic spans
  (R3/R4 families). These overlap with CHIRON (repeat/fill, columns) and are already in the frontier.
- The known-form frames (K1/K2, R5.x) are fixture-specific codebooks. They explain why the code benchmarked well on its own
  fixtures and not on general text. They do not transfer as a general codec.
- Transfer question asked by the user: can the concept be applied more broadly? The general part (structure families) is
  already in DAEDALUS; the fixture part does not generalize.

## 11. What we have missed (honest list)
1. The fixed legend tax (33 tokens per file) was not measured per file until this turn. It is ~10% of small files.
2. The output instruction was not counted in the VXR family. Fixed here for VXQ (about 8 tokens per file).
3. Frontier comparisons counted DAEDALUS identity fallbacks (20 of 151) as frontier wins. Both totals are now reported.
4. The LLM decodability constraint has been asserted for many turns and never measured. The kit is the first executable step.
5. The registry had a duplicate key (`veritas-m`) for two different codecs since 5734a57; fixed by renaming the VX entry.
6. The corpus provenance for the 111 `fresh` files is a byte-length check against the receipt, not a content hash.
7. Wide search costs up to ~137 s for ~10 KB. An ARIADNE-style symbol-space estimate would make the inner loop cheaper; not implemented.

## 12. AI-native ideas (tested or explicitly left open)
- Copy references (M6): the decoder is an LLM, which copies well from context. A reference such as "repeat the line that
  starts with X" could replace long repeated lines. Exactness depends on the model. OPEN; test with the kit.
- Define-on-first-use legends: argued to cost the same as a legend (the marker replaces the newline and key); not measured.
  Expected gain ~0. Not pursued.
- Model-checked counts (line or character count echoed back): an LLM cannot compute a checksum reliably; a count line is
  cheap but its exactness is again model-dependent. OPEN.

## 13. LLM decodability (status)
- NOT CONFIRMED. No LLM was run in this sandbox. Nothing in this turn claims that a model decodes VERITAS-Q exactly.
- Built for the external check: `bench/z38/llm-kit/make-kit.ts` (generator: 9 prompts, each a single user message with no
  system prompt, plus a manifest of SHA-256 digests; prompts are generated outside the repo) and `score.ts` (exact match by
  SHA-256). The scorer was self-tested with the originals as replies (8/9 exact, the one deliberate mismatch detected); that
  is a scorer test, not a model result.
- Decision rule for the user: a codec is decodable for the purpose of this project only if the exact-match rate on the kit
  is 9/9 for the chosen model(s), with at least 3 runs per prompt.

## 14. Remaining gap and next highest-information test
- Gap: prose lane misses DAEDALUS by 37 tokens in total (gh-prose: 1821 vs 1782). A Pareto claim needs gh-prose selection to
  reproduce DAEDALUS's ~60 useful rules at exact-count cost.
- Next test (highest information): run the LLM kit on one model with 3 runs per prompt. It decides whether the legend-based
  wire is usable at all, which dominates every token gain measured here.
- Second test: a joint-rule search on gh-prose (pair additions with exact recount), to test whether DAEDALUS's 60-rule
  selection is reachable without its arms.
