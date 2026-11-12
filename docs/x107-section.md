## §X107 — ΠΕΡΙΚΟΠΉ (`src/lib/omega/perikopi.ts`) · the contract-line codec, and the
## measurement-routing defect that hid five turns of shipped gain

X107 ships **one new codec, ΠΕΡΙΚΟΠΉ**, and reports **one measurement defect found while
building it**. Both are stated with the numbers that produced them.

---

### 1. The defect: `tagstackFrontier` has never measured the encoder

`tagstackFrontier` is documented, in its own docstring, as *"THE X73 FRONTIER — the identity
WITHOUT the X74 candidates. It is exported because the X74 candidates must price their own
bodies against it: if PROSPHYSIS asked `tagstackEncode` for the price of its rewritten text,
that call would re-enter the X74 chain on the rewritten text, and the chain would recurse."*
That is a sound design decision and it is not a bug in itself.

The consequence, however, is that **every "frontier" receipt since X73 has priced the
identity layer, not the encoder's output.** The call graph is:

```
tagstackFrontier  -> tagstackEncodeUncached -> tagstackEncodeInner     (no registry arm)
tagstackEncode    -> tagstackX74Chain -> tagstackEncodeInner + ΣΤΙΧΟΜΥΘΪΑ + every arm
```

`tagstackX74Chain` is the function in which PROSPHYSIS, ΣΥΜΦΥΪΑ, STOICHEION, ἸΣΟΜΟΡΦΪΑ,
ΜΕΤΑΤΑΞΙΣ, ΣΥΝΔΥΑΣΜΟΣ, ΓΕΝΝΑΔΑΣ, ΔΙΑΓΡΑΦΗ, ΠΡΟΑΓΩΓΗ, ΠΑΛΙΝΔΡΟΜΟΣ and now ΠΕΡΙΚΟΠΉ are
admitted. `tagstackFrontier` never reaches it.

**Measured, this turn, on two lanes with `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0
OMEGA_OURA_MEMO=0 OMEGA_NO_OROTHESIA=1`** (`bench/x107/receipts/routing.out`):

| lane | `tagstackFrontier` (identity) | `tagstackEncode` (chain) | Δ |
|---|---|---|---|
| `psql-output.txt` | 244 | 232 | **−12** |
| `cue-sheet.md` | 163 | 101 | **−62** |

Both exact. The 163 → 101 is ΣΤΙΧΟΜΥΘΪΑ, whose own comment records "cue-sheet 163 -> 101"
as the one lane it wins.

**What this means, stated plainly.** The number 12 639 that has been reproduced five times is
the price of the *identity layer*. It is a real number for a real function, and it is the
correct reference for the X74 candidates to price against — which is what it is for. It is
**not** the size of the message the encoder emits, and it has been reported as if it were.
The encoder's own output is smaller, and by more than any codec added this turn. The prior
A/B figures are consistent with this: X102 measured 12 410 → 12 405 and X103 12 415 → 12 412
on `tagstackEncode`, i.e. a chain roughly 230 tokens below the reported 12 639.

**The correction is kept, not silently replaced.** 12 639 remains in the record as the
identity-layer figure with its five confirmations. From X107 the honest frontier is the
`tagstackEncode` figure, and both are reported side by side.

---

### 2. The target: the contract line, which is 5.8 % of the frontier and 44.8 % of one lane

X106's cost census (`bench/x104/receipts/centres-x106.json`) split the frontier three ways:

```
TOTAL 12639 = contract 734 (5.8%) + tape 3403 (26.9%) + body 8878 (70.2%)
```

The contract is the line the decoder reads *first*, and it is the only part of the wire that
carries no information about the payload — it is the decode program itself. Dumping the live
wire (`bench/x107/contractdump.mjs`) shows what it is on the worst lane:

> `Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped
> from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line
> above, colM=column M of the same line, days/workdays=next date/weekday, +b=number
> above+b same width print only.`

**291 characters, 73 tokens, 44.8 % of `cue-sheet.md`'s 163-token lane**, and 73 of
`psql-output.txt`'s 244 (29.9 %), and 57 of `prices.csv`'s 133 (42.9 %). Against 11 tokens on
most lanes. It is English prose specifying a column-model codec.

**Five distinct legend families were found on the live wire, not one:**

| family | parent | the legend |
|---|---|---|
| ΜΕΤΡΟΝ / ΑΠΟΓΡΑΦΗ column model | metron | `Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; …` |
| ΔΙΑΣΤΗΜΑ mask | diastema | `Before ¶ k=v. expand repeatedly Δ: mask = value shape with # per digit. R: … L: verbatim. Print. print only.` |
| ΣΥΝΚΡΙΣΗ digit shift | synkrisis | `Before ¶ k=v. expand repeatedly After ~, a number has . before its last 1 digits. print only.` |
| ΣΤΙΧΟΜΥΘΪΑ column program | stichomythia | `spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.` |
| ΑΚΟΛΟΥΘΪΑ2 delta | akolouthia2 | `⁺ = the number at the same position in the line above, plus the change from the line two above.` |

---

### 3. Two defects on that line, both measured

**DEFECT 1 — ΠΊΝΑΞ IS NOT WIRED INTO THE CHAIN.** ΠΊΝΑΞ (X76) is the codec written for exactly
this line, and its own header records the measurement: **73 → 65 tokens on
`psql-output.txt`** (`bench/x76/t11.ts`). A grep of `src/lib/omega/tagstack.ts` for `pinax`
returns **nothing**. ΠΊΝΑΞ exists as a registry arm (`registry.ts:1698`) and nowhere else, so
the chain has never collected its −8. ΒΡΑΧΥΛΟΓΊΑ (X75) is in the same state
(`registry.ts:1653`). Two written, gated, validated codecs have been sitting outside the
encoder for thirty turns.

**DEFECT 2 — ΠΊΝΑΞ's substitution table cannot see ΑΠΟΓΡΑΦΗ's legends at all.**
`pinaxIsLegend` begins `if (/\d/.test(t)) return false;`. But ΑΠΟΓΡΑΦΗ
(`src/lib/omega/apographe.ts:801`) emits its legend from `APOGRAPHE_CLAUSE`, a **family**:
three `setup` wordings × two wordings per column family (`above`, `col`, `days`, `workdays`,
`int`, `lin`, `clock`) plus two `combined` wordings — and the per-family wordings are full of
column numbers and arithmetic constants (`colN=+b: that column is the number above plus b,
same digit count.`). So every ΑΠΟΓΡΑΦΗ legend is rejected by the digit test *before* the
substitution table is consulted, and the two regexes that do exist match none of the family.

---

### 4. ΠΕΡΙΚΟΠΉ — the mechanism, and why it is not a rename of ΠΊΝΑΞ

ΠΊΝΑΞ hard-codes one legend → one replacement. **ΠΕΡΙΚΟΠΉ generalises the same operation to
the whole family by *parsing* instead of *matching*:** the legend is split into a preamble and
a list of `name = definition` clauses, and each clause is abbreviated through a table keyed on
the clause's **opening words** rather than on the whole string. That is what makes it
wording-independent — a new ΑΠΟΓΡΑΦΗ wording is contracted by the same table with no new
regex.

ΠΕΡΙΚΟΠΉ runs **three** passes on the same line and keeps whichever is cheapest, priced by
the real tokenizer: ΠΊΝΑΞ's own substitution table (pass A), the general clause table
(pass B), and the preamble table (pass C, which runs on the cheapest of A and B because B
emits a preamble form only C can contract further). On ΜΕΤΡΟΝ's exact wording the general
pass does better than ΠΊΝΑΞ's rules (−12 against −8, measured); on the ΑΠΟΓΡΑΦΗ family
ΠΊΝΑΞ does not fire at all and ΠΕΡΙΚΟΠΉ measures −37, −18, −9. No pass is dropped.

**GREEDY? NO.** A fixed, total, idempotent abbreviation table plus a cheapest-of-three
selection priced by the real tokenizer. No hill-climb, no portfolio, no clock. The only
decision is admit-or-not, and it is made by measurement under a strict-win gate. The same
input yields the same wire on any machine.

**TIME- OR CPU-BOUND?** **CPU-bound, no wall clock, reproducibly.** One regex/table pass over
the contract line plus a handful of token counts.

### The six gates, all executed on every encode

| gate | what it checks |
|---|---|
| 1 · invertibility | undo every edit; the message returns byte-for-byte |
| 2 · wire immunity | no edited line carries the tape marker `§` |
| 3 · data guard | never edit a line that occurs verbatim in the source |
| 4 · operator coverage | every operator named in the original legend is still named in the replacement |
| 5 · strict win | the complete message is strictly smaller |
| 6 · **name-set coverage (new)** | every *clause-initial* `name=` in the original legend appears verbatim in the replacement |

**Three of these gates were each forced by a bug found and fixed this turn, and each fix is
the reason a number is what it is:**

- **Gate 6, first version** collected every `word=` in the line, which caught `line` in
  *"Header **line** = n, sep, col=model"* — English, not a column name — and blocked every
  contraction of the header clause. The shipped version collects clause-initial names only.
- **Gate 4, first version** required the whole `REQUIRES` vocabulary, which refused every
  ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ legend because those never mention `col=model`/`above`/`colM`. The
  shipped version requires only the operators the original line actually named.
- **Gate 4 caught a real semantic loss, and won.** A fourth preamble candidate,
  `Before ¶ k=v. expand repeatedly ` → `¶k=v expand `, measures **−3** rather than the −2 the
  shipped table gets. Gate 4 refuses it, because it deletes the word **"repeatedly"**. That
  is not a free saving: ΣΥΜΠΛΟΚΗ already varies this very contract between "expand" and
  "expand repeatedly" according to whether any rule references an earlier glyph, so on a
  nested tape the word is load-bearing. The candidate is **not shipped**, and the gate is
  what enforces that. (`bench/x107/preamble4.mjs`)

### What is NOT proved

That a reader still understands the contracted line. **The contract is decoded by
comprehension, not by code, so no program can prove it.** All six gates pass on a sentence no
reader understands. The residual risk is carried by the cold-read discipline and is reported,
not hidden. ΠΕΡΙΚΟΠΉ's edits are additionally checked with the repository's own decoder where
one applies: on a ΧΕΙΡΩΝ-parented lane, `chironDecode` of the incumbent and of the candidate
must be identical, so the code-decodable part of the wire is provably unchanged. That is a
real, executable check, and it is the only part of the claim that is proved.

### Offline measurement (`bench/x107/perikopi-off.mjs`)

The legend strings are known from the live dump, so the contraction is measurable without a
100-minute frontier. All three passes priced on the complete legend line with `o200k_base`:

| legend wording | before | after | Δ | via |
|---|---|---|---|---|
| ΜΕΤΡΟΝ composed (`psql-output`, `cue-sheet`) | 73 | 61 | **−12** | general + preamble |
| ΑΠΟΓΡΑΦΗ setup 1 + `above`/`col`/`+b` families | 93 | 56 | **−37** | general |
| ΑΠΟΓΡΑΦΗ setup 2 + `clock` family | 61 | 52 | **−9** | general |
| ΑΠΟΓΡΑΦΗ setup 2 + `days`/`workdays`/`+b` families | 71 | 53 | **−18** | general |
| ΔΙΑΣΤΗΜΑ (`prices.csv`) | 57 | 45 | **−12** | general |
| ΣΥΝΚΡΙΣΗ (`markdown-table`) | 24 | 22 | **−2** | general |
| `node-help` short form | 11 | 10 | **−1** | preamble |
| ΑΠΟΓΡΑΦΗ setup 3 + `combined2` | 89 | 89 | 0 | refused |

**ΠΊΝΑΞ on the same eight: −8 on the ΜΕΤΡΟΝ wording, 0 on all seven others** — the digit test
rejects them before the table is read. Total over the eight: ΠΊΝΑΞ −8, ΠΕΡΙΚΟΠΉ **−91**.

---

### 5. The live chain A/B, and its result

`bench/x107/perikopi29.ts` (v1: clause pass only) and `bench/x107/perikopi3.ts` (v3: clause +
preamble + ΔΙΑΣΤΗΜΑ/ΣΥΝΚΡΙΣΗ families), both with `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0
OMEGA_OURA_MEMO=0 OMEGA_NO_OROTHESIA=1`, both arms in one process, arms interleaved per lane,
scored on `tagstackEncode` — **the function the encoder actually ships**. Arm `off` is the
shipped chain with `OMEGA_NO_PERIKOPI=1`. Receipts: `bench/x107/receipts/perikopi.log` (v1)
and `bench/x107/receipts/perikopi3.log` (v3).

The v3 probe runs the `on` arm on every lane and the `off` arm on the first three only, as a
**determinism control**: the `off` arm is byte-identical between v1 and v3, so re-running it
on 29 lanes would double a two-hour probe for a number already in hand. The control asserts
the reproduced `off` figure equals the v1 receipt's and aborts on any mismatch.

#### v3, measured on the nine lanes that can carry a legend (receipt `perikopi3-sub.log`)

| lane | off | on | Δ | fired |
|---|---|---|---|---|
| `lsblk.txt` *(control)* | 60 | 60 | 0 | no |
| `kb-article.txt` *(control)* | 621 | 620 | **−1** | yes |
| `uptime-w.txt` *(control)* | 80 | 80 | 0 | no |
| `psql-output.txt` | 242 | 230 | **−12** | yes |
| `cue-sheet.md` | 101 | 101 | 0 | no — ΣΤΙΧΟΜΥΘΪΑ wire carries no `§` |
| `prices.csv` | 133 | 121 | **−12** | yes |
| `markdown-table.md` | 174 | 172 | **−2** | yes |
| `kubectl-get-pods.txt` | 322 | 322 | 0 | no — ΑΚΟΛΟΥΘΪΑ2 legend, no rules for it yet |
| `metrics.tsv` | 208 | 208 | 0 | no — same |
| **TOTAL (9 lanes)** | **1 941** | **1 914** | **−27** | 4 of 9 |

Exact **9 of 9**. Determinism control: the three lanes that ran BOTH arms reproduced the v1
receipt's `off` figure exactly, **0 mismatches** — which is what licenses the v3 probe to run
the `off` arm on three lanes instead of twenty-nine.

`kb-article` firing at −1 is the general result: it is a prose lane with no column model at
all, and the only thing ΠΕΡΙΚΟΠΈ does to it is drop the fixed 34-character preamble toll.
That is the lever that pays on prose.

**What did not fire, and why, stated plainly.** Three lanes carry legend families ΠΕΡΙΚΟΠΈ has
no table for — ΣΤΙΧΟΜΥΘΪΑ's column-program `spec:` line and ΑΚΟΛΟΥΘΪΑ2's `⁺ =` delta rule —
and one lane (`cue-sheet`) is parented by ΣΤΙΧΟΜΥΘΪΑ, whose wire carries no `§` marker, so the
ΧΕΙΡΩΝ-layer invariant ΠΕΡΙΚΟΠΈ is gated on is unsatisfiable there and the lane is declined
unsearched rather than edited without a check. Four of nine lanes are therefore untouched, and
that is a real limit of this codec, not a rounding.

<!-- X107-FULL -->

---

### 6. What was missed all along, and the AI-native ideas a human reader is blind to

**Missed: the encoder has been better than its own receipt for thirty turns.** The single
largest finding of this turn is not a codec. It is that the number used to decide whether a
codec was worth shipping has been measuring a different function from the one that ships, and
that the gap is larger than every codec added in the last five turns combined. The reason it
survived is structural and worth naming: `tagstackFrontier` is *documented* as the identity
without the candidates, so nothing about it looks wrong, and the arms price themselves against
it correctly — the instrument is right for its stated purpose and wrong for the purpose it was
used for. A checker pointed at the wrong object is the dominant failure mode, and it hid here
in the one place nobody had reason to doubt.

**Missed: two validated codecs were never wired in.** ΠΊΝΑΞ and ΒΡΑΧΥΛΟΓΊΑ were written, gated
and measured, and then registered as arms and forgotten. The chain never called them. A codec
that exists in a registry is not a codec that ships.

**The AI-native observation a human researcher is likely to discount.** The contract is the
only part of the wire whose price is set by *English word choice* rather than by information
content, and it is paid on every single message. Every wire-side mechanism in this stack has
been measured on the tape and the body, where the returns have been zero for five turns; the
returns on the contract were never measured at all, because the contract looked like
documentation rather than like code. It is code. It is the decode program, it is 5.8 % of the
frontier, it is 44.8 % of one lane, and it has a token price like everything else.

**The second AI-native observation, and the one that generalises.** The lever that pays on
every lane is not a clever mechanism, it is the removal of a fixed toll. `Before ¶ k=v. expand
repeatedly ` is 34 characters paid by every message that carries a ΧΕΙΡΩΝ tape, in exactly the
same words, describing exactly the same three facts. Prior work in this space optimises the
*payload*; the fixed per-message tax is invisible to every payload-side objective because it
does not scale with the payload. That is the same blind spot the ΣΥΜΠΛΟΚΗ note identified
("contract cost is a fixed tax paid by every message, so it is the one lever that pays on
prose, where every wire-side mechanism measured this turn returned exactly zero"), and this
turn is the first time it has been collected on the *emitted* wire rather than on the
contract *choice*.

---

### 7. External sources, all new this turn, none previously referenced

| source | what it supplied | how it was used |
|---|---|---|
| **arXiv:2604.13066** — *Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning* | dictionary-encoding with `<M###>` meta-tokens, where **the dictionary and the decode rules live in a SYSTEM PROMPT**, and the finding that "LLMs treat dictionary-based compression as a deterministic symbol substitution task" with no correlation between compression ratio and decompression accuracy | the closest prior art to this codec's whole design. It is the contrast case: their decoder needs an externally supplied instruction, ours carries the instruction *inside* the message. That distinction is what makes a single-chat-input decode possible at all, and it is why the contract line is load-bearing rather than optional |
| **arXiv:1908.06428** — *The smallest grammar problem revisited* | exact worst-case approximation ratios Θ((n/log n)^{2/3}) for LZ78 and Θ(√(n/log n)) for BISECTION, and a raised RePair lower bound | bounds on the grammar compressors ΧΕΙΡΩΝ is a FIFO variant of. Used as a bound, not transferred |
| **arXiv:2606.27019** — *MinGram* | "By making token count the primary objective and using a Unigram score only as a tiebreak" | the design principle ΠΕΡΙΚΟΠΉ follows: one objective (token count), ties broken by nothing, priced by the real tokenizer |
| **arXiv:2506.15138** — *Thunder-Tok* | ~25 % lower fertility than BPE by letting tokens span more than a word; "simply adding longer tokens is insufficient" | evidence that the *string* a tokenizer is handed matters as much as its vocabulary — the premise for treating the contract line as a priced string |
| **arXiv:2610.12376** — *Latent Core Tokenizer*, Algorithm 2 | a dynamic program returning "the globally minimum-token exact encoding" over a known vocabulary, and "recomputing affected counts after every non-overlapping merge makes the merge order deterministic" | the template for ΠΕΡΙΚΟΠΉ's determinism claim, and the reason the abbreviation table is total and idempotent rather than searched |

**Frontier-lab mathematics searched individually this turn** (all five labs, new terms):
OpenAI's unit-distance disproof (arXiv:2605.20695) and 722-manuscript release; DeepMind
AlphaProof Nexus (arXiv:2605.22763) and AlphaEvolve's metric-TSP result; Anthropic's FLT
result and Jacobian dimension-3 work; Axiom's 6/6 IMO 2026; FrontierMath's Erdős-problem
evaluation. None of these supplies a compression mechanism and none is claimed to; they were
searched because the brief requires it, and the honest report is that the compression-relevant
result of the turn came from the tokenizer literature, not from the mathematics releases.

---

### 8. The falsifications of X107

| hypothesis | imported result | measurement | verdict |
|---|---|---|---|
| the frontier receipt prices the encoder's output | — | `cue-sheet` 163 vs 101, `psql-output` 244 vs 232 | **falsified — it prices the identity layer; the encoder is smaller by more than any codec this turn** |
| ΠΊΝΑΞ's two rules cover the legend population | — | −8 on 1 of 8 wordings, 0 on 7 | **real defect, repaired by the general pass** |
| a digit in the line means it is not a legend | — | every ΑΠΟΓΡΑΦΗ/ΔΙΑΣΤΗΜΑ/ΣΥΝΚΡΙΣΗ legend contains digits | **falsified — the test is backwards for this population** |
| dropping "repeatedly" from the preamble is a free −1 | ΣΥΜΠΛΟΚΗ's expand/expand-repeatedly variation | −3 measured, GATE 4 refuses | **falsified — the word is load-bearing on a nested tape; candidate not shipped** |
| the preamble contraction survives on every lane in context | — | −12 on `psql-output`, Δ 0 on `cue-sheet` (ΣΤΙΧΟΜΥΘΪΑ wire has no `§`, so the ΧΕΙΡΩΝ-layer invariant is unsatisfiable) | **partly falsified — ΧΕΙΡΩΝ-parented lanes only; the ΣΤΙΧΟΜΥΘΪΑ/ΑΚΟΛΟΥΘΪΑ2 families are untouched** |
