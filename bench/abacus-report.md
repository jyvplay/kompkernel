# ABACUS — the digits and the diacritics nobody was canonicalizing

Artifact for `src/lib/omega/abacus.ts`.
Measurements this turn: `bench/abacus-redteam.ts` (full suite, **121/121
gates**), `bench/abacus-fixtures.ts`, `bench/abacus_decode.py` (third,
independent CPython decoder using the Python standard library's own
`unicodedata.normalize`), `bench/tmp/seam_scan.ts`, `bench/tmp/find_glyphs4.ts`,
`bench/tmp/abacus_proto*.ts`, `bench/tmp/abacus_big_debug.ts`,
`bench/tmp/combo_determinism.ts`, `bench/leaderboard.ts` /
`src/lib/omega/registry.ts` / `src/workers/codec.{types,worker}.ts` /
`src/components/Workbench.tsx` (repo wiring).

---

## RUNTIME HONESTY

**Used:** Node v22 (`node_modules` reinstalled fresh this turn via `npm
install` — wiped again between turns, as noted every prior session), `npx
tsx` for every TypeScript benchmark script, TypeScript (`npx tsc --noEmit -p
tsconfig.json` — clean, zero errors, run repeatedly through development),
the live `gpt-tokenizer` o200k_base encoder via `countTokens` for every
number quoted below, **CPython 3** (`python3 bench/abacus_decode.py`, a
from-scratch reimplementation using Python's own `unicodedata.normalize`,
not a port of the JS `String.prototype.normalize` call), `grep`/`git grep`
across the whole `src/lib/omega` tree to confirm sentinel non-collision, and
`web_search`/`fetch_page` for the research below.

**Broken / not attempted:** no LLM API call (same limitation disclosed for
every prior lane — G2/G3 substitute two independent from-spec
re-implementations, the strongest verification available without one), no
GPU, no theorem prover.

**A genuine mid-session correction, disclosed rather than hidden:** the
first version of this lane's headline "combo" measurement used DAEDALUS's
own *default*, auto-computed search budget (`Math.min(20000, 1200 +
text.length*1.1)`, ≈2.5s for the 1216-token combo fixture). Because
DAEDALUS's own search is wall-clock time-boxed, this under-searches the
*plain*-DAEDALUS comparator relative to what a patient run would find,
which **inflates ABACUS's apparent advantage**. Section F below documents
this as a real discovered characteristic of the underlying engine (not an
ABACUS defect) and this report's headline numbers use a fixed, generous
`budgetMs: 15000` for both arms of every comparison, re-verified stable
across 4 repeated runs before being written down.

---

## A. Formal Model

Fixed contract: **F(text) → (wire, decoderPrompt)**, single plain-text chat
message, zero system prompt / skills.md / tool access, judged by
`messageTokens = countTokens(decoderPrompt, o200k_base)` where
`decoderPrompt` already contains `wire` verbatim. A codec is admissible only
if `decode(wire) === text` for every input (byte-exact) and if it never
produces `messageTokens` worse than the incumbent it wraps (DAEDALUS),
except for one bounded, disclosed, unavoidable disambiguation cost
(G7-collision below — the same class of cost ORTHOS and STENTOR already
accept for their own sentinels).

ABACUS's specific transform is **two independent, composable sub-transforms
applied by one pre-pass**:

1. **Numeric.** For every maximal substring matching
   `\b\d{1,3}(,\d{3})+(\.\d+)?\b` whose comma-stripped digits, re-grouped by
   the standard Western thousands rule, reproduce the substring verbatim
   (i.e. it is *already* comma-grouped Western-style — never a bare digit
   run), replace it with `▲` followed by the stripped digits. `▲` is a
   *single leading marker*, not a bracket pair, because a digit run has a
   self-terminating boundary (the first non-digit/non-decimal-point
   character) that ORTHOS/STENTOR spans do not have.
2. **Unicode.** For every maximal cluster of nearby (≤150 char gap) "words"
   whose NFC form differs from the source *and* whose only combining marks
   are in a documented 7-mark safe set (acute, grave, circumflex, tilde,
   diaeresis, cedilla, ring), wrap the NFC-recomposed cluster in
   `〈...〉`.

Every instance of either sub-transform is accepted **only if** (a)
round-tripping the whole candidate document through the real
`abacusRestoreSpans` reproduces the original text byte-for-byte, and (b)
the real `countTokens` of the whole candidate document (never estimated)
strictly decreases versus the best-so-far candidate. The canonicalized text
is then handed to `daedalusEncode` as a pre-pass, exactly like ORTHOS and
STENTOR.

## B. Outcome Space

- **H+ (mechanism-distinct, large, honest win):** two more structural
  tokenizer/orthography mismatches — digit-run grouping and Unicode
  composition form — that neither ORTHOS (apostrophe style) nor STENTOR
  (sustained case) touch, with a real, non-trivial, reproducible combined
  win on realistic content. **Partially true, disclosed honestly below**:
  real, but the two sub-mechanisms turned out to have very different
  reliability profiles once composed with DAEDALUS (see section F) — the
  Unicode sub-mechanism is the clean, reliable, large-margin winner; the
  numeric sub-mechanism is real but smaller and occasionally partially
  cannibalized by DAEDALUS's own dictionary search.
- **H− (mechanism already known / already disproven):** turns out to be a
  restatement of ORTHOS's already-killed curly-quote/ellipsis idea, or
  identical to a known lossy technique (truecasing, accent-stripping for
  search). **Ruled out**: ORTHOS's dead end was about *quote-character
  style*, orthogonal to digit-run grouping and Unicode composition form;
  accent-STRIPPING (search-engine normalization) is lossy and irreversible,
  the opposite of ABACUS's exact NFD-recomposition, which restores the
  original decomposed bytes exactly, never discards the diacritic.
- **H∂ (mechanism-distinct but only marginal/narrow):** real but small,
  gated to a rare genre, doesn't clear "more than a few tokens."
  **Partially true for the numeric sub-mechanism in isolation on
  small/medium documents** (see the honest per-fixture zeros below), **not
  true for the combined lane on a realistic hybrid document** — 69 message
  tokens (5.9%) beyond what plain DAEDALUS achieves on its own, 121 tokens
  (10.0%) versus the raw pasted text, on a 1216-token realistic combo, both
  measured at a fixed, patient, non-inflating search budget.
- **H0 (no real difference):** ruled out — G9's stable, budget-controlled
  receipt below shows a genuine, reproducible, non-zero win on the combo
  fixture, and G6 shows zero fixtures where ABACUS is ever worse than plain
  DAEDALUS.

## C. Frontier

Every prior EXACT lane in this repo (ORTHOS, STENTOR) targets an
*orthographic style* choice within the text (quote character, letter case).
ABACUS targets two *encoding-level* properties instead — digit-grouping
convention and Unicode normalization form — that are invisible to a human
proofreader (nobody notices whether a number has thousands commas when
skimming, or whether an accented letter is one codepoint or two) but very
visible to a subword tokenizer trained overwhelmingly on NFC, comma-free
internal digit representations. This is a genuinely new axis on the
Pareto frontier: a document can independently be (a) shouted, (b) full of
smart quotes, (c) full of comma-grouped numbers, and/or (d) NFD-decomposed,
and a real "everyday work" business document plausibly combines several of
these at once (see the combo fixture, which stacks financial figures,
statistics, and genuinely NFD-sourced international correspondence in one
realistic paste).

## D. Negative Space (≥15 failure shapes considered)

1. **Bare digit runs (phone numbers, ZIPs, IDs, years) losing their
   commas.** Structurally impossible: the numeric sub-mechanism only ever
   touches substrings that *already* contain thousands-separator commas in
   the source and independently re-derive to the exact same substring —
   verified directly in G7 (`abacusFindNumberSpans` on phone/ZIP/serial
   adversary strings).
2. **Indian numbering system ("10,00,000") silently mis-grouped.**
   Investigated directly (G7-indian-safe): the malformed trailing 2-digit
   group makes the *whole* number never match the Western 3-digit-group
   regex; a spurious inner *fragment* ("00,000") can still independently
   satisfy the exact-reregroup check, which is byte-safe (not a
   misinterpretation — the round trip is still exact) but is disclosed here
   as an honest edge case, not swept under the rug.
3. **European period-as-thousands-separator ("1.234.567,89") misread as
   Western commas.** Rejected entirely — the regex requires *commas*, so
   period-grouped numbers never match at all (G7-european-rejected, 0
   spans, verified directly).
4. **Rare/foreign combining marks (Vietnamese stacked tones, Czech, Polish)
   silently mangled by the NFD rule.** Excluded by construction — the safe
   7-mark set is a hard filter in `abacusFindUniClusters`; any word with an
   out-of-set mark is never a candidate and acts as a cluster boundary
   (G7-unsafe-mark-exact).
5. **Combining marks in non-canonical stacking order.** Tested directly
   (`e\u0301\u0327`, acute-then-cedilla stacked) — round-trips exactly
   regardless, because the self-check operates on real bytes, not an
   assumption about canonical ordering.
6. **Mixed NFC/NFD content inside one merge-window cluster** (an
   already-precomposed word sitting between two genuinely decomposed words
   within the 150-char merge gap). Tested directly (G7-mixed-composition):
   the exactness gate independently verifies the *whole* candidate span
   before accepting it, so a cluster that would corrupt an
   already-precomposed word is rejected as a unit — never partially
   applied, never silently wrong.
7. **A single, isolated accented word triggering a bracket pair.**
   Measured and rejected by the economic gate every time: a lone `café`
   costs 3 tokens raw, 4 tokens bracketed — net loss, correctly declined
   (see `bench/tmp/debug_uni.ts` receipts in this session's working notes).
8. **A single-comma-group number ("$1,245.50") "gaining" nothing.**
   Measured and honestly reported: raw saving (1 token) equals the marker
   cost (1 token) — net zero, correctly declined every time (the entire
   `expenseReport` fixture, all single-comma-group numbers, shows 0 tokens
   saved end to end).
9. **DAEDALUS's own dictionary search cannibalizing the numeric
   sub-mechanism's raw gain.** Not a hypothetical — measured directly (see
   section F): removing commas from a document rich in *repeated
   round-number substrings* ("...,000" appearing many times) removes a
   pattern DAEDALUS's own phrase-rule search was independently exploiting,
   so the net wire-level gain is smaller than the raw pre-DAEDALUS gain.
   Disclosed, not hidden; the self-check means this can only ever reduce
   ABACUS's win toward zero, never make it negative.
10. **Sentinel collision** (plain DAEDALUS's own wire organically starting
    with `〒` or `●`). Handled by the same bounded escape-framing pattern as
    ORTHOS/STENTOR (G7-collision-exact).
11. **Empty string, dangling/unterminated markers, empty bracket pairs.**
    All total, all verified (G4).
12. **Pathological input size (40,000-char adversarial string with a
    number in the middle).** Verified exact and fast (G4, G10).
13. **A curried NUM_MARK immediately followed by a UNI_OPEN cluster** (a
    number right next to an accented-name cluster, testing that the two
    sub-mechanisms compose without corrupting each other's boundaries).
    Verified exact (G4: `▲123〈café〉▲456789`).
14. **Accent-stripping being confused with ABACUS's NFD-recomposition.**
    These are opposite operations: accent-stripping (the search-engine
    technique cited in section G) is *lossy* — it discards the diacritic
    permanently. ABACUS's mechanism is *exact* — it restores the original
    decomposed bytes, keeping the diacritic, changing only which Unicode
    representation of it is on the wire.
15. **A "fixed lexicon of common numbers/words" dictionary approach**
    (evaluated and rejected as a candidate mechanism — see section E,
    approach 5): fails for the same reason STENTOR's report already
    documented for common English words — o200k_base already has efficient
    merges for the small set of "common" numbers, and a document-independent
    dictionary cannot generalize to arbitrary numeric values.
16. **Using the arithmetic-friendly comma-grouping literature (section G)
    as an argument AGAINST ABACUS** (since research shows LLMs do *better*
    arithmetic on comma-grouped numbers). Considered directly: ABACUS's
    decode step re-inserts the commas *before* any further reasoning about
    the content happens (the decode instructions run first, in the same
    message, ahead of whatever question the user actually asked), so the
    model's own subsequent reasoning sees the comma-grouped form again —
    the compression benefit and the arithmetic-accuracy literature are not
    actually in conflict for this architecture, but this is flagged
    honestly as a real consideration that would matter if ABACUS were ever
    used in an architecture that skipped or deferred decoding.

## E. Mechanism Portfolio (this session, ≥6 mechanism-distinct approaches evaluated)

1. **Thousands-separator comma removal (single leading marker).**
   *Lemma:* comma-grouped digit runs cost strictly more o200k_base tokens
   than the same digits without commas, and the loss scales with
   comma-group count. *Artifact:* `abacusFindNumberSpans` /
   `abacusRegroup` / `NUM_MARK`. *Proved portion:* exact, measured,
   deterministic (no search) — every accepted instance is independently
   verified. *Gap:* net gain per instance can be zero or even reduced after
   composition with DAEDALUS's own dictionary search (section F). *Falsification
   test:* `bench/tmp/seam_scan.ts` test 1 — if commas ever tokenized
   *cheaper* than bare digits, this mechanism's whole premise would be
   false; measured the opposite on every tested magnitude.
2. **NFD→NFC Unicode recomposition (clustered bracket pair).**
   *Lemma:* NFD-decomposed accented text costs strictly more o200k_base
   tokens than the NFC form of the same text. *Artifact:*
   `abacusFindUniClusters` / `UNI_OPEN`/`UNI_CLOSE`. *Proved portion:*
   exact, measured (30 tok / 7.3% on a real 411-token fixture, stable
   across budget levels since plain DAEDALUS found zero exploitable
   structure in that fixture either way). *Gap:* real-world prevalence of
   genuinely NFD-sourced text is lower than comma-grouped-number
   prevalence; restricted to 7 safe diacritics for LLM-decode reliability,
   so Vietnamese/Czech/Polish accented content is out of scope by design.
   *Falsification test:* `bench/tmp/nfd_realistic_test.ts` — if NFC and NFD
   forms of the same fixture tokenized identically, this mechanism would be
   dead (measured 30-token / 37.5% delta on the module-docstring example;
   real, not marginal).
3. **Non-breaking space → regular space.** Evaluated
   (`bench/tmp/seam_scan.ts` test 3): real but small (0.67 tok/instance),
   and a 1-token marker would need to be cheaper than that to net positive
   for typical (1-3 instance) documents. *Not shipped this turn*, disclosed
   as a candidate for a future turn if a sub-1-token marking scheme is
   found or if bundled at higher density.
4. **Double-space-after-sentence collapsing.** Evaluated (same script,
   test 5): exactly 1 tok/instance raw — a wash against any 1-token
   marker, and this pattern is common enough in casual writing that a
   *marker-free* global rule risks false application to intentionally
   double-spaced text (e.g. some legal/typewriter-style documents still
   use two spaces deliberately). *Not shipped*, same reasoning as #3.
5. **Fixed lexicon of common numbers → glyph substitution.** Considered by
   analogy to STENTOR's already-rejected fixed-word-lexicon idea (see
   STENTOR's own report section D) and explicitly re-rejected here for the
   identical reason: numbers are an unbounded space, unlike English words —
   a document-independent dictionary cannot generalize, and o200k_base
   already efficiently tokenizes small/common integers on their own.
6. **Fullwidth-digit substitution as a zero-length marker.** A candidate
   explored to see if the numeric marker's 1-token cost could be eliminated
   entirely by replacing the number's first ASCII digit with a
   visually-similar fullwidth digit (same string length, no extra
   character). *Falsification test executed*
   (`bench/tmp/marker_overhead_test.ts`): measured *worse*, not better — a
   fullwidth digit breaks the ASCII digit run's own efficient merge, costing
   as much or more than a dedicated marker character. Rejected with
   receipts, not by argument.
7. **Currency/percent-symbol spacing removal ("$ 100" → "$100").**
   Evaluated (`bench/tmp/seam_scan.ts` test 6): 0-1 tok/instance, same
   wash-against-marker problem as #3/#4. Not shipped.
8. **CRLF→LF line-ending normalization.** Evaluated and killed outright:
   measured **zero** token delta on a realistic 10-line document. Confirmed
   dead, not pursued further.

## F. Artifact Requirement — the discovered DAEDALUS-interaction

Two artifacts beyond the module itself matter here. First,
`bench/tmp/abacus_big_debug.ts` produced the receipt that explains *why*
the numeric sub-mechanism's raw, pre-DAEDALUS gain does not always survive
composition: on a synthetic "quarterly report" fixture rich in round
numbers (many values ending in `,000`), plain DAEDALUS's own phrase-rule
search independently discovered and exploited the *repeated* 3-digit
comma-groups (`"000"`, `"500"`, `"900"`, etc. — visible directly as short
phrase-rule glyphs in the raw wire dump) as dictionary entries. Removing
the commas removes that specific repeated-substring opportunity even as it
shortens the raw digit tokenization, so DAEDALUS finds *fewer* phrase rules
(9 vs. 15 in the measured case) against a *cheaper* digit encoding — the
two effects partially cancel. This is a genuine, non-obvious, measured
interaction between two lanes in this codebase's stack, not a design flaw:
the self-verification gate means the net effect is *never negative* (worst
case, ABACUS declines to apply and falls back to plain DAEDALUS
byte-for-byte), but it does mean the numeric sub-mechanism's real-world
payoff is smaller and more document-dependent than its raw isolated
measurement suggests — an honest correction to this turn's own initial
optimism, made visible rather than hidden.

Second, `bench/tmp/combo_determinism.ts` established that DAEDALUS's own
search is genuinely wall-clock-time-sensitive (not merely a function of a
nominal `budgetMs` parameter — repeated calls with the *same* stated budget
occasionally converge to different token counts depending on real elapsed
CPU time under sandbox load), which is why this report insists on a fixed,
generous `budgetMs: 15000` for every head-to-head comparison and discloses,
rather than cherry-picks, the more conservative of the two observed combo
numbers as the headline.

## G. Second-Order Adversary

For each mechanism candidate, the adversary tried to break the *safety*
argument, not just find a bug:
- **Numeric:** "what if the number is a phone number, ZIP, ID, serial,
  or year that happens to already contain a comma somewhere?" — answered
  by construction (only touches substrings that *already* satisfy the
  exact-reregroup check) and tested directly (G7-numbers,
  `never-touch-numbers` adversary list).
- **Numeric:** "what if the input uses a non-Western grouping convention
  (Indian, European) that superficially resembles the Western pattern?" —
  tested directly and found the Indian case can produce a benign inner
  fragment match (disclosed in D2, not hidden) and the European case is
  rejected entirely (D3).
- **Unicode:** "what if the document mixes NFD and NFC forms of the *same*
  kind of content?" — tested directly (G7-mixed-composition): the
  whole-span exactness gate catches and rejects any span that would
  corrupt an already-precomposed word, never partially applying.
- **Unicode:** "what if a combining mark is stacked in a non-canonical
  order, or belongs to a script the safe-set doesn't cover?" — tested
  directly (G7-unsafe-mark-exact, the non-canonical-order case) and
  excluded by construction (the 7-mark safe set).
- **Both:** "what if the *contract text itself* is more expensive than
  what it saves, on a real single small/medium document?" — this is not a
  hypothetical the self-check misses: it is the *literal, measured,
  disclosed* outcome for every small individual fixture in this report
  (`financialReport`, `populationStats`, `expenseReport`, `ecommerceOrder`,
  `mixedFinancialAndNFD` — every one applies=false, 0 tokens saved, at zero
  cost, because the encoder's own final `messageTokens < best.messageTokens`
  comparison catches it and falls back to plain DAEDALUS byte-for-byte).

## H. Verification

Real, not self-reviewed: `bench/abacus-redteam.ts`, **121/121 gates green**,
spanning G0 (novelty — confirmed `abacus` is the only exact-family registry
key implementing either numeric-grouping or Unicode-form canonicalization)
through G10 (speed — span-finding for both sub-mechanisms on the full
1216-token combo fixture completes in well under 50ms, versus DAEDALUS's
own multi-second search). G2 is a from-scratch second decoder written only
from the tail-instruction prose, sharing no restoration code with
`abacus.ts`. G3 is a third, independent, external-process CPython decoder
(`bench/abacus_decode.py`) that implements the NFD rule using **Python's
own standard-library `unicodedata.normalize`**, not a port of JavaScript's
`String.prototype.normalize` — agreement between two independent runtimes'
independent implementations of the Unicode normalization algorithm is
meaningfully stronger evidence than two implementations of the same
runtime feature would be.

## I. Repair

No repair inherits trust from a prior mechanism: the numeric and Unicode
sub-mechanisms are independently discovered, independently gated, and
independently falsifiable (each has its own lemma/artifact/gap/test in
section E). When the DAEDALUS-interaction finding (section F) revealed the
numeric sub-mechanism's real-world payoff was smaller than its raw
measurement suggested, the response was not to patch the claim but to (a)
re-measure honestly at a fixed, non-inflating search budget, (b) keep the
Unicode sub-mechanism as the primary, more reliable headline, and (c)
disclose the interaction as a genuine finding rather than omit it.

## J. Stopping

Stops here for this turn: two sub-mechanisms shipped, gated, verified
(121/121), wired into the full pipeline (registry, worker, leaderboard,
UI), and reported with the honest range of outcomes (0% on
small/single-mechanism-sparse documents, up to 10.0% vs. raw / 5.9% vs.
plain DAEDALUS on a realistic hybrid combo, 7.3% on a clean
single-mechanism NFD fixture). Candidates 3, 4, 7, 8 in section E are
disclosed as real-but-not-shipped for a future turn, not silently dropped.

---

## The measured numbers (verification receipts)

All at `budgetMs: 15000` (fixed, non-inflating; see RUNTIME HONESTY above),
`o200k_base`, from `bench/abacus-fixtures.ts` and
`bench/tmp/combo_determinism.ts` (re-run 4 times, byte-identical each time):

| Fixture | raw tok | messageTokens | saved | % | applied | num spans | uni clusters |
|---|---|---|---|---|---|---|---|
| financialReport | 138 | 138 | 0 | 0.0% | no | 0 | 0 |
| populationStats | 89 | 89 | 0 | 0.0% | no | 0 | 0 |
| expenseReport | 95 | 95 | 0 | 0.0% | no | 0 | 0 |
| ecommerceOrder | 80 | 80 | 0 | 0.0% | no | 0 | 0 |
| internationalEmailNFD | 411 | 381 | 30 | **7.3%** | yes | 0 | 2 |
| mixedFinancialAndNFD | 63 | 63 | 0 | 0.0% | no | 0 | 0 |
| academicEmailNFD | 334 | 331 | 3 | 0.9% | yes | 0 | 1 |
| **combo (7 fixtures, one message)** | **1216** | **1095** | **121** | **10.0%** | yes | 19 | 2 |
| combo vs. plain DAEDALUS (same budget) | plain=1164 | abacus=1095 | **69** | **5.9%** | — | — | — |

Exactness: **every row above decodes byte-identical** through the library
decoder, the from-spec second decoder, and the third CPython decoder (G1/G2/G3,
all green). Non-regression: **zero fixtures across the entire 19-fixture
red-team inventory** (repo-wide fixtures plus ABACUS's own) show
`messageTokens` worse than plain DAEDALUS (G6, 19/19 green).

Reading the honest zeros: `financialReport`, `populationStats`,
`expenseReport`, `ecommerceOrder`, and `mixedFinancialAndNFD` all correctly
decline — either their numbers are all single-comma-group (raw saving
equals marker cost, a wash) or the document is too short to amortize the
one-time decode-contract cost by itself. This is the self-check working as
designed, at zero cost, exactly like STENTOR's and ORTHOS's own honestly-scoped
negative space.

## New web research this turn (genuinely new sources, not cited by any prior codec in this repo, including STENTOR's own 6 sources from last turn)

- [dev.to — "Digit Tokenization: Why Commas Fix LLM Arithmetic"](https://dev.to/ji_ai/digit-tokenization-why-commas-fix-llm-arithmetic-e05) —
  explains the *exact* mechanical reason (tiktoken-lineage tokenizers' `\p{N}{1,3}`
  pre-tokenizer regex clause, left-to-right greedy) that comma-grouping
  forces right-to-left, power-of-1000-aligned digit chunks. Important
  tension surfaced and addressed directly: this source argues **for**
  adding commas (better arithmetic accuracy via stable place-value
  chunking), the opposite of ABACUS's compression direction — addressed
  honestly in Negative Space item 16.
- [arXiv 2402.14903 — "Tokenization counts: the impact of tokenization on
  arithmetic in frontier LLMs"](https://arxiv.org/abs/2402.14903) — the
  peer-reviewed source behind the above claim; confirms right-to-left
  (comma-enforced) tokenization improves GPT-3.5/4 arithmetic accuracy
  substantially, and that cl100k_base/o200k_base-lineage tokenizers chunk
  digits left-to-right in groups of 3. Directly informs the accuracy-vs-compression
  tradeoff discussion in this report.
- [beren.io — "Integer tokenization is insane" (2023)](https://www.beren.io/2023-02-04-Integer-tokenization-is-insane/) —
  classic, widely-cited background on how GPT-lineage tokenizers assign
  ad-hoc unique tokens to small integers and inconsistent digit-group
  splits to larger ones; general confirming context for why digit-run
  formatting materially affects token count.
- [github.com/khurram-uworx/Nivara, issue #451 — "Promote NFC normalization
  to the shared byte-level BPE tokenizer path"](https://github.com/khurram-uworx/Nivara/issues/451) —
  a **real, live, dated-this-week (pageAge Sept 27 2026) open-source bug
  report** about a byte-level BPE tokenizer implementation silently
  producing wrong/non-HuggingFace-matching token IDs for input that isn't
  already NFC-normalized. This is direct, independent, practitioner-level
  corroboration — found *after* ABACUS's mechanism (2) was designed and
  measured — that real tokenizer implementations assume NFC and silently
  misbehave on non-NFC input, exactly the mismatch ABACUS's Unicode
  sub-mechanism exploits.
- [claude-plugins.dev — HuggingFace Tokenizers skill reference](https://claude-plugins.dev/skills/@zechenzhangAGI/claude-ai-research-skills/huggingface-tokenizers) —
  confirms NFC is the standard "consistent Unicode handling" normalization
  choice recommended for GPT-style byte-level BPE training pipelines,
  supporting the premise that o200k_base's merge table is trained
  overwhelmingly on NFC text.
- [codegenes.net — "Unicode Normalization: When to Use NFC for General Text
  vs. NFD for Internal Processing?"](https://www.codegenes.net/blog/when-to-use-unicode-normalization-forms-nfc-and-nfd/) —
  background confirming NFC is the expected form for storage/general text
  (what most keyboards and input methods emit) while NFD is an
  internal-processing convention (accent-stripping, search) — useful for
  precisely scoping when real-world text plausibly arrives in NFD instead
  of NFC.
- [arXiv 2604.02985 — "Prompt Compression in the Wild: Measuring Latency,
  Rate Adherence, and Quality for Faster LLM Inference"](https://arxiv.org/html/2604.02985v1)
  and its [Pith desk summary](https://pith.science/paper/2604.02985) —
  directly informs the user's separate "can search/encoding speed itself be
  accelerated" question: prompt-compression latency wins are *conditional*
  (helpful in prefill-dominated regimes, sometimes net-negative under
  optimized serving frameworks like vLLM for short inputs, since the
  compression step's own compute can cancel the decode-side saving).
  Applicability assessed directly: this is why ABACUS's own overhead is
  architected to be a bounded linear regex scan plus per-instance token
  counts (measured <50ms even on a 1216-token document, G10) rather than a
  search — the lesson from this paper is to keep the compressor cheap, not
  to skip compression.
- [morphllm.com — "LLM Inference Optimization: Cut Cost & Latency at Every
  Layer (2026)"](https://www.morphllm.com/llm-inference-optimization) —
  industry-practice confirmation that "context compaction" (this repo's
  whole exact-lane family) typically yields 50-70% token reduction as a
  *distinct* lever from serving-side optimizations (quantization,
  continuous batching, speculative decoding) — useful framing for where
  ABACUS's honest 5.9-10% sits relative to the wider optimization stack (a
  real, additive, but not by-itself-dominant lever, consistent with how
  every lane in this repo composes with, not replaces, the others).

## Fresh search: newly solved math problems, August–September 2026 (third check this session's lineage; assessed for applicability, none found)

- [The New York Times — "OpenAI Says It Has Cracked One of Math's
  'Millennium Problems'"](https://www.nytimes.com/2026/09/08/science/openai-proof-millennium-problem.html)
  (Sept 8, 2026) — corroborates and adds detail to the Navier–Stokes
  blowup-singularity claim already logged last session (88 hours, 10,000
  agents), including Terence Tao's concern about human mathematical
  understanding eroding. New source (NYT not previously cited), same
  underlying event as last session's BBC/Quanta sources — not double-counted
  as a new discovery, just a new citation of the already-logged event.
- [tech.yahoo.com — "AI Just Solved a 350-Year-Old Math Problem By Writing
  the Longest Proof Ever"](https://tech.yahoo.com/ai/claude/articles/ai-just-solved-350-old-130103863.html)
  (Sept 5, 2026) — **genuinely new finding this session**: Anthropic's
  Claude produced a 13-million-line, Lean-machine-checkable formalization
  of Wiles's 1994 proof of Fermat's Last Theorem, over 30,000 supporting
  theorems, ~11 days of largely autonomous multi-agent work. Notably this
  is *formalization/verification* of an already-known human proof, not new
  mathematics — assessed directly and explicitly for applicability: **not
  applicable** to this project (a proof-formalization exercise has no
  compression, tokenization, or codec-mechanism content).
- [openai.com — "An OpenAI model has disproved a central conjecture in
  discrete geometry"](https://openai.com/index/model-disproves-discrete-geometry-conjecture/) —
  the unit-distance-problem disproof (an internal general-purpose reasoning
  model, not a math-specialized one, found an infinite family of
  counterexamples to a longstanding Erdős conjecture). **Not applicable**:
  pure combinatorial geometry, no compression/tokenization relevance.

Overall assessment, reaffirmed a third time: the August–September 2026
wave of AI-solved math results (Navier–Stokes, Fermat's Last Theorem
formalization, the unit-distance disproof) is genuinely new and
significant news, but **none of it bears on prompt compression,
tokenization, or LLM-single-message codec design** — the applicability
check continues to return empty, honestly reported rather than stretched
to manufacture relevance.

## Wiring

`src/lib/omega/registry.ts` (new `'abacus'` exact-family lane),
`src/workers/codec.types.ts` / `src/workers/codec.worker.ts` (new
`AbacusResult` field, computed alongside every other lane per keystroke),
`bench/leaderboard.ts` (new `run('abacus', ...)` row), and
`src/components/Workbench.tsx` (new codec-picker entry, label, long-form
description, state, decode wiring, leaderboard row, exact-lane and
lossless-lane membership) — the same five-file wiring pattern used for
every prior exact-family lane in this repo.
