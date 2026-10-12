# Z37 receipts: VERITAS-M (o200k one-chat tokens)

All rows below are byte-exact through the shipped decoder (`veritasRDecode`) unless noted.

## Result: codec gate NOT met
- VERITAS-M is exact on 151/151 corpus files (`vxm-151.jsonl`, shipped `veritasMEncode`).
- It is **not Pareto-superior** to min(DAEDALUS, A10) in any lane (`vxm-pareto-summary.json`).
  Frontier definition as in Z33: per-file min(DAEDALUS, A10); A10 measured on the 40 group files only.
- Totals: VXM 334,492 vs frontier 305,352 (+9.5%). Smaller than the frontier on 16 of 151 files.
- DAEDALUS returns the identity (winningArm `none`) on 20 of 151 files. Excluding those, VXM is +10.4% (323,563 vs 293,007).
  Lane gaps excluding identity fallbacks: code +2.9%, fresh +10.9%, ops +8.9%, ops_real +14.2%, prose +2.2%,
  realjson +2.0%, wrapped_docs +9.1%.
- One file is 20% smaller than the frontier (`fast-glob-3.3.3/README.md`, VXM 5719 vs 7128). The frontier value there is
  DAEDALUS's identity fallback, not a compression. It is one file, not a lane gain.

## Z36 leftovers fixed
- **ZeroDivisionError cause:** the VXR receipt's `dae` field is 0 for the 40 files that were on disk. Dividing by it crashed.
  The DAEDALUS receipt (`bench/z33/receipts/daedalus-151.jsonl`) is the source of truth. `join151.py` guards zero denominators.
- **Basename join was wrong:** 151 paths map to only 77 basenames. The earlier basename join mis-paired files. `join151.py`
  now joins by repository-relative path (151/151 matched, 0 zero denominators skipped).
- **"Missing 111 files" resolved:** the 111 `fresh` files live under `/home/user/z31/docs`, which was absent. They are npm package
  docs. `rebuild-z31-docs.py` re-fetched the exact package versions from registry.npmjs.org. A file was accepted only when its
  byte length equals the receipt's `bytes` field: 111/111 matched. This is a length check, not a content hash.
- `tsconfig.tsbuildinfo` reverted to HEAD.
- `bench/z12/` and `bench/ctx/` are not part of Z36/Z37. They are left untracked and out of this commit.

## Edge and verification
- `vxm-edge.txt`: 421 cases, 0 failures (VERITAS-M entry point; the same edge suite as VERITAS-K).
- `tsc --noEmit -p .` exit 0.
- Default VXR path unchanged: readme 706, npm-ls 1232, ls-full-iso 472, gh-prose 1853.

## Runtime (honest disclosure)
- Measured on a 2-core sandbox, partly with concurrent runs, so these are upper bounds on this machine.
- Wide mode (<= 10000 chars): up to 137 s (9.7 KB, CHANGELOG.md).
- Standard mode (> 10000 chars, VERITAS-R default budget): up to 219 s (56 KB api.md). The standard path is slower than
  wide on the largest inputs. Its cost is in the trial loop, not the gate.
- Total wall time for the 151-file run: about 99 minutes.

## Stopped duplicate run
- A 40-file run (`final-m.ts`) was started. Its existence check was evaluated per iteration, so after the rebuild it
  also covered the 151 set. It was stopped at 61 rows, all exact. Superseded by `vxm-151.jsonl`; not committed.

## Negative results from this turn (bench copy, not shipped)
1. Per-site selective parse (H1): 0 expansions on readme (55 sites), npm-ls (296), gh-prose (106).
2. Script-ordered key pools alone (H2: cyrillic, greek, arabic, armenian): within ±3 tokens.
3. Search width beyond kImprove=100 / refineBudget=40000: no gain on readme or ls-full-iso (saturated).
4. Look-past alone (forceSteps 10, 40): no gain (readme 706, ls-full-iso 472).
5. Swap pass without a decode gate: produces `VXN: alias cycle` wires. Decode gate required.
6. Swap pass with decode gate alone: 3–4 tokens per file; many swaps rejected by the decoder.
7. Cyrillic pool + look-past: ls-full-iso 472 -> 459; readme and gh-prose unchanged.
8. Combined (wide + forceSteps 40 + cyrillic + swap): readme 693, ls-full-iso 428, npm-ls 1056, gh-api 1187. Best single config
   measured, still behind DAEDALUS on every structured file.

## Live sources used this turn (not verified by this sandbox)
- arXiv 2604.13066, "Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning" (2026): dictionary in the
  system prompt, LLM decodes meta-tokens; reports exact match > 0.99 on template compression with Claude 3.7 Sonnet and Nova
  Premier. The dictionary-in-context mechanism is the same family as VXR. Their claim, not reproduced here.
- arXiv 2506.00307, LTSC (Harvill et al. 2025): lossless meta-token compression; states its approach requires fine-tuning.
  Excluded from this line (single chat, no fine-tuning).
- arXiv 2512.03989 (continued BPE training) and 2402.01035 (pre-tokenization): change the tokenizer. Not applicable to a fixed o200k
  wire.

## Not verified
- LLM decodability of the VXR wire with no system prompt: not tested. No LLM API is reachable from this sandbox. The legend is in-band
  and the instructions can go in the first user turn, but this is unmeasured here.
