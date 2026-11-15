# X120 — live search record (new terms, new sites)

Searched 2026-11-14 from this sandbox with the `web_search` tool. Every entry
below was returned by a live call in THIS turn; nothing here is recalled from
training data. Sites/terms marked NEW were not used by any earlier turn's
`sources.md` (X118: `bench/x118/research/sources.md`; X119:
`bench/x119/research/sources.md`).

Runtime honesty: this sandbox has **no Lean, no lake, no Coq, no Z3, no model
API**. Nothing in the lab-math section below was compiled, kernel-checked or
independently verified here. Those entries are reported as *published claims with
published artifacts*, and none of them is used as a component of the codec.

---

## 1. Compression / parsing — the mechanism's honest prior art

### 1.1 OptFSST (NEW site term: "OptFSST", "symbol table", ADMS/VLDB workshop)
- `arxiv.org/abs/2607.11271` — Chehaidar, Stoian, Stargalla, Kipf, *OptFSST:
  Optimized FSST String Compression*, submitted 13 Jul 2026, v3 26 Aug 2026,
  ADMS 2026 (17th Int'l Workshop on Accelerating Analytics and Data Management).
- `arxiv.org/html/2607.11271v1` §3.1: "FSST's longest-match encoder is fast but not
  optimal for a fixed symbol table. Since each symbol code costs one byte and an
  escaped character costs two bytes, fixed-table encoding can be formulated as
  finding the minimum-cost segmentation of the input string. OptFSST solves this
  problem using dynamic programming." `dp[i]` = min compressed size of the suffix;
  at each position either escape one byte (cost 2) or emit one table symbol
  (cost 1). Trie lookup for matches.
- §5.2 ablation: `FSST + dp-encode` alone is **1.01×** on average; the full method
  (dp-train + longer-symbol counter + conflict pruning) is **7.3 %** average /
  **47.7 %** max over FSST on 92 real string datasets, and 17.0 % / 91.5 % over
  FSST12.
- §4: **optimal symbol-table selection is NP-hard when the alphabet is part of the
  input.**

**What this imports, honestly.** The idea "given a fixed dictionary, parse
optimally by DP instead of greedily" is PRIOR ART and is cited as such in
`veltistos.ts`. It is not claimed as new. Two differences are load-bearing here
and are the actual contribution:
1. OptFSST's costs are **additive** (1 byte per code, 2 per escape). Ours are not:
   a BPE token count is not the sum of its pieces, so the DP state must carry the
   emitted tail. Measured consequence: beam 1 (one state per position, i.e. the
   additive-style DP) is worth **Δ−4** on the canonical 29; beam 8 with a 24-char
   context is worth **Δ−78**. The context-carrying state IS the mechanism.
2. The object is a one-chat, model-readable message whose dictionary is printed in
   the message and whose "codes" are Unicode letters, not bytes. Nothing is
   retrained and no vocabulary is added.
3. The NP-hardness result is the reason this codec does **not** claim optimality
   over dictionaries, and the reason the induction stage was screened and dropped
   (zero admissions, §3 below).

### 1.2 CircuitPython translation compressor (NEW site: github.com/adafruit)
- `github.com/adafruit/circuitpython/pull/11369` (13 Sep 2026): "Each string is
  tokenized by dynamic programming for the fewest bits instead of greedy longest
  match, **which also decides per occurrence whether a qstr reference pays off**.
  Dictionary words left unused are dropped."
- Independent engineering evidence for exactly the two moves X119/X120 make
  (per-occurrence choice, dead-entry pruning), in a **bit**-cost setting with
  additive costs. Cited as prior art, not as a source of the mechanism.

### 1.3 Optimal LZ-End parsing is hard (NEW site: drops.dagstuhl.de / LIPIcs)
- `drops.dagstuhl.de/entities/document/10.4230/LIPIcs.CPM.2023.3` — Bannai,
  Funakoshi, Kurita, Nakashima, Seto, Uno, CPM 2023: deciding the optimal LZ-End
  parsing is **NP-complete** (reduction from vertex cover); the greedy/optimal
  ratio has a lower bound approaching **2**.
- Boundary import: "optimal parsing" is only cheap because the dictionary here is
  FIXED and every edge is an explicit string. Change the reference model (LZ-End)
  and the problem becomes intractable. No claim of a general optimal parser is
  made.

### 1.4 Dictionary-encoding prompt compression (re-checked, still inadmissible)
- `arxiv.org/pdf/2604.13066` / `arxiv.org/html/2604.13066` — meta-token dictionary
  placed **in the system prompt**; up to 20× claims. Inadmissible here: the access
  model forbids a system prompt, and the dictionary must be paid inside the one
  message. Its own §5.1 reports the honest correction: counting the dictionary
  drops the compression ratio by 0.1–0.2, and some log sets have an interior
  optimum in `L_max`. That is the same overhead accounting this repo has done
  since X75.
- `pith.science/paper/2506.00307` — LTSC referee report still flags the
  overlapping-swap invertibility hole. Used only as an adversary shape.
- `arxiv.org/pdf/2510.18043` CompactPrompt — reversible n-gram table + lossy
  pruning; the reversible half is prior art for phrase dictionaries.
- `arxiv.org/html/2602.13266v1` LoPace — zstd/uint16 packing; binary, not
  chat-readable. Mean "token method" ratio 1.02× (range 0.74–2.05), i.e. it can
  *expand*. Boundary only.

---

## 2. Frontier-lab mathematics — reviewed individually, none verified here

### 2.1 OpenAI — Yang–Mills existence (flagged in X119, revisited deeper)
Live findings this turn:
- The Lean code OpenAI submitted on **28 Oct 2026** was published **10 Nov 2026**
  by the Yang–Mills Working Group (Gross chair; Douglas, Jaffe, Klebanov,
  Nekrasov), in `github.com/yang-mills-group/OpenAI-YM-20261028`, with the
  assessment in `github.com/yang-mills-group/YM` (`docs/assessment-1.pdf`).
- Reported clean rebuild: **9,470 modules**, ~184 minutes on an Apple-silicon Mac,
  **250,319 declarations**, no project axioms, no `sorry`, **17 main results**
  depending only on `propext, Classical.choice, Quot.sound`. Comparator positive
  30 Oct (OpenAI's statement) and 3 Nov (the committee's combined statement).
- **The correction that matters**: OpenAI told the committee that its public
  target `YangMills.jointExistence` **omitted links to the lattice construction**
  that the proof does establish; the committee reviewed its own *combined*
  statement instead. This is a live instance of negative shape #6 (the formal
  statement is weaker than the prose claim).
- Committee's own words: "We used OpenAI's Astra to assist with the digestion of
  the supplied Lean code. We do not claim to fully understand the proof yet."
  The 1,147-page written proof is still unreleased; IAS advisory group asked for
  immediate release; Woit argues the verified existence standard is not the Clay
  standard. **Mass gap and uniqueness of the infinite-volume limit remain open.**
- Sources: `science.org/content/article/ai-rivals-tackle-one-physics-deepest-mathematical-challenges`,
  `casrai.org/news/ai-rivals-physics-mathematical-challenge-2026`,
  `aiera.blog/openai-yang-mills-proof-verified/`,
  `aroundprague.cz/en/news/science/committee-confirms-ai-built-proof-that-yang-mills-theory-exists-not-the-mass-gap`,
  `sharedsapience.substack.com/p/the-century-report-november-12-2026`.
- Also reported: a Cambridge-led team found in October that OpenAI's
  Navier–Stokes Lean file certified a **weaker step** than its prose claimed.

**Compression relevance: none.** A constructive existence proof for a Wightman
QFT supplies no code, no bound on description length, and no decoder. The
*methodological* import is real and is applied in this turn: a formal artifact can
be weaker than the sentence describing it, so this repo compares
`chironDecode(candidate) === chironDecode(incumbent)` on the actual strings rather
than trusting any codec's self-report, and prints the contract it actually needs.

### 2.2 Anthropic — ζ zeros (flagged in X119, revisited deeper)
- `github.com/anthropics/formal-math/tree/main/zeta23` — Alpöge & Furman,
  arXiv:2608.13637. Headline: ≥2/3 of zeros simple and on the line, ≥5/6 distinct,
  Montgomery–Taylor window constants **0.67250…** and **0.83625…**, plus primitive
  Dirichlet L-function analogues.
- Trusted-surface discipline: `Challenge.lean` holds **17** statements with
  deliberate `sorry` and imports only Mathlib; `Challenge/XiPrime.lean` holds 6
  more. The solution cone is sorry-free; `#print axioms` reports exactly the three
  standard axioms; Comparator + nanoda re-check the statements.
- Independent audit thread `github.com/bigospeedrun/verifier/issues/146` (4 Nov
  2026) confirms the axiom audit and adds the honest gap: the *board* form of the
  constant needs a separate inequality about `tan(1/√2)` that zeta23 does not
  contain; only its numeric truth (margin 7.04e−7) was checked there.
- Related: Anthropic's FLT formalization (Sep 2026) — 13M lines, ~29,500
  intermediate theorems, comparator 4.33.0 (~15 h), nanoda 1,052,234 declarations
  (~30 min), no `sorry`, three standard axioms; explicitly a formalization of the
  established Wiles/Taylor–Wiles route, **not** new mathematics.

**Compression relevance: none directly.** The transferable object is the
**trusted-statement discipline**: a small, human-readable statement surface
(`Challenge.lean`) that the artifact must match, checked by an independent kernel.
This repo's analogue is the printed contract plus the independent CPython reader;
X120's cold read is exactly that check, and the mutation battery is the analogue
of the axiom guard.

### 2.3 Google DeepMind — AlphaProof Nexus (deeper than X119)
- Peer-reviewed in **Science, 8 Oct 2026**; preprint arXiv:2605.22763 (21–22 May
  2026). **9 / 353** formalized Erdős problems (two open 56 years), **44 / 492**
  OEIS conjectures, a codimension-3 type-2 log-concavity case for pure
  O-sequences, and an exact convergence-rate result for an anchored
  gradient descent–ascent schedule.
- Mechanism: Gemini 3.1 Pro prover agents edit a Lean file with a `sorry`, compile,
  and revise on compiler errors; the full system adds AlphaProof for subgoals, an
  Elo-ranked population of sketches and evolutionary search; SafeVerify guards
  against axiom injection and statement edits; Lean 4.27 in Docker.
- **Ablation that matters**: the basic agent (LM + compiler feedback, no
  evolution) also solved all 9 in later targeted runs, at higher cost. The
  framework buys efficiency, not capability.
- **Independent audit**: Erdős #846's Lean proof is valid but the result was
  already implied by Reiher–Rödl–Sales, so under a strict novelty definition the
  count is **8**, not 9. Several formalizations were mistranslations of the
  informal problem (density meanings) and had to be corrected.
- Artifacts: `github.com/google-deepmind/alphaproof-nexus-results`.

**Compression relevance: methodological only.** "Generate, compile, revise, and
never let the generator edit the statement" is precisely this repo's
`admitParentRelative` discipline: the candidate may change the wire, never the
expansion. The 846 audit is negative shape #14's cousin — a valid artifact that
does not establish the claimed novelty — and is why X120's header cites OptFSST
as prior art instead of claiming the DP as new.

### 2.4 doubleAI — girth 8/5 (flagged in X119, revisited)
- `doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory`
  (6 Oct 2026): explicit (q³+1)-regular graphs with girth ≥ (8/5)·log_{q³} n − O(1),
  beating the 4/3 coefficient that stood since 1988 (Margulis; Lubotzky–Phillips–
  Sarnak). Quotients of a Bruhat–Tits tree by congruence subgroups of an arithmetic
  group from a degree-4 division algebra.
- Certificate: for every nontrivial congruence element w, `det(w − I) ≠ 0`, is
  divisible by the fourth power of the level, and is bounded by the displacement
  of tree vertices. Matching upper bound for one 28-regular family. Paper + Lean
  zip released; budget < $2,000.
- Newer doubleAI items seen this turn: **Maxwell** (19 Oct 2026), a "Code Execution
  Model" that speeds code while it runs with a proof per optimization; an ECDSA
  quantum-circuit result whose agents **wrote their own verifiers** and audited the
  benchmark harness; and 6 Nov 2026, an agent that redesigned a network during
  training (CLRS 55 %→84 %).

**Compression relevance: none.** High-girth expanders are used in error-correcting
codes, not in lossless text description length; the certificate is about cycle
length, not about a decoder. The methodological import is the same as 2.3:
**bring your own verifier**. X120's second-order attack is written against this
codec's own structure rather than reusing a generic battery.

---

## 3. What the searches changed in the code

1. `veltistos.ts` now cites OptFSST and the CircuitPython PR explicitly as prior
   art for DP-over-a-fixed-table and per-occurrence choice, and states the two
   differences (non-additive cost ⇒ context in the state; one-chat readable
   object) as the only novelty claim.
2. The NP-hardness of table selection (OptFSST §4) and of optimal LZ-End parsing
   (CPM 2023) are recorded as the **impossibility side** of the frontier: this
   codec is optimal only for a fixed table, and no global-optimality claim over
   dictionaries is made.
3. The induction stage was screened and **dropped**: `screen-induct-work.json`,
   `screen-induct-code.json`, `screen-induct-help.json` — 6 proposals per lane,
   **0 admitted** on kb-article, email-thread, llm-answer, code-ts, node-help.
4. No lab-math result is used as a component. The three transfers are
   methodological (trusted statement surface; never let the generator edit the
   statement; bring your own verifier) and each is already implemented as a gate.
