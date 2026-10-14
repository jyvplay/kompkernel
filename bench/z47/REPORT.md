# Z47 — X3 ultrareview: EPAGOGE (parametric entailment schemas)

Third consecutive tier-5 review on branch `arena/5b3a22ac-kompkernel` (PR #29). Frontier at the
start of the turn: DAEDALUS-D/A10 for prose/ops, ANAGNORISIS for public canon (X1), ENTHYMEME for
two fixed entailments — Java frames and GitHub heading slugs (X2). Metric throughout: the
one-chat message `M = tokens(contract) + tokens(wire)` (o200k_base), byte-exact round trip
required, `OMEGA_DET=1`.

Deliverable of this turn: **EPAGOGE**, `src/lib/omega/epagoge.ts`, registry key `epagoge`, with
an independent CPython reader `bench/epagoge_decode.py`, measured on 73 real files, cross-checked
by two readers and two blind in-context decodes, and never above the frontier on any lane.

## A. Runtime honesty

Tools actually used this turn: `bash` (node v22.22.3, esbuild bundles via `bench/tmp/run.sh`,
python 3.11.2, `gh`), `web_search` (3 live searches), `fetch_page` (arXiv HTML), background
processes for the evaluations (`start_process`), `write_file`/`edit_file`. No LLM API exists in
the sandbox: every "native decode" claim below is a blind in-context decode performed by this
agent and checked with `sha256sum`/`cmp` — nothing else. Internet is limited to github.com /
api.github.com / npm / pypi plus the search tool; raw.githubusercontent.com is unreachable, so
corpus files were fetched with `gh api … -H "Accept: application/vnd.github.raw"`.
Nothing in this report was simulated; every number has a receipt under `bench/z47/receipts/`.

## B. Formal model and where the tokens are (residue anatomy)

`bench/z47/anatomy.ts` → `receipts/anatomy.tsv` splits the frontier message of every canonical lane
into contract + dictionary header + body glyphs + body literals, and the literals by class:

| lane | M | contract | header | body glyph | body literal | literal mix |
|---|---:|---:|---:|---:|---:|---|
| readme | 688 | 39 | 101 | 61 | 486 | 260 word, 75 Word, 8 num, 81 punct; 229 hapax |
| gh-prose | 1782 | 40 | 235 | 338 | 1169 | prose |
| kb-article | 651 | 39 | 59 | 165 | 388 | prose |
| llm-answer | 707 | 39 | 91 | 150 | 427 | prose |
| email-thread | 525 | 40 | 133 | 103 | 249 | prose |
| meeting-transcript | 420 | 38 | 36 | 32 | 314 | prose |
| license | 968 | 40 | 182 | 281 | 465 | legal prose |
| code-ts | 1028 | 40 | 264 | 325 | 399 | code |
| gh-api.json | 1153 | 40 | 544 | 125 | 444 | json |
| du-usr-share | 766 | 40 | 231 | 244 | 251 | ops |

Body literal is 60–80 % of M on prose and is dominated by lowercase hapax word tokens — each one is
already a single o200k token, so no within-message mechanism (dictionary, grammar, layout,
fusion) can remove it. The copy floor measured in X2 (`bench/z46/receipts/copy-floor.tsv`) is within
5–10 % of the frontier on every prose lane. The only tokens that are *not* at the floor are tokens
that are a **function of other tokens in the message** (entailed fields) or of public knowledge
(ANAGNORISIS). This turn works the first class.

Formal statement. A message is a string `x`. An entailment schema is a pair `(φ, f)` where
`φ(x)` extracts parameters `p` from `x` (a sentence of ≤ 65 tokens carries them) and `f_p` is a
word-level, total, injective-on-its-domain rewrite such that `f_p(g_p(x)) = x` for the fold `g_p`.
EPAGOGE sends `sentence(p) + DAEDALUS(g_p(x))`, the reader applies DAEDALUS⁻¹ then `f_p`. Admission
is per instance and per text: the fold's own round trip, the sentence's parse round trip, the
composed wire's round trip, and `M < M_plain` are all checked before the wire is emitted.

## C. The frontier question — "can we surpass DAEDALUS?" and "what have we missed?"

What ENTHYMEME proved in X2 is that *entailment* was the one family absent from the repo. What it
left open is that it hard-coded two world facts (`.java`, github-slugger). EPAGOGE generalises the
family along the only axis that matters for an LLM reader: **the rule is induced from the text and
stated with its parameters, so the reader never needs to know the convention in advance**. Three
schema kinds:

1. **Intra-record, parametric**: `at C.m(S.ext:N)` with `ext` induced per text (java, kt, scala,
   groovy…), up to two forms (`(:N)` / `(;N)`) because Android traces mix Kotlin and Java frames,
   plus the Kotlin *file facade* option (`FooKt.bar(Foo.kt:N)`) when it pays for its 12 tokens.
2. **Intra-record, flavoured**: heading links with the slug flavour induced — GitHub (`#getting-
   started`) or percent-space (`#Getting%20Started`, Obsidian/Notion/Docusaurus exports).
3. **Inter-record ("zipper")**: Keep-a-Changelog release links, where the compare URL of one line
   is a function of the *next* line's version: `[0.34.0]: <stem>v0.33.0...v0.34.0`. The stem and tag
   prefix are induced (≥ 3 votes) and written into the sentence; the line collapses to `[0.34.0]:`.

Answer to "what have we missed this whole time": we were pricing tokens by their frequency
(dictionary) when a measurable share of ops text is priced by *dependency* — a token that is a
deterministic word-level function of its neighbours costs nothing to a reader who is told the
function. An LLM can execute "copy the version of the next line into this URL" natively; it cannot
execute LZW (RTCE, below). The whole class is small on general prose (prose has almost no
deterministic dependencies — anatomy above) and real on ops pastes.

External receipts fixing the admissible boundary (new this turn, see §H): RoundTripCodeEval
(arXiv 2601.13398v2, 2026) — fifteen open models score ≈ 0 on executing LZW/Huffman/arithmetic
coding and ≤ 67 % on RLE; CUTE (EMNLP 2024, arXiv 2409.15452) — LLMs do word-level edits well and
character-level edits badly (gaps up to 73 points). So the native-decodability boundary is *word
granularity, substitution-level operations*. All EPAGOGE operations are word-level copies with a
stated suffix.

## D. Negative space — ≥ 15 shapes tested this turn with the modal-shortcut test

"Modal shortcut" = would an LLM reader be tempted to *guess* instead of *derive*? A shape is
rejected if the reader must count, align columns, or know a fact not in the message.

| # | shape | result | why rejected |
|---|---|---|---|
| 1 | .NET frames `Namespace.Class.Method() in /path/File.cs:line N` | 0/19 (VintageStory), 0/45 (dafny) have file == class | not entailed |
| 2 | PHP `#3 /path/File.php(N): Class->method()` | PSR-4 prints the caller's file; unique-field test fails | not entailed |
| 3 | Python `File "...mod.py", line N, in func` + source line | source line needs the repository | world knowledge |
| 4 | Go panics `pkg.func(...)\n\t/abs/path/file.go:N` | path not a function of the symbol | not entailed |
| 5 | Rust backtraces `at /rustc/<hash>/library/core/src/ops/function.rs:250` | module → path mapping inexact (`mod.rs`, inline modules) | not exact |
| 6 | TOC block regenerated from the heading list | titles match in 2/18 real TOC blocks (`receipts` probe in this report §F) | not entailed in practice |
| 7 | Numbered-list / CSV id columns (`1.` `2.` …) | the reader must count to 200 | modal shortcut (counting) |
| 8 | `df -h` Use% = Used/Size, `free -h` totals | arithmetic + rounding | modal shortcut |
| 9 | Log timestamps as deltas | arithmetic on digits | char-positional |
| 10 | `kubectl`/`docker ps` AGE/STATUS columns | not deterministic | not entailed |
| 11 | Maven `@ artifact` / Gradle task echoes | repeated → dictionary already 1 token | ≤ 1 token/line |
| 12 | Changelog link block fully regenerated from `## [V]` headings (stub lines dropped too) | measured in `receipts/block-probe.log`: +27 / +55 / +73 tokens over the stub form on 17/28/45-line blocks, minus a longer sentence → ≤ +58 net | 45-line long-range regeneration from headings; rejected as modal risk for ≤ 2 % |
| 13 | Go `=== RUN` / `--- PASS` pairs, surefire `Tests run:` pairs | nesting breaks nearest-pair matching | not exact |
| 14 | GitHub release notes `**Full Changelog**: compare/vA...vB` | one per release, previous tag only in a heading far above | thin, rejected |
| 15 | Logback logger names = class of the next frame | holds only for the throwing class | not entailed |
| 16 | Java `import` lines regenerated from usage | order/wildcards/unused imports | not exact |
| 17 | `Suppressed:`/`Caused by:` frame-count ellipses `... 12 more` | counting | modal shortcut |
| 18 | Markdown reference links `[text][id]` + `[id]: url` | url not derivable | not entailed |

Dead ends of previous turns remain closed (z38 24 items, z45/z46 lists, syntomia/synizesis §D).

## E. ≥ 6 mechanism-distinct approaches tried this turn, with artifacts

| # | approach | artifact | outcome |
|---|---|---|---|
| 1 | Residue anatomy of the frontier (where can tokens still go?) | `anatomy.ts`, `receipts/anatomy.tsv` | body literal 60–80 %, hapax-dominated → within-message class terminal |
| 2 | Parametric frame schema (ext induced, two forms, Kt facade) | `epagoge.ts` §A, `receipts/eval-kt-*.log` | GrapheneOS 911 → 882 (ENTHYMEME 895); 11 other Kotlin issues tie |
| 3 | Flavoured anchor schema (GitHub vs percent) | `epagoge.ts` §B, `receipts/adversary.log` case 7 | percent flavour applied and exact; no real percent-anchor paste in the corpora yet (honest: synthetic receipt only) |
| 4 | Inter-record zipper (release links) | `epagoge.ts` §C, `receipts/eval-changelog*.log` | 5/8 changelogs improve: −146, −150, −75, −74, −15; 3 without link blocks tie |
| 5 | Block form of the zipper (regenerate the whole block from headings) | `receipts/block-probe.log` | measured, rejected (row 12 above) |
| 6 | Estimate models for the gate: distinct-frame (pessimistic) vs occurrence (optimistic) | `receipts/eval-kt-v2/v3/v4.log`, `eval-traces-v3/v4.log` | pessimistic lost oracle_graal (+11) and the GrapheneOS facade (+8); optimistic + always-run plain arm chosen |
| 7 | Always-run plain arm vs ENTHYMEME's skipped arm | `receipts/eval-kt.log` (curbox_446 582 vs 562 under the skipped arm) | plain arm always runs; Pareto guarantee restored, runtime ≈ 2× on applied files only |
| 8 | TOC-from-headings block entailment | probe in this report (§D row 6) | rejected on data |

## F. Measurements (all byte-exact; `exact=true` on 73/73 files)

Reference numbers for DAEDALUS (D) and ENTHYMEME (E) are from `bench/z46/receipts/` (same
deterministic settings); EPAGOGE (P) numbers from `bench/z47/receipts/eval-*.jsonl`.

**New lane 1 — Kotlin/Android issue bodies** (`corpus/kt/`, 12 real GitHub issues):

| file | raw | D | E | P | note |
|---|---:|---:|---:|---:|---|
| GrapheneOS_os-issue-tracker_8922 | 2480 | 911 | 895 | **882** | `:=kt(Kt), ;=java`, 110 frames, 89 elided; sentence 63 tok (`receipts/eval-kt-final.log`) |
| curbox-app_curbox-android_446 | 11441 | 562 | 562 | 562 | 351 mostly repeated frames; composed arm loses, plain arm wins (was 582 before the always-run arm) |
| Kotlin_kotlinx.serialization_3277 | 1791 | 465 | 465 | 465 | 44/73 derivable, repeated traces → plain arm |
| nextcloud_android_12945 | 977 | 381 | 381 | 381 | 28 frames on 6 distinct files: predicted 29 < sentence 51 |
| open-telemetry_opentelemetry-android_2117 | 1026 | 430 | 430 | 430 | plain arm wins |
| 7 others (ReadYou ×2, davx5, LibreCuts, Pebble, micronaut, unstoppable) | | | | ties | 0–12 frames |

Honest reading: the Kotlin lane is thinner than the Java lane because Android issue bodies paste
the same trace several times (the dictionary already folds repeats) and because coroutine
machinery frames are non-derivable facades (`BuildersKt__Builders_commonKt`). The gain where it
exists is real (−29 vs D, −13 vs E) and the mechanism never loses.

**New lane 2 — CHANGELOG.md heads** (`corpus/changelog/`, 8 real files ≤ 24 000 B):

| file | raw | D | P | Δ | links folded |
|---|---:|---:|---:|---:|---:|
| svenstaro_miniserve | 7209 | 3031 | **2885** | −146 (−4.8 %) | 43 |
| thoughtbot_clearance | 7366 | 4420 | **4270** | −150 (−3.4 %) | 52 defs interleaved under sections |
| MarvinJWendt_testza | 3478 | 1572 | **1497** | −75 (−4.8 %) | 26 |
| mikaelmello_inquire | 6460 | 4300 | **4226** | −74 (−1.7 %) | 33 |
| MetaMask_eth-json-rpc-infura | 3160 | 1407 | **1392** | −15 (−1.1 %) | 15 |
| Esri_esri-leaflet, ucfopen_canvasapi, jaredhanson_passport-openidconnect | | 3842 / 3674 / 1177 | ties | 0 | no derivable block |

Total over the 8 files: D 23 423 → P 22 963 (−460, −2.0 %); over the 5 files with a block:
13 730 → 13 270 (−3.4 %). ENTHYMEME = D on all eight (it has no zipper).

**Regression lanes (must tie):**

| set | files | D | E | P | result |
|---|---:|---:|---:|---:|---|
| 22 canonical lanes (`bench/z45/receipts/files-lanes.txt`) | 22 | 20 329 | 20 329 | 20 329 | 22/22 ties (`receipts/eval-lanes.log`) |
| Java traces (`bench/z46/corpus/traces`) | 10 | 11 283 | 10 708 | 10 708 | 10/10 ties with E (`eval-traces-v4.log`) |
| TOC READMEs (`bench/z46/corpus/toc`) | 6 | 24 077 | 22 906 | 22 906 | 6/6 ties with E (`eval-z46.log`, `eval-toc-v4.log`) |
| negatives (.NET + PHP traces) | 11 | 12 337 | 12 337 | 12 337 | 11/11 ties (`eval-negative.log`) |

Sentence costs (o200k, incl. newline): frames java 34 · kt+java 51 · kt(Kt)+java 63 · anchors
github 40 · anchors percent 26 · release links 49–52 (stem-dependent).

Runtime: on files where no schema instantiates, EPAGOGE = one DAEDALUS run (identical to D). On
applied files it is two runs (composed + plain): GrapheneOS 18 s vs 11 s, svenstaro 59 s vs 31 s,
thoughtbot 76 s vs 65 s, axios TOC 198 s vs ≈ 100 s (`eval-*.log`). The arm is kept because the
gate's prediction was wrong on curbox_446 and the user's constraint is "never worse"; callers who
prefer speed can pass `guardBelow: 60` to get ENTHYMEME's behaviour.

## G. Second-order adversary (`adversary.ts` → `receipts/adversary.log`, 11/11 exact)

Attacks derived from EPAGOGE's own structure: a payload that already contains an elided form
`(:N)` (frames refused; `(;N)` only refuses when `;` is a used form), a bare `[x]:` line (zipper
refused), a `FooKt.kt` impostor among facades (stays literal), scala frames (ext induced, not
assumed), a skipped version and a foreign `[docs]:` line inside the link block (only the lines whose
next record fits are folded; unfold walks backwards and stays exact), GitLab `-/compare/` with no tag
prefix and an `[Unreleased]` line, `[v2.6]` versions where the prefix is part of V, percent anchors
preferred over GitHub, CRLF changelog (zipper inactive), module-prefixed and `Native Method`
frames, lowercase anchors matched by both flavours (deterministic tie-break), and a text that
starts with the rule mark (refused). Every candidate instance is also folded/unfolded directly
(gate bypassed) and round-trips.

## H. External verification receipts

* **Independent reader.** `bench/epagoge_decode.py` (CPython, imports only `chiron_decode.py`)
  was written from the sentence grammar, not from the TypeScript. It decodes 14/14 forced
  adversary wires (`receipts/wires-adv.jsonl`) and the real shipped wires of
  `receipts/wires-real.jsonl` (GrapheneOS, the two self-test slices, five changelogs, two Java
  traces, two TOC READMEs): 12/12 byte-exact — `receipts/xcheck-real.txt`.
* **Blind in-context decode 1 (real wire, zipper).** `corpus/selftest-changelog.txt` = MetaMask
  CHANGELOG lines 91–157 (1 538 raw tokens). EPAGOGE message M = 662 (plain 687). Decoded by this
  agent from the wire alone into `receipts/selftest-changelog.decoded.txt`; `cmp` byte-identical,
  sha256 `1f276c0e17bc0642c5f23eb560ba8d76c41efd0bc167d21d44ca59f425a419e1` (log:
  `receipts/selftest-changelog.log`). The original contains a typo (`[#29](…/pull/28)`) which the
  decode reproduced — the reader derives, it does not guess.
* **Blind in-context decode 2 (two-form frame sentence).** `corpus/selftest-mixed-small.txt` =
  GrapheneOS lines 11–53 (43 mixed Java/Kotlin frames, 913 raw tokens). On this slice the real
  encoder keeps the plain arm (489 vs composed ≥ 489), so the decode used the forced-composition
  wire from `xcheck.ts` (identical mechanism, 35 frames folded, `:`=java `;`=kt). Decoded into
  `receipts/selftest-mixed-small.decoded.txt`; byte-identical, sha256
  `8fb3bc7910e518bffe820411d780e344471ca04ff3975ee3557bd6c68db86847`.
* **Literature (live searches this turn, not previously cited in the repo).**
  RoundTripCodeEval (Maveli, Vergari, Cohen; arXiv 2601.13398v2): classical codes are not
  chat-executable (Huffman encoding 0 % for all 15 models, AE decoding ≤ 2.3 %, RLE ≤ 67 %). CUTE
  (Edman, Schmid, Fraser; EMNLP 2024): word-level manipulations fine, character-level poor. SPARTAN
  (Babu, Garofalakis, Rastogi; SIGMOD 2001, doi 10.1145/375663.375693): model-based semantic
  compression that stores no values for predictable columns — lossy within error bounds; EPAGOGE is
  the exact, reader-executable version of that idea for text records. LogShrink (Li, Zhang, Le, Chen;
  ICSE 2024, arXiv 2309.09479) exploits Header–Variable and Variable–Variable dependencies in logs,
  Denum (arXiv 2408.05760) numeric-token parsing — both offline binary compressors; none states the
  dependency in reader-executable prose.
* **openai/ten-proofs (reviewed individually this turn).** Binary/spherical codes
  (`main_binary_theorem`: rate bounds below MRRW; kissing number ≤ 2^{0.39661n}) are channel-coding
  rate bounds — our reader is noiseless, no bearing on source coding into a token budget. GapCVP
  (`gapCVP400IsNPHard`, `binaryNearestCodewordIsNPHard`, `binarySyndromeDecodingIsNPHard`) are
  hardness results for lattice/linear-code decoding — our encoder's problem (smallest grammar) is
  already NP-hard, heuristics stay justified; no algorithm to import. Sphere packing (Cohn–Elkies),
  non-sofic groups, Connes rigidity counterexample, permanent circuit lower bound, quantum parallel
  repetition, Ehrhart volume, multicolour Ramsey, compactness/degeneracy counterexamples: no
  connection to lossless text coding. Conclusion unchanged from X1/X2: nothing applicable.
* **Open PRs.** `gh pr list` (2026-10-14): #28 ANAMNESIS and #27 GRAMMA-Ω have no commits since
  2026-10-13 and were vendored/measured in `bench/z44`; #23, #20, #18, #17, #13, #11, #8, #7, #6,
  #4, #3, #2 unchanged since X1. No new codec surface to copy. Oblivion (#2) inlined into the first
  message was re-evaluated in X2 and loses every lane (readme 911 vs 688).

## I. Repair log

1. First smoke: nextcloud_12945 not applied — correct behaviour (6 distinct files, predicted 29 <
   sentence 51), no repair.
2. curbox_446: composed arm lost 20 tokens while the gate predicted +120 and skipped the plain arm
   (ENTHYMEME's `guardBelow = 60` logic). **Repair:** plain arm always runs (`guardBelow = ∞`).
3. spring-loaded_138: a second `;=groovy` form (4 frames, 2 files) cost 19 sentence tokens for ~6
   of saving (+13 vs ENTHYMEME). **Repair:** a second form / the facade option must predict at least
   its own marginal sentence cost (`countTokens(two-form clause) − countTokens(one-form clause)`).
4. The "distinct-frame" estimate introduced for (2) under-predicted and lost oracle_graal (+11) and
   the GrapheneOS facade (+8). **Repair:** estimate reverted to the ENTHYMEME-calibrated occurrence
   model (optimistic); with the plain arm always running an optimistic gate only costs runtime.
5. Adversary case 1 relabelled after repair 3 changed its expected instance.

Final state: 73/73 files byte-exact; never above D or ENTHYMEME on any file.

## J. Stopping statement

Stop here because (i) a new, mechanism-distinct codec with honest wins on two new lanes and ties
everywhere else is in the repo with two independent readers and two blind native decodes, (ii) the
residue anatomy proves the remaining prose tokens are hapax literals that no in-message mechanism
can remove, and (iii) the remaining entailment candidates (§D) are either not entailed in real data
or require counting/arithmetic that the CUTE/RTCE evidence places outside native decodability.
What would move the frontier next is not another in-message codec but external knowledge the
reader provably has (ANAGNORISIS's class), which is bounded by canon coverage, or multi-message
sessions (ANAMNESIS's class, #28), which the single-message contract excludes.
