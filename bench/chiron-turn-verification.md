# CHIRON turn verification receipt

Date: 2026-09-26 UTC. This is a fresh receipt for this checkout, not a restatement
of the historical numbers in `bench/chiron-report.md`.

## Runtime honesty

Available and used:

- Node `v22.22.3`
- TypeScript `5.9.3` and Vite `7.3.6`
- `esbuild` from the repository's dependencies
- CPython `3.11.2`
- the repository's live `gpt-tokenizer` `o200k_base` implementation
- `git`, `gh`, shell tools, `npm`, and web search

Not available or not used: an LLM API, a local language model, a GPU, a theorem
prover, a simulator, or independent software agents. No claim below says that an
LLM read a wire. The independent reader checks are ordinary programs: TypeScript,
CPython, and the library decoder.

Commands actually run:

```text
npm ci --ignore-scripts
./node_modules/.bin/tsc --noEmit
npm run build
git diff --check
python3 -m py_compile bench/chiron_decode.py
esbuild bench/chiron-redteam.ts --bundle --platform=node --format=esm \
  --outfile=bench/tmp/chiron-redteam.mjs
node bench/tmp/chiron-redteam.mjs
```

The full `chiron-frontier.ts` executable was also started. It did not finish in
the available 1,800-second command window, so no full-frontier result is claimed.
The focused sample below is the completed substitute; it is not a replacement for
the unfinished full frontier.

## A. Contract model

### A1. Admissible objects

For an input UTF-16 string `x`, an exact codec is an encoder and decoder with
`E(x) = w` and `D(w) = x`. A shipped result also carries a generated decoder
contract `P(w)`. The permitted wire language is ordinary Unicode text; CHIRON,
ARIADNE, SIBYL, SEQUOYAH, THOTH, PALIMPSEST, and DAEDALUS share the CHIRON
self-describing program language.

### A2. Access model

The reader is given one ordinary chat message containing the generated contract
and the wire. There is no system prompt, `skills.md`, previous turn, tool call,
retrieval, or private dictionary. The tested message is exactly `P(w)` as emitted
by the codec. This tests a programmatic proxy for the requested direct-readable
contract; it does **not** prove that every LLM will execute the prose correctly.

### A3. Counted resource

For encoding `enc`,

```text
I(x) = tokens(x, enc)
W(x) = tokens(w, enc)
M(x) = tokens(P(w), enc)
```

`M` is the decision metric. `W` is diagnostic only. Encoder milliseconds are a
separate Pareto axis. The tests use `o200k_base`.

### A4. Success and failure

A candidate succeeds on a lane only if, in this order:

1. its program decoder returns exactly the original UTF-16 string;
2. the independent prompt-literal reader returns the same string;
3. the CPython reader returns the same UTF-8/JSON-representable test string;
4. `M == tokens(P(w), enc)` and the contract contains no unused operator clause;
5. `M <= I` (the message gate); and
6. for a claimed improvement, `M <` the declared incumbent on that lane.

The exactness, reader-agreement, accounting, and no-regression conditions are
universal over the tested corpus. A numerical improvement is existential per
lane; it is not a claim of universal compression.

### A5. Regime and boundary conditions

The red-team suite covers empty and short strings, ASCII, Unicode scripts,
control characters, astral characters, lone surrogates, bidirectional text, CRLF,
frame characters, malformed frames, 50,000-character runs, structured records,
English prose, code, and hybrid operational messages. Equality is exact code-unit
or byte equality as applicable; there is no normalization or tolerance. The hard
speed gate is less than 30 seconds per red-team input for the tested encoder.

### A6. Non-substitutable adjacent problems

These are not silently counted as wins:

1. gzip/xz/brotli binary file compression;
2. arithmetic/range coding with a binary decoder;
3. lossy prompt compression;
4. semantic summarization;
5. retrieval plus a shared dictionary;
6. a system-prompt or `skills.md` codebook;
7. fine-tuned or model-specific soft tokens;
8. continuous memory-token or embedding compression;
9. a tokenizer retrained together with the model;
10. a codec whose wire is not ordinary chat text;
11. wire-only minimization while hiding contract cost;
12. a fixed domain schema passed off as general prose compression;
13. a result shown only on training fixtures;
14. a probabilistic decoder with no exact round-trip gate; and
15. an LLM following an unstated convention.

## B. Outcome space

- **H+** is established for several structured and repetitive lanes, and also for
  the sampled English-prose lane: the new grammar/assignment family measured below
  beats identity and the older exact baseline on those lanes.
- **H-** remains the correct status for arbitrary short or heterogeneous text
  where the message gate selects identity. No universal improvement is claimed.
- **H∂** is the global result: the answer depends on repetition, record structure,
  punctuation density, token-run merge density, and input size. The gate is
  essential and intentionally returns raw text on losing lanes.

Evidence threshold used for accepting an implementation change: compiler and
production build success, exact three-reader agreement, deterministic output,
message-cost accounting, message gate, adversarial fuzzing, and a completed
focused measurement. The repaired SIBYL budgeted path met this threshold; the
full frontier did not complete and is not used as evidence.

## C. Frontier and imported research

The repository's strongest tested mechanisms are grammar/block programs, shortest
parses over a mined dictionary, tokenizer-aware glyph assignment, single-token
rules that exploit BPE runs, and portfolios that select parameters per input.
Their exact open interface is joint optimization of dictionary, parse, glyph
assignment, and contract-aware rendered token cost. The classical grammar results
optimize grammar size, not `M`; tokenization results optimize a model's tokenizer,
not a fixed deployed tokenizer and one-chat contract.

New external searches this turn found the following relevant but non-admissible or
conditional directions:

- Dynamic grouping with hierarchical BPE (Findings of EMNLP 2025) supports
  grouping token spans, but it changes/model-trains a representation and does not
  provide this repository's one-message exact reader.
- PickyBPE (EMNLP 2024) and R-BPE (EMNLP 2025) improve or adapt tokenizers. They
  require tokenizer/model changes, so they cannot change the deployed
  `o200k_base` vocabulary here.
- Test-Time Steering for Lossless Text Compression via Product of Experts
  (Findings of EMNLP 2025) is relevant to binary arithmetic coding but needs a
  probabilistic model and a binary decoder; it is not directly model-readable
  under this contract.
- ByteFlow (arXiv:2603.03583, 2026) is a tokenizer-free learned model. It is an
  architectural/training direction, not a drop-in exact text program for an
  unmodified chat model.
- The 2026 AI-mathematics search returned claims about OpenAI's Navier--Stokes
  release and other Lean artifacts. A Lean kernel can check a formal theorem, but
  those results do not provide a new lossless chat-codec construction. They are
  also not independently reproduced in this checkout, so they are not used as
  verification.

The August/September 2026 reports were therefore treated as hypotheses, not as
proof of a codec gain. No theorem prover was available or run here.

## D. Negative space: attractive non-solutions and tests

1. Summarize English. Fails exactness; test `decoded === input`.
2. Drop articles/function words. Fails exactness; mutate a sentence containing
   `a`, `the`, `of`, and `to` and compare bytes.
3. Use gzip or xz. Fails ordinary-chat readability; pass the wire to the prompt
   reader with no binary middleware.
4. Put a dictionary in the system prompt. Violates the access model; remove the
   system prompt and require the single message to remain sufficient.
5. Use a fine-tuned compressor. Violates the unmodified-reader boundary; run with
   a base model or no model-specific component.
6. Use soft/continuous memory tokens. Violates text-only wire; inspect for
   embeddings or special model-side state.
7. Optimize only `W`. Recompute `M = tokens(contract + wire)`.
8. Always emit the full contract. Unused clauses inflate `M`; G5 catches them.
9. Always frame identity. The message gate catches a frame that costs more than
   raw input.
10. Use a fixed JSON/CSV schema as a universal codec. Feed English prose and
    require exact fallback.
11. Use a global best codec on mixed text. Concatenate prose, JSON, code, and
    RLE; compare with region-aware candidates.
12. Use overlapping replace-all rules without a final parse. Feed overlapping
    phrases and compare against the exact decoder.
13. Insert glyphs inside tokenizer segments. Count the rendered wire, not a symbol
    estimate; G14 measures the estimate drift.
14. Use an unsafe frame sentinel. Put the sentinel and separator in the payload;
    require total decode and forced wrapping.
15. Assume one-token rule references always cost one token. Make a maximal run of
    assigned glyphs and count the live tokenizer; SIBYL/SEQUOYAH target this exact
    shortcut.
16. Trust a wall-clock search as deterministic. Encode twice under load and
    compare wires; this caught SIBYL before the repair.
17. Run every portfolio arm on every keystroke. Measure latency on a mixed sample;
    compare against the incumbent and use a bounded arm.
18. Claim a full frontier after a timed-out benchmark. Require a completed output
    file; this turn explicitly downgrades the unfinished frontier.

## E. Mechanism portfolio

### E1. CHIRON structural program

- Construction: self-carried rule tape, repeat/fill blocks, lists/ranges, and
  exact message-cost gating.
- Artifact: `src/lib/omega/chiron.ts` and `bench/chiron_decode.py`.
- Proved portion: library, independent TypeScript prompt-literal reader, and
  CPython reader agree on all completed red-team cases.
- Unresolved interface: optimal grammar plus rendered-token/contract cost.
- Cheapest falsification: run `node bench/tmp/chiron-redteam.mjs` and inspect G1-G9.
- Gap: global; choosing the best grammar is not solved by the decoder proof.

### E2. ARIADNE symbol-space shortest parsing

- Construction: suffix-automaton/maximal-repeat mining, Aho--Corasick occurrence
  indexing, dynamic-programming parsing, hierarchical re-mining, and live glyph
  assignment.
- Artifact: `src/lib/omega/ariadne.ts`.
- Proved portion: fixed dictionary parsing is a DAG shortest path; exact rendered
  wire is counted after assignment.
- Unresolved interface: joint dictionary/parse assignment optimization.
- Cheapest falsification: compare `estimate` with exact wire tokens and check
  `decoded === input`.
- Gap: equivalent to the original joint optimization problem.

### E3. SIBYL single-token rules

- Construction: admit one-token expansion rules only when adjacent references form
  a cheaper BPE run; use a pooled alphabet and exact rendered-cost admission.
- Artifact: `src/lib/omega/sibyl.ts`; the new fast-budget arm is deterministic and
  disables only structural blocks/local search under an explicit small budget.
- Proved portion: all accepted candidates are live-tokenizer priced and exact;
  red-team determinism now passes for the budgeted suite.
- Unresolved interface: best joint word/phrase set and global assignment.
- Cheapest falsification: `G10` and `G12`, plus the word-rule ablation.
- Gap: global.

### E4. SEQUOYAH assignment search

- Construction: deduplicated reference-run patterns, sparse delta evaluation,
  tabu/n-gram moves, and fixed iteration counts.
- Artifact: `src/lib/omega/sequoyah.ts`.
- Proved portion: assignment probes rescore only affected runs but use the live
  tokenizer; output is work-bounded and deterministic in its own path.
- Unresolved interface: BPE token cost is not pairwise-additive, so a global QAP
  optimum is not proved.
- Cheapest falsification: run the same input twice and compare the complete wire;
  then compare rendered tokens after every accepted move.
- Gap: global.

### E5. THOTH algorithmic mining

- Construction: suffix automaton and Aho--Corasick replace repeated span/key
  sweeps; finite search arms and pooled assignment.
- Artifact: `src/lib/omega/thoth.ts`.
- Proved portion: candidate generation/indexing is algorithmically finite; exact
  output still passes the shared decoder and message gate.
- Unresolved interface: maximal repeats are not necessarily the best grammar under
  the two-part rendered objective.
- Cheapest falsification: compare candidate sets and final exact costs with a
  brute-force small-string oracle.
- Gap: global.

### E6. PALIMPSEST/DAEDALUS portfolios

- Construction: score complete configurations on `M`; DAEDALUS predicts an arm
  from O(n) features and limits the number of arms.
- Artifact: `src/lib/omega/palimpsest.ts` and `src/lib/omega/daedalus.ts`.
- Proved portion: a measured candidate is never admitted without exact decode and
  message accounting; PALIMPSEST's finite candidate min can only beat its own
  evaluated incumbent, not an unmeasured global optimum.
- Unresolved interface: prediction generalization and the untested arms.
- Cheapest falsification: held-out lanes with a different punctuation/repetition
  distribution; record prediction hit rate and wall-clock.
- Gap: local for the candidate minimum, global for the true optimum.

## F. Second-order adversary

The attacker for each candidate is input-specific: for CHIRON it places frame
characters, malformed rule tapes, huge counts, and separator collisions; for
ARIADNE it creates overlapping repeats and hapax-heavy prose; for SIBYL it uses
isolated one-token words, adversarial glyph adjacency, and token-boundary changes;
for SEQUOYAH it creates repeated run patterns whose best spelling needs a
three-to-five-character token; for THOTH it creates non-maximal repeats; and for
portfolios it makes the classifier choose the wrong arm. The completed suite
included 120 adversarial payloads, 54 targeted second-order attacks, 400 fuzz
cases across the encoders, malformed-wire probes, and repeated determinism checks.
All exactness/gate assertions passed after the budget-arm repair.

## G. Completed verification receipt

The fresh red-team run completed with:

```text
PASS G1  282/282 exact library round-trips
PASS G2  282/282 prompt-literal reader agreement
PASS G3  CPython 279/279 byte-identical (3 lone-surrogate cases skipped)
PASS G4  132 malformed probes, 0 anomalies, stable re-decode
PASS G5  282 exact message-accounting checks
PASS G6  222 framed, 60 raw, 0 forced-wrap, 0 violations
PASS G7  120/120 adversarial payloads
PASS G8  54/54 targeted attacks
PASS G9  1200/1200 structured fuzz assertions
PASS G10 36 repeated encodes; CHIRON 0, ARIADNE 0, SIBYL 0 nondeterministic
PASS G11 7 non-wire probes
PASS G12 351.9 seconds total over 282 inputs; worst 28.406 seconds
PASS G13 8 lanes, 372 wire-token assignment saving, 0 harmful assignments
PASS G14 17 framed lanes; worst estimate drift 8.59%
14/14 gates passed
```

The historical 12-gate report predates the fast-budget repair and must not be
quoted as the current receipt.

## H. Focused completed sample

These are fresh `o200k_base` measurements from `bench/tmp/codec-sample.ts`; all
rows had exact library round-trips. `M` is the one-chat count.

```text
lane    I     HERMES  CHIRON  ARIADNE  SIBYL  SEQUOYAH  THOTH
prose   1934  1929    1839    1827     1782   1818      1824
json    1600   347     192     188      188    198       198
hybrid  2357   564     262     254      254    254       254
report   261   261     261     261      261    261       261
```

Measured default wall-clock on the sample was approximately: ARIADNE 1.3s on
prose, SIBYL 19.0s, SEQUOYAH 4.5s, THOTH 3.7s, PALIMPSEST 13.4s, and DAEDALUS
11.8s. These are local sandbox measurements, not universal performance claims.
The significant measured gain is SIBYL's 147-token reduction versus identity on
this prose lane and CHIRON/ARIADNE's large gains on structured/hybrid lanes; the
trade-off is encoder time.

## I. Repair and new attack

The patch added a deterministic fast-budget SIBYL arm. It is selected only when
an explicit caller budget is `<= 4000 ms`; the historical full portfolio remains
the default API path. The arm disables the clocked structural block/local-search
passes, uses fixed finite limits, tries no-word and one-word configurations, and
reprices the final rendered wire.

The repair was not trusted automatically. It was re-run through TypeScript, Vite,
three-reader exactness, fuzzing, message accounting, and determinism gates. The
new attack was repeated encoding under cache-warm and cache-cold conditions on
English prose, structured records, hybrid traffic, frame characters, malformed
wires, and long runs. G10 and G12 passed; the worst completed lane stayed below
30 seconds.

## J. Stop condition and remaining gap

The implementation is accepted as an exact, directly specified, text-only codec
family for the tested lanes. It is **not** accepted as a terminal codec or a
universal theorem of optimality. The exact remaining gap is joint optimization of
(grammar, parse, glyph assignment, operator choice, partition, and rendered
one-chat contract cost) over arbitrary strings. The next highest-information test
is a completed held-out, dual-encoding frontier run with a hard per-input budget,
then a small-input exhaustive oracle for all grammars up to a fixed rule count.

No three additional codec-repository `.txt` patches were present in this checkout;
the `.txt` files present are corpus fixtures under `bench/holdout` and
`bench/train`, not patch payloads. They were therefore not adopted or scored as
codec repositories. The repository's reachable GitHub PR list was inspected, but
no unprovided attachment was invented or substituted.
