# Z44 — ANAMNESIS: the transcript is the dictionary

Everything below was measured in this workspace with `OMEGA_DET=1`, o200k_base,
and the receipts are committed next to this file. Nothing here is projected or
simulated; where a claim could not be verified it says so.

*   codec: `src/lib/omega/anamnesis.ts` (registered as `anamnesis`, `anamnesis-gated`)
*   checks: `bash bench/anamnesis-check.sh`
*   receipts: `bench/z44/receipts/`

---

## 1. What is new

Every codec shipped in this stack treats one message as the unit of compression:
find the repetition *inside* it, hoist it into a table, ship the table with the
message, pay for the table every time. ANAMNESIS changes the unit. In a chat the
reader already holds every earlier message, decoded, in its own context — so the
table does not have to be shipped again. **The transcript is the dictionary.**

Message 1 pays a 39-token contract and defines glyphs. Message *k* ships only the
glyphs it *newly* defines plus a body written in the cumulative alphabet, and may
quote a span of any earlier decoded message with `«head·tail»`. Three mechanisms
in one:

1.  **Cumulative dictionary.** Rules never expire and are never re-sent. Measured:
    ops-log-tails message 1 defines 10 new rules and *recollects 5* from message 0;
    repo-review message 3 recollected 31.
2.  **Anchored copies against the visible transcript.** `«a·b»` = "start at the
    first `a` at or after my cursor in the earlier decoded text, run to the end of
    the first `b`, move my cursor". One token-ish marker replaces a repeated block.
    39 copies were emitted across the 8 sessions, all gated on
    `countTokens(marker) < countTokens(span)` **and** on a decoder simulation that
    proves the anchors are unique at that cursor position.
3.  **A clock-free core.** `maximalRepeats` (suffix automaton) + greedy admission
    with integer budgets (`maxSpan`/`rounds`/`topK`/`maxRules`) and a fixed-iteration
    glyph assignment. DAEDALUS/ARIADNE/SIBYL bound their search with `Date.now()`,
    which makes their output depend on machine load — documented as non-determinism
    in the stack. This core never reads the clock, so its wire is a function of its
    input alone.

## 2. Session lane — the lane the stack had never measured

`bench/z44/receipts/session-eval.{log,jsonl}`. 8 sessions, 47 messages, all built
from real repo files (`bench/z44/sessions.ts`). `DAEDALUS/msg` is the shipped
frontier encoder run on every message independently (the honest competitor: same
chat, no shared state). `isolated` is what those same messages cost one-per-chat,
contract every time.

| session | msgs | raw | ANAMNESIS | isolated | DAEDALUS/msg | vs raw | vs isolated | vs DAEDALUS | exact | re-decode |
|---|--:|--:|--:|--:|--:|--:|--:|--:|:-:|:-:|
| ops-log-tails | 6 | 4 029 | **1 708** | 3 491 | 1 887 | −57.6 % | −51.1 % | **−179** | ✓ | ✓ |
| vix-monthly | 6 | 3 412 | **1 674** | 3 424 | 1 761 | −50.9 % | −51.1 % | **−87** | ✓ | ✓ |
| pkglock-chunks | 6 | 15 009 | 7 001 | 14 079 | 6 477 | −53.4 % | −50.3 % | +524 | ✓ | ✓ |
| agent-history | 5 | 1 156 | **687** | 1 303 | 956 | −40.6 % | −47.3 % | **−269** | ✓ | ✓ |
| kb-translations | 6 | 3 292 | **3 185** | 5 342 | 3 235 | −3.3 % | −40.4 % | **−50** | ✓ | ✓ |
| ops-mixed | 6 | 10 599 | 4 337 | 8 752 | 4 057 | −59.1 % | −50.4 % | +280 | ✓ | ✓ |
| prose-study | 6 | 4 229 | **3 685** | 6 904 | 3 702 | −12.9 % | −46.6 % | **−17** | ✓ | ✓ |
| repo-review | 6 | 11 586 | **9 168** | 18 412 | 9 417 | −20.9 % | −50.2 % | **−249** | ✓ | ✓ |
| **total** | **47** | **53 312** | **31 445** | **61 707** | **31 492** | **−41.0 %** | **−49.0 %** | **−47** | 47/47 | 47/47 |

Read that last column honestly. Against the frontier applied per message, the
aggregate is **−47 tokens (−0.15 %)**: 6 sessions better (worst-case win −269),
2 sessions worse (worst case +524). The two losses are `pkglock-chunks` and
`ops-mixed`, where the payload is layout-heavy structured data and the *core* is
weaker than DAEDALUS per message (see §4). The mechanism is not the problem —
recollection and copies fired there too — the per-message engine is.

## 3. Single-message lane, 43-file corpus

`bench/z44/receipts/baseline-o200k-postfix.{jsonl,log}`, diffed in
`bench/z44/receipts/corpus-diff-postfix.txt`.

| | tokens | encode ms | exact |
|---|--:|--:|:-:|
| identity | 67 374 | – | – |
| DAEDALUS (frontier) | 32 839 | 232 887 | 43/43 |
| ANAMNESIS core (`gate:false`) | 35 667 | **510** | 43/43 |

**+8.6 % tokens at 457× the speed**, and deterministic. This is the deliberate
trade: the core exists so the session lane can afford to run per message. With
`gate:true` the shipped frontier encoder is called once and kept only if strictly
cheaper, so that entry point cannot lose to the frontier it is compared against
(asserted per file in the test suite).

## 4. Frontier defect found and fixed: DAEDALUS's feature classifier

`daedalusFeatures` computed `punctPct` with `/[^\w\s]/` — **no `u` flag**, so
`\w` is ASCII-only and every non-ASCII *letter* counted as punctuation.

| file | punctPct before | punctPct after | routed to |
|---|--:|--:|---|
| ja-kb.txt | **99.0 %** | 0.9 % | "bracket-dense" → `span12,default` |
| ru-kb.txt | **87.1 %** | 2.2 % | "bracket-dense" → `span12,default` |

Both are prose. `daedalusOrder` therefore never reached `span12+words`, and with
`maxArms = 2` the winning arm never ran. Two changes in
`src/lib/omega/daedalus.ts`:

1.  `punctPct` now counts the Unicode Punctuation + Symbol categories
    (`/[\p{P}\p{S}]/u`).
2.  **Sound escalation.** The `maxArms` cut-off exists to protect an incumbent.
    When every arm run so far fell back to identity there is no incumbent to
    protect, so stopping can only lose; the remaining arms are run (still
    deadline-bounded, so the anytime property is unchanged and the result is still
    a minimum over a set containing the shipped default arm).

Measured over the whole 43-file corpus: **ja-kb 655 → 526 (−129 tokens, −19.7 %),
1 file changed, 0 regressions, 43/43 still byte-exact.** Corpus DAEDALUS
32 968 → 32 839. Receipt: `bench/z44/receipts/classifier-fix.txt`.

## 5. Verification — what actually checked this

| check | what it is | result |
|---|---|---|
| `tsc --noEmit -p .` | typecheck | exit 0 |
| `bench/z44/anamnesis-test.ts` | 83 assertions: per-file byte-exactness at both gate settings, M ≥ wire, contract paid once, gate never loses to DAEDALUS, determinism (same input → same wire), all 8 sessions byte-exact **and** re-decoded with nothing but the shipped wires, plus 8 adversarial inputs (empty, 1 char, whitespace-only, `«»·` already in the text, `§`/`¶` already in the text, CJK-only, 40 repeated lines, 2 000-char token run) | **ALL CHECKS PASSED (83)** |
| `bench/anamnesis_decode.py` | a **second implementation**, in Python, in a separate process, written from the wire format rather than from the encoder | selftest OK (nested rule, recollected rule, anchored copy, 2 refusals) |
| `bench/anamnesis-crosscheck.sh` | the TS encoder writes wires, CPython decodes them, `cmp` decides | **BYTE-EXACT on 47 messages across 8 sessions** |
| blind in-context decode | I decoded `bench/z44/blind/visible/msg_2.txt` — a session message with a tape of 1 rule, recollected-rule semantics and no contract — from the pasted message alone, then compared with `bench/z44/blind/hidden/exp_2.txt` | **428/428 bytes identical** |

The blind decode is the requirement "an LLM can read this with no skills.md and no
system-prompt box, one chat input, one chat output". Receipt
`bench/z44/receipts/blind-llm-decode.txt`. Caveat, stated plainly: the decoder
there is me, in the same session that wrote the encoder. It demonstrates the wire
is readable without auxiliary instructions; it is not an independent model, and
there is no LLM API reachable from this sandbox to test one.

## 6. Other open PRs, reviewed against the shared corpus

**PR #27 GRAMMA-Ω** ("notation dialects — layout regenerated by the reader") is
real and new: instead of shipping repeated strings it ships the value in a cheaper
notation and lets the reader regenerate layout from its own formatting priors. I
vendored `src/lib/omega/gramma.ts` and measured it on the **shared 43-file
corpus**, outside the 8 files its own bench used (`bench/z44/receipts/gramma-corpus.jsonl`):

> **2 wins, 41 ties, 0 losses, 0 inexact. Total −122 tokens (−0.37 %).**

So it is honest — `none` (plain DAEDALUS) is a candidate, so it cannot lose — but
its 6/8 win rate is a property of a JSON/indent-selected file set. On the shared
corpus only `gh-api.json.txt` (−62) and `package-lock-head.json` (−60) move. Same
shape as the Rosetta finding: real mechanism, narrow lane. It is **orthogonal** to
ANAMNESIS (layout within a message vs repetition across messages) and composes;
that composition is not built here.

Remaining open PRs: #23 (audited one-chat codec selection) loses gpl (+21) and
find-listing (+20) and wins only email (−13) on the four canonical lanes; #2
STARLIGHT is worse 4/4 once its 174-token prompt is counted; #20/#18/#17 are
benchmark suites rather than codecs; #13/#11/#8/#7/#6/#4/#3 predate the current
frontier and were not re-measured this turn.

## 7. Negative space — what was tried and did not work

Measured, not argued:

*   Prefix-cache alignment is **not** exploitable in a chat. The provider's
    cacheable prefix is `user₁‖assistant₁‖…`, so re-sending a cumulative
    dictionary at the head of message *k* is pure added cost. (Public 2026 numbers
    are large — 41–80 % cost cuts, TTFT −13–31 % — and one July 2026 study found
    query-aware compression made a τ-bench retail agent **40.1 % more expensive**
    than doing nothing because it rewrote the cached prefix every call. Compress
    the volatile tail, never the stable head.)
*   `CTXCOPY` alone is not a session codec: 0 % on 4 of 8 sessions at default
    `minCopy=60`, and it is un-gated.
*   The dictionary lever is spent at the wire level: 55–75 % of every wire is
    literal text covered by no rule; the remaining pairwise-merge prize across the
    five largest lanes is 446 tokens.
*   Marker cost is load-bearing and was measured, not guessed: `⟦ ⟧` cost **3**
    o200k tokens each; `« » · | ~ ^ _ =` cost **1** (`bench/z44/dbg4.ts`). The
    first version of the copy syntax cost 6 tokens per copy and erased the gain.
*   `…` can never be a session marker: it survives in a body but is re-parsed as a
    list operator inside a rule body.
*   Cross-script sessions (prior rules in one script, new rules in another) are
    only observed for CJK here. **Unproven**, not claimed.
*   `scriptPool`'s first call scans all 200 006 vocab ids (~1 s cold, cached after).
    Any timing that does not warm it first is measuring the wrong thing.

Five implementation bugs each silently collapsed the session codec to identity, and
all five are now pinned by the test suite or by a comment at the fix site:
contract double-counting; a raw fallback that failed to advance `priorText`;
`symText[s] === ''` used as an "is a rule" sentinel (85 o200k ids decode to '');
`tape || body ? …` binding as `tape || (body ? …)`; and a decoder that re-derived
"which letters are new" by parsing, so a *prior* glyph quoted inside a new rule's
body was dropped from the prepended closure.

## 8. Stopping rule and what is still open

Stop when the session lane stops beating the frontier per message on a majority of
sessions — it is at 6/8, and the two losses have an identified cause (per-message
engine strength, not the session mechanism). Open, in cost order:

1.  Compose the session mechanism with the strongest per-message arm for large
    structured messages. Expected to close +524/+280; cost is DAEDALUS-class
    latency per message. Not done — it is a tournament path.
2.  Compose with GRAMMA's layout dialects (orthogonal, cheap).
3.  Prove or break cross-script sessions.
4.  `kb-translations` only saves 3.3 % vs raw: six *translations* of one article
    share semantics, not strings. That needs a different mechanism entirely.
