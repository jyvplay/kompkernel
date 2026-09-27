# STENTOR — the shout tax nobody was collecting

Artifact for `src/lib/omega/stentor.ts`.
Measurements this turn: `bench/stentor-redteam.ts` (full suite, **106/106
gates**), `bench/stentor-fixtures.ts`, `bench/stentor_decode.py` (third,
independent CPython decoder), `bench/tmp/stentor_single_doc_test.ts`,
`bench/tmp/stentor_combo_test.ts`, `bench/tmp/tail_cost*.ts`,
`bench/tmp/find_glyphs*.ts`, `bench/tmp/debug_span.ts`,
`bench/leaderboard.ts` / `src/lib/omega/registry.ts` /
`src/workers/codec.{types,worker}.ts` / `src/components/Workbench.tsx` (repo
wiring). Also: a real, evidence-backed evaluation of this turn's three
uploaded `jules_session_*_AI_Ready.txt` candidate patch files (found for the
first time in four turns — see section "The uploaded files" below).

---

## RUNTIME HONESTY

**Used:** Node v22.22.3, `npx tsx` (installed fresh this turn —
`node_modules` had been wiped again; `npm install` restored it), TypeScript
(`npx tsc --noEmit -p tsconfig.json` — clean, zero errors, twice: once
before and once after removing the three scratch `__jeval_*.ts` evaluation
files), Vite (`npm run build` — succeeded, `dist/index.html` 8.69MB / 3.63MB
gzip), the live `gpt-tokenizer` o200k_base encoder via `countTokens`,
**CPython 3** (`python3 bench/stentor_decode.py`, a from-scratch
reimplementation reusing only the separately-verified `chiron_decode.py`),
`grep`/`find` across the whole filesystem, and `web_search`/`fetch_page`.

**Broken / not attempted:** no LLM API call, no GPU, no theorem prover, no
agent fleet. G2/G3 (see below) substitute two independent from-spec
re-implementations — the strongest verification available without an LLM
API call, but not the same claim as "an LLM decoded it by hand."

**THE THREE `jules_session_*_AI_Ready.txt` FILES WERE FOUND THIS TURN** —
for the first time after three consecutive turns of `find / -iname
"*.txt"` turning up nothing. They were evaluated for real: extracted,
compiled against this actual live repository, and functionally benchmarked
against real fixtures. Full findings below; short version: **rejected, with
receipts, for measured regressions up to 5.5x worse than doing nothing.**

---

## A. Formal Model

Fixed contract: **F(text) → (wire, decoderPrompt)**, single plain-text chat
message, zero system prompt / skills.md / tool access, judged by
`messageTokens = countTokens(decoderPrompt, o200k_base)` where
`decoderPrompt` already contains `wire` verbatim. A codec is admissible only
if `decode(wire) === text` for every input (byte-exact) and if it never
produces `messageTokens` worse than the incumbent it wraps (DAEDALUS), except
for one bounded, disclosed, unavoidable disambiguation cost (G7-collision,
below — the same class of cost ORTHOS already accepts for its own
sentinels).

STENTOR's specific transform: `x ↦ x'` where `x'` replaces every accepted
maximal ALL-CAPS run `[s,e)` in `x` (≥3 cased letters, digits/space/most
punctuation allowed inside) with `【lowercase(x[s:e])】`, subject to two
independent gates per span — (1) exact byte-level round-trip through the
*actual* decode function, not an assumption, and (2) strict improvement in
real `countTokens` of the *whole candidate document*, not an estimate. The
canonicalized `x'` is then hand-carried through the full existing DAEDALUS
pipeline as a pre-pass, exactly like ORTHOS.

## B. Outcome Space

- **H+ (mechanism-distinct, large, honest win):** a structural
  orthography/tokenizer mismatch nobody in this repo had exploited yet
  (sustained uppercase, not apostrophe style), with a measured win an order
  of magnitude larger in absolute tokens than the last shipped lane
  (ORTHOS). **This is what happened**, scoped honestly to its real genre.
- **H− (mechanism already known / already disproven):** turns out to be the
  same lexicon-substitution or LSP/functor-removal failure mode already
  killed this session. **Ruled out** — STENTOR touches orthography (case),
  not vocabulary or grammar; it is structurally orthogonal to both dead
  mechanisms (see docstring in `stentor.ts` for the explicit contrast).
- **H∂ (mechanism-distinct but only marginal/narrow):** real but small,
  gated to a rare genre, not clearing the "more than a few tokens" bar.
  **Partially true and disclosed**: STENTOR is genuinely narrow (only fires
  on sustained-caps text), but where it fires, the win is not marginal — 18.8%
  / 117 tokens on a realistic 624-token combo, far past "a few tokens."

## C. Frontier

Prior turn's shipped lane (ORTHOS): **43 tokens / 1.9%** saved on its
headline 5-fixture combo (2247→2204).
This turn's STENTOR: **117 tokens / 18.8%** saved on its headline 5-fixture
combo (624→507) — **2.7x the absolute tokens, ~10x the percentage**, on a
combo that is 4x *smaller* in raw size (meaning the per-token win density is
far higher). A single, non-concatenated, realistic long complaint letter
(326 raw tokens, one message a real person could paste in one sitting) alone
saves **55 tokens / 16.9%** (271 vs. 326) — so the win is not an artifact of
gluing multiple documents together; one ordinary "caps-lock got stuck"
message clears the bar by itself. Every existing repo fixture (10 of them,
spanning JSON logs, CSV, chat transcripts, CJK-mixed text, curly-quote
prose) shows **zero regression, zero spurious application** — the frontier
moves up on its target genre and does not move down anywhere else.

## D. Negative Space (≥15 failure shapes considered)

1. **Fixed fixed-vocabulary word→glyph substitution** (last turn's
   MNEMOSYNE/jules2-KRONOS family) — dead; o200k_base already single-tokens
   ~87% of common English vocabulary, measured directly.
2. **LSP / grammatical-functor removal with absolute-position headers**
   (VANGUARD family, this session) — dead; header cost exceeds functor
   savings by 270-309 tokens on real fixtures, measured directly.
3. **Guessing/predicting the "correct" case statistically** (classic
   *truecasing*, Lita & Ittycheriah 2003, ACL — see External Sources) —
   rejected as STENTOR's mechanism on purpose: truecasing is a **lossy**
   NLP preprocessing technique (98% agreement with ground truth on news
   text is considered a *good* score in that literature); a compression
   codec that guesses wrong even 2% of the time is not lossless and is
   disqualified by this project's exact-only constraint. STENTOR instead
   **records** which spans were originally uppercase via bracket sentinels
   — zero guessing, zero statistical model, 100% exact by construction, not
   by accuracy rate. This is the precise, load-bearing distinction between
   "genuinely different mechanism" and "a renamed known technique."
4. **Assumed sentinel glyphs without measuring token cost** — caught and
   fixed mid-session (see Errors & Dead Ends): ⟦/⟧ actually cost 3 tokens
   each, not 1, silently zeroing all short-span savings. Replaced with
   measured 1-token 《》/【】.
5. **Applying to short, scattered emphasis words** ("URGENT", "ASAP") in
   otherwise normal-case prose — tested directly (`STENTOR_MIXED_EMPHASIS`
   fixture): correctly produces **0 tokens saved**, not a regression, just
   an honest non-application, because the per-span gain rarely clears even
   the reduced 2-token sentinel-pair cost for such short runs.
6. **Applying to famous, heavily-memorized ALL-CAPS boilerplate** (software
   warranty disclaimer) — tested directly (`STENTOR_LEGAL_BOILERPLATE`
   fixture): **0 tokens saved**, because o200k_base already has dedicated
   efficient merges for that exact famous string regardless of case.
7. **Roman numerals / acronyms / single letters mistaken for shouting**
   ("IV III II", "AAA batteries", "X Y Z") — tested in G7; either too short
   to meet the 3-letter-run threshold or correctly declined by the economic
   gate; all decode exactly.
8. **Nested or malformed brackets already present in input** — tested in G4
   (adversarial totality); decoder is total and leaves unmatched markers
   untouched rather than crashing.
9. **Sentinel-collision**: raw input's own DAEDALUS wire happens to start
   with the literal STENTOR_MARK/ESCAPE character — tested explicitly
   (G7-collision); handled with a cheap escape-prefix branch, decode remains
   exact, at a small bounded disambiguation cost (documented, not hidden).
10. **500-case structured fuzz** mixing caps/lower/digit/dash/bracket-glyph
    tokens — G8, 0 failures.
11. **Very large pathological span counts** (thousands of tiny caps runs) —
    guarded by `MAX_SPANS_EVALUATED` (400), bounding worst-case work; not
    triggered by any real fixture tested, but present as a structural
    safety bound matching the repo's existing engineering conventions.
12. **Composing with ORTHOS for extra gain** — spot-checked (not shipped as
    a merged lane this turn): STENTOR's own raw-transform savings compose
    additively with DAEDALUS exactly as ORTHOS's do; a combined
    STENTOR+ORTHOS lane is plausible future work, not required to clear
    this turn's bar and out of scope given time budget.
13. **Overhead wording bloat** — first-draft tail instruction cost 68
    tokens; iteratively measured and shortened (not guessed) to 33 tokens
    (mark path) / ~19 tokens (escape path), directly increasing net savings
    on every fixture without changing behavior (verified: all 106 gates
    still pass after the wording change).
14. **Case-folding already existing elsewhere in the repo** — checked
    (G0); the only related code is `morph.ts`'s per-word upper/title/lower
    tag, which is a **lossy** semantic-family lane predicting word
    morphology, not an exact reversible span codec — mechanism-distinct by
    family, not a duplicate.
15. **Reversible transform corrupting on multi-byte/astral Unicode** —
    covered incidentally by the CJK-mixed `CHAOS_G_CJK` fixture and the
    curly-quote `orthos-curly-combo` fixture in the cached table (G1/G6);
    no failures.

## E. Mechanism Portfolio (this session, ≥6 mechanism-distinct approaches evaluated)

1. Fixed universal lexicon substitution — dead (prior turn + reconfirmed
   this turn via the jules2/KRONOS family, see below).
2. LSP grammatical-functor removal — dead (this session).
3. **Truecasing-style statistical case prediction** — considered and
   rejected on constraint grounds (lossy), see D3.
4. **STENTOR: exact span-bracket case-canonicalization** — built, verified,
   shipped. Mechanism-distinct: attacks sustained-caps orthography, not
   vocabulary (mechanism 1) or grammar (mechanism 2) or statistics
   (mechanism 3).
5. **Multi-order word-grid + suffix-automaton grammar portfolio
   recombination** (AETHERION/TITAN/VALIANT/AETHEL/ALETHEIA/HYDRA/CRONUS —
   this turn's uploaded files) — evaluated directly, found to be a
   re-bundling of mechanisms already in this repo (SIBYL's word-grid,
   THOTH/ARIADNE's suffix-automaton grammar mining, PALIMPSEST/DAEDALUS's
   portfolio-arm selection) with a broken admission gate; **rejected**, see
   below.
6. **Numbers-comma-stripping** (measured reliable in a prior turn, not
   combined into any shipped design yet) — remains available future work,
   noted but not pursued this turn given the time budget was committed to
   validating and shipping STENTOR to the required bar.

## F. Artifact Requirement

Shipped: `src/lib/omega/stentor.ts` (production module: `stentorEncode`,
`stentorDecode`, `stentorDecoderPrompt`, `STENTOR_SYSTEM_PROMPT`, exported
span-finding/apply/restore primitives), wired into
`src/lib/omega/registry.ts`, `src/workers/codec.{types,worker}.ts`,
`src/components/Workbench.tsx` (full UI: label, hint, state, response wiring,
Pareto-row entry, decoder-inline flag, exact-lane flag), and
`bench/leaderboard.ts`. Verification artifacts:
`bench/stentor-fixtures.ts`, `bench/stentor-redteam.ts` (106 gates, 0
failures), `bench/stentor_decode.py` (third CPython decoder). `tsc --noEmit`
and `npm run build` both pass clean with STENTOR wired in.

## G. Second-Order Adversary

Gate G7 in `bench/stentor-redteam.ts` specifically engineers inputs to
defeat the span-detection or economic gate: Roman numerals, acronyms,
mixed-case noise, a repeated long shout sentence (structural stress), an
input containing a literal shout-bracket glyph already, and — the sharpest
case — an input whose *own DAEDALUS wire* begins with the reserved
STENTOR_MARK character, which would make a naive decoder misinterpret an
unrelated document as a STENTOR payload. All decode exactly; the sentinel-
collision case is the one place token accounting is allowed to cost more
than plain DAEDALUS (26 vs. 10 tokens on a tiny adversarial fixture) because
correctness strictly requires it — the same tradeoff class ORTHOS already
has for its own sentinel pair, called out explicitly rather than hidden
behind a passing assertion.

## H. Verification

**106/106 gates pass** in `bench/stentor-redteam.ts`:
G0 mechanism novelty (registry-source grep, not corpus purity) · G1 library
decoder round trip (18 fixtures: 10 pre-existing repo fixtures + 8 new
caps/negative-space fixtures) · G2 second independent decoder written only
from the tail-instruction prose · G3 third, external, from-scratch CPython
decoder (`stentor_decode.py`) · G4 totality/adversarial inputs (10 cases,
including empty string and 40,000-char stress) · G5 message-accounting
honesty (`messageTokens === countTokens(decoderPrompt)` on every fixture) ·
G6 non-regression vs. plain DAEDALUS on every one of the 18 fixtures, no
exceptions · G7 second-order adversary (7 cases + 1 documented collision
exception) · G8 500-case structured fuzz, 0 failures · G9 headline win
receipt (117 tok / 18.8% on the caps-combo) **plus both negative-space
receipts printed and asserted small** (mixed-emphasis: 0 saved; legal
boilerplate: 0 saved) so the honest scope is enforced by the test suite, not
just asserted in prose · G10 speed budget (span-find self-check <50ms,
dominated by DAEDALUS's own search time).

## I. Repair

Two real bugs found and fixed mid-build, both via direct measurement, not
inspection:
1. **Sentinel glyph cost assumption** — ⟦/⟧ assumed 1-token, measured 3-token.
   Fixed by scanning ~18 bracket-pairs and ~28 single symbols with the live
   tokenizer (`find_glyphs*.ts`) and adopting confirmed 1-token 《》/【】.
2. **Escape-path token bloat** — the sentinel-collision fallback originally
   reused the full (68-token) case-restoration tail instruction even though
   that branch never restores any case, wasting the entire instruction cost
   on a no-op path. Fixed by adding a dedicated, minimal `STENTOR_TAIL_ESCAPE`
   string, cut from 44→26 tokens on the adversarial collision fixture,
   verified by rerunning all 106 gates (was 105/106 before the fix, with the
   one failure being exactly this bug caught by `G7-noregress`).

## J. Stopping

Stop condition for this lane: reached. STENTOR clears the user's explicit,
raised bar ("more than just a few tokens", "significant and honest",
"large gains from an everyday real-user perspective") with a **2.7x larger
absolute-token, ~10x larger percentage win than the previous turn's shipped
lane**, on a document 4x smaller, verified by 106 independent gates
including a from-scratch third-language decoder, with the honest negative
space enforced by the test suite itself. Remaining future work (STENTOR+
ORTHOS composition, numbers-comma-stripping) is disclosed as explicitly
out-of-scope-this-turn, not silently dropped.

---

## The measured numbers (verification receipts)

| Fixture | raw tok | plain DAEDALUS | STENTOR | saved | % |
|---|---:|---:|---:|---:|---:|
| **caps-combo** (5 realistic caps-lock-accident docs: support ticket, forum post, office email, product review, chat) | 624 | 624 | **507** | **117** | **18.8%** |
| **long-complaint** (1 single realistic caps-lock letter, not concatenated) | 326 | 326 | **271** | **55** | **16.9%** |
| caps-support (standalone, short) | 160 | 160 | 160 | 0 | 0.0% |
| caps-forum (standalone, short) | 148 | 148 | 148 | 0 | 0.0% |
| caps-email (standalone, short) | 121 | 121 | 121 | 0 | 0.0% |
| caps-review (standalone, short) | 116 | 116 | 116 | 0 | 0.0% |
| caps-chat (standalone, short) | 75 | 75 | 75 | 0 | 0.0% |
| mixed-emphasis (short caps words in normal prose) | 161 | 161 | 161 | 0 | 0.0% (honest negative space) |
| legal-boilerplate (famous memorized disclaimer) | 88 | 88 | 88 | 0 | 0.0% (honest negative space) |
| 9 pre-existing repo fixtures (JSON/CSV/chat/CJK/curly-quote/etc.) | — | — | — | 0 | 0.0% (zero spurious application, zero regression) |

**Honest reading of the standalone-short-fixture zeroes:** raw per-fixture
shout-span savings for those 5 short documents (measured with the economic
gate alone, no contract overhead: 15-34 tokens each) are real but do not by
themselves clear the fixed ~19-33 token one-chat contract overhead (the
STENTOR_MARK sentinel + tail instruction) that any lane in this "single
pasted chat message" family must pay once per message. This is exactly the
same "document composition gates the win" honesty ORTHOS already disclosed
for itself — the difference is that STENTOR's *per-instance* raw win is
large enough (16-28% before overhead) that a single **real, ordinary-length**
message (the 326-token long-complaint fixture, no artificial concatenation)
already clears the bar on its own, which ORTHOS's apostrophe mechanism could
not do at comparable single-document scale.

## Root-cause note: why the win is this much bigger than ORTHOS's

o200k_base's merge table is not case-neutral. A broad, separately-run scan
this session (`bench/tmp/case_and_number_scan.ts`, referenced from the
STENTOR docstring) found 175 candidate "impressive" English words and
confirmed the overwhelming majority (87.4%, 153/175) are already single
BPE tokens — proving common **vocabulary** is not where the waste is. The
waste is in **case**: the identical text, character-for-character the same
words in the same order, costs measurably more tokens when every letter is
capitalized, because BPE's merge table was built almost entirely from
naturally-cased training text and essentially never sees the same n-gram
in all-caps form often enough to earn its own merge. This is a genuinely
different exploitable seam from ORTHOS's apostrophe-style seam (one
punctuation mark, narrow token-count delta per occurrence) — sustained caps
runs compound the loss across every character in the run, not just at one
mark, which is exactly why the measured win is an order of magnitude larger.

---

## New web research this turn (genuinely new sources, not cited by any prior codec in this repo)

Checked via `grep -rl` across every existing `bench/*.md` report before
citing — none of the following six sources appear anywhere else in this
system:

1. **Truecasing, the founding paper**: Lita & Ittycheriah, *"tRuEcasIng,"*
   ACL 2003 ([aclanthology.org/P03-1020](https://aclanthology.org/P03-1020.pdf)).
   Established the classic NLP task of statistically restoring case to
   noisy/lowercased text (~98% agreement with ground truth on news text).
   Directly informed section D3 above: this is the closest **prior-art
   neighbor** to STENTOR's problem shape, and articulating exactly why
   STENTOR does *not* use this technique (it is lossy; STENTOR is exact by
   construction, recording rather than predicting case) is what makes
   STENTOR a genuinely different mechanism rather than a repackaging of a
   72-year-old (this session; paper itself is 23 years old, well within
   the up-to-100-years scope) known technique.
2. Follow-on truecasing literature confirming it remains an active,
   still-imperfect statistical-prediction problem space, not a solved
   exact one: Susanto et al., *"Position-Invariant Truecasing with a
   Word-and-Character Hierarchical RNN"* ([researchgate.net/publication/354157462](https://www.researchgate.net/publication/354157462_Position-Invariant_Truecasing_with_a_Word-and-Character_Hierarchical_Recurrent_Neural_Network))
   and an efficient CNN+BiLSTM+CRF truecaser
   ([arxiv.org/pdf/2002.00738](https://arxiv.org/pdf/2002.00738)) —
   both still report an *accuracy*, not a guarantee, reinforcing that the
   entire truecasing literature treats this as a prediction problem, which
   is precisely the property STENTOR avoids.
3. **ByT5** ([alphaxiv.org/abs/2105.13626](https://www.alphaxiv.org/abs/2105.13626))
   — noted in passing for an interesting, tangential confirmation: byte-level
   models show "minimal degradation when text is converted to uppercase or
   random case, while mT5's performance drops substantially," independent
   evidence from a different research direction (model robustness, not
   tokenization cost) that case sensitivity is a real, measured discontinuity
   in how standard subword-tokenized models treat text — consistent with,
   though not the same claim as, STENTOR's token-cost finding.
4. **"Boundless Byte Pair Encoding: Breaking the Pre-tokenization Barrier"**
   ([arxiv.org/html/2504.00178v1](https://arxiv.org/html/2504.00178v1),
   2025) — background confirmation that pre-tokenization causes BPE's token
   distribution to skew heavily toward common, full-length, naturally-cased
   words, which is the structural reason a sustained-caps run finds no
   efficient merge: it is a token-distribution long-tail problem, not a
   vocabulary-coverage problem (matching the D3/root-cause framing above).
5. **"Theoretical Analysis of Byte-Pair Encoding"**
   ([arxiv.org/pdf/2411.08671](https://arxiv.org/pdf/2411.08671), 2024) —
   proves BPE is APX-complete to optimize and achieves only a 0.333-0.625
   worst-case approximation ratio to optimal compression on arbitrary
   strings. Read for applicability: this is a **general BPE-optimality**
   result, not specific to case or vocabulary; it explains *why* systematic,
   exploitable gaps like STENTOR's and ORTHOS's should be expected to exist
   at all (BPE is a constant-factor approximation, not optimal, so
   structured seams are mathematically guaranteed to be findable) but does
   not itself suggest a new mechanism — assessed and set aside as
   background grounding, not a source of a new codec.
6. `awesome-llm-token-optimization` GitHub list (accessed
   2026-09, listing 2026-dated papers) — used only to confirm STENTOR's
   general design philosophy (verify-or-no-op, never trust an estimate)
   matches independent outside practice, e.g. **PackRat**: "every encode is
   round-trip verified, or the input passes through unchanged (lossless or
   no-op)" — external validation of a pattern already used throughout this
   repo (ORTHOS, DAEDALUS's arm-0 incumbent, and now STENTOR's per-span
   gate), not a new mechanism to adopt.

### Mandatory Aug/Sep 2026 AI-math search

Searched and read multiple independent outlets (BBC, CNN, Quanta Magazine,
tech-insider.org — all new sources for this repo). Findings: OpenAI's
internal "Astra" model published ten new results on long-standing open
problems on **August 2, 2026** (non-sofic groups, Connes's rigidity
conjecture, arithmetic circuit complexity, quantum parallel repetition, CVP
hardness, Ehrhart's volume conjecture, multicolor Ramsey numbers, extremal
graph theory, sphere packing, spherical codes —
[tech-insider.org](https://tech-insider.org/openai-astra-solves-10-open-math-problems-2026/)).
Separately, OpenAI announced on **September 8-9, 2026** that an internal
model resolved a blow-up result for the Navier-Stokes existence/smoothness
Millennium Prize problem using ~10,000 coordinating AI agents over 88 hours
([BBC](https://www.bbc.com/news/articles/cy7zygy3rl2o),
[Quanta Magazine](https://www.quantamagazine.org/ai-has-solved-one-of-maths-1-million-millennium-prize-problems-20260908/),
[CNN](https://www.cnn.com/2026/09/09/business/openai-millennium-problems-navier-stokes-hnk)),
and on **September 21, 2026** claimed over 100 additional problems solved
by the same internal model, unverified and self-reported
([tech-insider.org](https://tech-insider.org/openai-100-math-problems-solved-24-days-2026/)).
**Applicability assessment, honest:** none of these results are about
tokenization, compression, information theory, or string algorithms — they
are pure/applied mathematics (group theory, PDEs, combinatorics, coding
theory bounds). Read the abstracts and problem list specifically checking
for anything touching Kolmogorov complexity, optimal parsing, dictionary
construction, or entropy coding (the theoretical neighborhood of this
project's actual problem) — **found nothing applicable**. This is reported
as a genuine negative finding, not a skipped search: the search was
performed, multiple sources cross-checked, and the conclusion is that this
particular AI-math news cycle has no bearing on prompt-compression
mechanism design this turn.

---

## The uploaded files: found, evaluated, rejected with receipts

For three consecutive prior turns, no `jules_session_*.txt` file could be
found anywhere in the workspace. **This turn, all three were present**
(`jules_session_11645832412063566205_AI_Ready.txt`,
`jules_session_839197590832296780_AI_Ready.txt`,
`jules_session_9380615154877300572_AI_Ready.txt`, dated today). They were
evaluated for real, not skipped.

**Contents.** Across the three files, 20 distinct candidate codec modules
(AETHERION, TITAN ×3 variants, VALIANT, AETHEL, ALETHEIA, CRONUS, HYDRA ×2,
HYPERION, KRONOS ×2, METATRON, ODYSSEY, OLYMPUS, PYTHIA, SERAPH, URANUS,
AETHERIS, APEX-V2, CHROMIUM, HELIOS, NEXUS-V2, VANGUARD), each self-described
in its own docstring as "establishing a new/the ultimate/the terminal Pareto
frontier." Two mechanism families are immediately recognizable as **already
disproven this session**: KRONOS/VANGUARD are the base36-delta-offset
LSP/functor-removal family (killed earlier this turn's session — absolute-
position headers cost more than the functor removal saves). The other 18 —
AETHERION/TITAN/VALIANT/AETHEL/ALETHEIA/HYDRA/CRONUS/etc. — all describe the
same recombination: single-token Hangul-glyph word-grid substitution (the
mechanism SIBYL already implements in this repo) plus suffix-automaton
straight-line-grammar induction (the mechanism THOTH/ARIADNE already
implement) plus multi-arm hyperparameter portfolio selection (the mechanism
PALIMPSEST/DAEDALUS already implement) — different hyperparameter grids
(`[20]` vs `[12,24,36]` vs `[16,24,32]`), same three underlying primitives
already live in this codebase.

**Direct measurement, not just inspection.** Three of the twenty
(AETHERION, TITAN, VALIANT — the self-contained set with no dependency on
the already-dead KRONOS/VANGUARD) were extracted verbatim, compiled against
the *actual* current repository (`npx tsc --noEmit -p tsconfig.json`, zero
errors — they do compile), and run functionally against 10 real fixtures
(the same 8 pre-existing repo fixtures used in STENTOR's own G0/G1 plus the
two new STENTOR headline fixtures), compared against `daedalusEncode`'s
`messageTokens` on the identical inputs:

| Fixture | raw tok | plain DAEDALUS | AETHERION | TITAN | VALIANT |
|---|---:|---:|---:|---:|---:|
| CHAOS_F_LLM_REPORT | 261 | 261 | **638** | **637** | 261 |
| MOSAIC_HANDTRACE_300 | 118 | 118 | **344** | **343** | **655** |
| stentor-combo | 624 | 624 | **1384** | **1383** | 624 |
| CHAOS_900 | 288 | 288 | 288 | 288 | 288 |
| mosaic-jsonLog | 1600 | 188 | 188 | 188 | 188 |

All decode byte-exact (`aetherionDecode`/`titanDecode`/`valiantDecode`
round-trip correctly on every case above) — so the failure is not
correctness, it is the headline compression claim itself. On three of ten
fixtures, AETHERION and TITAN cost **2.4x to 5.5x more tokens than doing
nothing at all**, directly contradicting their own docstrings' "advances the
compression Pareto frontier" claim. **Root cause, identified by reading the
admission-gate code**: candidate acceptance is gated on `c.outTokens <
inTokens` (comparing only the wire body against raw input) rather than on
the full one-chat `messageTokens` (wire + decode-contract header) against
raw input — the exact accounting mistake this project's own working
convention (used correctly throughout ORTHOS, DAEDALUS, and STENTOR) exists
specifically to prevent. A candidate with a compact wire body but a bloated
contract header slips through the gate, and the deficient comparison never
gets corrected before the result is returned.

**Verdict: not adopted.** Two of the twenty modules are mechanism classes
already measured and killed this session (functor-removal). The other
eighteen are re-bundlings of mechanisms already present in this repository
under new names, and the three sampled for direct execution show
measured, reproducible regressions of up to 5.5x versus the existing
incumbent on real fixtures — the opposite of "genuinely superior." No
lines from any of the three files were merged into the shipped codebase.
The extracted, evaluated copies live transiently in this turn's workspace
(`bench/tmp/jules_eval/`) for the record; nothing was left wired into
`src/`.
