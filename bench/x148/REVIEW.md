# X148 review — what was actually established

**New codec added to the repository: EPITYPOS** (overstrike factorization,
`src/lib/omega/epitypos.ts` + `epitypos-frontier.ts`), mechanism-distinct from
every existing codec: it exploits BACKSPACE-rendered style (a two-level
character grid: visible glyphs plus an overstrike overlay), which no prior
codec (glyph tapes, JSON layering, threshold tables, suffix aliasing, …)
touches. It is genuinely new to the stack; prior art (roff/overstrike
typography) is cited honestly.

## Verified

1. Repair (three ordered delimiter pairs + dynamic key) re-passed the full unit
   suite: 2289 checks / 754 accepted cases, including three REAL manual sources
   reconstructed byte-exactly and targeted literal-`__` collision attacks.
2. Repaired composites rerun fresh: 594→502, 1941→1822, usage manual in
   `probe-postrepair.log` (repair inherits no trust — everything rerun).
3. Six executable mechanism controls all decode byte-exactly and all cost more
   tokens than the accepted composed output on the overstrike lane
   (`receipts/controls.json`).
4. PERIBALLON (opt-in env-read scope): 916 checks; explicit non-isolation caveats
   in the module header.
5. LCP-native prefix comparison: exact, 9,880 checks; speed A/B falsified.
6. SYNARMOGE deadline honesty gate: 9 checks (expired-deadline abort; truncated
   and resumed runs gated; fixed point stable on reconfirmed lanes).
7. tsc clean.

## Explicitly NOT established

- **Frontier total:** rerun completed 29/29 byte-exact, total **11,963** =
  X147's 11,962 + exactly one token on code-ts (SYNARMOGE ren=1 fired under
  resumed-load timing) — the configuration is time-sensitive on one lane and
  the old total is not exactly reconfirmed. Stated, not papered over.
- **Native fresh-chat behavioral gate:** no such endpoint exists here; EPITYPOS
  native readability remains an in-suite-wording + program-inverse claim.
  NOT_RUN, as in X147.
- **Pareto superiority:** EPITYPOS is additive-on-parent on a niche manual lane,
  not >10-token general prose/ops gains; speed candidates both failed ≥10%.
  The merge precondition is NOT met; PR stays draft.
- **Research:** downloads inspected to stated depth only; no Lean replay; the
  DoubleAI primary PDF fetch failed and nothing from it is used.

## Highest-information next test

Resume-and-finish the canonical rerun to see whether code-ts stabilizes at 949
or 950 across repeats (settles whether SYNARMOGE's time slice is a real
one-lane regression risk); then a native fresh-chat EPITYPOS readability packet
whenever such an endpoint exists.
