# X143 A–J gate ledger

## A/B. Model and hypotheses

Source objects are frozen valid-UTF8 text files. Correctness is exact filesystem-byte equality after reconstruction, with no whitespace/Unicode normalization. PROTASIS operates on JS strings up to50,000 UTF16 units; original tilde refuses transformation, and any folded arm exceeding the same decoder cap refuses. Standalone encoding rejects source strings beginning with either reserved contract, so raw fallback cannot collide with a transformed wire. Only ASCII letters change case; all other code units survive literally. Sentence model predicts at input start or punctuation .!? followed by one or more space/tab/CR/LF; line model predicts at line start. Predicted whitespace is skipped, other nonletters consume the boundary. Neither model claims to detect linguistic sentences.

Access: encoder sees source/tokenizer, software decoder sees message only. Native evaluator must receive the complete message in one fresh basic chat, no source/tools/system prompt/skills/fine-tuning. This agent has inspected sources and is not a blind external evaluator. Full cost includes contract, exceptions and complete parent payload. CPU, wall time, memory, decoder fidelity and token counts are separate resources.

H+: exists fixed C such that all frozen acceptance sources reconstruct exactly and meet mandatory native/runtime gates without unaccepted regressions, and at least one nonsynthetic source beats the shipped parent by>10 tokens. Broad prose/ops gain preferred; one lane is not evidence of broad dominance. H−: universal impossibility only under an explicit quantified domain and proof; failed candidates do not imply it. H∂: exact/token-positive software mechanism lacking behavioral/runtime evidence, or domain restrictions change outcome. Zero byte tolerance. Timing uses balanced ABBA/BAAB, four observations per arm/source, not an after-the-fact threshold or statistical-significance claim.

Adjacent problems excluded: lowercase normalization, linguistic truecasing, retrained vocabulary, latent vector input, external executable decompression, semantic question answering instead of reconstruction, hidden shared dictionaries, byte savings instead of billed tokens, stripped formatting, oracle source lookup, and proof compilation without statement alignment.

## C. Frontier and bounds

Fresh29-lane deterministic TAGSTACK rerun required; X142's11,962 is a comparator, not assumed new evidence. Unchanged default means PROTASIS and speed hook remain unwired pending gates. Prior PTYCHE/KREMA token winners retain NOT_RUN native status; X142 packets are hash-checked, not newly decoded by a model.

Counting obstruction: an injective codec on N source objects needs at least N messages; at most k tokens over V symbols supplies at most sum(i=0..k)V^i. Consequently V^n distinct objects cannot all receive descriptions shorter than n. This does not rule out improving our small suite, nor give a lower bound for prose. Conditional inverse proof for PROTASIS is state induction in research.md. Fixed local predictor is not an optimal compressor. Every imported paper's model/training/access differences are recorded there.

## D. Negative space —20 shapes

1 unpaid header;2 raw-only saving;3 missing exception tape;4 lowercase/uppercase collision;5 Unicode case expansion silently applied;6 NBSP treated as ASCII space;7 CRLF changed;8 tilde literal consumed;9 folded input beyond decoder cap;10 synthetic stress fixture sold as workload gain;11 selecting heldouts after pricing;12 counting parent.decoded as an independent wire proof;13 unsupported reader counted as pass;14 short local prices summed as final cost;15 software inverse called native reading;16 cache/microbenchmark result called whole-stack speedup;17 fewer search candidates called fidelity-preserving acceleration;18 source/config/CI metadata called local kernel replay;19 later-dated current page called contemporary evidence;20 one sample called universal LLM exactness.

Modal shortcut: “LLMs know capitalization” says nothing about exact case restoration on abbreviations, quotations, unconventional lowercase starts or markers. Detect via frozen source-free one-message trial and unedited byte comparison. Actual native status remains NOT_RUN; no simulator substitutes for it. Ordinary lowercasing maps `A` and `a` to the same string; our ready-state encodings distinguish `a` and `~a`.

## E/F. Mechanism portfolio, each with artifact

| Approach | Construction / artifact | Proved or tested portion | Unresolved interface | Cheapest falsifier / gap |
|---|---|---|---|---|
| Conditional case prediction | protasis.ts, unit.ts, coldread.py | finite-state inverse + exceptions | complete-message cost, native reading | NBSP/quoted boundary/cap attacks; local correctness, global behavior |
| Backward references | reused controls.ts | independent COPY/ADD program roundtrip | token cost and native indexing | all-in price, actual output; original behavioral gap |
| Statistical coding | Brotli control | exact bytes after binary decoder | no-tool native readability | base64 price/actual chat; access-model gap |
| Numeric residual prediction | delta_control.ts | standalone exact numeric fold | parent interference/cost | formatting and all-in price; local composition gap |
| Transformed grammar images | image_census.ts | bounded occurrence census | sufficiently many paying families | zero pairs; local opportunity gap |
| Parametric layout | X142 frozen PTYCHE/KREMA packets/grader | inherited token/software results, hashes rechecked | blind native evaluation + full runtime | single basic chat and byte grader; behavioral gap |
| Allocation-free tail fold | tail-experiment.patch, tail_unit.ts, speed.ts | exact TailInfo/count equivalence | isolated whole-stack speed | mode transitions, whitespace, full message identity; local performance gap |
| Encoding-padding audit | encoding_audit.py | explicit length identity and2,066 finite checks | claimed SAT algorithm and proof | violate formula-length bound; local interface, not whole theorem |

These are distinct mechanisms/controls, not eight new inventions. PROTASIS is a new repository experiment in the classical predictive-residual family; STENTOR/MORPH/EIKON are acknowledged relatives. Full source inventory is not an exhaustive semantic novelty proof.

## G. Structural attackers

Case predictor: terminal punctuation without whitespace; multi-punctuation sequences; abbreviations; quoted next letter; leading blank lines; CRLF; non-ASCII whitespace; surrogate pairs; unpaired surrogate tests; uppercase residual after a predicted letter; malformed/stray marker; literal tilde; repeated calls with no state carry; max input and expansion beyond cap. Mechanics tests are explicitly not gain evidence. Independent Python regex implementation differs from encoder's state-machine implementation.

Tail fold: all-whitespace and empty input, last solid chunk followed by several whitespace chunks, BOM, Unicode/surrogate boundaries, both encodings, mode transition and cache reset. Compare complete TailInfo object and library counts, not just total count. Prefix and tail integer sums remain exact; no loop changes search budget.

## H/I. Verification and repairs

No independent model/prover/agent executed. TS inverse, separate Python wire reader, reference tokenizer, typecheck and source hashes are different evidence layers. Unsupported parents stay unsupported. Planner was repaired to refuse exception-expanded payloads over50,000 units; new attack has49,998 units of lowercase lines followed by a capitalized line. Unit tests and plan comparisons reran after the cap/envelope repair. Later making the LF delimiter explicit changed the email model choice, so cheap repricing was rejected and all5 canonical parent trials were rerun. Header wording can alter a cost-based selector; semantic clarification inherits no economic trust. The experimental speed patch is reversed immediately after building bundles; output equality gates are mandatory.

## J. Stopping / next test

Never merge based on a codec file existing or a cache test passing. No native verification means no full H+ certification. A failed casing predictor suggests the next question is whether recoverable case entropy can pay any header under the existing vocabulary, not a wider unpriced truecasing model. Highest-information behavioral experiment remains X142's frozen PTYCHE/KREMA model trial. If speed evidence is small/mixed, reject deployment rather than inflate a micro-optimization. Final exact outcomes and incomplete requirements belong in README/receipts.
