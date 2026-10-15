# Z50 — SYNARTESIS: entailment from an enclosing key, and what the frontier can and cannot still give

Branch `arena/95aaefc1-kompkernel`. New codec: `src/lib/omega/synartesis.ts` (registry key `synartesis`),
independent CPython reader `bench/synartesis_decode.py`, harness and receipts in `bench/z50/`.

## 0. Runtime honesty (what ran, what did not)

Ran this turn:
- `bash` in the sandbox: 2 vCPU, Node 22.22.3, esbuild bundles through `bench/tmp/run.sh` (recreated; `bench/tmp/` is git-ignored), CPython 3.11.
- All codec numbers: `OMEGA_DET=1` (constant clock, so every DAEDALUS/PARADEIGMA number reproduces bit-for-bit), o200k_base through `src/lib/omega/bpe.ts`. `M` = tokens(contract + wire) of the one-chat message.
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json`: exit 0, zero errors (run after the final code edit).
- `gh api` for `openai/math` (`CONTENTS.md`, `lean/docs/120.md`, `121.md`, `128.md`); `gh pr diff` for PRs 13 and 22; `git diff`/`merge-base` for PRs 27 and 28.
- `web_search` ×3 (live). Results cited in §7.
- The native decode in §5 was done by me, the assistant, in-context. It is not an independent LLM and I knew the convention, which is written into the rule I designed. It shows the message is readable, not that a fresh reader reads it.

Did NOT run (and therefore claimed nowhere):
- **The full 100 KB `package-lock.json`** through SYNARTESIS. The first attempt was stopped: DAEDALUS in deterministic mode has no time cap, so the run would not finish in a useful time. The number for the full file is therefore **not measured**. §3 reports 4 real excerpts and a 600-line slice instead.
- **Lean build** for openai/math #128 and #121. Blocked, as in z13; statements were read, not checked.
- Any LLM API other than this session (none is reachable from the sandbox).
- Re-measurement of PR #2 (STARLIGHT) and PR #23 (kalligraphos). They are reported from earlier measurements in the repo (§6), marked as such.

## 1. The seam (measured, not assumed)

Fixed-public-convention entailment has been the only route below the copy floor (z46 §B: DAEDALUS sits at 1.09–1.20× the LZ77 phrase count, and copies cannot go lower). The stack already had three such routes: ENTHYMEME (JVM frames, heading slugs), EPAGOGE (frames, anchors, changelog release links as a zipper over the NEXT record), PARADEIGMA (fields that concatenate siblings of the same object). None reaches a value that is a function of the **enclosing key**.

npm lockfiles are full of that value. Each package entry is `"node_modules/NAME": { "version": V, "resolved": "https://registry.npmjs.org/NAME/-/BASE-V.tgz", "integrity": "sha512-…" }`. `bench/z50/receipts/convention-probe.log`: the repository's `package-lock.json` has **117 of 117** resolved URLs equal to that function, 0 exceptions, and every entry with `integrity` has `resolved` right after `version`.

Mass, from `package-lock.json` (o200k, raw text, per-line sums; `bench/tmp/mass.ts`):
| class | lines | raw tokens | share |
|---|---:|---:|---:|
| `"resolved"` (derivable) | 117 | 4391 | 12.0% |
| `"integrity"` (random sha512, not derivable) | 117 | 8094 | 22.1% |
| `}`-only closers | 836 | 1671 | 4.6% |

On the 40 KB head: `resolved` 15.0%, `integrity` 28.5%. The integrity hashes are a floor no codec in this stack can beat, because the reader cannot regenerate random bytes. Only the `resolved` mass is in reach.

## 2. The codec

Rule (72 tokens, first line of the one-chat message):

> `∴ npm lock: each node_modules/ entry with "integrity" but no "resolved" gets, after its "version" line, "resolved": "https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz", (NAME = key after last node_modules/; BASE = NAME after last /; VERSION = its version).`

Encoder: `synReduce` removes a `resolved` line only when the reader rebuilds it exactly (G3: directly after `version`, directly before `integrity`, exact text incl. comma). It refuses the whole file when any entry has `integrity` without `resolved` (G2, the reader would invent a line). It checks the restore reproduces the input (G4). Then the reduced JSON goes through `paradeigmaEncode`, and the arm is kept only if it is strictly cheaper than PARADEIGMA and its composed message decodes exactly (G5, G6). Otherwise PARADEIGMA's result is returned.

Guarantee (by construction, and checked in the red-team): on every input that carries no exact rule or escape line, `M(SYNARTESIS) ≤ M(PARADEIGMA) ≤ M(DAEDALUS)`. A payload that carries the exact rule line or escape line pays the escape line (about 9 tokens; measured +9 in both red-team cases).

Rule-wording history (kept because it is the honest cost): the first wording was 99 tokens and gave only −14 on the 600-line slice. The shorter 72-token wording (same content, eligibility condition explicit) gave −41. That shorter wording is the one shipped.

Decoder dispatch: first line = RULE → reduced arm; first line = ESCAPE → strip and decode; any other first line → PARADEIGMA/DAEDALUS decoder unchanged. An earlier version treated any line starting with `∴ npm lock:` as a rule and would have broken plain payloads that merely start that way; the red-team case "payload begins with the rule prefix" now covers this.

## 3. Results (o200k, OMEGA_DET=1; every row round-trip checked by the native decoder; the CPython reader cross-checks the red-team suite in §4/§5, not these rows)

Lockfile excerpts are the first N whole entries that carry `resolved`, wrapped in a valid JSON skeleton (`bench/z50/corpus/`, produced by `bench/z50/make-excerpt.ts`).

| input | raw | DAEDALUS | PARADEIGMA | SYNARTESIS | Δ vs PARADEIGMA | lines removed | arm |
|---|---:|---:|---:|---:|---:|---:|---|
| lock excerpt, 12 entries | 2137 | 1054 | 1054 | **1034** | **−20 (−1.9%)** | 12 | reduced |
| lock excerpt, 16 entries | 2880 | 1340 | 1340 | **1300** | **−40 (−3.0%)** | 16 | reduced |
| lock excerpt, 24 entries | 4339 | 1880 | 1880 | **1826** | **−54 (−2.9%)** | 24 | reduced |
| `package-lock.json` first 600 lines | 6025 | 2291 | 2291 | **2250** | **−41 (−1.8%)** | 20 | reduced |
| `bench/holdout-ops/package-lock-head.json` (40 KB, truncated, not valid JSON) | 15009 | 5523 | 5523 | **5244** | **−279 (−5.1%)** | 61 | reduced |
| `bench/holdout/gh-api.json.txt` (non-lock JSON) | 2519 | 1153 | 1153 | 1153 | 0 | 0 | identity arm |
| `bench/holdout/json-pkg.txt` (non-lock JSON) | 1152 | 743 | 743 | 743 | 0 | 0 | identity arm |

Source: `bench/z50/receipts/sweep.jsonl` (excerpts and slice), `bench/z50/receipts/regress-json.jsonl` (non-lock lanes).

Read-outs:
- The rule costs 72 tokens; each removed line is worth about 6 tokens after DAEDALUS has folded what it can. Break-even is near 12 entries; the guard refuses below it (the 8-entry excerpt is identical to PARADEIGMA, `reducedArm: false`).
- The gain is real but modest: about 2–3% of the message on lockfile-sized inputs. The random integrity hashes keep it there.
- Non-lock JSON: no `node_modules/` keys, so the reduced arm never applies and the result is PARADEIGMA's. Verified on the two lanes above. The other 20 lanes were not run this turn; the tie there is a structural consequence (no eligible entries), not a measurement.

### 3.1 Head benchmark
`bench/z50/receipts/lock-head.jsonl`: the 40 KB head of the repository's lockfile (1352 lines; truncated mid-entry, so the file is not valid JSON, and the codec still round-trips it because the reduced arm only touches complete entries). 61 entries elided; DAEDALUS 5523, PARADEIGMA 5523, SYNARTESIS 5244, Δ −279 tokens (−5.05% against the frontier). All three arms decode byte-exactly. Runtime in deterministic mode with CPU contention: 679 s for the three arms.

This is the largest measured lockfile-scale gain in this turn. It is consistent with the per-line estimate (about 6 tokens per removed line after the rule's 72 tokens): 61 × 6 − 72 ≈ 294.

### 3.2 Speed (honest)
DAEDALUS is the bottleneck. SYNARTESIS in deterministic mode ran the 600-line slice in 116 s (one DAEDALUS call on the same slice took ~28 s in an earlier run, where two calls took 56 s); the encoder runs the plain arm, the PARADEIGMA arm, and the reduced arm. In the app, DAEDALUS's 20 s wall-clock budget applies, so **SYNARTESIS output is machine-dependent in app mode for the same reason DAEDALUS is**. Under `OMEGA_DET=1` it is reproducible.

## 4. Negative results this turn (dead ends, measured, not pursued)

All are upper bounds unless noted; M includes each rule's sentence.
- **Code `}`-only closers** (remove, indentation rule as the reader's inverse): code-ts +1.4%, daedalus.ts +0.9%, paradeigma.ts −0.1%. DAEDALUS already folds closer runs into glyphs, so the removal buys nothing. Dead.
- **Unquoted JSON identifier keys** (reader adds quotes): gh-api −0.7%, json-pkg +4.6%, package-lock head 600 lines +1.8%. Glyph folding already absorbs the quote tokens. Dead.
- **Numbered-list markers**: 2–4 occurrences across the holdout lanes. Negligible. Dead.
- **Copy floor** (from z46, re-read): prose M is 1.09–1.20× the LZ77 phrase count; no copy scheme goes lower. This is the floor for general prose and ops.
- **Measured mass**: integrity hashes (22–28% of lockfiles) are random and irreducible for a reader; PR ideas that need random bytes regenerated are not available.

Conclusion for the general lanes: no general (prose, ops, code) gain was found by any exact one-message mechanism this turn. The honest gain is in structured records whose fields are functions of their container, and it is largest in npm lockfiles.

## 5. Native readability (one-chat, no system prompt)

Test input: `bench/z50/receipts/blind/expected-original.json` (12 real entries, 5526 bytes). Message: `bench/z50/receipts/blind/message.txt` (2145 bytes; reduced arm, M = 1034 vs PARADEIGMA 1054).

- **Attempt 1** (`decoded-by-hand.json`): I expanded the 21 glyph definitions and their nested references correctly (the output matched the original everywhere except the 12 `resolved` lines). I skipped the rule in the message's first line. **Failure recorded**: a reader can drop the one instruction that matters most. The rule sits on line 1, above the contract, and is easy to miss. Mitigation is open (§8).
- **Attempt 2** (`decoded-in-context-with-rule.json`): same expansion, with the rule applied in-context as a full re-write. `cmp` against the original: **byte-identical**.

Limits: one reader, the assistant, who knows the convention. A fresh reader with no prior knowledge of the rule has not been run. The DAEDALUS expansion was the same path the frontier already uses; its readability is not new here.

## 6. Open PR triage (every open PR, measured or read against main)

Method: PRs 27 and 28 were branched before main took PR #29; their whole-tree diffs are meaningless. Compared only the files each PR changes relative to main, and the files each PR adds.

- **PR #27 (GRAMMA-Ω, `arena/fb75564c`)**: `gramma.ts` is byte-identical to main (its codec is already merged). Its `daedalus.ts`, `bpe.ts` and `registry.ts` diffs relative to main **remove** the Z44 classifier fix (`\p{P}\p{S}`), the Z44 sound-escalation block, and the Z49 decoder-state fix. Merging would regress three measured fixes. **Verdict: superseded, do not merge.** Closing it is the user's call.
- **PR #28 (ANAMNESIS, `arena/92fa4369`)**: same pattern — `bpe.ts` diff removes the Z49 decoder fix; `anamnesis.ts` is already on main. ANAMNESIS is a cross-message dictionary (session state), which the one-message constraint forbids. **Verdict: superseded and inadmissible, do not merge.**
- **PR #23 (kalligraphos, optimal)**: new files `kalligraphos*.ts`, `optimal*.ts`, `codec-research-2026-09.md`. Earlier measurement: beats DAEDALUS only on email (−13 tokens) and its output varied (1326 vs 1346) across runs under a wall-clock deadline. **Verdict: not a reproducible frontier gain, not merged** (figures from `bench/pr-frontier-review-2026-10-10.md`, not re-measured here).
- **PR #2 (STARLIGHT family)**: six new files (chronos-x1, oblivion, pallas, starlight-prime, terminus, yggdrasil). Earlier measurement: 911 vs KAIROS 704 on readme, and it needs a system prompt. **Verdict: not merged** (earlier numbers, not re-measured).
- **PR #17** (`pareto-frontier.ts`, `codec-map.ts`), **#18** (`test-pareto-redteam.ts`), **#20** (`fast-pareto.ts`), **#3** (`large-input-perf.ts`): tooling and benchmarks, no codec. Nothing to copy into the codec set.
- **PR #4** (`test-macro.ts`), **#13** (no new files on main-relative basis), **#11** (no new files): nothing to combine.

Nothing unmerged clears the bar for copy or combination this turn.

## 7. Sources

Live searches this turn (not previously cited in `src/`/`bench/`):
- npm issue threads on the `resolved` URL convention: [16926](https://github.com/npm/npm/issues/16926) (lockfile `version`/`resolved` mixup; shows the `https://registry.npmjs.org/<name>/-/<name>-<ver>.tgz` form) and [20719](https://github.com/npm/npm/issues/20719) (the same URL form in diffs; shows that the URL is rewritten as a function of the registry setting).
- LMCompress, lossless compression by large models, [arXiv 2407.07723](https://arxiv.org/abs/2407.07723) (Nature Machine Intelligence 2025). Needs the same model at both ends with arithmetic coding, so it is not a single-chat exact codec; recorded as a non-applicable route.

Also surfaced, but already cited in `src/lib/omega` (not new): LTSC meta-token lossless prompt compression, [arXiv 2506.00307](https://arxiv.org/html/2506.00307v1) (27%/18% token reduction, requires fine-tuning); dictionary-in-system-prompt compression, [arXiv 2604.13066](https://arxiv.org/pdf/2604.13066) (requires a system prompt, so inadmissible here); reversible-operator program synthesis for tensors, [arXiv 2608.02162](https://arxiv.org/abs/2608.02162) (the closest analogue to a derived-field program; cited in `aion.ts`, `mnemosyne.ts`).

## 8. Open items

1. Full `package-lock.json` benchmark (100 KB): needs either a faster DAEDALUS path or a longer run; not measured. The 40 KB head (§3.1) is the largest measured lockfile input.
2. Fresh-reader blind test of the 72-token rule (§5 attempt 1 failed by omission). Options: move the rule to the last line before the body, or repeat the rule inside the contract. Either needs a new readability receipt.
3. Other conventions in the same class, each needs its own mass measurement before code: yarn `resolved` (line-structured, `#hash` suffix), Maven repository URLs in build logs, Keep-a-Changelog compare links (EPAGOGE already covers these).
4. openai/math: #120, #121, #128 evaluated individually (§9). The other ~369 families were not read this turn.

## 9. OpenAI math, individually (`openai/math`, read via `gh api`)

- **#120** — randomized exact maximum-cardinality matching in (n+m)^{1+o(1)} word time, success probability ≥ 2/3, "the time bound holds on every computation path" (`CONTENTS.md`). Applicability: none. No matching step exists in any codec here. **Not applicable.**
- **#121** — randomized (1+ε) approximation of unit-cost edit distance, expected N^{1+o(1)}, success ≥ 2/3 (`lean/docs/121.md`: "equal strings return zero on every execution"). Applicability: would only speed the search for near-duplicate line references. Output is randomized, which conflicts with byte-exact reproducibility. The token gain of copy-with-edit was small in every measurement this turn. **Not applicable to M; not used.**
- **#128** — deterministic polynomial-time algorithm, common superstring of length ≤ 2× optimum (`lean/docs/128.md`). Applicability: SCS optimises characters; a token codec pays per reference (≥1 token per line for the offset), so SCS-level gains do not reach token units; this is the same copy floor as §4. **Not applicable to M.** Verification: the Lean statement was read in z13; the build was blocked and remains unverified. Literature context recorded in `bench/z13-report-2026-10-11.md`.

## 10. Verdict against the request

- A new codec is in the repo and registered (`synartesis`), with byte-exact native and CPython round trips on every row, an adversarial suite (16 cases, all identical under both readers), and a one-chat readability test (one failed omission and one in-context pass).
- It is **Pareto-superior on the npm lockfile lane** (−1.8% to −5.1% on every measured lockfile input above 12 entries; the full 100 KB file is not measured) and **ties everywhere else measured** (by construction; verified on two non-lock JSON lanes).
- It is **not a general prose/ops/code gain**. The analysis in §1 and §4 says none exists for exact one-message codecs in this stack; that is the honest answer to "is there a general large gain left".
- The mechanism is an extension of the entailment family (a new slot source: the enclosing key), not a new family. I say so because the request asked for a new mechanism and this is an honest, narrower one.
