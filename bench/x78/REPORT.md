# X78 — KERMA, and a proper profile of where the time goes

**Shipped:** codec `kerma` (`src/lib/omega/kerma.ts`, registry key `kerma`, 243 codecs
total, byte-exact on 4/4 smoke lanes).

| | |
|---|---|
| **Result** | fires on **1 of 14** lanes; **psql-output.txt 244 → 172 (−72 tok, −29.5 %)** |
| **Why that lane** | its numbers are dates **and** decimal amounts (`###.##`), a shape no existing codec has a rule for |
| **Why not others** | every refusing lane is timestamp- or version-shaped, which HORA/HEMERA/STATHMOS/STIGME already own |

---

## 1. The discovery: the token economy is lopsided

The currency is tokens, not characters, and the o200k pretokenizer allows **three digits
per chunk** (`\p{N}{1,3}`) while every separator starts a chunk of its own
(`bench/x78/quirk.ts`):

| string | tok | packed | tok |
|---|---:|---|---:|
| `2026-09-30` | 6 | `20260930` | **3** |
| `08:00:03` | 5 | `080003` | **2** |
| `192.168.1.100` | 7 | `192168100` | **3** |
| `1,234.56` | 5 | `123456` | **2** |
| 12 log lines, ISO dates + times | 251 | packed | **179** (−28.7 %) |
| IPv4 column | 131 | packed | **95** (−27.5 %) |

This is a **tokenisation-efficiency** change, not a redundancy change — which is why,
unlike every other mechanic tried in X77/X78, it is not eaten by the frontier.

## 2. Mechanics priced this turn

| # | mechanic | result |
|---|---|---|
| 1 | short/long cache unification in `countTokens` | **neutral** (11 234 ms vs baseline mean 11 190 ms) — reverted, not shipped |
| 2 | column alignment by padding (`align-colon/eq/space`) | loses +12…+49 — refused |
| 3 | right-pad every line to equal width | loses +12…+63 — refused |
| 4 | pre-frontier long-literal interning (L≥10, packed Cyrillic ids) | **+201 over 8 lanes** — refused |
| 5 | **arbitrary-shape digit elision (KERMA)** | **−72 on psql-output** — **shipped** |

Mechanics 2–3 tested the asymmetry X77 measured (frontier marginal rate on padding is
0.11, so adding padding should be nearly free). It is nearly free — padding cost only
~4 tokens on `df-h` — but it buys **nothing**: the frontier already handles ragged
tables. The asymmetry is real and useless.

Mechanic 4 is the most informative negative. Packed Cyrillic ids cost **0.56 tokens
each** (`bench/x78/idcost.ts`: 16 chars → 9 tokens), and the break-even table says
interning pays from L≥8/n≥5. It still lost: `find-listing` saved **1 565 raw tokens**
and came back **+71** through the frontier. The frontier captures essentially all
literal repetition.

## 3. A real profile at last

X77's instrumentation was void. This turn used `node --cpu-prof` (`bench/x78/pprof.cjs`,
`pinc.cjs`) and phase-isolated micro-benchmarks.

| self time | | |
|---|---|---|
| `countTokens` | 15.5 % | |
| `scoreRunCostDelta` | 14.9 % | frontier search |
| `renderBest` | 12.0 % | frontier search |
| `rankAt`/`mergeCount`/`fastChunkCount` (BPE) | ~16 % | |
| GC | 6.8 % | |

Call volume (`bench/x78/hist.ts`): **761 408** calls on `df-h`, **2 923 153** on
`findmnt` — of which **98.8–99.1 % are on strings shorter than 24 characters**.

The X77 hypothesis (that `String.match()` substring allocation dominated) is **wrong**.
Cold phase measurement (`bench/x78/split2.ts`):

```
regex .match()            3.5 %
coverage check            1.0 %
chunk lookup + misses    95.5 %
```

Acting on that, `bpe.ts` was changed to route short strings through the chunk cache
(they previously bypassed it, running a full BPE encode on 604 367 misses per two
lanes). **It measured neutral and was reverted.** No speed improvement is claimed for
X78. The remaining cost is 1.9 M chunk lookups inside `countTokens`; a real win would
need an O(1) prefix-sum index over chunk boundaries, which is an architectural change
to how the frontier prices candidates, not a micro-optimisation.

## 4. KERMA gates

G1 width uniqueness · G2 no bare-run collision · G3 no merge · G4 byte-exact round trip
· G5 strict win. Comma and plus are excluded from the separator set: in CSV they are
*field* separators, and eliding them fuses a whole row into one number. Measured:
`vix-daily-1990.csv` went 461 → 629 (+168) before the exclusion was added.

## 5. Runtime honesty

Executed: `node --cpu-prof` + two profile parsers; `hist.ts`, `hits.ts`, `split.ts`,
`split2.ts`, `idcost.ts`, `quirk.ts`, `norm.ts`, `intern.ts`, `pack.ts`, `k.ts`,
`ab.ts` (3 runs, alternating arms), `smoke.ts` (registry, 4 lanes); `gate73` 29-lane
config run. `npx tsc --noEmit` after every source edit. `bpe.ts` was modified then
**reverted** after a neutral A/B; the reverted patch is described in §3 and is not in
the commit. Every number above comes from a run in this turn.
