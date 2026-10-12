# z21 (RECALL-R1 / PHALANX-P3 turn) — formal notes, receipts, and honesty ledger

## RUNTIME HONESTY (what actually ran)
- Available and used: bash in the sandbox (Node 22, esbuild, tsc, python3), git, gh CLI (GitHub API), web search, page fetch,
  a `git clone --depth 1` of github.com/openai/math into /home/user/z21-work/openai-math (outside the repo).
- NOT available: Lean / Lake / elan (checked: `which lean lake elan` returned nothing); no LLM endpoint for an independent
  decode test; no parallel agents; no simulator. Nothing was run in parallel by a second model.
- Lean statements: static grep only (no `sorry`/`admit`/`axiom`/`native_decide` in the Superstring tree except the
  Comparator challenge stub). NOT compiled. Downgraded accordingly.

## A. FORMAL MODEL (the codec problem as stated)
1. Admissible objects: finite byte/character strings T (UTF-8 text, ASCII or not); the wire W is one chat message.
2. Access model: decoder = a single reader with the wire only (no skill file, no system prompt). Verifier = deterministic
   code (our decoders); LLM reader = NOT verified here.
3. Resource counted: o200k_base tokens of the full wire including every rule line (what a chat input costs).
4. Success (per input T): decode(encode(T)) == T byte-for-byte AND tokens(W) <= tokens(T) (identity is always allowed).
   Lane success: for a set of inputs L, max over codecs of the gain, with ALL inputs exact. Quantifier order:
   for all T in L: exact(T); then compare sums. Failure: any single inexact T, or any T where W is larger than identity.
5. Parameters: window W = 16 lines (fixed), minimum field length 4 characters, KOINE minimum prefix 8, tokenizer o200k_base,
   tolerance: zero (integer token counts, exact string equality).
6. Adjacent problems that must NOT be substituted: (a) compression ratio in bytes (not tokens); (b) an LLM reading accuracy
   (not measured); (c) model-recall of a known text (not byte-exact); (d) SCS optimal length (a different objective with a
   different decoder); (e) tokenizer change (out of scope).

## B. OUTCOME SPACE
- H+: a readable exact codec that beats PHALANX-P2 by >= 100 tokens on some lane. Status: SUPPORTED on openstack (-129 tokens,
  -8.5%) and the ls-omega sample (-108, -4.4%). Evidence: bench/z21/phalanx3-probe.receipt.txt.
- H-: no fixed-order exact codec beats P2 by >= 1% on the whole corpus. Status: SUPPORTED on total (-307 of 36,530 tokens,
  -0.8%), so a corpus-wide large gain is NOT claimed.
- H∂: gains depend on the window (distance 17 edge: attack A3) and on field alignment (prose: no gain).
- Declared evidence threshold for "accepted": exact on all 21 files + 3525 red-team cases + 5 attacks, and never larger than
  P2. MET (see receipts). Compile threshold (Lean/LLM): NOT MET; claims are downgraded accordingly.

## C. FRONTIER (imported results, with hypotheses)
- Kundi et al., IEEE TSE 2021 (common-prefix extraction on log columns, up to 9.7%): hypothesis = log columns with shared
  prefixes; not byte-exact-readable form. Interface: KOINE is the in-context form of it.
- LoPace, arXiv 2602.13266 (Feb 2026): lossless, but output is zstd + binary packing; no model-readable exact form.
- Induction-head papers (arXiv 2604.01094, Apr 2026; arXiv 2511.05743, Feb 2026; arXiv 2502.14010, Feb 2025): models copy
  earlier in-context text via induction/copying heads; Hapax (2511.05743) reports a 66% drop in verbatim repetition when
  copying is suppressed. Hypothesis: a "same as d lines up" reference relies on copy circuitry that exists. Interface to
  codec: NOT measured for readability.
- TOON (secondary, 2025 vendor/blog sources; no peer review): tabular arrays with keys declared once, 30-60% fewer tokens on
  uniform arrays. Our TABMIN (repo) already does this family. Not re-measured.
- OpenAI math release (primary: github.com/openai/math, cloned 2026-10-12): 719 manuscripts, 372 families, 300/719 (~42%)
  Lean-formalized (history.md). Oct 7 withdrawals: 3 (sign error in "Algebraicity of Weil classes..."); 14 revised (history.md).
- OpenAI superstring result (preprint "A Polynomial-Time 2-Approximation for Shortest Common Superstring", Sep 24 2026; NOT withdrawn):
  Lean target statement at lean/ComparatorChallenges/Superstring.lean (one `sorry` = the stub). Solution Main.lean proves the
  same statement by ⟨answer, answer_implementation, answer_spec⟩. 20,404 Lean lines in the Superstring tree. Static audit: no
  sorry/admit/axiom/native_decide in the solution. Definitions checked: Symbol = List Bool, Word = List Symbol, Instance = List Word,
  IsCommonSuperstring = every s is an infix (<:+:) of T, opt = sInf of lengths. Faithful. NOT compiled here; Comparator not run.
  Use for this codec lane: none (overlap offsets are not readable by a model in one chat).

## D. NEGATIVE SPACE (result shapes that look like solutions but fail the contract)
Each row: shape | why it fails | test that detects it | status.
1. Ungated KOINE before VERITAS (in the P1 chain, after DITTO) | find-listing -31% vs P1, but ungated it regresses openstack (+2.7%) and git-numstat (+12.9%) | koine-sweep (TKV columns), P2 gate | tested.
2. KOINE scored per-field in isolation | o200k cost of a field in isolation != cost in line/wire | per-line greedy vs per-field | tested.
3. Modal shortcut: replace DITTO with KOINE (fold instead of mark, the obvious simplification) | it wins find-listing and npm-ls but regresses openstack +13%, ls-full-iso +7%, git-numstat +13% vs P1 (3 of 8 ops files) | koine-probe 'U,DA,K,V' column vs P1 | tested.
4. Column-free recall (value anywhere in last 16 lines) | adds ~30-200 tokens over same-column; breaks the column reading rule | anycol-measure | tested, negative.
5. Recall window 17+ | distance 17 repeat is not referenced (by design) | p3-attack A3 | tested.
6. '@'-literal field collides with reference marker | must escape; '@3' literal would decode as reference | recall-redteam "literal @3 field" | tested.
7. Input starting with a rule line of an earlier stage | decoder reads it as a wire -> exception | koine-redteam fuzz (found bug, fixed) | tested, fixed.
8. Encoder self-check that throws | an unguarded decode in the encoder aborts the file | safeDecode wrapper | tested, fixed.
9. Reference to a value that is itself a reference (chain) | must resolve to the DECODED value | fuzz (shared columns) | tested.
10. Reference to d > i (before line 1) | reader has no line | decoder throws, encoder never emits | tested (ref at line 1).
11. Overlap superstring encoding (SCS-style) | offsets are not model-readable; the 2-approx gain is for length, not readability | argued from the definitions | not implemented.
12. Model recall of a standard license by name | not byte-exact (sampling) | argued | not tested; excluded by contract.
13. Base64 / byte packing (LoPace-style) | not readable in one chat | argued | excluded.
14. TOON-style schema-once | duplicate of TABMIN in repo | argued | not re-measured.
15. Learning a dictionary in the system prompt | violates the contract (no system prompt) | contract | excluded.
16. Global tournament over all codecs per file | violates the non-tournament preference; also needs the reader to know the choice | policy | excluded (P3 is a fixed order with two gates).
17. Hex-to-decimal digit re-encoding of IDs | could save tokens on hashes, not tested | - | NOT TESTED; listed as next.
18. Using fewer tokens by dropping whitespace runs | breaks the field model; not exact unless marked | argued | not implemented.

## E. MECHANISM PORTFOLIO (each: construction | artifact | proved | unresolved interface | falsification test | local/global)
M1 KOINE prefix-vs-above | src/lib/omega/koine.ts | exact (25+3000+500 tests) | none for exactness; readability unverified | koine-sweep | local (one line above).
M2 RECALL same-column recall d<=16 | src/lib/omega/recall.ts | exact (25+3000+500) | window choice 16 is a parameter, not optimal | recall-redteam / p3-attack A3 | local (16-line window).
M3 Column-free recall | (measured only, not built) | negative: +30..216 tokens over M2 on corpus | none | anycol-measure | local.
M4 Overlap superstring (SCS) | not built | analytic only | decoder readability of offsets | argued from Lean definitions | global (whole-text overlap), so not a line-local lane.
M5 Schema-once tables (TOON) | not built (TABMIN exists) | duplicate | none | n/a | local.
M6 Model-copy recall | not built | literature only | a measured readability study (no LLM here) | would need an external model | local per reference.
M7 Lean-verified imported results as design input | not a codec | static audit only | Lean compilation | Comparator run | global.

## F. ARTIFACT REQUIREMENT
Every accepted branch has a receipt in bench/z21 or bench/z20: phalanx3-probe.receipt.txt (numbers), recall-redteam.receipt.txt
(3525 cases), p3-attack.receipt.txt (5 attacks), timing-probe.receipt.txt (speed), koine-sweep.receipt.txt (z20).
No status-only claim is used.

## G. SECOND-ORDER ADVERSARY (strongest attacker per candidate)
- P3 (RECALL + KOINE): attacker = a file whose repeats sit at distance 17 (attack A3: no gain, still exact); a file that is
  pure '@'/'&' tokens (A2: exact); a file whose gate passes on the tokenizer but whose decode fails (guarded by the full-chain
  decode and identity escape; never observed); a 3000-line CRLF listing (A4: exact, 18,259 tokens).
- Hidden assumption: o200k is the only counted tokenizer. The gate uses o200k; a different tokenizer may change the choice.
  Not tested (no other tokenizer in the sandbox).
- Quantifier order: the decoder must be exact for every input, which is checked per input at encode time (self-check),
  so a violating input falls back to identity; the codec is not proven correct for all inputs, only checked on tests.
- Imported-theorem alignment: the superstring Lean statement is faithful (definitions checked) but unverified by compilation.
- Global compatibility: P3 never larger than P2 (0 files larger across 21).

## H. VERIFICATION
Accepted: exactness (tests above), token counts (o200k), never-larger-than-P2 (21 files), 5 new attacks.
Downgraded: readability by an LLM (no LLM access); Lean results (no compiler); speed (3 files, 5 runs each, one machine).

## I. REPAIR
P3 was created after the P2 fuzz bug. The repair (koineIdentityWire, safeDecode) inherited no trust: the full red team and
the attacks were re-run after it. New attack for the patch: p3-attack A1 and A5 (rule-line-as-input across both stages).

## J. STOPPING / NEXT HIGHEST-INFORMATION TESTS
Not done: (1) an LLM blind-decode test on 20 random wires (needs an external model); (2) a window sweep {4,8,16,32} for RECALL;
(3) hex-run digit re-encoding (negative-space item 17); (4) a second tokenizer (cl100k) to test the gate's tokenizer dependence.
