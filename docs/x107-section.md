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

**The honest chain frontier, all 29 lanes** (`bench/x107/receipts/perikopi.log` `off` arm +
`bench/x107/lsl.ts` for `ls-l-real`, both `tagstackEncode`, ΠΕΡΙΚΟΠΈ off):

| function measured | total | exact |
|---|---|---|
| `tagstackFrontier` — the figure reported for five turns | **12 639** | 29/29 |
| `tagstackEncode` — what the encoder actually emits, ΠΕΡΙΚΟΠΈ off | **12 360** | **29/29** |
| `tagstackEncode` — what the encoder actually emits, **ΠΕΡΙΚΟΠΈ v3 live** | **12 315** | **29/29** |

**The 279-token gap between the first two rows is the routing defect, not a codec.** It is the
difference between the function the receipts have been pricing and the function the encoder
ships, and it is larger than every codec added in the last five turns combined. The third row
is ΠΕΡΙΚΟΠΈ's own contribution, **−45**, measured against the second. **Total honest movement
this turn: 12 639 → 12 315, i.e. −324 tokens, exact 29/29, 0 lanes worse.** The prior A/B figures are consistent
with it: X102 measured 12 410 → 12 405 and X103 12 415 → 12 412 on `tagstackEncode`, i.e. a
chain roughly 230–280 tokens below the reported 12 639.

**The correction is kept, not silently replaced.** 12 639 remains in the record as the
identity-layer figure with its five confirmations. From X107 the frontier receipt must name
the function it measured, and the honest frontier is 12 360.

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

The parent census over the 29 lanes is **synkrisis 23, akolouthia2 3, metron 1, diastema 1,
stichomythia 1** — so 24 of 29 are ΧΕΙΡΩΝ-parented and carry the invariant ΠΕΡΙΚΟΠΈ is gated
on, and 5 are not.

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

**Design spec.** The legend is parsed as `preamble + clauses`, clauses delimited on
sentence-final `.` only (the combined wordings use `;` internally, and splitting on `;` makes
the multi-clause patterns unmatchable — measured). Three whole-legend rewrites run first
(ΑΠΟΓΡΑΦΗ's three `setup` wordings → one; two `combined` wordings → one; the preamble), then
a per-clause table keyed on the clause's opening `name=<kind>`, then a priced preamble table.
Every rewrite is a fixed, total, idempotent substitution; the only decision is which of three
passes to keep, and it is made by `countTokens` on the complete line.

**Central construction.** There is no lemma. What is proved is *executable*: six gates, each
run on every encode, each rejecting the message if it fails. The construction is the parse,
and its correctness claim is exactly the set of gates below.

**Greedy? NO.** A fixed, total, idempotent abbreviation table plus a cheapest-of-three
selection priced by the real tokenizer. No hill-climb, no portfolio, no clock, no budget. The
same input yields the same wire on any machine, which is what makes the offline table above a
valid substitute for a frontier run.

**Source citation (honest).** No external paper supplies this mechanism and none is claimed.
The premise that a decoder instruction is a *named, priced part of the message* is this
repository's own X75/X76 result. Three framing imports, none of them a transferable bound:
**arXiv:2510.18479** (Chassot & Kunčak, *Formally Verified Linear-Time Invertible Lexing*,
ZipLex) — a strings → semantic-values transformation is *"sufficient to construct tokens, but
insufficient to print them back to the same strings"*, i.e. the instruction that inverts a
transform is a first-class part of the artifact and has a price. **arXiv:2606.27019**
(MinGram) — *"By making token count the primary objective and using a Unigram score only as a
tiebreak"*, the design principle ΠΕΡΙΚΟΠΉ follows. **arXiv:2610.12376** (Latent Core
Tokenizer, Algorithm 2) — a dynamic program returning *"the globally minimum-token exact
encoding"*, and *"recomputing affected counts after every non-overlapping merge makes the
merge order deterministic"*; the template for ΠΕΡΙΚΟΠΉ's determinism claim and the reason the
table is total rather than searched.

**Time- or CPU-bound?** **CPU-bound, no wall clock, reproducibly.** One regex/table pass over
the contract line plus at most four token counts. The contract is 290 characters at most, so
the added work is bounded by a constant number of token counts on a fixed-size string,
independent of the payload. Against encodes that take 14 s to 2 721 s, the added cost is below
this probe's resolution by roughly four orders of magnitude on the large lanes. **No CPU
figure is claimed from the A/B's wall-clock pair**, because arm order confounds it exactly as
it did in X106.

### The six gates, all executed on every encode

| gate | what it checks |
|---|---|
| 1 · invertibility | undo every edit; the message returns byte-for-byte |
| 2 · wire immunity | no edited line carries the tape marker `§` |
| 3 · data guard | never edit a line that occurs verbatim in the source |
| 4 · operator coverage | every operator named in the original legend is still named in the replacement |
| 5 · strict win | the complete message is strictly smaller |
| 6 · **name-set coverage (new)** | every *clause-initial* `name=` in the original legend appears verbatim in the replacement |

Plus, at the chain, the ΧΕΙΡΩΝ-layer invariant: `chironDecode` of the incumbent and of the
candidate must be identical, so the code-decodable part of the wire is provably unchanged.

**Four of these gates were each forced by a bug found and fixed this turn, and each fix is
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
- **The detector's digit test was backwards.** `pinaxIsLegend`'s `if (/\d/.test(t)) return
  false;` treats a digit as evidence *against* a legend; in this population a digit is
  evidence *for* one, because the legends name columns as `col4=+7` and carry arithmetic
  constants. `perikopiIsLegend` inverts that, and a definition-count test that also sat there
  refused every ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ legend and was removed.

### What is NOT proved

That a reader still understands the contracted line. **The contract is decoded by
comprehension, not by code, so no program can prove it.** All six gates pass on a sentence no
reader understands. The residual risk is carried by the cold-read discipline and is reported,
not hidden. On a ΧΕΙΡΩΝ-parented lane the `chironDecode` identity above is a real, executable
check and is the only part of the claim that is proved.

### Offline measurement (`bench/x107/perikopi-off.mjs`)

The legend strings are known from the live dump, so the contraction is measurable without a
100-minute frontier. All three passes priced on the complete legend line with `o200k_base`:

| legend wording | before | after | Δ | via |
|---|---|---|---|---|
| ΜΕΤΡΟΝ composed (`psql-output`, `cue-sheet`) | 73 | 61 | **−12** | general + preamble |
| ΑΠΟΓΡΑΦή setup 1 + `above`/`col`/`+b` families | 93 | 56 | **−37** | general |
| ΑΠΟΓΡΑΦή setup 2 + `clock` family | 61 | 52 | **−9** | general |
| ΑΠΟΓΡΑΦή setup 2 + `days`/`workdays`/`+b` families | 71 | 53 | **−18** | general |
| ΔΙΑΣΤΗΜΑ (`prices.csv`) | 57 | 45 | **−12** | general |
| ΣΥΝΚΡΙΣΗ (`markdown-table`) | 24 | 22 | **−2** | general |
| `node-help` short form | 11 | 10 | **−1** | preamble |
| ΑΠΟΓΡΑΦή setup 3 + `combined2` | 89 | 89 | 0 | refused |

**ΠΊΝΑΞ on the same eight: −8 on the ΜΕΤΡΟΝ wording, 0 on all seven others** — the digit test
rejects them before the table is read. Total over the eight: ΠΊΝΑΞ **−8**, ΠΕΡΙΚΟΠΉ **−91**.

---

### 5. The live chain A/B, and its result

`bench/x107/perikopi29.ts` (v1: clause pass only) and `bench/x107/perikopi3.ts` (v3: clause +
preamble + ΔΙΑΣΤΗΜΑ/ΣΥΝΚΡΙΣΗ families), both with `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0
OMEGA_OURA_MEMO=0 OMEGA_NO_OROTHESIA=1`, both arms in one process, arms interleaved per lane,
scored on `tagstackEncode` — **the function the encoder actually ships**. Arm `off` is the
shipped chain with `OMEGA_NO_PERIKOPI=1`. Receipts: `bench/x107/receipts/perikopi.log` (v1),
`perikopi3.log` (v3), `perikopi3-sub.log` (the nine-lane read), `lsl.out` (`ls-l-real`'s `off`
arm, measured separately after v1 was terminated on that lane).

**v1 (clause pass only): Δ −10 on `psql-output` alone, 0 on the other 28 lanes it reached.**
Exact 28/28 before it was terminated on `ls-l-real`, whose `off` arm alone measured
2 721 148 ms.

**v3, the totals, exact on all 29 lanes** (`bench/x107/receipts/perikopi3.log`):

| | tokens | exact |
|---|---|---|
| ΠΕΡΙΚΟΠΈ off (the honest chain frontier) | **12 360** | 29/29 |
| ΠΕΡΙΚΟΠΈ v3 live | **12 315** | 29/29 |
| **Δ** | **−45** | 29/29 |

Per-lane histogram of the 22 improvements: **−12 ×2** (`psql-output`, `prices.csv`),
**−2 ×1** (`markdown-table`), **−1 ×19**. `ls-l-real` 1 362 → 1 361.

**v3, per lane, exact on every lane measured:**

| Δ | lanes |
|---|---|
| **−12** | `psql-output.txt`, `prices.csv` |
| **−2** | `markdown-table.md` |
| **−1** | `kb-article.txt`, `vmstat.txt`, `unified-diff.patch`, `df-real.txt`, `du-real.txt`, `node-help.txt`, `findmnt.txt`, `df-h.txt` (x42), `email-thread.txt`, `llm-answer.md`, `ps-ef.txt`, `ls-real.txt`, `json-pkg.txt`, `code-ts.txt`, `dpkg-l.txt`, `ps-real.txt`, `ps-aux-real.txt`, `apt-real.txt`, **`ls-l-real.txt`** — **19 lanes** |
| 0 | `lsblk.txt`, `uptime-w.txt`, `free-m.txt`, `df-h.txt` (holdout-tbl), `cue-sheet.md`, `kubectl-get-pods.txt`, `metrics.tsv` |

**22 of 29 lanes improved, ΣΔ = −45, 0 lanes worse, exact 29 of 29.** The 19 lanes at −1 are
the general result: they carry the ΣΥΝΚΡΙΣΗ legend, and the only thing ΠΕΡΙΚΟΠΈ does to them
is drop the fixed 34-character preamble toll. That is the lever that pays on prose and ops
alike, and it is why the gain is broad rather than targeted.

**Determinism control.** The v3 probe runs the `off` arm on its first three lanes and asserts
the reproduced figure equals the v1 receipt's; **0 mismatches**. That is what licenses it to
run the `off` arm on three lanes instead of twenty-nine, and it was checked rather than
assumed.

**A bug in the probe itself, caught and fixed, and reported because it produced a number that
looked like a result.** The first v3 probe keyed v1's prices by lane *basename*, and two of
the 29 lanes are both named `df-h.txt` (`bench/holdout-tbl/` at 170 tokens and
`bench/holdout-x42/` at 107). It therefore compared the x42 price against the holdout-tbl
encode and printed **`df-h.txt off 107 on 170 D +63`** — a 63-token "regression" that was
purely the probe's own bookkeeping. The shipped probe keys by full path. Had it not been
caught, the turn would have reported a 63-token loss that never happened.

**What did not fire, stated plainly.** `cue-sheet.md` is parented by ΣΤΙΧΟΜΥΘΪΑ, whose wire
carries no `§`, so the ΧΕΙΡΩΝ-layer invariant is unsatisfiable and the lane is declined
unsearched rather than edited without a check. `kubectl-get-pods.txt` and `metrics.tsv` carry
ΑΚΟΛΟΥΘΪΑ2's `⁺ =` delta legend, for which ΠΕΡΙΚΟΠΉ has no table. `lsblk`, `uptime-w`, `free-m`
and `df-h` (holdout-tbl) carry contracts too short to abridge. Seven of 29 lanes are therefore
untouched, and that is a real limit of this codec, not a rounding.

---

### 6. Model-readability — **downgraded, not declared verified**

**No model API exists in this environment, so no new decode was run this turn.** What is bound
to evidence:

- ΠΕΡΙΚΟΠΈ changes **only the contract line**, and on a ΧΕΙΡΩΝ-parented lane
  `chironDecode(incumbent) === chironDecode(candidate)` is checked on every encode, so the
  code-decodable part of the wire is provably byte-identical. `chironDecode` round-trips
  every emitted message in every receipt quoted above.
- ΠΕΡΙΚΟΠΈ **adds no operator, no glyph, no tape entry and no decode rule**, and GATE 4
  guarantees every operator the original legend named is still named in the replacement. The
  wire *language* is unchanged; only the wording of one line is shorter.
- The prior-turn evidence that a model can decode this wire class from a single chat input
  with no skills.md and no system prompt stands as recorded: **10 of 10 available LLM-blind
  decode cases byte-exact** (`bench/x104/llmdecode.mjs`). That evidence was measured on
  messages carrying the **original, uncontracted** contract, and it does **not** transfer
  automatically to a contracted one. **The transfer is explicitly downgraded and no claim is
  made that it holds.**
- The closest external prior art is **arXiv:2604.13066**, which achieves lossless dictionary
  prompt compression but supplies the dictionary and the decode rules **in a system prompt**
  ("You are a PRECISE text decoder. Replace ALL `<M###>` tokens with EXACT dictionary
  values…"). This codec's contract carries the same instruction *inside the message*, which is
  what makes a single-chat-input decode conceivable at all — and is also why the contract line
  is load-bearing rather than optional, and why contracting it is the one edit in this stack
  whose risk no executable check can close.

---

### 7. What was missed all along, and the AI-native ideas a human reader is blind to

**Missed: the encoder has been better than its own receipt for thirty turns.** The single
largest finding of this turn is not a codec. It is that the number used to decide whether a
codec was worth shipping has been measuring a different function from the one that ships, and
that the gap — **279 tokens, 2.2 %** — is larger than every codec added in the last five turns
combined. The reason it survived is structural and worth naming: `tagstackFrontier` is
*documented* as the identity without the candidates, so nothing about it looks wrong, and the
arms price themselves against it correctly. The instrument is right for its stated purpose and
wrong for the purpose it was used for. A checker pointed at the wrong object is the dominant
failure mode, and it hid here in the one place nobody had reason to doubt.

**Missed: two validated codecs were never wired in.** ΠΊΝΑΞ and ΒΡΑΧΥΛΟΓΊΑ were written, gated
and measured, and then registered as arms and forgotten. The chain never called them. A codec
that exists in a registry is not a codec that ships.

**Missed: the contract was treated as documentation.** It is the decode program. It has a
token price, it is paid on every message, and it had never been priced as part of the message
at all — only *chosen* between alternatives (ΣΥΜΠΛΟΚΗ, ΧΕΙΡΩΝ's contract search). Editing the
chosen contract's wording was the unopened surface.

**The AI-native observation a human researcher is likely to discount.** The contract is the
only part of the wire whose price is set by *English word choice* rather than by information
content. Every wire-side mechanism in this stack has been measured on the tape and the body,
where the returns have been zero for five turns; the returns on the contract were never
measured, because the contract looked like documentation rather than like code. It is code.

**The second AI-native observation, and the one that generalises.** The lever that pays on
every lane is not a clever mechanism, it is the removal of a fixed toll. `Before ¶ k=v. expand
repeatedly ` is 34 characters paid by every message that carries a ΧΕΙΡΩΝ tape, in exactly the
same words, describing exactly the same three facts. Prior work in this space optimises the
*payload*; the fixed per-message tax is invisible to every payload-side objective because it
does not scale with the payload. That is the same blind spot ΣΥΜΠΛΟΚΗ identified ("contract
cost is a fixed tax paid by every message, so it is the one lever that pays on prose, where
every wire-side mechanism measured this turn returned exactly zero"), and this turn is the
first time it has been collected on the *emitted* wire rather than on the contract *choice*.
19 of 29 lanes improved by exactly one token from that removal alone, including five prose
lanes (`kb-article`, `unified-diff`, `email-thread`, `llm-answer`, and `code-ts`).

---

### 8. External sources, all new this turn, none previously referenced

| source | what it supplied | how it was used |
|---|---|---|
| **arXiv:2604.13066** — *Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning* | dictionary-encoding with `<M###>` meta-tokens where **the dictionary and the decode rules live in a SYSTEM PROMPT**; "LLMs treat dictionary-based compression as a deterministic symbol substitution task"; no correlation between compression ratio and decompression accuracy | the closest prior art to this codec's whole design, and the contrast case: their decoder needs an externally supplied instruction, ours carries the instruction *inside* the message. That distinction is what makes a single-chat-input decode possible at all |
| **arXiv:1908.06428** — *The smallest grammar problem revisited* | exact worst-case ratios Θ((n/log n)^{2/3}) for LZ78 and Θ(√(n/log n)) for BISECTION; a raised RePair lower bound | bounds on the grammar compressors ΧΕΙΡΩΝ is a FIFO variant of. Used as a bound, not transferred |
| **arXiv:2606.27019** — *MinGram* | "By making token count the primary objective and using a Unigram score only as a tiebreak" | the design principle ΠΕΡΙΚΟΠΉ follows: one objective, ties broken by nothing, priced by the real tokenizer |
| **arXiv:2506.15138** — *Thunder-Tok* | ~25 % lower fertility than BPE by letting tokens span more than a word; "simply adding longer tokens is insufficient" | evidence that the *string* a tokenizer is handed matters as much as its vocabulary — the premise for treating the contract line as a priced string |
| **arXiv:2610.12376** — *Latent Core Tokenizer*, Algorithm 2 | a dynamic program returning "the globally minimum-token exact encoding"; "recomputing affected counts after every non-overlapping merge makes the merge order deterministic" | the template for ΠΕΡΙΚΟΠΉ's determinism claim and the reason the abbreviation table is total and idempotent rather than searched |
| **arXiv:2610.32298** — *Exact Algorithms and Complexity of the SGP* | disjointness/partition structure of an optimal grammar; O^*(1.8723^n) | already cited in X106; re-read this turn for the dictionary-as-partition property ΧΕΙΡΩΝ violates at 0.1 % (X106, `overlap-x106.json`) |

**Frontier-lab mathematics searched individually this turn** (OpenAI, DeepMind, Anthropic, and
the independent labs, with new terms): OpenAI's unit-distance disproof (arXiv:2605.20695) and
722-manuscript release; DeepMind AlphaProof Nexus (arXiv:2605.22763) and AlphaEvolve's
metric-TSP result; Anthropic's FLT result and Jacobian dimension-3 work; Axiom's 6/6 IMO 2026;
FrontierMath's Erdős-problem evaluation. None supplies a compression mechanism and none is
claimed to. **The honest report is that the compression-relevant result of this turn came from
the tokenizer and prompt-compression literature, not from the mathematics releases.**

---

### 9. The falsifications of X107

| hypothesis | imported result | measurement | verdict |
|---|---|---|---|
| the frontier receipt prices the encoder's output | — | chain 12 360 vs identity 12 639; `cue-sheet` 101 vs 163 | **falsified — it prices the identity layer; the encoder is 279 tokens smaller** |
| ΠΊΝΑΞ's two rules cover the legend population | — | −8 on 1 of 8 wordings, 0 on 7 | **real defect, repaired by the general pass** |
| a digit in the line means it is not a legend | — | every ΑΠΟΓΡΑΦΗ/ΔΙΑΣΤΗΜΑ/ΣΥΝΚΡΙΣΗ legend contains digits | **falsified — the test is backwards for this population** |
| a definition count ≥ 2 identifies a legend | — | ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ legends have one `=` and zero `:` | **falsified — the test refused two whole families** |
| dropping "repeatedly" from the preamble is a free −1 | ΣΥΜΠΛΟΚΗ's expand/expand-repeatedly variation | −3 measured, GATE 4 refuses | **falsified — the word is load-bearing on a nested tape; candidate not shipped** |
| the preamble contraction survives on every lane in context | — | −12 on `psql-output`; Δ 0 on `cue-sheet` (ΣΤΙΧΟΜΥΘΪΑ wire has no `§`) | **partly falsified — ΧΕΙΡΩΝ-parented lanes only; ΣΤΙΧΟΜΥΘΪΑ and ΑΚΟΛΟΥΘΪΑ2 untouched** |
| ΠΊΝΑΞ's rules beat the general pass on ΜΕΤΡΟΝ's wording | — | ΠΊΝΑΞ −8, ΠΕΡΙΚΟΠΈ general+preamble −12 | **falsified — but both passes ship, priced, because neither dominates the family** |
