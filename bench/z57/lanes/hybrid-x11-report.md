# X11 report: AKOLOUTHIA-2, frontier re-run, ultrareview state

Branch `arena/95aaefc1-kompkernel`, base `d422359`. Measurement: o200k_base tokens of contract plus wire, one chat message, no system prompt, byte-exact on every reported lane.

## Result in one paragraph

A new codec, **AKOLOUTHIA-2**, is built, registered as `akolouthia2`, and committed with receipts. It is exact on 43/43 lanes and passes its red team (40 TypeScript cases, 0 failures; CPython reader 32/32 messages, 0 mismatches). Against plain DAEDALUS it is −413 tokens in total over 43 lanes. It beats the frontier-minimum on 6 of 17 re-run lanes by more than a few tokens: chart.svg −135, df-h −108, kubectl −60, psql −42, vix −21, dump.sql −22. **It gives no prose gain**, so the general-prose goal is not met. It also loses to a frontier member on `git-numstat` (+132). The success predicate in the task is **not** met for general prose or ops lanes. The result is a narrow structured-number gain, not a general one.

## A. Frontier re-run

- Command: `bench/tmp/run.sh bench/z52/frontier-min.ts` with `FM_KEYS=daedalus,daedalus-dual,phalanx-a10,dendron,dendrons,gramma,akolouthia2`.
- Receipts: `bench/z56/receipts/frontier-v2-lanes.jsonl` (17 rows), `.err`.
- Lanes: 18 selected, 17 finished. `package-lock-head.json` (40 KB) timed out past 30 minutes on A10 and was stopped. Budget was 1500 s. Not measured.
- Comparator used in this report: min(DAEDALUS, DAEDALUS-D, A10, DENDRON, DENS-2, GRAMMA), i.e. frontier-min without AKOLOUTHIA-2. PARADEIGMA is not in this run.
- Naming: `phalanx-a10` is labelled PHALANX-A10 in the registry; the z55 report calls A10 "PARADEIGMA + DAEDALUS-D". The two descriptions do not match. The composition claim is not verified.
- Restated frontier (17 lanes): AKOLOUTHIA-2 is the frontier member on structured-numeric and ops-table lanes; DENS-2 leads on listings and numstat; DAEDALUS-D and DAEDALUS trade places on prose by 0–5 tokens (mixed); A10 is worse than DAEDALUS on every lane (+10 to +239).

## B. Generalized leaders (see `docs/codecs.md`, table)

Prose: mixed between DAEDALUS-D and DAEDALUS (0–5 tokens). Logs and stack traces: identity for all. Listings: DENS-2. Numstat table: DENS-2 (−132 vs AKOLOUTHIA-2). Ops tables: AKOLOUTHIA-2. Structured numeric: AKOLOUTHIA-2. JSON lockfile: not measured for frontier.

## C. Codebase and open PRs

- Open PRs were listed with `gh pr list --state open` and their heads fetched into `refs/remotes/origin/*`.
- PR #30 (this branch lineage): DENDRON, DENS, GNOMON, SYNARTESIS, AKOLOUTHIA. Unmerged. Ours.
- PR #23 `optimal.ts`: a tournament selector. Rejected as a non-tournament path.
- PR #17 `codec-map.ts`: a map, not a codec.
- PR #2 modules (`chronos-x1.ts`, `oblivion.ts`, `pallas.ts`, `starlight-prime.ts`, `terminus.ts`, `yggdrasil.ts`): need system-prompt rule sets. Excluded by the no-system-prompt constraint.
- PR #27 and PR #28: `gh pr view` metadata read. **Combinability not reproduced. The PR #28 classifier-fix claim not checked.** Downgraded.
- Not reviewed in depth: PR #13, and PRs #20, #18, #11, #8, #7, #6, #4, #3 (no new `src/lib/omega` files found).

## D. LLM-native decoding

- Contract: 23 tokens, one sentence, self-describing (`src/lib/omega/akolouthia.ts`). Reader rule: value(i−1,k) + step, step from lines i−1 and i−2.
- Mechanical checks: TypeScript round trip (43 lanes + 40 red-team cases) and CPython reader (`bench/akolouthia_decode.py`, 32 messages, 0 mismatches).
- An agent-side manual decode of the one progression-arm red-team message (`bench/z56/receipts/redteam-akolouthia2.messages.json`, index 0) was started and **not completed**. Multi-step DAEDALUS rule expansion was not verified. Not claimed.
- No LLM was run on the wire; no model API is available in the sandbox. Single-chat LLM verification is **downgraded** to not performed.

## E. Live searches (new terms; within ten years)

- LogShrink (Li, Zhang, Chen; ASE 2023; DOI 10.1145/3597503.3608129; search snippet only): log commonality and variability. Prior art for progression-style log compression; not LLM-decoded.
- arXiv 2408.05760 (2024) "Unlocking the Power of Numbers: Log Compression via Numeric Token Parsing": numeric-token parsing for logs. Prior art for numeric-field handling; not LLM-decoded.
- arXiv 2506.00307 (LTSC, 2025): fine-tuning required. Not applicable (already cited).
- arXiv 2604.13066 (dictionary encoding with in-context learning, 2026): its decoder uses a system prompt. Inadmissible under the constraint (already cited).
- arXiv 2605.11774 (MedTPE, 2026): embedding fine-tuning. Not applicable.
- arXiv 2602.13266 (LoPace, 2026): storage-side Zstandard and BPE packing. Not applicable.
- OpenAI "Sharing AI progress in mathematics" (6 Oct 2026): fetched from `openai.com`. Lean formalizations "of many" proofs; more to come.

## F. OpenAI math proofs

- `/tmp/openai-math-contents.md` was missing. Re-obtained with `gh api repos/openai/math/contents/CONTENTS.md` (638,727 bytes; 372 families, 719 manuscripts per the z11 report).
- Individual review (abstracts read, not the proofs): 099 (edit-distance embedding distortion), 109 (integer multiplication), 119 (Courtade–Kumar), 121 (almost-linear edit distance), 122 and 123 (trace reconstruction), 124 (three-machine scheduling), 128 (factor-two shortest common superstring), 130 (exact Fourier). The other 364 families were **not** read individually. This is a partial review, not full coverage.
- Applicability to codec design:
  - 128 (superstring, Sept 24 2026): the only entry with a plausible link (overlap merging, dictionary compression). Offset cost and LLM decodability are unresolved. Not built. Candidate for a future branch.
  - 121 (edit distance): applicable only to diff-style codecs. Randomized. Not built.
  - 122/123 (trace reconstruction) and 119 (information contraction): information-theoretic, not applicable to exact lossless message codecs.
  - 099, 109, 124, 130: not applicable.
- Astra release (2 Aug 2026; secondary sources only, including tech-insider, techtimes, developersdigest): ten results across sphere packing, binary and spherical codes, non-sofic groups, Connes rigidity, and Erdős problems. None bears on token-level compression. None checked in Lean here.
- Navier–Stokes claim (OpenAI page, 8 Sep 2026): under expert review. Not used.
- Earlier-turn call-out: 128 (flagged in z11). Re-examined as above.
- No Lean toolchain is installed. No proof was checked by me. All OpenAI proof claims are **downgraded** to "reported, not verified".

## G. Spec page

`docs/codecs.md`: design, greedy or not, citation, time/CPU bound per entry. Explicit answer: the frontier-min is a **tournament**, not non-tournament.

## H. Runtime honesty

- Used: `bash`, `git`, `gh` (authenticated), `esbuild` and `node` via `bench/tmp/run.sh`, `python3`, `gh api`, `fetch_page`, `web_search`.
- Not available: Lean (`lean`, `lake`); any LLM endpoint for single-chat evaluation; any computer-algebra or proof assistant.
- Verifiers actually run: TypeScript round trip; CPython reader; o200k tokenizer count.
- Not run: frontier on `package-lock-head.json` (timed out); PARADEIGMA on the frontier set; PR #27/#28 combinability; single-chat LLM decode.

## I. New codec: AKOLOUTHIA-2

- Source: `src/lib/omega/akolouthia2.ts`; registry key `akolouthia2`.
- Gates G1 (exact expansion), G2 (DAEDALUS round trip), G3 (`M(marked) < M(identity)`).
- 43-lane bench: `bench/z56/receipts/akolouthia2-43.jsonl`, `.err` (exit 0).
  - 43/43 exact. Progression arm on 8 lanes. Total 32,839 → 32,426 (−413).
  - Gains: chart −135, df-h −110, kubectl −60, psql −42, dump −25, vix −25, page.html −14, bibliography −2.
- Red team: `bench/z56/redteam-akolouthia2.ts`; 40 cases (including coincidence, negatives, leading zeros, CRLF, NBSP, full-width digits, marker-in-input, empty input, random tables); 0 TypeScript failures. Python reader on 32 messages: 0 mismatches.
- Encoder cost: 2–3× plain DAEDALUS on the largest lanes; decoder about 0 ms.

## J. Success predicate, gaps, and next test

- Success predicate: beat the frontier by more than a few tokens on at least one lane, prefer general prose and ops gains, all gates pass, byte-exact, LLM-readable in one chat with no system prompt.
  - "At least one lane, by more than a few tokens": **met** (chart −135 vs frontier-min, df-h −108).
  - "Prefer general prose and ops gains": **not met**. Prose gain is zero. Ops gains are on three table lanes only.
  - "LLM-readable in one chat": **not verified** by a live model run.
- Gaps:
  1. No prose gain. Every prose lane is identity.
  2. Loses to DENS-2 on `git-numstat` (+132) and on `find-listing` (+8), and to DAEDALUS-D or DAEDALUS by 0–5 tokens on prose.
  3. Gains concentrate in SVG, SQL, CSV, and table lanes where numbers are arithmetic in adjacent lines. The generality claim is limited to those lanes.
  4. No single-chat LLM verification.
  5. PR #27 / #28 combinability and the PR #28 claim not checked.
- Next test: run one live single-chat decode of a progression-arm message (contract plus DAEDALUS wire plus the rule sentence) with an LLM endpoint, and compare the output to the truth file. Downgraded until it runs.
- Second test: add a DENS-2 plus AKOLOUTHIA-2 composition (the brace tree and progression on the same file) to close the numstat and listing losses. Not run.

## Files (this turn)

- `src/lib/omega/akolouthia2.ts` (new), `src/lib/omega/registry.ts` (`akolouthia2` registered).
- `src/lib/omega/onomasia.ts` and `bench/onomasia_decode.py`: negative, unregistered.
- `bench/z56/*`: probes (including negatives), benches, red teams, receipts.
- `docs/codecs.md`: spec page.
- Not committed: `src/lib/omega/kladios.ts`, `bench/z55/kladios-bench.ts`, `bench/z55/kladios-dbg.ts` (negative; no receipts in the repo). Not committed by design.
