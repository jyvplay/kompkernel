# Local leaders by category (X20, 2026-10-16)

The user-facing question this page answers: *given the kind of structure I have to send, which codec is
the local leader?* — with a category list that generalises the per-lane frontier table in
`bench/x20/REPORT.md` §E3 and the mechanisms in `docs/codec-abbreviations.md`.

**M** = one chat message, o200k_base tokens of decoder contract **plus** wire, counted once, with no
system prompt and no skills file. Every number below comes from the receipt named in the same row, all
produced in X20 unless the row says otherwise.

## 0. The general answer: the union

`henosis` (X20) runs the arms below in one encoder, verifies each candidate with **its own reader**
(byte-for-byte round trip), reduces each candidate's contract with SIGE, and emits the cheapest
admitted candidate as `wire + contract` with **no selector byte** — the contract *is* the label. So on
every lane, `M(henosis) ≤ M(any arm)`, and the identity arm is DAEDALUS-D.

| lane (12, `bench/x20/receipts/henosis-lanes-v2.jsonl`, all `exact`) | winner | M | same arm alone | best single codec before X20 |
|---|---|---|---|---|
| holdout-lang/de-kb.txt | sige (DAEDALUS-D) | **472** | 472 | 476 |
| holdout/readme.txt | sige | **668** | 668 | 673 |
| holdout-work/llm-answer.md | sige | **686** | 686 | 691 |
| holdout-work/bibliography.txt | akolouthia2 | **683** | 709 | 694 |
| holdout-tbl/psql-output.txt | akolouthia2 | **329** | 355 | 382 |
| holdout-tbl/df-h.txt | akolouthia2 | **145** | 171 | 264 |
| holdout-tbl/kubectl-get-pods.txt | akolouthia2 | **300** | 326 | 375 |
| holdout-mk/chart.svg | akolouthia2 | **303** | 329 | 450 |
| holdout-ops/find-listing.txt | dendrons | **1298** | 1318 | 1327 |
| holdout-ops/git-numstat.txt | dendrons | **1884** | 1904 | 2021 |
| holdout-tab/vix-daily-1990.csv | hemera | **1177** | 1199 | 1375 |
| holdout-tab/aapl-2014.csv | hemera | **1230** | 1252 | 1582 |

The "same arm alone" column is the point of the union beyond the arm choice: the *contract* of the
winning arm is itself reducible, and on the small arithmetic lanes that is 15–20 % of the bill.

## 1. Prose and documents

| Structure | Lanes | Leader | Margin | Receipt |
|---|---|---|---|---|
| English prose: KB articles, READMEs, model answers, email/meeting transcripts | de-kb, kb-article, llm-answer, readme, email-thread, meeting-transcript | **SIGE** — DAEDALUS-D's wire with the 18–21-token contract instead of 38–40 | 9–20 over DAEDALUS-D, 8–10 over LAKONIKOS-D, 4–7 over the union's own plain-tokenizer arm | `contract-compare.ts` (4 lanes, one process); X16/X17 prose tables |
| Prose that is *rows of a repeated template* (transcripts) | meeting-transcript | **five-way tie** — AKOLOUTHIA-2, DAEDALUS, DAEDALUS-D, DENDRON, DENDRON-S all 420 | 52 over A10 (472) | `frontier-A/B.jsonl` |

Prose is the category where the *mechanism* story is smallest: no structural arm (progression, brace
tree, timestamp deltas) has ever won a prose lane, and the entire gain over plain DAEDALUS comes from
the grammar plus the contract wording. Absolute sizes: de-kb identity 525 → **472**; readme 843 → **668**.

## 2. Operations — tables with numeric structure

| Structure | Lanes | Leader | Margin | Receipt |
|---|---|---|---|---|
| Rows where every numeric column advances by a constant step (`df -h`, `psql`, `kubectl`, `ls -l` sizes, SQL dumps, SVG coordinates) | df-h, psql-output, kubectl-get-pods, chart.svg, dump.sql, vix-daily-1990 | **AKOLOUTHIA-2** (`⁺` = the number above plus its change) | −25 (dump.sql, vix) to −135 (chart.svg) against the grammar arms on identical wires in the fresh frontier run; −26 for the union's message against AKOLOUTHIA-2 shipped alone (df-h 171 → 145, kubectl 326 → 300, chart.svg 329 → 303, psql 355 → 329) | `frontier-A/B.jsonl`; `henosis-lanes-v2.jsonl` |
| Tables whose numbers repeat *without* a step (header columns, ids, enum codes) | csv-8, sp500-200, ls-full-iso | **tie** across the grammar arms | A10 +185…+570 | `frontier-A/B.jsonl` |

Rule of thumb: if you can compute the next row's number from the two rows above, AKOLOUTHIA-2 is the
leader by a wide margin; if the numbers are merely *repeated*, the grammar is the leader and nothing
structural pays.

## 3. Operations — listings, paths, ordered sets

| Structure | Lanes | Leader | Margin | Receipt |
|---|---|---|---|---|
| Directory trees, shared path prefixes, counter columns, `git` numstat | find-listing, git-numstat, ops-ls-l-omega | **DENS-2 / DENDRON-S** (brace tree over the grammar) | −8 (find-listing) to −132 (git-numstat) against the grammar arms; −20 for the union's message vs the arm shipped alone | `frontier-A/B.jsonl`; `henosis-lanes-v2.jsonl` |
| Sorted-looking listings where the *rows* are a prefix family but every name repeats | ls-full-iso, ops-ls-l-bin | **tie** (grammar arms) or DAEDALUS-D by 2 | ≤ 2 | `frontier-A/B.jsonl` |

## 4. Operations — logs, traces, timestamps

| Structure | Lanes | Leader | Margin | Receipt |
|---|---|---|---|---|
| Log lines with a stable timestamp cadence | openstack-loghub-26 | **HEMERA on the X19 measurement (987), by 21** — but HEMERA/HORA are *not* in the fresh frontier key set, where all four grammar arms tie at 1008 and A10 is 1247. The two numbers come from different harnesses; treat this row as HEMERA-leading with a caveat. | 21 (X19) | X19 `bench/z59`, `frontier-A/B.jsonl` |
| Timestamps that advance by a constant step, in CSV rows | vix-daily-1990, aapl-2014 | **HEMERA** (`※dN`, `※N`) | −217 (vix 1394 → 1177) and −260 (aapl 1490 → 1230) against the plain grammar arms; −192 and −260 against the best frontier key on the same lane | `henosis-lanes-v2.jsonl` (winners) + `frontier-A/B.jsonl` |
| Stack traces and error logs | node-stacktraces | **tie** among the four grammar arms (339); the *plain* pool wins by 3 when measured in the union (319 vs 339) | 3–0 | `frontier-A/B.jsonl`; `henosis-one.ts` in-process run |

## 5. Other categories and what is still open

| Structure | Lanes | Leader | Status |
|---|---|---|---|
| JSON, lockfiles, nested records | package-lock-head.json (40 KB) | **not measured in X20** | PARADEIGMA / GNOMON / SYNARTESIS claim this family and A10 timed out on it in X11; the plain grammar is the only verified fallback. Treat as open. |
| Column-aligned tables with signed decimals | sp500-200 | tie (grammar arms), A10 timed out | open |
| Mixed prose + tables ("hybrid prose") | — | **no leader measured** | X19 hybrid probes were identity; nothing in X20 changes that |
| Anything unclassified or unseen | — | **`henosis`** | cannot lose to its arms by construction; its SIGE arm is the identity arm |

## 6. How to pick, in one paragraph

Count what repeats. **Numbers in a step** → AKOLOUTHIA-2. **Dates or timestamps on a cadence** →
HEMERA (days `/` ms). **Paths with shared prefixes or nested structure** → DENS-2. **Nothing but
words** → the grammar (DAEDALUS-D) with the shortest contract (SIGE), which is exactly what `henosis`
returns when no structural arm pays. Ship `henosis` if you can afford the CPU (it re-runs the arms);
ship the single arm if you must, and accept the numbers in the tables above.

## 7. Honesty notes

- Everything here is token counts on **this** tokenizer (`o200k_base`) and this stack; the arms are
  gated on byte-exact round trips, and every receipt row carries `exact`. Six shipped message files were
  re-read from disk and decoded with the public decoder in X20: ls-bin 1162/1162 B, stacktraces
  1848/1848, df-h 939/939, meeting 1746/1746, kubectl 2649/2649, dumpsql 5159/5159 — all byte-exact
  (`bench/x20/msg-verify.ts`).
- Three messages were decoded by hand from the message text alone (1162 B, 1746 B, 939 B; the last one
  is an arithmetic arm) with clean diffs — see `docs/codecs.md`, "Model read-back". That is a *single*
  model in a single session, not a multi-model evaluation, and it is reported as such.
- Lanes that did not finish are not counted anywhere on this page. Where two codecs emit the same
  message the row says `tie` instead of picking a winner by file order.
- Timings are not quoted across runs that shared CPUs; token counts are, because `OMEGA_DET=1` pins the
  DAEDALUS search clock (`clock.ts`).
