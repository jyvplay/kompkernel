# Session memory (compact) — X41

## Branch / remote
`arena/695387ad-kompkernel` = **`bee4117`** (X41). Pushed. **PR #33** open:
https://github.com/jyvplay/kompkernel/pull/33 . `main` = `666f509`.
X39 = `cf99d85`, X40 = `b5a990c`.
**PER-TURN RESET IS REAL.** Recovery (worked this turn):
`git ls-remote --heads origin | grep <old-branch>` → `git fetch -q origin arena/695387ad-kompkernel`
→ `git reset -q --hard b5a990cf8231835d20501ba8dcffb4f234233032` → recreate `bench/tmp/run.sh`
→ `npm install --no-audit --no-fund esbuild@^0.28.2 gpt-tokenizer@^3.4.0 typescript@^5`
→ `git checkout -- package.json package-lock.json tsconfig.tsbuildinfo` before committing
(npm install dirties them).

## X41 SYSTOLE — DONE (registry index 31)
`src/lib/omega/systole.ts`. Wraps PERITROPE (30). Removes separators inside structured
numbers, restores them by template. **First mechanism here that pays without repetition.**

**Measured, byte-exact, independent reference decoder:**
| lane | PERITROPE | **SYSTOLE** | templates |
|---|---|---|---|
| aapl | 1450 | **1407** (−43) | `10:2.8` `9:2.7` `8:4-2-2` |
| vix | 579 | **550** (−29) | `8:2.6` |
| bibliography | 671 | **667** (−4) | `6:3-3` `8:4-4` |
| meeting-transcript | 385 | **384** (−1) | `6:2:2:2` |

All other lanes re-measured EXACT at prior values (find-listing 1218, ls-full-iso 366,
dump.sql 608, pom.xml 242, page.html 547, chart.svg 417, email-thread 488).
**Independent decode:** `bench/x41/handcheck.py` (Python, from clause text alone, does NOT
import systole.ts) → md5 `d23206346603f7eed8815e6432956f71` both sides, all 241 aapl lines.

**Key constants:** `SYSTOLE_SEPS = ['.',':',';','-']` (`,` excluded — merges CSV rows into
40-digit blobs AND collides with the clause list separator) · `MAX_DIGITS=14` ·
`MIN_DIGITS=3` · `MIN_COUNT=3` · `MIN_RAW=20` (pre-filter skips 2nd parent encode) ·
`MAX_TEMPLATES=3`.

**The measurement that chose it (`bench/x41/diag.ts`):** vix 3408 pre-tokens / 3412 tokens
= 1.0 tok/pre-token. BPE buys nothing. Floor is `\p{N}{1,3}`. `dig>3` = 37–38 % of raw
tokens on vix/aapl. `2026-09-30T07:59:52.6403938810` = 17 pre-tokens → stripped = 10.
**LCP gain = −14 on EVERY lane** — line-prefix elision is dead, do not revisit.

**Three constraints, all for the reader:**
1. Width ≤14 digits. **arXiv 2605.02028**: 126 model variants, ALL have a finite counting
   capacity far below nominal context. Refused the −1512 raw vix row-template on principle.
2. One template per digit count (reader IDs a stripped run by length). vix forgoes 378.
3. Invertibility + unambiguity. Caught: `113525`→`11:35:25`, `00000000b09b…`→`0000-00-00`,
   `800 400`→`8.00 4.00`, `2026`→`20:26`.

**Two selection corrections (both cost most of the gain when wrong):**
- Ambiguity is NOT monotone: aapl `4-2-2` ambiguous alone, fine with `2.8`. One pass 201/915;
  fixed point 915.
- A weak template must not claim a slot a stronger one is reaching for (`2.6` 6 raw stole
  the 8-digit slot from `4-2-2` 720 raw).

**Clause:** `Restore separators: 10:##.########, 9:##.#######, 8:####-##-##` — **no trailing
period** (a literal reader could parse `####-##-##.` as a spurious 4th separator); the
contract's ` print only.` terminates it.

**Honest gap:** aapl 915 raw → 43 (4.7 %), vix 504 → 29 (5.8 %). Eleven further lanes with
measurable raw separators → zero. The stack's dictionary/shape rules already capture
separator structure wherever numbers REPEAT; only the high-entropy case survives.

## Frontier (restated after X41)
vix 3412/**550** · aapl 3108/**1407** · openstack 4028/894 (not re-run; screen4 chosen=0
templates → unchanged) · dump.sql 1795/608 · git-numstat 4632/1906 · npm-ls 2747/901
(**UNMEASURABLE**: `ouraEncode` alone = 992.5 s on 6,688 chars — parent pathology) ·
find-listing 3997/1218 · ls-full-iso 1175/366 · kb-article 656/622 · prose-01 785/737 ·
readme 843/646 · bibliography 896/**667** · email-thread 629/488 · chart.svg 1331/417 ·
page.html 3220/547 · meeting-transcript 472/**384** · component.jsx 296/264 · pom.xml 544/242.

## Generalised local leaders by structural category
- **High-entropy numeric columns (unique values)** → **SYSTOLE** (aapl, vix). Only a
  separator survives the dictionary when nothing repeats.
- **Path-heavy ops listings** → PERITROPE (find-listing −61 vs OURA).
- **Tabular constant-across-columns** → ANADIPLOSIS/EUTELEIA (17 %).
- **Grouped-hex ops** → SYNCOPE (22.3 %). **DB dumps / bulk hex** → PYKNOSIS (33.9 %).
- **Ops w/o hex, distinct-column tables, markup/code** → OIKONOMIA/TIMEMA (17–46.7 %).
- **Prose → NO codec.** 0/10 across X33–X41. Bibliography (−4) and meeting-transcript (−1)
  are the only prose-adjacent lanes to move at all, and only because of dates/timestamps.
  Three independent confirmations: hapax census, `nearDup=0`, and X41's repeat budget
  (prose-01 `repeat`=43 vs 48 already achieved → saturated).

## New external sources (X41; none referenced before)
**Digit chunking / pre-tokeniser:** dev.to/ji_ai 2026 (confirms `\p{N}{1,3}`, L2R chunking,
comma = hard boundary forcing R2L place alignment) · **arXiv 2402.14903** Singh & Strouse
(L2R → 8.25 % under length mismatch; stereotyped "digit 4" error) · **arXiv 2602.17004**
Arcee Trinity §2.1.1 (place-aligned chunking; zero-width lookahead `(?=(\d{3})+(?!\d))`
has CATASTROPHIC BACKTRACKING → minutes; 3-stage fix) · arXiv 2510.06824 · 2502.09741 FoNE
· 2601.09706 · **arXiv 2601.14658** (tokenizers produce NON-UNIQUE encodings).
**LLM counting / the tradeoff:** **arXiv 2605.02028** (126 variants, all finite CC) ·
**arXiv 2508.02591 CharBench** ("tradeoff between token-level compression and the ability
to reason about character-level structure" — the bound this whole stack lives on;
find_first > find_last) · arXiv 2605.00817 (63 %@5 steps → 20 %@95) · 2502.11075 ·
2608.13129 · EMNLP25 findings 1264.

## Math proofs — status tracked further this turn
**Verification completeness tracks ARTIFACT SIZE and REPRODUCIBILITY, not importance.**
- Jacobian (Alpöge/Claude Fable 5, 19 Jul 2026), 216 chars, det ≡ −2: **3 independent
  formalizations** — Lean PR #4474 (approved, CI 1h39m, still unmerged), Zenodo 21514514
  (3003/3003 jobs, 0 sorry, independent `MvPolynomial.pderiv` derivation), Isabelle/HOL AFP
  `Jacobian_Counterexample`. Tao tracks it as *pending peer review*.
- **Carathéodory counterexample** 19 Aug 2026, C^∞, checked with John-Paul Smith + Claude.
- **Hopf problem (S⁶ complex structure)** 23 Aug 2026, **100-page** document; Lean
  formalizations by Dean Cureton and **Boris Alexeev (OpenAI)**; notes by Philip Engel;
  Bryant: "emerging consensus that the construction is **plausible**"; SciAm + Spektrum:
  **unverified**. ← the instructive middle case.
- **Navier–Stokes** (OpenAI, 8 Sep 2026), 166 pp: no preprint, no arXiv, no public Lean
  repo, self-assessed, **nobody outside OpenAI has seen it**; Clay status *active*;
  Buckmaster+Alpöge priority dispute.
- **OpenAI 6 Oct 2026**: 722 manuscripts / 372 families / ~4,000 attempted, ~3 h each,
  mostly one prompt to one agent. **3 withdrawn next day over a SIGN ERROR** + 14 revised;
  ~42 % Lean (~58 % unchecked prose); AGMAI (9 members, Princeton IAS) recommended 29 Sep
  that labs disclose model+prompts+compute — repo publishes compute, **no prompts**, model
  unreleased → **nobody can rerun it**. Claims incl. quasi-Riemann (7/8 statement), UGC,
  Hodge for CM abelian varieties (no Lean).
- **Google DeepMind AlphaProof Nexus — 9 of 353 Erdős problems (2 open 56 yrs), PEER
  REVIEWED in Science, Oct 2026.** The only lab with a completed review.
- **OpenAI GPT-6 Astra** (2 Aug 2026): 10 problems, Lean 4, **sorry=0**, ~$2,000 compute,
  mechanically re-runnable by anyone; peer review pending.
- **Erdős unit distance** (May 2026, arXiv 2605.20695): 9 mathematicians incl. Alon, Blum,
  Gowers, Wood — best-verified single result of the year.
- **Calibration to carry forward:** DeepMind Jan 2026 Erdős survey — 13 addressed, **5
  new, 8 already in the literature**.

## Standing instructions (never drop unless reversed)
Byte-perfect exact lossless round trip · wire decodable by a bare LLM in ONE chat message
(no system prompt/skills/tools) · honest tool calls only, no fantasy execution, no Lean
toolchain installed · prefer general gains on everyday prose/ops · Rosetta = analysis only ·
no benchmaxxed codec · every codec repo-integrated (registry + impl + bench receipts) ·
keep `docs/codecs.md` updated (greedy vs not, honest citation, time/CPU bound) ·
**do not end a turn without a new codec** · never bare `npx tsc` · never a multi-line
`git commit -m` with an apostrophe (use `-F <msgfile>`) · never force-push ·
**benches must run ALONE** (`nproc`=2) · chunk multi-lane sweeps (3–6 lanes/process).

## Correct lane paths (hand-typed ones have been wrong twice — copy these)
`bench/holdout-tab/{vix-daily-1990.csv,aapl-2014.csv}` ·
`bench/holdout-ops/{openstack-loghub-26.log,git-numstat.txt,npm-ls.txt,find-listing.txt,ls-full-iso.txt}` ·
`bench/holdout-work/{kb-article.txt,bibliography.txt,email-thread.txt,meeting-transcript.txt,llm-answer.md,unified-diff.patch}` ·
`bench/holdout/readme.txt` · `bench/holdout-mk/{dump.sql,chart.svg,page.html,component.jsx,pom.xml}` ·
`bench/x30/fresh/prose-0{1..6}.txt`. `bench/corpus/` does NOT exist.
List saved at `/tmp/x41lanes.txt` (17 lanes, no npm-ls).
