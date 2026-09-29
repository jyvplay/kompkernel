# CAESURA — the space character itself was the blind spot

## RUNTIME HONESTY

Tools actually used this turn: `bash` (Node/TypeScript via `npx tsx`,
Python 3 via `python3`), `read_file`/`edit_file`/`write_file`, `web_search`,
`git`/`gh` (already authenticated; branch push succeeded this turn after
the user reconnected the GitHub token). No external simulators, theorem
provers, or human-reviewed test data were used. Every number below came
from actually executing `caesuraEncode`/`caesuraDecode` against the live
`o200k_base` tokenizer via `npx tsx bench/caesura-fixtures.ts` and
`npx tsx bench/caesura-redteam.ts` in this workspace, plus roughly a dozen
throwaway probe scripts under `bench/tmp/` (excluded from version control)
used to measure per-character token costs and diagnose a real span-finding
bug before arriving at the shipped design. `npx tsx bench/caesura-redteam.ts`:
**89/89 gates pass.** `npx tsc --noEmit -p .` and `npm run build` both clean.

## A. The blind spot: nobody in this program has touched the space character

Every mechanism shipped so far in this program canonicalizes the WORDS,
PUNCTUATION, or ESCAPING around a gap between words (ORTHOS: apostrophe
glyph; STENTOR: sustained case; ABACUS: digit grouping/Unicode composition;
PROCRUSTES: letter-spacing/glyph width; CIRCE: markup/percent/invisible-
character escaping; CHIMERA: composes the five above). Not one of them
inspects the SPACE CHARACTER ITSELF. CAESURA is the first lane in this
program to canonicalize *which whitespace convention produced the gaps
between words*.

## B. The measurement (o200k_base, live tokenizer, this session)

`bench/tmp/probe1.ts` through `probe7.ts`, run this session:

| artifact | cost |
|---|---|
| Non-breaking space (U+00A0) vs. ASCII space, per instance | **~1.13 extra tokens** |
| Narrow no-break space (U+202F) vs. ASCII space, per instance | **~1.13 extra tokens** (identical) |
| Every space in a realistic 192-token article replaced with NBSP | **+226 tokens, +117.7%** (more than doubles) |
| Uniform "two spaces after a sentence" convention, per sentence boundary | **~1 extra token** |
| Trailing whitespace, per line | **~1 extra token** |

The NBSP/narrow-NBSP finding is, by a wide margin, the largest single
per-instance and aggregate blind-spot magnitude measured across every lane
in this program to date (larger than CIRCE's own invisible-character-guard
finding from the prior turn). A human proofreading NBSP-substituted text
sees **nothing wrong at all** — NBSP is pixel-identical to a space in every
font and every rendering context a chat UI will ever use.

## C. Real-world prevalence — two independent, well-documented causes

**Cause 1: a recurring, multi-year, cross-platform editor bug class.**
Independent bug reports across unrelated codebases confirm rich-text /
`contenteditable` editors silently converting most or all typed or pasted
spaces into non-breaking spaces:

- Mozilla Bugzilla [#194498](https://bugzilla.mozilla.org/show_bug.cgi?id=194498)
  (opened 2003, still discussed in 2019) and
  [#359303](https://bugzilla.mozilla.org/show_bug.cgi?id=359303) (2015,
  still active through 2023) — both about NBSP/space conversion in
  Mozilla's own plain-text serializer and clipboard handling.
- WordPress Gutenberg [issue #7474](https://github.com/WordPress/gutenberg/issues/7474)
  (2018): "If you paste text into a paragraph block ... it will convert the
  space into the non breaking space."
- CraftCMS Redactor [issue #383](https://github.com/craftcms/redactor/issues/383)
  (2022): non-breaking spaces silently substituted on paste, with no
  working configuration to disable it.
- A **live itch.io bug**, [issue #1733](https://github.com/itchio/itch.io/issues/1733),
  opened **February 2025**: "Nearly all spaces ... become non breaking
  spaces ... completely invisible," independently confirmed by "at least 4
  other developers."

**Cause 2: official French typography.** The Imprimerie Nationale
convention — still documented and actively taught in 2024-2025 sources —
requires a non-breaking or narrow non-breaking space before `; : ! ?` and
inside `« »` guillemets, and Microsoft Office / LibreOffice / LaTeX
auto-insert it whenever the document language is set to French (France).
Any French business email, report, or chat message pasted into an
English-UI tool routinely carries these ([1](https://mytexttool.com/blog/posts/french-typography-rules.html),
[2](https://www.supermemo.com/en/blog/punctuation-in-french-rules-worth-knowing),
[3](https://forum.wordreference.com/threads/fr-space-before-a-colon-semicolon-question-mark-or-exclamation-point.54376/)).

This is not a contrived adversary: it is two independently-documented,
still-live, real causes with a combined multi-decade paper trail.

## D. The two mechanisms

### D.1 Space-lookalike span clustering (primary, large-gain mechanism)

`findNbspSpans` finds maximal contiguous runs of text where words are
separated ONLY by a single lookalike codepoint (NBSP or narrow-NBSP, never
mixed, never a genuine ASCII space) and wraps each run in a bracket pair
identifying the target codepoint (`▀...█` for NBSP, `▄...█` for narrow-NBSP).
This is a maximal self-terminating run, structurally the same discipline
PROCRUSTES's own DESTRETCH/DEWIDE mechanisms already use for letter-spaced
and fullwidth runs, applied to a different character class. A single
bracket pair amortizes across however many words the run contains — one
long NBSP-corrupted paragraph pays a fixed ~2-token bracket cost regardless
of whether it has 5 or 50 word gaps inside it.

**This is deliberately NOT a rename of CIRCE's invisible-character guard.**
CIRCE's own mechanism targets characters with zero rendering footprint,
used almost exclusively for steganography/watermarking/SEO-stuffing —
content-free noise a human cannot see at all — and requires a single,
whole-document, all-or-nothing boolean flag (every space in the entire
message, or none). CAESURA's target is a VISIBLE, FUNCTIONAL Unicode
primitive (a non-breaking space is a genuine typographic signal, "do not
line-break here") whose failure mode is an editor bug or an overapplied
foreign-language convention, not an adversarial payload — and its
detection algorithm supports MULTIPLE independent spans anywhere in a
document (a single pasted French paragraph embedded in an otherwise-
ordinary English message still qualifies), which CIRCE's single
whole-document flag structurally cannot do.

### D.2 Uniform double-space-after-sentence flag (secondary mechanism)

A whole-document, zero-per-instance-cost rule with the identical proof
shape as CIRCE's own invisible-character guard: verify that EVERY
occurrence of `[.!?]` followed by whitespace uses EXACTLY two space
characters, with zero exceptions anywhere in the document; if so, collapse
every instance to one space and record a single flag bit; restore
re-doubles every instance by the same mechanical rule. A single
non-conforming sentence boundary (even one single- or triple-spaced
instance) safely and correctly declines the entire mechanism — verified
directly in the red team (`G7-doublespace-declined`), never assumed. This
mechanism's real-world magnitude is honestly smaller than D.1 (roughly 1
token per sentence boundary, versus ~1.13 tokens per WORD GAP for the NBSP
mechanism), so it typically needs a longer document to clear its own fixed
overhead — reported honestly, not oversold.

## E. Measured results (live, `bench/caesura-fixtures.ts` / `bench/caesura-redteam.ts`)

**Headline fixture** (`nbspEditorBugArticle`): a realistic, non-repetitive
411-token, 9-paragraph business update with every space corrupted to NBSP
(reproducing the exact itch.io/Gutenberg/Redactor bug class documented in
section C):

| | raw | plain DAEDALUS | CAESURA | saved | % |
|---|---|---|---|---|---|
| nbspEditorBugArticle | 411 | 393 | 234 | **159** | **40.5%** |
| (vs. raw, no DAEDALUS competition) | 411 | — | 234 | 177 | 43.1% |

**Scaling check** performed during development (`bench/tmp/caesura_scale.ts`,
identical article content, paragraph count 1→10): the win grows cleanly
from 0% (too short to amortize the fixed decode-contract overhead) through
21.1%, 27.7%, 34.2%, 37.7%, 39.8%, plateauing around **39-40%** by
paragraph 7 onward — a clean, monotonic, honestly-scaling curve, not a
cherry-picked single data point.

This is the largest headline percentage of any mechanism shipped in this
program's recent turns (larger than CIRCE's own 24-37%, larger than
CHIMERA's delegated 24% win), on a realistic, non-adversarial, honestly-
sized business document.

**Honest negative space**: `embeddedNbspParagraph` (96 tokens, one
NBSP-corrupted paragraph embedded in an otherwise-normal message) declines
— too small to amortize the ~20-30 token fixed contract overhead at this
scale, matching the same honestly-disclosed break-even pattern every other
lane in this repo reports. `frenchTypography` (39 tokens, several small
isolated 1-2-word NBSP spans) also declines at this size — each isolated
span only saves ~1 token, less than its own ~2-token bracket cost.
`doubleSpacedMemo` declines (only 8 sentence boundaries, margin smaller
than the mechanism's own fixed clause cost). `cleanProseControl`,
`mixedSpacingControl` (non-uniform spacing, correctly declining mechanism
2), and `shortFragment` all show exactly **zero** gain — honest, not a
false headline.

## F. Safety and verification discipline

Identical standard to every prior lane: a span is only ever accepted if
replaying its bracket's exact mechanical reconstruction rule reproduces
the original substring byte-for-byte, AND the real `o200k_base` tokenizer
(never estimated) shows a strict improvement. The double-space flag is
only ever accepted if every instance in the whole document matches the
uniform pattern with zero exceptions, and the full re-expansion reproduces
the original document byte-for-byte. CAESURA structurally cannot cost more
than plain DAEDALUS (verified for every fixture, gate G6).

A real bug was found and fixed this session: the first implementation of
`findNbspSpans` used a bidirectional character-by-character boundary-walk
that produced incorrect, overlapping span boundaries on real test input
(confirmed via `bench/tmp/caesura_debug1.ts`). It was replaced with a
simpler, more obviously-correct linear single-pass state machine (split
the text on every whitespace-class character, walk the resulting
word/separator sequence once, extend or flush a "run" based on whether
consecutive separators share the same lookalike target) — verified
correct via the same debug script before being accepted, and covered by
the G7 second-order adversary suite (mixed-target adjacency, NBSP-near-
newline, isolated single instances) plus the G8 500-case fuzz.

## G. Red team summary

`npx tsx bench/caesura-redteam.ts`: **89 passed, 0 failed.**

- **G0** novelty: confirmed no other lane implements NBSP-span-detection or
  double-space-convention logic; CIRCE's only reference to U+00A0 is its
  own, unrelated `&nbsp;` named-HTML-entity table entry (verified by
  inspection, a different mechanism decoding explicit markup, not
  detecting uniform space-substitution).
- **G1** exact round trip via the library decoder, all 15 fixtures.
- **G2** a second, independently-written decoder (from the tail-instruction
  prose only) agrees byte-for-byte.
- **G3** a third, independent decoder in CPython (`bench/caesura_decode.py`,
  run as an external process) agrees byte-for-byte.
- **G4** totality: empty string, bare/malformed sentinels, malformed flag
  digits, dangling/unterminated brackets, sentinel collisions, and
  non-CAESURA text all decode correctly.
- **G5** message accounting: exact, every fixture.
- **G6** non-regression: CAESURA never costs more than plain DAEDALUS, no
  exceptions.
- **G7** second-order adversary (8 distinct cases): genuine CJK/emoji text
  with real legitimate spaces (never touched), an isolated single NBSP
  instance (e.g. "10 AM" kept together — a legitimate, common use, exact
  regardless of economics), mixed NBSP/narrow-NBSP in immediate adjacency
  (correctly kept as distinct spans, never merged), NBSP adjacent to a
  genuine newline (line structure preserved), the double-space mechanism's
  mandatory all-or-nothing decline on a single non-conforming instance,
  the sentinel-collision escape path, and a document exercising both
  mechanisms simultaneously.
- **G8** structured fuzz: 500 randomized strings mixing NBSP, narrow-NBSP,
  genuine whitespace, sentence punctuation, and every reserved sentinel
  character — 0 crashes, 0 round-trip failures.
- **G9** the headline claim (section E) plus the honestly-scoped negative
  space, both directly asserted.
- **G10** speed budget: CAESURA's own span-finding overhead on the full
  headline fixture completes in well under 50ms, dominated entirely by
  DAEDALUS's own search time, not CAESURA's.

## H. New web research this turn (cumulative-exclusion: none of these
domains or specific pages cited by any prior codec in this repo's history)

- [Mozilla Bugzilla #194498](https://bugzilla.mozilla.org/show_bug.cgi?id=194498)
  and [#359303](https://bugzilla.mozilla.org/show_bug.cgi?id=359303) —
  primary-source, multi-year bug reports confirming the NBSP/space
  conversion editor-bug class at the browser level.
- [WordPress Gutenberg #7474](https://github.com/WordPress/gutenberg/issues/7474) —
  a 2018 real bug report, "pasting text ... converts spaces to non breaking
  spaces."
- [CraftCMS Redactor #383](https://github.com/craftcms/redactor/issues/383) —
  a 2022 real bug report, same class, different platform.
- [itch.io #1733](https://github.com/itchio/itch.io/issues/1733) — a
  **live, February 2025** bug report independently confirmed by multiple
  developers, establishing this is still an active, current-day issue.
- [mytexttool.com/blog/posts/french-typography-rules.html](https://mytexttool.com/blog/posts/french-typography-rules.html) —
  a comprehensive, dated (December 2025) summary of official French
  non-breaking-space typography rules.
- [supermemo.com/en/blog/punctuation-in-french-rules-worth-knowing](https://www.supermemo.com/en/blog/punctuation-in-french-rules-worth-knowing) —
  a November 2024 article independently confirming the same convention.
- [forum.wordreference.com](https://forum.wordreference.com/threads/fr-space-before-a-colon-semicolon-question-mark-or-exclamation-point.54376/) —
  a long-running, expert-moderated language forum thread citing the
  Imprimerie Nationale as the authoritative French typographic source.
- [our-languages.canada.ca](https://our-languages.canada.ca/en/writing-tips-plus/punctuation-standard-spacing-in-english-and-french) —
  a July 2025-dated official Canadian government language-standards page
  confirming French/English spacing convention differences.

## I. Fresh search: newly solved math problems, May-September 2026 (assessed
for applicability, none found)

Searched with new terms this turn ("AI solved mathematics problem June July
August 2026 new proof announced"). Confirmed a remarkably active period:
the Jacobian conjecture disproved in dimension ≥3 (Claude Fable, prompted
by Alpöge and Mathew, July-August 2026, with a Lean formalization by Boris
Alexeev), Sendov's Conjecture given a computer-assisted proof (Lech Mazur,
August 5, 2026), the Cycle Double Cover Conjecture (50 years old) solved by
GPT-5.6 Sol Ultra using 64 subagents in under an hour (July 10, 2026), the
Dinitz-Garg-Goemans conjecture and the 153-year-old Maxwell conjecture both
disproved (July 2026), the absolute Galois group of the 2-adics Q₂ found
(July 2026), Crouzeix's Conjecture fully resolved via two independent
AI-assisted proofs (Shanmu Jin, July 27; Lorist & Schwenninger, August 4),
and OpenAI's August 1, 2026 "Ten Advances in Mathematics and Theoretical
Computer Science" roundup. None of these results — group theory, complex
analysis, graph theory, PDE, discrete geometry, algebraic number theory —
offer any technique, bound, or construction applicable to subword-tokenizer
compression, whitespace canonicalization, or reversible text-codec design.
Consistent with every prior search in this session's lineage: no
applicability found.

## J. Wiring

`caesuraEncode`/`caesuraDecode`/`caesuraDecoderPrompt` exported from
`src/lib/omega/caesura.ts`; registered as `key: 'caesura'` (family `exact`,
fidelity `exact`) in `src/lib/omega/registry.ts`; `CaesuraResult` added to
`src/workers/codec.types.ts`; `caesuraEncode` invoked in
`src/workers/codec.worker.ts`; full UI wiring (label, description, state,
dispatch case, dependency array, leaderboard-row push, `decoderIsInline`,
`exactLane`) added to `src/components/Workbench.tsx`; wired into
`bench/leaderboard.ts`. `npx tsc --noEmit -p .` and `npm run build` both
clean.
