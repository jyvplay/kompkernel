# X121 — live sources consulted (requirement (f))

Each entry: what the source is, what it claims, and what it means for this turn's
codec. Nothing here is cited in `docs/` unless the claim was checked in this repo.

---

## 1. The theoretical basis of ΠΡΟΛΗΨΙΣ

**Berglund & van der Merwe (2023), “Formalizing BPE tokenization”**, EPTCS 388,
pp. 16–27 (NCMA 2023), doi:10.4204/EPTCS.388.4; preprint arXiv:2309.08715.
<https://arxiv.org/abs/2309.08715>

- Remark 3 + Algorithm 1: BPE tokenization can be performed **incrementally**, and
  left-to-right with **memory constant in the length of the string** — i.e. only a
  *constant-sized lookahead window* is needed.
- Their worked example is exactly our situation: given the tokenization τ of
  w = v₁αv₂ and an edit to w′ = v₁βv₂, take τ₁ = the prefix of τ falling entirely
  inside v₁, and re-tokenize only from there.

**What it licenses.** ΠΡΟΛΗΨΙΣ is that constant-sized window, made explicit: the
window is `tail(anchor.slice(0,pos))`, and we prove by test that it suffices
(`bench/x121/prolepsis-unit.ts` §1, §2, §5: 45 marks + 1 040 variants + 220 samples,
0 mismatches against the unaccelerated reference).

**The honest caveat, found in this repo and not in the paper.** Prefix consistency
is a property of the **BPE merge阶段**. The **pre-tokenizer** is a separate regex
pass and is *not* prefix-monotone. Measured here (ps-aux-real, offset 3080–3083):

    inside the anchor:  … "0" | " " | " " | "102" …      (three chunks)
    as a standalone string: … "0" | "  "                  (two chunks)

because o200k's `\s+(?!\S)` backtracks one space at a time, and at end-of-string
the lookahead succeeds for the whole run. Consequence: `tokens(prefix-as-a-string)`
can differ by 1 from the anchor's in-context running total at the same offset.
Both accountings are correct for their own use; **mixing them is off by one** — the
first version of the unit test (§5) failed for exactly this reason, and the fix was
to recompute marks from the anchor's chunk list, never from `tokenTail(prefix)`.

## 2. The algorithmic state of the art (and why we do not use it)

**“Incremental BPE Tokenization”**, ICML 2026 Spotlight, arXiv:2605.30813, code
<https://github.com/ModelTC/mtc-inc-bpe>. First incremental BPE with a strict
O(log² t) worst-case bound **per byte**; Aho–Corasick to locate the search space,
binary search on a centroid decomposition of a “Suffix-Successor Tree” to find the
last token θ(s); ~3× over HuggingFace tokenizers.

**“VD-STrans”**, arXiv:2609.19644 (2026-09-18): hardware-vectorised direct-interval
suffix transduction for the same problem; states plainly that there is a “critical
performance gap between the theoretical tree-search bound and physical
performance”.

**Why not adopted.** Their access model is *streaming, byte-at-a-time, worst-case
bounded*: that is why they need centroid decomposition. Ours is *whole-string,
best-effort, amortised over ~10⁶ candidates in a search*: we pay O(shared prefix)
once per candidate and fall back to the existing cached fold when there is no
anchor. Their 3× is against HF tokenizers, i.e. against a path with no chunk-count
memo at all; our baseline already has X77's LUT + chunk cache, so the two ratios
are not comparable. Their machinery would not be Pareto-superior here — it would
add a tree to maintain per byte for a number we already memoize per chunk.

## 3. Closest prior art (must be cited, and it is close)

**`niieani/gpt-tokenizer` PR #94 / PR #95 — `createIncrementalCounter`.**
<https://github.com/niieani/gpt-tokenizer/pull/94>
`counter.update(text)` / `applyEdit(start, deleteCount, insertedText)` / `count()`;
splits exactly as `countTokens` does; an edit invalidates only the pieces it can
reach; unchanged pieces keep their counts. Their own harness (o200k_base, median
of 5, 50 edits per workload, every count checked against `countTokens`, 414
comparisons, 0 mismatches) reports **21.5×–36.3×** over a full recount, versus
10–31× for fenwick / checkpoint / rabin–Karp variants. They enumerate the same
traps we hit: “the one-character whitespace lookahead, the end-of-segment `$`
alternative, and contraction suffixes that can extend a piece”.

**How ΠΡΟΛΗΨΙΣ differs, and why the numbers differ.**
- They receive an **edit script** (`start, deleteCount, insertedText`), so they can
  walk back to the last *provably safe piece* and resync. We receive **only a
  string**: no edit coordinates exist, because our “edits” are candidate wires
  produced by a search (ΔΙΑΓΡΑΦΗ write-back, ΜΕΤΑΤΑΞΙΣ relocation, ΓΕΝΝΑΔΑΣ
  re-spelling). We must therefore *infer* the shared prefix by comparing against a
  ring of recent anchors.
- Their granularity is one pre-tokenizer piece; ours is a checkpoint every `stride`
  characters. Finer granularity is why they reach 20–36× and we reach ~2×.
- Their counter is a per-document object with an explicit lifecycle. Ours is
  invisible to callers: `countTokens` keeps its exact signature and its exact
  return value, so nothing else in the 120-codec stack had to change.

**Verdict: not novel in kind, novel in access model** — the same mechanism
retargeted from “a human editing a document” to “a search enumerating variants”,
where the shared-prefix structure is implicit. Honest ceiling implied by their
numbers: a piece-level resync would be an order of magnitude better than our
stride marks, and is the obvious next lever if (d) needs more.

## 4. Independent corroboration of the same idea

**sglang issue #41148, “Incremental chat-prompt processing”** (2026-09):
<https://github.com/sgl-project/sglang/issues/41148>. Cache the token ids of
recent histories; for a new request find the longest cached history whose messages
are a prefix of the new messages *and* whose rendered text is a prefix of the new
render; encode only the new text and **append it at a boundary where concatenation
is provably identical to a full encode** (their condition: the appended text must
begin with a special added token that strips no whitespace). 205/205 turns
identical ids. Measured motivation: on Gemma 4 26B-A4B at 301 messages, rendering
23.0 ms and encoding 11.8 ms per turn, paid serially per request.

Our boundary condition plays the same role as their “must begin with a special
added token”: we have no added token to lean on, so we carry the explicit tail
state and prove the boundary condition ourselves (unit test §1 and §5).

**vLLM PR #46723** (decode side, not ours): `DecodeStream::push_token` decoded the
retained window twice per token; 1.84 ms → 1.02 ms on the byte-level fast path.
Adjacent in spirit (stop recomputing what you already have), opposite direction.

## 5. Foundational incremental-lexing literature

- **Wagner & Graham, “General Incremental Lexical Analysis”** and **“Efficient and
  Flexible Incremental Parsing”**, <http://harmonia.csberkeley.edu/papers/>
  (twagner-lexing.pdf, twagner-parsing.pdf). Per-token *character lookahead sets*:
  a token must be re-lexed if any character in its lookahead range is disturbed.
  Our tail is precisely the bounded lookahead region of the BPE pre-tokenizer; our
  stride marks are checkpoints in the token stream.
- **US Patent 5737608A**, “Per-keystroke incremental lexing using a conventional
  batch lexer” — the oldest form of the trick: convert a token range back to text,
  apply the edit, re-run the *batch* lexer on that region only. ΠΡΟΛΗΨΙΣ is the
  same idea with the batch lexer replaced by the cached chunk fold.

---

# Requirement (g) — lab mathematics, reviewed honestly

Sources: OpenAI <https://openai.com/index/model-disproves-discrete-geometry-conjecture/>;
arXiv:2605.20695 (human-verified digest of the OpenAI counterexample);
arXiv:2605.22763 (DeepMind, AlphaProof Nexus);
<https://www.quantamagazine.org/updates/transformation/>;
<https://www.progressiverobot.com/2026/10/27/openai-discoveries-mathematics-computer-science-physics/>.

## What is claimed, and how strong the evidence is

| Claim | Date | Evidence | Independent confirmation |
|---|---|---|---|
| Erdős **unit distance conjecture is false**: infinitely many n with ≥ n^{1+δ} unit-distance pairs | 2026-05-20 | OpenAI internal reasoning model; companion paper by external mathematicians | **Yes** — Alon, Bloom, Gowers, Litt, Sawin, Shankar, Tsimerman, Wang, Wood posted a human-verified digest the same day (arXiv:2605.20695). Sawin's refinement makes δ = 0.014 explicit |
| DeepMind **AlphaProof Nexus**: 9/353 Erdős problems, 44/492 OEIS conjectures | 2026-05-21 | arXiv:2605.22763, Lean-checked | Lean checks the steps; the headline counts are the lab's own |
| **Local smoothing conjecture in every dimension** (⇒ Kakeya, Bochner–Riesz, Nikodym; every Euclidean Kakeya set has full Hausdorff dimension) | 2026-10-26 | 59-page paper + Lean | **None yet** |
| **ETH is false**; a 2^{O(n log log n / √log n)} algorithm for 3-SAT | 2026-10-26 | OpenAI 67-page paper + Lean (Lean-bound weaker: 2^{O(n (log log n)²/√log n)}) | Under examination by the Impagliazzo–Paturi–Williams group |
| Anthropic/Claude: **“A 2^o(n) Time Algorithm for 3-SAT”** | same day, 2026-10-16 | 49 pages; same headline bound 2^{O(n log log n/√log n)}; main theorem's bound in Lean | Not stated |
| Yang–Mills / 4-D QCD existence | 2026-10 | 1 147-page proof, **not public**; physicists led by David Gross reviewing | No |
| “Quasi-Riemann hypothesis” (⇒ no Landau–Siegel zeros) | 2026-10-06, among 377 released proofs | Poorly written; called by Jared Duker Lichtman “the most significant AI-for-math achievement so far, by quite a margin” | Mathematicians posting simplifications |
| Fermat's Last Theorem autoformalized | 2026-09 | Anthropic agent swarm, 11 days, ~13 M lines; experts concluded the autoformalization worked | Yes (unlike the earlier Meta paper) |

**Standing skepticism, restated because a previous turn was burned by it.** An
earlier OpenAI “solved Erdős problems” claim was retracted: GPT-5 had *found
solutions that already existed in the literature*. The unit-distance counterexample
survived that failure mode because external mathematicians wrote the digest. The
October results have no such external verification yet (local smoothing: “none
yet”; ETH: “under examination”). **Nothing in this repository depends on any of
them**, and nothing below would change if all of them were withdrawn tomorrow.

## Reviewed individually, for this codebase

1. **ETH false / 2^{o(n)} 3-SAT.** This is the one that touches us: our codec
   search layers (ΒΕΛΤΙΣΤΟΣ ladder, ariadne's `greedyShapes`, SEQUOYAH's tabu
   assigner, ΜΕΤΑΤΑΞΙΣ) are all heuristics for problems with an exponential exact
   search. If a subexponential SAT algorithm existed with usable constants, the
   honest engineering response would be to replace several heuristics with exact
   solvers. **It does not have usable constants.** Anthropic's own paper states the
   bound “does not improve on the 2^n of exhaustive search unless n > 10^{10,000}”
   for formulas at five clauses per variable, and that brute force “is already
   impractical for n = 100”. Consequence for kompkernel: **zero**. Keep the
   heuristics. Revisit only if a bound with n_0 below ~10³ appears *and* is
   independently confirmed.
2. **Local smoothing / Kakeya / Bochner–Riesz.** Harmonic analysis; no path to
   string compression or token counting. No action. (Noted anyway because the task
   asks for individual review.)
3. **Unit distance counterexample.** Discrete geometry in ℝ²; the construction is
   an infinite family beating rescaled square grids. No relation to 1-D sequence
   modelling. No action — but it is the cleanest example of the *method* we are not
   using: a general-purpose model searching proof strategies, verified afterwards
   by humans.
4. **Autoformalization (FLT, AlphaProof Nexus, First Proof Project round 3).** The
   transferable lesson is **verification architecture, not mathematics**: Lean
   checks every step mechanically, and that is what turns a plausible artifact
   into a result. The analogue in this repo already exists and this turn leaned on
   it hard: byte-exact round-trip, `countTokensExact` as the unaccelerated
   reference, an independently written second implementation of the same quantity
   (unit test §5), and a 29-lane A/B whose ON and OFF arms must produce identical
   message hashes. First Proof Project round 3 also found all frontier models
   “bad at writing up their results and properly citing sources” — the reason this
   file records sources with their evidence status rather than their headlines.
5. **Quasi-Riemann / Landau–Siegel.** Analytic number theory. No bearing. If true
   it would sharpen prime-distribution error terms; we use no such estimate.

## Bottom line

The only mathematics this turn's mechanism actually rests on is
**Berglund & van der Merwe (2023)** — a 2023 peer-reviewed EPTCS paper with a real
proof — plus the empirical refinement that the **pre-tokenizer** (not BPE) is where
prefix monotonicity breaks, which we found by running it. The 2026 lab results are
spectacular, mostly unverified, and irrelevant to this codebase except as a caution
about constants (ETH) and a model for verification discipline (Lean ⇄ our A/B).
