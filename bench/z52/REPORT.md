# X10 report: DENDRON-S (brace tree on any separator, verbatim lines)

Branch `arena/95aaefc1-kompkernel`. Metric: one-chat M = o200k tokens of (contract + wire) in one chat message, `OMEGA_DET=1`.
Codec added: `src/lib/omega/dendrons.ts`, registered as `dendrons` in `src/lib/omega/registry.ts`.

## 0. Runtime honesty (what actually ran)

- Ran here: Node 22 + TypeScript (`tsc --noEmit`, exit 0); esbuild bundling via a recreated `bench/tmp/run.sh` (gitignored; the original was missing in this checkout); CPython 3 (`bench/dendrons_decode.py`, which delegates DAEDALUS to `bench/chiron_decode.py`); `git`, `gh` (read-only PR listing and `git fetch`); the live `web_search` tool (2 queries this turn).
- Background processes: 3 bench jobs (sweep over 42 lanes, sysctl frontier minimum, numstat frontier minimum). No servers.
- NOT available or NOT run: no external LLM API (so no fresh-model decode test); no theorem prover; no compiler beyond tsc; no independent evaluation harness other than the repo's own `o200k` counter (`src/lib/omega/bpe.ts`).
- Not done this turn: fractal-depth or neuralese work (not a computational artifact); the openai/math per-proof review; a full review of all 14 open PR heads (only #27 and #28 were inspected in code, see §6).

## 1. Repo state at turn start (corrections to the session memory)

- The local branch was a stale clone at `7c7da87`. It was moved to `origin/arena/95aaefc1-kompkernel` (`e45c73e`), with the working-tree bytes verified identical first.
- The DENDRON trailing-newline patch was already in `e45c73e`. The earlier "patch pending" note was out of date. The committed DENDRON sweep in `bench/z51/receipts/sweep-dendron.jsonl` is valid (14 rows).
- DAEDALUS's Unicode-punctuation classifier fix (PR #28, `\p{P}\p{S}`) and its sound-escalation rule are already on `main`. GRAMMA (PR #27's codec) is already registered on `main`.

## 2. Formal model (this codec)

A. Objects. A text `x` (any Unicode, `\n`-separated lines). The wire is one chat message: a dispatch line, then a DAEDALUS wire.
Information/access model. The reader sees one message, with no system prompt and no skills file. It applies the rule in line 1, then the DAEDALUS/CHIRON reader, then brace expansion.
Resource. `M(x) = tokens(contract + wire)` in o200k, counting the dispatch line.
Success. Byte-exact: `decode(encode(x)) = x` for every `x` in the test set, and `M(DENS) < M(frontier)` on at least one lane by more than a few tokens.
Quantifiers. The encoder checks exactness on the actual `x` before it admits a tree arm, so every admitted output is exact on that input. The claim is about the tested set, not all text.
Boundaries. Lines containing `{ } ,` or starting with `!` are written verbatim behind a `!` marker. Lines with fewer than 2 separators, or fewer than 3 lines, fall back to the frontier.
Adjacent problems not substituted: a different tokenizer; a lossy summary; a model-side (output) cost; a shared external dictionary.

B. Outcome space. H+: a tree arm is strictly cheaper and exact on a real lane. H−: no tree arm is cheaper on any real lane. H∂: wins only on some lanes (this is the observed case).

C. Frontier. The stack's best per lane. The baseline in the sweep is plain DAEDALUS, which DENDRON also used. The stack minimum over the other named candidates is reported separately (§4).

D. Negative space (result shapes that look like wins but are not):
1. "One tree on the first `/` covers dotted keys" — false: DENDRON splits only at `/`; the sysctl lane gets no tree (`denApplied: false`).
2. "Refuse any list with a brace or comma" — false for this lane: 1 of 1020 sysctl lines carries a brace or comma. DENDRON refuses the whole list on that one line, which loses the −958 gain; the verbatim marker keeps it (the tree then has 12 wire lines).
3. "Always use the same separator" — false: `/` wins on paths (`git-ls-files-400`: 1461) and `.` wins on dotted names (2437) and numstat (1930). One fixed separator loses one of the two.
4. "A longer contract is free" — false: a single rule for all trees cost +26 tokens on the path lane (1487 vs 1461). Fixed by a second dispatch line, paid only when a verbatim line exists.
5. "Dotted names are rare in ops text" — partly false: `/proc/sys` is a real dotted listing, and dotted identifiers appear in repo source. But `find-listing` and most prose gain nothing, so the gain is lane-specific.
6. "The tree wins on prose" — false: all 14 prose and document lanes tie the frontier (guard).
7. "Front coding is new" — false: sorted-string front coding and tries are old (see §7).
8. "The hand decode proves LLM-native decoding" — not established. It is an in-context check with the rule visible (§5), not a fresh-reader test.
9. "Round trip on a few cases proves exactness" — the red team covers 29 cases × 3 arms (§5), but it is still not a proof.
10. "The sweep row is the codec's score" — the sweep uses plain DAEDALUS as the baseline. The stack-minimum comparison is separate (§4).

Modal shortcut (the most tempting wrong answer): "split at the first separator and emit a tree for every list". It fails on any line that contains `,` or `{`, because the reader expands the braces, so the line changes. Test: `bang-lines`, `braces-in-line`, `comma-values`, `stray-close`, `stray-comma-top` in `bench/z52/redteam-dens.ts` all pass only because the verbatim marker is used.

E. Mechanism portfolio (honest status, not six finished branches):
1. Separator-generic brace tree (DENS). Built and measured. Proved portion: byte-exactness on the test set (TS and CPython readers). Unresolved interface: whether the LLM applies the brace rule correctly across many groups; not measured on a fresh model. Local gap (the rule and the encoder), not equivalent to the original problem.
2. Verbatim-marker escape for lines the grammar cannot represent. Built as part of (1). Cheapest falsification: a payload of only verbatim lines should never beat the frontier. Holds in the sweep (no regression).
3. Contract-language lever (Chinese compact contract). Measured: 36 vs 39 o200k tokens (`bench/x9/`). Below the bar. Rejected.
4. Front coding (sorted prefix elision). Prior art (§7). Not built separately, because DENS already covers the same factoring with the brace grammar. Equivalent in mechanism, different in the reader.
5. Layout regeneration (GRAMMA). Already in the stack. Not re-measured here.
6. Arithmetic-progression folds (HELIX, ELLEIPSIS). Already in the stack. Not re-measured here.

F. Artifacts: `src/lib/omega/dendrons.ts`, `bench/z52/*.ts` (sweep, red team, frontier minimum, hand-decode writer), `bench/z52/receipts/*`, `bench/dendrons_decode.py`.

G. Second-order adversary against DENS:
- Attack: a line that begins with a separator (`.x`, `/x`). The head is then empty. Tested in the sweep (`separator-only`, `empty-items`); the expander's round trip holds.
- Attack: a verbatim line that begins with `!` and also contains a comma. Tested (`bang-inside-group`, `bang-lines`). Exact.
- Attack: a payload whose plain DAEDALUS wire starts with DENS_RULE. Tested by `dispatch-line-as-payload` and `dispatch-vline-as-payload`. Exact.
- Attack: a very long line (3000 chars). Tested (`long-line`). Exact.
- Attack: a line with a NUL byte, CR, or tab. Tested (`nul-char`, `crlf`, `tabs-spaces`). Exact.
- Attack: the expander sees a bash-special character (`$`, `*`, `~`, backtick). It is not shell; it is literal in our grammar. Tested (`bash-specials`). Exact.
- Attack: quantifier order. The encoder checks exactness before admitting; the reader has no search. Holds.
- Limit: the reader must count braces correctly. A reader that treats `,` as a literal would fail on tree lines. The CPython reader is a second implementation that agrees on all 87 wires, but a fresh LLM reader is not tested.

H. Verification:
- `tsc --noEmit -p tsconfig.json`: exit 0 (after the change).
- TS red team: 87 rows (29 cases × encoder + forced `.` + forced `/`), 0 failures. `bench/z52/receipts/redteam-dens.ts.jsonl`.
- CPython reader on the same 87 wires: 87/87 identical to the expected bytes. `bench/z52/receipts/redteam-dens.py.json`.
- Sweep: 42 lanes (40 from `lanes-frontier.jsonl` + 2 new), all `exact=true`, 0 regressions (`bench/z52/receipts/sweep-dens.jsonl`).

I. Repair: the first candidate (one contract line for all trees) regressed the path lane by +26 (1487 vs 1461). It was repaired by the two-line dispatch (`DENS_RULE` vs `DENS_RULE_V`). The repair was re-run on the full sweep, and the red-team was re-run with the new dispatch.

J. Stopping: the claim below is limited to what the gates show.

## 3. Results (one-chat M, o200k, `OMEGA_DET=1`; baseline = plain DAEDALUS)

| lane | raw | plain DAEDALUS M | DENS M | Δ | sep | exact |
|---|---:|---:|---:|---:|---|---|
| sysctl-proc (real `/proc/sys`, 1020 lines) | 13744 | 4820 | 3862 | **−958 (−19.9%)** | `.` | yes |
| dotted identifiers (813 unique, from repo src) | 14424 | 2898 | 2437 | **−461 (−15.9%)** | `.` | yes |
| git-numstat (holdout-ops) | 12306 | 2036 | 1930 | **−106 (−5.2%)** | `.` | yes |
| git ls-files, first 400 (path list) | 3952 | 1563 | 1461 | **−102 (−6.5%)** | `/` | yes |
| 39 other lanes (prose, JSON, HTML, ops, tables) | — | — | — | 0 (guard: frontier kept) | — | yes |

Sweep total over 42 lanes: 32150 → 30625 (−1525). Every gain is on a dotted or path-shaped listing. No prose or document lane changed.

## 4. Stack-minimum comparison (the honest frontier)

The registry's other candidates were run on each applied lane (`bench/z52/frontier-min.ts`, via the registry's own `run`, exactness checked):

- dotted identifiers: daedalus 2898, daedalus-dual 2926, paradeigma 2898, phalanx-a10 3337, gramma 2898, dendron 2898, elleipsis 2898. Stack minimum (excluding DENS) = **2898**. DENS = 2437 → **−461 (−15.9%)** against the stack.
- git-numstat: daedalus 2036, daedalus-dual 2036, paradeigma 2036, phalanx-a10 2214, gramma 2036, dendron 2036, elleipsis 2036. Stack minimum (excluding DENS) = **2036**. DENS = 1930 → **−106 (−5.2%)**.
- sysctl-proc: run with 7 candidates (phalanx-a10 excluded because it did not finish in the budget; it was worse on the other two lanes). Result: see `bench/z52/receipts/frontier-min-sysctl.jsonl` and §8.

## 5. LLM-native decode (what is and is not confirmed)

- Confirmed: the tree layer. `bench/z52/receipts/handdecode/sample-tree.txt` (2 tree lines, 557 chars, expanded from a 24-line real sysctl slice) was hand-expanded in context into `sample-handdecoded.txt`. `cmp` against `sample-expected.txt`: **byte-identical**. The CPython reader also matches. Limit: the rule was visible during the decode, so this is not a blind result.
- Not confirmed: a fresh model reading the full DENS message (rule + DAEDALUS wire). No external model is available in this sandbox. The DAEDALUS layer rests on the repo's existing CHIRON gate and the same reader the other codecs use.
- Downgrade: the claim "an LLM decodes DENS natively" is NOT verified. The defensible claim is: the rule is short, the grammar is bash brace expansion, and the tree layer was decoded by hand byte-identically in context.

## 6. PR review (scope of this turn)

- PR #27 (GRAMMA): the codec is already on `main` (registered). Not re-merged.
- PR #28 (ANAMNESIS): the DAEDALUS classifier fix is already on `main`. ANAMNESIS itself is a cross-message dictionary; the one-chat metric does not admit it. Not merged.
- Other open PRs (#23, #13, #20, #18, #17, #11, #8, #7, #6, #4, #3, #2): not inspected in code this turn. Not claimed.

## 7. Prior art and live search (this turn)

- Front coding of sorted string dictionaries: sorting, then storing the common-prefix length and the suffix (arXiv 1305.0674, 2013; "Faster & strong: string dictionary compression using sampling and fast vectorized decompression", SAP HANA, 2020). DENS is the same factoring, but written as a bash brace expression that the reader expands, and with the separator chosen per payload. Not new in mechanism; the reader format and the per-payload separator choice are the surface difference.
- Trie and radix-tree compression (Wikipedia "Trie"; the radix-tree explanation). Known.
- Searched for compression of hierarchical dotted configuration keys (2024–2025): nothing specific found beyond tries and KV-cache work that is not applicable.

## 8. What is still open

- The sysctl stack-minimum number is pending in `bench/z52/receipts/frontier-min-sysctl.jsonl`. If it is not complete, the sysctl claim is against plain DAEDALUS only.
- Not run: an openai/math per-proof review (required by earlier turns); a fresh-model decode test; a full 14-PR code review.
- Possible next step: compose DENS with GRAMMA (layout) on the same payload, since both are one-chat rules. Not built.
