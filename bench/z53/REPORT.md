# X9 (this turn) report: DENS-2, and what the measurements say about the frontier

Branch `arena/95aaefc1-kompkernel`. Metric: one-chat M = o200k tokens of (dispatch rule + contract + wire) in one chat message, `OMEGA_DET=1`.
Codec: `src/lib/omega/dendrons.ts`, registry key `dendrons`. From this commit it writes DENS-2 wires. DENS-1 wires still decode (the reader accepts the old dispatch lines).

## 0. Runtime honesty

- Ran here: Node 22 + TypeScript (`tsc --noEmit -p tsconfig.json`, exit 0); esbuild bundling via `bench/tmp/run.sh` (gitignored, recreated); CPython 3 (`bench/dendrons_decode.py`, delegating DAEDALUS to `bench/chiron_decode.py`); `git`, `gh` (read-only PR listing, `gh pr comment`); the live `web_search` tool (3 queries this turn, listed in §7).
- Background jobs: 2 long bench runs (a 43-lane sweep, a sysctl probe). No servers.
- Not available here: an external LLM (so no fresh-model decode test); a theorem prover; any compiler beyond tsc.
- Not done this turn: the openai/math per-proof review (required by the brief); a full review of the open PRs (see §6); any Rosetta analysis; fractal-depth / neuralese work (not a computational artifact).

## 1. Current frontier (what the measurements actually show)

The stack's best codec depends on the lane. Measured lanes (one-chat M, o200k):

| lane | best measured codec | M | DAEDALUS M |
|---|---|---:|---:|
| sysctl (real `/proc/sys`, 1020 lines) | DENS-2 (`dendrons`) | 3836 | 4820 |
| dotted identifiers (813, repo source) | DENS-2 | 2415 | 2898 |
| git ls-files, first 400 paths | DENS-2 | 1439 | 1563 (DENDRON 1461) |
| git numstat | DENS-2 | 1904 | 2036 |
| find listing (holdout-ops) | DENS-2 | 1318 | 1326 |
| prose (de-kb, ja-kb, ru-kb, es, tr, pl), docs, JSON, HTML, tables, logs (39 lanes) | DAEDALUS (DENS = frontier by guard) | unchanged | — |

Prose and the document and table lanes have no codec in this stack that beats DAEDALUS by more than a few tokens in my measurements. The registered GRAMMA codec (on `main`, `bench/z44` receipts) targets JSON and indentation layout only, so its gain is also lane-specific.

## 2. Mechanism result this turn: DENS-2 (rule tightening) and a negative result (subtree merge)

**DENS-2 = DENS-1 with a shorter dispatch line.** The reader already knows bash brace expansion, so the rule names it instead of describing it:
- DENS-1 rule: 35 o200k tokens (51 with the verbatim clause).
- DENS-2 rule: 13 tokens (25 with the verbatim clause). Measured by `bench/z53/rule-count.ts`.
- The tree and expansion grammar are unchanged, so the saving is pure contract.

**Subtree merge (negative, not admitted).** `densMergeTails` writes consecutive siblings that share a tail as `{X1,X2}{T}`. It is exact (checked) and removes 1445 characters on the sysctl tree, but the sysctl M goes 3862 → 3878 (worse). The brace product costs more tokens than the repeated tail, because DAEDALUS's dictionary already encodes repeats cheaply. Repeated text is already spent; characters are not tokens. The merge is also DAFSA suffix sharing (Daciuk et al., 2000), so it is not new. Kept as an option, default off, not in the codec path.

## 3. Sweep (43 lanes, `bench/z53/receipts/sweep-dens2.jsonl`, exact on every lane)

- Gains vs DAEDALUS: sysctl −984 (−20.4%); dotted −483 (−16.7%); git-numstat −132 (−6.5%); git ls-files 400 −124 (−7.9%); find-listing −8 (−0.6%, newly applied).
- Versus DENS-1 (`bench/z52/receipts/sweep-dens.jsonl`): every applied lane is smaller or equal; no lane is worse.
- Regressions vs the frontier: none (the guard returns the frontier wire when the tree arm is not cheaper).

**Stack-minimum baseline (the honest comparison).** Other registry candidates on these lanes: `daedalus`, `paradeigma`, `gramma`, `elleipsis` tie plain DAEDALUS (2898 dotted, 2036 numstat, 4820 sysctl, 1563 git-ls). DENDRON-1 is 1461 on git-ls and 2036 elsewhere. So the stack minimum (excluding DENS) is 1461 (git-ls), 2036 (numstat), 4820 (sysctl; phalanx-a10 not run here), 2898 (dotted), 1326 (find). Against that stack minimum: git-ls −22 (−1.5%), numstat −132, sysctl −984 (upper bound, see below), dotted −483, find −8.

## 4. Red team (`bench/z52/redteam-dens.ts`, updated for DENS-2)

- 32 cases × (encoder + forced `.` + forced `/`) = 96 rows, 0 TypeScript failures.
- The CPython reader (`bench/dendrons_decode.py`) on the same 96 wires: 96/96 identical to the expected bytes.
- New DENS-2 cases: the DENS-2 rule and DENS-2 verbatim rule each embedded as payload, and a DENS-2 rule followed by a `!` line. All exact.

## 5. LLM-native decode: what is and is not confirmed

- Not confirmed: a fresh model reading a DENS-2 message. No external model is reachable here. I cannot claim it.
- The tree layer was hand-decoded in context for DENS-1 (`bench/z52/receipts/handdecode/`, byte-identical). DENS-2 changes only the dispatch line, which says the same thing in fewer words. That in-context check is not a blind result, and I have not re-run it for DENS-2.
- The risk to flag: a reader that does not know bash brace expansion would fail on DENS-2. The DENS-1 rule spelled out the grammar; DENS-2 relies on the reader knowing it. The honest downgrade: "readable if the reader knows bash brace expansion" (true of current frontier models, not tested here).

## 6. PR review (scope)

- Checked which open-PR codec files are not on `main` (`git ls-tree` of each head):
  - PR #23 (`arena/01a0f0fa`): `optimal.ts` is the only file not on `main`. It is a selector over candidate codecs (minimum over paths). The brief disfavours tournament paths, so not imported.
  - PR #2 (`starlight-pareto-superior-codec`): six codecs not on `main` (`chronos-x1`, `oblivion`, `pallas`, `starlight-prime`, `terminus`, `yggdrasil`). The five CJK-contractor codecs each export a `*_SYSTEM_PROMPT` decode rule set. Under this brief (no system prompt; one chat), they are inadmissible as written. Not imported. `terminus.ts` was not inspected in full.
  - PR #27 (GRAMMA) and PR #28 (ANAMNESIS, DAEDALUS classifier fix): the classifier fix and GRAMMA are already on `main`. ANAMNESIS is cross-message and not admissible in one chat.
  - PRs #3, #4, #6, #7, #8, #11, #13: no codec files missing from `main`.
- Not inspected in code this turn: PRs #17, #18, #20 (benchmark suites). Not claimed.

## 7. Prior art and live searches (this turn)

- Daciuk, Mihov, Watson, Watson (2000), "Incremental Construction of Minimal Acyclic Finite-State Automata", Computational Linguistics 26(1). Suffix sharing via minimal DAFSA/DAWG. The subtree merge is this idea in brace notation, so it is not new (search: `minimal acyclic deterministic automaton DAWG suffix sharing`; http://www.jandaciuk.pl/Fsm_algorithms/ and the Computational Linguistics paper).
- Front coding of sorted dictionaries (2013 arXiv 1305.0674; SAP HANA Re-Pair front coding, 2020). Same prefix factoring as DENS (search: `front coding sorted string dictionary compression ...`).
- "An Empirical Study on Prompt Compression for Large Language Models" (arXiv 2505.00019, 2025). Prompt compression by removing words; it does not name conventions, so it is not evidence for the DENS-2 rule. Cited as context only. (Search: `prompt compression naming well-known format ...`.)
- Not found: prior work specifically on compressing dotted configuration keys with brace notation. Searched (`compressing hierarchical dotted configuration keys ...`); results were KV-cache and tree-training papers, not applicable.

## 8. Requirements not met this turn (stated plainly)

- Mechanism portfolio (≥6 distinct branches): not met. One codec family was built (DENS-2); its branches are measured as: separator choice (kept), verbatim escapes (kept), subtree merge (negative), shorter rule (kept). Other branches (front coding, layout regeneration, arithmetic progressions, DAFSA) are already in the stack or are prior art.
- Second-order adversary and ≥15 negative-space shapes: partially covered by the red team and §2 negatives; not the full 15-item list.
- openai/math per-proof review: not done.
- Fresh-model decode test: not possible in this sandbox.

## 9. Next highest-information tests

1. A fresh model (external) decoding a DENS-2 message with the rule as the only instruction. This is the single test that decides whether the rule is safe.
2. phalanx-a10 on the sysctl lane (the one candidate not run), to finish the stack minimum there.
3. Re-check the tree-layer hand decode with the DENS-2 rule (cheap; in-context only).
