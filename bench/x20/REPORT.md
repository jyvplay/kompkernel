# X20 report — ANADESMOS, and what the 26-lane + 32-file evidence says

Everything below was executed in this repository in this session. Numbers come from the JSONL receipts
in this directory; `docs/codecs.md` carries the per-codec design specs and the frontier restatement.

## 1. What was shipped

`src/lib/omega/anadesmos.ts`, registry key `anadesmos`, family `exact`, fidelity `exact`, identity-guarded.
It was the single new codec of the turn, and it is not an analysis-only artifact: it is wired into
`src/lib/omega/registry.ts` next to `lakonikos-d` and `stathmos`, and it encodes by composing the
LAKONIKOS-D wire with one discovered prose note line, e.g.

    @nd lines 2-127 only; cols 2,3,4,5 = 6 decimals; line ends are CRLF

After the wire the message ends with the only instruction the reader is given:
`Apply the first line to the text below it, then drop it.` There is no system prompt, no skills file,
no schema, no side channel: the note must be enough. Families implemented: `crlf`, `seq` (row numbers),
`dp` (fixed decimal scale), `iw` (zero-padded integers), `ral` (whitespace-table column padding),
`cols` (absolute column anchors), `nl`/`nlm` (fixed-width line cuts), `wrap` (hard-wrapped paragraphs).

The whole message for the vix lane looks like this (contract and rule tape elided, the note is real):

    <CHIRON contract sentence> <rule tape> <body>
    Apply the first line to the text below it, then drop it.

and the body's first line is the `@nd` note. A reader expands the tape, reads the note, applies it, and
deletes the line.

## 2. Verification

| check | result |
|---|---|
| Gate 1, cascade + fuzz (`nd-cascade-test.ts`) | **PASS 27 FAIL 0**; 18 synthetic edge cases (CRLF, empty, one char, no-newline, ragged, tabs, NBSP, 400-char line, sparse arrays, header-only tables), 26 real-lane properties, 400 fuzz cases from 4 generators, 0 exactness failures |
| Byte-exactness on lanes | 26/26 lanes: `decode(encode(x)) === x`; 32/32 corpus files: same |
| Second reader, independent implementation | `bench/x20/xcheck.py` + `bench/x20/anadesmos_decode.py` (CPython, written from the note prose only, shares no code with the TS encoder; the CHIRON layer is re-checked with `bench/chiron_decode.py` from X11): **62/62 messages exact** — 57 shipped wires + 5 note-layer cases where the one-chat gate had refused the arm, so every fired family is exercised |
| Model readability, hands-on | one real, previously unseen slice (`vix-daily-1990.csv` lines 21-40) was encoded, and the note was applied by an LLM in one turn with no skills file: **byte-identical** to the original (1,019 chars, 20 lines, 100 numeric fields restored). Caveat: the decoder model is the codec's author and had seen this corpus in-session — it is a readability smoke test, not an independent user study |
| One false alarm, recorded | a `ral` note typed by hand for the same test (`1 space apart, widths 6,4,4`) did not reproduce the file. That note was wrong-by-construction (the real gap is 2); the encoder-emitted `ral` notes reconstruct exactly in both implementations. Kept here because it is the failure mode the design is meant to catch: a mis-read note does not silently corrupt, it changes bytes |

## 3. Measured gain, and the honest limit

`M` = o200k_base tokens of contract + wire in one chat message. `nd-lanes.jsonl` = LAKONIKOS-D vs
ANADESMOS on 26 lanes; `corpus-nd.jsonl` = the same on 32 real README/CHANGELOG/LICENSE files.

| set | lanes | better | unchanged | worse | sum Δ M |
|---|---|---|---|---|---|
| bench lanes (26) | 26 | **1** (vix CSV 1380 → **1211**, −169, families `crlf+dp`) | 25 | **0** | −169 |
| general corpus (32 real OSS docs) | 32 | 0 | 32 | 0 | 0 |

For context, STATHMOS (fixed-decimal CSV only, whole-file admission) reaches 1212 on the same vix lane,
so the region-based `dp` is 1 token cheaper there and also covers CRLF; on the other 25 lanes ANADESMOS
is by construction LAKONIKOS-D.

Two arms were screened inside the cascade and then **refused by the one-chat gate**, which is the
mechanism working, not failing:

* `nlm` on aapl-2014: 410 tokens of raw headroom, cascade net +372, but `M` rose 1587 → 1761.
* `ral` on ops-git-log-stat: raw net +32, `M` rose 3484 → 3523.

**The load-bearing finding of this turn: raw-token headroom does not predict wire gains.** Measured
headroom on the 26 lanes (`fmt-probe.ts`, token counts on the raw text) was `pad` 1,001 tokens over
15 lanes, `unwrap` 855 over 26, `scheme` 201, `trailws` 15, `crlf` 0, `typo` 0. At the wire level:

* newline / hard-wrap elision: ~0 to strongly negative. Between two words, `\n` is absorbed into the
  following word's token, so cutting it saves nothing; and on data lines it destroys the line structure
  that LAKONIKOS-D's rule tape binds, which is worth far more (aapl: −174).
* column padding: the tape already binds a large part of it — `ral` recovered 62 of 416 raw pad tokens on
  the ops log.
* numeric formatting: untouched by the tape, and it pays (vix −169). A trailing `0` in `17.240000` is a
  whole token, and there are hundreds of them.

`registry-smoke.ts` carries one more instance of the same law: a synthetic 60-row CSV whose `amount`
column is uniformly 6-decimal gives ANADESMOS a raw cascade gain of +91, and the gate still refuses it,
because LAKONIKOS-D's `span12` arm compresses the whole repetitive table to 236 tokens and adding a note
would take it to 327. A codec that skipped the wire gate would have "won" that file by a wide margin in
the headroom table and lost 91 tokens in the message. On the same input STATHMOS reports
`transformed=false`, i.e. region-scoped discovery does find columns the whole-file admission misses; it
just does not always pay.

A substitution tape binds repeated *strings*. It cannot bind "this column's digits end in zeros" or
"this number continues the step from the line above". That is where the remaining general gain is, which
is also why AKOLOUTHIA-2 (arithmetic progressions) remains the best single key measured (−399 over 22
lanes) and why the whitespace families keep coming up empty.

## 4. Frontier, restated (item 2 of the brief)

`frontier-x20.jsonl`, 22 lanes with numbers, nine keys, `M` per message. Totals vs DAEDALUS 21,942:

    AKOLOUTHIA-2 21,543 (-399)   DENS-2 21,802 (-140)   STATHMOS 21,838 (-104)
    DAEDALUS 21,942 (0)          DENDRON 21,942 (0)     GRAMMA 21,942 (0)
    LAKONIKOS-D 22,006 (+64)     ANADESMOS 22,006 (+64 in that file; see §3 for the final-codec numbers)
    DAEDALUS-D 22,198 (+256)

Best-or-tied lane counts: STATHMOS 11, ANADESMOS 10, LAKONIKOS-D 10, AKOLOUTHIA-2 9, DENS-2 6, DAEDALUS 4.

So the proposed frontier "DENS-2, AKOLOUTHIA-2, DAEDALUS-D, A10" is **partly false**:

* AKOLOUTHIA-2 ✓ holds, and is the best total.
* DENS-2 ✓ holds on path/URL listings (find-listing 1318, git-numstat 1904) and ties on 4 CSV/log lanes.
* DAEDALUS-D ✗ — 0 lanes won, +256 in total. It is a tokenizer-robustness variant, not a leader.
* A10 ✗ — not run in X20: it was +10…+239 on every X11 lane and timed out >30 min on a 40 KB lockfile.
* Missing from the claim: STATHMOS (and now ANADESMOS, which subsumes it), and the fact that LAKONIKOS-D
  is *worse in sum* than DAEDALUS while being better on prose — the contract-size win does not survive
  the CSV/table lanes on its own.

Restated: the per-lane frontier here is `min(AKOLOUTHIA-2, DENS-2, ANADESMOS, DAEDALUS)`, with
ANADESMOS = LAKONIKOS-D + numeric-format arms, never worse than LAKONIKOS-D on 58 lanes.

## 5. Local leaders by category (22 measured lanes; details in `docs/codecs.md`)

| category | leader | M |
|---|---|---|
| prose / KB / email / meeting / readme / ls / git-log-iso | **LAKONIKOS-D** (= ANADESMOS identity) | de-kb 481, kb-article 640, email 520, meeting 411, readme 678, bibliography 699, llm-answer 696, stacktraces 332, ls-full-iso 395, git-log-iso 1520 |
| ops tables (df, kubectl, psql) | **AKOLOUTHIA-2** | 171, 326, 355 |
| path & URL listings | **DENS-2** | 1318, 1904 |
| structured numeric (SVG, SQL) | **AKOLOUTHIA-2** | 330, 703 |
| CSV with fixed scales | **ANADESMOS** (vix 1211; STATHMOS 1212) | aapl/csv-8/sp500 stay with DAEDALUS = DENS-2 (1490, 1695, 4262) |
| logs | DENS-2 = DENDRON = DAEDALUS | 1008 |
| 32 real OSS README/CHANGELOG/LICENSE files | nothing separates; all measured codecs are within a few tokens and identity-gated | ANADESMOS = LAKONIKOS-D on 32/32 |

## 6. Prior art actually read this turn, and what it changes

* **FliPpr** — Matsuda & Wang, ESOP 2013 (pdf at `www2.sf.ecei.tohoku.ac.jp/~kztk/papers/kztk_esop2013.pdf`).
  Invert a pretty-printer to get a consistent parser; `line`/`space` are reinterpreted as whitespace runs so
  layout is not transmitted. This is the formal ancestor of "don't send the binding". Difference: they
  invert a *program* with a proof; ANADESMOS states a rule to an LLM and pays only when byte-exactness and
  `M` both hold. If you want the proof-style guarantee, that is the paper to extend.
* Eberhart, *parsing/pretty-printing as a Galois connection* (`group-mmm.org/~eberhart/research/report_m1.pdf`);
  Affeldt/Nowak/Oiwa on invertible syntax descriptions — the same theme, formal side.
* **SuperBPE** (arXiv 2503.13423, COLM 2025): BPE is capped at ~4.68 bytes/token by whitespace
  pretokenisation; superwords reach 6.63. **CoBPE** (arXiv 2610.05597): compound tokens encode leading
  space/capitalisation/punctuation as modifiers, ~1.4× bytes/token. **BoundlessBPE** (arXiv 2504.00178):
  removes the `F-5 r"\s*[\r\n]"` / `F-6 r"\s+(?!\S)"` pretoken patterns. All three measure the redundancy
  this codec exploits, and none of them can be assumed inside a chat box — we cannot change the tokenizer,
  so we delete the marker from the wire instead.
* Singh & Strouse 2024 (cited inside BoundlessBPE): adding thousands separators to numbers *reduces* LLM
  arithmetic errors. Recorded as the counter-argument to `dp`/`iw`/`grp`: the reader must restore digits
  before any arithmetic, which is why restoration is gated on exactness, not plausibility.
* LeCo arXiv 2306.15374, LogShrink DOI 10.1145/3597503.3608129, arXiv 2408.05760 (log/numeric column
  compression), ACL 2025 prompt-compression line (PCC 2025.acl-long.1394, 500xCompressor 2025.acl-long.1219,
  E2LLM 2025.emnlp-main.970, ACC-RAG 2025.findings-emnlp.1307): value and prompt compression, not a
  byte-exact LLM-decoded wire. These were read in earlier turns of this session's lineage; re-verify
  before quoting figures from them.

## 7. OpenAI `math` review (item 5 of the brief)

`gh api repos/openai/math/contents/CONTENTS.md` → 638,727 bytes, repo present. Coverage this lineage: 8 of
80 chunks of `CONTENTS.md`, and proof #128 (2-approximation for shortest common superstring) read in full.
Verdict: **not codec-relevant** — SCS bounds dictionary construction, our dictionary codecs (VERITAS-*) do
greedy phrase selection under a measured gate and would not inherit an approximation guarantee from it.
No Lean toolchain here, so nothing was machine-checked.

## 8. AI-native moves (item 6) — with the measurement that justifies each

1. Price every mechanism in the reader's *token* currency, never in bytes or characters. It killed three
   plausible families (wrap, nl, pad-as-headline) and found the one that pays (digits). A human optimiser
   reporting "1,001 characters of padding" would have shipped a net loss.
2. Make the decoder the gate, per message: `decode(encode(x)) === x` and `M(arm) < M(base)` — so a family
   can be kept even while it is a measured loss on most inputs (0 lanes worse over 58).
3. Carry parameters as one prose sentence, not a compiled clause: 49-54 → 38-51 tokens fixed, and the codec
   started firing the same day. LLM readers do not need a header; they need a sentence.
4. Compose with the strongest base even where that base is not a leader (LAKONIKOS-D is +64 in sum, but it
   is the right floor per lane, and the arm gate means a bad base never makes things worse).
5. Search where the model's own redundancy detector cannot look: a substitution tape binds strings, not
   arithmetic or digit formatting. The residual gain lives in "the tape is blind to this axis".

## 9. What was not done (do not read this file as claiming otherwise)

* No independent model study: the readability test above was run by the codec's author model on one lane.
  A second model or a human reader is still owed, and it is the main threat to the "no skills file" claim.
* No proof of the note spec: FliPpr-style inversion or a small grammar + soundness argument is the obvious
  next step; today the guarantee is empirical (26+32 lanes, 400 fuzz cases, second implementation).
* The 32-file corpus lives in `node_modules` (git-ignored): `corpus-manifest.json` pins paths, byte sizes
  and SHA-256 prefixes, but the files themselves are not committed, so the corpus is not reproducible from
  a clean checkout alone.
* `ral`/`cols`/`nl`/`nlm`/`wrap` are kept as measured-negative-but-gated arms. Nothing was tuned to make
  them look better; `fmt-probe.ts` headroom and the refusals are reported side by side.
* `frontier-x20.jsonl` has 23 of 26 lanes (the two long changelog lanes and one log lane were still
  encoding when this was written) and its `anadesmos` column was produced before the last codec edits —
  use `nd-lanes.jsonl` for ANADESMOS numbers.
* No package installs, no network beyond the search/fetch tools and `gh api`, no Rosetta use as an oracle
  (read for analysis only, as instructed).

## 10. Next, in order of expected yield

1. Digit-format arms are the live vein: `grp` (thousands separators, 0 candidates on this lane set — needs a
   corpus with human-written numbers), scientific notation, `iw` on ID columns, scale inference across
   multiple CSV files of one table.
2. Prove the note spec (one sentence per family is small enough to specify honestly) and re-run the reader
   study with a model that has not seen this session.
3. Make `ral` competitive by charging the widths only where the table is not tight, then re-measure against
   AKOLOUTHIA-2 on ops tables — it is the only lane family where the two mechanisms overlap.
4. Add the tournament key (selector byte + both contracts) if, and only if, `frontier-min` numbers are ever
   presented as a shippable codec rather than an upper bound.
