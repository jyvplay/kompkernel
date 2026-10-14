# ANAGNORISIS + ENTHYMEME + EPAGOGE + ELLEIPSIS + PARADEIGMA — five codecs beyond the DAEDALUS frontier, one-chat decodable, byte-exact (+ a frontier determinism fix)

Five tier-5 review turns (X1 `bench/z45`, X2 `bench/z46`, X3 `bench/z47`, X4 `bench/z48`, X5 `bench/z49`) on top
of the DAEDALUS-D/A10 frontier. Every number is the one-chat message cost
`M = tokens(decoder contract) + tokens(wire)` in o200k_base, byte-exact round trip required,
deterministic settings (`OMEGA_DET=1`). Each codec is registered in `src/lib/omega/registry.ts`
and has an independent CPython reader under `bench/`.

## What is new in X5: ≡ PARADEIGMA (`src/lib/omega/paradeigma.ts`, key `paradeigma`)

**Template entailment for JSON records.** Pretty-printed JSON from REST APIs, lockfiles and exports is
dominated by fields whose value is a *string template over sibling fields of the same object*
(`"followers_url": "<url>/followers"`, `"avatar_url": "https://avatars.githubusercontent.com/u/<id>?v=4"`,
`"full_name": "nodejs/<name>"`). A dictionary codec folds the constant text but still pays, per object and
per field, a glyph plus one glyph per slot value. PARADEIGMA induces each template from the document,
verifies it on every object, states it **once** in a sentence, removes the field from every object that
obeys it, and lets the reader write it back by copying sibling values into the slots:

```
≡ objects having "login": after "node_id": "avatar_url": "https://avatars.githubusercontent.com/u/<id>?v=4",
  "gravatar_id": ""; after "html_url": "followers_url": "<url>/followers", "following_url": "<url>/following{/other_user}" …
  | objects having "sha": after "sha": "url": "https://api.github.com/repos/nodejs/node/commits/<sha>"
```

The clause is compressed *together with* the reduced JSON by DAEDALUS (its template stems share the
dictionary) under one 84-token contract. The reader does no arithmetic, counting or case transforms:
every restored character is a verbatim copy of text already in the message. Objects that do not obey a
template simply keep the field literally — that is the exception path, and it costs nothing extra.
Encoder: candidates grouped by (key, anchor, skeleton), slots ≥ 3 chars, value a JSON string or bare
scalar, constants never templated (measured ≈ 0 under DAEDALUS), margin `n·2·slots − 4`, dynamic
"objects having" key selection so no other shape can fire, a repair loop that runs the encoder's own
reader and drops a template until byte-exact (0 rounds needed on the final corpus), and the plain
DAEDALUS arm **always runs and wins ties** — `M ≤ M_DAEDALUS` on every input. Scope: one-field-per-line
JSON (jq / gh / `JSON.stringify(x, null, n)` / `json.dumps(indent=n)`); everything else passes through.

### X5 measurements (`bench/z49/receipts/fixed/`, real mode, native + CPython readers byte-identical)

| `gh api …` dump (indent 2) | raw | DAEDALUS | **PARADEIGMA** | Δ | templates / lines removed |
|---|---:|---:|---:|---:|---|
| users/nodejs/followers?per_page=20 | 6041 | 840 | **557** | **−33.7 %** | 12 / 240 |
| repos/nodejs/node/tags?per_page=20 | 3792 | 951 | **788** | −17.1 % | 3 / 60 |
| repos/nodejs/node/contents/lib (25 entries) | 6705 | 1411 | **1269** | −10.1 % | 5 / 116 |
| repos/nodejs/node/issues/comments?per_page=10 | 6053 | 1127 | **1017** | −9.8 % | 15 / 147 |
| users/nodejs/repos?per_page=3 | 5155 | 1210 | **1135** | −6.2 % | 54 / 162 |
| repos/nodejs/node/pulls?per_page=1 | 5660 | 2251 | **2185** | −2.9 % | 13 / 62 |
| repos/nodejs/node/commits?per_page=4 | 8544 | 3696 | **3658** | −1.0 % | 14 / 104 |
| synthetic 20-user list (adversary, real mode) | — | 480 | **403** | −16.0 % | — |
| branches-20 · runs-1 · releases-1 · npm-left-pad · package-lock head · holdout gh-api (2 issues) · json-pkg | | | ties | 0 | plain arm kept |
| 22 canonical prose/ops/code lanes | | 20 322 | 20 322 | ties | all exact |

The gain grows with the number of objects per shape; one- and two-object documents sit below the
break-even (a stated template costs about what the dictionary rule it replaces cost) and are left
plain by the gate. Nearest prior art: nested functional dependencies on JSON (arXiv 2111.10398) and
the `Concat(ConstStr, field)` fragment of FlashFill (POPL 2011) — PARADEIGMA is that dependency,
induced from all records, verified exactly and stated in-band for an LLM reader.

Verification: `bench/z49/adversary.ts` 23/23 exact-or-refused (minority literal, optional field,
`<`/`>` in values, forward/mutual references, nested shapes, trailing shell noise, truncated paste,
numeric copies, inline containers, duplicate keys, substring siblings, container-before-anchor,
anchor-after-array; refusals for `≡`-prefixed payloads, compact JSON, JSONL, CRLF, 2-object lists);
`bench/z49/xcheck.ts` real + forced wires byte-identical under the native and CPython
(`bench/paradeigma_decode.py`) readers; blind in-context self-decode of a 6-object tags wire
(`receipts/selftest-tags-6.*`, sha256 `4e7676c6703e1c16…` on both sides).

### Frontier fix found on the way: gpt-tokenizer decoder-state leak (`src/lib/omega/bpe.ts`)

gpt-tokenizer decodes every token list through one module-global `TextDecoder` in **streaming mode and
never flushes it**. The trailing bytes of an incomplete UTF-8 sequence (the first token of a two-token
character such as `≡`, or the last id of a vocabulary scan) stayed buffered and were prepended to the
next, unrelated decode. ARIADNE's grammar builder rejects per-token strings that do not re-join to the
chunk, so **whether a DAEDALUS search arm ran at all depended on what had been decoded earlier in the
process** — under `OMEGA_DET=1`. Measured on one input (`receipts/det-leak.log`): 787 tokens, then 706
on the next call, 869 after a plain run on another text. `bpe.ts` now flushes before every public decode
and appends the final flush to the result (non-streaming semantics: o200k id 439 = `о` + a dangling 0xD0
decodes to `о\uFFFD`, not to a counterfeit one-token `о` — a first version that discarded the tail put
duplicate glyphs into the pools and is recorded as rejected). After the fix the same input gives
706 / 706 / 706, the 22-lane DAEDALUS reference moves from 20 329 to 20 322 (dpkg-l −10, ls-usr-bin +3, 20 lanes unchanged), and every earlier same-process
comparison in this PR remains valid (both arms shared the leak); regression probe `bench/z49/det-leak.ts`.

## X4: ○ ELLEIPSIS (`src/lib/omega/elleipsis.ts`, key `elleipsis`)

**Positional ellipsis.** A constant that sits at a fixed field position in every record of a stated
class is removed with **no marker** and restored from one sentence on line 1 that names the class,
the position, the constant and the lines that keep it literally:

```
○ Each line lost "src/lib/omega/" from the start of its last space-separated field; put it back.
○ Each line beginning with "ii" lost its 4th space-separated field, "amd64" followed by 8 spaces,
  except lines whose 4th field is "all"; put it back.
○ Empty cells (comma-separated) hold the column's default: "type" = "small_airport".
```

Three forms (field prefix; whole field + its blank run; empty cell by header name or ordinal), three
record classes (every line / after the first / lines beginning with a word), exception predicates
(value set, first character, digit/non-digit), up to three rules in decode order, then DAEDALUS.
The encoder verifies the fold's round trip on the whole document, refuses any candidate whose elided
remainder could be mistaken for a literal line, and **always runs the plain DAEDALUS arm**, so
`M ≤ M_DAEDALUS` on every input. Independent CPython reader `bench/elleipsis_decode.py`.

### X4 measurements (`bench/z48/receipts/`, 40 real files + 5 synthetic, all byte-exact)

| lane | DAEDALUS | ELLEIPSIS |
|---|---:|---:|
| `wc -l src/lib/omega/*.ts` (150 lines, real) | 789 | **695** (−11.9 %) |
| `wc -l` 36-line sample (blind self-decode receipt) | 241 | **232** (−3.7 %) |
| `ls -l` of 74 package.json files under one directory | 528 | **520** (−1.5 %) |
| 14 other ops/data files (dpkg, ps aux, systemctl, kubectl, find, du, apt list, mount, passwd, 2 CSVs …) | — | ties (plain arm kept) |
| 22 canonical lanes | 20 329 | 20 329 (ties) |

**The main result of X4 is a measured floor, not the win.** Exact removal of positional constants
from real listings — ls -l owner/perms prefixes, `ii`, dpkg's `amd64` column, ps aux's TTY, systemctl's
`loaded active`, CSV constant columns, du's `/usr/share/` — changes the DAEDALUS message by
**−0.16 … +0.10 tokens per record** (table in `bench/z48/REPORT.md` §C). The dictionary glyph for a
constant already absorbs the record's `\n`, the padding run or the commas around it, and the residue
left after removal (`\n`, pad, `,,`) costs exactly what the glyph did. The only removal that pays is a
prefix whose remainder is a letter-initial word, because the blank separator then merges into the
word's token — which is what ELLEIPSIS's estimator now selects, and why it wins on count/size + path
listings and ties elsewhere. The earlier in-turn estimate "−161 on du" came from a buggy probe and is
retracted in the report.

Verification: `bench/z48/adversary.ts` 22/22 exact-or-refused (mark-prefixed payloads, remainder equal
to an exception value, quotes/backslashes/CR, duplicate CSV headers, quoted delimiters, empty cells,
fewer fields, scope-word collisions); `bench/z48/xcheck.ts` 5/5 synthetic forced wires and the real
wires byte-identical under native + CPython readers; blind in-context self-decode of the 36-line wire
(`receipts/selftest-wc-l-omega-ac.*`, sha256 `d2626aa5a0b3e5a6…` both sides).

## What is new in X3: EPAGOGE (`src/lib/omega/epagoge.ts`, key `epagoge`)

ENTHYMEME (X2) elides fields that are *entailed* by the rest of the message under two fixed rules.
EPAGOGE makes the rule itself a function of the message: a schema is **instantiated from the text**,
its parameters are written into a ≤ 65-token sentence on line 1, and the reader applies the stated
rule after the DAEDALUS layer. Three schema kinds:

* **frames** — `at C.m(S.ext:N)` → `at C.m(:N)`; the extension is induced (java, kt, scala, groovy…),
  up to two forms for mixed Kotlin/Java traces (`(:N)`, `(;N)`), plus the Kotlin file-facade option
  (`FooKt.bar(Foo.kt:N)`) when it pays for its 12 sentence tokens. Java-only traces get ENTHYMEME's
  byte-identical sentence and tie it exactly.
* **anchors** — `[Title](#slug)` → `[Title](#)` with the slug flavour induced: GitHub (`#getting-started`)
  or percent-space (`#Getting%20Started`).
* **release-links** (inter-record "zipper") — Keep-a-Changelog `[0.34.0]: <stem>v0.33.0...v0.34.0`
  → `[0.34.0]:`; the reader copies the version of the *next* link line. Stem and tag prefix are
  induced by ≥ 3 votes and stated in the sentence.

Admission is per instance: the fold's own round trip, the sentence's parse round trip, the composed
wire's round trip, and `M < M_plain` — the plain DAEDALUS arm **always runs** and wins ties, so
EPAGOGE is never above the frontier (ENTHYMEME skipped that arm on large predicted wins; X3 found a
file where the prediction was wrong).

### X3 measurements (73 files, 73/73 byte-exact; `bench/z47/receipts/`)

| lane | files | DAEDALUS | ENTHYMEME | EPAGOGE |
|---|---:|---:|---:|---:|
| CHANGELOG.md heads with link blocks (new) | 5 | 13 730 | 13 730 | **13 270** (−3.4 %; best file −150 / −146) |
| CHANGELOG.md without link blocks | 3 | 8 693 | 8 693 | 8 693 (ties) |
| Kotlin/Android issue bodies (new) | 12 | — | — | GrapheneOS 911 → 895 → **882**; 11 ties |
| Java traces (X2 lane) | 10 | 11 283 | 10 708 | 10 708 (ties) |
| TOC READMEs (X2 lane) | 6 | 24 077 | 22 906 | 22 906 (ties) |
| 22 canonical prose/ops/code lanes | 22 | 20 329 | 20 329 | 20 329 (ties) |
| .NET + PHP negatives | 11 | 12 337 | 12 337 | 12 337 (ties) |

Verification: independent CPython reader `bench/epagoge_decode.py` decodes every shipped wire and
14 forced adversary wires byte-exactly; two blind in-context decodes by the agent (a 1 538-token
changelog slice, M 662 vs 687, and a 43-frame mixed Java/Kotlin trace) reproduce the originals
byte-for-byte (sha256 receipts in `bench/z47/REPORT.md` §H); 11-case second-order adversary
(`bench/z47/adversary.ts`) all exact. Residue anatomy (`bench/z47/receipts/anatomy.tsv`) shows
body literals — hapax word tokens — are 60–80 % of the frontier message on prose, which is why the
remaining gains are in entailed-field lanes and not in general prose.

## X2: ENTHYMEME (`src/lib/omega/enthymeme.ts`, key `enthymeme`)

Entailment elision with two fixed rules (Java frame file names, GitHub heading slugs), rule
sentence counted in M. Java traces −5.1 %, TOC READMEs −4.9 %, 22 lanes tie, negatives tie;
CPython reader `bench/enthymeme_decode.py`; report `bench/z46/REPORT.md`.

## X1: ANAGNORISIS (`src/lib/omega/anagnorisis.ts`, key `anagnorisis`)

Public-canon recognition (SPDX licence texts etc.) with byte-exact patching against the canon;
LICENSE corpus −52.2 %, 22 lanes −0.9 % in total, never worse; CPython reader
`bench/anagnorisis_decode.py`; report `bench/z45/REPORT.md`.

## Honesty notes

* No LLM API exists in the sandbox; "native decode" receipts are blind in-context decodes by the
  agent, checked with `cmp`/`sha256sum`.
* EPAGOGE's gains are lane-specific (ops pastes with entailed fields). On general prose it ties
  the frontier by construction; the anatomy receipts explain why no in-message mechanism can do
  better there.
* ELLEIPSIS (X4) is a narrow win and a broad negative result; both are reported with the same receipts.
* Runtime: identical to DAEDALUS when no schema instantiates; ≈ 2× on applied files (composed +
  plain arm), kept deliberately for the never-worse guarantee.
