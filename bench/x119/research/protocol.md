# X119 formal protocol

Status: written after the six exploratory screens were executed, BEFORE any
further screening or shipping decision. The exploratory screens inherited the
X118 preference bar (>10 tokens on a lane preferred, not required). The shipping
threshold below is fixed for the remainder of the turn and is not moved to fit a
result.

## A. Admissible objects
A single UTF-8 string `M` posted in one plain chat turn. No skills.md, no system
prompt, no weights, no added vocabulary, no fine-tuning, no sidecar file. `M`
must be decodable by an LLM from the message alone, and the repository's
executed inverse must return the source bytes exactly. For a wire-level codec
the preserved object is `chironDecode(M.slice(indexOf('§')))` — the CHIRON-layer
expansion of the incumbent — because on composed lanes that expansion is the
pre-frontier rewrite, not the source.

## B. Access model
Encoder: the shipped `tagstackEncode` under pinned audit flags
(`OMEGA_DET=1, OMEGA_NO_MEMO=1, OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0,
OMEGA_NO_OROTHESIA=1, OMEGA_SYNEDRIA=1, OMEGA_SYNEDRIA_CHAIN=1,
OMEGA_ENALLAGE=1, OMEGA_MEKOS=1, OMEGA_SYNTHESIS=1`). Decoder: the independent
CPython CHIRON reader (`bench/chiron_decode.py`) plus the incumbent's parent
inverse where composed. No model API is available; cold read is executed by
CPython, not claimed for an LLM.

## C. Counted resource
`countTokens(M, 'o200k_base')` on the COMPLETE message (contract + tape + body),
never additive metadata. Wall/CPU measured by `performance.now()` /
`process.cpuUsage()` in one interleaved process.

## D. Success / failure, quantifier order
For every lane ℓ in the canonical 29:
  1. `exact(ON,ℓ) ∧ exact(OFF,ℓ)` (byte-perfect source reconstruction).
  2. `tokens(ON,ℓ) ≤ tokens(OFF,ℓ)` (no per-lane regression).
  3. `chironDecode(ON,ℓ) = chironDecode(OFF,ℓ)` where a § frame exists.
Aggregate success: Σ tokens(ON) < Σ tokens(OFF). A single lane with `>` fails
the whole candidate regardless of aggregate. Hash equality at equal token count
is recorded (`samePriceHashStable`) but not required for a token win.

## E. Parameter regime / units / tolerances
Encoding `o200k_base`; tokens are integers; tolerance 0. Wall speedup claimed
only from one interleaved process (cross-process drift ~1.6× on this box).
DIGLOSSIA caps: ROUNDS=4, MAX_RULES=512, MAX_VALUE_LEN=240, MAX_WINDOW=96,
MAX_ENUMERATED=200000, MAX_PRICED=60000. A capped run is reported `capped:true`
and is not evidence of optimality.

## F. Adjacent problems NOT substituted
- Downstream task accuracy (Fact–Token vs Token–State): not claimed.
- Binary compression ratio (LoPace/zstd): inadmissible object.
- Soft/lossy prompt compression (500xCompressor/ProCut): inadmissible.
- Tokenizer retraining (BoundlessBPE/Fusion Token): inadmissible.
- Kernel-checked lab math: reviewed, not used as a component.

## G. Hypotheses and evidence threshold (FIXED)
- **H+ (DIGLOSSIA):** per-occurrence recoding of the finished wire yields ΣΔ ≤ −10
  on the 29 lanes with 0 worse and exact 29/29. Screen evidence: −20, 9 wins
  (`receipts/screen-recoding.json`). Shipping requires the balanced A/B to
  confirm, not the screen alone.
- **H−:** the gain is a contract-deletion artifact or a per-rule effect already
  owned by ΔΙΑΓΡΑΦΗ/ΣΥΝΔΥΑΣΜΟΣ. Falsified by: contract prefix preserved verbatim;
  rule set unchanged; wins survive on lanes where ΔΙΑΓΡΑΦΗ already ran.
- **H∂:** the gain is real but below the general-prose bar. Accepted honestly if
  the A/B lands in (−10, 0); the codec still ships only if Pareto, but the
  ">10 on a lane" preference is reported as missed.
- **Speed arm threshold:** wall speedup ≥ 1.20× with identical tokens AND hashes
  on 29/29. Below that, no speed claim ships.

## H. Frontier achievability / impossibility (hypotheses)
- Achievable: the incumbent tape already contains the dictionary; the free
  parameter is the per-use spelling. No new contract clause is needed, so the
  representation seen by the parent frontier is improved without changing the
  parent's decode rule.
- Impossibility hypothesis (not proved): a per-rule quantifier is optimal when
  every occurrence of a rule has identical BPE context. Falsified by any lane
  where two occurrences of the same flat value have different marginal costs —
  observed on dpkg-l (4 adopt sites), ps-aux-real (3 adopt + 2 bypass).

## I. Negative result shapes (≥15), including the modal-shortcut failure
1. Single-reference occurrence inlining: 0 profitable sites, Δ0 (screen-inline).
2. Joint contextual bypass on body windows alone: Δ−1 (screen-bypass).
3. Universal cross-script glyph alphabet WITH contract replacement: Δ−62 INVALID
   — **modal-shortcut failure**: the shortcut deleted metron/akolouthia2/synkrisis
   clauses; the apparent win was contract deletion, not compression.
4. Universal alphabet with prefix preserved: Δ−4, below bar; collisions on
   code-ts/ps-aux-real/apt-real force fallback.
5. Tape-only reference bypass: Δ−4, below bar (screen-tape-bypass).
6. Adoption alone: Δ−15, 7 wins — real but the union with bypass is strictly
   better (Δ−20), so adoption-only is a dominated local optimum.
7. DiffPaths vertical affix: +29 / +77 / +114 (X118).
8. Hunk counts: unsound (X118).
9. Sentence-case channel: +13 948 (X118).
10. Markdown separator elision: +22 (X118).
11. Row-count entailment: +11 (X118).
12. Negation channel: +24 (X118).
13. ΟΡΟΘΕΣΙΑ junction-model relocation: Δ0, +74.9% wall (X104/X105).
14. Uniform work-meter 0.25×: ps-aux-real +11 (X93) — budget coupling defect.
15. FUSED-OVER-NET base-frontier pricing: +12 on ls-l-real (X118) — inner encoder
    must be the full X74 chain.
16. LTSC overlapping swaps: non-invertible under literal Algorithm 2 (external).
17. System-prompt dictionary encoding: inadmissible object (2604.13066).
18. KANON double-counted `decoderPrompt + wire`: frontierCosts kanon ≈ 2× its
    true M on every lane; a metadata artifact, not a compression lead.
19. Single-reference body bypass (keep the rule): Δ−3, 2 wins
    (`screen-single-bypass.json`); the llm-answer sites are already taken by the
    multi-reference bypass and code-ts is −1, so it is dominated / below bar and
    is NOT shipped.
20. ΣΥΝΘΕΣΙΣ inner-scope speed arm: hash-identical on ls-l-real but 1.019× wall /
    0.986× CPU (`speed-inner.json`), below the declared 1.20× threshold;
    reverted, not shipped.
21. Large-regime CHIRON 0.25 budget extension: hash-identical on ls-l-real but
    1.039× wall / 1.074× CPU (`speed-budget.json`), below threshold; not shipped.
22. KANON fallback retirement lead: total KANON wall across 29 lanes is 55 s
    (`kanon-all.json`), too small for a significant whole-stack speedup; the
    double-counted `decoderPrompt + wire` is a metadata defect, not a lead.
23. DAEDALUS maxArms 1: faster nowhere reliable (warm-cache artifact), 2 lanes
    change wire and 2 lose tokens (`daedalus-arms.json`); falsified.

## J. Mechanism-distinct approaches (≥6), each with a real artifact
| # | Mechanism | Construction | Artifact | Proved portion | Unresolved interface | Cheapest falsification | Local-vs-global gap |
|---|-----------|--------------|----------|----------------|----------------------|------------------------|---------------------|
| 1 | Occurrence inlining | replace 1-use rule refs | screen-inline.json | Δ0, 0 sites | none left | run on 29 wires | local=global (empty) |
| 2 | Body-window bypass | inline ≥2-ref windows | screen-bypass.json | Δ−1 | per-rule quantifier | whole-msg price | local −1 vs global −1 |
| 3 | Universal glyph pool | reassign across scripts | screen-universal.json | Δ−4 valid; −62 invalid | contract semantics | prefix-preservation check | shortcut global win was fake |
| 4 | Tape-window bypass | inline refs inside values | screen-tape-bypass.json | Δ−4 | forward refs | chironDecode gate | local −4 vs global −4 |
| 5 | Per-occurrence adoption | literal span → existing glyph | screen-adopt.json | Δ−15, 7 wins | contextual BPE | whole-msg price | local −15 < union −20 |
| 6 | Unified recoding (DIGLOSSIA) | adopt + bypass, body+tape, disjoint sites | screen-recoding.json; src/lib/omega/diglossia.ts | Δ−20 screen; exact gate | LLM readability of mixed spelling | balanced A/B + CPython cold read | screen local optimum vs A/B global |
| 7 | Speed seam census | parent-ms / kanon / amphora probes | receipts/speed-*.json, parent-ms.log | KANON ≈4 s on ls-l-real (not the 818 s seam) | where the 818 s actually goes | parent-ms census | token cost ≠ wall cost |

Every branch returns a real artifact. Second-order adversary per candidate:
(1–2,5–6) overlapping-site / LTSC attack → disjointness + re-decode;
(3) contract-deletion attack → prefix byte-equality;
(4) forward-reference attack → chironDecode gate;
(7) metadata double-count attack → count the literal emitted message, not
`decoderPrompt + wire` when the prompt already contains the wire.

Repairs are re-gated plus a new attack: the X118 inner-encoder repair was
re-gated on ls-l-real (1348→1341) and attacked with the CRC-domain battery
(0 silent accepts). X119's DIGLOSSIA inherits that discipline: unit 8/8,
balanced A/B, CPython cold read of the CHIRON layer, and a mutation battery on
the emitted wire.

Stop rule: real budget exhaustion only. No analysis-only delivery.
