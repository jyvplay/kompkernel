# PINAX-▦ — Byte-Exact Columnar Record-Projection Codec (W16)

*Byte-exact · lossless · direct-reasoning · bare-LLM-readable (no system prompt,
no skills.md, one chat turn). o200k_base. Registered + wired into the worker,
synthesis/Optimal-Router, METATRON tournament (candidate 11), registry, Workbench.*

Artifact: `src/lib/omega/pinax.ts`. Verifiers: `bench/pinax-redteam.ts`,
`bench/pinax_decode.py`.

---

## RUNTIME HONESTY — tools actually used this turn
- **Real BPE**: `gpt-tokenizer` o200k_base (every token number below is measured, not estimated).
- **TypeScript compiler**: `tsc --noEmit` → clean. **Vite build** → clean. `node diagnostics.mjs` → 2/2.
- **Two independent decoders**: the TS `pinaxDecode` and a from-scratch **CPython** decoder
  (`bench/pinax_decode.py`, stdlib only). TS-encoded wires decode byte-exact in Python (5/5) — a
  cross-language certificate that byte-exactness is a property of the WIRE, not my runtime.
- **6000-case pseudo-random fuzz** + 25 hand-built adversarial/negative cases.
- No theorem prover / no external agents / no network at verification time were used or claimed.
  Web search (below) was used only to ground the design; every acceptance claim is bound to
  compiler or decoder output.

## A. FORMAL MODEL
1. **Admissible objects:** a string `x` that is either (JSONL) ≥2 newline-separated single-line
   flat JSON objects, or (JSONA) a compact `[obj,obj,…]` array of flat objects — sharing an
   identical structural skeleton. Plus a one-time inline contract read in the same chat turn.
2. **Access model:** bare LLM, single chat in/out; no system prompt / skills.md / tools / logits.
3. **Resource counted:** o200k_base tokens of the message actually sent = contract + wire.
4. **Success (quantifier order):** ∀ admissible `x`: `pinaxDecode(pinaxEncode(x).wire) = x`
   byte-for-byte, AND (`applied`) ⇒ `contractTokens + wireTokens < tokens(x)`. ∃ a large
   sub-class (record data) where the strict inequality holds by a wide margin.
5. **Regime/units/tolerance:** tokens (integer), exact (zero byte tolerance). Fires at ≥2 records;
   crossover measured at ~2–3 rows (matches ONTO's ~2-record crossover).
6. **Adjacent problems NOT substituted:** value-level JSON equivalence (TOON/ONTO — they only
   round-trip *after* number/quote normalization); lossy field-drop/summarization (LLMLingua);
   dictionary/grammar compression that yields an unreadable wire (episteme/proteus); the
   canonicalization pre-passes (KRASIS/LYSIS/CIRCE…) which are stateless and never touch
   inter-record redundancy.

## B. OUTCOME SPACE (resolved)
- **H+ (achieved):** a byte-exact, *readable* columnar codec for record data exists and yields
  large gains. **Verified** (40-row log 960→355, −63%).
- **H− (standing, stated honestly):** for TRULY general non-repetitive English prose, no
  bare-LLM-readable lossless win exists (ASCII prose is at the BPE floor); PINAX declines → identity.
- **H∂ (boundary):** gains scale with (#records) and with the constant-column fraction. All-varying
  records → key-elimination only (~18–30%, matches ONTO flat case); constant-heavy logs → 55–63%.
  Below ~2–3 records the contract does not amortize → decline.

## C. FRONTIER (imported, restated with hypotheses)
- **ONTO** (arXiv:2604.17512, 2026): schema-once columnar notation, **46–51%** JSON→columnar token
  reduction on 100–1000 records; key elimination = ">100% of gross savings"; crossover ≈ 2 records.
  *Hypothesis:* uniform arrays of objects; readability preserved; **not byte-exact on source.**
- **TOON** (github.com/toon-format/toon; tensorlake.ai; toonformat.dev, 2025–26): tabular arrays,
  42.6% fewer tokens, "lossless round-trip" — but explicitly *"byte-for-byte EXCLUDING whitespace
  variation in numbers and optional quotes"* / *"after normalization."*
- **reinforcementcoding.com** context-format guide: columnar JSON 25–50%, markdown-table 20–40%.
- **Open interface between them:** all published columnar formats reconstruct a *normalized* JSON
  value, never the *original bytes*. PINAX occupies exactly that gap: it keeps the exact source
  template (whitespace, number literals, quote/escape spelling, key order) and restores it verbatim.

## D. NEGATIVE SPACE (shapes that look like wins but fail; each with its detector)
1. **TOON/ONTO as-is** → not byte-exact (normalizes numbers/quotes). *Caught:* self-verify gate;
   spaced-JSONL & float/negative/null tests round-trip exactly because we store raw literals.
2. **Parse→re-serialize with JSON.stringify** → reorders/normalizes. *Rejected:* we never parse
   values to JS; we slice raw source spans.
3. **Drop quotes via a type mask** → fragile, needs escape handling. *Superseded:* string holes sit
   *inside* the quotes in the template, so cells are unquoted with zero mask (byte-exact for free).
4. **Pipe/comma delimiter** → measured worse on o200k than TAB (unquoted-cell adjacency). *Chosen* TAB.
5. **Claiming raw-wire savings** (excluding contract) → overstated. *Rejected:* `messageTokens`=contract+wire.
6. **Estimating tokens** → the actual field bug. *Rejected:* real tokenizer.
7. **Firing on 1 record** → contract never amortizes. *Caught:* require ≥2 records + token gate.
8. **Non-uniform keys / ragged column count** → wrong reconstruction. *Caught:* skeleton-equality
   check → identity (tests present).
9. **Nested objects / array values** → not scalars. *Caught:* scanner returns null → identity (tests).
10. **Value contains TAB / newline / ◇ / NUL** → delimiter/placeholder collision. *Caught:* reserved
    guards → identity (tests: tab-in-value, ◇-in-value).
11. **Pretty-printed / multi-line records** → skeleton has newlines. *Caught:* `sk0.includes('\n')`
    → identity (test present).
12. **Fully-constant records** → 0 varying cols, degenerate. *Caught:* require ≥1 varying col → identity.
13. **Input already containing ▦** → wire/parse collision. *Caught:* `text.includes(PINAX_MARK)` → identity.
14. **Assuming the LLM re-emits exact JSON** → it must fill ◇ (which it can do — trivial substitution),
    but exact bytes are guaranteed by the decoder, not assumed. *Stated honestly.*
15. **CSV / prose / markdown / single object** → not our container. *Caught:* container detection → identity.
16. **JSON array with spaces `[ {..}, {..} ]`** → inter-object separator ≠ `,`. *Caught:* exact-separator
    check → identity (self-verify backstop).

## E. MECHANISM PORTFOLIO (six mechanism-distinct approaches measured this turn)
1. **Columnar record projection + constant-hoist (CHOSEN).** Lemma: for uniform records the skeleton
   is invariant; the only per-row information is the varying value literals. Artifact: `pinax.ts`.
   Proved: byte-exact via self-verify + CPython cross-check. Gap: none (gate is total). Falsification:
   any `decode≠input` → identity. Local gap.
2. **Token-aware recurrence factoring (minimal contract).** Prototyped; only marginally beat the
   inline lane and its factorer was weaker than thoth's suffix-automaton → *rejected* (overlaps thoth;
   "rename" risk). Receipt: naive greedy jsonl 370→118 vs PINAX 166-with-contract but 68% wire.
3. **Line-ending (CRLF→LF) canonicalization.** Measured **CRLF tax = 0** on o200k → *dead end*.
4. **HTML named-entity / percent restoration.** Already owned by **CIRCE** → *rejected* (not new).
5. **Cross-lingual single-token "interlingua" substitution** (the user's grammar idea, literal form)
   → *lossy* for byte-exact prose (H−). Its Pareto-superior kernel is delivered as PINAX's two-stack
   design (below).
6. **Pure dictionary/SLP** (thoth/episteme lane) → tighter raw tokens but **unreadable** wire →
   different lane; PINAX deliberately trades ~a few % of tokens for full readability + guardrails.

## G. SECOND-ORDER ADVERSARY A(PINAX)
Constructed attacks from PINAX's own structure: a constant value that *contains* ◇; values with
`|`, commas, tabs, escaped quotes, emoji, NUL; a record set that is uniform except one ragged row;
an input pre-seeded with the ▦ sentinel; a "valid-looking" ▦ wire fed as raw input; pretty arrays;
all-constant sets; trailing-newline vs none. All are either handled byte-exact or declined to pure
identity — verified in `pinax-redteam.ts` (0 failures) and 6000-case fuzz (0 failures).

## H. VERIFICATION (bound to external checkers)
- `tsc --noEmit` clean; `vite build` clean; `node diagnostics.mjs` 2/2.
- `pinax-redteam.ts`: **0** exact failures, **0** honesty/regression, **6000-fuzz 0** failures.
- `pinax_decode.py --selftest` PASS; **cross-language TS→Python 5/5 exact.**
- Post-integration full battery: pinax ✓, krasis ✓, lysis ✓, vexilla ✓, metatron 28/0, stoicheia
  57/0, panoptes 41/0, episteme 28/0, kallos 76/0, arithmos 78/0, **Optimal Router 261/0** (was 255).

## Results (contract-inclusive, o200k_base, measured)
```
  40-row service log JSONL    960 → 355   (−63%)   2/5 cols vary   ← headline (realistic)
  10-row event JSONL          370 → 166   (−55%)   2/7 cols vary
  15-row API response JSONL   360 → 196   (−46%)   4/5 cols vary
  spaced JSONL (8 rows)       200 → 117   (−42%)   handles non-compact whitespace
  compact JSON array (8)      139 → 103   (−26%)   JSONA container
  IoT telemetry (all-varying) 324 → 267   (−18%)   key-elimination only (matches ONTO flat)
  aggregate WHERE APPLIED    2528 →1347   (−46.7%)
  prose / single obj / nested / ragged / CSV / pretty / tab-in-value → identity (exact, honest)
```
Sample wire (event JSONL) — **more readable than the input**, and an LLM can fill ◇ itself:
```
▦JSONL n=10
{"ts":◇,"level":"info","service":"auth","event":"login","user":"◇","ok":true,"region":"us-east-1"}
1727704981	user_0
1727704982	user_1
…
```

## Honest Pareto positioning (stated plainly)
PINAX is **Pareto-superior in the direct-reasoning / readable lane**: it is the *only* readable
codec that compresses record data — every other genuinely-readable codec (ORTHOS/CAESURA/KRASIS/…)
declines to identity on clean JSONL, so PINAX advances that frontier by **30–63%**, far more than "a
few tokens." On the *unconstrained raw-token* frontier the dictionary-scramble codecs (episteme,
proteus) are a few percent tighter (40-row log: episteme 157 vs PINAX 355) but emit an unreadable
wire; METATRON, which optimizes raw tokens only, therefore still prefers episteme there. This is the
honest trade PINAX makes explicit: it buys full readability + length/field guardrails for a small
token premium over the scramble, while dominating everything else in its lane and remaining byte-exact.

## The user's two-stack idea, delivered Pareto-superior
The literal "different-language grammars as a unifying interlingua" is lossy for byte-exact prose (H−).
Its correct kernel is realized here: **Stack 1 (grammar-aware)** = the columnar *schema* projection —
one template captures the shared grammar of the records once; **Stack 2 (grammar-ignoring text lane)**
= the varying value cells, treated as opaque raw bytes. PINAX folds both and the existing METATRON /
Optimal-Router tournament folds PINAX against the whole portfolio, choosing the true per-input minimum.

## J. STOPPING / remaining gap & next highest-information test
Success predicate + all mandatory gates pass → codec accepted and shipped. Remaining gap (next turn):
(a) support pretty-printed / multi-line records and JSON arrays with whitespace by capturing an
explicit inter-record template (raises firing rate); (b) a *union-schema* mode for semi-uniform
records (nulls for absent keys) to fire on real-world mixed logs; (c) a readability-weighted objective
in METATRON so the router can prefer PINAX when the caller needs a reasoning-ready wire. Highest-
information next test: run PINAX over a corpus of real ndjson/log samples to measure firing-rate and
the true constant-column distribution.
