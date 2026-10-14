# z48 — X4 tier-5 ultrareview: ○ ELLEIPSIS (positional ellipsis) and the measured floor of structural redundancy

Date 2026-10-14 · branch `arena/5b3a22ac-kompkernel` · PR #29 · encoder `OMEGA_DET=1`, o200k_base · metric `M = tokens(contract + wire)` of the one-chat message, byte-exact only.

Everything below was executed in this sandbox (node 22, CPython 3.11, 2 vCPU); every number has a receipt file in `bench/z48/receipts/`. No LLM API exists in the sandbox; the "native" decode is my own blind in-context decode, checked with `cmp` and `sha256sum`.

---

## A. Runtime honesty

Tools actually available: `bash` (node/esbuild/tsc/vite, python3, git, gh), `web_search`, `fetch_page`, file read/write. Not available: any LLM API, raw.githubusercontent.com (api.github.com used instead), a human reader. The sandbox was restored at the start of this turn with HEAD rolled back to `main`; I reset to `origin/arena/5b3a22ac-kompkernel` (bf7e6f4) and reinstalled node_modules before any measurement.

One probe in the first half of the turn was **wrong** and its number is retracted: an early du-usr-share probe ("766 → 605") used a replacer function that wrote the literal text `$1` into the file, so it deleted more than the constant. The correct, exact elision of `/usr/share/` after the tab measures **766 → 781 (+15)** (`bench/z48/receipts/try-listings.log`, `dbg2` run). The retraction changed the design, see §C.

## B. Formal model

- Source: UTF-8 text `T`. Reader: an LLM given one chat message `P = contract ‖ wire`, no tools, no system prompt.
- Cost: `M(T) = |tok(P)|` in o200k_base. Frontier: DAEDALUS-D (`daedalusEncode`), `M_D`.
- Admissible mechanism: every byte of `T` must be either literally present in `P`, produced by a substitution the message itself defines (dictionary glyph), or produced by a rule that is (i) stated in the message, (ii) a function of what the reader can see, (iii) word/field-granular (no character counting, no arithmetic, no row counting) — the H∂ boundary from CUTE (EMNLP 2024) and RoundTripCodeEval (2026), unchanged from z46/z47.
- ELLEIPSIS adds one rule family to that set: **positional constant ellipsis**. For a record class `C` (every line / lines after the first / lines beginning with a word), a delimiter `D` (blank runs, `,`, `;`, `\t`), a position `k` (1..7 or "last"), a constant `R` and an exception predicate `E` on the field the reader sees at `k`:
  `fold(T)` removes `R` (a whole field plus its trailing blank run, or a prefix of the field, or a cell value leaving an empty cell) from field `k` of every line in `C` where it is present; `unfold` re-inserts it on every line in `C` whose field `k` does not satisfy `E`. The encoder verifies `unfold(fold(T)) = T` on the whole document and that no elided remainder satisfies `E` (otherwise the candidate is refused). Up to three rules; sentences are written in decode order; then DAEDALUS on the reduced text; the plain DAEDALUS arm always runs and wins ties, so `M_E ≤ M_D` on every input.

## C. Hypotheses, what was measured, what survived

**H+ (entering the turn).** "A line-aligned dictionary pays one glyph per occurrence of a repeated constant; a constant at a fixed field position can be stated once instead, saving ~1 token per record on ops tables (dpkg −5 %, ps aux, kubectl, CSV constant columns, du/find path prefixes)."

**Measured (DAEDALUS M before → after exact removal, sentence not yet charged):**

| shape | lines | removed | M before → after | per line | file |
|---|---|---|---|---|---|
| ls -l line-start prefix `-rwxr-xr-x 1 root root ` | 460 | whole prefix | 3746 → 3708 | −0.08 | probe-elide.log |
| ls -l both prefixes (`-rwx…`, `lrwx…`) | 610 | whole prefix | 3746 → 3647 | −0.16 | probe-elide.log |
| dpkg -l `ii  ` line start | 283 | field 1 | 4572 → 4540 | −0.11 | probe-elide.log |
| dpkg -l `ii  ` + `amd64` + 8 spaces (field 4) | 283+248 | field 1 + 4 | 4572 → 4510 | −0.09 | probe-elide.log |
| du -sh `/usr/share/` after the tab | 149 | prefix of field 2 | 766 → 781 | **+0.10** | try-listings.log / dbg2 |
| ps aux `?` + 8 spaces (TTY, field 7) | 70 | field 7 | 1185 → 1186 | +0.01 | probe-elide-3.log |
| systemctl `loaded active ` (fields 2–3) | 67 | fields 2–3 | 932 → 929 | −0.04 | probe-elide-3.log |
| ls -l `Oct 14 07:30 ` (fields 6–8) | 74 | fields 6–8 | 528 → 528 | 0 | probe-elide-3.log |
| ls -l `Oct 14 07:30 node_modules/` | 74 | fields 6–8 + prefix | 528 → 453 | **−1.01** | probe-elide-3.log |
| find -printf `node_modules/` before `@babel/…` | 120 | prefix of last field | 1326 → 1318 | −0.07 | probe-elide-3.log |
| airport-codes CSV `small_airport`, `NA`, `US` → empty cells | 769 cells | 3 cells | 8172 → ≈8147 | −0.03/cell | try-csv.log |
| **wc -l `src/lib/omega/` before the file name** | 150 | prefix of last field | 789 → 670 (+25 sentence = 695) | **−0.79 net** | try-listings.log |

**Why (token anatomy, `bench/tmp/tok2.ts`, `tok3.ts`):** the dictionary glyph that stands for a constant also absorbs whatever repeated material touches it — the record's `\n` (`\n-rwxr-xr-x 1 root root` is one glyph), the padding run before it (padding widths repeat, so `<pad>amd64<8 spaces>` is one glyph per width), the constant neighbour (`?        Ss`, `loaded active running`). Removing the constant leaves a residue that costs exactly what the glyph cost: `\n` (1 token), the padding run (1 token), `,,` (1 token). This is the **newline / padding / empty-cell tax**: under a tokenizer-aligned hierarchical dictionary, *structural* constants already cost ≤ 1 token per record and that token cannot be removed by any marker-free rule because the record boundary or the field boundary must still be written. The only case where removal pays is when the residue **merges into a neighbouring token**: a blank run followed by a letter-initial word tokenizes as ` word` (one token), so a path prefix removed from before a hapax file name saves the glyph *and* lets the separator vanish into the name (`   497 src/lib/omega/abacus.ts` → `   497 abacus.ts`). When the remainder starts with `@`, `/` or a digit (find `node_modules/@babel`, du `doc/` folded with the tab), nothing merges and the gain is ≈ 0 or negative.

**H− (result).** Positional constant ellipsis is **not** a general ops lever: whole-field and empty-cell forms are worth 0.0–0.16 tokens per record and never repay a 20–45-token sentence; the prior-turn estimate "1 token per constant per record" was a character-domain illusion. **H+ (narrowed, survives).** Prefix-before-word ellipsis on count/size + path listings pays 0.8–1.0 token per line: `wc -l` over a directory **789 → 695 (−11.9 %)**, 36-line `wc -l` sample 241 → 232 (−3.7 %), `ls -l` with a shared directory 528 → 520 (−1.5 %). Everything else ties by construction (plain arm).

**H∂ (unchanged, sharpened).** Word/field-granular rules are decodable; "the 4th blank-separated field", "the last field", "lines beginning with `ii`", "except lines whose 4th field is `all`" are all field-level acts. A reader never counts rows, characters or digits; padding is copied verbatim (the removed pad is stated as "8 spaces", the only count in the design, bounded at 24 and only in the whole-field form, which the estimator now never selects on real data).

## D. Frontier placement and lane results

Reference `M_D` from z47 (same encoder, `OMEGA_DET=1`).

- 22 standard lanes (`bench/z45/receipts/files-lanes.txt`): `bench/z48/receipts/lanes-elleipsis.jsonl` — ELLEIPSIS = DAEDALUS on every lane (Σ 20329 = 20329); no lane carries a count/size + path listing. Exact on 22/22.
- Ops/data corpus (18 files: 16 in `bench/z48/corpus/` — 11 real command outputs from this sandbox, 3 real pastes from GitHub issues, 2 public CSV datasets — plus `find-listing`, `du-usr-share`, `ls-usr-lib` from existing lanes; `try-listings.log`, `try-csv.log`):
  wins: `wc-l-omega.txt` 789 → **695**, `ls-l-pkgjson.txt` 528 → **520**, `wc-c-gitfiles.txt` 1617 → 1616; ties (plain arm kept, composed arm measured worse): `ls-l-dts` (`@types/` remainder), `du-a-src`, `find-listing`, `du-usr-share`, `ls-usr-lib`, `dpkg-l-2`, `kubectl-pods-2`, `ps-aux-sandbox`, `systemctl-1`, `apt-list-installed`, `sp500-200.csv`, `airport-codes-300.csv`, `etc-passwd`, `mount`, `etc-group`. Exact on 17/17.
- Pareto: `M_E ≤ M_D` everywhere (plain arm); strictly better on the listing shape above; encode time ≈ 2 × DAEDALUS only when a candidate exists (most inputs: one run + a millisecond scan).

## E. Negative space (≥ 15 shapes, each with the modal-shortcut question "could a reader guess the field without the rule?")

1. Line-start constants (ls perms/owner, `ii`, `- `, `> `, indentation, `| `): measured ≈ 0 (newline tax). 2. Line-end constants (`[installed,local]`, `-> target`, trailing `\`): same tax, 0. 3. Whole fields inside aligned tables (dpkg arch, ps TTY, kubectl READY/STATUS/RESTARTS, systemctl `loaded active`): 0.0–0.16/line. 4. Empty-cell defaults in CSV/TSV (`,,` is one token): 0.03/cell. 5. Markdown-table constant columns (`| Yes |`): same as 4 plus short tables. 6. JSONL constant key-values: quoted values cannot be named in a quoted sentence without escaping; `,,` tax anyway. 7. Log level/pid/logger constants between a timestamp and a request id (openstack 26 lines): remainder starts with `[req-`/digits — no merge, and n < sentence. 8. du / find prefixes whose remainder is a repeated component (`doc/`, `@babel/`): the dictionary already folds separator+prefix+component; removal breaks that glyph (+15, −8). 9. Thousands separators, decimal-point elision, zero-padding: character-positional, rejected again. 10. Column re-alignment / padding regeneration: character counting, rejected (review-2026-10-10). 11. Space-joined records instead of `\n`: `\n` is already free when the line start repeats; number-initial records cannot absorb a space (o200k number pieces take no leading space). 12. Row-count-based rules ("the first 40 lines"): counting, rejected. 13. "Same as the line above" markers (DIRFOLD `↑`): the marker costs the glyph back (tie). 14. Header-name defaults for CSV ("`type` = small_airport"): built (`cells` form, header lookup), decodable, measured 0 gain — kept in the code at its measured weight, never selected on real data. 15. Linguistic ellipsis (gapping/sluicing in prose): not exact (SCiL 2024 shows LLMs reconstruct elided words inferentially, not byte-exactly). 16. Timestamp/ID delta coding in listings: arithmetic. 17. Glyph relabelling so adjacent glyph pairs merge into one token: hides glyph identity inside a multi-letter token — the reader must spell the token (CUTE: unreliable), rejected on decodability. 18. Speed-only re-implementation of DAEDALUS: not a reader-visible mechanism; ANAMNESIS's deterministic core already occupies that lane.

## F. Mechanism-distinct approaches tried this turn (≥ 6, with artifacts)

1. Line-start / line-end prefix elision — `probe-elide.ts`, `probe-elide.log` (ls, dpkg): dead (newline tax).
2. Whole-field elision with pad and exception predicate — `elleipsis.ts` `field` form; `probe-elide-3.log`, `xcheck-forced.log` (exact under two readers), measured 0 gain in real mode.
3. Empty-cell defaults by header name or ordinal — `cells` form; `try-csv.log`: +25 on airport-codes before the estimator was corrected, tie after.
4. Field-prefix elision at positions 2..7 and "last" — `prefix` form: the surviving mechanism; `try-listings.log`.
5. Multi-field constant runs (`1/1 Running 0`, `loaded active`) — `runLength` handling, `xcheck-forced.log` (kubectl-like).
6. Candidate ranking by neighbour variability / merge potential — `estimateFor`, calibrated on the probe table (wrong at first: it predicted du −161; now predicts from measured per-form weights).
7. Real corpora: 13 sandbox command outputs + 4 external pastes (GitHub issues intel/compute-runtime#1017, gregbkr/…#6, isucon12-q#1, saurabhprakashec2021-eng/DevOps-#1; datasets/airport-codes, datasets/s-and-p-500-companies) — `bench/z48/corpus/`.

## G. Second-order adversary and external verification

- `bench/z48/adversary.ts` → `receipts/adversary.log`: **22/22 exact-or-refused** — payload starting with `○ `, remainder equal to an exception value, field exactly equal to the prefix, quotes/backslashes in fields, CR line endings (refused), lines with fewer fields, field `k` last on some lines, exception value appearing as an elided remainder (refused), quoted delimiter before a CSV default column (refused), duplicate header names (falls back to ordinal), a genuinely empty cell in the default column (refused), sentence-like field values, mixed tab/space padding, empty document, single line, value colliding with the scope word, hand-built rules with `starts`/`digit` exceptions.
- Independent reader: `bench/elleipsis_decode.py` (CPython, written from the sentence grammar, reuses `chiron_decode.py` for the inner wire). `bench/z48/xcheck.ts` forced+optimistic mode on five synthetic tables exercising every form, scope and exception: **5/5 BYTE_IDENTICAL native and CPython** (`xcheck-forced.log`). Real-mode wires (wc-l-omega, ls-l-pkgjson, wc-c-gitfiles): see `xcheck-real.log`.
- Blind native self-decode: `receipts/selftest-wc-l-omega-ac.prompt.txt` (M 232, plain 241) decoded by me in-context without running code → `selftest-wc-l-omega-ac.decoded.txt`; `cmp` BYTE_IDENTICAL, sha256 `d2626aa5a0b3e5a6…` on both sides.
- Type check `npx tsc --noEmit` clean; `npx vite build` clean (see commit).

## H. Prior art (new searches this turn; new sites/terms)

- TOON (Token-Oriented Object Notation, Nov 2025; medium/analyticsvidhya/kdnuggets): key amortisation for uniform JSON arrays — keys once, rows as CSV. Under DAEDALUS the keys are already one glyph per object; TOON's gain is against raw JSON, not against a dictionary. ELLEIPSIS removes *values*, not keys.
- SpreadsheetLLM / SheetCompressor (arXiv 2407.09025, 2024): inverted-index translation merges identical cells into value → address-range entries — a value-first transposition with range counting (not chat-exact; addresses are counts).
- Cavar et al., "Computing Ellipsis Constructions: Comparing Classical NLP and LLM Approaches" (SCiL 2024, aclanthology 2024.scil-1.20) and "The Typology of Ellipsis" (SIGTYP 2024): LLMs locate and fill linguistic ellipsis few-shot but inferentially — the receipt that ellipsis is a native reading act, and the reason ours is rule-stated rather than inferred.
- Carried from z46/z47: CUTE (EMNLP 2024), RoundTripCodeEval (2026), SPARTAN (SIGMOD 2001, predicted attributes), LogShrink (ICSE 2024), Denum (2024), DNSLogzip (2025), meta-tokens (2025), de Campos dictionary-ICL (2026).
- In-repo near neighbours, all distinct: CHIRON `×` REPEAT (per-column lists + separator per cell), DIRFOLD (`↑` marker, previous-line relative), KIONES/PLINTHOS (transposition), TABMIN (row/column arm), ABACUS (thousands separators), EPAGOGE/ENTHYMEME (entailed fields: value derived from neighbours; ELLEIPSIS's value is a document constant at a position).

## I. The ten OpenAI proofs — X4 re-review (github.com/openai/ten-proofs, read 2026-10-14)

Re-read for this turn's question (is a positional constant ever free to remove?): #2 (binary/spherical code rate bounds, `main_binary_theorem`) is the only result about the *rate* of a code, and it bounds error-correcting codes over a noisy channel — our channel is noiseless and the reader exact, so it bounds nothing here; #7 (`gapCVP400IsNPHard`, `binarySyndromeDecodingIsNPHard`) says optimal decoding of general lattices/codes is hard — our reader's decoding is linear-time substitution by design, and it is the *encoder's* search (which rule set minimises M) that is the hard side, which is why `induceRules` is greedy with a measured estimator rather than optimal. #1 sphere packing, #3 non-sofic group, #4 Connes counterexample, #5 permanent bound, #6 quantum parallel repetition, #8 Ehrhart, #9 multicolour Ramsey, #10 compactness counterexamples: no bearing on source coding into a token budget. Nothing in the ten changes the floor in §C.

## J. Rosetta broadening, "what have we missed", repair, stopping

- **Rosetta (analysis only):** its known-form concept needs a form both sides already hold. Random prose has no shared form; hybrid prose has two exact ones — public canon (ANAGNORISIS) and public conventions (EPAGOGE) — and this turn adds the third and last in-message one, a document's *own* positional constant. Beyond those three the reader would be guessing, which is not a codec.
- **What have we missed this whole time (AI-native answer):** we kept reasoning in the character domain — "this column is the same on every row, delete it" — while the cost lives in the token domain, where `\n` + constant, pad + constant and `,` + constant + `,` are each already one unit. Structural redundancy that a human sees on the screen is largely *already gone* after tokenizer-aligned dictionary coding; what remains of M (60–75 %) is hapax content at the tokenizer floor plus one token per record for the boundary, which no marker-free rule can remove because the boundary must still be written. The only structural token left to win is a separator that can be *merged* into a neighbouring word, which is a tokenizer artefact, not redundancy — and ELLEIPSIS is exactly the codec of that artefact. The honest reading: the one-message, exact, chat-native frontier is at its information floor for prose and within ~1 token per record of it for tables; further large gains need either external canon or the second message of a conversation.
- **Repair:** the wrong du probe was found, retracted and replaced (§A); the estimator was re-fitted to the measured table; the first encoder version (two sentences `/usr/` + `share/`) was replaced by a longest-prefix rule; the `optimistic` test flag was initially ignored by the encoder and fixed before the cross-check.
- **Stopping:** stopped when (i) every candidate form had a DAEDALUS measurement on real data, (ii) the surviving form had a real lane win > 10 %, exact under two independent readers and a blind native decode, (iii) the 22 lanes and 17 ops files were tie-or-win with the plain arm as the guard.
