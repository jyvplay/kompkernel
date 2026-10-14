# Z51 — ΔΕΝΔΡΟΝ: path and URL lists as a tree of brace groups (and what the frontier still cannot give)

Branch `arena/95aaefc1-kompkernel`. New codec: `src/lib/omega/dendron.ts` (registry key `dendron`).
Independent reader: `bench/dendron_decode.py`. Harness, probes and receipts: `bench/z51/`.

## 0. Runtime honesty (what ran, what did not)

Ran this turn, all in the sandbox:
- `bash`: Node + esbuild bundles through `bench/tmp/run.sh`, CPython 3, `gh api` (openai/math), `git`.
- All codec numbers: `OMEGA_DET=1` (constant clock), o200k_base through `src/lib/omega/bpe.ts`.
  `M` = tokens(contract + wire) of the one-chat message. Every row decoded by the native reader and
  checked against the input.
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json`: exit 0 after the final edit.
- `web_search` ×3 (live, new terms; see §8). `gh api repos/openai/math/contents/CONTENTS.md`.
- CPython reader `bench/dendron_decode.py` on the 16-case red-team suite.

Did NOT run, and claim nowhere:
- **A fresh LLM reader.** The only reader is me, who wrote the rule. The in-context decode (§5) shows the
  message is readable by a reader who knows the rule. It does not show a fresh reader reads it.
- **The full 100 KB lockfile or any lane beyond the 40 listed here.** Lanes are listed in §3.
- **Rosetta**: consulted for analysis only, from its source header (§7). Not executed.
- **openai/math proofs beyond the keyword pass (§6).** Only titles and abstracts were read this turn.
- **Speed of the new arm** beyond the wall-clock numbers in the receipts. The tree arm runs one extra DAEDALUS
  call, so DENDRON costs about twice the frontier on applicable inputs (§4).

## 1. What the frontier pays, measured on this turn's lanes

`bench/z51/receipts/lanes-frontier.jsonl` (40 lanes, all round-trip exact): the DAEDALUS contract is
39 tokens on 33 of 40 lanes, a median of **7.4% of M** on the lanes where rules fire. The copy floor
(z46) says the wire cannot go below the LZ77 phrase count; the contract is the other term of the
two-part code, and it is the one this turn could measure directly.

Two levers on that term were checked and rejected:
- **Shorter contract wording**: the shipped DAEDALUS sentence can be cut from 39 to 28 tokens (V4,
  `bench/z51/receipts/probes.txt`). That is −11 tokens on every rule-using lane. Not adopted: the shorter
  sentence drops the "repeatedly" that nested rules need, and I cannot test a fresh reader that would show
  the change is safe. A readability risk of that size is not worth an 11-token gain.
- **Hunk-header counts** in unified diffs: the counts are 0.16% of the tokens of real diffs (42 hunks, 125k
  tokens, `probes.txt`). Dead.

## 2. The mechanism: a tree of brace groups

A list of paths or URLs is a set of strings with shared prefixes. The frontier writes each line in full,
and DAEDALUS folds the repeated prefix into one glyph **per line**. A bash brace group writes the shared
text **once per level of the tree** and separates the items with commas:

    src/lib/omega/{a.ts,b.ts,mod/{c.ts,d.ts}}   — 3 paths, the prefix written once

Brace expansion is a notation the reader already knows. The bash manual states the rules that matter: the
expansion is strictly textual, nested groups are allowed, left-to-right order is preserved, and a group
needs at least one comma (sources in §8). The encoder never writes a one-item group, so it stays
inside those rules.

**Distinct from front coding.** The repo's z40 probe measured flat front coding (`>k` + rest, one marker
per line) under DAEDALUS: +1.5% on find-listing, 0 on dpkg and ls, −2.3% on du (`bench/z40/receipts/SUMMARY.md`).
Flat front coding pays one marker per line. A brace group pays its markers once per group, and it nests, so
the saving grows with the depth of the tree. That is why the same test gains on git-tracked paths (§3).

**Grammar** (decoder, `denExpand`, mirrored in `bench/dendron_decode.py`):
`seq := (literal | group)*`, `group := '{' seq (',' seq)* '}'`, one seq per line, a stray `,` or `}` at top
level is an error. The encoder checks the expansion of its own tree before it emits anything.

**Rule line** (35 tokens, line 1 of the wire, also the dispatch key):

> `∴ paths: bash brace expressions ({a,b} = text before it + a, and + b; groups nest). Expand after other rules; one path per line.`

The words "text before it" are the semantic core. A shorter wording (R4, 23 tokens) was measured and
not adopted because it drops that clause (`probes.txt`, rule-count).

## 3. Results (o200k, OMEGA_DET=1; receipts `bench/z51/receipts/sweep-dendron.jsonl`)

| input | lines | frontier M | DENDRON M | Δ | arm |
|---|---:|---:|---:|---:|---|
| `git ls-files`, first 400 files | 400 | 1563 | **1461** | **−102 (−6.5%)** | tree |
| markdown paths under `bench/` | 169 | 1099 | **1080** | **−19 (−1.7%)** | tree |
| `git ls-files`, first 160 lines | 160 | 695 | **682** | **−13 (−1.9%)** | tree (`size-probe`) |
| `git ls-files`, first 80 / 40 / 24 | | 359 / 222 / 168 | same | 0 | frontier (tree larger) |
| `find src/lib/omega -type f` | 233 | 767 | 767 | 0 | frontier (tree not cheaper) |
| `find` timestamped listing (holdout) | 120 | 1326 | 1326 | 0 | frontier (tree not cheaper) |
| `find` holdout paths | 43 | 262 | 262 | 0 | frontier |
| 450 unique URLs | 450 | 4058 | 4058 | 0 | refused: 12 lines are URI templates with `{/name}` |
| gh-api JSON, readme, de-kb, ls-iso, npm-ls, unified diff, numstat, df-h | | | identical | 0 | frontier |

Read-outs:
- **Pareto-superior on the path-list lane** (the 400-file and 169-file git-tracked listings), with the
  frontier as the floor everywhere else. By construction `M(DENDRON) ≤ M(DAEDALUS)` on every input that
  carries no dispatch line; the escape case costs +8 tokens (§4).
- The gain grows with the size of the tree: −13 at 160 lines, −102 at 400. Break-even is near 120–160 lines.
- The gain is modest: about 2% at the break-even size, 6.5% at 400 files. It is a real, small, general
  gain on one listing class, not a large one.

Comparison with the external baseline (§8): arXiv 2606.11976 reports a compact tree listing at
**910 vs 1,540 input tokens (−40.8%)** against full path-per-line listings, with 50/50 exact path
reconstruction. That baseline is raw, not DAEDALUS-compressed, so it is not the number to quote for the
gain beyond the frontier. Measured here: DAEDALUS already removes most of that cost, and what remains
is 2–7% on large listings.

### 3.1 Speed (honest)
DENDRON runs DAEDALUS twice on applicable inputs (plain and tree), so it costs about twice the frontier.
On non-applicable inputs the applicability check is O(n) and returns at once. In the sweep, the 400-file
row took 62.6 s and the 169-file row 11.7 s in deterministic mode. Under the app's DAEDALUS budget, the
result is machine-dependent for the same reason DAEDALUS is.

## 4. Guards, exactness, and the escape

- Applicability (`denLines`): at least 3 lines; no `{`, `}` or `,` in any line; at least 2 lines contain `/`.
  Whitespace is literal, so it is allowed. A trailing newline is an empty last line, which expands to the
  empty string, so it round-trips without a flag.
- Tree check: `denExpand(tree) === input`, else refuse.
- Composed check: the full decode of the tree wire equals the input, else refuse.
- Strictly cheaper: the tree arm is kept only when `M(tree) < M(plain)`; otherwise the plain DAEDALUS wire
  is returned unchanged.
- Escape: a payload that carries a line equal to the rule or the escape is sent with the escape line first
  (+8 tokens each; red-team cases 13–15).

Unit checks (`bench/z51/den-unit.ts`): 9/9 tree cases exact (siblings, empty items `dir/`, prefix-equal
items, nested groups, absolute and dot-relative paths, duplicates, unicode), plus the trailing and
interior empty-line cases.

## 5. Readability (one chat, no system prompt; author caveat applies)

`bench/z51/receipts/blind/`: 40 real paths from `git ls-files`, the rule line plus the raw tree (916
characters; not the DAEDALUS-compressed wire, so the test isolates the new reading step). I expanded the
36-item `bench/{…}` group and the three bare lines by hand from `message.txt` alone, into
`decoded-by-hand.txt`. `cmp` against `expected-original.txt`: **byte-identical**. The CPython reader gives
the same output.

Limit: I wrote the rule, so this is an in-context check. It is not a fresh-reader test. The one-chat
readability of this codec for an independent model is not established.

## 6. Negative results and the openai/math keyword pass

Negative, measured (all in `probes.txt`):
- Whole-line trie over timestamped lines (`find`): +27 (`/`) and +3 (`/.:-T `). Not adopted; the trie
  must be over path segments, which is what DENDRON does.
- Flat front coding (z40): +1.5% on find-listing. Above.
- Shorter DAEDALUS contract: −11 at best (§1). Not adopted.
- Unified-diff hunk counts: 0.16% of the tokens of real diffs. Dead.
- Dense flat listing (233 files): the tree arm is not cheaper; the guard keeps the frontier.
- Deep synthetic tree (300 lines, red-team): the tree arm is larger (371 vs 319). DAEDALUS already folds it.

openai/math (`CONTENTS.md`, 9 142 lines, read via `gh api`), keyword pass on titles and abstracts for
tree, trie, string, prefix, compression, grammar, dictionary, edit distance, entropy:
- #128 (shortest common superstring, 2-approximation): already ruled out in z50 §9. A token codec pays per
  reference, so superstring length does not translate to tokens.
- #121 (edit distance, randomized): not applicable (randomized output, and the listing gain is structural).
- #122/#123 (trace reconstruction from deletions): not applicable (a decoding-from-noise problem).
- #099 (ℓ1 distortion of edit distance) and the tree-width embedding results: not applicable (they bound
  embeddings, not string encodings).
- #151, #113, #148 and the other hits: unrelated to string encodings.
I did not read the full proofs of these, and I did not triage the other ~360 families. This is a keyword
triage, labelled as one.

## 7. Rosetta (analysis only, from source)

`src/lib/omega/rosetta.ts` (ROSETTA-R5.6) header: templated line families (identical runs, delimiter-field
families with class signatures, typed slots, arithmetic and cycle runs) and span systems for table, YAML and
JSON families. It does not factor shared prefixes of path strings. So it covers a different structure: rows
that repeat a template, where DENDRON covers a set of strings that share a prefix tree. I did not run it.

## 8. Live sources (new this turn; none cited in `src/` or `bench/` before)

- GNU Bash Reference Manual, brace expansion, via [bash.cyberciti.biz](https://bash.cyberciti.biz/bash-reference-manual/Brace-Expansion.html)
  and [linuxtopia](https://www.linuxtopia.org/online_books/bash_reference_guide/bashref_27.html): textual expansion,
  nesting, left-to-right order, and "at least one unquoted comma" for a correctly formed group. The grammar in §2
  follows these rules, and the encoder never writes a one-item group.
- [arXiv 2606.11976](https://arxiv.org/html/2606.11976v1), "Exploration Structure in LLM Agents for Multi-File
  Change Localization" (June 2026): compact relative tree listings, 910 vs 1,540 average input tokens (−40.8%)
  against path-per-line, 50/50 exact path reconstruction. External evidence that LLMs reconstruct paths exactly
  from a tree form. Baseline is raw (§3).
- Hrubec, "Reducing Token Usage of Software Engineering Agents" (TU Wien diploma thesis, 2025, [repositum PDF](https://repositum.tuwien.at/bitstream/20.500.12708/224666/1/Hrubec%20Nicolas%20-%202025%20-%20Reducing%20Token%20Usage%20of%20Software%20Engineering%20Agents.pdf)):
  compares a flat file list with a depth-indented trie listing, and reports that folders print once. The same
  idea at the level of an agent's repository map. Its numbers were not read in full.
- Becker et al., "Compressing Suffix Trees by Path Decompositions", [arXiv 2506.14734](https://arxiv.org/abs/2506.14734) (2025; ICALP 2026): path decompositions for compressed suffix-tree indexes. Related in
  structure, not applicable: it needs random access to the text, and it is an index, not a one-message codec.

## 9. Verdict against the request

- A new codec is in the repo and registered (`dendron`), with exact native and CPython round trips on all
  rows, a 16-case red-team suite (16/16 under both readers), unit checks, and an in-context readability receipt
  (byte-identical, with the author caveat).
- It is **Pareto-superior on git-tracked and markdown path listings** (−6.5% and −1.7%; −1.9% at 160 lines) and
  ties the frontier everywhere else measured. It is **not a general prose, ops or code gain**. Its scope is a
  path or URL list large enough to pay the 35-token rule.
- **No large general gain was found this turn.** The contract is 7.4% of M on the lanes where rules fire, and the
  only levers on it (shorter wording, −11) fail the readability requirement I can test. The copy floor (z46) is
  unchanged. The honest answer to "is there a large general gain left" is still no, for exact one-message codecs.

## 10. Open items (ranked by information)

1. **A fresh-reader test** of DEN_RULE and the tree wire, by a model with no access to the rule. Without it the
   readability claim stays at the author caveat.
2. **URI templates** (`{/name}`): an escape for literal braces would unlock the 450-URL lane (−157 naive, before the
   sentence cost). Not built: 12 of 450 lines do not justify an escape grammar this turn.
3. **Break-even tuning**: the rule costs 35 tokens. A shorter wording that keeps "text before it" would move the
   break-even down; this needs its own readability receipt.
4. **Full 100 KB `package-lock.json`** remains unmeasured (z50 §8).
5. **openai/math full proofs** of the triaged hits (§6), and the other ~360 families.
