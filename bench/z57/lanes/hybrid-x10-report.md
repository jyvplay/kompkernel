# X10 report: AKOLOUTHIA (arithmetic-progression elision)

Measure: o200k_base tokens of the one-chat message (contract + wire), unless stated.
Every number below is from a receipt in `bench/z55/receipts/` or from a command in this turn.

## 1. Result

| Lane | Frontier (min of DAEDALUS, DENS-2, GRAMMA, GNOMON, DENDRON, A10 where measured) | AKOLOUTHIA | Delta |
|---|---|---|---|
| chart.svg (SVG axis labels, x steps 42) | 465 | 342 | **−123** |
| df-h.txt (device indexes) | 281 | 179 | **−102** |
| kubectl-get-pods.txt (node names, IPs) | 386 | 356 | −30 |
| psql-output.txt | 397 | 378 | −19 |
| dump.sql (id columns) | 728 | 713 | −15 |
| vix-daily-1990.csv | 1394 | 1381 | −13 |
| other 37 lanes (prose, JSON, logs, diff, md, code) | unchanged | identity arm | 0 |

Total over the 43 holdout lanes, frontier min(DAEDALUS, DENS-2): 32699 → 32397 (−302, −0.92%).
No lane is worse than its frontier. The total excludes GRAMMA and GNOMON (not in the 43-lane sweeps);
they tie DAEDALUS on the six gain lanes and win only on JSON, where AKOLOUTHIA is identity, so the
delta does not change. The bench column `delta` reports against the inner wire, not the frontier; use the table above.

Verdict on the bar: "beats the frontier by more than a few tokens on at least one lane" is met
(chart.svg −123, df-h −102, both exact). "General gains preferred" is NOT met: all gains are in
structured numeric output (SVG, tables, ids). Prose lanes gain 0. Downgraded accordingly.

## 2. Mechanism and why it is not a copy

DAEDALUS pays one token per position that is not a copy of earlier text. A number that continues
an arithmetic run is a new string at each position, so the glyph dictionary cannot reach it.
AKOLOUTHIA writes one marker `⁺` at such a position. Prior art for the storage side: LeCo
(arXiv 2306.15374, learned integer column compression; delta and linear models). Not new as a
technique. The new part is the LLM-decoded, one-sentence form with an exact identity arm.

Rule (decoder): a number at position k of line i may be `⁺`, meaning
value(line i−1, k) + (value(line i−1, k) − value(line i−2, k)), in canonical decimal.
Encoder-only condition: a three-line equal-step run at position k (avoids coincidence hits).
Positions are digit runs counted left to right in each line.

Contract (one sentence): `⁺ = the number at the same position in the line above, plus the change from the line two above.` (23 tokens with the newline.)

## 3. Gates and what each one proves

- G1 (encoder): `akolouthiaExpand(substituted) === input`, else identity arm.
- G2 (encoder): DAEDALUS round trip on the substituted text, else identity arm.
- G3 (encoder): one-chat M of progression arm < plain DAEDALUS M, else identity arm.
- Refused: input already containing `⁺`; numbers longer than 15 digits. The encoder never writes a marker in the first three lines; the decoder rejects a marker in the first two.
- Identity arm: plain DAEDALUS message (the same codec as the frontier).

## 4. Verification run

- TypeScript red team (`bench/z55/redteam-akolouthia.ts`): 40 cases (SVG, negatives, leading
  zeros, zero step, decreasing, marker-in-input, 2^53 boundary, 15-digit, short inputs, CRLF,
  ragged counts, nested steps, empty, 20 seeded random grids). TS round trip failures: 0.
  Forced progression arm on 30 cases (correctness only, not savings).
- CPython reader (`bench/akolouthia_decode.py`, independent implementation of the rule, reuses
  the existing DAEDALUS reader): 33 messages, 0 mismatches.
- Repair and new attack (`bench/z55/attack2-akolouthia.ts`): the first repair fixed a real bug
  (the decoder applied the progression rule to identity messages; an identity text containing `⁺`
  threw). The arm is now an explicit decode argument. Gates re-run: red team 0 failures, CPython
  0 mismatches. New attack: non-ASCII digit look-alikes (fullwidth, Arabic-Indic, superscript),
  decimals, NBSP and zero-width space in progression lines: 3 forced cases, 0 mismatches.
- In-context decode (`bench/z55/incontext/`): forced progression message, 340 chars, decoded by the
  agent from the message alone. `cmp` equal to `sample3.txt`. Caveat: the decode happened in a session
  that had the codec source in context. This is NOT a fresh single-chat test.
- `tsc --noEmit`: rc 0.

## 5. LLM-native decoding: status

Downgraded. Shown: the message format is decodable by the agent in one pass (hand decode matched).
Not shown: a fresh chat without the source in context. Next test: a clean chat with only the
message and the two-sentence contract, decode 8 lines of `sample3`.

## 6. Frontier restated (hypotheses)

- DAEDALUS-D (plain): one-chat M = contract + DAEDALUS wire. Hypothesis: prose and ops text repeat
  substrings; no progression. Measured: the frontier on all 43 lanes.
- DENS-2 (`dendrons`): brace-tree with a bash-named dispatch rule. Hypothesis: tree-shaped
  listings. Measured: sweep-dens2 (43 lanes); leads on git-numstat (1904 vs 2036), find-listing
  (1318 vs 1326), tree-src (970 vs 1040).
- A10 (PARADEIGMA + DAEDALUS-D): worse than DAEDALUS on all six AKOLOUTHIA lanes (e.g. chart 539,
  df-h 414, psql 437, kubectl 547, dump 876, vix 1589). Measured this turn.
- GRAMMA / GNOMON / DENDRON: equal to DAEDALUS on the six lanes (measured this turn); GRAMMA wins
  JSON (package-lock family), where AKOLOUTHIA is identity.
- Open interface: an exact, LLM-decodable rule for numbers that are NOT a 2-line step (dates with
  wrap, zero-padded runs, multi-column steps). Not attempted.

## 7. Negative space (shapes that look like solutions and fail)

1. Two-line gate for progressions: +68 on aapl-2014 (coincidental hits). Superseded by the three-term run gate. The three-term gate still gives +125 gross on aapl-2014 (`arith-probe-43.jsonl`): substituted markers break DAEDALUS copies of repeated numbers. The codec refuses that lane (identity).
2. Lowercasing prose for token gain: −16 to +16 across six lanes; not a codec.
3. KLADOS drawn-tree box: 357 vs 282 (tree-bench), 1096 vs 1040 (tree-src); net loss after contract.
4. Digit-depth or indent elision for drawn trees: 14–40 tokens before contract; glyph dictionary
   already pays prefixes.
5. ASCII drawn-tree round trip: fails on truncated npm-ls lines.
6. DENS-M subtree merge: DAEDALUS glyph dictionary already pays repeated tails.
7. One long contract line for all trees: regressed git-ls-files-400 (1461 → 1487).
8. Dotted-key probe without verbatim escaping: non-exact −21%; not citable.
9. Blank-probe upper bounds (−226, −357): not realized savings.
10. Unified-diff hunk headers as a standalone codec: about 4 net tokens per hunk.
11. `#define` rule delimiters: per-rule cost exceeds the contract.
12. Front-coding against the first URL: base must be the object's `url` key only.
13. Stem-rule inverse without a closing quote: ambiguous.
14. GNOMON REST rule with the 48-token sentence: negative; retry only with a shorter sentence.
15. Wording cuts of contracts: 3–11 tokens; not a general gain.
16. Unified-diff lane: 0 progression hits (`arith-probe`, 2-line gate).
17. aapl-2014 with the codec: identity arm (the substituted wire is larger than plain DAEDALUS, so G3 refuses it).
18. The arm-unaware decoder (repaired): applied progression to identity messages, threw on text
    containing `⁺`. Shape fixed; kept in the list so it is not reintroduced.

Modal shortcut test: "if the lane is structured, the codec wins" fails on prose lanes (0 gain) and
on aapl-2014 (identity). A codec must be judged on the whole lane set, not the lane it was found on.

## 8. Mechanism portfolio (status of each approach)

Each row is an approach, its artifact, the part proved here, the unresolved interface, and a
falsification test. The gap is local (solvable inside the codec) or equivalent to the original
problem (needs a new decoder ability).

1. Arithmetic progression elision (AKOLOUTHIA, built). Artifact: `src/lib/omega/akolouthia.ts`.
   Proved here: exact on 43+40+3 lanes/cases, both readers. Open: generality beyond structured
   numeric lanes; fresh-chat LLM decode. Falsification: a prose lane with a ≥1% gain. Gap: local.
2. Nonconstant step (quadratic, date wrap). Not built. Falsification: the wire gain on dates.
3. Front-coding of sorted keys (Re-Pair front coding, SAP HANA 2020 preprint). Not built, not fetched.
   Falsification: DAEDALUS M on dotted-key lanes. Gap: unknown.
4. Drawn-tree redraw (KLADOS). Built, net loss. Falsification met.
5. Case mask. Probed, dead end.
6. Contract-language compression (X9, −3). Dead end.
7. Subtree merge (DENS-M). Dead end on tokens.

Equivalence to the original problem: none of the six is equivalent to the stated problem; each is a
local gain on a class of lanes.

## 9. Outcome space

- H+ (success): the bar is met on structured lanes; exactness holds on all gated lanes.
- H− (failure): general prose lanes gain nothing; the codec is structured-lane only.
- H∂ (undecided): the LLM-native claim rests on one same-session decode; a fresh-chat test has
  not been run.

## 10. Verification downgrades

- No formal proof of the rule beyond the encoder gates and the two readers.
- OpenAI math proofs: not reviewed. `/tmp/openai-math-contents.md` does not exist in this sandbox; not
  re-obtained this turn. Downgrade: no claim about them.
- PR #27 and #28 reproduction: not run this turn. PR #23 and #13: not mined this turn.
- Live searches this turn: LeCo (2023), arithmetic coding handbook (2023), integer-list compression
  (2022), ClickHouse delta codecs (2026), CompactPrompt (2025), LoPace (2026), MedTPE (2026). All prior
  art or not applicable as recorded in the session memory.

## 11. Runtime honesty

Tools used this turn: bash (`git`, `gh`, `python3`, `tsc`), the esbuild and node runner
`bench/tmp/run.sh`, the background process tools, and the web search tool (earlier this turn).
CPython 3 for the reader. `gh pr list` returned 15 open PRs. No external verifier beyond the in-repo
readers and `tsc`. No sub-agent, no parallel model run. Token counts come from the repo's `countTokens`
in `src/lib/omega/bpe.ts` (chunked fast path, falls back to the exact encoder). Checked this turn:
fast == exact on six reported messages and files (`bench/z55/tokcheck.ts`). Not checked against
tiktoken itself (not installed). The in-context decode was done by the agent in this session.

## 12. Next tests

1. Fresh-chat decode of `bench/z55/incontext/message3.txt` (LLM-native claim).
2. Nonconstant-step and date-wrap probe on the 43 lanes (gross first, then gate).
3. Compose AKOLOUTHIA with DENS-2 on structured lanes (no compose done).
4. Reproduce PR #27 and #28 on the same lanes.
