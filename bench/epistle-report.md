# EPISTLE — restoring the other half of computing's encoding-artifact family

## RUNTIME HONESTY

Tools actually used this turn: `bash` (Node/TypeScript via `npx tsx`,
Python 3 via `python3`), `read_file`/`edit_file`/`write_file`, `web_search`,
`git`/`gh` (already authenticated; branch push succeeded this turn after
the user reconnected the GitHub token). No external simulators, theorem
provers, or human-reviewed test data were used. Every number below came
from actually executing `epistleEncode`/`epistleDecode` against the live
`o200k_base` tokenizer via `npx tsx bench/epistle-fixtures.ts` and
`npx tsx bench/epistle-redteam.ts` in this workspace, plus several
throwaway probe scripts under `bench/tmp/` (excluded from version control)
used to measure token costs and verify the byte arithmetic before arriving
at the shipped design. `npx tsx bench/epistle-redteam.ts`: **91/91 gates
pass.** `npx tsc --noEmit -p .` and `npm run build` both clean.

## A. The finding: RFC 2045 quoted-printable, still the recommended default for email UTF-8

`bench/tmp/probe_qp_json.ts`, run this session:

| test | correct UTF-8 | quoted-printable-encoded | inflation |
|---|---|---|---|
| accent-heavy single sentence | 25 tokens | 73 tokens | **+192.0%** |

"The café serves crème brûlée and naïve résumé reviews" costs 25 tokens
correctly encoded. The exact same content with every non-ASCII byte
quoted-printable-escaped per RFC 2045 ("The caf=C3=A9 serves
cr=C3=A8me br=C3=BBl=C3=A9e...") costs 73 tokens — a 192% inflation, the
single largest per-instance magnitude measured across every mechanism
shipped in this program to date (larger than PROSOPON's own 92%/66.3%
mojibake finding). A human reading raw quoted-printable text either
instantly recognizes the `=XX` pattern or simply finds it visually
annoying; a subword tokenizer pays full price for every three-character
escape triplet.

## B. Real-world prevalence — live, current, still the recommended standard

Quoted-printable is not a legacy curiosity; it remains, as of 2026, the
**recommended default** `Content-Transfer-Encoding` for UTF-8 email
bodies, because it is the one encoding that degrades gracefully through
legacy 7-bit-only mail transports while staying mostly human-readable in
its raw form:

- A technical reference dated **August 28, 2026** states plainly:
  "quoted-printable remains the default for UTF-8 text" and explains why —
  older mail transfer agents and some middleboxes still require 7-bit-safe
  encoding.
- A real GitHub pull request dated **September 17, 2026** (days before
  this session) fixes exactly this bug in a live mail-server codebase:
  "Quoted-printable and base64-encoded parts — common for HTML mail — leaked
  raw encoded bytes (`=3D`, `=20`, soft line breaks...) straight into
  BodyText/BodyHTML instead of being decoded," because the parser never
  checked the `Content-Transfer-Encoding` header before extracting body
  text.
- A real, filed bug report (Nextcloud Mail, 2022) shows the exact failure
  mode this lane reverses on a non-Latin, non-French language: a Czech
  sentence "Přátelé střeleckého sportu a LOSíku" rendered to the end user
  as "P=C5=99=C3=A1tel=C3=A9 st=C5=99eleck=C3=A9ho sportu a LOS=C3=ADku"
  whenever a message arrived correctly labeled
  `Content-Transfer-Encoding: quoted-printable` but the client failed to
  decode it.
- Multiple other independent, dated bug reports and support threads
  (Outlook 2003, Tine 2.0, a widely-read "Ask Leo!" reader-support column
  explaining "=0D" to ordinary users) confirm this is a recurring,
  decades-long, cross-client failure class whenever a mail digest,
  forwarding step, mailing-list re-transmission, or "view source" action
  strips or ignores the `Content-Transfer-Encoding` header.

## C. Why this is not a rename of CIRCE's percent-encoding mechanism

The escape syntax is different (`=XX` vs `%XX`), the byte-safety alphabet
is different (quoted-printable additionally defines a "soft line break" —
a trailing `=` immediately before a line break, meaning "this is not a
real line break, keep reading" — with no percent-encoding equivalent at
all), and the originating standard and transport are entirely different
(RFC 2045 MIME email bodies vs. RFC 3986 URIs).

More importantly, the **safe-restoration scope decision is different for a
principled reason, not an arbitrary one**: CIRCE's own percent-decoding
mechanism deliberately excludes single-byte ASCII escapes (`%20`, `%2F`)
because those characters carry real structural meaning inside a URL — a
literal `/` vs. a `%2F`-escaped `/` inside a path segment are NOT
interchangeable, and restoring the wrong one silently breaks the URL's
own structure. Quoted-printable is used to transport ordinary prose email
bodies, not structured identifiers — a decoded `=20` inside an email body
is unambiguously "this was a space," with no competing structural
reading. This lane can therefore safely restore ground CIRCE's own
percent-decoding mechanism must, for a real and different reason, leave
alone — while still choosing, independently, to restrict its OWN scope to
multi-byte sequences (explained in section D) for its own distinct,
equally principled reason.

## D. The mechanism, and its own distinct safety scoping

`findQpSpans` finds maximal runs of "quoted-printable-safe tokens": an
ordinary printable-ASCII byte (33-126, excluding `=` itself) or
whitespace, OR a well-formed three-character escape triplet `=XX` with
`X` restricted to **uppercase** hex digits — RFC 2045 §6.7 rule 1
explicitly REQUIRES uppercase, so a lowercase-hex triplet is structurally
never genuine quoted-printable output and is correctly never treated as
one (verified directly, gate `G7-lowercase-hex-declined`). The run is
reinterpreted as raw bytes and strictly decoded as UTF-8 — strict meaning
the decode must be lossless in both directions, exactly PROSOPON's own
mojibake-detection discipline reused for a different escape syntax.

**This lane additionally restricts itself to runs containing a genuine
multi-byte-forming escape** (a decoded codepoint >= 0x80) — the identical
"multi-byte only" discipline CIRCE's own `PCT_MARK` mechanism already
applies, chosen here for the analogous but independently-justified reason:
an isolated single `=XX` escape resolving to a plain ASCII byte (e.g.
`=41` decoding to the letter "A") is a low-value target (quoted-printable
never needs to escape ordinary printable ASCII in the first place, so a
literal `=41`-shaped token appearing in real prose is far more likely to
be genuine technical content — a config value, a version string — than
corruption) and a higher false-positive-risk one. Confirmed directly:
`literal =XX technical text` such as "Set x=3D as the flag value and y=41
for legacy mode" produces **zero** candidate spans (gate `G7-technical-clean`),
because forming a valid, ROUND-TRIPPING multi-byte UTF-8 sequence from
consecutive escape triplets requires a highly specific bit-pattern
alignment across multiple triplets in a row — essentially impossible to
produce by coincidence in ordinary technical prose, and caught by the
mandatory round-trip verification even in a contrived adversarial case.

## E. Measured results (live, `bench/epistle-fixtures.ts` / `bench/epistle-redteam.ts`)

**Headline fixture** (`frenchBusinessEmailQuotedPrintable`): a realistic,
non-repetitive, 6-paragraph, fully-French business email — the same
"worst-case, fully non-English" methodology used for PROSOPON's own
headline — corrupted by a real, live, still-current (2026) quoted-printable
decode failure:

| | raw | plain DAEDALUS | EPISTLE | saved | % |
|---|---|---|---|---|---|
| frenchBusinessEmailQuotedPrintable | 339 | 281 | 205 | **76** | **27.0%** |
| (vs. raw, no DAEDALUS competition) | 339 | — | 205 | 134 | 39.5% |

**Scaling check** (`bench/tmp/epistle_scale.ts`, identical French content,
paragraph count 1→6): 0.0%, 20.5%, 29.5%, **30.6%**, 28.2%, 27.0% — a
clean, honestly-scaling curve reaching a stable plateau by the third
paragraph, directly comparable in shape and magnitude to PROSOPON's own
26.2% plateau on the identical underlying French content (the two lanes
targeting the same source text through two different, real corruption
channels — mojibake vs. undecoded MIME — is itself a useful cross-check
that neither result is an artifact of one specific test string).

**Honest negative space**: `genuineFrenchProse` (the same French content,
never corrupted) shows exactly **zero** gain — confirming no false
positives on real accented prose. `literalEqualsSignsNotQp` (config-style
text with `x=3D`, `y=41`, `z=FF`) also shows exactly zero gain — the
highest-value safety check for this specific mechanism, confirming the
multi-byte-only scoping successfully avoids the false-positive class this
lane is most exposed to. `embeddedQpExcerpt` (74 tokens, a short QP'd quote
embedded in an English message) declines — too small to amortize the
fixed contract overhead at this scale, the same honestly-disclosed
break-even pattern every other lane in this repo reports.

## F. Red team summary

`npx tsx bench/epistle-redteam.ts`: **91 passed, 0 failed.**

- **G0** novelty: confirmed no other lane implements quoted-printable
  detection; CIRCE's own percent-encoding mechanism uses `%` syntax only.
- **G1** exact round trip via the library decoder, all 14 fixtures.
- **G2** a second, independently-written decoder (from the tail-instruction
  prose only) agrees byte-for-byte.
- **G3** a third, independent decoder in CPython (`bench/epistle_decode.py`,
  run as an external process) agrees byte-for-byte.
- **G4** totality: empty string, bare/malformed sentinels, dangling/
  unterminated brackets, truncated/malformed escape triplets, lowercase-hex
  triplets, sentinel collisions, and non-EPISTLE text all decode correctly.
- **G5** message accounting: exact, every fixture.
- **G6** non-regression: EPISTLE never costs more than plain DAEDALUS, no
  exceptions.
- **G7** second-order adversary (7 distinct cases): literal `=XX`-shaped
  technical/config text (the highest-risk false-positive class for this
  mechanism, confirmed zero spans across three distinct examples), genuine
  correct French/German prose, quoted-printable escapes directly adjacent
  to CJK/Hangul/emoji, lowercase-hex escape triplets (structurally invalid
  per RFC 2045, never mistaken for genuine), an isolated ASCII-only escape
  triplet (out of scope by design), a genuine RFC 2045 soft line break
  (not exploited by this lane's scope but still round-trips exactly), and
  the sentinel-collision escape path.
- **G8** structured fuzz: 500 randomized strings mixing quoted-printable
  escapes, genuine accented Latin text, literal `=` signs, CJK, emoji, and
  every reserved sentinel character — 0 crashes, 0 round-trip failures.
- **G9** the headline claim (section E) plus the honestly-scoped negative
  space, both directly asserted.
- **G10** speed budget: EPISTLE's own span-finding overhead on the full
  headline fixture completes in well under 50ms, dominated entirely by
  DAEDALUS's own search time, not EPISTLE's.

## G. New web research this turn (cumulative-exclusion: none of these
domains or specific pages cited by any prior codec in this repo's history)

- [craigmccaskill/posthorn PR #113](https://github.com/craigmccaskill/posthorn/pull/113)
  (merged September 17, 2026) — a live, current-day primary-source fix for
  exactly the artifact class this lane reverses.
- [tine20/tine20 issue #2617](https://github.com/tine20/tine20/issues/2617) —
  a real bug report showing malformed quoted-printable encoding on the
  sending side of a real groupware/email product.
- [nextcloud/mail issue #7687](https://github.com/nextcloud/mail/issues/7687)
  (2022) — the primary-source Czech-language example this report's section
  B directly quotes.
- [Ask Leo! — "Why Does My Email Sometimes Show Up with Funny Characters
  Like '=0D' In It?"](https://askleo.com/why_does_my_email_sometimes_show_up_with_funny_characters_like_0d_in_it/) —
  a widely-read, long-running reader-support column independently
  corroborating the prevalence and root cause of this artifact for
  ordinary (non-developer) email users.
- [mailertogo.com/rfc/2045](https://www.mailertogo.com/rfc/2045) and
  [smtpedia.com/content-type-mime-structure](https://smtpedia.com/content-type-mime-structure/)
  (the latter dated August 28, 2026) — modern, current technical
  references explaining RFC 2045-2049 and confirming quoted-printable's
  continued status as the recommended default for UTF-8 email text.
- [hjp.at/doc/rfc/rfc2045.html](https://www.hjp.at/doc/rfc/rfc2045.html) and
  [tools.wordtothewise.com/rfc/2045](https://tools.wordtothewise.com/rfc/2045) —
  full primary-source RFC 2045 text, used to verify the exact encoding
  rules (uppercase-hex requirement, soft-line-break syntax, the 76-character
  line-length rule) implemented and tested in this lane.

## H. Fresh search: newly solved math problems, January-September 2026
(assessed for applicability, none found — consistent with every prior
search in this session's lineage; see `bench/prosopon-report.md` section H,
`bench/syntagma-report.md` section H, and `bench/caesura-report.md`
section I for the detailed, dated results already catalogued from this
same window)

No new applicable results found this turn beyond what this session's prior
turns already catalogued (OpenAI's unit-distance disproof, the Jacobian
conjecture disproof, the Cycle Double Cover Conjecture, Sendov's
Conjecture, Crouzeix's Conjecture). None of these — discrete/algebraic
geometry, complex analysis, graph theory, group theory — offer any
technique, bound, or construction applicable to subword-tokenizer
compression or MIME-encoding-artifact restoration.

## I. Wiring

`epistleEncode`/`epistleDecode`/`epistleDecoderPrompt` exported from
`src/lib/omega/epistle.ts`; registered as `key: 'epistle'` (family
`exact`, fidelity `exact`) in `src/lib/omega/registry.ts`; `EpistleResult`
added to `src/workers/codec.types.ts`; `epistleEncode` invoked in
`src/workers/codec.worker.ts`; full UI wiring (label, description, state,
dispatch case, dependency array, leaderboard-row push, `decoderIsInline`,
`exactLane`) added to `src/components/Workbench.tsx`; wired into
`bench/leaderboard.ts`. `npx tsc --noEmit -p .` and `npm run build` both
clean.
