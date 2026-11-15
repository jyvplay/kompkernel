## §X115 — ΕΝΑΛΛΑΓΗ (ENALLAGE) and ΕΠΙΣΥΝΕΔΡΙΑ (EPISYNEDRIA)

**Module:** `src/lib/omega/enallage.ts`, registry arm `enallage`; wired into the
X74 candidate chain in `tagstack.ts`. **Speed lane:** `synedria.ts` chain scope
plus shared base verdict in `tagstack.ts`, `prosphysis.ts`, `stoicheion.ts`.

### ΕΝΑΛΛΑΓΗ — technical design spec

| Field | Value |
|---|---|
| **Object** | A Unix `ls -l` symbolic permission field: one file-type char from `[dlcbps-]` plus nine symbolic mode chars, followed by a space. |
| **Mechanism** | Radix reinterpretation of a fixed-width bit field. The 10-character symbolic rendering is exchanged for the canonical 4-digit octal `chmod` rendering **before** the parent frontier prices the text. The in-band key declares the inverse. |
| **Wire** | `Body first. ^Tnnnn␠→T+chmod.` + LF + parent-frontier message for the octal-rewritten source. |
| **Decodes to** | The parent frontier decodes the body first; then each line-start `Tnnnn␠` is expanded to file type `T` plus the symbolic `chmod` rendering of octal `nnnn`, including `s/S/t/T` special bits. All other bytes are verbatim. |
| **Greedy?** | No. The rewrite is a total line-local bijection on its domain. The only decision is FIRE/NOT, made by measuring the **complete** candidate through the real parent chain and admitting only a strict byte-exact win. |
| **Gates** | G1 line-start domain; G2 whole-text refusal if any octal-form field already exists; G3 independent octal→symbolic inverse; G4 parent reproduces the rewritten body; G5 strict complete-message win. A raw-saving floor (`keyTokens+164`) is a cheap necessary pre-gate bracketed by ls-real (111 raw saved, loses) and ls-l-real (447 raw saved, wins). |
| **Source citation (honest)** | Symbolic↔octal permission bijection is standard POSIX `chmod`/`ls` folklore, not a paper contribution. Live X115 searches found hardware radix recoding and varying-radix steganography, but no symbolic-mode radix-exchange one-chat codec. The gated candidate construction is this repository's X74 discipline; the framing/measurement here is original to X115. |
| **Time / CPU** | CPU-bound. Rewrite is O(lines); no wall clock enters any decision. Dominant cost is the inherited parent encode of the rewritten body. |
| **Measured** | `ls-l-real`: raw 5 194→4 747, 149 fields, complete 1 361→**1 352** (Δ−9), exact, applied in the shipped balanced A/B. The isolated ENALLAGE chain probe measured 1 353 (940 459 ms); the full shipped chain reaches 1 352 because later wire-level candidates price the admitted ENALLAGE message. `ls-real`: raw 1 034→923 but complete candidate loses (443 vs 430 with the earlier 27-tok key; the shipped floor now refuses it before the parent call). Unit: 4096 modes, file types, ambiguity guard, special bits, independent decoder, compact-key dispatch — 8 passed. |
| **Cold read** | The assistant decoded `Body first. ^Tnnnn␠→T+chmod.` + `-0755 …` to `-rwxr-xr-x …` natively in this turn. No external model API was called; external LLM-blind verification remains downgraded. |

### ΕΠΙΣΥΝΕΔΡΙΑ — technical design spec

| Field | Value |
|---|---|
| **Object** | Encoder-only schedule over the X74 candidate chain. |
| **Mechanism** | (1) A chain-wide SYNEDRIA council: nested frontier re-entries join the already-open council instead of opening independent ones. (2) The base frontier verdict already measured by the chain is handed to PROSPHYSIS and STOICHEION as an optional shared premise, instead of re-measuring `tagstackFrontier(text)` on the same bytes. |
| **Wire / decoder** | None added. No contract clause, no glyph, no token. |
| **Greedy?** | Not a search. Common-subexpression reuse and scoped replay memo. |
| **Soundness** | Council keys include codec/encoding/text/options/both budgets; hits replay the recorded work/chiron spend and return a structural clone. Shared verdict is only the already-measured base on the exact source; rewritten-body encodes and exactness gates are unchanged. `OMEGA_SYNEDRIA_CHAIN=0` degrades to X114 per-measurement scope; `OMEGA_ENALLAGE=0` disables the radix candidate. |
| **Source citation (honest)** | Original engineering on this repository's X114 SYNEDRIA and X74 chain. No paper claims the schedule. |
| **Time / CPU** | CPU-bound; wall clock is measured only in the A/B, never read by a decision. |
| **Measured** | Unit `synedria-chain-unit.ts`: PASS, `{"hits":1,"joined":1,"scopes":8}`. Full balanced A/B: `bench/x115/receipts/ab.{json,jsonl,log}`. |

### X115 frontier and leaders

The X114 readable frontier was re-verified before the new arm: **12 290 tokens,
29/29 exact, 0 diffs** against the X114 baseline (`receipts/frontier-verification.json`).
The X115 balanced A/B completed: OFF 12 290, ON **12 281** (ΣΔ **−9**), 29/29 exact,
no token regression, same-price message hashes stable, OFF arm 29/29 hash-identical
to the X114 baseline (`receipts/ab-off-verification.json`). `ls-l-real` 1 361→1 352.
Whole-stack wall 2 594.9 s → 2 202.2 s (**1.178×**), CPU 2 705.7 s → 2 284.3 s
(**1.184×**) within this one balanced A/B. The 28 non-`ls-l-real` lanes alone were
1 319.97 s → 484.05 s (≈2.73×); `ls-l-real` ON paid +443 s for the ENALLAGE chain
re-entry, so the honest whole-stack claim is 1.178×, not 2.7×. Leaders:
`receipts/leaders-x115.json`.

### Negative results kept

ANAKYKLOSIS deleted (ceiling −6, owned moves). ENALLAGE standalone and wire-level
post-pass lose; only the pre-frontier X74-chain composition with the compact key
wins. Glyph-pair screen 0/24; affix-closure screen −3 total; set-bitmap −4 raw;
PALINDROMOS −6 on ls-l for +42 s. Dense-wire law confirmed again.
