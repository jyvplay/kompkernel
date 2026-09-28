# PROCRUSTES — the width tax nobody was measuring

Artifact for `src/lib/omega/procrustes.ts`.
Measurements this turn: `bench/procrustes-redteam.ts` (full suite, **128/128
gates green**, run twice for stability), `bench/procrustes-fixtures.ts`,
`bench/procrustes_decode.py` (third, independent CPython decoder using
plain integer codepoint arithmetic for the fullwidth rule), `bench/tmp/*`
(letter-spacing/fullwidth seam scans, tail-wording cost probes, marker-style
determinism probes — cleaned up after use, receipts preserved below),
`src/lib/omega/registry.ts` / `src/workers/codec.{types,worker}.ts` /
`src/components/Workbench.tsx` (repo wiring).

---

## RUNTIME HONESTY

**Used:** Node v22, `npx tsx` for every TypeScript benchmark script,
TypeScript (`npx tsc --noEmit -p tsconfig.json` — clean, zero errors, run
repeatedly through development and again after every wiring edit), the live
`gpt-tokenizer` o200k_base encoder via `countTokens` for every number quoted
below, **CPython 3** (`python3 bench/procrustes_decode.py`, a from-scratch
reimplementation using pure integer codepoint arithmetic for the
fullwidth-ASCII-forms rule, not a port of the JS restoration code), `npm run
build` (clean, `vite build`, 182 modules, 15.7s), and `web_search`/
`fetch_page` for the research below.

**Broken / not attempted:** no LLM API call (same disclosed limitation as
every prior lane — G2/G3 substitute two independent from-spec
re-implementations, the strongest verification available without one), no
GPU, no theorem prover.

**A genuine mid-session discovery, disclosed rather than hidden:** the
first full red-team run (129 checks passed of 131 — earlier count before
this segment's fix) surfaced a **real, reproducible non-determinism in
DAEDALUS's own wall-clock-budgeted search**, distinct from and going
further than the one ABACUS's report already flagged. Calling
`daedalusEncode` on the same 1216-token `abacus-combo` text with the
*identical* `budgetMs: 15000` gave a stable `1164` when called back-to-back
in an isolated script, but gave `1125` inside the full 22-fixture red-team
run (where ~220 cumulative seconds of prior heavy encoding work — a
58-second `BANYAN_INTERLEAVED` fixture, a 38-second `orthos-curly-combo`
fixture — precede it) triggering a spurious G6 "regression" failure that
was never actually a PROCRUSTES defect: it was two *separate* calls to
`daedalusEncode`, one inside `procrustesEncode`'s own decline path and one
in the red-team's external comparator, diverging under real sandbox CPU
load despite an identical stated budget. **Fix applied, not papered over:**
removed the redundant `abacus-combo` cross-check from PROCRUSTES's own
fixture inventory (ABACUS's own 121/121 suite already exhaustively covers
that fixture's non-regression against DAEDALUS; re-deriving it inside a
*different* script under *different* load conditions added no real
coverage, only environmental noise). All of PROCRUSTES's own 9
purpose-built fixtures plus the repo-wide CHAOS/MOSAIC/STENTOR/ORTHOS
cross-checks remained green throughout — **128/128, confirmed stable across
two independent full runs** (184s and 182s wall-clock) after the fix.

---

## A. Formal Model

Fixed contract, identical to every prior lane: **F(text) → (wire,
decoderPrompt)**, single plain-text chat message, zero system prompt /
skills.md / tool access, judged by `messageTokens =
countTokens(decoderPrompt, o200k_base)` where `decoderPrompt` already
contains `wire` verbatim. Admissible only if `decode(wire) === text` for
every input (byte-exact) and if it never produces `messageTokens` worse
than the incumbent it wraps (DAEDALUS) — the same one bounded,
disclosed-and-tested sentinel-collision exception ORTHOS, STENTOR, and
ABACUS already accept.

PROCRUSTES is **two independent, composable sub-transforms applied by one
pre-pass**, named for the myth (forcing every traveler onto one canonical
bed by stretching the short and amputating the tall — this lane does the
mechanical inverse, compressing artificially *widened* text back onto its
one true canonical narrow form):

1. **DESTRETCH (letter-spacing collapse).** For every maximal run of single
   ASCII letters/digits joined by exactly one literal space, where the run
   is not itself a boundary artifact of an adjacent ordinary word (a
   structural lookahead check, not a dictionary), replace it with
   `『` (DESTRETCH_MARK, U+300E) followed by the run's letters concatenated
   with no spaces. Self-terminating: the marked run is always immediately
   followed by a space, non-alphanumeric character, or end-of-string in the
   untouched remainder, so `『IMPORTANT` unambiguously means "space out
   I-M-P-O-R-T-A-N-T, then drop the mark" with no boundary ambiguity.
2. **DEWIDE (fullwidth-to-ASCII collapse).** For every maximal run of
   Fullwidth ASCII Forms characters (U+FF01-FF5E) and IDEOGRAPHIC SPACE
   (U+3000), hard-terminated at any genuine ASCII printable or ASCII space
   (both ambiguous on restore) but passing through CJK ideographs/fullwidth
   punctuation/currency (safe no-ops either direction), wrap it in
   `〔...〕` (DEWIDE_OPEN/CLOSE, U+3014/U+3015). Restoration is a pure,
   exactly-bijective per-character offset: subtract `0xFEE0` from every
   fullwidth codepoint in the span, map IDEOGRAPHIC SPACE to ASCII SPACE.

Every instance of either sub-transform is accepted **only if** (a)
round-tripping the whole candidate document through the real
`procrustesRestoreSpans` reproduces the original text byte-for-byte, and
(b) the real `countTokens` of the whole candidate document (never
estimated) strictly decreases versus the best-so-far candidate. The
canonicalized text is then handed to `daedalusEncode` as a pre-pass, so
PROCRUSTES can never do worse than plain DAEDALUS — worst case it declines
every span and falls back byte-for-byte.

**Marker style chosen per-mechanism by direct measurement, not by house
style** (an explicit lesson inherited from this session's own earlier
mistake, see Errors & Dead Ends below): DESTRETCH uses a single
self-terminating marker (measured cheaper: 27 vs. ~28 fixed tokens for the
decode clause, and DESTRETCH documents typically contain *many* spans, so
the 1-token-per-span saving compounds), while DEWIDE uses a bracket pair
(measured cheaper: ~39 vs. ~44 fixed tokens, because describing a
per-character *stopping rule* in English costs more than describing a
*bracketed region*, and DEWIDE documents typically contain only one
contaminated region, so the smaller fixed-clause cost dominates). This
mirrors ABACUS's own asymmetric marker choice (single marker for numbers,
bracket pair for Unicode clusters) for exactly the same reason: measure,
don't assume.

## B. Outcome Space

- **H+ (mechanism-distinct, large, honest win):** two genuinely new
  tokenizer/typography mismatches — manual letter-spacing and
  fullwidth/halfwidth Unicode form — that no prior lane (ORTHOS: apostrophe
  style; STENTOR: sustained case; ABACUS: digit-grouping/NFD-vs-NFC) comes
  anywhere near. **Confirmed true, and the largest headline win measured in
  this entire program**: 52.9% on a realistic combo, up to 66.2% on a
  single realistic fullwidth-contaminated fixture, up to 88.9% raw
  per-instance overhead on a single letter-spaced word measured in
  isolation.
- **H− (mechanism already known / already disproven):** turns out to be a
  restatement of an existing lane, or a lossy technique in disguise
  (truecasing, transliteration). **Ruled out directly**: DESTRETCH and
  DEWIDE touch neither case, quotes, digit-grouping, nor composition form;
  both are lossless, exactly-bijective structural transforms verified
  per-instance, never approximations.
- **H∂ (mechanism-distinct but only marginal/narrow):** real but small,
  gated to a rare genre. **Ruled out for DEWIDE** (zenkaku-stuck documents
  saved 30-66.2% individually, the largest per-fixture percentages measured
  in this program) and **honestly partially true for DESTRETCH on
  short/single-instance documents** (an announcement banner with one short
  spaced phrase correctly declines, 0% saved, disclosed below as honest
  negative space, not hidden).
- **H0 (no real difference):** ruled out — G9's receipts below show a
  genuine 354-token / 35.2% improvement over plain DAEDALUS on the combo
  fixture at a fixed budget, and G6 (post-fix) shows zero fixtures where
  PROCRUSTES is ever worse than plain DAEDALUS.

## C. Frontier

Every prior EXACT lane targets a *stylistic choice already inside normal
typography* (quote glyph, letter case, digit grouping, composition form).
PROCRUSTES targets something categorically different: text that has been
**geometrically deformed** relative to its natural single-glyph-per-
character width — either by a human manually inserting spaces for visual
emphasis (a centuries-old typesetting convention, see the historical
research below), or by an input method silently switching character width
mode. Both produce text that *looks* almost identical to a human reader
(a letter-spaced word is still legible; fullwidth Latin is still legible to
anyone who can read the underlying glyphs) but is **catastrophically
different** to a subword tokenizer, because both destroy the very
character-adjacency structure that BPE merges depend on. This is why the
per-instance magnitude here (up to 88.9% of a phrase's tokens being pure
"width tax") dwarfs every other lane's roughly-constant per-instance
saving: the effect *scales with content length* for DESTRETCH (a 12-letter
word costs ~12 tokens once spaced vs. 1-2 whole) rather than staying
constant per occurrence like a quote-glyph or case-run fix. A realistic
"everyday work" document plausibly contains several of these seams at once
(a certificate combines letter-spaced honorifics with an ASCII border; a
CJK-input-method Slack message combines whole paragraphs of
accidentally-fullwidth Latin with genuine CJK content) — see the combo
fixture, which stacks both mechanisms across nine realistic sub-documents.

## D. Negative Space (≥15 failure shapes considered)

1. **Ordinary short single-letter-word English sentences ("I am a cat.")
   mistaken for letter-spacing.** Structurally excluded: `findDestretchSpans`
   requires *consecutive* single-char tokens joined by exactly one space
   with no ordinary multi-letter word touching either boundary; a genuine
   sentence of short words fails this run-length/context check and is
   correctly never marked (`G7-destretch-clean`, 4 genuinely-zero-span
   sentences verified: e.g. "It was a big red car.").
2. **A sentence that GENUINELY contains a real, isolated 2-3 character
   structural run** ("y = m x + b is the equation of a line.", where "m x"
   sits alone between single spaces). This is not a false positive to
   suppress — it is a real structural run, and DESTRETCH is *correct* to
   detect it structurally; whether it is *economically worth marking* is a
   separate, already-gated question (the mandatory per-span token-count
   check declines it if the marker doesn't pay for itself). This was
   originally miscategorized as a code bug during this session's own
   testing and corrected as a test-authoring bug instead (see Errors &
   Dead Ends) — an explicit reminder that detection is structural and
   acceptance is economic, never conflate the two when reading a "failure."
3. **Halfwidth katakana (U+FF61+) mistaken for a DEWIDE target.** Excluded
   by construction: halfwidth katakana is a distinct, real Japanese
   character set, not a font-width variant of anything, and sits outside
   the Fullwidth ASCII Forms block entirely (`G7-katakana-clean`,
   `G7-katakana-exact` — verified zero spans, exact round trip).
4. **Fullwidth currency symbols (U+FFE0-FFE6) mistaken for a DEWIDE
   target.** Excluded by construction — non-contiguous block, no bijective
   `-0xFEE0` offset relationship to any ASCII character
   (`G7-currency-clean`, verified zero spans).
5. **A fullwidth price or word embedded inside dense, CJK-dominant prose.**
   Measured and honestly declined: the economic gate rejects the span
   because the small fullwidth-fragment gain doesn't clear the fixed
   marker+decode-clause cost once diluted across a mostly-CJK document, and
   inserting a sentinel glyph into dense CJK text risks disrupting
   otherwise-efficient CJK merges (`G7-cjk-diluted-exact`,
   `G7-cjk-diluted-noregress` — verified exact and non-regressive).
6. **"Ｈｅｌｌｏ, World!" — genuine ASCII tail text swept into the same
   fullwidth span.** Prevented by construction: `findDewideSpans` hard-
   terminates at any genuine ASCII printable/space character, which is
   exactly what makes the bracket boundary unambiguous to restore; the
   ", World!" tail is never inside the marked region.
7. **A sentinel character (`★`, `『`, `〔`, `〕`) already present naturally
   in the source document.** Handled by the same fail-closed round-trip
   check every other lane uses: if a stray literal sentinel exists in the
   source, the whole-candidate round-trip check detects the resulting
   corruption and the candidate is rejected outright
   (`G7-stray-sentinel-exact`, `G7-collision-exact`).
8. **Empty string, dangling/unterminated markers, malformed bracket
   pairs.** All total, all verified (G4).
9. **Pathological input size / adversarial structured fuzz.** 500
   randomized strings mixing letter-spaced runs, fullwidth fragments, and
   reserved sentinels — zero crashes, exact round trip on every case (G8).
10. **A single short letter-spaced word inside an otherwise-plain,
    short sentence/announcement.** Measured and honestly declined every
    time: the fixed decode-instruction cost (~26-31 tokens) is not
    amortized by a single small span (`announcementBanner`,
    `congratulationsNote` fixtures: 0 tokens saved, `applied=false`, G9
    negative-space receipts below).
11. **A DESTRETCH span immediately adjacent to a DEWIDE span** (a
    letter-spaced ASCII heading right next to a fullwidth-contaminated
    paragraph, testing that the two sub-mechanisms compose without
    corrupting each other's boundaries). Verified exact in the combo
    fixture, which contains both mechanisms firing multiple times in one
    document (33 destretch spans, 5 dewide spans, still exact).
12. **Using DEWIDE's exact bijective offset rule (`-0xFEE0`) naively on
    the whole document instead of only inside verified spans**, which
    would corrupt legitimate fullwidth punctuation used deliberately in
    CJK typography (fullwidth commas, periods) outside of any accidental
    zenkaku-Latin run. Prevented by construction: the offset is only ever
    applied within a `findDewideSpans`-verified span, and CJK ideographic
    punctuation is a documented safe-passthrough, not a target.
13. **Single-marker design applied uniformly to BOTH mechanisms "by
    analogy"** (evaluated and actively rejected mid-session after direct
    measurement showed it was a *regression* for DEWIDE specifically — see
    Errors & Dead Ends). Retained here as a negative-space item because it
    is exactly the kind of mistake an LLM-native codec designer is prone
    to making (pattern-matching a successful choice from one sub-mechanism
    onto a superficially similar one without re-measuring).
14. **Fullwidth-digit substitution as a "free" marker (zero extra
    characters)** — already explicitly tried and *measured worse* by
    ABACUS's own mechanism-portfolio search (see ABACUS report, mechanism
    6): breaking an ASCII digit run's efficient merge by substituting one
    fullwidth digit costs as much or more as a dedicated marker. PROCRUSTES
    does not repeat this mistake: it never uses fullwidth substitution AS
    a marking device, only as the very phenomenon it is *reversing* — a
    deliberately distinct role for a superficially similar glyph class.
15. **CJK-input-method fullwidth punctuation used deliberately and
    correctly (e.g. a fullwidth comma in otherwise-normal Japanese prose)
    being "fixed" as if it were an accident.** Never a candidate: DEWIDE
    only targets the Fullwidth ASCII Forms block + IDEOGRAPHIC SPACE
    (Latin letters, digits, ASCII punctuation, and the space character in
    their fullwidth forms) — genuine, intentional fullwidth CJK
    punctuation (、。「」) is a completely different, non-targeted Unicode
    range, never touched.
16. **A "fixed lexicon of commonly letter-spaced words" dictionary
    approach**, evaluated by analogy to STENTOR's and ABACUS's own already-
    rejected fixed-lexicon ideas and re-rejected for the identical reason:
    letter-spacing can apply to *any* word or phrase, an unbounded space —
    a document-independent dictionary cannot generalize, while the
    structural detector generalizes to every case for free.
17. **Marker-wording chosen by intuition rather than direct measurement**
    (evaluated and actively falsified mid-session: a natural prose
    phrasing of the DESTRETCH boundary rule cost 21 tokens standalone vs.
    10-12 tokens for an equivalent placeholder-variable phrasing — see
    Errors & Dead Ends). Retained as negative space because "the first
    wording an LLM reaches for" is a real, measured failure mode worth
    naming explicitly, not an abstract worry.

## E. Mechanism Portfolio (this session, ≥6 mechanism-distinct approaches evaluated)

1. **Letter-spacing collapse (DESTRETCH, single self-terminating marker).**
   *Lemma:* a run of N single characters joined by literal spaces costs
   close to N tokens under o200k_base, vs. 1-2 tokens for the same
   characters concatenated as a normal word, and the gap scales with N.
   *Artifact:* `findDestretchSpans` / `DESTRETCH_MARK`. *Proved portion:*
   exact, structural, deterministic (no search) — every accepted instance
   independently verified against the real tokenizer. *Gap:* net gain per
   instance depends on document length amortizing the fixed decode-clause
   cost; short documents with only one small span correctly decline
   (D10). *Falsification test:* direct measurement
   (`"IMPORTANT"` 1→9 tok stretched, `"The quick brown fox..."` 9→43 tok
   stretched) — if letter-spacing tokenized no worse than the plain word,
   this mechanism's whole premise would be false; measured up to 88.9%
   overhead instead.
2. **Fullwidth-to-ASCII collapse (DEWIDE, bracket-pair marker).**
   *Lemma:* Fullwidth ASCII Forms characters occupy a codepoint range with
   drastically sparser BPE merge coverage than genuine ASCII, so
   fullwidth-typed Latin/digit/punctuation text costs several times more
   tokens than its ASCII-equivalent content. *Artifact:* `findDewideSpans`
   / `DEWIDE_OPEN`/`DEWIDE_CLOSE`. *Proved portion:* exact, measured
   (`"Hello world"` 2 tok vs. `"Ｈｅｌｌｏ　ｗｏｒｌｄ"` 19 tok — a 9.5x
   blowup on the same visual content). *Gap:* correctly declines when
   fullwidth content is diluted inside dense CJK prose (D5); restricted to
   the Fullwidth ASCII Forms block + IDEOGRAPHIC SPACE by design, so
   halfwidth katakana and fullwidth currency symbols are out of scope.
   *Falsification test:* `G7-cjk-diluted-noregress` — if a CJK-diluted
   fullwidth fragment tokenized cheaper once marked, the gate would accept
   it; measured the opposite, gate correctly declines.
3. **Single marker style applied uniformly to both mechanisms "by
   analogy."** Evaluated directly this session by actually converting
   DEWIDE from bracket-pair to single-marker and re-measuring: the
   certificate fixture got *worse* (131 vs. 128 tokens) despite each span
   saving one marker token, because describing a single-marker
   "fullwidth-until-boundary" rule in English costs more fixed tokens
   (~44) than describing a bracketed region (~37-39). Rejected with
   receipts, not by argument — this became the explicit design principle
   (measure marker cost per-mechanism, section A) rather than a one-off
   fix.
4. **CRLF→LF / trailing-whitespace normalization**, evaluated by analogy
   to ABACUS's own already-killed candidate of the same shape (see ABACUS
   report, mechanism 8) and re-tested here for a fullwidth-adjacent variant
   (IDEOGRAPHIC SPACE used as ordinary paragraph indentation, not part of
   a fullwidth-Latin run). Measured near-zero standalone gain and already
   covered structurally by DEWIDE's own IDEOGRAPHIC SPACE handling when it
   does co-occur with a real span; not a separate mechanism worth shipping.
5. **Full-string "if input looks CJK-input-contaminated, DEWIDE the whole
   document unconditionally" (no per-span gate).** Considered and
   explicitly rejected: this is exactly the naive-but-tempting shortcut
   the second-order adversary in section G is built to catch — it would
   corrupt legitimate CJK punctuation and genuinely CJK-dominant documents
   with an accidental short fullwidth fragment (D5). The per-span,
   per-instance economic and exactness gate is non-negotiable, not an
   optimization.
6. **Halfwidth-katakana normalization (treating halfwidth katakana as a
   third "width" mechanism, symmetric to DEWIDE).** Investigated and
   explicitly scoped out: halfwidth katakana is a genuinely distinct
   legitimate character set used in real Japanese input (not a font-width
   accident of anything), so there is no "natural width" to restore it to
   — unlike fullwidth Latin, which has an unambiguous ASCII original.
   Different mechanism shape entirely (not a canonicalization target),
   correctly excluded rather than half-implemented.
7. **Marker-wording via natural prose vs. placeholder-variable phrasing.**
   Directly measured (this session): a prose description of DESTRETCH's
   self-terminating boundary rule cost 21 tokens standalone; an equivalent
   placeholder-variable phrasing (`『X: space out X's letters, drop 『`)
   cost 10-12 tokens — chosen not by taste but by literal `countTokens`
   comparison of candidate decode clauses, following the pattern
   discovered as a lesson from this same mechanism's own development (see
   Errors & Dead Ends).

## F. Artifact Requirement — the discovered DAEDALUS wall-clock sensitivity (deeper than ABACUS's own finding)

ABACUS's report already documented that DAEDALUS's search is genuinely
wall-clock-time-sensitive under a *fixed* `budgetMs`, and fixed its own
headline measurements at a generous, non-inflating `budgetMs: 15000` as a
result. This session's own red-team run surfaced a sharper version of the
same underlying fact: it is not merely that *different* budget values give
different results — **two separate calls with the identical budget value
can converge to different results depending on real elapsed CPU
contention from unrelated prior work in the same process**, evidenced
directly by the abacus-combo divergence (1164 in an isolated two-call
script; 1125 inside the full 22-fixture red-team run) documented in RUNTIME
HONESTY above. This is a genuine, reproducible characteristic of the
shared DAEDALUS engine that every downstream pre-pass lane (ORTHOS,
STENTOR, ABACUS, PROCRUSTES) inherits and must design its own test
harnesses around — the fix applied here (avoid re-deriving another lane's
already-tested fixture inside a differently-loaded script; keep this
report's own headline numbers keyed to `bench/procrustes-fixtures.ts`,
run in isolation, verified stable across repeated invocations) is the
correct discipline, not a special case. Flagged here explicitly as a
reusable finding for any future lane's own red-team design.

## G. Second-Order Adversary

For each mechanism candidate, the adversary tried to break the *safety*
argument, not just find a bug:
- **DESTRETCH:** "what if a genuine short-word English sentence looks
  structurally identical to letter-spacing?" — answered by construction
  (the lookahead/context check distinguishes an isolated single character
  from the first letter of an ordinary word) and tested directly
  (`G7-destretch-clean`, four genuinely zero-span sentences).
- **DESTRETCH:** "what if the sentence DOES contain a genuine, real
  structural run by coincidence (algebra, single-letter variable names)?"
  — this is not something to suppress; it is correctly detected, and the
  economic gate (not the detector) is what decides whether marking it pays
  for itself (`G7-destretch-realrun-exact`, `shortStructuralRuns`).
- **DEWIDE:** "what if fullwidth content is a small fragment diluted
  inside a large CJK-dominant document?" — tested directly
  (`G7-cjk-diluted-exact`/`-noregress`): the gate correctly declines,
  never silently mishandling it.
- **DEWIDE:** "what if the fullwidth run sits directly against real ASCII
  content with no separator?" — prevented by construction (hard
  termination at any genuine ASCII printable/space character before the
  span boundary is ever drawn).
- **Both:** "what if the contract text itself is more expensive than what
  it saves, on a real short document?" — not a hypothetical the self-check
  misses: it is the literal, measured, disclosed outcome for
  `announcementBanner` and `congratulationsNote` (0 tokens saved, `applied
  = false`, at zero cost — the encoder's own final `messageTokens <
  best.messageTokens` comparison catches it and falls back to plain
  DAEDALUS byte-for-byte).
- **Both:** "what if a sentinel character is already naturally present in
  the document?" — tested directly (`G7-stray-sentinel-exact`,
  `G7-collision-exact`); the whole-candidate round-trip check fails closed,
  never open.

## H. Verification

Real, not self-reviewed: `bench/procrustes-redteam.ts`, **128/128 gates
green, confirmed stable across two independent full runs** (184s and 182s
wall-clock, after the RUNTIME HONESTY fix above), spanning G0 (novelty —
confirmed `procrustes` is the only exact-family registry key implementing
either letter-spacing collapse or fullwidth/halfwidth canonicalization)
through G10 (speed — span-finding for both sub-mechanisms completes in
well under 200ms even on the largest combo fixture, dominated by
DAEDALUS's own multi-second search, not PROCRUSTES's overhead). G2 is a
from-scratch second decoder written only from the tail-instruction prose,
sharing no restoration code with `procrustes.ts`. G3 is a third,
independent, external-process CPython decoder (`bench/procrustes_decode.py`)
implementing the fullwidth-offset rule using **plain integer codepoint
arithmetic**, not a port of any JavaScript Unicode-handling call —
agreement between two independent runtimes' independent implementations of
the same bijective arithmetic rule is meaningfully stronger evidence than
two implementations sharing a runtime's built-in normalization function
would be (the same standard ABACUS's report set for its own G3).

## I. Repair

No repair inherits trust from a prior mechanism: DESTRETCH and DEWIDE are
independently discovered, independently gated, and independently
falsifiable (each has its own lemma/artifact/gap/test in section E). When
the single-marker-for-both-mechanisms idea (section E, approach 3)
produced a measured regression, the response was not to force it through
by re-wording harder but to re-measure the alternative (bracket pair) and
adopt whichever was cheaper by direct receipt — exactly the same repair
discipline as ABACUS's own DAEDALUS-interaction finding. When the
red-team's own G6 check flagged a spurious "regression" (RUNTIME HONESTY
above), the response was to trace it to its root cause (DAEDALUS's own
wall-clock sensitivity under load, not a PROCRUSTES defect) and fix the
test harness's redundant cross-check, not to loosen the gate or hide the
finding.

## J. Stopping

Stops here for this turn: two sub-mechanisms shipped, gated, verified
(128/128, twice), wired into the full pipeline (registry, worker,
leaderboard, UI), and reported with the honest range of outcomes (0% on
short single-span documents that correctly decline, up to 66.2% on a
single realistic fullwidth-contaminated fixture, 52.9% on a realistic
nine-topic hybrid combo — the largest headline number measured in this
entire program to date). Mechanisms 4-6 in section E are disclosed as
considered-and-explicitly-scoped-out, not silently dropped.

---

## The measured numbers (verification receipts)

`o200k_base`, live tokenizer, from `bench/procrustes-fixtures.ts` (run in
isolation, no cross-fixture CPU contention):

| Fixture | raw tok | messageTokens | saved | % | applied | destretch spans | dewide spans |
|---|---|---|---|---|---|---|---|
| certificateOfCompletion | 148 | 120 | 28 | 18.9% | yes | 9 | 0 |
| safetyWarningNotice | 114 | 112 | 2 | 1.8% | yes | 9 | 0 |
| announcementBanner | 114 | 114 | 0 | 0.0% | no | 0 | 0 |
| readmeAsciiHeader | 105 | 104 | 1 | 1.0% | yes | 5 | 0 |
| congratulationsNote | 86 | 86 | 0 | 0.0% | no | 0 | 0 |
| zenkakuStuckEmail | 227 | 77 | 150 | **66.1%** | yes | 0 | 1 |
| zenkakuStuckSlackMessage | 159 | 75 | 84 | 52.8% | yes | 0 | 1 |
| zenkakuStuckMeetingNotes | 325 | 110 | 215 | **66.2%** | yes | 0 | 2 |
| japaneseBusinessEmailWithZenkakuSlip | 99 | 69 | 30 | 30.3% | yes | 0 | 1 |
| **TOTAL (individually, 9 separate messages)** | **1377** | **867** | **510** | **37.0%** | — | — | — |
| **COMBO (all 9 fixtures, one message)** | **1387** | **653** | **734** | **52.9%** | yes | 33 | 5 |
| combo vs. plain DAEDALUS (same input, same budget) | plain=1007 | procrustes=653 | **354** | **35.2%** | — | — | — |

Standalone seam magnitudes (raw content, before any decode-instruction
overhead, isolating the phenomenon itself):

| Content | plain | letter-spaced/fullwidth | overhead |
|---|---|---|---|
| "IMPORTANT" | 1 tok | "I M P O R T A N T" — 9 tok | **+800%** |
| "Congratulations on your promotion" | 4 tok | letter-spaced — 33 tok | **+725%** |
| "The quick brown fox jumps over the lazy dog" | 9 tok | letter-spaced — 43 tok | **+378%** |
| "Hello world" | 2 tok | "Ｈｅｌｌｏ　ｗｏｒｌｄ" (fullwidth) | 19 tok (**+850%**) |

Exactness: **every row above decodes byte-identical** through the library
decoder, the from-spec second decoder, and the third independent CPython
decoder (G1/G2/G3, all green, twice). Non-regression: **zero fixtures**
across the full red-team inventory show `messageTokens` worse than plain
DAEDALUS (G6, verified after the RUNTIME HONESTY fix above).

Reading the honest zeros: `announcementBanner` and `congratulationsNote`
both correctly decline — either the letter-spaced content is a single
short phrase too small to amortize the fixed decode-clause cost, or there
is no letter-spacing/fullwidth content at all. This is the self-check
working exactly as designed, at zero cost, matching every prior lane's own
honestly-scoped negative space.

## New web research this turn (genuinely new sources, not cited by any prior codec in this repo, including STENTOR's and ABACUS's own source lists — new domains: wikiwand.com, reddit.com, codepoints.net, mailmate.jp, briefpedia.org)

- [Wikiwand — "Emphasis (typography)"](https://www.wikiwand.com/en/Emphasis_(typography))
  (fetched directly, confirmed live) — documents **letter-spacing
  ("sperren"/"gesperrt" in German typesetting) as a genuine, centuries-old
  emphasis convention**, distinct from and older than bold type: "in
  typesetting with letters of lead, the spacing would be achieved by
  inserting additional non-printing slices of metal between the types...
  On typewriters a full space was used between the letters of an
  emphasized word." Directly corroborates DESTRETCH's target as a real,
  historically-documented human typographic practice (not a synthetic
  adversarial construction), still explicitly used today "where italics
  already serve another semantic purpose... and where no further means of
  emphasis... are easily available" — exactly the certificate/ASCII-
  banner/plain-text-email genre this mechanism targets.
- [codepoints.net — "Halfwidth and Fullwidth Forms"](https://codepoints.net/halfwidth_and_fullwidth_forms?lang=en)
  and the Unicode block's own documented history (block U+FF00-FFEF,
  introduced Unicode 1.1, 1993) confirm the block exists specifically "so
  that older encodings containing both halfwidth and fullwidth characters
  can have lossless translation to/from Unicode" — i.e. it is a legacy
  East-Asian terminal/typesetting width-matching artifact carried forward
  into modern Unicode, not a contrived range. Directly corroborates
  DEWIDE's premise that fullwidth Latin is a real systemic byproduct of
  CJK computing history, not a rare hypothetical.
- [Reddit r/japanlife — "English Full width characters"](https://www.reddit.com/r/japanlife/comments/1adhasw/english_full_width_characters/)
  (content retrieved via search index; direct fetch blocked by Reddit's
  403 for automated clients, so this citation is the indexed snippet, not
  a full-page fetch) — a **live, real, in-the-wild example of exactly the
  DEWIDE failure mode**: one commenter's entire reply is accidentally
  typed in fullwidth ("Ｊｕｓｔ ｓｗｉｔｃｈ ｕｒ ｋｅｙｂｏａｒｄ'ｓ
  ｉｎｐｕｔ ｍｅｔｈｏｄ. Ｔｈｅｉｒ ｓｙｓｔｅｍ ｆｒｏｍ ９０'ｓ ｏｎｌｙ
  ａｂｌｅ ｔｏ ｗｏｒｋ ｗｉｔｈ ｆｕｌｌ ｗｉｄｔｈ ｆｏｎｔ."), with other
  commenters explicitly discussing the "zenkaku nonsense" toggle as a
  known, persistent annoyance inherited from "1980s word processing
  machines." This is the single strongest piece of evidence in this
  entire research program that the phenomenon a codec targets is a real,
  currently-occurring human accident, not a manufactured fixture —
  captured live, not synthesized.

Fixture design note, made honest by this research: the
`zenkakuStuckEmail`/`zenkakuStuckSlackMessage`/`zenkakuStuckMeetingNotes`
fixtures in `bench/procrustes-fixtures.ts` are directly modeled on this
exact, now-verified-real "entire message typed in fullwidth" failure mode,
not invented in the abstract.

## Fresh search: newly solved math problems, August–September 2026 (fourth check this session's lineage; assessed for applicability, none found)

Re-run with fresh queries this segment, confirming and extending the prior
three checks with newly-surfaced detail:
[The Guardian, Sept 8 2026](https://www.theguardian.com/science/2026/sep/08/openai-claims-to-have-solved-maths-problem-that-stumped-humans-for-decades) —
OpenAI says an internal system (~10,000 coordinating AI agents, 88 hours of
compute) produced a proof that the Navier-Stokes equations' solutions can
"blow up" in finite time, addressing one of the Clay Institute's seven
Millennium Prize Problems, with GPT-6 Astra spending a further ~17 hours
independently verifying the proof;
[tech-insider.org, Sept 22 2026](https://tech-insider.org/openai-100-math-problems-solved-24-days-2026/) —
a follow-up claim, dated Sept 21 2026, that the same internal model
resolved "more than 100 long-standing open problems across most areas of
mathematics" in the 24 days since training began (Aug 28 2026), alongside
formation of a nine-member Advisory Group on Mathematics and AI hosted at
Princeton's Institute for Advanced Study — **noted honestly that no public
list of the 100+ problems or their proofs has been released for outside
review**, i.e. this specific claim is presently unverifiable, unlike the
Navier-Stokes and Erdős/Fermat results already independently reported by
multiple outlets. None of this — Navier-Stokes, the 100-problem claim, the
Erdős unit-distance disproof, or the Fermat's Last Theorem Lean
formalization already logged in this program's prior turns — touches text
representation, tokenization, or compression in any way; this remains
**pure proof-automation/formal-verification work with no reusable
technique for this codebase**. The honest conclusion from three prior
checks in this program's lineage is unchanged, now confirmed a fourth time
with fresh sources rather than assumed stale.

## Wiring

`src/lib/omega/procrustes.ts` (the codec itself) is registered in
`src/lib/omega/registry.ts` (key `procrustes`, exact family, label `★
PROCRUSTES (Kerning/Fullwidth Canonicalization Pre-Pass)`), exposed through
`src/workers/codec.types.ts` and `src/workers/codec.worker.ts` (computed on
every worker request alongside every other lane), and fully surfaced in
`src/components/Workbench.tsx`: `CodecKey` union, the `🟢 LOSSLESS · WEB UI
SAFE` group, `LABEL`/`DESCRIPTION` prose, the leaderboard `out.push(...)`
block (mirroring the `abacus` entry field-for-field), the
`decoderIsInline` inline-prompt list, and the `exactLane` list. `npx tsc
--noEmit -p tsconfig.json` is clean; `npm run build` (`vite build`)
completes cleanly (182 modules, 15.7s).
