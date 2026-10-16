# X17 report: STATHMOS, frontier re-run, searches, proof review, scratchpad

Date: 2026-10-15. Branch `arena/95aaefc1-kompkernel`, base `7c7da87`. Metric: M = o200k_base tokens of decoder contract plus wire, one chat message, no system prompt. Counting library: the `gpt-tokenizer` npm package (o200k), through `src/lib/omega/bpe.ts`.

## 1. Verdict in one paragraph

X17 commits one new codec, **STATHMOS** (`src/lib/omega/stathmos.ts`), byte-exact on 28/28 lanes and on the 418-case test. It is **niche**. It changes the token count on one lane only (`vix-daily-1990.csv`, M 1380 → 1212 against LAKONIKOS-D, 1369 is the frontier minimum). Its gain is therefore −157 tokens on one lane and 0 on the other 27. The success predicate reads "beats the frontier by more than a few tokens on at least one lane". STATHMOS meets that literal wording on one lane. It does not meet the standing preference for broad prose and ops gains, so I record it as niche, not as a win. The broad gain in this stack is still LAKONIKOS-D (11 strict wins on 28 lanes, 5 to 11 tokens each, about 1%), which is from X16 and is not new here. The LLM readability of the new wires is **unverified**, because no LLM is reachable in this sandbox.

## 2. Frontier re-run (restated)

Command: `bench/x16/frontier-run.sh bench/x16/lanes-A.txt` and `…lanes-B.txt`, started in the background, output `bench/x17/receipts/frontier-A.jsonl` and `frontier-B.jsonl` (84 rows each, both `.status` = done). Three A10 cells timed out (420 s cap): `git-numstat` (A), `sp500-200.csv` and `ops-git-log-stat.txt` (B). None is the minimum on its lane.

Result: **the X17 frontier matches X16 on all 28 lanes**, in both the minimum and the leader (`bench/x17/leaders-x17.py`, `compared 28, diffs 0`). Leaders: DENS-2 (`dendrons`) 15, AKOLOUTHIA-2 7, DAEDALUS-D 6. Earlier in the session, the first X17 launch gave only errors because `node_modules/.bin/esbuild` was missing. Those rows were deleted and the run was relaunched after `npm ci`. Only the relaunched rows are reported.

Full per-lane table: `bench/x17/receipts/leaders-x17.tsv`. Key columns are the frontier minimum and leader, LAKONIKOS-D, STATHMOS, and the two differences.

## 3. STATHMOS

Mechanism: fixed-width decimal columns in a delimited table are stripped of trailing zeros. A first line `@dp D1,…,Dk[,crlf]` records the digit count per column. The reader pads each decimal cell back to exactly D digits. A column is transformed only if all of its cells have the same D. An input starting with the marker or `@raw` is escaped. The gate keeps the cheaper of LAKONIKOS-D on the raw text and LAKONIKOS-D on the stripped text plus the restore sentence, so it cannot cost more than LAKONIKOS-D.

Correctness:
- `bench/x17/stathmos-test.ts` (`SKIP_LANES=1`): edge cases 18/18 byte-exact, fuzz 400/400 byte-exact, of which 10 fuzz cases used the transform. FAILS 0.
- The first full run (`bench/x17/receipts/stathmos-test-v1.jsonl`, 339 FAILs) is **invalid**. It was caused by the restore step returning the `@dp` line. It is kept for the record and superseded.
- 28-lane run (`bench/x17/receipts/stathmos-lanes-v1.jsonl`): 28/28 exact. Transform used on 1 lane.

Lane results (M, o200k):

| lane | STATHMOS | LAKONIKOS-D | frontier min | transformed | why not transformed |
|---|---:|---:|---:|---|---|
| vix-daily-1990.csv | 1212 | 1380 | 1369 (AKOLOUTHIA-2) | yes | fixed 6-digit columns, CRLF |
| aapl-2014.csv | 1587 | 1587 | 1490 (DENS-2) | no | decimal widths mixed (8, 7, 6) |
| csv-8.csv | 1708 | 1708 | 1695 (DENS-2) | no | decimal widths mixed (7, 6, 8, 5) |
| sp500-200.csv | 4343 | 4343 | 4262 (DENS-2) | no | no decimal columns (integers) |
| other 27 lanes | = LAKONIKOS-D | | | no | no fixed-width decimal column |

Why aapl and csv-8 are not helped: their numbers are stored with trailing zeros already removed, so the original width is lost in the file. It cannot be restored from the cell. This is a property of the data, not a bug in the gate. The earlier probe that showed a gain on aapl was invalid (round trip failed) and is superseded.

Verdict: **niche**. The mechanism is sound and cheap, but it applies to a narrow class of inputs (fixed-precision exports with CRLF or a regular decimal width). I make no novelty claim. The mechanism is standard fixed-precision formatting, and I found no codec in `src/lib/omega` that strips trailing zeros from fixed-decimal columns (grep in X17; ABACUS covers thousands commas only).

Not registered in `registry.ts`. Registering it would add a key whose gain is one lane. It can be registered later if you want it in the leaderboard.

## 4. Leaders by category (X17, 28 lanes)

Categories follow the file-name rules in `leaders-x17.py`. Frontier minimum is the best of the six frontier keys. "LKD" is LAKONIKOS-D (X16).

- prose (7 lanes): LKD beats the frontier minimum on all 7, by 5 to 11 tokens (readme 678 vs 688, de-kb 481 vs 492, bibliography 699 vs 709, kb-article 640 vs 650, llm-answer 696 vs 706, meeting-transcript 411 vs 420, email-thread 520 vs 525). This is the broad gain.
- ops-listing (9 lanes): LKD wins on 4 (ls-full-iso −10, ops-ls-l-bin −9, git-log-iso −10, node-stacktraces −7). It loses on git-numstat (+122), ops-git-log-stat (+26), and find-listing (+14). Ties on git-log-fuller (143) and ops-ls-l-omega (954).
- ops-table (4 lanes): loses on all four (chart.svg +125, df-h +98, kubectl +54, psql +32). AKOLOUTHIA-2 leads here.
- temporal-table (4 lanes): STATHMOS on vix (−157 vs frontier). Loses on aapl, csv-8, sp500.
- markup, log, source/changelog (4 lanes, no fixed-decimal data): LKD loses on all four (dump.sql +12, openstack +44, spring-framework +3, miniserve +53).

So the broad gains are prose and listings, which is where LAKONIKOS-D (X16) already helps. The table-type gains are not broad. Note: the X16 summary said LAKONIKOS-D beats the frontier on 12 lanes. Counting the X16 list and this run's table, the strict wins are 11 (the tie on ops-ls-l-omega is not a win). I use 11.

## 5. New live searches (this turn)

Searches (6), chosen for new sites and new terms (not used by the codecs in this system before):

1. ACL Anthology (`aclanthology.org`), 2025: PCC (2025.acl-long.1394), 500xCompressor (2025.acl-long.1219), E2LLM (2025.emnlp-main.970), ACC-RAG (2025.findings-emnlp.1307). All are learned, lossy, or both, and all need a trained encoder. Not one-chat, not lossless. Not used.
2. OpenReview (`openreview.net`): LLMZip under review at ICLR 2024. Same method as arXiv 2306.04050 (already cited in X15). Not new.
3. arXiv `quant-ph`: Bostroem and Felbinger, "Lossless quantum data compression and variable-length coding" (quant-ph/0105026, 2001). Its conclusion: a quantum message can be compressed without loss only if the sender knows the source message in advance. Also quant-ph/0011072 (Schumacher-limit bound for the quantum part, 2000), and arXiv 2402.18684 (2024), quantum state compression with polar codes. The 2001 and 2000 papers are outside the 10-year window and are cited as prior art only.
4. ACM DL (`dl.acm.org`), CIKM 2019, "Improved Compressed String Dictionaries" (doi 10.1145/3357384.3357972): hierarchical front coding with LCP ideas, for URL and RDF dictionaries. Relevant to the list-coding idea below. Within 10 years.
5. `d-nb.info` (German National Library, hosts a 2020 PDF on sampled BRPFC string dictionaries): reports 37% smaller size than front coding, with access 2.2x slower. Authors not shown in the snippet, so I give no author attribution.
6. arXiv 2509.22445 (Sep 2025, rev. Mar 2026, Shaw et al.), "Bridging Kolmogorov Complexity and Deep Learning". Theory: asymptotically optimal description-length objectives for Transformers. Not a codec. Also arXiv 2511.20849 (Nov 2025), Length-MAX tokenizer, 14–18% fewer tokens than BPE, which requires a new tokenizer, and the reader here uses fixed o200k. Not usable.

Sources not used because they are non-authoritative: ResearchGate host page for the entropy-driven pre-tokenization paper (arXiv 2506.15889), noted only as a pointer.

## 6. OpenAI math proofs: individual review

Coverage (honest): **8 of 80** `CONTENTS.md` chunks read in total across turns (chunks 0, 26, 27, 40 in earlier turns; 10, 30, 60, 76 this turn). About 10% of the list. Entries read this turn: 042–049 (chunk 10), 146–151 (chunk 30), 276–281 (chunk 60), 363–367 (chunk 76). Earlier turns read 001–006, 126–135, and 210–211. Plus this turn: the Lean scope doc for 128 and the first of 8 chunks of its preprint.

Proofs called out earlier, re-examined:
- **128, factor-2 shortest common superstring.** Lean scope (`lean/docs/128.md`): one deterministic polynomial-time algorithm, output at most twice the optimum. Preprint (Sep 24 2026, `preprints/A-Polynomial-Time-2-Approximation-…/paper.pdf`, chunk 0 of 8): hierarchical substring graph, forced occurrence counts, Euler tours, and layer bookkeeping. It explicitly does not use the Greedy (maximum-overlap) procedure, and it names the Greedy counterexample (Shibata, ≥ 9/4) and a 7/3 preprint (Chukhin et al.). **Codec relevance: low.** The guarantee bounds superstring length, not the one-chat cost. A superstring codec must also send the offset of every input string, and for the lanes here the offset table costs more tokens than the overlap saves. I have not measured this. Lean was not run (not installed). The preprint is unreviewed.
- **003 (quasi-Riemann), 004–006, 126–127, 129–135, 210–211:** no compression content (read in earlier turns).
- **276, classical capacity of generalized amplitude damping.** Holevo capacity of a quantum channel. Relevant only as a theory bound. No classical text codec follows.
- **279, exact quantum factoring over a fixed finite gate set.** A quantum-complexity claim. No codec relevance. Not verified here.
- **148, entropy-rate dimension formula** dim_H μ = min{1, h_RW / χ} for self-similar measures. A structural identity of entropy over contraction. No codec.
- **281, QAOA attains SK optimum** (thermodynamic-first limit). Optimization theory. No codec.
- **042–049, 146–151, 363–367:** algebraic geometry, dynamics, kinetic theory, inverse problems, free-boundary problems. None concerns compression.

Conclusion: none of the reviewed OpenAI math results gives a codec design in X17. The superstring entry is the closest, and its offset cost rules it out for this one-chat setting (unmeasured, stated as such).

## 7. Scratchpad: 10 AI-native ideas

The user asked for 10 out-of-box ideas, with the language-tier idea first. The status column says whether I measured it.

1. **Language-tier aliases** (shortest cross-language token aliases). Measured X16: 1 win, 17 losses (`bench/x16/receipts/alias-28.jsonl`, corrected). Net negative. Shortest aliases do not beat plain text under o200k on these lanes.
2. **Second numeral tier.** Analysis (X14): a numeral costs one token, same as a tier-1 alias, so no entry-cost gain. Not measured further.
3. **Fixed-decimal trailing-zero restore** (STATHMOS). Measured X17: niche, one lane.
4. **Hex or UUID re-basing to a denser glyph alphabet.** Analysis only. Denser alphabets might save tokens on random IDs, but a one-chat LLM cannot reliably decode a non-decimal or non-hex alphabet character by character. Rejected on readability, not measured.
5. **Superstring with offsets** (the factor-2 superstring preprint, item 128). Analysis only. The offset table costs more than the overlap saving on these lanes; not measured.
6. **Sorted-list coding with a sent permutation.** Analysis only. Sorting a list makes front coding cheap (CIKM 2019), but restoring the original order needs a permutation of n items, about n log2 n bits. For the list sizes here that cost exceeds the front-coding saving. Not measured.
7. **Quantum-adjacent: shared-prior coding.** Bostroem and Felbinger (quant-ph/0105026): lossless variable-length quantum coding needs the message source known to the sender. In this system, the contract is that shared prior, so the codec is a classical shared-dictionary code. The analogy is real. It gives no gain by itself. Analysis only.
8. **Quantum-adjacent: Holevo and Schumacher limits.** The Schumacher limit still bounds the quantum part (quant-ph/0011072). For classical text, the analogous bound is Shannon entropy, which the LLM-predictor codecs approach. No one-chat codec implication. Analysis only.
9. **Model-as-decompressor (arithmetic coding with LLM probabilities).** LLMZip (arXiv 2306.04050, X15): strong ratios, but the decoder needs the same model and a probability run per token. It is not readable in one chat. Excluded by the rules. Analysis only.
10. **In-context dictionary decoding.** arXiv 2604.13066 (Apr 2026, external): dictionary-encoded prompts decoded in context, with reported exact match above 0.99 on LogHub template compression. External evidence only, not verified here. This is close to DAEDALUS-style merge-and-glyph coding, so it is not new in this system.

## 8. What was run (tools, agents, verifiers, databases)

- **Shell and runtime:** bash, Node (esbuild bundle through `bench/x17/run-probe.sh`, with `OMEGA_DET=1`), `npm ci` (exit 0), `npx tsc --noEmit -p tsconfig.json` (exit 0), Python 3 (`leaders-x17.py`, and a column-width count of the three CSV lanes).
- **Background processes:** two frontier runs (`frontier-run.sh` on A and B) and the STATHMOS lane run ran as background processes on this 2-core sandbox, at the same time. This is OS-level concurrency, not agents or a parallel job system.
- **Tokenizer:** `gpt-tokenizer` npm package (o200k_base, cl100k_base for the second column) via `bpe.ts`.
- **Web and papers:** `web_search` (6 queries) and `fetch_page` (6 pages: `CONTENTS.md` chunks 10, 30, 60, 76; Lean doc `lean/docs/128.md`; preprint chunk 0). Listed in section 5.
- **Not used:** no LLM (none reachable), no Lean or Lake (not installed, so the 128 Lean file was not checked), no proof assistant, no simulator, no compiler beyond tsc and esbuild, no database. No subagents. No GitHub push (the session's branch is closed; see section 9).

## 9. Known limits and blocked items

- The LLM readability of STATHMOS and LAKONIKOS-D wires is **unverified**. The round trip uses the repository's own TypeScript CHIRON reader. It is not an independent reader. `bench/chiron_decode.py` was verified on DAEDALUS-D wires in X16 and was not run on the STATHMOS wires here.
- The GitHub push for this branch is blocked (the session's PR is closed). Commits are local only.
- STATHMOS and LAKONIKOS-D rely on the DAEDALUS-D wall-clock budget (constant under `OMEGA_DET=1`). Production timings may differ.

## 10. X17b addendum: contract and wire split (measured, no new codec)

Scope: this addendum follows the request to find a new frontier-beating mechanism. It is a measurement of where the tokens go in the current best stack. It is not a new codec and makes no win claim.

Measured (o200k, `bench/x17/contract/`):
- **Contract tail.** The LAKONIKOS-D decoder contract is one trailing sentence ("New <script> before ¶ starts a rule to the next new <script> or ¶. After ¶, expand rules recursively; print only the result."). Across 27 saved lanes it costs 28 to 48 o200k tokens (mean 31.9), with 4 script-label variants. Deleting it entirely would save at most about 32 tokens per lane, and a rewrite could save only a few. Its effect on LLM readability is unverified, so it is not a codec.
- **Wire split at the first ¶.** Rule table 5,973 tokens; body 23,848 tokens; total wire 29,849 (27 lanes). Rule table share per lane: 9% (kb-article, meeting-transcript) to 47% (node-stacktraces). The body is about 80% of wire tokens, so the body is where a gain must come from.

Receipts: `bench/x17/contract/split.receipt.tsv`, `bench/x17/contract/wire-split.receipt.txt`. Scripts: `split-prompts.py`, `wire-split.cjs`, `show-contract.ts`.

Verdict for X17b: no new frontier-beating codec was found or verified in this turn. The contract route is capped by its size. The next measurable direction is the body (glyph coverage over the 80% body share), which is the existing DAEDALUS search and has not been changed here.

## 11. X17c addendum: alias-class closure, measured bounds, new searches

This addendum answers the repeated request for a new mechanism with a measured negative result on the largest remaining substitution class. It adds no codec.

Measured (o200k, `bench/x17/prize/`):
- **Raw-text upper bound (`word-prize.cjs`).** Replacing every multi-token ASCII word of the 27 source lanes by a one-token alias, with zero table cost, would save 6,289 tokens: 10% of source tokens, and 20.5% of the LAKONIKOS-D M total. This bound is misleading, because DAEDALUS already merges repeated words into rules on the wire.
- **Net bound on the actual wire (`alias-net-bound.cjs`).** For each distinct word type on the wire with t ≥ 2 tokens and k occurrences, the net saving is (t−1)·k − (t+3), counting the spelled-out table entry and 3 tokens of overhead, and keeping only types with a positive net. Result: 18 tokens over 27 lanes, 0.1% of M. Most lanes have zero alias-worthy types. The remaining literal words are singletons (hapax-like), so aliasing cannot pay for its table.
- **Conclusion.** The language-tier substitution class (shortest cross-language aliases, second numeral tier) is closed for this wire under an optimistic model: free aliases, no collisions, a perfect reader. This matches the X16 measured test and the DAEDALUS header ("the dictionary/grammar/merge class is exhausted").

Searches (this turn, 3 queries, depth 1): Zipf and hapax coverage (linguisticswithacorpus.wordpress.com, a 2024 corpus-linguistics blog, non-authoritative; arXiv 2307.12896, hapax-rate formulae for Zipf and Heaps laws, 2023); LLM lossless compression with arithmetic coding (arXiv 2502.16163, Feb 2025, LLM on visual prompts, bpsp 4.84 → 3.19; Nature Machine Intelligence 2025, "Lossless data compression by large models", Li et al.; arXiv 2407.08892, 2024, prompt compression characterization, extractive compression up to 10x, lossy); quantum (arXiv 2402.18684, 2024, polar-code quantum compression; quant-ph/9712035, 1997, Holevo bound for ensemble compression, prior art outside the 10-year window). Sites not previously used by codecs in this system: nature.com, a corpus blog, medium (non-authoritative, not used as evidence).

Verdict for X17c: no codec beats the frontier by more than a few tokens on any broad lane this turn. The two remaining classes I can measure (contract tail, substitution aliases) are bounded at a few percent or less. The next high-information test is the body's digit and punctuation tokens on the CSV and ops lanes, which the measured stack has not targeted.

## 12. X18 addendum: token classes of the frontier wire, and new searches

No new codec this turn. This addendum records measurements and the next test; it does not claim a gain.

Measured (o200k, `bench/x17/prize/token-classes.cjs`, 27 saved LAKONIKOS-D wires, `bench/x16/lakonikos-d/`):
- Total wire tokens 29,849. Glyph-reference tokens (DAEDALUS rule references, non-ASCII) 10,211 = 34.2%. Digit-only tokens 6,513 = 21.8%, carrying 2.39 digit characters per token (the 3-digit chunking limit is 3). Letter-only tokens 4,449 = 14.9%. Space-only 490 = 1.6%. Other (punctuation, and space-prefixed words, which this coarse classifier does not split out) 8,186 = 27.4%.
- Reading: rule references are the largest class. Their count is set by the DAEDALUS merge search, which is where the next measurable headroom is.

New searches (X18, 2 queries, depth 1): PMC (ncbi, 2025, RLZ-based RePair grammar compression, Arabidopsis table, compression ratio 5 to 7); Springer, *The VLDB Journal* 2020 (block-based RePair front coding, 10.1007/s00778-020-00620-x); MDPI *Mathematics* 2025 (TECP, token-entropy; not a compression method); arXiv 2505.06297 (2025, entropy per token of LLM-generated text, token-level entropy bound). Re-Pair freedom: arXiv 1704.08558 (Bille et al.) shows that Re-Pair can break frequency ties to maximise output compressibility, and runs in O(n). DAEDALUS does not use that freedom.

Next highest-information test: implement the tie-break freedom inside the DAEDALUS merge loop for the 28 lanes, and count the o200k delta. Expected size: small (under a few tokens per lane), so it is a falsification test, not a success candidate.
