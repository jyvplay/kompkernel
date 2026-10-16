# X14 report: HEMERA (calendar-day deltas, three arms)

Status: a codec is committed (HEMERA, registered as `hemera`). It is byte-exact on all 25 lanes in the lane list and a conditional gain: it helps on dated tables and dated logs, and it is identical to identity on prose. It is not a general codec win. No LLM was available to test decoding.

## 1. What was built

- `src/lib/omega/hemera.ts`: three arms, each with its own contract:
  - `ms` (HORA's ms-delta contract, 23 o200k tokens): `※N` for a same-date full timestamp.
  - `days` (23 tokens): `※dN` for a date 1–31 days away from the previous date, either direction.
  - `both` (36 tokens): both marks. It was never selected on any lane.
  - Identity guard: the encoder keeps the smallest one-chat message that passes all gates, otherwise identity (DAEDALUS plain).
- State repair (this stretch). The first ms arm gave 0 marks on openstack. Cause: date-only tokens (for example the file name `2017-05-16_13:53:08` on every line) reset the shared time state. The fix uses two states, in the encoder and the reader:
  - `lastDay`: last valid date of any kind; drives `※dN`.
  - `fullDay`, `fullSep`, `fullTod`: set only by timestamps with a time part; drive `※N`.
  - Result: openstack now produces 25 ms marks and matches HORA exactly (987).
- `bench/hemera_decode.py`: independent CPython reader (DAEDALUS decode, then HEMERA expansion), updated to the two-state rule.
- `registry.ts`: `hemera` entry added.
- `docs/codec-abbreviations.md`: HEMERA entry (mechanism, greedy, citations, time/CPU bound), second-tier numeral analysis, ROSETTA analysis-only note.

## 2. Verification (this stretch)

| Check | Result | Artifact |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | (run after the final edits) |
| Red team, 59 cases (56 original + 3 attacks on the repair) | 59/59 pass, `OMEGA_DET=1` | `bench/z59/hemera-redteam.out` |
| Patch attacks: date-only token between timestamps; day step then ms; ms after a date-only token | all exact | same |
| Lane run, 25 lanes, final code | 25/25 exact | `bench/z59/hemera-lanes.jsonl` |
| CPython reader on 4 messages (AAPL days, VIX days, openstack ms, PSQL days) | 4/4 exact | `bench/z59/receipts/hemera-py.json` |

Caveats on these checks:
- The red team uses synthetic cases written by the same agent that wrote the codec. It shows transform exactness, not generality.
- The CPython reader is an independent implementation of the spec, not an LLM. The 4/4 result shows the spec is implementable, not that an LLM decodes it.
- The openstack lane was used to debug the ms arm. Its number (987) is therefore post-hoc and is not a held-out result.

## 3. Results on the 25-lane list (o200k tokens, contract included, one chat message)

Frontier column = `bench/z59/receipts/leaders.json` (receipts; the frontier codecs were NOT re-run this stretch, except AAPL, VIX and csv-8 in `frontier-dates.jsonl`, which agree with the receipts).

| Lane | Category | HEMERA | Arm | Identity | Frontier min | HEMERA − frontier |
|---|---|---|---|---|---|---|
| aapl-2014.csv | temporal table | 1252 | days | 1490 | 1490 (DAEDALUS) | **−238** |
| vix-daily-1990.csv | temporal table | 1199 | days | 1394 | 1369 (AKOLOUTHIA-2) | **−170** |
| openstack-loghub-26.log | ops log | 987 | ms | 1008 | 1008 (DAEDALUS) | **−21** |
| psql-output.txt | ops table | 391 | days | 397 | 355 (AKOLOUTHIA-2) | +36 |
| csv-8.csv | temporal table | 1695 | identity | 1695 | 1695 | 0 |
| 20 other lanes | prose, ops, markup | = identity | identity | = identity | see leaders.json where a row exists | 0 to +135 on the 13 identity lanes that have a numeric leaders row (7 identity lanes have no leaders row); the gap is an existing frontier leader, not HEMERA |

Reading the table:
- The literal bar (beat the frontier by more than a few tokens on at least one lane) is met on three lanes: AAPL, VIX, openstack.
- All three are dated-timestamp lanes. Prose lanes gain nothing (HEMERA = identity). The user asked for general gains over niche ones, so this is a niche result.
- On PSQL, HEMERA beats identity by 6 but loses to AKOLOUTHIA-2 by 36.
- The `both` arm never won; its 36-token contract costs more than the gain it adds on these lanes.

## 4. Other X14 results

- TOON (`@toon-format/toon` 4.4.0): negative on all three CSV lanes. TOON-only is 1.8–2.7× identity (3633/1490, 3709/1394, 3026/1695); DAEDALUS on TOON is 1712 vs 1490 (AAPL), 1440 vs 1394 (VIX), 1755 vs 1695 (csv-8). Receipts: `bench/z59/receipts/toon-measure.jsonl`.
- Alias tier (user's language-tier idea): tested in X13, negative (de-kb −4 at best, +10 to +15 elsewhere). See `docs/codec-abbreviations.md`.
- Second-tier numerals: a numeral costs one o200k token, the same as a foreign-word alias, so the tier adds no cheaper entries. Not measured.
- ROSETTA: read for analysis only. Not a baseline in any table.
- `openai/math` result 128 (superstring 2-approximation): a string-set result. Not one-chat-decodable (offsets needed). The Lean claim was not verified here.

## 5. X13 items that are NOT complete

The X13 ultrareview asked for more than was done. These items are open and are NOT claimed here:

- Codebase and open-PR scan for combinable codecs: not done in this session.
- Live literature search over the last ten years for the new terms: not done (four earlier searches only, listed in the session memory).
- Review of the OpenAI math proofs individually: not done. Only the index and the first chunk of `CONTENTS.md` (results 001–003) were read.
- Formal model (admissible objects, access model, quantifier order, tolerances), outcome space H+/H−/H∂, negative space (≥15 shapes), mechanism portfolio (≥6 approaches), and the modal-shortcut test: not written.
- Nine AI-native ideas beyond the language-tier idea: not written.
- The frontier was not re-run for all lanes. Only the leaders table from receipts is used.
- ollama: not completed. Jellyfin: not run.
- LLM-native decoding: NOT verified. No LLM was available to run.
- PARADEIGMA: no gain on the measured lanes.

## 6. Next test

1. Run an LLM decode of the AAPL and openstack HEMERA messages (needs an LLM endpoint; none is available in this sandbox).
2. Build a held-out dated-log lane not used in debugging, to test the openstack number.
3. Measure the `both` arm on a lane that has both dates and ms timestamps in the same file, to see whether its 36-token contract ever pays.
4. Re-run the frontier codecs on all 25 lanes so the leader column is not receipts-based.
