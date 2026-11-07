# X76 — PINAX, and the measurement of where the frontier's headroom is not

New codec: `src/lib/omega/pinax.ts`, registry key `pinax`.
`psql-output.txt` **244 → 236 (−8, −3.3 %)**, byte-exact.
Investigated and reported as a measured negative: `src/lib/omega/platos.ts` (not registered).

---

## 1. Frontier configuration: confirmed for the third turn

`bench/x74/gate73.ts`, 29 lanes, `OMEGA_DET=1` (`bench/x76/config-check.log`,
`config.json`): **12 639 tokens, 29/29 exact**.

| arm | X74 | X75 | X76 |
|---|---|---|---|
| X73 identity control | 12 639 | 12 639 | **12 639** |
| X74 chain | 12 495 | 12 495 | (not re-run) |

The frontier is exactly the configuration reported last turn. No restatement needed.

## 2. The new codec: PINAX

Some frontier parents emit not a sentence but a **legend** — one line carrying the whole
operator table for the wire, written as English prose. METRON's, on `psql-output.txt`, is
**73 tokens of a 244-token message (30 %)**:

```
Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are
dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it.
above=line above, colM=column M of the same line, days/workdays=next date/weekday,
+b=number above+b same width print only.
```

A legend is *already* a table of `name = definition` pairs; it is only **spelled** as
prose. PINAX writes it as what it is:

```
Before ¶ k=v, expand repeatedly. Header n,sep,col=model. Named cols: drop, rebuild.
Full n-field line: literal, resets, drop. above=line above. colM=col M same line.
days/workdays=next date/weekday. +b=above+b same width. print only.
```

73 → 65 tokens. Every operator is preserved; only connectives ("are", "from lines",
"and", "of the same line") are removed.

**How this differs from BRACHYLOGIA (X75).** BRACHYLOGIA shortens a *sentence* — same
sentence, fewer grammatical words. PINAX restructures a *table* — the object already has
`name = definition` structure, and PINAX stops spelling it as English. Different object,
different rule table, different coverage gate (operator set, not sentence elements).

**Measured** (`bench/x76/t12.ts`, 7 lanes, byte-exact on all 7):

| lane | X74 | PINAX | delta |
|---|---|---|---|
| `psql-output.txt` | 244 | **236** | −8 (−3.3 %) |
| cue-sheet, markdown-table, prices.csv, df-h, metrics.tsv, kubectl | — | — | 0 (no composed legend) |

## 3. Item #10 — improve the representation the parent frontier sees

This was the standing unexplored instruction. It was investigated properly and the
answer is negative, with a number attached.

**The opportunity.** In an aligned table, inter-column padding is not data: it is a
function of the column width and the value length, so it is determined by information the
reader already has. Measured (`bench/x76/t3.ts`, `receipts/padding.json`, 20 lanes):

| lane | raw | squeeze | saving |
|---|---|---|---|
| ps-aux-real | 3 054 | 2 585 | −469 (−15.4 %) |
| ls-l-real | 5 194 | 4 752 | −442 (−8.5 %) |
| ps-ef | 1 144 | 984 | −160 (−14.0 %) |
| ps-real | 1 106 | 948 | −158 (−14.3 %) |
| dpkg-l | 1 000 | 858 | −142 (−14.2 %) |
| node-help | 1 099 | 953 | −146 (−13.3 %) |
| kubectl | 1 006 | 868 | −138 (−13.7 %) |
| vmstat | 229 | 182 | −47 (−20.5 %) |
| **total, 20 lanes** | **23 020** | **20 986** | **−2 034 (−8.8 %)** |
| metrics.tsv, prices.csv, du-real, apt-real, kb-article | | | **0** |

**The refutation.** Removing 469 raw tokens from `ps-aux-real` shrinks the frontier's
message by only **57** (`receipts/squeeze-frontier.json`). The frontier therefore
compresses padding at an **8.2× marginal rate against its 2.9× average** — it is far
better at padding than at the rest of the document, which means there is no headroom
there. The frontier already assigns glyphs to the repeated whitespace runs.

**The codec.** `src/lib/omega/platos.ts` implements it anyway, correctly: detect the
fixed-width layout by a fixpoint that tolerates non-table lines (a `# source:` comment,
`dpkg -l`'s five preamble lines, `ls -l`'s `total N`), squeeze, mark non-conforming lines,
hand the squeezed text to the frontier, and gate on byte-exact restore plus a strict win.
Restore reproduces the source byte-for-byte on **11 of 14 lanes** (`bench/x76/t10.ts`).

**The verdict.** The declaration costs 27–42 tokens. Measured end to end on
`findmnt.txt`: **461 vs 444 — loses** (`t9b.log`). This is the same wall STOICHEION hit
in X74 from the other direction: at ×1.3–1.5 of an unreadable floor, a codec that must
ship a key has little left to buy. The module is retained **unregistered** so the
experiment stays reproducible — a codec that never fires should not sit in the registry.

## 4. Two further mechanisms measured and rejected

- **Tape front-coding** (`bench/x76/t6.ts`). The tape is **26.4 % of the message**
  (825 of 3 120 tokens over 10 lanes), so it looked like the biggest single target. But
  consecutive rules share only **39 characters** across 10 lanes, and the front-coded
  form is *larger* (1 282 vs 1 171 tokens) because the length codes cost more than they
  save.
- **Tape rule composition** (`bench/x76/t7.ts`). Of 341 rules, **208 already compose**
  (their text references an earlier rule's glyph) — the encoder already exploits this.
  The remaining potential is 220 characters over 10 lanes, 123 of them on one lane.

## 5. Where the headroom is, and where it is not

Refreshed leaders (`receipts/` and X75's `receipts/leaders.json`), ratio = frontier
tokens ÷ unreadable floor (brotli −q11 at 14.8 bits/token):

| class | lanes | ratio |
|---|---|---|
| ops: delimited metrics | 1 | ×1.48 |
| ops: listing | 2 | ×1.44 |
| ops: query output | 1 | ×1.47 |
| ops: process table | 3 | ×1.34 |
| ops: aligned table | 5 | ×1.33 |
| source: TypeScript | 1 | ×1.19 |
| structured: JSON | 1 | ×1.15 |
| **prose: email / markdown / article** | 3 | **×1.02–1.10** |

Prose is at an *unreadable* floor and has been for two turns. Ops retains ×1.3–1.5, and
this turn showed that the gap is **not** padding, **not** the tape, and **not** contract
prose at scale — the contract layer as a whole is worth ~4.6 % of the gate and X75 + X76
have now taken the two parts of it that can be taken.

## 6. Speed — not improved this turn

No speed work was completed; none is claimed. X75's profile stands as the diagnosis:
25.5 % `countTokens`, 14.2 % `rankAt`, 9.6 % `scoreRunCostDelta`, on ~230 000 candidate
measurements per lane with the chunk cache already at **99.4 %** hits, so the fix is
*fewer candidates*, not faster counting — and that is a fidelity question.

## 7. External sources consulted this turn

New sites and papers, not previously cited by this stack:

- **RoundTripCodeEval** (Maveli, Vergari, Cohen; Edinburgh) — arXiv:2601.13398. The first
  external benchmark of the exact ability this stack depends on: given a lossless codec,
  can an LLM invert it? Models pass forward and backward tasks separately and **fail the
  combined round trip**, and failures persist even on simple bijections such as RLE.
- **Innovative tokenisation of structured data for LLM training** — arXiv:2508.01685.
  Hybrid tokeniser: fixed tokens for table structure and low-cardinality categoricals,
  BPE for high-cardinality and continuous values; 6.18:1 on 31 M NetFlow records. Closest
  external work to the ops-lane problem. **Not admissible here**: it is a training-time
  tokeniser and reports no reconstruction check.
- **M2 / EqualInfoAC** (TMLR 12/2024) — arXiv:2404.03626. LMs over arithmetic-coded text;
  ~5.3× token-level compression. Not admissible (needs a trained model).
- **Cramming 1568 Tokens into a Single Vector** (ACL 2025). An upper bound on what a
  learned vector can carry, not a byte-exact scheme. Not admissible.
- **Text or Pixels** — arXiv:2510.18279. Halves decoder tokens by rendering text as an
  image. Not admissible: multimodal, and not byte-exact.

## 8. What is not claimed

- **PINAX wins on one lane by eight tokens.** That is the honest size of what remains in
  the contract layer. It is a Pareto improvement, not a family.
- **PLATOS loses** and is therefore not registered.
- **No speed improvement** this turn.
- **No model was called by the encoder** for either codec.

## 9. Next highest-information test

Every surface-redundancy attack has now failed for the same reason: the frontier already
captures surface redundancy at better than its average rate. The discriminating
experiment is therefore not another transform but a **marginal-rate map**: for each
lane, ablate one class of input tokens at a time (padding, digits, identifiers, punctuation)
and record Δ frontier tokens ÷ Δ input tokens. Classes with a rate near 1.0 are where the
frontier is blind and where a codec can still win; `findmnt` showed a rate near 1.0 on
indentation while `ps-aux` showed 0.12 on padding, so the map is not uniform and is worth
measuring rather than assuming.
