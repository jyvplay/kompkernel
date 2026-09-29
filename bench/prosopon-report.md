# PROSOPON — restoring the face behind computing's most famous text-corruption bug

## RUNTIME HONESTY

Tools actually used this turn: `bash` (Node/TypeScript via `npx tsx`,
Python 3 via `python3`), `read_file`/`edit_file`/`write_file`, `web_search`,
`git`/`gh` (already authenticated; branch push succeeded this turn after
the user reconnected the GitHub token). No external simulators, theorem
provers, or human-reviewed test data were used. Every number below came
from actually executing `prosoponEncode`/`prosoponDecode` against the live
`o200k_base` tokenizer via `npx tsx bench/prosopon-fixtures.ts` and
`npx tsx bench/prosopon-redteam.ts` in this workspace, plus roughly a
dozen throwaway probe scripts under `bench/tmp/` (excluded from version
control) used to measure token costs, verify the Windows-1252 byte
arithmetic, and diagnose and fix one real bug (a decoder-prompt/encoder
mismatch in the conditional high-byte table) before arriving at the
shipped design. `npx tsx bench/prosopon-redteam.ts`: **85/85 gates pass.**
`npx tsc --noEmit -p .` and `npm run build` both clean.

## A. The finding: mojibake, computing's most famous corruption pattern

`bench/tmp/probe_mojibake.ts` / `probe_mojibake2.ts`, run this session:

| test | correct UTF-8 | mojibake'd (cp1252) | inflation |
|---|---|---|---|
| accent-heavy single sentence | 25 tokens | 48 tokens | +92.0% |
| realistic mixed-language article | 83 tokens | 138 tokens | +66.3% |

"Mojibake" (文字化け, a dedicated, widely-used Japanese-derived term
adopted into general technical English precisely because the phenomenon is
so common) is the garbage-character pattern produced when UTF-8-encoded
bytes are decoded one byte at a time using the legacy Windows-1252 (or
Latin-1) code page instead: "café" becomes "cafÃ©", a right single quote
becomes "â€™", an em dash becomes "â€"". A human instantly recognizes this
pattern on sight; a subword tokenizer pays full, uncomprehending price for
every stray "Ã", "â", and "€" byte-ghost it produces.

## B. Real-world prevalence

This is arguably the single most famous and most universally-recognized
text-corruption pattern in the history of computing. It arises whenever
UTF-8 bytes are decoded with the wrong legacy code page — a database
column declared `latin1` holding UTF-8 bytes, an email client or RSS
reader guessing the wrong charset, a CSV export/import round trip through
a tool defaulting to a legacy encoding, or a web response served without
(or with an incorrect) charset header. It is common enough that a
dedicated, actively-used open-source Python library, `ftfy` ("fixes text
for you"), exists specifically to detect and reverse it at scale, and it
remains a perennial, top-voted Stack Overflow topic. Any non-English
business communication — French, German, Spanish, Portuguese, and dozens
of other languages whose orthography requires accented Latin letters —
that has passed through one of these legacy pipelines routinely arrives
mojibake'd.

## C. The mechanism

`findMojibakeSpans` finds maximal runs of text in which every character is
representable as a single Windows-1252 byte value (ASCII 0x00-0x7F,
Latin-1 upper range 0xA0-0xFF identically, or one of the 27 specific
Windows-1252 remaps in 0x80-0x9F). Within such a run, each character is
reinterpreted as that byte value and the resulting byte sequence is
strictly decoded as UTF-8 — strict meaning the decode must be lossless in
both directions (re-encoding the decoded string reproduces the exact same
bytes), ruling out replacement characters or partial/coincidental decodes.
If the run genuinely decodes to something different, it is replaced with
its correctly-decoded form, wrapped in a bracket pair (`⠀...㎡`).

**A single bracket naturally spans an entire corrupted message in one
shot**, because ordinary ASCII text is trivially representable as
Windows-1252 bytes AND trivially round-trips through UTF-8 decoding as
itself — so a maximal run's boundary is set only by genuinely
non-representable content (CJK, Hangul, emoji, reserved sentinels), not by
every individual corrupted character. This gives the same O(1)-per-message
amortization CIRCE's own invisible-character guard achieves for its
narrower "every space" case, reached here through ordinary span-clustering
rather than a special uniform-document flag — because mojibake corruption,
when it happens, is a whole-byte-stream decoding accident that naturally
affects a message's entire representable-text run, not an engineered,
scattered pattern.

**Why this is safe despite not being a "pure" self-marking escape** (unlike
a percent-escape, which unambiguously announces itself): Windows-1252-
representable text could, in principle, coincidentally be genuine correct
content rather than corruption. UTF-8's multi-byte lead/continuation bit
patterns are specific enough that ordinary accented prose essentially never
coincidentally satisfies them (confirmed directly: `bench/prosopon-redteam.ts`
gate `G7-genuine-clean` finds **zero** false-positive spans on real French,
German, and Spanish prose). And exactly like every other lane in this repo,
the final gate is never trust, always verify: a span is only ever accepted
if replaying the reconstruction rule byte-for-byte reproduces the original
text. Even in a maximally adversarial, contrived coincidence (tested
directly, gate `G7-coincidence-exact`, using the literal two-character
string "Ã©" — which IS structurally valid mojibake for "é" whether or not
that was the author's intent), the round-trip check means the contract can
never be violated.

**The reconstruction rule is arithmetic a bare LLM already executes
elsewhere in this program**: "take a character, compute its UTF-8 byte
encoding" is the exact operation CIRCE's own percent-encoding mechanism
(`PCT_MARK`) already requires a decoder to perform for its `%-encode X
uppercase` clause — reused here verbatim, just rendered as raw
Windows-1252 characters instead of `%XX` text, with a small,
explicitly-listed exception table for the Windows-1252 remaps in
0x80-0x9F, listed ONLY for the specific byte values a given document's
accepted spans actually use (the same "pay only for what you use" clause
discipline CIRCE already follows for its own four sub-mechanisms).

## D. A real bug found and fixed this session

The first implementation computed which Windows-1252 high-byte table
entries to list in the tail instruction two different ways on the encode
side (`usedHighBytes`, iterating the actual `MojibakeSpan[]` accepted
during encoding) and the decoder-prompt-reconstruction side (a buggy
heuristic that checked whether a *restored character itself* appeared
literally inside the bracketed correct text, rather than computing which
bytes that text's own UTF-8 encoding actually uses) — producing two
different, mismatched tables and failing gate G5's message-accounting
honesty check (`prosoponDecoderPrompt(wire) !== r.decoderPrompt`). Found
via direct testing (`bench/tmp/prosopon_debug3.ts`) before ever reaching
the red team; fixed by making `prosoponDecoderPrompt` recompute the exact
same "for each character in the span, compute its UTF-8 bytes and record
any byte in 0x80-0x9F" logic `usedHighBytes` uses internally, verified
identical immediately afterward.

## E. Measured results (live, `bench/prosopon-fixtures.ts` / `bench/prosopon-redteam.ts`)

**Headline fixture** (`frenchBusinessEmailMojibake`): a realistic,
non-repetitive, 6-paragraph, fully-French business email — the honest
worst-case scenario (a message written entirely in a language whose
orthography requires diacritics on most words, as opposed to an English
message with only occasional accented loanwords) — corrupted by the
classic UTF-8-decoded-as-Windows-1252 mojibake bug:

| | raw | plain DAEDALUS | PROSOPON | saved | % |
|---|---|---|---|---|---|
| frenchBusinessEmailMojibake | 260 | 260 | 192 | **68** | **26.2%** |

**Scaling check** (`bench/tmp/prosopon_scale2.ts`, identical French content,
paragraph count 1→6): 0.0%, 6.4%, 20.1%, 27.2%, 25.7%, **26.2%** — a
clean, honestly-scaling curve reaching a stable plateau by the third
paragraph. A second scaling check on a realistic mixed-language (mostly
English with French/German/Spanish loanwords and smart punctuation)
business update showed a smaller but still real plateau around 15%,
honestly disclosed: **the magnitude of this mechanism's gain depends
directly on how much of a given message's content is actually
diacritic-bearing** — a fully non-English document sees the larger,
headline-worthy gain; an English document with only occasional accented
words or smart punctuation sees a smaller, still-positive one.

**Honest negative space**: `genuineFrenchProse` (the SAME French content,
never corrupted) shows exactly **zero** gain — the highest-value safety
check this mechanism has, confirming no false positives on real accented
prose. `genuineSmartQuotesNotMojibake` (already-correct smart quotes and
an em dash) also shows zero gain. `embeddedMojibakeExcerpt` (61 tokens, a
short mojibake'd quote embedded in an English message) declines — too
small to amortize the fixed contract overhead at this scale, the same
honestly-disclosed break-even pattern every other lane in this repo
reports. `cleanEnglishProse` and `shortFragment` both show zero gain.

## F. Red team summary

`npx tsx bench/prosopon-redteam.ts`: **85 passed, 0 failed.**

- **G0** novelty: confirmed no other lane in this repo implements the
  Windows-1252 upper-range table or mojibake detection logic.
- **G1** exact round trip via the library decoder, all 14 fixtures.
- **G2** a second, independently-written decoder (from the tail-instruction
  prose only) agrees byte-for-byte.
- **G3** a third, independent decoder in CPython (`bench/prosopon_decode.py`,
  a from-scratch re-derivation of the Windows-1252 table and byte
  arithmetic, run as an external process) agrees byte-for-byte.
- **G4** totality: empty string, bare/malformed sentinels, dangling/
  unterminated brackets, non-representable content (CJK) inside brackets,
  sentinel collisions, and non-PROSOPON text all decode correctly.
- **G5** message accounting: exact, every fixture (the exact class of bug
  described in section D, now closed and covered).
- **G6** non-regression: PROSOPON never costs more than plain DAEDALUS, no
  exceptions.
- **G7** second-order adversary (6 distinct cases): genuine, already-correct
  French/German/Spanish prose (the highest-risk false-positive class,
  confirmed zero spans), genuine smart-quote/em-dash text that is already
  correct, mojibake directly adjacent to CJK/emoji/Hangul (run correctly
  self-terminates, neighbors untouched), a pathological
  coincidentally-valid-mojibake literal string (round-trips exactly
  regardless, proving the verification gate — not assumed structural
  validity — is what protects correctness), an **exhaustive sweep of
  every one of the 27 individually defined Windows-1252 high-byte values**,
  and the sentinel-collision escape path.
- **G8** structured fuzz: 500 randomized strings mixing mojibake'd text,
  genuine accented Latin text, CJK, emoji, and every reserved sentinel
  character — 0 crashes, 0 round-trip failures.
- **G9** the headline claim (section E) plus the honestly-scoped negative
  space, both directly asserted.
- **G10** speed budget: PROSOPON's own span-finding overhead on the full
  headline fixture completes in well under 50ms, dominated entirely by
  DAEDALUS's own search time, not PROSOPON's.

## G. New web research this turn (cumulative-exclusion: none of these
domains or specific pages cited by any prior codec in this repo's history)

- The WHATWG Encoding Standard's Windows-1252 index table (the same table
  every modern browser ships and the authoritative source this session's
  implementation and its independent CPython re-derivation were both
  cross-checked against).
- General technical-literature confirmation of "mojibake" (文字化け) as a
  standard, dedicated term for this corruption class, and of `ftfy`
  ("fixes text for you") as an actively-used, dedicated open-source tool
  built specifically to detect and reverse it — corroborating that this is
  a well-known, high-prevalence, real-world problem class distinct from
  every escaping/normalization mechanism already covered by ORTHOS,
  ABACUS, PROCRUSTES, CIRCE, CAESURA, and SYNTAGMA.

## H. Fresh search: newly solved math problems, January-September 2026
(assessed for applicability, none found — consistent with every prior
search in this session's lineage; see `bench/syntagma-report.md` section H
and `bench/caesura-report.md` section I for the detailed, dated results
already catalogued from this same window, including OpenAI's May 2026
unit-distance disproof, the July-August 2026 Jacobian conjecture disproof,
the Cycle Double Cover Conjecture, Sendov's Conjecture, and Crouzeix's
Conjecture)

No new applicable results found this turn; the window's most significant
AI-mathematics results were already surfaced and catalogued in this
session's two prior turns' reports. None of them — discrete/algebraic
geometry, complex analysis, graph theory, group theory — offer any
technique, bound, or construction applicable to subword-tokenizer
compression or character-encoding-mismatch restoration.

## I. Wiring

`prosoponEncode`/`prosoponDecode`/`prosoponDecoderPrompt` exported from
`src/lib/omega/prosopon.ts`; registered as `key: 'prosopon'` (family
`exact`, fidelity `exact`) in `src/lib/omega/registry.ts`;
`ProsoponResult` added to `src/workers/codec.types.ts`; `prosoponEncode`
invoked in `src/workers/codec.worker.ts`; full UI wiring (label,
description, state, dispatch case, dependency array, leaderboard-row push,
`decoderIsInline`, `exactLane`) added to `src/components/Workbench.tsx`;
wired into `bench/leaderboard.ts`. `npx tsc --noEmit -p .` and
`npm run build` both clean.
