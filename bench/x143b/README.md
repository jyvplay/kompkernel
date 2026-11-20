# X143b — METABOLE (META), unwired lexical suffix edits

## Contract and scope
Domain: JavaScript strings up to 50,000 UTF-16 units without `^`; encoder identity fallback outside this domain, except reserved instruction envelopes are rejected. Lexemes are maximal ASCII `[A-Za-z0-9_./-]+` runs. History stores the last decoded lexeme by first character. A marker copies that reference minus a suffix and appends a literal suffix. No external dictionary or training. For valid UTF-8 fixtures reconstruction is checked against source files; arbitrary invalid UTF-8 files are not covered by string APIs.

The inverse invariant is equal decoded prefix and equal bucket maps after every lexeme. Literal separators preserve the invariant. Each marker applies the same suffix change to the same bucket reference; the reconstructed word updates its bucket. Boundary, history, integer syntax, and output-cap checks reject malformed messages. This argument is not a machine-checked proof.

Two greedy local screens (token savings >=0 or >=1 and shorter wire characters) produce candidate tapes. Complete instruction plus payload is priced; local savings are not additive guarantees. Parent search takes one plan/source, top six by raw payload savings, with no claim this ranking is admissible. Complexity includes tokenizer calls; decoder uses bounded strings, encoder tokenizes each proposed edit and each complete plan. Parent runtime is measured, not bounded by the lexical scan. This is not deployed into TAGSTACK.

H+: complete message beats shipped lane by >10 tokens, source bytes exact, blind native one-chat reconstruction passes, and noninferior whole-stack time. H−: measured lane loses after complete pricing or fails fidelity. H-boundary: program-exact but native untested, omitted parent arms, finite test generalization. None of these boundary cases establishes H+.

## Six mechanism tracks and falsifiers
1. META bucketed suffix edits: new executable module and probe/parent receipts; falsifier is complete wire cost or history mismatch.
2. PROTASIS capitalization residuals: X143 artifacts, 33 prices/no wins; falsifier already observed.
3. PTYCHE layout: X136 artifacts and frozen X142 packet; native gate remains NOT_RUN.
4. KREMA structural representation: X137 artifacts and frozen X142 packet; native gate remains NOT_RUN.
5. EUTAXIA field ordering: X142 artifacts, 83 prices/no wins; source order metadata is mandatory.
6. Exact tokenizer scheduling: X136 heap and X143 tail patch; differential audit rerun here; X143 mixed end-to-end results reject a broad-speed claim.
These are distinct tracks, not six newly invented or freshly rerun methods.

## False-solution detector
Reject: raw-only comparison; omitted instructions; omitted parent tape; favorable-only sources; changed tokenizer; byte/token conflation; equality called gain; encoder self-report called external verification; program inverse called native reading; warm-cache microbench called whole-stack speed; concurrent timings called causal speedup; renamed prior codec called invention; local screen called exhaustive search; unsupported reader called pass; malformed UTF-8 normalized silently; unexecuted proof called verified; hypothetical evaluator called an agent; untested repair inheriting old passes.
Structural attacks include caret collisions, missing reference, excessive drop, leading-zero count, marker adjacent to lexemes, output expansion cap, CR/LF/NUL/Unicode preservation, and history evolution. Unit test expected spelling was repaired after an assertion exposed the fixture error; the decoder behavior was correct. Tests rerun after repair.

## Research and external verification
Fresh search: *Practical Compressed String Dictionaries* (2015), https://users.dcc.uchile.cl/~gnavarro/ps/is15.2.pdf ; *Improved Compressed String Dictionaries* (2019), https://lbd.udc.es/Repository/Publications/Drafts/1706046652539_2019_StringDictionaries.pdf ; *OnPair* (2025), https://arxiv.org/html/2508.02280v1 . Search excerpts only, not complete paper/proof reviews. Front coding is classical: META changes reference selection and wire syntax, not the mathematical primitive. Existing DIRFOLD/ANAPHORA/MNEMA constrain novelty; targeted repository inspection is not an exhaustive semantic uniqueness proof. OnPair's trained dictionaries and byte/random-access objective do not establish native LLM decoding.

No independent agent, blind native evaluator, or Lean kernel is available in this session. Earlier individual lab-claim source inspections remain source inspections, not proof validation; no fresh exhaustive lab audit was performed here. The highest-information next test is actual blind evaluation of the frozen KREMA/PTYCHE packets. Today's environment date is 2026-11-14; contradictory dates in carried session summaries are not evidence.

## Integration decision
Merge permission is unconditional as to research outcome, not permission to describe losers as winners. New codecs remain unwired. Runtime production change inherited from X136 fixes long-buffer token counting and uses ranked adjacency merges; its differential audit, TypeScript check, and application build are rerun here. No new broad Pareto superiority or significant whole-stack acceleration is established. Final measured counts are in `receipts/summary.json`.

## Final measured result
Fresh frontier: 29 lanes / 11,962 tokens, every message identical to X143.
META: 21 standalone + 6 composed prices, zero frontier wins. Composed A→B:
ls-l 1310→1326; kubectl 300→394; ls 414→520; apt 813→955;
ps-aux 980→1062; prices 118→278. These are negative results, not superiority.
2,008 unit assertions; 235 tokenizer differential checks; independent Python
replay of all 21 standalone source byte strings. Final gate: 56 reference-tokenizer
prices, 46 supported source-byte reads, 10 unsupported formats explicitly listed.
TypeScript and application build pass. No new heldout trials or native trial.
Concurrent wall times are not causal speed comparisons. Refreshed category totals:
PROSE 3429, OPS 5580, CODE 2636, OTHER 317; class leaders unchanged.

PR ancestry: the local working snapshot started at main's base while the remote
PR retained its earlier X134 commit. All remote files were retained in the staged
snapshot (no remote-relative deletions); modified remote files were reviewed.
An ancestry-only merge preserves this accumulated X134–X143b working snapshot,
allowing a normal non-force push to the same session branch.
