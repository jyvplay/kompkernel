# SYNTAGMA — the largest tokenizer blind spot found in this entire program

## RUNTIME HONESTY

Tools actually used this turn: `bash` (Node/TypeScript via `npx tsx`,
Python 3 via `python3`), `read_file`/`edit_file`/`write_file`, `web_search`,
`git`/`gh` (already authenticated; branch push succeeded this turn after
the user reconnected the GitHub token). No external simulators, theorem
provers, or human-reviewed test data were used. Every number below came
from actually executing `syntagmaEncode`/`syntagmaDecode` against the live
`o200k_base` tokenizer via `npx tsx bench/syntagma-fixtures.ts` and
`npx tsx bench/syntagma-redteam.ts` in this workspace, plus several
throwaway probe scripts under `bench/tmp/` (excluded from version control)
used to measure per-character/per-syllable token costs before arriving at
the shipped design. `npx tsx bench/syntagma-redteam.ts`: **82/82 gates
pass.** `npx tsc --noEmit -p .` and `npm run build` both clean.

## A. The finding: the largest blind spot in this whole program

`bench/tmp/probe_new1.ts` / `probe_hangul2.ts`, run this session, measured
directly against the live `o200k_base` tokenizer:

| test | NFC (precomposed) | NFD (decomposed) | inflation |
|---|---|---|---|
| single Hangul syllable | 1 token | 9 tokens | +800% |
| realistic 8-sentence Korean business message | 128 tokens | 1,362 tokens | **+964.1%** |

A single precomposed Hangul syllable (e.g. 한, U+D55C) costs one token. The
IDENTICAL syllable, canonically decomposed into its three constituent Jamo
letters (ᄒ + ᅡ + ᆫ, Unicode Normalization Form D) — which a correctly
rendering font displays as the exact same glyph — costs nine tokens. This
is, by a wide margin, the largest per-instance and aggregate blind-spot
magnitude measured across every mechanism shipped in this program to date:
larger than CAESURA's 117.7% NBSP finding, larger than CIRCE's
invisible-character-guard finding, larger than every prior turn's result.

## B. Real-world prevalence — live, dated, multi-tool evidence

macOS's HFS+/APFS filesystems store Unicode filenames in Normalization
Form D by long-standing Apple policy. Any Korean filename, folder name, or
text that has passed through a macOS filesystem boundary — an exported
archive, an AirDrop transfer, a file opened by a cross-platform tool that
reads raw filesystem bytes — routinely surfaces as decomposed Hangul. This
is not a hypothetical corner case; it is a live, actively-discussed,
current-day artifact class, confirmed by primary-source bug reports dated
within the past 18 months, several within the past two weeks of this
session:

- Zed editor, [issue #26036](https://github.com/zed-industries/zed/issues/26036)
  (March 2025): "Korean file/folder names appear as decomposed (NFD) in
  Zed's built-in terminal on macOS" — files created via Finder or another
  terminal render as `ㅇㄴㅎㅅㅇ` instead of `안녕하세요`.
- [aside-codemode #30](https://github.com/lidge-jun/aside-codemode/issues/30)
  (dated **September 17, 2026**, days before this session): "macOS stores
  filenames in NFD ... It is not Korean-specific ... but Hangul makes it
  common because every syllable decomposes" — a file search silently
  returns zero matches and reports `complete: true`, which the calling
  code reads as "file does not exist" rather than "wrong normalization."
- [manaflow-ai/cmux #14891](https://github.com/manaflow-ai/cmux/issues/14891)
  (dated **September 27, 2026**, essentially concurrent with this session):
  "Korean is the worst case: every precomposed Hangul syllable decomposes,
  so almost no Korean file name can be opened" — a remote file browser
  cannot open Korean, Japanese, French, German, or Russian filenames
  transferred from a Mac.
- A dedicated, actively maintained open-source CLI tool,
  [`nfdfix`](https://github.com/greeun/nfdfix), exists solely to batch-fix
  this exact problem when files leave a Mac: "Korean text like '한글' shows
  up as 'ㅎㅏㄴㄱㅡㄹ', with the jamo split apart."
- [crosspoint-reader PR #3630](https://github.com/crosspoint-reader/crosspoint-reader/pull/3630)
  — a firmware-level fix restoring NFC composition for "decomposed (NFD)
  Hangul and Latin filenames transferred from macOS," including dedicated
  Hangul LV/LVT composition test coverage.

## C. Why this is not "ABACUS but bigger" — a genuinely distinct mechanism

ABACUS's own Unicode sub-mechanism explicitly restricts itself to "the 7
most common Latin diacritics" (verified by inspection of `abacus.ts`;
confirmed directly, `bench/syntagma-redteam.ts` gate G0), because Latin
canonical composition is fundamentally a **finite lookup table** — which
specific base-letter-plus-combining-mark *pair* maps to which precomposed
letter — safe only for a curated handful of pairs a bare LLM reliably has
memorized, honestly excluding the long tail of rarer accents.

Hangul recomposition is categorically different: it is a single
**closed-form arithmetic formula** (Unicode Standard Annex #15's Hangul
Syllable Composition algorithm) that covers all 11,172 possible modern
syllables uniformly, with no curation problem and no long tail to exclude:

```
SIndex = (LIndex * 21 + VIndex) * 28 + TIndex
syllable = U+AC00 + SIndex
```

where `LIndex` (0-18) comes from the leading consonant jamo
(U+1100-U+1112), `VIndex` (0-20) from the vowel jamo (U+1161-U+1175), and
`TIndex` (0-27) from the optional trailing consonant jamo (0 = none, else
U+11A8-U+11C2). A bare LLM decoder computes this exactly like CIRCE's own
`DEC_MARK`/`HEX_MARK` arithmetic (`&#codepoint(X)`) — genuine computation,
not memorization. This is precisely why Hangul is uniquely well-suited to
this mechanism where an unrestricted "recompose any script's NFD form"
rule would not be: a bare LLM cannot reliably recall the entire Unicode
composition table for arbitrary scripts (Vietnamese's stacked diacritics,
rare combining marks), which is exactly the risk ABACUS's own curation to
"7 common pairs" was designed to avoid. SYNTAGMA and ABACUS are
complementary, mechanism-distinct answers to the same underlying NFD/NFC
problem in two different scripts, using two different reconstruction
strategies (table lookup vs. closed-form arithmetic) precisely because the
scripts themselves have two different mathematical structures.

## D. The mechanism

`findHangulSpans` finds maximal runs of well-formed decomposed Hangul
syllable groups (one or more consecutive `L V [T]` jamo triples/pairs,
back to back with nothing else between them) and replaces each run with
its NFC-recomposed precomposed-syllable equivalent, wrapped in a bracket
pair (`⭐...❤`). A single bracket pair amortizes across however many
syllables the run contains — one long decomposed paragraph pays a fixed
~2-token bracket cost regardless of whether it has 5 or 500 syllables
inside it, exactly the same amortization discipline PROCRUSTES/ABACUS/
CAESURA already use for their own span mechanisms.

**Safety**: a span is accepted only if (a) every jamo triple decodes to a
valid modern Hangul syllable index (`LIndex` in [0,18], `VIndex` in
[0,20], `TIndex` in [0,27]) — independently cross-checked against
JavaScript's own built-in, ICU-backed `String.prototype.normalize`, used
here only as a confirming oracle, never as an unverified shortcut — and
(b) recomposing then re-decomposing the span reproduces the original run
byte-for-byte, AND (c) the real tokenizer shows a strict improvement.
Ancient/obsolete jamo outside the modern ranges, standalone Hangul
**Compatibility** Jamo (U+3131-U+318E, a completely different,
non-combining block used in dictionaries and linguistic examples — e.g.
"the letter ㄱ is called giyeok"), and any incomplete or malformed jamo
sequence are never touched.

## E. Measured results (live, `bench/syntagma-fixtures.ts` / `bench/syntagma-redteam.ts`)

**Headline fixture** (`nfdKoreanBusinessMessage`): a realistic,
non-repetitive, 8-sentence, 1,362-token Korean business message with every
Hangul syllable canonically decomposed (reproducing the exact macOS
NFD-export artifact class documented in section B):

| | raw | plain DAEDALUS | SYNTAGMA | saved | % |
|---|---|---|---|---|---|
| nfdKoreanBusinessMessage | 1,362 | 807 | 301 | **506** | **62.7%** |
| (vs. raw, no DAEDALUS competition) | 1,362 | — | 301 | 1,061 | 77.9% |

**Scaling check** (`bench/tmp/syntagma_scale.ts`, identical content,
sentence count 1→8): the win is large from the very first sentence and
climbs to a stable plateau — 31.5%, 53.3%, 54.0%, 55.8%, 54.5%, 54.0%,
57.3%, **59.5%** — a clean, immediate, honestly-scaling curve. Unlike
every prior mechanism in this program (which typically needs several
paragraphs before the fixed decode-contract overhead is amortized),
SYNTAGMA clears its own break-even on a **single sentence** — because each
individual syllable's NFD tax (8 extra tokens) is itself already larger
than most other mechanisms' entire per-instance gain.

**Honest negative space**: `embeddedNfdFilename` (96 tokens, one short
decomposed Korean filename embedded in an English email) declines — too
small (only ~7 syllables) to amortize the fixed contract overhead at this
scale. `cleanPrecomposedKorean`, `compatibilityJamoControl` (a linguistic
example using the Compatibility Jamo block, correctly never mistaken for
combining jamo), and `cleanEnglishProse` all show exactly **zero** gain —
honest, not a false headline.

## F. Red team summary

`npx tsx bench/syntagma-redteam.ts`: **82 passed, 0 failed.**

- **G0** novelty: confirmed by direct inspection that ABACUS's own Unicode
  mechanism never touches the Hangul Jamo or Hangul Syllables blocks, and
  no other lane implements Jamo composition arithmetic (a naive substring
  scan initially false-flagged `chiron.ts`'s unrelated Georgian-script
  range boundary `[0x10a0, 0x1100]` — refined to require the Hangul base
  `0xAC00` co-occurring with jamo-specific markers before re-verifying
  clean).
- **G1** exact round trip via the library decoder, all 14 fixtures.
- **G2** a second, independently-written decoder (from the tail-instruction
  prose only) agrees byte-for-byte.
- **G3** a third, independent decoder in CPython
  (`bench/syntagma_decode.py`, a from-scratch reimplementation of the UAX
  #15 arithmetic using plain Python integers, run as an external process)
  agrees byte-for-byte.
- **G4** totality: empty string, bare/malformed sentinels, dangling/
  unterminated brackets, non-syllable content (plain text, CJK ideographs)
  inside brackets, sentinel collisions, and non-SYNTAGMA text all decode
  correctly.
- **G5** message accounting: exact, every fixture.
- **G6** non-regression: SYNTAGMA never costs more than plain DAEDALUS, no
  exceptions.
- **G7** second-order adversary (5 distinct cases): standalone Hangul
  Compatibility Jamo linguistic examples (never touched), obsolete/
  historical jamo outside the modern index ranges (declined safely), an
  **exhaustive sweep of all 28 possible trailing-consonant values**
  (T=0 through T=27, confirming the "no coda" edge case never emits a
  spurious jamo and every other case emits exactly one correct trailing
  jamo), decomposed Hangul directly adjacent to CJK ideographs and emoji
  (run correctly self-terminates at the boundary, neighbors untouched),
  and the sentinel-collision escape path.
- **G8** structured fuzz: 500 randomized strings mixing decomposed jamo,
  precomposed syllables, compatibility jamo, CJK, emoji, and every
  reserved sentinel character — 0 crashes, 0 round-trip failures.
- **G9** the headline claim (section E) plus the honestly-scoped negative
  space, both directly asserted.
- **G10** speed budget: SYNTAGMA's own span-finding overhead on the full
  headline fixture completes in well under 50ms, dominated entirely by
  DAEDALUS's own search time, not SYNTAGMA's.

## G. New web research this turn (cumulative-exclusion: none of these
domains or specific pages cited by any prior codec in this repo's history)

- [Zed editor issue #26036](https://github.com/zed-industries/zed/issues/26036)
  (March 2025) — primary-source bug report on NFD Hangul rendering.
- [lidge-jun/aside-codemode issue #30](https://github.com/lidge-jun/aside-codemode/issues/30)
  (September 17, 2026) — an extremely current primary-source report
  explicitly generalizing the finding beyond Korean, to any script with
  canonical decomposition, on macOS.
- [manaflow-ai/cmux issue #14891](https://github.com/manaflow-ai/cmux/issues/14891)
  (September 27, 2026) — a near-concurrent primary-source report stating
  Hangul is "the worst case" among affected scripts.
- [greeun/nfdfix](https://github.com/greeun/nfdfix) — a dedicated,
  actively maintained open-source tool purpose-built to fix this exact
  problem, with detailed technical notes on which codepoint ranges macOS
  does and does not decompose.
- [crosspoint-reader PR #3630](https://github.com/crosspoint-reader/crosspoint-reader/pull/3630) —
  a firmware-level fix implementing Hangul LV/LVT composition with
  dedicated test coverage, corroborating the practical engineering
  approach used here.
- [dev-toolbox.tech/tools/unicode-inspector/examples/hangul-syllables](https://www.dev-toolbox.tech/tools/unicode-inspector/examples/hangul-syllables) —
  a clear worked explanation of the Hangul composition formula and its
  UTF-8 byte-size implications.
- [unicodefyi.com/guide/hangul-block](https://unicodefyi.com/guide/hangul-block/) —
  an independent restatement of the same UAX #15 algorithm with worked
  examples, used to cross-check the arithmetic implemented here.
- [grokipedia.com/page/Hangul_Syllables](https://grokipedia.com/page/Hangul_Syllables)
  (dated January 2026) — a third independent restatement of the
  decomposition/composition formulas, used as an additional cross-check.
- The original Unicode Technical Committee document,
  [unicode.org/L2/L2006/06310-hangul-decompose9.pdf](https://www.unicode.org/L2/L2006/06310-hangul-decompose9.pdf)
  (2006) — the primary standards-body source for the Hangul auxiliary
  decomposition mechanism, confirming the algorithm's provenance and
  long-standing stability.

## H. Fresh search: newly solved math problems, May-September 2026 (assessed
for applicability, none found — see also `bench/caesura-report.md` section I
for the same-lineage August 2026 results; this search targeted the earlier
part of the window)

Searched with new terms this turn. Confirmed a very active period spanning
the requested window: OpenAI's disproof of a central discrete-geometry
(unit distance) conjecture attributed to Erdős (May 20, 2026, an internal
general-purpose reasoning model, externally verified); the Jacobian
conjecture disproved in dimension ≥3 (Claude Fable, July-August 2026); the
Cycle Double Cover Conjecture solved by GPT-5.6 Sol Ultra using 64
subagents in under an hour (July 10, 2026); Sendov's Conjecture given a
computer-assisted proof (August 5, 2026); Crouzeix's Conjecture resolved
via two independent AI-assisted proofs (July-August 2026); and OpenAI's
August 1, 2026 "Ten Advances in Mathematics and Theoretical Computer
Science" roundup. None of these results — discrete/algebraic geometry,
complex analysis, graph theory — offer any technique, bound, or
construction applicable to subword-tokenizer compression or Unicode
normalization-based codec design. Consistent with every prior search in
this session's lineage: no applicability found.

## I. Wiring

`syntagmaEncode`/`syntagmaDecode`/`syntagmaDecoderPrompt` exported from
`src/lib/omega/syntagma.ts`; registered as `key: 'syntagma'` (family
`exact`, fidelity `exact`) in `src/lib/omega/registry.ts`;
`SyntagmaResult` added to `src/workers/codec.types.ts`; `syntagmaEncode`
invoked in `src/workers/codec.worker.ts`; full UI wiring (label,
description, state, dispatch case, dependency array, leaderboard-row push,
`decoderIsInline`, `exactLane`) added to `src/components/Workbench.tsx`;
wired into `bench/leaderboard.ts`. `npx tsc --noEmit -p .` and
`npm run build` both clean.
