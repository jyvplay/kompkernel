# ANAGNORISIS + ENTHYMEME + EPAGOGE — three codecs beyond the DAEDALUS frontier, one-chat decodable, byte-exact

Three tier-5 review turns (X1 `bench/z45`, X2 `bench/z46`, X3 `bench/z47`) on top of the
DAEDALUS-D/A10 frontier. Every number is the one-chat message cost
`M = tokens(decoder contract) + tokens(wire)` in o200k_base, byte-exact round trip required,
deterministic settings (`OMEGA_DET=1`). Each codec is registered in `src/lib/omega/registry.ts`
and has an independent CPython reader under `bench/`.

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
* Runtime: identical to DAEDALUS when no schema instantiates; ≈ 2× on applied files (composed +
  plain arm), kept deliberately for the never-worse guarantee.
