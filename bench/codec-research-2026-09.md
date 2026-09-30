# Exact one-chat codec research receipt — 2026-09-30

This document records what was **actually** built and tested in this checkout.
It is not a claim that a universal or terminal codec has been found.

## Runtime honesty

Available and used in this run:

- local source inspection, `git`, Node 22/npm, TypeScript 5.9, Vite 7,
  `gpt-tokenizer`'s `o200k_base` encoder, and CPython 3;
- `npm ci`, `npx tsc --noEmit`, and `npm run build`;
- local TypeScript fixture/red-team programs and two independent CPython
  decoders (`arithmos_decode.py`, `kalligraphos_decode.py`);
- web search and retrieved public pages/preprints.

Not available or not used: a theorem prover, a native entropy coder, a trained
compression model, a GPU experiment, a production API model, or independent
human/expert review.  In particular, no external LLM was asked to execute the
new inline contracts.  Therefore *the contracts are visible in a single chat
message and mechanically decoded by independent programs; actual behavioral
reliability of an arbitrary chat model remains unverified*.

## A. Formal model

1. **Admissible objects.** Input is an arbitrary JavaScript Unicode string
   `x` (UTF-16 source sequence). A codec produces a Unicode string `p`.
   A deterministic decoder `D` must satisfy `D(p) === x`, including glyph
   script and all source code units. For the two additions, candidate spans are
   limited to one of five native decimal systems (ARITHMOS) or one of seven
   contiguous Mathematical Alphanumeric styles (KALLIGRAPHOS).
2. **Access model.** The encoder sees all of `x`, calls the local o200k_base
   tokenizer, and may run deterministic parsing/search. The receiver gets one
   ordinary text message only; it has no dictionary, tool, hidden system prompt,
   persistent memory, or binary attachment. The emitted message includes its
   own decoder rule.
3. **Resource.** `M(p) = o200k_base.encode(p).length`, measured by the
   checked-in `gpt-tokenizer` implementation. Runtime and output characters are
   secondary measurements, not the objective.
4. **Success/failure and quantifiers.** For input `x`, a candidate succeeds iff
   `D(E(x)) = x` and `M(E(x)) < M(x)` for the complete one-message output.
   `OPTIMAL` succeeds iff it returns `argmin` over its fixed candidate table
   plus identity, after re-counting each full prompt and rejecting candidates
   that are not exact or whose reported count disagrees. Formally, for fixed
   candidate set `C`, it returns `p*` with `D_c(p*)=x` and
   `M(p*) = min({M(x)} union {M(c.decoderPrompt) | c in C, exact(c,x),
   reported(c)=M(c.decoderPrompt)})`. It does **not** quantify over every
   imaginable codec.
5. **Parameters/boundaries.** Measurements use `o200k_base`, tokens (not bytes),
   and strict equality with zero tolerance. The encoder's DAEDALUS delegate has
   an 8 s/UI budget; the focused benches use 3 s. A new span is only kept on a
   strict one-token-or-more local gain; final application additionally must
   repay decoder-contract tokens.
6. **Adjacent, non-substitutable tasks.** Byte storage compression; lossy prompt
   summarization; semantic equivalence; model-side adaptive vocabularies;
   tokenizer retraining; system-prompt dictionary schemes; binary/base64
   transport; normalization that discards typography; and “likely understood”
   prompting are all different problems.

## B. Outcome space and evidence threshold

- **H+ (local):** there exists an input family where a self-contained exact
  path beats the existing direct DAEDALUS path by a material measured amount.
- **H− (global):** no uniformly strictly shorter exact one-chat codec can exist
  for all strings, because identity is already minimal for some strings and
  every nonempty universal rule has framing cost. This does not rule out
  family-specific gains.
- **H∂:** a lane can win raw-wire tokens but lose after its inline decoder
  contract; a single native digit or a lone mathematical variable is below this
  break-even boundary.

Threshold before shipping a lane: library exact round trip, a separately
written TypeScript reader, a separate CPython reader, measured complete-message
accounting, non-regression against DAEDALUS, adversarial cases, fuzzing, and a
material realistic fixture. Both shipped additions passed that threshold. No
threshold was set or met for “terminal codec” or universal LLM execution.

## C. Research frontier and interface

Relevant external results found in this research pass:

- SentencePiece documents a self-contained lossless tokenizer/decoder model,
  but it is a model artifact rather than a bare chat-message decoder.
- `Lossless Token Sequence Compression via Meta-Tokens` reports reductions only
  with special vocabulary/meta-token training; it is not a direct one-chat
  textual decoder.
- `zip2zip` similarly needs dynamic embeddings and uptraining; it is outside
  this access model.
- `The Functionalizer` (arXiv:2609.15991) factors casing/diacritic/repetition
  into reversible operators, but reports prose sequence inflation and evaluates
  trained tokenizers, not an inline chat message.
- Unicode's mathematical-alphabet guidance says styles can have distinct math
  semantics. That is why KALLIGRAPHOS keeps a style opcode instead of erasing
  style by NFKC.
- AraToken and Arabic tokenizer work normalize Arabic-Indic numerals for
  tokenizer efficiency but do not preserve the original numeral glyphs. This is
  exactly ARITHMOS's interface: canonicalize only inside a reversible span.

The open interface is not “can text be compressed?” It is: **can a receiver
with only one natural-language input execute the exact inverse reliably enough
that contract tokens and model-error risk do not erase the gain?** This run
proves the deterministic inverse and token costs, not the receiver-model part.

A separate current-events search found reports about AI-assisted mathematics in
2026 (including Erdős/unit-distance work and the September Navier–Stokes claim).
Its usable engineering lesson is methodological only: preserve independently
checkable certificates and treat unreviewed claims as provisional. No theorem
or claimed mathematical solution was used in the codec design.

## D. Negative space: result shapes rejected

The following are not solutions to the stated contract. The test in each row is
what detects the shortcut.

| # | tempting result shape | precise failure | detector |
|---|---|---|---|
| 1 | raw wire is shorter | omits decoder tokens | assert `M(decoderPrompt)` |
| 2 | NFKC output | loses original glyph codepoints | `decode(encode(x))===x` |
| 3 | semantic paraphrase | not byte exact | strict string equality |
| 4 | binary/arithmetic coding | cannot be pasted/read in one chat text turn | reject non-text transport |
| 5 | base64/hex | often expands tokens and needs a tool decoder | tokenizer count + access-model check |
| 6 | hidden system prompt | violates single-input premise | inspect emitted message |
| 7 | persistent dictionary | receiver lacks prior session state | cold-start decode test |
| 8 | model-specific meta token | basic chat has no added vocabulary | vocabulary-free requirement |
| 9 | fullwidth ASCII idea | already PROCRUSTES territory | repository novelty grep |
| 10 | Arabic NFKC/PDF forms | compatibility mapping can be non-injective | ligature counterexample |
| 11 | map Arabic letters/diacritics | changes orthography/semantic spelling | byte round-trip |
| 12 | normalize styled math to ASCII | destroys `H` vs bold `H` distinction | style-preserving inverse test |
| 13 | character confusable collapse | may alter intentional cross-script text | mixed-script control fixture |
| 14 | claim general English gain from native digits | ordinary English has no target spans | clean-English fixture |
| 15 | claim all tokenizer/model gains | only o200k_base was measured | encoding scope in receipt |
| 16 | use marker without collision handling | literal marker source may mutate | collision fixture |
| 17 | accept local span gain only | decoder tail can exceed the saving | final complete-prompt comparison |
| 18 | pick lowest claimed lane | stale/misreported accounting wins falsely | OPTIMAL accounting-mismatch test |

The “modal shortcut” is: *a basic LLM will probably infer the normalization, so
we can omit a reversible contract*. It fails because “probably” has the wrong
quantifier: success requires `for every emitted input, exact reconstruction`,
not `there exists a likely intended reading`. `G1/G2/G3` and the collision/fuzz
cases detect this failure mechanically; external LLM behavior is deliberately
not promoted to verification.

## E/F. Mechanism portfolio and returned artifacts

1. **ARITHMOS (shipped).** Construction: replace a maximal homogeneous run of
   Arabic-Indic, Persian, Devanagari, Bengali, or Thai digits with ASCII digits
   bracketed by a script marker; restore by base-offset arithmetic. When the
   entire source has one native script and no ASCII digits, a single document
   container amortizes the bracket cost. Artifact:
   `src/lib/omega/arithmos.ts`, fixtures, TS/Python readers, and red team.
   Proved portion: deterministic byte-exact inverse and strict o200k gain.
   Gap: no arbitrary-LLM behavioral verification. Cheapest falsification:
   mixed-script run. Local gap.
2. **KALLIGRAPHOS (shipped).** Construction: a style opcode plus ASCII operand
   for seven contiguous mathematical-alphabet families. Artifact:
   `src/lib/omega/kalligraphos.ts`, fixtures, TS/Python readers, and red team.
   Proved portion: exact style restoration including astral codepoints. Gap:
   untested arbitrary LLM execution. Cheapest falsification: styled variable
   next to source ASCII or unsupported Fraktur. Local gap.
3. **Audited selection (shipped).** Construction: minimum over complete prompts
   after independently measured accounting. Artifact: `optimal.ts`, worker/UI
   button, `optimal-redteam.ts`. Proved portion: it never chooses an invalid or
   falsely accounted candidate in its supplied table. Gap: its candidate set is
   intentionally scoped to inline direct lanes, not every repository codec.
   Cheapest falsification: inject an accounting lie; test O4/O5 passes. Local.
4. **Arabic presentation-form restoration (rejected).** Counterexample:
   compatibility ligatures can expand to multi-character Arabic words and have
   exceptions/semantic uses; NFKC is not an injective inverse without a mapping
   table. Artifact: explicit counterexample and scope analysis in this receipt.
   Gap is equivalent to building a large decoder table, which violates the
   no-external-knowledge direct-reasoning constraint.
5. **General mathematical-alphabet NFKC (rejected as a broad transform).**
   Counterexample: Unicode assigns distinct mathematical semantics to visual
   styles. Artifact: KALLIGRAPHOS's style opcode/inverse demonstrates the repair;
   no unmarked NFKC candidate is accepted. Gap is local but unsafe without the
   opcode.
6. **Dynamic dictionary/meta-token compression (rejected for this lane).**
   Construction exists in literature, but a bare model does not have those
   special tokens or a trusted dictionary interpreter. Artifact: access-model
   exclusion/proof above. The gap is original-problem-equivalent: teaching an
   arbitrary chat model a new exact language.
7. **Predictive/arithmetic LLM compressor (rejected).** It can improve file bits
   but needs identical predictor, arithmetic decoder, and binary transport.
   Artifact: access-model counterexample. Gap is global under one-chat text.

## G. Second-order adversary and repair

ARITHMOS attacks: native/ASCII boundary, mixed Arabic/Persian/Devanagari/Bengali/Thai run,
one digit, malformed inner marker, literal-bracket collision, outer marker collision, CJK/emoji, and 500
fuzz cases. KALLIGRAPHOS attacks: actual math variable notation, a long
vector/matrix/equation paragraph, unsupported Fraktur, source ASCII boundary,
malformed style opcode, marker collision, and 500 fuzz cases. Its conservative
context gate requires multiword decorative prose and rejects formula operators
or math vocabulary before economic selection. For each candidate, exactness is checked after the *entire*
DAEDALUS path, not just its local transform.

A future repair inherits no trust: rerun the affected red team, TypeScript
check, production build, and add a patch-specific malformed-wire case.

## H/I/J. Verification, results, and stopping state

Executed receipts:

```text
npx tsx bench/arithmos-redteam.ts      ARITHMOS RED TEAM: 51 passed, 0 failed
npx tsx bench/kalligraphos-redteam.ts  KALLIGRAPHOS RED TEAM: 38 passed, 0 failed
npx tsx bench/optimal-redteam.ts       OPTIMAL RED TEAM: 8 passed, 0 failed
npx tsc --noEmit                       exit 0
npm run build                          exit 0
```

Headline measurements (complete messages, o200k_base):

- ARITHMOS Arabic-locale invoice ledger: raw 2,076; plain DAEDALUS 948;
  ARITHMOS 750; **198 tokens / 20.9%** better than the direct baseline, 240 spans.
  This receipt was produced by the final red-team run; DAEDALUS is time-budgeted,
  so comparisons are always made in the same invocation rather than treated as
  a cross-run constant.
- KALLIGRAPHOS styled operations brief: raw 765; plain DAEDALUS 451;
  KALLIGRAPHOS 139; **312 tokens / 69.2%** better than the direct baseline,
  one span. It is a large gain in its stated stylized-prose lane, not a claim
  about normal English prose.

Stopping state: H+ is established for both narrow input families. H− holds for
universal strict improvement. H∂ applies to small inputs and arbitrary model
execution. The highest-information next test is a preregistered held-out trial
against several actual chat models: give each only the emitted one-message
contract, request exact recovery, and publish exact-match rates by model and
span family. Until then, do not label model readability “verified.”
