# X142 A–J research contract and adversarial ledger

## A. Formal model

Objects: finite UTF-8 source files; reference bytes, not encoder annotations, are truth. EUTAXIA's transform domain is printable ASCII plus LF, <=50,000 code units and <=1,000 split lines. A run has >=8 lines for admission; its selected whole-line key or space-separated field1..16 is nonempty, pairwise distinct and strictly monotone in the declared direction. Numeric keys are unsigned1..30-digit integers compared with BigInt; leading-zero spelling remains literal but equal numerical keys refuse. Full encoder retains the shipped parent as fallback for other inputs.

Access: encoder sees source and tokenizer; software decoder sees only message. In-band header specifies run range, key and order. Parent payload is decoded first. Native evaluator must see only that single message in a fresh ordinary chat, no skills/system prompt/tools/source or saved source state. Current agent has seen benchmark sources: a hand reconstruction by this agent would not be blind independent verification.

Resources: whole-message installed o200k tokens; raw source bytes; end-to-end encoder CPU/wall time and memory; decoder behavior separately. Parent's fixed deterministic search configuration is frozen. No instruction or permutation charge is omitted. CPU measurements concurrent with other jobs are descriptive only.

Quantifiers: empirical H+ requires existence of a fixed implementation C such that for every source in the frozen acceptance suite byte reconstruction is exact, token cost is no worse than baseline, mandatory native/readability and runtime gates pass, and for at least one nonmechanics source token saving exceeds10. Broad prose/ops benefit is preferred, not inferred from a single ops case. This does not prove for every future input or every LLM. Runtime fallback still pays planning and candidate search; a token-min tournament alone is not Pareto dominance. All byte comparisons have zero tolerance. Timing needs isolated balanced repeated trials and declared endpoints; no timing tolerance is selected after seeing outcomes.

## B. Outcome space

H+: threshold above met, with claims restricted to tested systems/sources. H−: impossible under a precisely specified universal domain, requiring proof (e.g. counting obstruction); a failed experiment is only a candidate failure. H∂: source-domain/key/native-evaluator boundary changes the answer, or exact/token-positive candidate lacks another gate. No automatic promotion from H∂ to H+.

Adjacent nonanswers: arbitrary row permutation, database set semantics, lossy summary, normalized prose, retrained tokenizer, learned latent vectors, binary decompressor with tools, hidden standard-text dictionary, output-free queries on compressed data, lower byte count rather than token count, microbenchmark acceleration, kernel-valid theorem with wrong specification, and reference decoder versus native comprehension.

## C. Frontier and open interface

X141 shipped baseline29/11,962 is rerun independently in X142, not assumed from a cached result. Exact messages compared after completion. Prior PTYCHE620→608 and KREMA846→831 remain token evidence with native gate unrun. Frozen packets and byte-only grader now make that pending experiment reproducible; preparation is not execution.

Counting lemma: an injective codec for N objects needs N distinct messages; at most k tokens over alphabet size V supplies at most sum(i=0..k)V^i messages. Thus V^n distinct objects cannot all have descriptions shorter than n. `bounds.py` checks32 finite instances. This is not a lower bound on our corpus. EUTAXIA proof: strict total key order uniquely determines the run; rearrangement preserves exact line strings and set of keys; sorting yields precisely the original run; outside lines/LF separators remain unchanged. Any duplicate key or unverified original ordering breaks the premise.

## D. Negative space —20 false result shapes

1 raw-only saving;2 unpaid header;3 omitted permutation;4 silently changed duplicate order;5 locale sort vs ASCII;6 Number rounding of wide integers;7 lost final LF/CR;8 source lookup hidden in decoder;9 parent self-report called independent;10 unsupported reader counted as pass;11 prefix-scoring sum called final price;12 synthetic fixture sold as real workload;13 heldout selected after pricing;14 search-budget reduction sold as speed;15 concurrent timing sold as causality;16 cache hit sold as new compression;17 vendor CI success sold as local proof;18 skipped verification job sold as successful check;19 vocabulary/bit coding theorem imported as chat-token theorem;20 one observed LLM success sold as universal native exactness.

Modal shortcut: “a model could sort/copy this” does not establish “this model outputs the exact bytes from one message.” Detector: send frozen packet in a fresh model session, save unedited UTF-8 output, run `grade_native.py`; fences, extra newline or explanations fail. Status here: NOT RUN. Structural shortcut detector: `bounds.py` has two different row orders collapsing to the same sorted wire, demonstrating why arbitrary sorting is not lossless.

## E. Independent mechanism portfolio

| Mechanism | Construction / concrete artifact | Established portion | Unresolved interface | Cheapest falsifier / gap |
|---|---|---|---|---|
| Endogenous ordering | eutaxia.ts; unique source key restores any cluster order | uniqueness proof, TS/unit and independent reader | full parent savings/native sorting | duplicate numeric keys, locale mismatch; local admission, behavioral global |
| Lexical/dictionary transformed images | image_census.ts reused from X141 | bounded phrase-family census | enough families to pay image contract | zero eligible pairs; local opportunity gap |
| Backward text copying | controls.ts, copy arm | program inverse on real sources | complete-wire savings and native index handling | full token price; same original behavioral gap |
| Statistical binary compression | controls.ts Brotli arm | compressed bytes roundtrip | ordinary-chat decoding with no executable | base64 token cost + actual native test; original access-model gap |
| Numeric predictive residual | delta_control.ts reused | exact standalone delta test | parent interference and metadata price | wide values/format and full-message pricing; local vs native gap |
| Parametric layout | frozen PTYCHE/KREMA packets + grade_native.py | historical software/token wins | blind native reconstruction and paid runtime | actual one-message output; behavioral original gap |
| Hash placement acceleration | rank-hash.ts, patch, hash_unit.ts, hash_census.ts, speed.ts | full-key collision resolution; differential equality | isolated whole-stack improvement and production branch overhead | hostile collisions, stale table mode, balanced timings; local performance gap |
| Universal strict compressor | bounds.py | finite counting obstruction | no useful workload-specific optimality | cardinality inequality; global impossible on stated domains |

These are mechanism-distinct controls, not eight newly invented codecs. Only EUTAXIA is the new codec experiment. Common fixtures do not make their mechanisms identical; prior code is reused rather than renamed.

## F/G. Artifacts and strongest structural attackers

EUTAXIA: numeric01/1 collision, integers above2^53, equal lexical keys, empty/missing fields, out-of-range run, trailing spaces, final LF, CR, Unicode, source-range isolation. Strict refusal prevents normalization. Unit fixtures deliberately exercise ascending/descending and lexical/numeric orders. Fresh /usr/bin command output and tokenizer README are frozen before their first pricing.

Hash placement: probe wraparound, colliding full keys, signed32-bit arithmetic, insert/lookup slot agreement, shadowed invalid-UTF vocabulary entries, malformed surrogate/BOM, library regex mutation, changing hash mode after populated tables. Mode toggle rebuilds index; caches reset equally. Full key comparisons, not hash equality, authorize a hit. Existing X72 differential harness reused, including before/after library count,20,000 generated attacks, and repository windows. Generated attacks are tests, not simulated workload wins.

Imported math: test quantifiers and transitive definitions rather than headline. Axiom generating-support assumptions now explicit; DeepMind alternate-kernel flag false; Anthropic real ETH build job distinguished from skipped newest job. See research.md for evidence and remaining limits.

## H/I. Verification and repair

All accepted source comparisons bind to filesystem bytes, independent reader consumes English header rather than source/planner metadata. Unsupported parent grammars are reported. Native and prover gates remain separate. Wrapper addition inherits no trust: structural unit rerun; incomplete/foreign parent rejection must occur before selecting candidate. Hash patch is applied only while building experimental bundles, then reversed; its differential gates and full-stack identity assertions must pass before any deployment decision. No package-manifest drift is needed.

## J. Stopping / merge

Do not claim H+ or merge merely because new code exists, a benchmark wins, or a green badge exists. Failure to establish native decoding is a real remaining gate. Highest-information behavioral test is now the frozen PTYCHE/KREMA native packet trial, not another self-review. Highest-information EUTAXIA followup is to separate actual parent gain from instruction overhead and avoid repeating zero-opportunity prose sweeps. Hash experiment requires isolated full-stack evidence; insertion-probe ratios are not speed ratios. Final results and exact unmet conditions belong in README and receipts, with no fabricated success.
