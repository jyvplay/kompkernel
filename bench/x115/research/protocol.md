# X115 research protocol A–J

## A. Formal model

- **Objects.** Source text `S` (UTF-8 string, bytes preserved), encoding `e =
  o200k_base`, parent frontier `F(S,e)`, shipped chain `X(S,e)`, candidate
  message `M`, contract `K`, deterministic work meter `W`, CHIRON expansion
  `C(M)`, independent decoder `D`.
- **Access.** Encoder may read `S`, run local deterministic code, call the
  shipped parent frontier, and count tokens. Decoder (the target reader) gets
  only `M` in one basic chat input/output: no skills.md, no system prompt, no
  tools, no retrieval. The local verifier may use repository decoders.
- **Resources.** Token cost `T_e(M)`, CPU work units, wall clock (measurement
  only, never a decision input), memory bounds already in the stack.
- **Success quantifiers.** A candidate is admissible iff `D(M)=S` byte-for-byte,
  `T_e(M) < T_e(incumbent)` on the COMPLETE message, and the parent frontier
  reproduces the rewritten body when the candidate is a representation exchange.
  A turn is successful iff at least one new mechanism is shipped, the 29-lane
  frontier is re-verified, and no lane regresses.
- **Regime.** Readable one-chat wires, not the AITHER entropy tier. Prose and ops
  are priority; niche wins are accepted only if honest and gated.
- **Adjacent problems.** Lossy prompt compression, neural arithmetic coding,
  learned tokenizers, columnar string compression, chunk dedup, hardware radix
  conversion. None is the same object: the decoder here is a reader executing an
  in-band contract, not a model or a compressor binary.

## B. Outcome space and evidence threshold

- **H+**: a new mechanism ships; complete-message token total strictly drops;
  29/29 exact; independent decoder/unit probes pass; balanced A/B shows no
  regressions and an honest speed account.
- **H−**: the proposed mechanism is falsified (raw win does not survive the
  frontier, or exactness fails, or speed cost is dishonest).
- **H∂**: partial result — exact and cheaper on a subset, but not yet a shipped
  Pareto improvement, or LLM-blind decode remains unverified.

Declared threshold before running: H+ requires (i) `frontier-verification.json`
allIdentical=true for the X114 baseline, (ii) at least one new registry arm with
a strict complete-message win measured through the real parent, (iii) unit
probes including an independent decoder, (iv) a balanced A/B or an explicit
restatement if a full A/B is not run. Claims are bound to receipt files.

## C. Frontier achievability / impossibility

- **Achievability.** X114 frontier is 12 290 tokens, 29/29 exact. X115 re-ran the
  same pinned configuration and reproduced all 29 message/token-id SHA-256
  hashes (`receipts/frontier-verification.json`). Wall clock differs
  (2 756 s vs 5 295 s) because the X114 baseline was captured before the X114
  SYNEDRIA speed lane was enabled in the baseline env; the token frontier is
  identical.
- **Impossibility hypotheses.** (1) Dense-wire law: a pre-transform must land
  below ~1.78×F(source) raw to survive; raw win is necessary, not sufficient.
  (2) Contract-prose seam is closed four ways (SYNTOMIA/BRACHYLOGIA/PERIKOPI/
  TACHYGRAFIA). (3) CHIRON-layer improvements cannot reach synkrisis-only lanes
  (X109 null). (4) Glyph-composition null precedent (X28/SYNTOMOS). These are
  hypotheses with detecting tests, not proofs of global optimality.

## D. Negative result shapes (≥15)

Each shape includes a detecting test.

1. **Raw-win modal shortcut.** "Shorter raw text ⇒ shorter wire." Test: price
   `K + F(rewrite(S))` complete, not raw. X115 ENALLAGE ls-real: raw -111,
   frontier -2, contract +27 ⇒ loses.
2. **Glyph-composition null.** Repeated glyph bigrams look compressible. Test:
   add one fresh tape rule and price complete message. screen2: 0/24 wins.
3. **Set-bitmap niche.** Comma sets look like bitmaps. Test: raw screen across
   29 lanes. Only findmnt -4; below the "more than a few tokens" bar.
4. **Fixed-point cost.** Re-running the chain buys tokens. Test: PALINDROMOS
   A/B. -9 tokens for +72.8% wall; ships disabled.
5. **Contract-prose rehash.** Shorten the legend again. Test: grep ownership +
   X108 census. Four codecs own the seam; body is 77.8%.
6. **Synkrisis structural null.** Improve CHIRON and expect all lanes. Test:
   count chiron refs in synkrisis (zero) and X109 20/26 synkrisis wins.
7. **Dense-wire law violation.** Pre-transform raw win but F(rewrite) unchanged.
   Test: X88 ratio gate; ΣΥΜΦΥΊΑ G9 distinct-source floor.
8. **Words-per-line layout.** X114 falsified: +342 tokens.
9. **Delta-layout.** X114 falsified: +304.
10. **Sentence-case.** X114 falsified: +90.
11. **Same-row pct.** X114 falsified: +78.
12. **Tree geometry.** X114 falsified: +9.
13. **Column unit.** X114 falsified: +11.
14. **Post-pass dictionary on frontier wire.** X89 refuses 15/15; in-situ floor.
15. **Learned/latent codec.** LTSC/Z-tokens/C3/AlphaZip. Test: decoder access
    model. Requires weights/fine-tuning ⇒ inadmissible.
16. **Lossy semantic rewrite.** Telegraph English. Test: byte-exact gate. Fails.
17. **Memo speed without replay.** Return cached result for free. Test: X67
    meter replay; starved work grants can flip wires. SYNEDRIA replays spend.
18. **Arm-label trust.** "off/on" labels lie. Test: read the wire/hash, not the
    label. X115 A/B must hash messages.
19. **Wire-level radix post-pass.** Rewrite octal modes on the finished dense
    wire. Test: `screen4.ts` complete-message price + chironDecode. ls-real
    +24, ls-l +18, exact false both; ΣΔ 0.
20. **Affix closure of existing macros.** Replace `value(rule)+affix` by
    `glyph+affix` with no new clause. Test: `screen5.ts` complete-message price
    + chironDecode. Only -3 over 29 lanes (json-pkg -2, ps-aux -1); below bar.
21. **Compact-key ambiguity.** Shorten the ENALLAGE contract until it is cheap.
    Test: token ladder + independent decoder + dispatch unit. The shipped key
    is 15 tokens and still names `T+chmod`; 13-token `→chmod.` was rejected as
    insufficiently explicit about preserving the file-type character.

## E. Mechanism-distinct approaches (≥6)

1. **ENALLAGE radix exchange** (construction: typed bit-field rendering swap;
   artifact: `src/lib/omega/enallage.ts`; proved: 4096-mode bijection +
   ambiguity guard; unresolved: complete-message frontier win; cheapest
   falsification: ls-real probe; local-vs-global: raw -111 but frontier -2).
2. **Comma-set bitmap** (construction: ordered alphabet subset → hex mask;
   artifact: `screen.ts`; proved: exact on findmnt; unresolved: general gain;
   falsification: 29-lane raw screen; gap: -4 only).
3. **Residual glyph-pair nonterminal** (construction: fresh tape rule for a
   repeated adjacent glyph pair; artifact: `screen2.ts`; proved: exact decoder
   gate; falsification: 0/24 complete-message wins; gap: census repeats are
   already priced in situ).
4. **PALINDROMOS fixed-point re-price** (construction: re-run wire moves;
   artifact: `screen3.ts`; proved: exact; falsification: -1 on 19 small lanes,
   -6 on ls-l but +42 s; gap: token dividend too small for default wall cost).
5. **EPISYNEDRIA chain-wide council** (construction: join nested SYNEDRIA
   councils across X74 re-entries; artifact: `synedria.ts` chain scope; proved:
   unit join/no-retention/replay; unresolved: balanced A/B speed; falsification:
   hash-identical A/B; gap: encoder-only, no token change).
6. **Frequency-ordered / symbol-table representation** (construction: FOT/FSST
   prior art; artifact: sources.md; proved: backend representation changes can
   be Pareto; falsification: decoder-access test; gap: byte-stream/symbol-table
   decoders are not one-chat readers).
7. **Contract token ladder** (construction: price alternate ENALLAGE keys;
   artifact: enallage-key-ladder{1..7} logs + enallage-unit log; proved:
   36→27→22→20→15 tokens while preserving `T+chmod`; falsification:
   complete-message gate; gap: 13-token `→chmod.` dropped the type-preservation
   clause and was not shipped).
8. **Affix closure of the macro language** (construction: reuse an existing
   CHIRON glyph beside a literal affix; artifact: screen5.ts; proved: exact
   chironDecode gate; falsification: 29-lane complete-message screen; gap: -3
   total, dense-wire residue).
9. **Shared base verdict (ΕΠΙΣΥΝΕΔΡΙΑ)** (construction: hand the already-measured
   base frontier to PROSPHYSIS/STOICHEION instead of re-measuring the same
   source; artifact: tagstack.ts + prosphysis.ts + stoicheion.ts; proved:
   optional-parameter default preserves old call sites; unresolved: balanced
   A/B wall/CPU; falsification: off-arm hash comparison against X114 baseline).

## F. Branch return types

Every branch above returns at least one of: proof (bijection unit), counterexample
(ls-real loss), executable design (enallage.ts), experiment (screen/probe),
bound (dense-wire law), or causal model (work-meter replay). No branch returns
only prose.

## G. Second-order adversary per candidate

- ENALLAGE: source already contains octal-form fields; s/S/t/T special bits;
  file-type char collision; parent corrupts marker; contract ambiguity; raw win
  absorbed by parent. Tests: G2 ambiguity refusal, 4096 modes, independent
  decoder, parent reproduction gate, complete-message gate.
- Bitmap: alphabet order not global; duplicate items; >64 items. Tests:
  order/duplicate guards, exact decode.
- Glyph-pair: pair overlaps rule boundary; fresh glyph not single-token; body
  pair count inflated by tape. Tests: free-glyph filter, chironDecode equality.
- Fixed-point: infinite loop; non-exact member; wall pathology. Tests: round
  cap, exactness gate, A/B wall.
- Council: alias across documents/options/budgets; nested mid-epoch hit;
  exception leaks scope. Tests: key includes text/options/budgets, fresh-epoch
  guard, finally-pop unit.

## H. External verification preference

Local independent decoder is preferred to self-report. External LLM decode is
preferred but unavailable; claim downgraded. Frontier-lab math lessons adopted:
kernel/comparator over announcement (OpenAI/Anthropic refutations), certificate
object over prose (doubleAI), withdrawal base rate (OpenAI 722), trusted spec +
held-out comparator (AlphaProof Code).

## I. Repair discipline

A repaired candidate inherits no trust. Any edit to enallage/synedria/tagstack
re-runs tsc, unit probes, and the relevant complete-message probe. The A/B must
hash messages, not trust arm labels.

## J. Budget and stopping rule

Continue until the real turn budget is exhausted or H+ is met with receipts.
If H+ is not met, ship the strongest verified artifact, state the exact gap,
and name the next highest-information test. Do not stop merely because a seam
is believed open.


## X115 completed A/B addendum

The balanced A/B finished exit 0: OFF 12 290, ON 12 281 (ΣΔ −9), 29/29 exact,
no token regression, same-price hashes stable, OFF arm 29/29 hash-identical to
X114. `ls-l-real` 1 361→1 352. Whole-stack wall 1.178×, CPU 1.184× within this
one A/B; the 28-lane subset was ≈2.73× but `ls-l-real` ON paid +443 s, so the
honest whole-stack speedup is 1.178×. Outcome: H+ for X115 (new ΕΝΑΛΛΑΓΗ ships,
strict complete-message win, exact, speed account honest). LLM-blind decode
remains downgraded (no model API).
