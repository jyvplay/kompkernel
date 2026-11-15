## §X116 — ΜΗΚΟΣ (MEKOS)

**Module:** `src/lib/omega/mekos.ts`, registry arm `mekos`; wired into the X74
candidate chain in `tagstack.ts` after ΕΝΑΛΛΑΓΗ. **Toggle:** `OMEGA_MEKOS=0` /
`OMEGA_NO_MEKOS=1` disables.

### ΜΗΚΟΣ — technical design spec

| Field | Value |
|---|---|
| **Object** | A POSIX `ls -l` symbolic-link size cell. By `lstat(2)` semantics the printed size is the byte length of the target pathname stored in the link, without a terminating NUL; the same pathname is printed after ` -> `. |
| **Mechanism** | Measure entailment of a sibling field. The size cell is a pure function of the target cell already present in the same record. ΜΗΚΟΣ replaces that numeric cell with `λ` **before** the parent frontier prices the text and declares the inverse in one in-band key. Not a dictionary, predictor, or radix exchange. |
| **Wire** | `λ=#bytes after ->.` + LF + parent-frontier message for the λ-rewritten source. Nests with ΕΝΑΛΛΑΓΗ in either order; `tagstackDecode` peels outermost-first. |
| **Decodes to** | Decode the parent body first; then on each line containing ` -> `, replace the prefix `λ` with the UTF-8 byte count of the target after the arrow. All other bytes verbatim. |
| **Greedy?** | No. The rewrite is a total line-local function on its domain. FIRE/NOT is decided by measuring the **complete** candidate through the real parent chain and admitting only a strict byte-exact win. |
| **Gates** | G1 line-start `l` + ` -> ` domain and exact `size == Buffer.byteLength(target)` check; G2 whole-text refusal if `λ` already occurs; G3 independent inverse; G4 parent reproduces rewritten body and composed inverse equals source; G5 strict complete-message win. Cheap raw floor `keyTokens+16`. |
| **Key auction** | 20+ keys priced. `λ=len(target).` (4 tok) **rejected**: `len` is code-point length in common languages, not bytes. `λ=bytes(target).` (5) rejected: could denote the byte sequence. Shipped `λ=#bytes after ->.` (6 tok) is an explicit byte count and 1 token cheaper than `λ=UTF8 bytes after ->.` (7). Receipt: `bench/x116/receipts/key-decision.json`. |
| **Source citation (honest)** | POSIX `lstat(2)`/`readlink(2)` semantics: symlink `st_size` = target pathname byte length, no NUL. Live X116 searches corroborated on `linux.die.net`, `pdl.cmu.edu`, `ratatoskr.run`, Unix & Linux SE, and a 2026-10-04 GitHub bug report (`bench/x116/research/sources.md`). Classical functional-dependency/lossless-decomposition theory is background, not the codec source. Gated candidate construction is repo X74; measure-entailment framing/measurement original to X116. |
| **Time / CPU** | CPU-bound. Rewrite O(lines); no wall clock in any decision. Dominant cost is the inherited parent encode. |
| **Raw screen (shipped key)** | `ls-l-real`: raw 5 194 → oct 4 747 → oct∘λ **4 695** (−499 vs raw, −52 vs oct), 58 hits, exact. `ls-real`: oct∘λ raw win is floor-blocked; standalone ΜΗΚΟΣ raw +3. Σ29 raw 28 015 → **27 398** (−617). Receipt: `screen-shipped-key.json`. |
| **Measured complete** | `mekos-probe` exit 0: `ls-l-real` 1 352 → **1 348** (Δ**−4**), exact, applied, 58 hits, parent synkrisis, 1 112 128 ms; nested wire `ΜΗΚΟΣ ∘ ΕΝΑΛΛΑΓΗ ∘ X90`. `ls-real` refused before the parent call (raw saving 13 < floor 22), stays 430. Balanced A/B exit 0: OFF 12 281 → ON **12 277** (ΣΔ **−4**), 29/29 exact, no token regression, same-price hashes stable, OFF arm 29/29 hash-identical to X115 ON (`off-verification.json`). `ls-l-real` 1 352 → **1 348**. Whole-stack wall 2 147.1 s → 3 407.4 s (**0.630×**, a slowdown), CPU 2 220.1 s → 3 528.2 s (**0.629×**); `ls-l-real` ON paid +1 263 s for the measure-entailment re-entry. ΜΗΚΟΣ is a strict token/exactness win, **not** a speed win; the shipped whole-stack speedup remains X115’s 1.178× versus X114. |
| **Unit** | 10 passed: ASCII, UTF-8 byte length (`café/日本語`), wrong size refusal, non-symlink untouched, λ ambiguity guard, no final newline, ΕΝΑΛΛΑΓΗ composition, key ladder, dispatch, nested key peel both orders. |
| **Cold read** | The assistant decoded `λ=#bytes after ->.` + `lrwxrwxrwx … λ … link -> target` to size 6 natively this turn. No external model API; LLM-blind verification remains downgraded. |

### X116 frontier and leaders

Balanced A/B (`bench/x116/receipts/ab.json`) and leaders
(`receipts/leaders-x116.json`). OFF arm = X115 shipped (chain+ΕΝΑΛΛΑΓΗ ON,
ΜΗΚΟΣ OFF); ON arm = +ΜΗΚΟΣ. No token regression and 29/29 exact required.
Final: Σ29 **12 277** (raw 28 015, ratio 0.4382), floor 10 158, headroom 11.9%,
readability price 17.26%. OPS LISTING leader `ls-l-real` 5 194 → **1 348**.
The 28 non-target lanes are hash-identical to X115 ON (`off-verification.json`).
ΜΗΚΟΣ is a token win on `ls-l-real` with an honest CPU cost there; it is not
claimed as a whole-stack speedup.

### Negative results kept

Standalone length-entailment Σ29 −39 raw, below bar (screen6). `ls-real`
composition raw −118 (shipped key) is floor-blocked, not shippable. Message-level
key auction: `λ=#bytes(target).` (5 tok) prices 1 347 vs 1 348 but was not adopted
mid-A/B because it drops the explicit `after ->` locator; the shipped 6-tok key
keeps the locator. Swapping ΕΝΑΛΛΑΓΗ/ΜΗΚΟΣ nesting order is token-neutral (1 348).
4-token `len` key rejected for byte/code-point ambiguity. Post-parent measure expansion not attempted:
dense-wire law predicts loss; ΜΗΚΟΣ is pre-frontier only.
