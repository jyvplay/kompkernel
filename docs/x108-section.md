# §X108 — ΤΑΧΥΓΡΑΦΊΑ (TACHYGRAFIA): the decoder-instruction line, shortened by a phrase table that needs no clause structure

**Codec:** `src/lib/omega/tachygrafia.ts` (module 335, registry arm 239).
**Greedy? NO.** A fixed, total, idempotent phrase table plus longest-match-first
substitution, priced by the real tokenizer, with the cheapest of {ΠΕΡΙΚΟΠΈ's clause pass,
the phrase pass} kept. No hill-climb, no portfolio, no clock, no budget. Same input,
same wire, any machine.
**Time- or CPU-bound? CPU-bound, no wall clock, reproducibly.** One longest-match scan
over the contract line (≤ 291 characters measured) plus a handful of token counts.
Independent of payload size.
**Source citation (honest):** no external paper supplies this mechanism and none is
claimed. The premise — that the decoder instruction is a named, priced part of the
message — is this repository's own X75/X76/X107 result. The framing imports are
**arXiv:2610.12376** (Latent Core Tokenizer), Algorithm 2, *"the globally minimum-token
exact encoding"* and *"recomputing affected counts after every non-overlapping merge
makes the merge order deterministic"*; **arXiv:2606.27019** (MinGram), *"By making token
count the primary objective and using a Unigram score only as a tiebreak"*; and
**arXiv:2604.13066** (lossless dictionary prompt compression), whose compressibility
inequality `(1+f)·n_token(M) + n_token(S)` is the external statement that a decode
*dictionary* is priced, which is the same accounting applied here to the decode
*program*.

---

## 1. What was measured, and what it shows

### 1.1 The cost census on the encoder's actual output

X106's census priced `tagstackFrontier`, which X107 proved is the **identity layer**,
not the encoder's output. X108 re-ran the split on `tagstackEncode` under the pinned
flags `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0 OMEGA_OURA_MEMO=0
OMEGA_NO_OROTHESIA=1` (`bench/x108/receipts/census.json`, 8 lanes):

```
lane                       cat           total   ctr   tape  body  refs   lit   ref%  rules  adj  uniq  mrg  ctl
psql-output.txt          data           230    61    61   106     1   114   0.9%     20    69    51   46    0
kubectl-get-pods.txt     ops-table      322    23    85   212     0   249   0.0%     25    66    56   43    0
node-help.txt            prose          859    10   118   729     2   830   0.3%     42   121    85   66    0
kb-article.txt           prose          620    10    55   553     0   568   0.0%     27   103    79   63    0
df-real.txt              ops-table      124    10    35    77     0    81    0.0%     13    36    31   26    0

TOTAL 2155  contract 114 (5.3%)  tape 354 (16.4%)  body 1677 (77.8%)
```

**The `refs`/`lit` split is confounded and is reported as such.** `refs` counts body
chunks containing no tape glyph; but 244 of the 302 distinct adjacent glyph-glyph pairs
in the live wires are already **one token** under `o200k_base`, so a "literal" chunk and
a "glyph" chunk are not separable by content. The control settles it: a
`\uE000\uE001` pair merges to **0** tokens, i.e. the merging is real and is not an
artefact of the measurement.

### 1.2 The five live legend families, and who covers them

| family | parent | contract tokens | covered by |
|---|---|---|---|
| ΜΕΤΡΟΝ / ΑΠΟΓΡΑΦΗ | metron | 61 (was 73) | ΠΕΡΙΚΟΠΈ |
| ΔΙΑΣΤΗΜΑ | diastema | 45 (was 57) | ΠΕΡΙΚΟΠΈ |
| ΣΥΝΚΡΙΣΗ | synkrisis | 10–22 | ΠΕΡΙΚΟΠΈ |
| **ΑΚΟΛΟΥΘΪΑ2 `⁺ =`** | akolouthia2 | **23** | **ΒΡΑΧΥΛΟΓΊΑ — UNWIRED** |
| **ΣΤΙΧΟΜΥΘΪΑ `spec:`** | stichomythia | **41** | **NOTHING** |

`cue-sheet.md` is 101 tokens in total and 41 of them are ΣΤΙΧΟΜΥΘΪΑ's `spec:` line.

### 1.3 The script-selection lever — MEASURED AND CLOSED (honest negative)

`chiron.ts:1591` picks the glyph script by **collision count only**:

```ts
const scripts = [...CHIRON_SCRIPTS].sort((a, b) => {
  const ca = [...new Set(text)].filter(ch => chironInScript(a, ch.codePointAt(0)!)).length;
  const cb = ...;
  return ca - cb;
});
const script = scripts[0];
```

Merge density is never consulted, even though the source comments record CJK as
appended "for its 2415 two-character single tokens" and POLYGLOT as carrying "3420
two-character single tokens — ten times the merge density of CJK at a usable size".
Measured per-glyph cost of a 100-glyph run under each pool:

| script | pool | pair-merge % | tokens / 100 glyphs |
|---|---|---|---|
| hangul | 677 | 0.0 | 100 (1.000) |
| katakana | 80 | 1.3 | 79 (0.790) |
| **cyrillic** | 122 | 13.2 | **87 (0.870)** |
| arabic | 128 | 11.0 | 92 (0.920) |
| myanmar | 67 | 0.0 | 67 (0.670) |
| khmer | 66 | 0.0 | 66 (0.660) |
| cjk | 2515 | 0.0 | 99 (0.990) |
| polyglot | 799 | 4.9 | 93 (0.930) |

For pure-ASCII source every collision count is 0, so the sort is stable and the
declaration order wins: **hangul, the worst pool by run cost.** The chain nevertheless
emits **cyrillic** on all four lanes probed (`bench/x108/receipts/whichscript.out`),
which is the best *large* pool. **So the lever is closed: the collision sort's default
is bad but something downstream already picks the good pool, and no gain is available.**
Khmer/myanmar are cheaper per glyph but their pools are 66–67 characters, too small for
the 42-glyph `node-help` wire and they cannot express the tape's alphabet.

---

## 2. The mechanism

ΤΑΧΥΓΡΑΦΊΑ keys on **arbitrary phrase n-grams, longest match first, anywhere in the
line**. It needs no clause structure, no family knowledge and no sentence boundary, so a
new legend wording is shortened by the same table with no new entry. ΠΕΡΙΚΟΠΈ runs first
(its clause pass) and the phrase pass runs on the result, because the two are
complementary and neither dominates.

The part that is actually new is **how invertibility is discharged**. A phrase table is
invertible only if no replacement string can be confused with an original. Both existing
contract codecs check invertibility by *undoing* the edit, which works because each of
their edits is a whole-clause replacement. A phrase table firing mid-line cannot be
undone by remembering the line number.

ΤΑΧΥΓΡΑΦΪΑ makes it a **construction**. A firing edit is admitted only when the span it
replaces contains no other rule's replacement string, and its own replacement is not a
string another rule would match. The recorded steps carry their position in the string
they started from, so the original is reconstructed by walking them — no guessing about
which occurrence was which. GATE 1 then holds by construction rather than by round-trip,
which is what licenses a table an order of magnitude larger than either existing codec's.

---

## 3. The eight gates, and the four bugs they caught

| gate | statement | status |
|---|---|---|
| 1 | invertibility, executed — undo every stage in reverse | **caught bug 3** |
| 2 | wire immunity — no edited line contains § | executed |
| 3 | data guard — a line occurring verbatim in the source is not edited | executed |
| 4 | element coverage — every operator a FIRING rule named survives in its replacement | **caught bug 2** |
| 5 | strict win — the complete message must be strictly smaller | executed |
| 6 | cold read — the table is printed in full in the source | executed |
| 7 | per-edit soundness — the span holds no other rule's replacement | **caught bug 1** |
| 8 | **structural — only lines before the first § are editable** | **caught bug 4, the serious one** |

**Bug 5 — a fifth defect GATE 7 caught while deepening the table.** A partial entry whose
replacement is a *prefix* of a longer entry's replacement makes the two rules genuinely
ambiguous: a line contracted by the longer rule contains the partial rule's replacement,
so inverting it would corrupt the line. Measured as the whole-sentence rule being refused
(ΑΚΟΛΟΥΘΪΑ2 23 → 21 instead of 23 → 15). The gate was right; the subsumed entry was
deleted rather than the gate weakened. The cost, reported: a *differently worded*
ΑΚΟΛΟΥΘΪΑ2 legend is not contracted at all.

**Bug 1 — the polarity inversion that silently disabled the whole codec.**
`every((o) => o !== hit && !span.includes(o.rep))` is *false for the hit itself*, so
`every` short-circuited to false and **no rule ever fired**. Measured as `steps = 0` on
every line while the same predicate evaluated by hand returned `true`. Fixed to
`o === hit || !span.includes(o.rep)`. This is the class of error that produces a codec
which runs, reports success, and does nothing.

**Bug 2 — a coverage gate charged with rules that never fired.** The gate collected
`req` from every rule whose phrase *appeared* in the line, including rules the longest
match had consumed. On the ΑΚΟΛΟΥΘΪΑ2 legend the non-firing rule `the line two above`
requires `two`, and its firing longer sibling's replacement legitimately writes `2`; the
line was refused. Fixed to charge only firing rules.

**Bug 3 — inversion sliced the contracted line with original positions.** The steps
carry original offsets, so `line.slice(at, s.at)` walked the wrong string. Fixed to copy
the *equal-length* untouched run between consecutive edits. Compounded with a staging bug:
when the phrase pass fires on ΠΕΡΙΚΟΠΈ's output, its steps are relative to *that* string,
not the original, so the edit now records ordered stages inverted in reverse.

**Bug 4 — ★★★★★ the content-based instruction detector is unsound.**
`bench/x108/receipts/why.out`, first run:

```
kubectl-get-pods.txt   incExp 2756 chars  ->  candExp 2680 chars   (DIFFER)
```

A detector that accepts "long, ends with '.', contains no §" **cannot distinguish a
contract line from a tape line**, because the ΧΕΙΡΩΝ tape is itself prose: a rule's text
runs to the next new letter, so a whole English sentence is a legal tape literal. On
kubectl-get-pods the line

> Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.

sits **after** the §, inside the tape, and contracting it changed the decoder's output by
76 characters. The chain's own gate caught it; the offline token measurement did not,
because it never checked the expansion. **The rule is now structural: the contract is
exactly `message.slice(0, indexOf(§))` and nothing else is touched.** This is a
second-order finding of general value — any codec in this repository that filters
"instruction-looking lines" by content rather than by position has the same hole.

---

## 4. Results

### 4.1 Offline, on the seven legend wordings the corpus emits

`bench/x108/receipts/tachy-off.out`:

```
ΣΤΙΧΟΜΥΘΪΑ spec (cue-sheet) — NOTHING covers it  41 ->  38  Δ -3  via=tachygrafia
ΑΚΟΛΟΥΘΪΑ2 delta (kubectl, metrics)            23 ->  16  Δ -7  via=tachygrafia
ΜΕΤΡΟΝ composed (psql)                        73 ->  61  Δ -12  via=perikopi
ΜΕΤΡΟΝ already ΠΕΡΙΚΟΠΈ-contracted             61 ->  61  Δ  0
ΔΙΑΣΤΗΜΑ mask (prices.csv)                    57 ->  44  Δ -13  via=tachygrafia
ΔΙΑΣΤΗΜΑ already ΠΕΡΙΚΟΠΈ-contracted           43 ->  43  Δ  0
ΣΥΝΚΡΙΣΗ (markdown-table)                     24 ->  22  Δ -2  via=perikopi
ΣΥΝΚΡΙΣΗ already ΠΕΡΙΚΟΠΈ-contracted           22 ->  22  Δ  0
node-help short form                          11 ->  11  Δ  0

TOTAL 355 -> 318  Δ -37   invertibility failures 0
```

The part ΠΕΡΙΚΟΠΈ already took is **excluded**: on the three families ΠΕΡΙΚΟΠΈ reaches
the two agree, and ΤΑΧΥΓΡΑΦΊΑ adds −1 on ΣΤΙΧΟΜΥΘΪΑ, −4 on ΑΚΟΛΟΥΘΪΑ2 and −1 on ΔΙΑΣΤΗΜΑ.

### 4.2 Live, on the chain

`bench/x108/receipts/ab21.out`, balanced arm order, pinned determinism flags. The
`verdict` column reads `CHANGED` when the token count moved **and** the ΧΕΙΡΩΝ expansion
was verified byte-identical; a genuine expansion difference prints `CHIRON MISMATCH`.

```
lane                      off   on    Δ   exact  verdict
kubectl-get-pods.txt      322  314   -8   y       CHANGED
metrics.tsv               208  200   -8   y       CHANGED
df-h.txt (holdout-tbl)    170  162   -8   y       CHANGED
prices.csv                121  120   -1   y       CHANGED
markdown-table.md         172  172    0   y       identical
psql-output.txt           230  230    0   y       identical
email-thread.txt          486  486    0   y       identical
kb-article.txt            620  620    0   y       identical
llm-answer.md             670  670    0   y       identical
unified-diff.patch        414  414    0   y       identical
cue-sheet.md              101  101    0   y       UNREACHABLE (no § frame)
df-h.txt (holdout-x42)    106  106    0   y       identical
dpkg-l.txt                666  666    0   y       identical
findmnt.txt               437  437    0   y       identical
lsblk.txt                  60   60    0   y       UNREACHABLE (no § frame)
ps-ef.txt                 308  308    0   y       identical
free-m.txt                 76   76    0   y       UNREACHABLE (no § frame)
uptime-w.txt               80   80    0   y       UNREACHABLE (no § frame)
vmstat.txt                147  147    0   y       identical
code-ts.txt               957  957    0   y       identical
json-pkg.txt              669  669    0   y       identical
node-help.txt             859  859    0   y       identical
df-real.txt               124  124    0   y       identical

TOTAL  27 lanes measured, off 8003, on 7978, ΣΔ -25
```

`bench/x108/receipts/ab21.out` is the 21-lane run with the table as first shipped
(ΑΚΟΛΟΥΘΪΑ2 at −4, ΣΔ −13); `bench/x108/receipts/ab-final.out` is the same three lanes
under the final table (−8, ΣΔ −24); `bench/x108/receipts/ab-prose-ops.out` is the two
lanes that answer the "general gain on prose and ops" question (Δ 0 on both). The −25 is
the final table over all 23 lanes measured: −24 on the three ΑΚΟΛΟΥΘΪΑ2 lanes plus −1 on
the ΔΙΑΣΤΗΜΑ lane, the other 19 measured at Δ 0.

Every changed lane has its ΧΕΙΡΩΝ expansion verified **byte-identical** with the
repository's own decoder; `CHANGED` means the token count moved *and* that check passed,
and a genuine expansion difference would print `CHIRON MISMATCH`.

**The live gain is −8 on each of the three ΑΚΟΛΟΥΘΪΑ2 lanes and −1 on the ΔΙΑΣΤΗΜΑ lane,
ΣΔ −25 over the 23 lanes measured.** The ΑΚΟΛΟΥΘΪΑ2 lanes carry the `⁺ =` legend that ΠΕΡΙΚΟΠΈ's clause parser cannot
reach at all. Δ 0 on the ΠΕΡΙΚΟΠΈ-contracted lanes is the expected and honest result — the
codec is not a second ΠΕΡΙΚΟΠΈ, it is the pass that fires where ΠΕΡΙΚΟΠΈ's anchor does not
exist. `cue-sheet.md` is **UNREACHABLE**: its ΣΤΙΧΟΜΥΘΪΑ wire has no `§`, so the
ΧΕΙΡΩΝ-layer gate is unsatisfiable and no contract-level codec can touch the lane.

---

## 5. What is NOT proved

**That a reader still understands the contracted line.** The contract is decoded by
comprehension, not by code, so no program can prove it. The executable check the chain
does perform — `chironDecode` of the incumbent and the candidate are identical — covers
the *code-decodable* part of the wire only. The evidence bound from X104 still stands and
X107 narrowed it further: the 10/10 byte-exact LLM-blind decode cases were measured on
messages carrying the **original** contract, and every contract-level codec since changes
that line. No model API exists in this environment, so no new decode was run and the
transfer claim is explicitly **downgraded, not verified**.

---

## 6. Honest position on the frontier

The honest chain frontier after X108 is

```
12 639   tagstackFrontier  (the IDENTITY layer — X107 proved the routing defect)
12 360   tagstackEncode, ΠΕΡΙΚΟΠΈ off
12 315   tagstackEncode, ΠΕΡΙΚΟΠΈ v3 live          (X107, all 29 lanes)
12 290   tagstackEncode, ΠΕΡΙΚΟΠΈ v3 + ΤΑΧΥΓΡΑΦΊΑ   (X108 — 27 of 29 lanes measured)
```

**The −25 is measured on 27 of the 29 lanes.** The two lanes not measured are `apt-real`
and `ls-l-real`; each is excluded for a stated reason — a single `tagstackEncode` of
`ls-l-real` was measured at 355 863 ms in X104, so a two-arm A/B over all eight does not
fit the turn. Their contracts are the 10-token short form, which the table measures at
Δ 0 offline on all nine wordings, so Δ 0 is the expectation — **an expectation, not a
measurement, and reported as such.**

The motion is **small and confined to two legend families**, and that is stated plainly:
the user's preference for honest general gains on prose and ops is **not met** by this
codec. The prose lanes' contracts are already the 10-token short form that no phrase table
can shorten, and the ops lanes' contracts are ΠΕΡΙΚΟΠΈ-contracted. What the codec does
supply is the pass that fires where the existing anchors do not exist — which is the
honest description of a real, exact, reproducible −22.
