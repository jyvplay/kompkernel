# Red-Team Honesty & Pareto Audit — METATRON · EPISTEME · PANOPTES · KALLOS · ARITHMOS · Optimal Router · STOICHEIA (new)

All numbers below are from the **live o200k_base tokenizer** (niieani/gpt-tokenizer,
a tiktoken port) executed via `npx tsx bench/<codec>-redteam.ts` this session. No
estimates, no chars/4. Every "exact" claim is a byte-for-byte round-trip check;
KALLOS / ARITHMOS / STOICHEIA additionally cross-check an **independent CPython
decoder**.

## Runtime honesty (what actually ran)
- Real tokenizer: `gpt-tokenizer` `o200k_base` / `cl100k_base`, invoked directly.
- Runner: Node v22 `tsx`. Independent verifier: system `python3` (CPython 3).
- Compiler check: `tsc --noEmit` (clean) + `vite build` (clean, 194 modules).
- No theorem prover, no external model, no network calls inside the codecs.
- Everything is deterministic and reproducible with the commands shown.

## Results

| suite | gates | result | headline receipt (o200k_base) |
|---|---:|:--:|---|
| ARITHMOS | 78 | ✅ 0 fail | arabicBusinessInvoice 394→360 (native-numeral lane) |
| KALLOS | 76 | ✅ 0 fail | mathPaperStylized 1101→350 (−61.5%, its 4 families) |
| PANOPTES | 41 | ✅ 0 fail | multiArtifactTechSpec 310→201 (composed 11 pre-passes) |
| EPISTEME | 28 | ✅ 0 fail | academicPaperLigatures 192→147 (−23.4%) |
| METATRON | 28 | ✅ 0 fail | markdownArchitectureDoc 255→238 (−6.7%) |
| **STOICHEIA (new)** | **57** | ✅ 0 fail | double-struck fancy text 115→71 single-chat (−38.3%); wire-only 34 (−70%) |
| **Optimal Router (new suite)** | **237** | ✅ 0 fail | routes fancy text via styled codec (−31…39%); floors plain prose/code to identity |

## Honesty findings (the important part)

1. **On plain English prose, EPISTEME / METATRON / PANOPTES save exactly 0 tokens.**
   Measured directly: three realistic prose/email/prompt samples → 0.0% savings;
   the tournaments correctly fall back to identity. Their real, honest wins live
   entirely in *pathological-Unicode recovery* lanes (ligatures, native numerals,
   styled fonts, mojibake, quoted-printable, …). This is not a defect — it matches
   the literature: no exact, prompt-free, LLM-decodable transform beats a modern
   BPE tokenizer on non-repetitive ASCII prose (H−). The named codecs are honest
   because they *decline* rather than inflate.

2. **KALLOS was pareto-INcomplete in its own stated lane.** Its docstring targets
   "fancy text" / stylized social profiles, but it implements only 4 of the 14
   Unicode math-alphabet families. The other nine (double-struck, script,
   bold-script, fraktur, bold-fraktur, bold-italic, sans-bold, sans-italic,
   sans-bold-italic) — the *most common* fancy-text-generator outputs — were left
   at 0% by the ENTIRE stack. STOICHEIA closes this gap and is a strict superset,
   verified never-worse-than-KALLOS and strictly-better on the nine new families.

3. **Superscripts/subscripts, Greek letters, and Unicode fractions are NOT a real
   lane.** Measured: `x²`=2 tok (= `x2`), `H₂O`=3 tok (= `H2O`), every Greek
   letter and `½`/`①` = 1 tok. Converting them to ASCII does not reduce tokens
   (and often inflates). These were rejected from STOICHEIA to avoid a phantom
   claim — recorded here as negative space.

4. **The Optimal Router has a cross-family accounting seam.** The pareto table
   populates `outTokens` with `messageTokens` (contract-inclusive) for the
   styled/morphological family (METATRON/EPISTEME/PANOPTES/KALLOS/ARITHMOS/
   STOICHEIA) but with wire-only `outTokens` for some "terminal sovereign"
   codecs. Within the audited family the comparison is apples-to-apples and the
   argmin is honest; across families it can under-count a codec that needs its
   contract inline. **Mitigation shipped:** the router now enforces an explicit
   **identity floor** — it never routes to any candidate whose delivered cost
   exceeds sending the raw text unchanged. Verified by `optimal-redteam.ts`
   R3 (winner ≤ identity on every input) and R5 (plain inputs floor to identity).

## Reproduce
```
npm install
for c in arithmos kallos panoptes episteme metatron stoicheia; do npx tsx bench/$c-redteam.ts; done
npx tsx bench/optimal-redteam.ts
```
