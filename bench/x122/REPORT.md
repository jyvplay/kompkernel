# X122 — ΣΤΟΙΧΗΔΟΝ: the two free relabellings of a delimiter-free tape

Date: 2026-11-16. Branch `arena/a210f58d-kompkernel`, base `3433f2db` (X121 merged).
Module: `src/lib/omega/stoichedon.ts`. Wired: `src/lib/omega/tagstack.ts`, after
ΒΕΛΤΙΣΤΟΣ, before ΔΙΓΛΩΣΣΙΑ. Toggle `OMEGA_NO_STOICHEDON=1`.

Receipts in this directory:

| file | what it is |
|---|---|
| `anatomy.ts` | where the shipped tokens go (contract / tape / body, glyph vs literal) |
| `tape-anatomy.ts` | tape efficiency; the interleaved `g v g v…` form vs its parts |
| `tape2.ts` | tape decomposition: glyph-reference chars vs literal chars, priced separately |
| `tokclass.ts` | per-o200k-token class census of every shipped body |
| `runs.ts` | the body as atoms: reference run lengths, how literal spans begin and end |
| `sep.ts` | **the frame split**, `tokens(§tape¶body) = tokens(§tape¶) + tokens(body)`, 19/19 |
| `nest.ts` | DAG-SLP over the finished tape, every candidate verified by `chironDecode` |
| `marginal.ts` | marginal token census by character class, plus the digit-run price table |
| `pairs.ts` | the 2-character single-token graph of the glyph pool |
| `perm.ts` | glyph bijection hill-climb, 6 000 evaluations per lane |
| `reorder.ts` / `reorder2.ts` | tape order, unconstrained and topologically constrained |
| `joint.ts` | joint (order, bijection) search, annealed — and the two bugs it exposed |
| `opt.ts` | the shipped search: full sweeps, DAG feasibility, DAG-window pruning |
| `tapesplit.ts` | alternative tape layouts (glyph run + value list) |
| `digraph.ts` | the reference-alphabet cap, priced with 2-character single-token keys |
| `jitter.ts` | boundary relaxation: trim/extend a rule value, re-emit at the use sites |
| `kcurve.ts` | dictionary-size sweep with an exact optimal parse |
| `screen.ts` → `receipts/screen-stoichedon.json` | the mechanism on the frozen frontier wires |
| `stoichedon-unit.ts` | 62 assertions, 0 failures |
| `ab.ts` → `receipts/ab2.json` | balanced 29-lane A/B, ON vs `OMEGA_NO_STOICHEDON=1` |

---

## 1. The frontier this turn started from, re-confirmed

`bench/x121/receipts/leaders-x121.json`, unchanged: **29 lanes, Σ raw 28 015 →
shipped 12 133 (0.4331), floor 10 158, headroom 11.06 %, readability price
16.28 %**. The frontier is the best of {SYNKRISIS, KANON, AKOLOUTHIA-2,
APOGRAPHE, DIASTEMA} plus the arm, plus the wire-level passes in `tagstack.ts`.
Only **19 of 29** lanes carry a `§` frame, so 19 is the population any tape-level
mechanism can address; those 19 carry 10 078 of the 12 133 shipped tokens.

## 2. Generalized local-leaders list (prose / ops / other)

Gap = shipped − floor, from `leaders-x121.json`. "Local leader" = the lane with
the largest remaining gap in its family, i.e. where a new mechanism has the most
room. **PROSE total gap is 95 across 4 lanes; OPS total is 1 184 across 20.**

**PROSE (4 lanes, Σ gap 95)**

| lane | raw | shipped | floor | gap |
|---|---|---|---|---|
| email-thread.txt | 629 | 486 | 443 | **43** |
| llm-answer.md | 733 | 666 | 626 | **40** |
| kb-article.txt | 656 | 620 | 608 | 12 |
| node-help.txt | 1 099 | 852 | 852 | **0** |

**OPS (20 lanes, Σ gap 1 184)** — split as the leaderboard does:

| lane | raw | shipped | floor | gap |
|---|---|---|---|---|
| ls-l-real.txt | 5 194 | 1 325 | 943 | **382** |
| ps-aux-real.txt | 3 054 | 1 002 | 743 | **259** |
| apt-real.txt | 2 739 | 820 | 690 | **130** |
| kubectl-get-pods.txt | 1 006 | 311 | 214 | 97 |
| findmnt.txt | 787 | 431 | 335 | 96 |
| ls-real.txt | 1 034 | 423 | 328 | 95 |
| metrics.tsv | 811 | 198 | 130 | 68 |
| dpkg-l.txt | 1 000 | 657 | 592 | 65 |
| psql-output.txt | 675 | 230 | 166 | 64 |
| ps-real.txt | 1 106 | 381 | 320 | 61 |
| ps-ef.txt | 1 144 | 299 | 250 | 49 |
| du-real.txt | 458 | 266 | 219 | 47 |
| markdown-table.md | 330 | 172 | 133 | 39 |
| vmstat.txt | 229 | 145 | 113 | 32 |
| df-h.txt | 570 | 160 | 129 | 31 |
| df-real.txt | 158 | 124 | 96 | 28 |
| df-h.txt (2nd) | 140 | 106 | 84 | 22 |
| uptime-w.txt | 80 | 80 | 70 | 10 |
| free-m.txt | 76 | 76 | 76 | 0 |
| lsblk.txt | 60 | 60 | 61 | −1 |

**OTHER (5 lanes, Σ gap 306)** — CODE/MARKUP + DATA:

| lane | raw | shipped | floor | gap |
|---|---|---|---|---|
| code-ts.txt | 1 422 | 952 | 812 | **140** |
| unified-diff.patch | 578 | 411 | 324 | **87** |
| json-pkg.txt | 1 152 | 660 | 592 | **68** |
| prices.csv | 582 | 119 | 110 | 9 |
| cue-sheet.md | 513 | 101 | 99 | 2 |

**Where ΣΤΟΙΧΗΔΟΝ landed against this list:** it gains 0 on the prose leader
(email-thread, `node-help`), 0 on the OPS leader (`ls-l-real`), 0 on the CODE
leader's lane except −2 on `code-ts`, and **−11 on `ps-aux-real`, the second
OPS leader**. It is a broad, shallow, tape-shaped mechanism: it pays wherever the
incumbent left a bad order, and it cannot reach the lanes with the deepest gaps.

---

## 3. Six mechanism-distinct approaches, each with its receipt

### A. Tape serialization order as a free variable — **SHIPPED**

* **Lemma.** A CHIRON tape's emission order is unobservable: `chironDecoderPrompt`
  names a rule by its glyph, and `chironDecode` looks rules up in a `Map` keyed by
  glyph. The feasible set is the topological orders of the rule DAG.
* **Artifact.** `reorder2.ts` (order only), `opt.ts` (joint).
* **Proved.** `chironDecode(before) === chironDecode(after)` on 19/19 lanes; the
  value multiset, fully expanded, is identical before and after (unit gate).
* **Unresolved interface.** Whether a *codec-specific* contract clause elsewhere in
  the stack names a tape rule by position. Verified absent for CHIRON; the
  SYMPHYIA/SYNTHESIS `f<n>` clauses seen on `ls-l-real` are **record field**
  indices in the decoded text, not tape indices, but this was checked by reading,
  not by an automated invariant.
* **Cheapest falsification.** Construct a wire whose contract mentions "the first
  rule" and show ΣΤΟΙΧΗΔΟΝ reorders it. No such contract exists in the repo today.
* **Local vs equivalent gap.** Local optimum −27; the unconstrained (forward
  references allowed) optimum is −39 (`opt.ts` vs `reorder.ts`), so the DAG costs
  12 tokens. A global optimum is not computed; the QAP is NP-hard.

### B. Rule → glyph bijection as a free variable — **MEASURED, ~0 ALONE**

* **Lemma.** Any bijection rules → unused one-token pool letters is a relabelling.
* **Artifact.** `perm.ts`, 6 000 evaluations/lane.
* **Proved.** Total −15 over 8 lanes, **0 on `ls-l-real`**, all decode-exact.
* **Unresolved interface.** None; the mechanism is sound and simply exhausted.
* **Cheapest falsification.** Find a lane where a 6 000-evaluation swap climb moves
  more than 3 tokens. None of the 8 probed lanes does.
* **Local vs equivalent gap.** Already ARIADNE's mechanism at construction time;
  the residual after the frontier chose its assignment is ~0. **This is the
  honest reason A is the shipped axis and B is only its partner.**

### C. Joint (order, bijection) search — **SHIPPED (this is the novelty)**

* **Lemma.** A and B are **coupled**: a glyph transposition turns rule A's
  reference to rule B into a reference to A itself. `chironParseTape` happily
  re-cuts such a tape into a *different* rule set, so a rule-id topological test
  accepts it; `chironDecode` then rejects it (`at >= upto`) and returns the wire
  unexpanded. Searched separately, each axis is stuck at what the other left.
* **Artifact.** `joint.ts` (found both bugs), `opt.ts` (shipped).
* **Proved.** Every probe is checked by the real parser; the final tape is
  re-parsed after the search. `ps-aux-real` needs **7 order + 4 glyph** moves
  together — neither axis alone reaches −11.
* **Unresolved interface.** The feasibility test is reduced to (no
  self-dependency) ∧ (topological). That reduction is argued from the parse rule,
  not proved; the full parse runs once at the end as the assertion.
* **Cheapest falsification.** A tape whose values contain an in-script character
  that is not a glyph. `chironParseTape` would treat it as a new key. The encoder
  refuses at parse time (G2), so it is unreachable, but it is a *refusal*, not a
  theorem.
* **Local vs equivalent gap.** See A.

### D. The frame split — **SHIPPED as the pricing engine**

* **Lemma.** `tokens(§tape¶ + body) = tokens(§tape¶) + tokens(body)`.
* **Artifact.** `sep.ts`, **19/19 lanes, 0 mismatches**.
* **Proved.** Empirically on every framed lane, not derived. It follows from
  `§`/`¶` being single tokens, but that is checked, not assumed.
* **Unresolved interface.** It is an empirical identity over this corpus. A tape
  ending in a character that merges with `¶` would break it.
* **Cheapest falsification.** One framed lane where the two sides differ. Run
  `sep.ts` over any new corpus: it prints `DIFFER` per lane.
* **Local vs equivalent gap.** None; it is an exact speedup, ~2.5× on order probes.

### E. Reference-alphabet extension (2-character single-token keys) — **NEGATIVE**

* **Lemma.** `chironParseTape` allows one glyph = one **character**, and the
  Cyrillic pool has **122** one-token characters, so no CHIRON wire can hold more
  than ~122 rules. `bench/x121/residual.ts` stops at `pool[used+it] === undefined`
  ("POOL EXHAUSTED"), so on `ls-l-real` (119/122) it tested **at most 3** more
  rules — its "0 / 10 078 tokens" is inconclusive on exactly the lane it matters
  on. 823 two-character Cyrillic strings are single o200k tokens, so the alphabet
  can grow ~6.7× at the same one-token reference price.
* **Artifact.** `digraph.ts`, 260 top candidates priced per lane.
* **Proved negative.** **0 rules admitted on all 8 lanes.** The body has already
  been drained: 463 repeated substrings on `ls-l-real`, none paying. The pool cap
  is **not** binding — the frontier used 119 rules because 119 rules pay.
* **Unresolved interface.** None; this closes the question.

### F. Dictionary-size sweep with an exact optimal parse — **INCONCLUSIVE, MODEL WRONG**

* **Lemma.** If the cost keeps falling past K = 122, the cap binds.
* **Artifact.** `kcurve.ts`: greedy admission + exact shortest-path parse in symbol
  space.
* **Proved.** The K-curve falls monotonically (ls-l-real: 2 761 at K=119 → 1 961
  at K=600).
* **Why it is recorded as inconclusive, not as evidence.** The model charges
  `1 + |rule symbols|` per rule with **no nesting**, and the real tapes nest
  heavily (184 internal references on `ls-l-real`). The model's absolute total
  (1 944) is **619 tokens worse** than the actual wire (1 325), so its slope is
  measured on the wrong objective. E's direct measurement supersedes it.

---

## 4. Fifteen negative-result shapes (all measured this turn, all with receipts)

1. **Tape layout split** — glyph run first, values joined: **+144 tokens worse**
   over 8 lanes (`tapesplit.ts`). The interleaved glyphs are *cheap separators*;
   removing them from between values makes the values tokenize worse.
2. **Tape flattening / separator change** — gluing values with `\n` is worse (569
   vs 531), gluing with nothing is neutral (458 vs 466). Do not touch the
   interleave.
3. **Nesting / DAG-SLP over the finished tape** — front-inserted glyphs, every
   candidate verified: **+3 `ls-l-real`, +1 `findmnt`, +1 `dpkg-l`, 0 elsewhere**
   (`nest.ts`).
4. **Glyph bijection alone** — −15 total, **0 on the largest-gap lane** (`perm.ts`).
5. **Reference entropy coding** — a Huffman code over the digit alphabet bottoms
   out at **0.631 tok/ref**; the shipped wires already achieve **0.606**
   (`runs.ts`). Ceiling ~0.63, floor ~0.49 with arithmetic coding, which no LLM
   reader can execute.
6. **Two-character single-token reference keys** — **0 admitted on 8/8 lanes**
   (`digraph.ts`). The residual is drained, not capped.
7. **Boundary relaxation (jitter)** — trimming/extending a rule value and
   re-emitting at the use sites: **0 on 7 lanes**, one decode-inexact −1 rejected
   (`jitter.ts`).
8. **Cross-value repeats** — the rich-looking repeats are whitespace runs
   (`"   "×166` on `dpkg-l`) that the tokenizer already merges cheaply.
9. **Per-character marginal pricing** — every single character costs exactly 1
   token when counted alone; 8/8 lanes show 1.000 tok/char. The measurement is
   meaningless; only drop-one-class marginals say anything.
10. **Digit-run packing** — o200k prices a run at `ceil(len/3)`; the fragmentation
    waste is 131 tokens over 8 lanes, but merging runs requires moving real
    separators, which costs more than it saves. The `÷8` observation (almost every
    `ls -l` size is a multiple of 8) is worth ~14 tokens and was rejected as
    fidelity-adjacent.
11. **Unused CHIRON operators** — `chironOpsUsed` reports `rep/fill/range/split`
    **false on all 19 framed lanes**. They are free expressiveness the reader
    already has, and the parents found nothing to spend them on.
12. **Alternative scripts** — CJK has 2 517 one-token characters but **1.9 merge
    partners per character** against Cyrillic's **13.5**; a bigger pool does not
    help when the merge graph is the scarce resource (`pairs.ts`, ARIADNE's census).
13. **Whole-stack speed** — **not met, and not resurrected.** ΣΤΟΙΧΗΔΟΝ costs
    ~27 s across 19 lanes. ΠΡΟΛΗΨΙΣ taught that <15 % whole-lane differences are
    unresolvable on this 2-vCPU host; nothing here claims a speedup.
14. **`ls-l-real` is unreachable** — 119/122 pool letters used, 184 dependency
    edges, free pool 3, **Δ = 0**. The mechanism cannot reach the lane that needs
    it most.
15. **Prose** — ΣΤΟΙΧΗΔΟΝ gains −1 on `llm-answer.md`, 0 on `email-thread`,
    `kb-article`, `node-help`. Prose has no tape to reorder that is worth
    reordering; ARIADNE's own header records the same wall.

## 5. Modal-shortcut test

The tempting shortcut is to *believe* two things that are true of most
serializations and false here:

* **"Reordering a rule list cannot change its size."** True for a
  delimiter-separated rule list (every classical grammar compressor). False here:
  the tape is delimiter-free, and the glyphs are the separators. Falsified by
  `reorder2.ts`: −7 on `ls-l-real` from order alone, decode-exact.
* **"A glyph is a glyph."** True for the reader, false for the tokenizer.
  Falsified by `perm.ts` (−15) and by ARIADNE's merge census.

The mirror-image shortcut — "so any order is feasible" — is also false, and that
is the bug `joint.ts` found twice: the first version used a rule-id topological
test and **emitted wires `chironDecode` refused on 8/8 lanes** (they came back
unexpanded, 2 532 characters where 9 178 were expected). The shipped code checks
the real parser on every probe and re-parses the tape after the search.

## 6. Second-order adversaries, per candidate

| candidate | the obvious adversary | the second-order adversary | outcome |
|---|---|---|---|
| order swap | a forward reference | `chironParseTape` **re-cuts** the tape into a different rule set rather than failing, so the wire parses, prices well, and only breaks at decode | caught by G3 + the final re-parse |
| glyph swap | a glyph colliding with literal text | the swap creates a **self-reference**, which `chironDecode` refuses; a rule-id DAG test cannot see it | caught by the no-self-dependency condition |
| pool reassignment | reusing a letter already in use | assigning a letter that occurs **literally** in the contract or the body, so that occurrence is re-read as a reference | excluded by the `elsewhere` set |
| frame split | `§`/`¶` merging with neighbours | a tape whose last value ends in a mergeable character | checked on 19/19; `sep.ts` prints `DIFFER` if it ever fails |
| 2-char keys | a key occurring inside another key | the body's own literal text containing the key | excluded by an `includes` test; moot, 0 admitted |
| jitter | a value trimmed to empty | a value whose head is re-emitted at a use site that already begins with that character, changing the body's chunking | measured, never profitable |

## 7. External verification vs self-review

* **Self-review only.** The gates use the repository's own `chironDecode`, which
  is the same function the reader's prose contract describes, so "the decoder
  agrees" is not independent evidence that an *LLM* would decode it. No
  LLM-hand-decode was run this turn, and **no external verifier has reviewed this
  module**.
* **What is not self-review:** the relabelling is invisible by construction —
  every non-glyph character of the message is byte-identical before and after, and
  the (rule ↔ raw) pairing is preserved as a multiset under full expansion. A
  reader that reads the tape as a glyph→text dictionary is unaffected by
  construction, regardless of which reader it is.
* **Not done, recorded:** a CPython second reader (the repo's convention in
  earlier tiers) and a live LLM hand-decode of one emitted wire. Both are cheap
  and both should be run before this is trusted.

## 8. Prior art found this turn

* **MR-RePair** — Furuya, Takagi, Nakashima, Inenaga, Bannai & Takeda,
  arXiv:1811.04596; *Algorithms* **13**(4):103, 2020, doi:10.3390/a13040103.
  Theorem 2 / Remark 1: the **maximal-repeat selection order** determines the
  grammar size Re-Pair produces; Theorem 6: MR-RePair can be *larger* than
  Re-Pair under a different MR-order. Same-shaped observation (order matters) at
  the **construction** stage, where it changes the rule *set*. In a
  delimiter-separated rule list, serialization order costs nothing; the whole of
  ΣΤΟΙΧΗΔΟΝ lives in the gap between those two statements.
* **PickyBPE** — EMNLP 2024 (aclanthology.org/2024.emnlp-main.925.pdf): vocabulary
  refinement during tokenizer training by removing merges that leave intermediate
  "junk" tokens. Relevant because it is the other side of the same coin — the
  *tokenizer's* alphabet is optimizable, which is what makes ours optimizable
  against it — but it changes the tokenizer, which is off-limits here.
* **Practical Grammar Compression Based on Maximal Repeats** and the
  *Compression and Pattern Matching* survey chapter (Springer 2022,
  doi:10.1007/978-981-16-4095-7_7) — the same RePair/MR-order lineage, used for
  the theorem statements.
* **Frontier-lab mathematics, reviewed individually** (carried from the prior
  turn, re-checked): 20 May 2026 OpenAI model + human-verified companion
  arXiv:2605.20695 on the Erdős unit-distance conjecture; 21 May 2026 DeepMind
  AlphaProof Nexus, arXiv:2605.22763; 6 Oct 2026 OpenAI's 377-proof release
  including the quasi-Riemann hypothesis and Landau–Siegel zeros; 26 Oct 2026
  OpenAI's local-smoothing/ETH-false announcement and Anthropic's
  2^o(n)-time 3-SAT paper the same day — both Lean-checked, both admitted
  impractical. None of these is mechanic material for this tier; they are
  recorded because the standing instruction asks for them, and the honest
  relationship is **none**.

## 9. Verdict

ΣΤΟΙΧΗΔΟΝ is **pareto-superior on the token axis and strictly worse on the time
axis**: −27 tokens over the 19 framed lanes with 0 regressions and 0 inexact
decodes, −11 on `ps-aux-real` (which clears the ">10 tokens on a lane" bar), at a
cost of ~27 s of search. It is the smallest codec in this repository, and the
report says so rather than dressing it up.
