# X116 research protocol A–J (inherits X115 A–J)

The X115 protocol (`bench/x115/research/protocol.md`) remains in force: formal
model, outcome space H+/H−/H∂, 21 negative shapes, 9 mechanism-distinct
approaches, second-order adversary, repair re-gating. X116 adds the following.

## A. Formal model addition

- **Measure entailment.** A record field `a` is *measurement-entailed* by sibling
  field `b` under a known total function `f` when `a = f(b)` is checkable on the
  source itself. ΜΗΚΟΣ instantiates `f = UTF8ByteLength` and `b = target path after
  ' -> '` for POSIX symlink size cells. The rewrite replaces `a` with a mark and
  declares `f` in-band; it does not learn `f` from data and does not predict rows.
- **Decoder access unchanged.** One bare chat message; no skills.md/system prompt.
  The key must be executable by a human-grade reader: `λ=#bytes after ->.`

## B. Outcome space / threshold

- **H+ (X116):** ΜΗΚΟΣ ships in the X74 chain and registry; at least one lane's
  complete-message token count strictly drops versus the X115 ON incumbent;
  29/29 exact; independent decoder + dispatch units pass; balanced A/B shows no
  token regression and an honest CPU/wall account.
- **H−:** raw composition win does not survive the parent frontier, or exactness
  fails, or the key is ambiguous about bytes vs code points.
- **H∂:** exact cheaper subset but no shipped Pareto win, or LLM-blind decode
  unverified.

Pre-registered cheap falsifier: `ls-real` (13 symlinks, raw composition −120 but
standalone ΜΗΚΟΣ raw +3 and ΕΝΑΛΛΑΓΗ floor-blocked) must refuse before any parent
call. Primary target: `ls-l-real` (58 symlinks, raw oct∘λ 4 693 vs oct 4 747).

## C. Frontier achievability / impossibility

- X115 ON incumbent: Σ29 = 12 281 (X115 balanced A/B completed),
  `ls-l-real` 1 352, `ls-real` 430. X114 re-verified baseline 12 290, 0 diffs.
- Dense-wire law still binds: raw −54 on top of octal is necessary, not
  sufficient. The complete-message gate through the real X74 chain is the test.
- Impossibility hypothesis added: *entailment already priced*. If the parent
  column/tape machinery already represents the size column as cheaply as a
  constant λ column plus contract, ΜΗΚΟΣ loses. Detecting test: mekos-probe.

## D. Negative result shapes added (X115 count 21 → X116 ≥24)

22. **Standalone length-entailment below bar.** screen6: ls-real +3, ls-l-real
    −42, Σ29 −39 raw. Test: 29-lane raw screen. Do not ship standalone.
23. **Floor-blocked composition win.** ls-real oct∘λ raw −120 looks shippable,
    but ΜΗΚΟΣ saving ~14 < floor 23 and ΕΝΑΛΛΑΓΗ floor 179 > 111+14. Test:
    mekos-probe refusal check; ls-real must stay 430.
24. **Ambiguous cheap key.** `λ=len(target).` is 4 tokens but `len` is code-point
    length in common languages, not UTF-8 bytes. Test: Unicode unit (`café/日本語`)
    + semantic key audit. Rejected despite token price; shipped key is 6 tokens
    `λ=#bytes after ->.` (explicit count of bytes).
25. **Post-parent measure expansion.** Expand λ on the dense CHIRON wire instead
    of before the parent. Test: composition order probe; dense-wire law predicts
    loss/refusal. ΜΗΚΟΣ is pre-frontier only.

## E. Mechanism-distinct approaches added (X115 count 9 → X116 ≥11)

10. **ΜΗΚΟΣ measure entailment** (construction: replace entailed symlink size by
    λ; artifact: `src/lib/omega/mekos.ts`; proved: independent inverse, Unicode
    byte-length unit, ambiguity guard, ENALLAGE composition unit; unresolved:
    complete-message frontier win; cheapest falsification: ls-real refusal +
    ls-l-real probe; local-vs-global: raw oct∘λ −501 on ls-l-real).
11. **Key auction with semantic floor** (construction: token ladder over 20+
    keys; artifact: key-ladder{,2}.log; proved: 4-token `len(target)` rejected
    for byte/code-point ambiguity, 6-token `#bytes after ->` adopted; falsification:
    Unicode unit + dispatch unit; gap: 1 token saved vs 7-token UTF8 key without
    losing the byte-count meaning).

## F. Branch return types

ΜΗΚΟΣ branch returns executable design (module), proof (units), experiment
(screen/probe), and bound (floor refusal). Key-auction branch returns experiment
+ counterexample (ambiguous len key). No branch returns only prose.

## G. Second-order adversary

- Source already contains λ anywhere ⇒ whole-text refusal (G2).
- Size cell not equal to target byte length ⇒ line untouched (G1 exact check).
- Target contains Unicode ⇒ byte length, not code-point length (unit).
- Non-symlink line with ` -> ` ⇒ untouched (line-start `l` domain).
- Parent frontier corrupts λ body ⇒ G4 refusal.
- Nested ΕΝΑΛΛΑΓΗ/ΜΗΚΟΣ keys ⇒ tagstackDecode peels outermost-first recursively.
- Cheap key changes meaning ⇒ semantic audit rejects `len`.

## H. External verification

POSIX lstat wording corroborated on new sites (linux.die.net, pdl.cmu.edu,
ratatoskr.run) — see sources.md. Frontier-lab math claims individually downgraded;
no Lean executed. External LLM-blind decode unavailable; claim downgraded.

## I. Repair discipline

Any edit to mekos/tagstack/registry re-runs tsc, mekos-unit, enallage-unit,
synedria-chain-unit, and the relevant complete-message probe. A/B hashes messages.

## J. Budget / stopping

Continue until real budget exhausted or H+ met with receipts. Mandatory this
turn: ≥1 new Pareto-superior codec in repo and PR merged with all commits.


## Repair log

- R1: `mekos-unit.ts` independent decoder initially sliced the arrow at `a+5`
  instead of `a+4`; the ASCII unit caught it (target length 6 vs 5). Fixed,
  re-ran tsc + 10 units. No module change.
- R2: `mekos-probe.ts` called bare `tagstackDecode` on a full frontier message
  whose body was an X90 contract; without the parent decoder it threw. The
  encode itself had completed but the row was lost. Probe now treats dispatch
  as optional (exactness is `r.decoded`), attempt-1 receipts retained, tsc green,
  probe re-run. Module unchanged.


## X116 probe result

`mekos-probe` exit 0: `ls-l-real` 1 352 → 1 348 (Δ−4), exact, applied, 58 hits,
parent synkrisis, nested ΜΗΚΟΣ ∘ ΕΝΑΛΛΑΓΗ ∘ X90, 1 112 128 ms. `ls-real` refused
before the parent call (raw saving 13 < floor 22). Outcome currently H∂ pending
the balanced A/B; the strict complete-message win is measured, but the shipped
29-lane no-regression/speed account is not yet complete.


## X116 completed A/B addendum

The balanced A/B finished exit 0: OFF 12 281, ON 12 277 (ΣΔ −4), 29/29 exact,
no token regression, same-price hashes stable, OFF arm 29/29 hash-identical to
X115 ON. `ls-l-real` 1 352→1 348. Whole-stack wall 0.630×, CPU 0.629× — an honest
slowdown, not a speedup. Outcome: H+ for the token/exactness frontier (new ΜΗΚΟΣ
ships, strict complete-message win, independent units, balanced no-regression),
with the speed dimension explicitly negative for X116. The whole-stack speedup
claimed this turn is X115’s 1.178× versus X114, measured in its own balanced A/B.
LLM-blind decode remains downgraded.
