# X192 — MARTYS literal witnesses, not an accepted breakthrough

Continuation of the user's X186-labelled request after X191/DIEXODOS. New experimental codec: `src/lib/omega/martys.ts`. **Unwired; no production codec or speed patch adopted.** Executable correctness is not native-chat correctness. All-stack novelty, broad Pareto improvement and significant whole-stack speed improvement are not established.

## Mechanism

`^fragment` names the unique distinct literal ASCII word anywhere in the payload containing that fragment. Reference fragments do not enter the literal-word set. No recursive expansion. The encoder leaves one witness per source word; first- versus last-occurrence anchoring allows backward or forward references. Example: `^ana banana` → `banana banana`. `^ana banana bandana` is rejected as ambiguous. A full explanatory key is paid, including when composed with the parent.

16 configurations: top 16/64 words, fragment width 2/4, first/last anchor, local savings threshold 0/1. Greedy bounded local replacement; non-greedy enumeration of anchor/configuration choices; full token recount ranks complete standalone messages. It is not a global optimum or an implementation of recent SUS algorithms. Domain, bounds, proof argument and attacks: [model.md](model.md). Ancestry: [novelty.md](novelty.md).

## Executed evidence

- 39 source documents screened; 164 distinct plans; **3,622 JS checks**, including 3,276 exhaustive lexicon-subset/fragment queries. These are known discovery sources, not newly blinded heldouts.
- Separate Python inverse: **1,720 checks**, including 12 malformed inputs. Independent implementation, same author; not external personnel or native model execution.
- Ten fully-paid parent jobs with 180-second wall caps: **nine complete/exact, one timeout** (`ls-l-real`). **Zero canonical wins** among completed jobs. Results are not exhaustive over all 164 proposals: each chosen lane uses its lowest standalone-token plan.

| Lane | MARTYS + full parent | Canonical |
|---|---:|---:|
| ps-aux | 1039 | 980 |
| LLM answer | 706 | 664 |
| email | 555 | 486 |
| TypeScript | 997 | 949 |
| node help | 895 | 846 |
| findmnt | 505 | 385 |
| ps | 431 | 381 |
| knowledge base | 670 | 620 |
| diff | 468 | 411 |

Standalone discovery includes ls-l 5194→4937 and findmnt 787→772, but these are **not frontier wins** (ls-l parent trial timed out; findmnt loses after composition). No small or narrow raw saving is presented as the requested broad improvement.

### Speed experiment — rejected

Experimental bundle-only change: replace the outer short-token-cache Map keyed by two encoding names with a fixed record. Keep keys, counts, capacities, clear operations and search unchanged. Both arms passed 16,192 count, 12,124 vector, 4,119 merge, 544 threshold and 18,612 pair checks. Whole-stack ABBA across six prose/ops/code lanes, 24 identical message hashes; frontier workers SIGSTOP'ed during timing, resumed in `finally`.

CPU B/A **1.011802**, wall B/A **1.012666**: no significant improvement (slightly slower aggregate). Predeclared gate requires both ratios ≤0.9 and no lane regression. Patch rejected. No production bpe.ts modification. Paused-PID receipt and lane ratios are retained. This is isolated subprocess timing, not a claim of noise-free hardware isolation.

### Portfolio, research and formal boundaries

Six different inverses are documented in [portfolio.md](portfolio.md); five classical controls rerun, 217 checks/187 messages. Only raw control savings were distance/apt 2739→2687 and parity/metrics 811→798, neither a parent/native/novelty result. A–J acceptance objects, quantifiers and H+/H−/H∂ plus 20 deceptive result shapes in [model.md](model.md). Live new-site/recent-paper search and individually scoped lab investigations in [research.md](research.md), including deeper pinned Anthropic source files. No kernel replay, expert review or full-RH certification.

## Native gate

No separate model endpoint was available/invoked. `native_eval.py` prepares randomized frozen public prompts and a separate grader manifest only after 29 distinct canonical rows exist. Scorer has 14 synthetic tests; these are **not** model responses. Supply only `native/public/*.txt` bytes to a source-blind basic-chat participant, with no repository, sources, tools, skills or system instruction. Collect raw response bytes, record provenance/configuration, and score without trimming. Packet preparation cannot pass the gate.

Highest-information next test remains that source-blind evaluation of both canonical and candidate wires. It is not honestly replaceable by this agent reading expected source and declaring success. A successful finite run would still not prove universal model decoding.

## Reproduction

From repository root, Node dependencies installed (`npm ci --ignore-scripts`):

```sh
npx esbuild bench/x164/frontier.ts --bundle --platform=node --format=esm --outfile=bench/x192/frontier.mjs
# For a genuinely fresh replay archive receipts first, then empty frontier.jsonl.
python3 bench/x192/frontier-run.py
npx esbuild bench/x192/test.ts --bundle --platform=node --format=esm --outfile=bench/x192/test.mjs
node bench/x192/test.mjs
python3 bench/x192/independent.py
npx esbuild bench/x192/worker.ts --bundle --platform=node --format=esm --outfile=bench/x192/worker.mjs
python3 bench/x192/paid-run.py
python3 bench/x192/parent-check.py
python3 bench/x192/portfolio.py
node bench/x192/cost-build.mjs
node bench/x192/speed-build.mjs
# Run each count/vector/merge/threshold/pair-{A,B}.mjs correctness gate.
# Run timing only with other CPU-heavy work stopped; optional arguments are Node PIDs.
python3 bench/x192/runtime-run.py
python3 bench/x192/validate.py
python3 bench/x192/finalize.py
python3 bench/x192/native_eval.py selftest
# build refuses to overwrite a previously frozen packet.
python3 bench/x192/native_eval.py build
python3 bench/x192/retrieve-sources.py
python3 bench/x192/hashes.py --verify
```

Generated bundles excluded from Git. Paid runner deletes stale per-job results before execution. Validation includes TypeScript and Vite build; restore generated tsconfig.tsbuildinfo rather than publishing build metadata. Research source cache is reproducible from pinned hashes and is not committed. Publication/merge does not imply scientific acceptance.

## Final replay and gate ledger

Fresh replay completed: **29 messages and exact token counts identical to X191,
11,962 total tokens**; original source bytes verified for all 29. Category totals
and local leaders are in `receipts/leaders.json`: prose 1,770 (email 486), ops 8,078
(ls-l 1,310 absolute savings; prices 118 relative), code 2,013 (JSON 653), other
101 (cue). These are finite-corpus leaders, not universal categories of optimality.

Separate Python parent+MARTYS reader: nine exact candidates. Canonical reader:
23 exact, six unsupported, zero observed mismatches. Unsupported syntax is refusal,
not proof that the original canonical decoder is wrong. **38 frozen native
handoffs prepared** (29 canonical + nine candidates), no model responses.
Six compiler/correctness validation commands passed, including TypeScript and Vite.
Scientific acceptance: **FAIL / unresolved interfaces**, not broad Pareto success.
