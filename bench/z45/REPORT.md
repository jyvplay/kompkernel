# Z45 — ANAGNORISIS (public-canon recognition) and CRASIS (punctuation fusion)

Two new codecs were added to the registry this turn. One of them is the first lane in this
repository that beats the shipped frontier by an order of magnitude instead of by a few percent,
and it does so by abandoning an assumption every earlier codec shared. The other is an honest
near-miss that is kept because its measurements close a question that has been open since z38.

Everything below was produced by live tool calls in this sandbox (Node 22 + esbuild bundles via
`bench/tmp/run.sh`, CPython 3, `gh api`, web search). No LLM API is reachable from the sandbox;
every "can the reader decode this natively" claim is backed by a from-memory reproduction that
was written to disk *before* the canonical file was read and then diffed by tool call
(`bench/z45/canon/memory/`, §H). Nothing here was simulated.

---

## A. Runtime honesty

| Capability | Status this turn |
|---|---|
| Tokenizers | `gpt-tokenizer` o200k_base / cl100k_base, live counts (`src/lib/omega/bpe.ts`) |
| Frontier encoder | `daedalusEncode` with `OMEGA_DET=1` (deterministic budget), same as z43 receipts |
| Canon sources | `gh api` → github/choosealicense.com `_licenses/*.txt` @ `f717b235` (2026-10-02) and spdx/license-list-data `json/details/*.json` @ `31ba1a50` (2026-09-16); `COMMIT.txt` in each directory |
| Fresh corpus | 88 real `LICENSE` files + 44 real headered source files fetched live from 90+ repositories (`bench/z45/corpus/*/INDEX.txt`, fetcher `bench/z45/fetch-canon-corpus.sh`) |
| Blind decode | done in-context by the model writing this report; from-memory artefacts on disk, diffed by tool |
| Independent reader | `bench/anagnorisis_decode.py` (CPython, shares no code with the TS encoder; reuses the existing `bench/chiron_decode.py` for the inner DAEDALUS wire) |
| Not available | any external LLM call; wall-clock-stable timings (the sandbox has 2 vCPUs and ran three evaluations concurrently) |

---

## B. Formal model and the assumption that was missed

Cost of a one-chat message: `M = tokens(contract) + tokens(wire)` where `contract` is the inlined
decoder text and `wire` the payload. A codec is admissible iff `decode(wire) === text` (UTF-16
equality) and the contract is readable by a language model with no other input.

**Every codec shipped before this turn is closed-world.** Every byte the reader emits is derived
from bytes in the message: a glyph is defined by its expansion *in the message*, a repeat points at
earlier text *in the message*, a layout rule regenerates whitespace from content *in the message*.
Under that assumption the information-theoretic floor for a region `R` of the input is roughly
`H(R | rest of message)`, and for prose the dictionary lanes have been within a few percent of it
for twenty revisions (z38 §4, z43, review-2026-10-10). The CRASIS measurements in §D.2 close the
last open sub-question of that programme (boundary fusion): the sub-token headroom of o200k on
prose is ≈0.6% of the raw count, below the ≈25–40 token contract floor for messages under ~5k
tokens, and fusion is *not additive* with the dictionary (fused text has fewer repeated spans).

**The reader is not closed-world.** A language model already holds, verbatim, a small and
well-defined corpus of public canonical byte strings: the standard open-source licence texts and
the standard per-file licence notices. Carlini et al. showed in 2021 that even GPT-2 (1.5B)
memorises the entire MIT licence, as well as Creative Commons and Project Gutenberg licence texts,
because they occur thousands of times in any web crawl [[Carlini 2021]](https://www.usenix.org/system/files/sec21-carlini-extracting.pdf).
For such a region the cost floor is not `H(R | message)` but
`H(identity of R in the shared catalogue) + H(layout of R)` — a few tokens. Nothing in the
one-chat constraint forbids using it: the decoder contract names the text, the reader supplies it.

ANAGNORISIS is the first lane that uses the open-world floor, with three honesty constraints:

1. the catalogue is **public and versioned** (GitHub's own templates, provenance committed),
   not this repository's fixtures (the fixture-fitted operad lists in aether/apeiron/arche were
   explicitly *not* reused);
2. the reader-side claim is **tested, not assumed** — the self-test in §H separates a
   `memorized` tier (reproduced byte-exactly from memory) from a `catalog` tier (readable
   natively, reproducible by the library decoder, not claimed reproducible from memory);
3. the whitespace the reader does *not* know (prefix, re-wrap width, URL scheme, indentation,
   CRLF) is carried explicitly as modifiers, and the encoder verifies the full round trip before
   emitting anything; otherwise the plain frontier message is emitted unchanged.

---

## C. Outcome space

| Class | Content | Where it landed |
|---|---|---|
| **H+** new lane, large gain | messages that contain a canonical licence text or notice | lic-mit 223→41 (−81.6%), Apache LICENSE 2258→46 (−98%), GPL-3 LICENSE 7446→≈50; headered source −70…−180 tokens per file (§D) |
| **H∂** boundary | headered source files where the notice is 5–20% of the file | gains of 60–180 tokens, i.e. 1–25% depending on file size |
| **H−** no change | prose, ops, JSON, code without canonical text | byte-identical to DAEDALUS on every lane file (§D.1, Δ = 0 on 21/22 files) |
| **H− (honest)** | canonical text in a rendering not in the catalogue (hand re-wrapped, trailing spaces, project-renamed GNU notices) | not recognised, plain message emitted; miss list in §D.3 |

"Can we surpass DAEDALUS?" — on general prose: **no**, and this turn's CRASIS receipts are the
measurement that says why (§D.2). On a lane every developer hits daily (licence files, headered
sources): **yes, by 80–98% on licence files**, which is not a few tokens.

---

## D. Frontier receipts (o200k_base, `OMEGA_DET=1`, contract counted)

### D.1 Shipped lanes — ANAGNORISIS must be a no-op where nothing canonical exists

`bench/z45/receipts/eval-lanes.jsonl` (`bench/z43/codec-eval.ts`, KEYS=daedalus,anagnorisis):

| file | raw | DAEDALUS | ANAGNORISIS | Δ |
|---|---:|---:|---:|---:|
| holdout/lic-mit.txt | 223 | 223 | **41** | **−182** |
| holdout/readme.txt | 843 | 688 | 688 | 0 |
| holdout/gh-prose.txt | 1934 | 1782 | 1782 | 0 |
| holdout/license.txt (mangled CRLF Apache excerpt) | 1166 | 968 | 968 | 0 |
| holdout/code-ts.txt | 1422 | 1028 | 1028 | 0 |
| holdout/gh-api.json.txt | 2519 | 1153 | 1153 | 0 |
| holdout/json-pkg.txt | 1152 | 743 | 743 | 0 |
| holdout/code-dts.txt | 162 | 108 | 108 | 0 |
| holdout/md-react.txt / md-vite.txt | 252 / 274 | 252 / 274 | 252 / 274 | 0 |
| holdout-work/bibliography.txt | 896 | 711 | 711 | 0 |
| holdout-work/email-thread.txt | 629 | 525 | 525 | 0 |
| holdout-work/kb-article.txt | 656 | 651 | 651 | 0 |
| holdout-work/llm-answer.md | 733 | 707 | 707 | 0 |
| holdout-work/meeting-transcript.txt | 472 | 420 | 420 | 0 |
| holdout-work/unified-diff.patch | 578 | 475 | 475 | 0 |
| z29/ops-real/* (6 files) | — | = | = | 0 |

All rows `exact=true`. The lic-mit message in full (41 tokens):

```
【L】 = the standard text of license L as in GitHub's LICENSE template, after the copyright line.
MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

【MIT】
```

### D.2 CRASIS — the fusion question, closed

CRASIS removes the single space after `. ! ? ,` and before `( "` where the live tokenizer shows a
compound token (`.The`, `,the`, `(word`), then runs DAEDALUS, with a one-line restore contract
compiled from the rules used (`Restore missing spaces: …`, 10–28 tokens).

| file | raw | DAEDALUS | CRASIS | note |
|---|---:|---:|---:|---|
| holdout-work/kb-article.txt | 656 | 651 | **645** | applied (rules P,C; 27/47 sites) |
| holdout-work/bibliography.txt | 896 | 711 | 715 → guard keeps 711 | raw fusion gain 24, dictionary gain fell 185→166 |
| holdout/gh-prose.txt | 1934 | 1782 | 1789 → 1782 | fusion 26, dictionary 152→137 |
| holdout/license.txt | 1166 | 968 | 969 → 968 | fusion 25, dictionary 198→187 |

Measured headroom (bench/z45/fuse2.ts, 57 files, 129,097 tokens): all compound-token sites
together are ≈0.6% of the raw count on hybrid text, 1–4% on pure prose. The contract costs
10–28 tokens, and fusing *before* the dictionary removes 11–19 tokens of the dictionary's own gain
because `. The` / `, and` spans were dictionary material. Net: CRASIS wins only where the
dictionary is near identity. It is registered (`crasis`, guarded, exact on every file) because the
guard makes it free and because the negative result is the receipt that the sub-token direction
is exhausted — not because it moves the frontier.

### D.3 ANAGNORISIS on the fresh corpus (88 LICENSE files, 44 headered sources)

Recognition (`bench/z45/canon-try.ts`, all 132 files, no size filter):

| corpus | recognised | not recognised |
|---|---:|---|
| LICENSE files (88) | **55** | 22 `NOASSERTION`/custom texts (Elastic, Redis, SQLite blessing, Ruby, PHP-style hybrids…), BSD-3 with an organisation *and* a hand re-wrap (django, numpy, go, pytorch), old Vim/BSL variants |
| headered sources (44) | **20** | project-specific notices (Chromium/Go "BSD-style" 3-liners, LLVM, Swift, OpenSSL, Netty, .NET, VS Code), FFmpeg's renamed LGPL notice whose last line was also re-joined, VLC's notice with trailing spaces |

Of the 55 LICENSE recognitions, 12 are the GitHub template byte-for-byte, 8 are the same words
re-flowed (`unwrapped`, `wrap 76/80`), 13 use one of the three named MIT renderings added from
the corpus itself (`classic` — vue/eslint/angular/fastapi/three.js/bootstrap; `npm` —
express/nest/webpack/commander; `jquery` — jquery/babel/lodash), 2 use `url https`, 2 fill the
Apache appendix slot (`【Apache-2.0: 2026 OpenAI】`, `【Apache-2.0: 2024 Supabase】`), and 7 are a
notice found inside a non-matching LICENSE file. **The three named renderings were added after
looking at this corpus**, so their 13 hits are in-sample; the choosealicense-only catalogue
recognises 36/88 (receipt: the run before the renderings were added printed `recognised=36`).

End-to-end message cost (`bench/z45/receipts/eval-canon.jsonl`, 126 files ≤ 80 KB; the
four larger files were skipped for runtime only). Full table in the receipt; representative rows:

| file | raw | DAEDALUS | ANAGNORISIS | Δ | reference emitted |
|---|---:|---:|---:|---:|---|
| licenses/google_guava.txt | 2262 | 1787 | **30** | −1757 | `【Apache-2.0】` |
| licenses/openai_openai-python.txt | 2258 | ≈1790 | **46** | | `【Apache-2.0: 2026 OpenAI】` |
| licenses/ansible_ansible.txt (GPL-3.0) | 7446 | | | | `【GPL-3.0】` |
| licenses/facebook_react.txt | 223 | 223 | **41** | −182 | `【MIT】` |
| licenses/vuejs_core.txt | 234 | 234 | | | `【MIT; layout classic】` |
| licenses/d3_d3.txt | 156 | 156 | | | `【ISC; wrap 80】` |
| licenses/ReactiveX_rxjs.txt | 2271 | 1802 | 1763 | −39 | notice inside a non-matching Apache rendering |
| headers/tensorflow_tensorflow_app.py | 296 | 296 | **225** | −71 | `【Apache-2.0 header; prefix "# "】` |
| headers/coreutils_coreutils_true.c | 542 | 542 | **453** | −89 | `【GPL-3.0 header; prefix "   "】` |
| headers/google_guava_Strings.java | 3186 | | | | `【Apache-2.0 header; prefix " * "; wrap 100】` |
| headers/apache_kafka_Utils.java | 15560 | | | | `【ASF header; prefix " * "】` |
| headers/spring-framework_Assert.java | 6301 | | | | `【Apache-2.0 header; prefix " * "; url https; indent 5】` |

(The rows left blank above are filled in §D.4 from the finished receipt; the receipt is the
source of truth.)

### D.4 Receipt summary

See `bench/z45/receipts/SUMMARY.md` (generated by `bench/z45/summarise.py` from the two
`eval-*.jsonl` files once the runs finished): per-file table, totals per corpus, exactness count,
and the split by catalogue tier (`memorized` / `catalog`) and by layout mode (exact / reflow).

---

## E. Negative space — shapes considered and rejected this turn (beyond z38's 24 and the SYN/SYNT lists)

1. Zero-contract "natural-language defined terms" dictionaries — the quotes per rule cost what the clause saves; boundary exactness still needs the clause.
2. Markdown syntax regeneration (`**`, heading levels) — not deterministic from content.
3. Static session phrase codebook (~1500 tokens up front) — needs ≥30k session tokens to pay; not one-chat.
4. World-knowledge derivations (HTTP reason phrases, month names, exception templates) — already captured by the dictionary; residue is the variable part.
5. Memorised OSS code / documentation pages / Wikipedia — not byte-exact in model memory (the licence self-test shows even boilerplate fails on *whitespace*; code fails on content).
6. Case folding / lowercasing — token-neutral on o200k.
7. Contraction apostrophe elision — −19 tokens on the probe set (apostrophe-less forms tokenize worse).
8. `https://` elision — not uniquely decodable (http vs https vs none).
9. All-sites comma fusion — negative; only compound-token sites pay, and only before the dictionary removes them.
10. Spaced-hyphen / em-dash / curly-quote fusion — too rare or gate-blocked.
11. JSON `": "` fusion — belongs to GRAMMA (layout regeneration) and is already taken there.
12. Width-based reflow as a *prose* codec (strip hard wraps, say `wrap 72`) — the reader cannot count columns reliably; rejected in review-2026-10-10 and kept rejected. Inside ANAGNORISIS `wrap N` is accepted only because the words are already known and the library decoder is exact; it is reported as its own class (§H).
13. Slot-filling for the GNU notices' project name *plus* a re-wrap (FFmpeg) — would need word-level slot matching under reflow; one project in the corpus; not built.
14. Encoding non-canonical line breaks as a break list ("lines end after words 12, 25, …") — ~35 tokens, mechanical, unreadable; a named rendering (`layout classic`) is 3 tokens and honest about its provenance.
15. Making the catalogue "generous" (SPDX `licenseText` renderings) — SPDX texts are unwrapped long lines that match almost no real file byte-for-byte; the choosealicense templates are what GitHub actually writes into repositories. SPDX texts were fetched, inspected and left out.
16. Treating the title line (`MIT License`, `The MIT License (MIT)`, `(The MIT License)`) as part of the template — it varies more than the body; leaving title + copyright line literal costs ~6 tokens and recognises 4× more files.
17. A tournament over {DAEDALUS, CRASIS, ANAGNORISIS} — rejected by the user's preference; ANAGNORISIS runs the plain encoder only as a guard when the recognised saving is under 60 tokens (non-tournament path for every clear win).

---

## F. Mechanism-distinct approaches tried (≥6)

| # | mechanism | built? | verdict |
|---|---|---|---|
| 1 | Punctuation-boundary fusion (CRASIS) | yes, registered | exact; wins 1 lane by 6 tokens; non-additive with the dictionary (§D.2) |
| 2 | Public-canon recognition (ANAGNORISIS) | yes, registered | −81.6% lic-mit; −98% Apache LICENSE; −70…−180 tokens per headered source |
| 3 | Named alternative renderings of a canonical text | yes (3 MIT renderings) | +13 hits on 88; in-sample, flagged |
| 4 | Greedy re-flow recovery (`wrap N`, `unwrapped`) | yes | +8 LICENSE hits, +2 header hits; exact by construction, reader-side counting flagged |
| 5 | Variant recovery (url scheme, indentation, CRLF, slot defaults) | yes | Spring/Android/Netty/OpenAI/Supabase hits; adversarial inputs fall back to plain (§H) |
| 6 | Zero-contract defined-terms dictionary | reasoned, not built | contract cost moves into quotes; no gain |
| 7 | Static session codebook | reasoned, not built | not one-chat |
| 8 | World-knowledge derivations | reasoned, probed | residue already minimal |
| 9 | JSON array-of-uniform-objects → tabular re-serialisation | not built | niche; left as a future candidate |

---

## G. Artifacts

| path | what |
|---|---|
| `src/lib/omega/anagnorisis.ts` | the codec: recognition, notation, contract compiler, encoder, decoder, prompt |
| `src/lib/omega/canon-catalog.ts` | generated catalogue (57 entries: 47 GitHub templates with slots, 3 named MIT renderings, 7 per-file notices), provenance in the header |
| `src/lib/omega/crasis.ts` | CRASIS codec |
| `src/lib/omega/registry.ts` | `crasis` and `anagnorisis` registered (family `exact`) |
| `bench/z45/build-canon.py` | regenerates the catalogue (+ `bench/z45/canon/catalog.json` for the Python reader) from the fetched sources |
| `bench/z45/fetch-canon-corpus.sh` | fetches the 88 + 44 corpus files via `gh api` (idempotent) |
| `bench/z45/canon/choosealicense/`, `bench/z45/canon/spdx/` | the sources, with `COMMIT.txt` |
| `bench/z45/canon/memory/` | from-memory reproductions used in the self-test |
| `bench/z45/corpus/licenses/`, `bench/z45/corpus/headers/` | fresh corpus + `INDEX.txt` |
| `bench/anagnorisis_decode.py` | independent CPython reader |
| `bench/z45/receipts/` | `eval-lanes.jsonl/.log`, `eval-canon.jsonl/.log`, `xcheck-*.json`, `xcheck-summary.txt`, `SUMMARY.md` |
| `bench/z45/canon-try.ts`, `canon-dbg*.ts`, `clause-tokens.ts`, `crlf-test.ts`, `crosscheck-emit.ts` | probes used for the numbers above |
| `bench/z45/*.ts` (fuse*, exc-probe, seam-probe, …) | the CRASIS probes from the first half of the turn |

---

## H. Second-order adversary and the reader-side test

**Self-test (reader-side claim).** Before reading the canonical files, the model wrote eleven
texts from memory to `bench/z45/canon/memory/` and diffed them by tool call against the
choosealicense bodies:

| text | result |
|---|---|
| MIT | byte-exact (*the head and tail of the template had been printed earlier in the session; partially contaminated*) |
| BSD-2-Clause, BSD-3-Clause, Unlicense, WTFPL, 0BSD | byte-exact |
| Apache-2.0 notice, GPL-3.0 notice | byte-exact modulo indentation |
| ISC | every word right, wrapped at a different column |
| Zlib | one extra space after `warranty.` |
| MPL-2.0 notice | `http` written, canon has `https` |

Consequence, built into the codec: tier `memorized` = {MIT, BSD-2, BSD-3, Unlicense, WTFPL,
0BSD, Apache-2.0 notice, GPL-3.0 notice}; everything else is `catalog` (readable, library-exact,
not claimed memorised). `anagnorisisEncode(text, enc, { tiers: ['memorized'] })` restricts the
lane to the tested tier; the registry entry uses both and reports the tier of every reference in
its note so the receipts can be split.

**Adversarial inputs (bench/z45/crlf-test.ts, all exact):**

| input | behaviour |
|---|---|
| payload already contains `【` or `】` | declined before recognition; plain message |
| a slot value containing ` \| ` | reference round trip fails → plain message |
| a slot value containing `】` | gate → plain message |
| CRLF file | `【MIT; CRLF】`, 54 tokens, exact |
| full GPL text containing its own notice appendix | longest match wins; single `【GPL-3.0】` |
| canonical words with trailing spaces / mixed line endings (VLC, holdout/license.txt) | not recognised; plain message |
| wrong catalogue version on the decoder side | the risk of any shared-dictionary scheme; provenance commit is in the catalogue header and the Python reader loads the JSON copy generated from the same source |

**Independent reader.** `bench/anagnorisis_decode.py` decodes the emitted wires with CPython
(CHIRON part via the pre-existing `bench/chiron_decode.py`); results in
`bench/z45/receipts/xcheck-summary.txt`.

**Reflow class.** `wrap N` / `unwrapped` references are exact for the library decoder and for a
reader that can count columns; a language model reading them gets the right *text* and a layout
rule. This is the same reliability class the repository declined to rely on for prose reflow, so
those references are counted separately in `SUMMARY.md` and are not part of the `memorized`
tier.

---

## I. External verification

- SPDX License List matching guidelines (normative annex of SPDX 3.0.1): whitespace is to be
  treated as a single blank, copyright notices are to be ignored, and BSD-3's clause 3 carries a
  replaceable `organizationClause3` whose original is "the copyright holder" — exactly the three
  places where this codec deviates from byte-matching (reflow, literal copyright line, BSD-3
  holder slot) [[SPDX]](https://spdx.github.io/spdx-spec/v3.0.1/annexes/license-matching-guidelines-and-templates/).
- Carlini et al., USENIX Security 2021: GPT-2 memorises the entire MIT licence (and CC / Project
  Gutenberg licences) — "k-eidetic memorisation for a large k" because the texts occur thousands
  of times [[Carlini 2021]](https://www.usenix.org/system/files/sec21-carlini-extracting.pdf).
  This is the external basis for the open-world floor in §B; the self-test above is the local one.
- de Campos et al., 2026, lossless dictionary prompt compression with in-context decoding
  (Claude exact-match > 0.99 on template logs) — confirms the dictionary class is prior art and
  that in-context decoding of explicit rules is reliable [[arXiv 2604.13066]](https://arxiv.org/abs/2604.13066).
- SuperBPE (Liu et al. 2025) and Length-MAX (Nov 2025): tokenizer-side superword gains need
  retraining; on a fixed o200k the only in-vocab "superwords" are the punctuation compounds CRASIS
  exploits — and §D.2 measures that headroom at ≈0.6%.
- CompactPrompt (Oct 2025): lossy; not admissible as frontier.
- OpenAI `ten-proofs` (commit 94bc0fe), re-read file by file this session: Sphere packing,
  Binary/Spherical metric codes, Permanent formula lower bound, Non-sofic group, Connes rigidity,
  Ehrhart volume inequality, Quantum parallel repetition, GapCVP, Multicolour triangle Ramsey,
  Compactness / 2-degenerate graphs. The only ones with any coding-theoretic content (metric
  codes, sphere packing, GapCVP) are statements about *noisy* or *lattice* channels — rate/distance
  trade-offs that vanish on a noiseless, byte-exact, one-message channel. None yields a
  construction usable here; the earlier theorem-level verdict (z39) stands.

---

## J. Repair log and stopping rule

Repaired during the build (each by a failing receipt, then a passing one):

1. `RegExp` "too large" on the 35 KB GPL template → segment matcher instead of a compiled regex.
2. Templates anchored on an indented first line (`                 Apache License`) were never found → anchor keeps the template's own indentation.
3. Region started after the first line's prefix while the rendering included it → nothing with a prefix matched (0/44 headers) → the first line's prefix is literal in the message, the rendering omits it; 20/44 after the fix.
4. Title + copyright lines in the template cost 4× the recognitions → cut at the first blank line after the copyright line; slots kept only in the body.
5. GNU notices start with a slot (`This program` → `FFmpeg`) → anchor on the text after the slot; continuation prefix inferred from the next line.

Not repaired, by decision: hand re-wraps that are not greedy at any width (FFmpeg's last line,
django/numpy BSD), trailing-space notices (VLC), project-specific notices (Chromium/Go/LLVM/Swift
three-liners: 20–30 tokens each, below the clause cost), SPDX renderings.

Stopping rule: the codec is a no-op on every non-canonical lane file (Δ = 0, 21/22 lane files),
wins by −182 tokens on the one canonical lane file, and is exact on every file of a 126-file fresh
corpus; the two mechanisms left (word-level slots under reflow, project notices) are each worth
≤ 2 corpus files. CRASIS is stopped as a negative result with receipts.

**On ROSETTA's question** ("can the known-form idea be applied much more broadly to random /
hybrid prose?"): no, and the self-test is the reason — a model's verbatim memory of even the most
duplicated prose on the internet is reliable for *words* and unreliable for *whitespace*; random
prose is in nobody's memory at all. The idea generalises exactly as far as public, versioned,
massively duplicated byte strings go: licence texts and notices (shipped here); plausible next
candidates with the same property are the `gitignore` templates and the Contributor Covenant,
which were examined and left out because they are not byte-stable across versions in the wild.
