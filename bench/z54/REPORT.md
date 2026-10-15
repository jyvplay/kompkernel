# X10 — GNOMON report (bench/z54)

Scope of this file: what was measured and verified for the GNOMON codec this turn, and what was NOT done.
All token counts are o200k_base (repo `bpe.ts` via `bench/tmp/run.sh`), contract plus wire, one chat message.
Nothing here is a simulation: every number comes from a receipt under `bench/z54/receipts/` or from a
command listed below.

## 0. Verdict (downgraded where noted)

- **Literal bar met on one lane:** `package-lock-head.json` 5463 → 5127 (−336, −6.2%) against the stack
  minimum of DAEDALUS and GRAMMA (plain DAEDALUS alone: 5523). Byte-exact (`exact: true`).
- **General bar NOT met:** over 43 holdout lanes the total is 32,717 → 32,378 (−339, −1.0%). 41 lanes tie
  exactly; the −339 comes from two lanes (package-lock −336, gh-api −3). The task prefers general gains;
  this codec is a narrow schema gain (npm lockfiles; REST `*_url` links).
- **Readability gate downgraded:** the in-context trials (§3) were decoded by the same agent that wrote
  the codec, with an agent system prompt in context. They are not a fresh no-system-prompt reader.
- **Frontier downgraded:** the comparison uses DAEDALUS and GRAMMA only. PARADEIGMA was not run on the
  lockfile lane (on gh-api it ties DAEDALUS at 1153, `frontier-min` run this turn).

## 1. What GNOMON is

- R1 (REST): a `*_url` value equal to `url + "/" + key stem` is written `~`; `~k+x` means link k plus x.
  Base is the object's `url` key only (first-URL base was rejected: wrong bases when `avatar_url` comes first).
- R2 (npm): a lockfile `resolved` value equal to `https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz`
  (NAME = key after the last `node_modules/`, BASE = its last segment, VERSION = entry `version`) is written `~`.
- Bases: DAEDALUS (the original arm) or GRAMMA JSON dialects (json1/2/4/tab). Plain DAEDALUS and plain GRAMMA
  are always candidates, so the chosen message is never above their minimum.
- Code: `src/lib/omega/gnomon.ts`, registry key `gnomon`, CPython reader `bench/gnomon_decode.py`.

## 2. Measurements (o200k, exact)

| lane | frontier (min DAEDALUS, GRAMMA) | GNOMON | delta | chosen |
|---|---:|---:|---:|---|
| package-lock-head.json | 5463 | 5127 | −336 | npm, gramma base |
| gh-api.json.txt | 1091 | 1088 | −3 | rest, gramma base |
| 41 other lanes (`receipts/sweep-gnomon.jsonl`) | — | — | 0 | plain |
| **total, 43 lanes** | 32717 | 32378 | −339 | all exact |

Sweep: `bench/z54/receipts/sweep-gnomon.jsonl` (exit 0, stderr in `sweep-gnomon.err`).
A sweep started before the GRAMMA base was added (DAEDALUS base only) is kept as
`sweep-gnomon-daedalus-base.jsonl`; it is superseded.

Rule sentences were not changed. Shorter wordings were counted (`sentence-count.ts`): REST 43 → 24 (`rest_c`),
19 (`rest_d`); npm 41 → 38 (`npm_m`, keeps the NAME/BASE/VERSION definitions), 23 (`npm_c`, drops them),
30 (`npm_b`). Not adopted: the 3-token gain (`npm_m`) is below the noise of a wording change, and the shorter
forms either drop the definitions needed for the nested-path case or change the spec. A wording-level cut is
not counted as a gain.

## 3. Verification

- **TypeScript:** `node_modules/.bin/tsc --noEmit -p tsconfig.json` exit 0, no output (whole project).
- **Red team** (`bench/z54/redteam-gnomon.ts` → `receipts/redteam-gnomon.*`): 81 cases (edge cases, generated
  lockfile, generated REST array, 2-space and 4-space JSON layouts, fuzz). Guarded arm (the encoder's own
  choice): 3 messages applied. Forced DAEDALUS-base arms: 42/42 TS exact. Forced GRAMMA-base arms: 42/42 TS exact.
  Forced JSON dialects (all four units, exact expansion gate): 60 messages, 0 TS failures.
  **CPython reader: 147 messages checked in total, 0 mismatches** (`gnomon_decode.py`).
- **In-context trials** (`bench/z54/incontext/`), the same agent reads only the message and writes the output:
  1. `message.txt` (raw-form JSON with `~` fields and both rule sentences; 763 chars): the decode was
     written to `decoded2.txt`, which trial 2 later overwrote. Recorded result: `cmp` rc 0 against
     `sample.json`, and the CPython reader also equal. The trial-1 output file is NOT in the repo; re-running it
     needs a fresh decode of `message.txt`.
  2. `message2.txt` (`⟐j2` dialect clause, minified JSON, both rule sentences; 731 chars) → `decoded-trial2-json2.txt`:
     `cmp` rc 0 against `sample2.json`. CPython reader also equal.
  Both messages had the rules forced (`make.ts`, `make2.ts`); they are readability trials, not savings claims.
  Trial 2 was not chosen by the encoder (`none` won); the dialect path is covered by the red team only.

## 4. Bugs found and fixed this turn (do not reintroduce)

- The composed message added the CHIRON contract line ("Print the text after ¶ unchanged.") to identity
  wires, which refer to a ¶ that is not in the message. Now the contract line appears only when the wire starts
  with `§`, matching DAEDALUS's raw path (`gnomonPrompt`, `daedalusInnerPrompt`).
- A raw identity wire that begins with `§` is ambiguous to the reader. GNOMON now skips it (`gnomonWireOk`).
- The earlier red team never exercised `json2`/`json4`/`jsontab`. The layout cases and the forced dialect loop
  now do; the CPython `json_pretty` port is checked on all four units.

## 5. NOT done this turn (required by the task; not claimed)

- Formal model (admissible objects, access model, quantifier order, tolerances): not written.
- Outcome space H+ / H− / H∂, frontier restatement with hypotheses, negative-space list (≥15 shapes), modal test,
  mechanism portfolio (≥6 approaches with falsification tests): not written.
- Live web searches with new terms: none run this turn (the list in the session memory is from earlier).
- OpenAI math proof review (individual, with applicability to codec design): not done this turn.
- PR #28 / PR #27 reproduction; PR #23 / PR #13 mining; combinability review across open PRs: not done this turn.
- DENS-2 red team and sweep: not run this turn. DENS-2 typechecks (the whole project does), and it is already in
  commit `b60db78`.
- Drawn-tree lanes (`npm ls`-style) against DENS: not tested.

## 6. Runtime honesty (what actually ran)

- Tools: bash (node 22, npm-installed TypeScript, esbuild via `bench/tmp/run.sh`), `tsc`, CPython 3 (stdlib only;
  `tiktoken` is not installed, so all token counts come from the repo's `bpe.ts`), `cmp`, `wc`, `git`.
- Background processes: the 43-lane sweep (one process, about 25 minutes) and the earlier 4-lane runs.
  No parallel agents were used. No external verifier beyond `tsc`, the CPython reader, and `cmp`.
- The reader in the in-context trials is this agent (not an independent LLM session).
- No network searches or external papers were consulted this turn.
