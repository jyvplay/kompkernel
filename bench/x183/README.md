# X183 — GEITON: paid lexical edit-reference forest

**Experimental; not promoted. No paid Pareto breakthrough or native decode demonstrated.**
This follows X182/ROPI (the user request retained the earlier X178 label).
Production encoder selection and runtime are unchanged.

## What was built

`src/lib/omega/geiton.ts` stores a bounded dictionary as literal roots and
prefix/suffix edits of earlier dictionary words, plus a one-pass reference body.
It has an explicit in-band instruction and complete-message BPE pricing. Six
nominal cap/metric settings are deduplicated. Greedy edits/attachments are not
optimal MST or arborescence algorithms. HRLZ (SEA 2023) and delta dictionaries are
prior art; no claim of a new mathematical compression principle is made.

## Executed evidence

- TypeScript: **15,045 checks**, 35 sources, 21 sources with at least one edge-bearing plan.
- Python independent dictionary/body decoder: **14,905 exact cases**, 11 malformed/expansion attacks rejected.
- Direct-wire raw wins: `ls-l-real.txt` and `metrics.tsv` only. Raw is not the protected frontier.
- Paid trials: **15 completed, all TS wire-reader exact; zero frontier wins**. One `ls-l` paid trial timed out at 90 seconds. Contention occurred; these timings are not speed evidence.
- Compiler and production build passed.
- Six native-chat prompts supplied under `native/`; all **NOT_RUN**.

| Source | Frontier | Paid GEITON best direct-plan |
|---|---:|---:|
| email | 486 | 622 |
| KB | 620 | 757 |
| answer | 664 | 815 |
| ps | 381 | 526 |
| ps-ef | 296 | 419 |
| JSON | 653 | 776 |
| diff | 411 | 565 |
| TypeScript | 949 | 1170 |
| metrics | 197 | 346 |

Forced-edge KB/answer/TypeScript wires cost 835/821/1176. Flat-dictionary
ablations of ps/JSON/diff cost 524/783/559 versus edge-bearing 526/776/565.
Thus the relative rows save seven paid tokens on JSON but lose two/six on ps/diff;
none approaches an overall frontier win. Shorter row representations need not
produce shorter parent-compressed wires. These are selected-plan trials, not an
exhaustive search over all parents/plans.

## Limits and unmet requirements

No accepted all-stack novelty proof; no new isolated full-stack speed experiment;
no six fresh mechanism-distinct branch experiments; no exhaustive lab-by-lab
mathematics review or theorem-kernel replay. Two direct raw wins do not satisfy
general paid prose/ops gains. No native endpoint was run. The independent Python
implementation is an independent code path written in this session, not an
independent human review.

See `model.md` for A–J model and 20 false-solution shapes; `portfolio.md` for
honest executed-versus-inventoried status; `research.md` for fetched paper scope
and temporal/proof-verification limits. Reproduce with `sh bench/x183/validate.sh`
(after `npm ci`); full canonical replay is intentionally expensive. Publication
of this negative experiment is not scientific acceptance.

## Fresh canonical confirmation

All **29 canonical wires are unchanged, totaling 11,962 tokens**. Fresh parent
readers: TS 26 exact / 3 refused (14 attacks), Python 23 exact / 6 unsupported,
zero mismatches. All 15 completed GEITON paid wires also decode exactly through
the separate Python parent+GEITON path. Category totals and leaders are unchanged
and recorded in `docs/codec-abbreviations.md`. See `receipts/summary.json`.
