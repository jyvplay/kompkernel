# Session memory — X43

# Current State

**X43 KRISIS is COMPLETE, committed and pushed.** Branch `arena/695387ad-kompkernel`
= **`3a14916`** ("X43 KRISIS: clause-cost admissibility gating of the stack trial
tree"), preceded by `c24c454`/`e2633aa` (X42), `f99c97a`/`bee4117` (X41),
`b5a990c` (X40). **PR #33** now covers X40+X41+X42+X43. `main` = `666f509`.
**A second commit with the search supplement + this memory was still to be made at
the point this file was written** — check `git log --oneline -3` first.

The per-turn reset **did** recur at the start of X43 (HEAD `666f509`, empty
`node_modules`, no `/tmp` files) and was recovered from the remote in three
commands. The remote branch name was **unchanged** this session
(`arena/695387ad-kompkernel`, tip `c24c454`), contradicting the earlier note that
it changes every session — still run `git ls-remote --heads origin | grep 695387ad`
first rather than assuming.

**X43's headline: KRISIS delivers ZERO tokens on all 17 lanes, by design, and up
to 2.8× lower wall clock — verified byte-identical WIRES, not merely equal token
counts.** The frontier is unchanged from X41/X42; no lane moved. Registered at
**index 33** (206 codecs total).

# Task

Active requirements (re-issued verbatim each turn, X44 included): run **new and
different** tests for a **brand-new mechanism**; ship **one new pareto-superior
codec** in-repo (**analysis-only REJECTED**); keep updating the codec→spec page
(greedy vs not, honest citation, time/CPU bound); re-verify the frontier and
**restate it if changed**; maintain a **generalized local-leaders list by
structural category**; confirm the wire decodes by a **bare LLM from a single chat
box**; **live new web searches on sites not yet referenced**, ≤10 years old, new
search terms; evaluate newly solved math proofs from **each frontier lab
individually and fractally**; improve the frontier by **more than a few tokens on
any lane**; prefer **general large gains on everyday prose/ops**; hunt **AI-native
ideas human researchers are blind to**; pursue the **terminal codec**; **do not end
without a new codec**.

**Standing gap, now confirmed by FIVE independent routes: 0 of 12 prose lanes have
moved across X33–X43.** Route five is new in X43: CHIRON's smallest-grammar
machinery returns `script=none rules=0 blocks=0` — the **raw fallback** — on
kb-article and component.jsx, in **29–185 ms**, at every budget from default to
26,000 ms and at 20,000 and 200,000 work units. It is **not out of time; there is
nothing to find**. Prose is the biggest remaining prize and the hardest.

# User Constraints & Corrections

- Byte-perfect, exact lossless round trip required for every shipped codec.
- Wire must be decodable by a bare LLM in ONE chat message: no system prompt, no
  skills.md, no tools.
- Honest tool calls and receipts only; no fantasy/mock/simulated execution. No Lean
  toolchain, no theorem prover installed.
- Do not claim parallelism/search/verification that did not occur; state runtime
  honesty explicitly.
- Prefer general large gains on everyday prose/ops over small niche gains.
- Rosetta: analysis only, never a compression oracle.
- No benchmaxxed/test-only codec; must generalize to random and hybrid prose.
- New web searches must target sites/papers not yet referenced, ≤10 years old.
  **SATISFIED X43** (4 searches: anytime/admissible search allocation; Gemini 2026
  verified mathematics; per-script tokenization efficiency; Harmonic/Kimi/Mistral
  formal proofs).
- Every new codec must be repo-integrated (registry + implementation + bench
  receipts). ANALYSIS-ONLY IS REJECTED. **SATISFIED X43** — krisis registered,
  smoke-tested by key, 17 lanes verified.
- Maintain the spec page with greedy/non-greedy status, honest citation, time/CPU
  bound.
- Do not end the turn without a new codec added to the repo.
- X21: full A–J tier-5 structure; ≥15 negative-space shapes; ≥6 mechanism-distinct
  approaches.
- **X30/X41: attack speed as well** — encode time is in-scope, first-class metric.
  **X43 is the first turn to act on this.**
- X35: do not regress or duplicate PYKNOSIS, SYNCOPE, ANADIPLOSIS or EUTELEIA.
- **PER-TURN RESET IS REAL BUT RECOVERABLE FROM THE REMOTE.** Recovery: `git
  ls-remote --heads origin | grep 695387ad` **first**, then `git fetch -q origin
  <branch> && git reset -q --hard <remote-tip>`; recreate `bench/tmp/run.sh`;
  `npm install --no-audit --no-fund esbuild@^0.28.2 gpt-tokenizer@^3.4.0
  typescript@^5`; rewrite `/tmp/x41lanes.txt` (17 lanes). `/tmp/*` does NOT survive.
- **Never invoke bare `npx tsc`** (installs `tsc@2.0.4`). Use
  `./node_modules/.bin/tsc --noEmit` (3–9 s). **Never write a multi-line `git
  commit -m` with an apostrophe** — use `git commit -q -F <msgfile>`. Never
  force-push.
- **A template is only shippable if a reader can restore it BY POSITION in a short
  string.** `,` is excluded as a separator; template width capped at **≤14 digits**.
- **Never use a lookahead of the form `(?=(\d{3})+(?!\d))`** — Arcee Trinity Large
  (arXiv 2602.17004 §2.1.1) measured catastrophic backtracking.
- Only a prefix or suffix may be deleted from a number, never an interior position.
- An affix may only be deleted when it is 100 % constant across all occurrences.

# Workspace

**`main` = `666f509`. X43 tip = `3a14916` on `arena/695387ad-kompkernel` (PR #33).
X42 = `c24c454`/`e2633aa`. X41 = `f99c97a`/`bee4117`. X40 = `b5a990c`.**

- **`src/lib/omega/krisis.ts`** (NEW X43, tsc CLEAN, **registered index 33**) —
  KRISIS, wraps APOCOPE. Exports `krisisGate`, `krisisEncode`, `krisisDecode`,
  `KrisisGate`, `KrisisResult`, `KRISIS_OURA_CLAUSE=8`, `KRISIS_DEEPEN_RATIO=4`,
  `KRISIS_MAX_TRIALS=4`. `krisisGate` returns booleans for oura/antistrophe/
  peritrope/systole/apocope plus an `evidence` record and `gateMs`. `krisisEncode`
  passes them through as `{oura:false, ...}` opts to `apocopeEncode` and sets
  `antistropheTrials`. `krisisDecode` delegates verbatim to `apocopeDecode`.
- **`bench/x43/`** (NEW) — `X43.md` (616 lines incl. the post-search supplement) ·
  `screen0.ts` (intrinsic pool merge quality) · `screen1.ts` (**THE glyph
  reassignment refutation, on the real aapl payload**) · `screen2.ts` (**CHIRON
  budget sweep: rules=0 at every budget**) · `screen3.ts` (**layer-by-layer
  profile**) · `screen4.ts` (**auction 2 ms vs trial 12,036 ms**) · `screen5.ts`
  (lower-chain profile) · `screen6.ts` (**the gate premise, priced per lane**) ·
  `verify.ts` (**17-lane frontier match + timing**) · `wireq.ts` (**byte-identical
  wire check**) · `smoke.ts` (loads `krisis` by key from `codecEntries()`).
- `bench/x42/` — unchanged from X42; `smoke.ts` was sed-copied to `bench/x43/` and
  then **restored** via `git checkout --`.
- `src/lib/omega/apocope.ts` (X42, idx 32) · `systole.ts` (X41, idx 31) ·
  `peritrope.ts` (X40, idx 30) · `antistrophe.ts` (X39, idx 29) · `oura.ts` (idx 28)
  · `euteleia.ts` (27) · `anadiplosis.ts` (26) · `chiron.ts` (the base).
- **`registry.ts`** — export is **`codecEntries()`**, NOT `CODECS`. **206 codecs**;
  apocope 32, **krisis 33**. Long labels: write to `/tmp/labelNN.txt`, inject via
  python heredoc escaping `\\` then `'`. Insertion anchor that worked:
  `    {\n      key: 'chronos',`.
- **Key source facts learned in X43 (do not re-derive):**
  - `chiron.ts:144` — *"The first letter of the tape declares which script the wire
    uses, so nothing about the alphabet is transmitted."* **The alphabet is FREE.**
    X42's Floor 2 argument against glyph reassignment was WRONG on that point.
  - `chiron.ts:165 CHIRON_SCRIPTS` — hangul, katakana, cyrillic, arabic, myanmar,
    khmer, cjk, polyglot (Greek/Hebrew/Armenian/Georgian/Thai/Indic, 802 one-token
    chars). **NO LATIN SCRIPT.**
  - `chiron.ts:1344` — the script is chosen **ONCE, by minimum collision count**
    (`sort` on the number of distinct payload chars in each script's range), then
    reused for the entire variant sweep. Cost is never part of the decision.
  - `chiron.ts:1341` — `budgetMs = min(11_000, 800 + 1.1*len)`; `:1373` sweep capped
    at `min(26_000, 2.1*budgetMs)`.
  - `oura.ts:398-405` — OURA ranks by `est = spans.length * (k-1)`, a count of
    **CHARACTERS** removed, then runs up to **2 shapes × 3 modes = 6** full
    lower-stack encodes. `oura.ts:388` already short-circuits on
    `!shapes.length`.
  - `antistrophe.ts:279-291` — the auction prices up to 600 pairs by **measured raw
    delta** (`countTokens(swap) - base`), keeps only negatives, sorts, then runs
    `TRIALS = opts.antistropheTrials ?? 2` full `ouraEncode` calls. **This is the
    pattern KRISIS generalized.**
  - `peritrope.ts:231` — `peritropeEncode` honours `opts.peritropeSearch`
    (`{width, depth, cap}`), so the beam CAN be widened from outside.
  - Every layer computes `parent = <lower>Encode(text, enc, opts)` on the
    **UNMODIFIED** text, so gating on the source text is exactly right.
- **`bench/tmp/run.sh`** — esbuild bundle then `OMEGA_DET=1 node /tmp/_run.mjs`.
  Must be recreated after any reset. One job at a time.
- `docs/codecs.md` — now **4,652 lines** (X43 section + supplement appended).
- Lane dirs: `bench/holdout-tab/` (aapl-2014.csv, vix-daily-1990.csv) ·
  `bench/holdout-ops/` (git-numstat, find-listing, ls-full-iso,
  openstack-loghub-26.log) · `bench/holdout-work/` (bibliography, email-thread,
  kb-article, llm-answer.md, meeting-transcript, unified-diff.patch) ·
  `bench/holdout/` (11) · `bench/holdout-mk/` (7) · `bench/x30/fresh/`
  (**prose-01..12**).
- **Still never encoded through the full stack, available for X44:**
  `bench/holdout/{code-dts,code-ts,gh-api.json,gh-prose,json-pkg,lic-mit,license,
  md-react,md-vite}.txt`, `bench/holdout-work/{llm-answer.md,unified-diff.patch}`,
  `bench/x30/fresh/prose-{08..12}.txt`. Also unmeasured by X43: `openstack`,
  `git-numstat`, `vix`, `aapl`, `prose-02`, `prose-06`.

# Actions Taken

**X43 (COMPLETE — `3a14916`, pushed):**
1. Reset detected; `git ls-remote | grep 695387ad` → `c24c454`; fetch+reset; rewrote
   `run.sh` and `/tmp/x41lanes.txt`; `npm install`; `tsc --noEmit` CLEAN.
2. `bench/x43/screen0.ts` — intrinsic pool merge quality: lower-latin **1.04**
   tok/pair, latin-punct **1.02**, arith-symbols 1.54, cyrillic 1.71, greek 1.83,
   CJK 1.85, latin1-suppl 1.94, box-block 3.17, fullwidth 3.21, dingbat 3.86. All
   pools too small (need 75) for a direct remap, so this only motivated screen1.
3. Read the aapl message structure; read `chiron.ts:40-215`; found the wire is
   `§ RULES ¶ BODY` and the alphabet is **free** (`chiron.ts:144`). Found
   `chiron.ts:1344` chooses the script by collision count only.
4. `bench/x43/screen1.ts` — **glyph reassignment REFUTED BY MEASUREMENT** on the
   real aapl payload (65 rule letters, 697 occurrences, 463 tokens): latin-letters
   **−43**, latin+punct **−20**, latin+digits **−17**. Every alternative worse.
   Reason: rule glyphs sit next to *digits*, not each other.
5. `bench/x43/screen2.ts` — CHIRON budget sweep on kb-article + component.jsx:
   `msg=656/296` unchanged at budget default/4000/11000/26000 and workUnits
   20000/200000, with **script=none rules=0 blocks=0** in 29–185 ms. Budget-limited
   search **refuted** as the bottleneck.
6. `bench/x43/screen3.ts` — **layer profile of pom.xml (1,797 chars)**: chiron 203 ms
   →305; anadiplosis 9,865 →**242**; euteleia 6,659 →242; oura 33,424 →242;
   antistrophe 94,988 →242; peritrope 100,517 →242; systole 140,598 →242; apocope
   138,127 →242. **Six layers, 138 s, zero gain over the second layer.**
7. `bench/x43/screen4.ts` — split antistrophe's cost: `ouraEncode(text)` **36,505
   ms**; auction over 10 pairs **2 ms** (0.2 ms/pair, 5 negative); one
   `antistropheSwap` 0 ms; one `countTokens` 0 ms; **one TRIAL 12,036 ms**.
8. `bench/x43/screen5.ts` — lower chain: chiron 203 → anadiplosis 9,865 → euteleia
   6,659 → oura 33,424 ms.
9. Read `oura.ts:160-215` and `:375-412`; found OURA's character-count ranking and
   its 2×3 trial loop, and that it already short-circuits on no shapes.
10. `bench/x43/screen6.ts` — priced the gate premise on 7 lanes. Confirmed it fires
    on prose/code and preserves known winners, AND found the limit: pom.xml prices
    antistrophe −16 raw / clause 6 → KEEP but yields nothing, while ls-full-iso
    prices −9 / 5 → KEEP and IS the winner.
11. Wrote `src/lib/omega/krisis.ts`; `tsc --noEmit` CLEAN first try.
12. `bench/x43/verify.ts` run 1 (10 lanes) → **10/10 exact, all byte-exact**, best
    2.5× prose-04.
13. Injected the registry entry at index 33 via python heredoc (label 14,487 chars
    from `/tmp/label43.txt`); tsc CLEAN; `bench/x43/smoke.ts` loads `krisis` **by
    key**: 206 codecs, apocope 32, krisis 33, `gateMs=17`.
14. `bench/x43/verify.ts` run 2 as a background process (7 slow lanes) → **7/7
    exact**, **ls-full-iso 2.8×** (609→214.5 s), find-listing 1218 preserved with
    adaptive deepening firing (trials 2→4) and not changing the result.
15. `bench/x43/wireq.ts` → **WIRE IDENTICAL byte-for-byte on 4/4** lanes
    (component.jsx 886, kb-article 2777, meeting-transcript 1500, bibliography
    2158 chars).
16. Wrote `bench/x43/X43.md`; appended the X43 section to `docs/codecs.md`; patched
    both with the final 17-lane table and the wire-identity receipt; fixed stale
    lane counts.
17. `git checkout -- package.json package-lock.json tsconfig.tsbuildinfo
    bench/x42/smoke.ts`; `git add -A`; `git commit -q -F /tmp/x43msg.txt` →
    **`3a14916`**; pushed.
18. 4 `web_search` calls (2 in parallel, twice). Wrote the supplement into
    `bench/x43/X43.md` and `docs/codecs.md`. **That supplement is NOT yet committed.**

# External Sources

**New in X43 (web-search requirement satisfied, 4 searches):**

*On KRISIS's own mechanism — search allocation, not compression:*
- **arXiv 2607.27871** — *Search as Computation Allocation*. Formalizes exactly this
  class: *"Many algorithms spend an internal resource before returning a decision
  and are evaluated only by the quality of that terminal output."* Names it a
  **terminal computation-allocation problem**; Bellman equations for fixed budgets,
  priced computation and exact certification; derives weighted A\* from maximizing
  expected incumbent improvement (A\* at *w*=1, GBFS as *w*→∞).
- **arXiv 2610.22858** — *Uncertainty-Aware Budget Allocation for Efficient LLM Tree
  Search*. Closest published analogue of KRISIS's adaptive half: **training-free**,
  *"values determine which candidates are promising, while uncertainty determines
  how many merit expansion, via uncertainty-aware pruning"*; reduces token usage and
  inference time while maintaining accuracy across beam search and MCTS.
- **Anytime-WA\*** (arXiv 1110.2737), **ARA\***, **Rectangle Search** (arXiv
  2312.12554) — the weighted-admissible lineage: admissible *h* plus an incumbent
  upper bound prunes and bounds suboptimality by *w*. **KRISIS is a deliberately
  crude instance with NO incumbent to tighten against**, because it never runs the
  search it prunes.
- **arXiv 2601.11038** — the **Anytime Index**, quality-per-token across budgets;
  the right metric shape for a codec whose contribution is time.
- **arXiv 2609.00813 (AnySearch)** — a policy trained under *fixed* budgets fails to
  adapt when constraints vary at deployment; the failure mode a per-document gate
  avoids. **arXiv 2602.09574 (BG-MCTS)** conditions search on remaining budget.
- **arXiv 2602.10177 (Aletheia)** — DeepMind report the Jan 2026 advanced Gemini
  Deep Think cut compute for equivalent IMO-ProofBench performance by **~100×, two
  orders of magnitude, at equal graded quality**. The same pareto move as KRISIS,
  by training there and by pruning here.

*On tokenization by script (reconciles the glyph refutation):*
- **arXiv 2505.24689** — tokens/char under `o200k_base` on natural text: English
  **0.2152**, German 0.2128, Russian (Cyrillic) **0.2314**, Vietnamese 0.2688,
  Arabic 0.2976, Thai 0.3160, Hindi 0.3245, Hebrew 0.4163, Punjabi 0.4979, Japanese
  0.5268, Korean (Hangul) **0.5827**, Chinese (Han) **0.6260**. **Latin densest,
  Hangul/Han worst — the OPPOSITE ordering to what a rule alphabet wants.** The
  reconciliation: those are natural-text densities where within-script merging is
  trained-in; a rule alphabet is an arbitrary information-dense sequence embedded in
  a **foreign** context (697 glyph occurrences interleaved with digits and ASCII),
  where glyph-glyph adjacency is rare and the glyph-to-digit boundary decides.
  **Published per-script numbers do not transfer; price in-situ.**
- **arXiv 2602.11174** — *The Script Tax*: +19.7 % BPC for mBERT (8.06→9.65),
  **+47.1 %** for XLM-R (12.19→17.94); uses BPC to avoid the "NLL paradox".
- **arXiv 2610.01984** — *Universal Byte-Level Encoding*, UTF-8/UTF-16 routing; at a
  16K budget Greek **90.5** tokens vs English **34.7** and Cyrillic **75.4** —
  Greek worse than Cyrillic, matching this repo's intrinsic test (1.83 vs 1.71).
- **arXiv 2603.25309** — *Separate Before You Compress: WWHO*: 61.7–77.2 % token
  reductions for Sinhala/Hindi vs o200k, Llama 4 Scout, DeepSeek V3.
- **arXiv 2608.00582** (already cited) — new detail: removing base Cyrillic entries
  changes Ukrainian **−27.20 %** but the Cyrillic aggregate **+33.16 %**.

*Mathematics — per-lab, materially upgraded:*
- **ProofBench leaderboard (vals.ai, Oct 2026)** — **100 %: Claude Opus 5.5, Claude
  Fable 5.1 (Anthropic), AlephProver (Logical Intelligence)**; 99 % GPT-6 Astra
  (OpenAI) and Claude Opus 5; 95 % Claude Fable 5; **87 % Kimi K3 (Moonshot AI)**;
  **86 % Aristotle (Harmonic)**; 83 % GPT-5.6 Sol; **10 % Mistral Large 4**, 9 %
  Mistral Medium 3.5. **Anthropic now holds the top outright. Mistral is measured at
  the bottom, not merely absent.**
- **Harmonic / Aristotle** — **arXiv 2510.01346**: Lean proof search + informal
  lemma generation/formalization + a dedicated geometry solver; IMO 2025
  gold-equivalent, **5 of 6**, verified to foundational axioms with no human
  checking. Harmonic's own numbers: **83 %** with external CAS permitted, **63 %**
  restricted to Lean.
- **Erdős #728 — arXiv 2601.07421**, *"the first Erdős problem regarded as fully
  resolved autonomously by an AI system"*, GPT-5.2 Pro + Aristotle, operated by
  **Kevin Barreto**. **The appendix is the most instructive document found:** on Jan
  4 2026 a proof was announced, but the problem as stated was **vague with Erdős's
  intended interpretation unclear**; forum consensus emerged that it was a **partial
  result that did not resolve the problem**; on Jan 5 Barreto asked GPT-5.2 Pro if
  the argument could be upgraded, it said yes, Aristotle re-ran, and produced a
  formal proof on **Jan 6**. **The statement, not the proof, was the hard part, and
  a human community resolved it between two machine runs.** The Lean kernel
  certified both; only mathematicians could tell the first answered a different
  question. This is the Leiden Declaration's first threat instantiated, and the same
  gap Gemini's arXiv 2601.22401 Appendix A raises about *intended mathematical
  meaning*.
- **arXiv 2606.08728** (survey) — Erdős **#728, #729, #397** solved Jan–Mar 2026 by
  the same pipeline: GPT-5.2 Pro informal strategies, Aristotle Lean formalization,
  **human experts orchestrating translation and lemma decomposition**.
- **Second caveat on Aristotle's 86 %**, from the leaderboard's own methodology note
  (a model of Leiden-style disclosure): Aristotle submits a whole Lean file, so it
  may inline auxiliary lemmas others cannot; it developed ~**450 lines of supporting
  Krull-dimension theory**; it runs on Harmonic's infrastructure with no API setting
  to restrict tools; and evaluators **verified Aristotle searched the web on 60 of
  100 problems — and that it solved every problem on which it did not search.**
- **Harmonic Aristotle Agent** (March 2026) claims first fully autonomous 24-hour
  operation and **#1 on ProofBench** — **conflicts with the vals.ai leaderboard**
  (86 %, behind three systems at 100 %). Both recorded; the vendor claim is NOT
  preferred. **Erdős #124** completed Dec 2025 in ~**6 hours**, verification **1
  minute**. New to the record: **Axiom** launched Oct 2025; **Velvet**, a Lean
  verifier for imperative programs.
- **Google / Gemini — a genuinely NOVEL theorem.** **13–14 Jan 2026**, DeepMind
  (**Freddie Manners**, **Georgios Salafatinos**, Blueshift team) with **Jim Bryan**
  and **Balázs Szendrői**: a novel theorem in **algebraic geometry**, *"very
  substantial input"* from **Gemini 2.5 Deep Think** and an **unpublished internal
  system FullProof**; **arXiv 2601.22401**, *Semi-Autonomous Mathematics Discovery
  with Gemini*; solution not in the training data. **Ravi Vakil**: *"rigorous,
  correct, and elegant"*, revealing *"a latent structure the mathematicians hadn't
  previously foreseen"*. **AMS president**: *"the kind of insight I'd be proud to
  produce myself."* **The paper's own qualification:** an *iterative human/AI
  interaction* in which the systems solved special cases but **could not generalize
  them to the full problem even given those solutions as context**; a hinted
  approach sufficed thereafter. Humans directed the argument. **Appendix A** is a
  case study on whether a *formally verified* proof addresses the **intended
  mathematical meaning**.
- **Aletheia** (arXiv 2602.10177; Berkeley PDF 16 Feb 2026) — DeepMind math research
  agent on Gemini Deep Think, deployed **2–9 Dec 2025**, generates/verifies/revises
  **end-to-end in natural language** under a novel inference-time scaling law, all
  results human-graded.
- **Gemini/DeepMind other facts** — IMO gold **officially certified July 2025**,
  35/42, confirmed by IMO president **Gregor Dolinar**, 5 of 6 in natural language
  in 4.5 h. **Gemini 3 Deep Think** leads IMO-Bench Advanced ProofBench at **76.7 %**
  (4 Feb 2026). **AlphaProof Nexus**: **9 of 353** Erdős problems AND **44 of 492**
  open **OEIS** conjectures, a few hundred dollars per problem, Lean-verified;
  **Hassabis**: *"still not AGI."* **AlphaEvolve** (arXiv 2511.02864; Georgiev,
  Gómez-Serrano, **Tao**, Wagner): 67 problems — **23 improved, 36 matched, 8 not
  matched**.
- **Moonshot AI** (largest addition to the per-lab record) — **Kimi K3 87 %**
  ProofBench; **Kimina-Prover 92.2 %** miniF2F with the **first published scaling
  laws for theorem proving** (Apr/Jul 2025).
- **Shanghai AI Laboratory** (new) — **16 Oct 2026**, **Shusheng-S2** helped close a
  **31-year-old conjecture** with an **independent machine-verified Lean proof**.
- **DeepSeek** — **DeepSeek-Prover-V2**: 88.9 % miniF2F (671B), **49/658**
  PutnamBench; DeepSeekMath-V2 verifier-first + meta-verifier (unchanged).
- **xAI and Meta: still NO research-level mathematical result**, and neither appears
  anywhere on the ProofBench leaderboard. Absence reported, not filled.
- **Mistral**: now **measured** at 9–10 % ProofBench rather than merely "no result".

**Still holding from X41/X42 (do not re-fetch):** Leiden Declaration (2 Jun 2026,
arXiv 2609.35334, IMU-endorsed, 23 recommendations, 1,854 signatures in a week,
>3,000 by August; Scholze: *"I am pondering my mathematical ideas without use of
AI"*) · "A Severe Misalignment of AI in Mathematics" (11 Sep 2026, **25 Fields
Medalists**, >7,200 signatories) · DeepSeekMath-V2 (arXiv 2511.22570, 685B, α=0.76
/ β=0.24, meta-verifier load-bearing: verifier analysis quality 0.85→0.96 —
**⇒ the `handcheck.py` files are meta-verifiers; keep the pattern**) · OpenAI 6 Oct
2026 (722 manuscripts / 372 families, 3 withdrawn over a **sign error**, ~42 % Lean,
no prompts, unreleased model) · calibration: of 700 open Erdős problems surveyed Jan
2026, **13 addressed, 5 seemingly new, 8 already in the literature** · GPT-6 Astra
(10 problems, Lean 4, sorry 0, ~$2,000) · arXiv 2604.13066 (dictionary-encoding +
ICL, needs a **system prompt**, which this repo forbids) · arXiv 2605.29000
(regular deletion beats random at high retention) · arXiv 2609.35475 (spontaneous
context restoration emerges without a denoising objective) · arXiv 2604.13006 ("don't
use commas" shrinks responses up to 48 %) · arXiv 2410.11781 (numbers as orthogonal
circular per-digit base-10 representations) · arXiv 2402.14903 (Singh & Strouse,
`\p{N}{1,3}` chunks left-to-right, cuts AGAINST this codec family) · arXiv
2602.17004 §2.1.1 (Arcee Trinity Large, catastrophic backtracking) · arXiv
2605.02028 (126 model variants, all with finite counting capacity) · arXiv
2508.02591 (CharBench tradeoff) · arXiv 2605.00817 (63 % at 5 steps → 20 % at 95) ·
arXiv 2602.13266 (LoPace: token-level lossless only **1.02×**, range 0.74–2.05) ·
arXiv 2506.00307 (LTSC meta-tokens 27 %/18 %) · TOON + McMillan (38 % MORE tokens,
χ²=2.45, p=0.484) · SilverSpeak 2406.11239.

# Errors & Dead Ends

- **Per-turn reset recurred at X41, X43 starts.** Branch name was **unchanged** at
  X43 (`arena/695387ad-kompkernel`) — still check with `git ls-remote` first.
- **`/tmp/*` does not survive.** `bench/tmp/run.sh`, `/tmp/x41lanes.txt`,
  `/tmp/label*.txt` must all be recreated.
- **X43: `screen0.ts`'s intrinsic pair-merge test is the WRONG measure for alphabet
  choice.** Latin scores 1.02–1.04 tok/pair in isolation yet makes the real payload
  **worse** by 17–43 tokens, because rule glyphs sit next to digits, not each other.
  Any future alphabet work must be priced **in-situ on the real payload**.
- **X43: X42's Floor 2 rationale was WRONG even though its conclusion was right.**
  The alphabet is free (`chiron.ts:144`); reassignment still fails, for a different
  and now-measured reason. Record both.
- **X43: source-raw deltas DO NOT predict stack-level success.** pom.xml antistrophe
  −16 raw → no gain; ls-full-iso −9 raw → is the winner. Likewise page.html systole
  raw net +27 → no gain, dump.sql +67 → no gain. **No test computed on the source
  text alone can separate these.** This is a property of the stack, not of the gate,
  and it independently explains why X42's APOCOPE priced 756 raw on vix and
  delivered zero.
- **X43: a 900 s foreground timeout is too short for multi-lane sweeps.** Run them
  with `start_process` and poll with `wait_for: exit`, `wait_timeout: 180`.
- **X42: `screen2.ts` reported every lane MISSING** — `LANES` holds full relative
  paths; test `existsSync(name)` before appending `.txt`.
- **X42: `\p{Cyrillic}` is NOT a valid JS regex property name** — use
  `\p{Script=Cyrillic}`.
- **X42: screen1/screen2 raw-saving predictions UNDER-measure by >2×**; always
  confirm with a full `encode(source)` vs `encode(cut)` comparison.
- **X41: `systoleUndo` restores any digit run of matching length** — corrupts native
  runs; fix is to SKIP the offending template.
- **X41: slot contention** — a weak shape claiming a digit count in pass 1
  permanently blocked a far better one; fix is the `blocked` guard. Both X41 fixes
  (fixed-point loop + `blocked`) are inherited by `apocopeChoose`; do not revert.
- **The clause must not end in a period.** Shape strings are COUNTS not digits.
  Run lookahead must not exclude adjacent separators. Over-wide runs must be TRIMMED
  at separator boundaries, not refused.
- **Retained dead mechanisms (do not repeat):** QAP/pool/script-hunting ·
  post-grammar re-spell · cross-script · CHIRON blocks · prefix/LCP · glossary delta
  · min-cost segmentation · brotli/gzip floor · one-way digit respelling ·
  digit↔letter swap · rule-set pruning · SLP glossary · OURA variants ·
  fixed-precision zeros (without template framing) · column padding ·
  message-level delimiter swap · **in-situ CHIRON glyph reassignment (X43: now
  refuted by direct measurement, all alternatives worse)** · separator stripping on
  wire · formatting elisions (wsRLE +1358) · near-repeat delta spans · glossary
  reordering · columnar transpose · comma→space · substitution to an ABSENT target ·
  swaps involving `\n` or digits · delta encoding of monotone numeric runs · widening
  the swap pool to typographic/Unicode punctuation · LCP deletion (−14 on all 17) ·
  case folding (7/17 lanes negative) · phrase-level n-gram dictionaries on prose
  (saturation ratio >1 everywhere) · field-level RLE within a record · arithmetic
  progressions in chart.svg · **APOCOPE constant-affix elision (zero gain, slower)**
  · **raising CHIRON's budgetMs / workUnits (X43: rules=0 at every setting)** ·
  **any mechanism that removes redundancy rather than changing tokenization
  boundaries.**

# Key Results

**X43 KRISIS (`3a14916`, idx 33) — ZERO TOKENS BY DESIGN, UP TO 2.8× FASTER,
BYTE-IDENTICAL WIRES.** A clause-cost admissibility gate on the stack's trial tree:
**skip layer L iff bestRawDelta(L) + clauseCost(L) ≥ 0**, plus adaptive deepening of
ANTISTROPHE's trial count when evidence is strong (`KRISIS_DEEPEN_RATIO=4`, cap 4).

**The profile that produced it** (`bench/x43/screen3.ts`, pom.xml, **1,797 chars**):

| layer | time | msg |
|---|---|---|
| chiron | 203 ms | 305 |
| anadiplosis | 9,865 ms | **242** |
| euteleia | 6,659 ms | 242 |
| oura | 33,424 ms | 242 |
| antistrophe | 94,988 ms | 242 |
| peritrope | 100,517 ms | 242 |
| systole | 140,598 ms | 242 |
| apocope | 138,127 ms | 242 |

**Six layers, 138 s, every one returning the value the second layer reached in
9.8 s.** At real sizes: 814 s for a 6.5 KB CSV, 609 s for an ls listing, **2,393 s
for a log file**, 328 s / 261 s for prose-03 / prose-05 against 8.8 s for prose-01.

**Where the time goes** (`screen4.ts`, pom.xml): `ouraEncode(text)` **36,505 ms**;
auction over 10 pairs **2 ms** (0.2 ms/pair, 5 negative); **one TRIAL 12,036 ms**.
The auction is free; the trials are not. Depth *d* with *t* trials is **O(t^d)**
lower-stack encodes.

**Soundness.** `bestRawDelta` is measured on the **source** before the lower stack
runs, and X42 established ~**20×** attenuation (aapl 915→43, vix 504→29), so it is
an **optimistic bound**: if the optimistic bound cannot repay the clause, the
realistic value cannot. **The gate can only skip a layer that was going to lose.**
It is *not* a lower bound on the final message — none exists cheaply, since X42
proved `sum(ceil(W/3))` tight for bare runs but the dictionary beats it.
**Admissibility pruning is claimed, not optimality.**

**Verified: 17 of 17 lanes, exact token match AND byte-exact round trip.**

| lane | KRISIS | frontier | time | X42 | speedup | gated off |
|---|---|---|---|---|---|---|
| **ls-full-iso** | 366 | 366 | **214.5 s** | 609 s | **2.8×** | oura, apoc |
| prose-04 | 836 | 836 | **15.2 s** | 37.7 s | **2.5×** | oura, anti, syst, apoc |
| prose-07 | 809 | 809 | **17.6 s** | 34.7 s | **2.0×** | oura, anti, syst, apoc |
| prose-05 | 920 | 920 | **159.2 s** | 261 s | **1.6×** | all five |
| email-thread | 488 | 488 | 48.5 s | 73 s | **1.5×** | oura, apoc |
| prose-03 | 837 | 837 | **246.6 s** | 328 s | **1.3×** | anti, syst, apoc |
| component.jsx | 264 | 264 | 8.9 s | 8 s | 0.9× | all five |
| kb-article | 622 | 622 | 6.7 s | 7 s | 1.0× | all five |
| prose-01 | 737 | 737 | 8.5 s | 8.8 s | 1.0× | all five |
| meeting-transcript | 384 | 384 | 8.1 s | 8 s | 1.0× | oura, anti, peri, apoc |
| bibliography | 667 | 667 | 41.3 s | 42 s | 1.0× | oura, anti, peri, apoc |
| readme | 646 | 646 | 37.9 s | 36 s | 1.0× | oura, syst, apoc |
| page.html | 547 | 547 | 83.8 s | 81 s | 1.0× | oura, anti, peri, apoc |
| dump.sql | 608 | 608 | 294.4 s | 292 s | 1.0× | oura, anti, peri, apoc |
| find-listing | 1218 | 1218 | 294.7 s | 299 s | 1.0× | oura, apoc (trials 4) |
| pom.xml | 242 | 242 | 135.7 s | 129 s | 1.0× | apoc |
| chart.svg | 417 | 417 | 42.3 s | 35 s | **0.8×** | oura, syst, apoc (trials 3) |

Mean **1.3×**. Gate cost **12–761 ms**. **ls-full-iso is the important case:
ANTISTROPHE *is* the winner there and KRISIS kept it while gating OURA and APOCOPE
around it.** chart.svg at 0.8× is the bounded cost of adaptive deepening where the
extra trial did not pay — the only lane measured slower.

**The stronger receipt** (`bench/x43/wireq.ts`): `krisisEncode` vs ungated
`apocopeEncode` in the same process → **WIRE IDENTICAL byte-for-byte on 4/4**
(component.jsx 886, kb-article 2777, meeting-transcript 1500, bibliography 2158
chars). Not a different message that costs the same — **the same message**, so
single-chat-box decodability is inherited unchanged and needs no new argument.

**Registry smoke** (`bench/x43/smoke.ts`): loads `krisis` **by key** from
`codecEntries()` — **206 codecs**, apocope 32, **krisis 33**, label 14,487 chars,
family/fidelity `exact`, `gateMs=17`.

**Glyph reassignment REFUTED BY MEASUREMENT** (`screen1.ts`, real aapl payload: 65
rule letters, 697 occurrences, 463 tokens; payload total 1370):

| target pool | usable | remapped | tokens | delta |
|---|---|---|---|---|
| current Cyrillic/polyglot | 65 | — | **1370** | — |
| latin-letters | 47 | 47/65 | 1413 | **−43** |
| latin+punct | 75 | 65/65 | 1390 | **−20** |
| latin+digits | 57 | 57/65 | 1387 | **−17** |

Intrinsic merge quality (`screen0.ts`, tok/pair on adjacent pool chars): latin-punct
**1.02**, lower-latin **1.04**, arith-symbols 1.54, cyrillic 1.71, greek 1.83, CJK
1.85, latin1-suppl 1.94, box-block 3.17, fullwidth 3.21, dingbat 3.86. **The
intrinsic test is the wrong measure** — glyphs sit next to digits, not each other.

**CHIRON's grammar contributes NOTHING on prose/code** (`screen2.ts`): kb-article
and component.jsx both return the **raw fallback** with `script=none rules=0
blocks=0` in **29–185 ms**, unchanged at budgetMs default/4000/11000/26000 and
workUnits 20000/200000. **Not out of time — nothing to find.**

**X42 APOCOPE (idx 32)** — zero gain on all 17 lanes plus 11 held-out files;
**slower** where it triggers (vix 705→814 s, aapl 289→418 s). **X41 SYSTOLE (idx
31)** — still the frontier on two lanes: aapl 1450→**1407 (−43)**, vix 579→**550
(−29)**, bibliography 671→**667 (−4)**, meeting-transcript 385→**384 (−1)**.
Independent decode md5 `d23206346603f7eed8815e6432956f71` (X41) and
`10481361b3b879c04d1f3037de9dfcb3` (X42). **X40 PERITROPE**: find-listing 1218
(−24), git-numstat 1906 (−17), openstack 894 (−4).

**X42's three floors still stand:** (1) `ceil(W/3)` is a hard floor for digit runs,
proven exhaustively over all **1,110,000** digit strings of length 1–6 — lengths
1/2/3 single-token 100 %, lengths 4/5/6 **0.00 %**; aapl payload 823 digit tokens
= `sum(ceil(W/3))` exactly, **headroom zero**. (2) The non-digit layer runs at
**8.66 bits/token**, above the 8-bit byte ceiling. (3) The decisive measurement:
removing **1,638 raw tokens** from vix (3412→1774) moved the compressed size by
**ZERO** — the stack is pinned to information content, not raw size.

**FRONTIER — UNCHANGED (raw / best-known):** vix 3412/**550** · aapl 3108/**1407** ·
openstack 4028/894 · dump.sql 1795/608 · git-numstat 4632/1906 · npm-ls 2747/901
(**UNMEASURABLE**, 992.5 s parent) · find-listing 3997/1218 · ls-full-iso 1175/366 ·
kb-article 656/622 · prose-01 785/737 · readme 843/646 · bibliography 896/**667** ·
email-thread 629/488 · chart.svg 1331/417 · page.html 3220/547 ·
meeting-transcript 472/**384** · component.jsx 296/264 · pom.xml 544/242. Fresh
prose holdouts: prose-02 **789**, prose-03 **837**, prose-04 **836**, prose-05
**920**, prose-06 **840**, prose-07 **809**.

**Local leaders by structural category:** high-entropy numeric columns → **SYSTOLE**
(aapl −43, vix −29) · path-heavy ops listings → **PERITROPE** (find-listing −24,
git-numstat −17) · tabular constant columns → ANADIPLOSIS/EUTELEIA (17.0 %) ·
grouped-hex ops → SYNCOPE (22.3 %) · DB dumps/bulk hex → PYKNOSIS (33.9 %) ·
markup/code/tables → OIKONOMIA/TIMEMA (17–46.7 %) · **encode time, all categories →
KRISIS (≤2.8×, zero token cost)** · **prose → NONE; 0 of 12 lanes moved X33–X43.**

**What is left for X44, in priority order:**
1. **The exact remaining gap in KRISIS, and the highest-information test available.**
   The gate cannot separate pom.xml (antistrophe −16 raw → no gain) from
   ls-full-iso (−9 raw → is the winner), because both are judged on the source
   before the lower stack runs. **Test: price the same auctions against
   `chironEncode`'s output** — 203 ms on pom.xml, **178× cheaper** than the 36.5 s
   `ouraEncode` trial it would replace — and measure whether post-chiron delta
   separates the losers from the winners. If yes, the gate becomes predictive and
   the eight 1.0× lanes move. If no, no cheap predictor exists and the trial tree is
   irreducibly expensive. Either answer is worth having.
2. **Memoize the trial tree.** Nothing caches lower-stack results across layers;
   memoization keyed on (text, enc, disabled-flags) is *provably* output-identical,
   unlike gating. Duplicate rate is unmeasured — measure call counts first.
3. **OURA's ranking is by character count, not tokens** (`oura.ts:398`), and it runs
   up to 6 full lower-stack encodes on that heuristic. Replacing `est` with a
   measured raw delta would mirror ANTISTROPHE's proven auction — but it modifies an
   existing codec, so all 206 would need re-verification.
4. **Deepen the PERITROPE beam where evidence is strong.** `peritropeEncode` already
   honours `opts.peritropeSearch = {width, depth, cap}`, and PERITROPE's own record
   says returns were *not* diminishing at depth 3 (−408, −421, −425 on git-numstat).
   Current defaults DEPTH=5, CAP=10. Untested — but expect only a few tokens after
   ~10–20× attenuation.
5. **Prose remains uncracked by five routes.** CHIRON finds zero rules; dictionaries
   are saturated; case folding is dead; digits are at their floor; glyphs are at
   theirs. A prose mechanism must change **what the reader does**, which trades
   tokens against comprehension (CharBench bound), or it must be something none of
   these five routes covers.

Timings (2 cores, benches must run ALONE): tsc 3–9 s · npm install 20 s · cheap
screens 0.5–1.5 s · `screen2` 1.4 s · `screen3` 475 s · `screen4` 49 s · `screen5`
51 s · `screen6` 0.75 s · `wireq` 114 s (4 lanes, both encoders) · per-lane
full-stack 6–814 s · **the X43 17-lane verification totalled ~2,100 s across two
runs.**
