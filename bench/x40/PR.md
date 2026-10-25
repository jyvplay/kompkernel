## X40 — μέτρον METRON: absolute column generators

**A new codec, shipped.** `src/lib/omega/metron.ts` (registry key `metron`, family `exact`),
built on X39's engine: two new header specs that replace a *relative* predictor with an
*absolute* one, plus a planner fix that was hiding plans the encoder could already execute.

```
colN=lin:V/at,S      field on source line j is V + (j − at)·S, rendered in V's exact format
colN=clock:V/at,S    the same, where V is a wall-clock reading in seconds
```

### Why it is not just another delta codec

Every predictor in the stack before this turn read the line above: `above`, `colM`, `days`,
`workdays`, `+b`. Each carries state, each needs a reset when a line is written literally, and
`+b` is bound to a digit run at constant width — which is why `40.0 s`, `**-12.5%**` and
`[00:02:05]` were not liftable. METRON removes the state and makes the **sample the format**: `V`
is a real field value, and the reader recovers decimals, integer width, zero padding, leading
spaces and the unit suffix from it with the same parse it already applies to every field. The
anchor is `(value, line index)`, never a projection to line 0, because a projection is
unrenderable for clocks and wrong for offset tables. The renderer refuses on width overflow,
negative clocks and two-field clocks above an hour; a refusal writes that line out and cannot
disturb any other line, because nothing is carried.

### Measured, byte-exact, parent and child in one process (`OMEGA_DET=1`, o200k, one chat message)

| lane | raw | frontier | **METRON** | Δ |
|---|---|---|---|---|
| `psql-output.txt` | 675 | 322 | **245** | **−77 (−23.9 %)** |
| `cue-sheet.md` | 513 | 184 | **164** | **−20** |
| `prices.csv` (synthetic) | 582 | 226 | **214** | **−12** |
| `markdown-table.md` | 330 | 176 | 176 | 0 (plan found, gate refused) |
| `metrics.tsv` (synthetic) | 811 | 237 | 237 | 0 (plan found, gate refused) |
| 26 further lanes | — | — | unchanged | 0 |

`psql` is −44 below X39's own APOGRAPHE on the same lane. All eleven prose lanes move **zero**;
that is stated, not glossed.

### The planner defect found this turn

The clause is a fixed ~55–60 token cost, paid once. Charging it to the first lift sets a barrier
that a plan spread over several columns cannot cross one column at a time: on `markdown-table`
each of four columns saves ~41 wire tokens, every single-lift trial scores −19, and the search
returned nothing even though the four-lift plan measures +55. METRON adds a second pass that
re-runs the identical greedy scoring the **wire alone** and keeps the better measured total; the
X39 search is untouched and the repeat test below proves it.

### Verification

- `bench/x40/rt.ts` — **39/39**: template algebra, transform exactness, header-grammar refusals,
  and a 200-table seeded fuzz (exact or refused, never wrong).
- `bench/x39/rt.ts` re-run — **43/43**: a repaired engine inherits no trust.
- Independent CPython reader (`bench/x39/apographe_decode.py`) extended this turn with the new
  grammar **from the contract prose**, run over the real emitted messages: `EXACT` on `psql`,
  `prices`, `cue-sheet`.
- **Frontier repeat test** (`bench/x40/frontier.ts`): all 31 X39 receipt lanes re-encoded with
  X39's own call and diffed field by field. 25/31 are bit-identical on the raw receipt; four rows
  (`dump.sql`, `page.html`, `aapl-2014.csv`, `vix-daily-1990.csv`) are stale *in the receipt file* —
  X39.md records both the pre-switch inner-layer and the shipped `oura` parent (`662 [608]`,
  `561 [547]`, …) because the parent was switched during X39 — and one (`psql`) differs only in a
  lift label. Against X39.md's shipped configuration, **30/31 reproduce**; `markdown-table.md` is
  182 in the receipt and 176 on this build, an unexplained 6-token difference in the parent that
  the report counts as a **failure** of the repeat test rather than writing into the expectations.

### Honest limits

Prose does not move. The ~60-token clause means a table under roughly fifteen rows cannot pay for
itself — that floor is the unresolved interface, and it is why two lanes that plan still measure 0.
One fixed textual format per column (mixed units, suppressed trailing zeros, thousands
separators, scientific notation all refuse). Gregorian dates only. No single-character separator,
so space-aligned output (`kubectl`, `df -h`) remains out of reach. The reader's arithmetic is not
checked by the message.

`bench/x40/X40.md` has the full report: negative-space shapes (18), mechanism-distinct approaches
with A(C) (9), the generalized local-leader table, the exact unresolved interface, and the
cheapest falsification test. `docs/codec-abbreviations.md` gains the METRON spec section
(mechanism, greedy-or-not, citations, time/CPU bound) and the X40 leader table.
