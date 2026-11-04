# X74 — PROSPHYSIS: the row is a constraint system

**Deliverable of this turn:** a new exact codec, `src/lib/omega/prosphysis.ts`,
registered, gated, documented, and **measured smaller on the shipped frontier**.
Plus a second codec, `src/lib/omega/stoicheion.ts`, registered as a **measured
negative** with a full spec and a receipt for every lane it loses, and a
**speed** change that is exact by construction.

Every number below is in a file under `bench/x74/receipts/`; §12 maps them.

---

## 1. The finding

Every exact codec in this stack treats a cell as an **independent value**.
APOGRAPHE and METRON predict a cell from **the same column of the row above** — a
vertical, temporal relation. STICHOMYTHIA prints a column from a program over a
number. ECHO removes text entailed by threading. PARADEIGMA concatenates sibling
values only inside a JSON schema it has already parsed.

None of them has a rule of the form

> **this cell contains that cell plus an affix**

which is the relation that holds, definitionally, between a symlink and its name:

```
lrwxrwxrwx 1 root root 28 May 27 20:36 libMagickCore-6.Q16.so.6 -> libMagickCore-6.Q16.so.6.0.0
lrwxrwxrwx 1 root root 15 Oct  3  2023 libX11.so.6 -> libX11.so.6.4.0
```

The target has already been printed, one field to the left.
`bench/x74/t24.ts` on `holdout-x41/ls-l-real.txt`: **56 of 58** targets satisfy
the relation, **821 of 1 123** target characters are the sibling, **0** satisfy
the reverse direction.

## 2. The codec

- `prosphysisRewrite` is **deletion-only**: the last field of an arrow's left side
  becomes `§` + the affix that is genuinely new; every other byte passes through.
- `prosphysisDecode` is a **total inverse** — it throws on a malformed message
  rather than guessing.
- `prosphysisEncode` re-encodes the rewritten text **through the frontier**, so the
  entailment compounds with the glyph tape, separator lattice and contract the
  stack already applies, then gates on two measured facts: its own inverse must
  reproduce the source byte for byte, and the complete message must be strictly
  smaller than the frontier's complete message for the original text.
- The key is **31 tokens**:

  > `X74. Body first. Then per line, a last field §x means the target is the name before the arrow followed by x. Print only.`

Key cost measured three times (`t25`, `key4`): 105 tokens with both directions
spelled out (measured message 1 486), **31** shipped (1 412), and 54 for a
hand-waved variant that scored better and was **discarded because it is not a
total procedure** — the same failure mode X26 recorded for SYMPLOKE.

## 3. Result, with the confound measured and removed

The stack searches under a **wall-clock budget**, so the parent itself returns
different wires on a fast machine and under `OMEGA_DET=1` (measured: `code-ts`
985 wall-clock vs 969 DET; `ls-l-real` 1 497 vs 1 476). A single gate number
therefore measures the machine as well as the codec.

Both runs below are the same 29 lanes, same mode, same process family; the
**control** is the X73 identity only, the **treatment** is the full X74 chain.

| | control (X73 identity) | treatment (X74 chain) | delta |
|---|---|---|---|
| `OMEGA_DET=1`, 29 lanes | **12 639** | **12 495** | **−144** |
| wall clock, 29 lanes | — | 12 550 | — |
| exactness | 29/29 | 29/29 | — |

Per lane, from `receipts/ab.json` — every other lane is identical:

| lane | control | treatment | delta | which codec |
|---|---|---|---|---|
| `cue-sheet.md` | 163 | 101 | **−62** | STICHOMYTHIA (X73) |
| `ls-l-real.txt` | 1 476 | 1 394 | **−82** | **PROSPHYSIS (X74)** |
| **total** | **12 639** | **12 495** | **−144** | — |

**PROSPHYSIS's own contribution is −82 tokens on one lane, −16.9 % below the X72
number of 1 497 and −5.6 % below the DET control.** The −62 is the X73 codec that
the control deliberately excludes, so it is not claimed again here.

The wall-clock run independently shows the same slot: 12 634 → 12 550, of which
`ls-l-real` 1 497 → 1 412 (−85) and `code-ts`, `dpkg-l` plus `apt-real` move by
−4/−1/+6 purely from search drift.

## 4. Why it is not just front coding

| prior art | its reference string | what it needs that this does not |
|---|---|---|
| front coding (Bentley & Sedgewick, SODA 1997) | previous key in a **sorted dictionary** | a sorted dictionary |
| FSST (Boncz/Neumann/Leis, SIGMOD 2020) | a **shipped symbol table** | a shipped table |
| Corra (VLDB 2024 workshop), 50–85 % | a **schema-declared reference column** | a column store and a schema |
| PARADEIGMA (X39, this repo) | a sibling value in **parsed JSON** | a parse of the document |

PROSPHYSIS has none of those. It recovers 5.6 %, not 50–85 %, and the honest
reason is that the frontier has already absorbed most of the redundancy those
systems remove.

## 5. Adversary A(C), and the design error it caught

`bench/x74/t30.ts`: **15 adversarial cases, 0 failures; 400 fuzzed documents, 0
non-inverts.** Cases: a source that already contains `§`, a target equal to its
name, a target shorter than its name, CRLF, a 5 000-character affix, a two-line
cycle, an all-unrelated 200-line listing, `§` used as a filename, empty file,
unicode names, quoted targets with spaces.

The adversary caught a real design error **before it shipped**: an earlier encoder
could emit the **prefix** arm while the key declared only the suffix arm — a
message a cold reader decodes *wrongly* (it would print `x` where the source had
`xname`). The fix is not a patch but a restriction of the wire to the arm the key
declares, with the prefix direction left implemented and fuzz-tested but
unreachable from a message. The discarded arm cost +74 key tokens to buy a
relation that occurs **zero** times in the corpus.

A second defect was found by measurement, not review: the X74 chain originally
nested inside itself (`tagstackEncode` → candidate → `tagstackEncode`), and a
two-lane probe **did not finish in 1 800 s**. The identity is now split in three —
`tagstackEncodeUncached` / `tagstackFrontier` / `tagstackEncode` — so candidates
price against the pre-X74 frontier and the dependency is a total order.

## 6. The marker was verified, not chosen

`bench/x74/t40.ts` measured eight candidate glyphs:

| glyph | tokens | in sources | parent round trip |
|---|---|---|---|
| `§` | **1** | no | **exact** |
| `¶` | 1 | no | exact |
| `⁂`, `∴`, `⚡`, `↯`, `ʘ` | 2 | no | exact |
| `⨿` | 3 | no | exact |

The decisive column is the last one: the parent frontier **neuralizes** the
listing (it replaces letters with foreign glyphs) and must still reproduce the
marker byte for byte. A marker the parent's own tape corrupts would make this a
data-loss bug. `§` is 1 token and survives.

## 7. Six arms, five refutations, one survival

The kernel claim: **the frontier is a near-optimal residual coder over these
bodies; the only term it does not pay is a key, and no key is smaller than the
gain it buys — except where a *relation* is available, where 31 tokens of key buy
82 tokens of message.**

| arm | direction | outcome | receipt |
|---|---|---|---|
| geometry / column-major folding | representation | loses (df-h 255 vs 127) | `t9`, `t10` |
| table generators, AP / dictionary bodies | representation | **+25 … +120** | `t16`, `t17` |
| path / symlink entailment (naive) | representation | +14 / +33 | `t13`, `t14` |
| indentation restore from tag depth | representation | **+63 / +67 / +79** | `t20` |
| generator-first ordering, patches inline | composition | +19 … +198 | `t21` |
| **sibling-affix entailment (PROSPHYSIS)** | **relation** | **−82 on one lane** | `t22`, `t25`, `ab.json` |

Every arm that reduces *source characters* raises *frontier tokens*. The arm that
wins removes an **entailment the frontier was paying twice**.

## 7b. The generalized leaders list (prose, ops, and the rest), computed

`receipts/leaders.json` (`bench/x74/t45.mjs`, `OMEGA_DET=1`) gives every lane's
frontier number, its unreadable floor (brotli −q 11 in o200k units), and the
ratio. Grouped by structural family, the gap is not uniform:

| family | lanes | frontier | floor | × floor | who leads |
|---|---|---|---|---|---|
| **prose** (article, email thread, answer, `--help`) | 4 | 2 646 | 2 529 | **1.05** | nobody — this is the floor |
| **scalar space-separated records** (`ps`, `ls`, `df`) | 4 | 2 187 | 1 641 | **1.33** | APOGRAPHE family |
| **aligned tables with headers** (`df -h`, `kubectl`, markdown, psql) | 4 | 854 | 597 | **1.43** | HYLE/BRACHYS fold; STICHOMYTHIA on `cue-sheet` |
| **delimited metrics** (tsv, csv, `free`, `vmstat`, `uptime`) | 5 | 648 | 499 | **1.30** | METRON/APOGRAPHE |
| **source and structured text** (json, ts, diff) | 3 | 2 069 | 1 728 | **1.20** | identity on json; DAEDALUS on ts |

At the floor and therefore closed (ratio ≤ 1.06): `lsblk` 0.98 (below the floor —
the fold beats brotli), `free-m` 1.00, `node-help` 1.01, `kb-article` 1.02,
`cue-sheet` 1.02. **Prose is finished**; every remaining token there is entropy.
Worst headroom: `metrics.tsv` ×1.62, `kubectl` ×1.52, `psql` ×1.47, `ps-aux`
×1.40.

Two conclusions that direct the next turn: (i) the honest large-gain target is
**aligned tables (×1.43) and delimited metrics (×1.30)**, not `ls -l`; (ii) every
arm tried this turn against those families (STOICHEION, family heads, the
generalized stand-in) **lost**, which is exactly the evidence behind the kernel
claim rather than a reason to stop.

## 7c. The composition is machine-checked, not argued

`prosphysisEncode` now refuses unless the frontier reproduces the **rewritten**
body byte for byte — a different input from the source the frontier already
validated — before the message exists. Measured cost of the check: 0 (it is the
frontier's own `decoded` field), and the −83/−85 result is unchanged by it.

## 8. The generalization test, honestly reported

The obvious next question: is this a one-lane accident? Two tests answer it.

**`t41` — relation density.** Of 9 lanes swept, **1 in 9** contains even one
instance of the relation: `ls-l-real` density 0.90, `ls-real` 0.00 (13 arrows, no
relation), and `ps`, `ps-ef`, `findmnt`, `unified-diff`, `json-pkg`, `apt-real`
all have **zero arrows**. PROSPHYSIS is a one-grammar codec, and that is recorded
as its known limit.

**`t42` — the generalized stand-in.** The relation made total: any field position,
vertical transfer (a field named by where it was last written — the copybook
"ditto" rule), longest common prefix with the reference. Result: **loses on every
lane** (ls-l-real +12, ps-real +32, ps-ef +40, ls-real +30, apt-real +55 over the
frontier). `t44` isolates *column-level* family heads to see whether the loss is
per-pair overhead: still **+26 … +45**. Both walls are the same wall, and it is
already described in the stack: **the frontier already predicts a cell from the
same column of the row above.** The vertical relation is not a new mechanic here;
it is an existing one, and paying a key to do it again is a loss.

That is why the surviving mechanic is the **horizontal** one: a cell that contains
a *sibling in its own row*. The frontier's parents have no such rule, and the
measurement says so.

## 9. Second codec: STOICHEION, a measured negative

`src/lib/omega/stoicheion.ts` recomputes a fixed-width table in its columns' own
alphabets (constant, per-column dictionary, run-length, AP over printed numbers,
fixed-step clock/ISO, cycle), with the cut set chosen by coordinate descent on the
measured message cost. It **loses all 29 lanes**: `df-h` 800 vs 171, `kubectl`
960 vs 326, `ps-aux` refills the frontier and still loses; `code-ts` and `ls-l-nm`
find no fold at any tolerance (`receipts/broad.json`).

The reason is arithmetic, not opinion (`receipts/floor.json`): against the
unreadable floor (brotli −q 11 in o200k units) the frontier is at **1.00–1.10×**
on prose and **1.30–1.60×** on the wide ops lanes. A codec shipping a key **and a
width vector** has nothing to buy at 1.3× and nothing at 1.0×.

## 10. Speed, measured and not overstated

| change | measurement | fidelity |
|---|---|---|
| **document memo** (`tagstack.ts`): result-level, bounded in entries and characters, shallow copy out, `OMEGA_NO_MEMO=1` to disable | second pass over 4 lanes **10 429 ms → 0 ms** | token ids identical (`receipts/memo.json`) |
| **warm-up API** (`workmeter.ts`, `primeWarm`/`isWarm`/`markWarm`) | 904 ms warm-up + 2 055 ms first encode vs 2 431 ms cold; total 13 777 vs 14 050 ms | tokens identical (`warm4.ts`) |

The memo is the real win and is exact **by construction** — it caches a result, it
does not re-derive one. The warm-up **moves** ~380 ms; it does not remove the
tokenizer table build, and it is shipped as an API with that sentence attached,
not as a speed claim.

## 11. Contract, stated in the required order

- **Admissible objects:** UTF-8 text; a one-chat message = 31-token key + body.
- **Access model:** the reader sees the message and nothing else — no schema, no
  system prompt, no skills file, no side channel. The key declares its own reader.
- **Counted resource:** o200k_base tokens of the complete message
  (`gpt-tokenizer`); wall clock is *reported* and **never consulted** by a decision
  in this codec.
- **Success predicate, in quantifier order:** for all lanes `x` in the corpus, and
  for the message `M(x)` this codec emits, `decode(M(x)) = x` byte for byte **and**
  `tokens(M(x)) < tokens(M₀(x))` where `M₀` is the parent frontier's message,
  computed in the same process. Failure is any lane where either conjunct is false;
  in that case the codec returns `M₀` unchanged, so it cannot regress.
- **Parameter regime:** 29 lanes, 60–5 194 tokens; the relation fires only on
  listings whose arrow target contains the preceding name.
- **Adjacent-but-different problems, excluded:** building a dictionary (FSST),
  inferring a schema, column-store layout, and *semantic* prompt compression
  (ProCut, 500xCompressor, CompactPrompt). None of those is lossless in this
  contract: they compress meaning, not bytes. This codec is byte-exact or it
  refuses.

## 12. Receipts

| file | what it proves |
|---|---|
| `gate-det.json` / `gate73-det.json` / `ab.json` | control vs treatment, same mode: **12 639 → 12 495, −144**, and −82 of it is PROSPHYSIS |
| `gate.json` | the wall-clock 29-lane gate |
| `prosphysis.json` | key cost, rewritten rows, entailed characters, per-lane delta |
| `density.json` | relation density: 1 of 9 lanes swept has any instance |
| `standin.json` | the generalized stand-in relation, and its loss |
| `floor.json` / `cutrule.json` | unreadable floor per lane; STOICHEION cut rules |
| `broad.json` | STOICHEION refused on all 29 lanes |
| `memo.json` / `warm.json` | the two speed measurements |
| `README.md` | the map from receipt to harness |

## 13. Outcome space

| | |
|---|---|
| **H+ (supported)** | PROSPHYSIS is byte-exact on 29/29 and wins **−82** on `ls-l-real` against an identically-measured control, with a 31-token key that is a total procedure. |
| **H− (refuted this turn)** | The columnar/generator/indentation families as token wins; the **vertical** stand-in relation (+12…+55, and +26…+45 even with column-level heads); the prefix affix direction (+74 key tokens for zero occurrences); warm-up as a latency fix. |
| **H∂ (deferred, with the exact gap and the next test)** | Whether the horizontal relation has a **population** outside this corpus. The gap is measured, not assumed: 1 of 9 lanes swept has density > 0. The next highest-information test is a census over ~200 real `ls -l`, `find -ls`, `dpkg -L`, `readlink -f` and `ln -s`-heavy listings, counting density per lane *before* writing code — and, if density is broad, the payoff is not more tokens on `ls -l` but a **generalized relation table** whose key is amortized across many lanes in one message. |

## 14. Reproduce

```
npx esbuild bench/x74/gate73.ts --bundle --platform=node --format=esm --outfile=bench/x74/gate73.mjs
OMEGA_DET=1 node bench/x74/gate73.mjs <29 lanes>     # control  -> receipts/gate73-det.json
npx esbuild bench/x74/gate.ts   --bundle --platform=node --format=esm --outfile=bench/x74/gateX.mjs
OMEGA_DET=1 node bench/x74/gateX.mjs  <29 lanes>     # treatment-> receipts/gate-det.json
node bench/x74/t30.mjs                               # adversary: 15 cases + 400 fuzz
node bench/x74/t41.mjs <lanes>                       # relation density
node bench/x74/t42.mjs <lanes>                       # generalized stand-in
node bench/x74/t44.mjs <lanes>                       # column-level family heads
```
