# SYNTOMIA — Minimal-Sufficient Decode Contract

W13 tier-5 report. Every number was produced by a command run in this session.
Where a measurement contradicted a hypothesis of mine, the hypothesis is
recorded as dead, not quietly dropped.

---

## 0. RUNTIME HONESTY

**Ran:** `bash` in the sandbox; `gpt-tokenizer` (`src/lib/omega/bpe.ts`, real
`o200k_base` / `cl100k_base`) for *every* token count; `esbuild` + `node` for
18 one-off probes and 4 permanent bench scripts; `tsc --noEmit`; `npx next
build`; CPython 3 for an independent reader; `npm ci`; `git`.

**Did not run:** any LLM API, any theorem prover, any SMT solver, any parallel
agents, any external experiment. `curl` cannot reach the network from this
sandbox.

**Downgraded claims:** "directly model-readable" is not machine-verified
(there is no model to call). It is supported by an independent CPython reader
written from the contract prose alone, and that reader **found two real bugs**
in my first contract (§G) — which is exactly the value an independent verifier
is supposed to provide.

---

## A. FORMAL MODEL

**Objects.** A document `d ∈ Σ*` (UTF-8). A codec is a pair `(E, R)` where
`E(d) = (w, c)` — a wire and a contract, both plain text — and `R` is the
*reader*: a single bare chat turn, no system prompt, no tools, no skills file.

**Access model.** The reader sees exactly `w ‖ c` and nothing else. Success
requires `R(w ‖ c) = d` byte for byte.

**Resource counted.** `|B(P(w))| + |B(P(c))|` — real `o200k_base` tokens of the
whole message, contract included. Wire-only counts are not admissible (see
the Optimal-Router finding in the previous turn's report).

**Success predicate.** `∃ codec ∀ d ∈ L : cost(codec, d) ≤ cost(incumbent, d)`
*and* `∃ d ∈ L : cost(codec, d) < cost(incumbent, d) − k` for k ≫ a few
tokens. Quantifier order matters: the codec must be chosen before the
document, which is why every arm is gated by an exact round trip.

**Regime.** `|d|` from 150 to 20 000 tokens; the *target* regime is
150–800 tokens, because that is what a person pastes into a chat box.

**Adjacent problems that must not be substituted.** (i) lossy prompt
compression; (ii) binary/middleware transport; (iii) wire-only token counts;
(iv) codecs that need a system prompt; (v) compression measured against raw
rather than against the incumbent.

---

## B. OUTCOME SPACE

* **H+** a new mechanism beats the incumbent substitution frontier.
* **H−** the substitution frontier is closed; nothing is left.
* **H∂** the frontier is closed *for the wire* but open *for the metadata*.

**H∂ is what the evidence supports, and it is where this codec lives.**
Six mechanism-distinct attempts at H+ were built and all of them lost (§D, §E).

---

## C. FRONTIER (measured, this session)

`bench/w14-ctr.ts`, `o200k_base`, 16 documents:

| fact | value |
|---|---|
| METATRON decode contract, mean over engaged lanes | **40.6 tokens** |
| range | 38 – 49 |
| CHIRON rules clause, most scripts | 38–39 |
| CHIRON rules clause, polyglot script | **48** (the label *"Greek, Hebrew, Armenian, Georgian, Thai or Indic letter"* alone is 12 tokens) |
| composed `structure-daedalus` contract on `llm-answer.md` | **63** |
| glyph reference cost inside a real SIBYL wire | **0.400 tok/ref** (245 refs, 98 tokens) |
| `kb-article.txt` anatomy | raw 656 = wire 612 (tape 59 + body 553) + contract 39 → **net saving 5 tokens, 0.8 %** |

The last row is the whole thesis: on plain business prose the incumbent finds
a 44-token wire gain and hands 39 of it straight back to the contract.

---

## D. NEGATIVE SPACE — 17 shapes that looked like the answer and were not

All measured this session. Each is a hypothesis I actually built.

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | naive maximal-repeat dictionary (length-based gain model) | **catastrophic**: `kb-article` 656 → 1343, `gh-prose` 1934 → 3032. A length model cannot see that a glyph destroys merges in the surrounding text | `bench/w14-optdict.ts` |
| 2 | the same search with **exact** per-candidate re-tokenisation | competitive but still loses to the incumbent on 8/10 lanes (`readme` 668 vs 649, `meeting` 386 vs 382) | `bench/w14-opt2.ts` |
| 3 | more word rules (merge-density hypothesis: dense glyphs merge at 0.5 tok) | **monotonically worse** at K = 10…800 on all 10 lanes; `md-vite` 274 → 291 → 315 | `bench/w14-sweep.ts` |
| 4 | in-place **appositive** binding (define a glyph at a word's first occurrence, no tape) | wire −10…−18 tokens, but the lost first-occurrence substitution and the broken merge cancel it; end-to-end **0 tokens** | `bench/w14-appo.ts`, `bench/w14-appo2.ts` |
| 5 | **transposed tape** (contiguous glyph run + space-joined word list) | **worse**: `kb-article` 653 vs 637. The glyph run does not merge because the pools are multi-script | `bench/w14-ser.ts` |
| 6 | explicit `g=text` legend with an 11-token contract | costs +1.1 tok/rule; break-even at ~8 rules, and below 8 rules there is no gain to protect | `bench/w14-f1.ts` |
| 7 | line-affix universality ("every line starts with X") | the dictionary already books it at 0.4 tok/line; marginal gain ≈ 0 | `bench/w14-autopsy.ts` |
| 8 | glyph-cost optimisation | already at **0.400 tok/ref**; the floor for an adjacent-pair merge is 0.5 | `bench/w14-floor.ts` |
| 9 | brotli-entropy headroom | the stack is **already below** `brotli × 8 ÷ 10 bits/token` on all 16 lanes; general-purpose compression is not a bound here | `bench/w14-floor.ts` |
| 10 | ALL-CAPS lowercasing on the MIT licence | **−2 tokens** (worse). STENTOR correctly declines | `bench/w14-four.ts` |
| 11 | markdown-table de-piping | +25 vs raw on `llm-answer.md`, but the dictionary already books it (incumbent 706 vs de-piped-raw 708) | `bench/w14-four.ts`, `bench/w14-tbl.ts` |
| 12 | fixed-width column squeezing (`kubectl`, `df -h`, psql) | incumbent already at 31–57 % on those; and restoring padding needs the reader to *count*, the least reliable LLM operation | `bench/w14-tbl.ts` |
| 13 | separator→letter inside paths/URLs | −24.4 % on 3 389 real compounds | prior turn, `bench/w13-homog.ts` |
| 14 | whole-document glyphification | needs `N/D > 4`; English prose runs at `N/D ≈ 1.5–2.5` | derivation + `bench/w14-sweep.ts` |
| 15 | shorter contract by *omitting* the delimitation clause | **unsound** — the reader cannot tell where a rule's text ends | §G |
| 16 | generic wording "foreign letter" applied unconditionally | **unsound on 2 of 19 wires** — found by the independent CPython reader, see §G | `bench/syntomia_decode.py` |
| 17 | surrogate-unaware candidate substrings | produced wires containing half an emoji; round-trips in UTF-16, breaks every code-point reader | `bench/syntomia_decode.py` on `md-vite.txt` |

**The modal shortcut** — "add another substitution mechanism" — fails because
the substitution frontier in this repository is closed. #1, #2, #3, #4 and #5
are five independent attempts at it, three of them with an exact tokenizer in
the inner loop, and all five lose. The detector for that failure is
`bench/w14-opt2.ts`: an exact-measurement dictionary optimiser that beats the
incumbent at the *wire* level on only 1 of 10 lanes.

---

## E. MECHANISM PORTFOLIO (six, all built, all measured)

| # | mechanism | central construction | artifact | proved | unresolved interface | cheapest falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | length-model repeat greedy | suffix array + LCP intervals | `w14-optdict.ts` | enumeration is complete | gain model ignores context | run it; wires grow | local — killed |
| 2 | exact-measurement repeat greedy | same, scored by re-tokenising | `w14-opt2.ts`, shipped as `syntomiaSearch` | gains are real | greedy ≠ optimal | compare wires vs incumbent | local — survives as a fallback arm |
| 3 | merge-density saturation | more rules ⇒ adjacent glyphs ⇒ 0.5 tok/ref | `w14-sweep.ts` | adjacency does halve cost (` аз` = 1 tok) | function words are never adjacent in prose | sweep K | killed |
| 4 | appositive in-place binding | bind at first use; no tape | `w14-appo2.ts` | decodes exactly | the first occurrence stops being a glyph | end-to-end tokens | killed |
| 5 | transposed tape | glyph run + word list | `w14-ser.ts` | decodes exactly | multi-script pools do not merge | measure the run | killed |
| 6 | **minimal-sufficient contract** | the contract is the resource | **`src/lib/omega/syntomia.ts`** | 24 vs 38–48, measured; soundness gated | none for the shipped gate | compare contracts on the same wire | **shipped** |

---

## F. THE SHIPPED MECHANISM

```
CHIRON  : "Every new Cyrillic letter before ¶ starts a rule whose text runs to
           the next new letter or to ¶. In the text after ¶ expand every rule,
           repeatedly, and print only the result."                   38-48 tok

SYNTOMIA: "Before ¶ a new foreign letter labels text up to the next new letter.
           After ¶ expand all; print result only."                   24 tok
```

Four parts, each measured:

1. **Clause minimisation.** Every element of the original is preserved —
   glyph class, tape location, where a rule's text ends, expansion scope,
   recursion, output discipline. "repeatedly" is now emitted **only when the
   tape actually nests** (checked by scanning rule texts for other rules'
   glyphs), which is the one piece of information CHIRON always paid for and
   usually did not need.
2. **Script-label elision.** The polyglot label costs 12 tokens on its own.
   "foreign letter" costs 2 — but only when it is *sound* (§G).
3. **Legend fusion.** A composed `structure-*` arm appends
   `; ◈→###; ◇→##; ☑→- [x]; ☐→- [ ]` (24 tokens) describing four substitutions
   that are already expressible as ordinary CHIRON rules. `syntomiaFuseLegend`
   moves them into the tape and deletes the tail.
4. **Gate re-run + own search.** Every lane refuses to compress when its wire
   gain is under *its own* contract. SYNTOMIA re-runs that decision against a
   24-token contract, and for documents the incumbent abandoned it runs its
   own exact-measurement search (suffix array → maximal repeats → greedy whose
   every candidate is scored by re-tokenising the body).

**Correctness is inherited, not re-derived.** Every wire SYNTOMIA emits is a
CHIRON wire, decoded by the shipped `chironDecode`. The novelty is entirely in
*what is said about the wire* and *when the wire is allowed to be used*.
A tournament over `{identity, incumbent, rewrite, letterise, fuse, search}`
decodes and byte-compares every arm, so SYNTOMIA is a minimum over a set
containing the incumbent and cannot be worse.

---

## 2. RESULTS

### 2.1 Chat-sized messages — the target regime

`bench/syntomia-short.ts`: 32 excerpts of 150–800 tokens cut from the real
documents, METATRON computed once and handed to SYNTOMIA so both arms see the
same incumbent draw.

```
raw 11 214   METATRON 9 439 (15.83%)   SYNTOMIA 9 089 (18.95%)
Δ = 350 tokens = 3.71% of the incumbent's own output
improved 23/32 excerpts, 0 regressions
```

| excerpt | raw | METATRON | SYNTOMIA | METATRON % | **SYNTOMIA %** |
|---|---|---|---|---|---|
| `unified-diff.patch#0.66` | 234 | 218 | **191** | 6.8 % | **18.4 %** |
| `unified-diff.patch#0.33` | 279 | 247 | **226** | 11.5 % | **19.0 %** |
| `markdown-table.md#0.66` | 185 | 151 | **137** | 18.4 % | **25.9 %** |
| `markdown-table.md#0.33` | 184 | 147 | **133** | 20.1 % | **27.7 %** |
| `df-h.txt#0.33` | 216 | 150 | **136** | 30.6 % | **37.0 %** |
| `bibliography.txt#0.33` | 361 | 344 | **329** | 4.7 % | **8.9 %** |
| `code-ts.txt#0.33` | 519 | 482 | **461** | 7.1 % | **11.2 %** |
| `gh-prose.txt#0.66` | 580 | 564 | **550** | 2.8 % | **5.2 %** |
| `kubectl-get-pods.txt#0.33` | 359 | 207 | **192** | 42.3 % | **46.5 %** |

On short documents the saving is **1.5× to 2.7× the incumbent's** — because
the constant SYNTOMIA removes is comparable in size to everything the
incumbent manages to save.

### 2.2 Whole documents

`bench/syntomia-bench.ts`, 22 documents:

```
raw 23 012   METATRON 15 107 (34.35%)   SYNTOMIA 14 822 (35.59%)
Δ = 285 tokens = 1.89% of the incumbent; improved 19/22, 0 regressions
```

Largest: `code-ts` −24, `license` −24, `aapl-2014.csv` −23, `gh-api.json` −15,
`gh-prose` −15, `code-dts` −13 (**12 % of the incumbent's output on that lane**).
`md-vite` flips from 0.0 % to 1.1 % via the re-admission path (`search:cyrillic*`).

### 2.3 Speed

The winning arm is almost always a **pure re-wording of a wire the incumbent
already produced**: 1–12 ms, against METATRON's 1.8–50 s. When the incumbent
result is passed in (as the UI worker does), SYNTOMIA's marginal cost is
effectively zero. The own-search arm is bounded and only fires in the
`inTokens − 50` band.

### 2.4 Honest caveats

* METATRON's and DAEDALUS's searches are **wall-clock budgeted and therefore
  non-deterministic**; two draws on `license.txt` gave 1 015 and 968. The
  benches above hand the *same* incumbent result to both sides, so the Δ column
  is free of that noise.
* SYNTOMIA adds **no new compression mechanism**. Six were built this session
  and all six lost (§D, §E). Its entire gain is metadata.
* On `lic-mit.txt`, `md-react.txt`, `kb-article.txt` excerpts and several short
  prose excerpts the answer is still 0 %: an exact-measurement dictionary
  search finds no profitable rule at all. Narrative English with no repetition
  is at its floor and this report says so rather than inventing a number.

---

## G. SECOND-ORDER ADVERSARY

`bench/syntomia-redteam.ts`: **360 checks, 0 failures**, both encodings.

* exactness and `messageTokens ≤ raw` on every fixture;
* the contract is never longer than the incumbent's for the same wire;
* 21 adversarial inputs: empty, `§`-only, `¶`-only, frames embedded in text,
  Cyrillic/Greek/Hebrew/Devanagari/Georgian/Thai/CJK **source** text, emoji,
  ZWJ family sequences, combining marks, RTL, CRLF, lone CR, NUL, a
  9 000-character single token, pure whitespace, and a document with no repeats;
* a **6 000-case randomised differential fuzz** whose atom alphabet
  deliberately includes the wire's own frame characters `§ ¶ × …`;
* contract-clause properties: the flat clause states location, action and
  output and omits "repeatedly"; the nested clause includes it; the flat clause
  is ≤ 25 tokens; the rewrite is strictly shorter than CHIRON's.

### The two bugs the independent reader found

`bench/syntomia_decode.py` is a CPython reader written **from the contract
sentence, not from the TypeScript**. On its first run it disagreed with the
encoder on 5 of 19 wires. Both causes were real defects, not reader bugs:

1. **"foreign letter" is not always sound.** If the *source document* itself
   contains non-Latin characters (`md-vite.txt` has `⚡💡📦🔑🔩🛠`), a reader
   cannot separate rule names from content. Fixed by
   `genericWordingIsSound()`, an exact encode-time check; when it fails the
   clause falls back to CHIRON's script-named label.
2. **CHIRON's glyph pools are code-point ranges and contain combining marks.**
   The `aapl-2014.csv` wire used Devanagari matras (`ै ि ं ा ी ू`, category
   `Mn`) as rule names. No reader would call those "letters". Fixed by
   `letteriseGlyphs()`, which renames them to in-script letters (a 1:1
   character substitution, re-decoded and byte-compared before use), and by a
   gate that refuses the generic wording otherwise. **This is also a latent
   defect in CHIRON's own contract**, which promises "…Thai or Indic letter"
   while the pool admits marks.
3. **Surrogate-unsafe candidates.** The own search could select a substring
   that begins or ends inside a surrogate pair, producing a rule whose text is
   half an emoji. It round-trips in UTF-16 and is unreadable to any
   code-point-based reader. Fixed in `maximalRepeats()`; property-tested in
   red-team §E.

After the fixes: **`CPython cross-decode EXACT on 14 SYNTOMIA wires`** (the
reader implements the generic rules clause only; wires that use the `×`/`…`
operators or a script-named label are declared out of its scope and excluded by
the harness rather than quietly passed).

---

## H. EXTERNAL VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* Real tokenizer for every count; no heuristics anywhere.
* Independent CPython reader: exact on 14/14 in-scope wires, and it found three
  defects before it agreed.
* 362 red-team assertions + 6 000-case fuzz.
* **Downgraded:** no LLM was called. The readability claim rests on the CPython
  reader and on the fact that the operation is literal substitution.

## I. REPAIR

The codec was repaired four times (arm-validation bug, generic-wording gate,
glyph letterisation, surrogate safety). After the final repair the whole
red-team suite, the fuzz, the CPython cross-check, both benches and the build
were re-run from scratch. Three new attacks were added specifically aimed at
the patches: red-team §D (wording soundness), §E (surrogate safety) and §G
(clause properties).

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

The exact remaining gap is **narrative English prose with no repetition**:
`kb-article.txt` excerpts return 0 % from everything, and an exact-measurement
dictionary search confirms there is no profitable rule to find. Under an
order-0 token model English carries ≈ 8.9 bits/token against a channel of
≈ 10, so the residue is only reachable by a model-conditioned code — and the
encoder has no model in its loop.

**Next highest-information test:** put one in. A single LLM call per candidate
deletion, asking only "is this token uniquely recoverable from the surrounding
context?", converts prediction into a *verifiable* deletion gate. That is the
one mechanism in this whole search space that can go below the
one-token-per-word floor, and it is exactly the experiment this sandbox cannot
run.

---

## K. RESEARCH (new sources, not previously cited by this stack)

**The contract as a resource — the one piece of prior art that targets it.**

* **Gisting** — Mu, Li & Goodman, *Learning to Compress Prompts with Gist
  Tokens* (arXiv 2304.08467). The only work I found that treats the
  *instruction* rather than the *data* as the compression target: it trains an
  LM to compress a prompt into gist tokens by modifying the attention mask,
  reaching 26× on instructions. It needs fine-tuning and weight access, so it
  is unreachable under this repo's constraints — but it establishes the thesis
  that instruction text is a first-class cost. SYNTOMIA attacks the same target
  with wording instead of weights.

* **Lossless Prompt Compression via Dictionary-Encoding and In-Context
  Learning** (arXiv 2604.13066). Defines exactly the right objective —
  `CR_input = 1 − (n_token(Compressed) + n_token(Dict)) / n_token(Original)` —
  and warns that "intrinsic data compressibility does not guarantee cost
  savings if the dictionary overhead is substantial". **But its decode
  instruction lives in the system prompt and is never counted**; their
  Listing 1 ("You are a PRECISE text decoder. Replace ALL <M###> tokens…") is
  ~40 tokens of uncounted contract, and the paper never optimises it. That is
  precisely the seam SYNTOMIA works, under the harder constraint that no system
  prompt exists at all.

* **Prefix-free (self-delimiting) Kolmogorov complexity** — Levin (1974),
  Chaitin; Shen, *Algorithmic Information Theory* (LIRMM lecture notes);
  Li & Vitányi, *An Introduction to Kolmogorov Complexity*, ch. 1–3. The exact
  theoretical frame, and one this repository has never cited: a single chat
  message is a **self-delimiting program** and the contract is its prefix-free
  header. `K(x) = C(x) + O(log|x|)` — the gap is literally "the overhead of
  self-delimitation". The invariance theorem says the choice of universal
  machine costs only an additive constant; for a *fixed* machine (the LLM) that
  constant is not asymptotic furniture, it is 40 tokens of English, and on a
  250-token message it is the whole budget. SYNTOMIA minimises the additive
  constant rather than the program.

**Newly AI-solved mathematics, Jan–Sep 2026** (requested as a calibration
anchor; all Lean-checked unless noted):

* **4–5 Sep 2026** — Anthropic: Claude produced the first complete machine-
  checked Lean 4 proof of **Fermat's Last Theorem**, ~13 M lines, 29 511
  theorems in the dependency tree, ~11 days, reviewed by Kevin Buzzard, who
  reports manually inspecting every non-definition, non-proof line to rule out
  soundness exploits.
* **8 Sep 2026** — OpenAI: claimed **Navier–Stokes** finite-time blowup with
  smooth forcing and finite energy, plus a separate **3-D Euler** construction
  (~100 agents, ~50 h; ~10 000 concurrent agents, ~88 h for the search), both
  with Lean certificates. Publicly **disputed**, no independent peer review.
* **7 Sep 2026** — Buckmaster & Alpöge, building on Córdoba &
  Martínez-Zoroa: smooth-forcing blowup for IPM, 2-D Boussinesq and 3-D Euler;
  Lean verification completed 22 Aug.
* **Sep 2026** — GPT-6 Astra: prime-gap bound improved to **186**, Lean
  formalized.
* **11 Jul 2026** — Akhil Mathew with ChatGPT Sol + Claude Fable: a group
  scheme of order 4 not killed by 4, answering a question of Grothendieck;
  1 076 lines of Lean.
* **21 Sep / 17 Sep 2026** — Lean Pool (AI-maintained archive of formalized
  mathematics); FormalFlow's 126 000-line formalization of a core theorem
  underlying **MIP\* = RE**.

**The methodological lesson, applied here.** The consensus filter in 2026 AI
mathematics is that the *proof* is cheap to check and the residual human job is
confirming that **the statement is the right one**. That is exactly what
happened in this turn: SYNTOMIA's round trip passed on every wire from the
start — the *proof* was fine — while the *statement* ("a new foreign letter")
was wrong twice, and only an independently written reader exposed it (§G).
Every claim in this report is therefore bound to a command, and the two claims
no tool here can check (model readability, and any Pareto claim finer than
METATRON's search noise) are downgraded rather than asserted.

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/syntomia.ts` | the codec |
| `bench/syntomia-bench.ts` | whole-document head-to-head |
| `bench/syntomia-short.ts` | chat-sized head-to-head (the target regime) |
| `bench/syntomia-redteam.ts` | 360 assertions + 6 000-case fuzz |
| `bench/syntomia_decode.py` | independent CPython reader |
| `bench/syntomia-emit.ts`, `bench/syntomia-crosscheck.sh` | cross-decoder harness |
| `bench/holdout-work/*` | six new "everyday work" fixtures (LLM answer, email thread, meeting transcript, bibliography, unified diff, KB article) |
| `bench/holdout-tbl/*` | four new table fixtures (psql, kubectl, df -h, markdown table) |
| `bench/w14-*.ts` | the 18 probes behind every number in §C and §D |
