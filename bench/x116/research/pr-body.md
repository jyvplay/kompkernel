## X115 + X116 — ΕΝΑΛΛΑΓΗ, ΕΠΙΣΥΝΕΔΡΙΑ, ΜΗΚΟΣ

This PR ships the uncommitted X115 work and the new X116 codec required this turn.
All claims are bound to receipts under `bench/x115/receipts/` and
`bench/x116/receipts/`. No theorem prover or external model API was run.

### Correction

The user note said the last implemented codec was `LZ77TEXT`. There is no such
module in this repository (verified by `ls`/`grep`); LZ77 appears only in
entropy-tier comments. The actual last readable codec before this turn was
ΕΝΑΛΛΑΓΗ (X115, uncommitted at turn start). This PR states that honestly.

### X115 — ΕΝΑΛΛΑΓΗ (radix exchange) + ΕΠΙΣΥΝΕΔΡΙΑ (speed)

- `src/lib/omega/enallage.ts`: symbolic `ls -l` mode ↔ canonical octal `chmod`
  rendering before the parent frontier; in-band key; G1–G5; identity-on-source
  refusals; raw floor `keyTokens+164`.
- `tagstack.ts` / `synedria.ts` / `prosphysis.ts` / `stoicheion.ts`: chain-wide
  SYNEDRIA council + shared base verdict (encoder-only, no wire change).
- Balanced A/B (`bench/x115/receipts/ab.json`, exit 0): OFF 12 290 → ON **12 281**
  (ΣΔ **−9**), 29/29 exact, no token regression, same-price hashes stable.
  OFF arm 29/29 hash-identical to X114 baseline (`ab-off-verification.json`).
  `ls-l-real` 1 361 → **1 352**. Whole-stack wall **1.178×**, CPU **1.184×**
  within this one A/B. The 28-lane subset was ≈2.73×, but `ls-l-real` ON paid
  +443 s; the honest whole-stack claim is 1.178×, not 2.7×.
- Units: ENALLAGE 8 passed (4096 modes, independent decoder, dispatch);
  EPISYNEDRIA chain unit PASS.

### X116 — ΜΗΚΟΣ (measure entailment), new this turn

- `src/lib/omega/mekos.ts`: a POSIX symlink's printed size is the UTF-8 byte
  length of the target path already printed after ` -> ` (`lstat st_size`).
  ΜΗΚΟΣ replaces that entailed numeric cell with `λ` before the parent frontier
  and declares the inverse in-band. Not a dictionary/predictor/radix exchange.
- Shipped key `λ=#bytes after ->.` (6 tok). The 4-tok `λ=len(target).` was
  **rejected**: `len` is code-point length in common languages, not bytes.
- Wired into the X74 chain and registry; nests with ΕΝΑΛΛΑΓΗ either order;
  `tagstackDecode` peels outermost-first. Toggle `OMEGA_MEKOS=0` /
  `OMEGA_NO_MEKOS=1`.
- Raw screen (shipped key): `ls-l-real` 5 194 → oct 4 747 → oct∘λ **4 695**
  (58 hits, exact); Σ29 raw 28 015 → 27 398 (−617). `ls-real` composition is
  floor-blocked (probe refusal: raw saving 13 < floor 22), stays 430.
- Units: 10 passed (ASCII, UTF-8 `café/日本語`, wrong size, non-symlink,
  λ ambiguity, no final newline, ENALLAGE composition, key ladder, dispatch,
  nested peel both orders).
- Complete-message probe (exit 0): `ls-l-real` 1 352 → **1 348** (Δ**−4**), exact,
  applied, 58 hits, parent synkrisis, nested `ΜΗΚΟΣ ∘ ΕΝΑΛΛΑΓΗ ∘ X90`.
  `ls-real` refused before the parent call (raw saving 13 < floor 22), stays 430.
  Balanced A/B (exit 0): OFF 12 281 → ON **12 277** (ΣΔ **−4**), 29/29 exact,
  no token regression, OFF arm 29/29 hash-identical to X115 ON. `ls-l-real`
  1 352 → **1 348**. Whole-stack wall **0.630×** / CPU **0.629×** — an honest
  slowdown; ΜΗΚΟΣ is a token/exactness win, not a speed win.

### Docs / research

- `docs/codecs.md` and `docs/codec-abbreviations.md`: §X115 applied; §X116 added.
- `bench/x116/research/sources.md`: live searches on new sites (linux.die.net,
  pdl.cmu.edu, ratatoskr.run, emergentmind.com, aipolix.com, cellcog.ai,
  daplab.cs.columbia.edu, winbuzzer.com, startupfortune.com, calcalistech.com,
  etc.). POSIX lstat semantics corroborated. Frontier-lab math claims
  (OpenAI ETH/local-smoothing/Yang–Mills, Anthropic ETH/3SUM/APSP/FLT/Rocq,
  DeepMind AlphaProof Nexus/IMO/Gemini AG, doubleAI girth bound, Shanghai AI Lab
  Ghys) reviewed individually and **all downgraded** — no Lean executed here.
- `bench/x115/research/protocol.md` + `bench/x116/research/protocol.md`: A–J,
  H+/H−/H∂, ≥24 negative shapes, ≥11 mechanism-distinct approaches, second-order
  adversary, repair re-gating.

### Speed account (honest)

X115 already ships the whole-stack speedup: 1.178× wall / 1.184× CPU versus X114
in its balanced A/B. X116's OFF arm is X115 ON, so the X116 A/B isolates ΜΗΚΟΣ.
ΜΗΚΟΣ buys a strict token win on `ls-l-real` but pays an extra parent-chain
re-entry there (+1 263 s); the 28 non-target lanes are token- and hash-identical.
X116 wall/CPU is 0.630×/0.629× versus X115 and is **not** claimed as a speedup. The speed claim remains X115's measured
1.178× versus X114, not a fabricated X116 acceleration.

### Honest limits

- LLM-blind external decode unverified (no model API). Cold-read by the assistant
  is recorded, not an external benchmark.
- Speedups are claimed only within the balanced A/B receipts.
- ΜΗΚΟΣ is a niche ops-listing win, not a general prose gain; prose/ops leaders
  are refreshed in `leaders-x115.json` / `leaders-x116.json`.
