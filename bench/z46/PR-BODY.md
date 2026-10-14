Two new exact, one-chat codecs on top of the DAEDALUS frontier, each with its own mechanism, receipts and an independent CPython reader. Both are identity-guarded: on every file in the shipped lanes they tie DAEDALUS exactly; on their own lanes they win.

## ENTHYMEME (`src/lib/omega/enthymeme.ts`, key `enthymeme`) — Z46, this turn

**Mechanism: entailment elision.** A field that is a *published deterministic function* of its neighbours is not sent; the reader recomputes it from a one-sentence rule. Two rules ship:

- JVM stack frames: `at pkg.Outer$Inner.m(Outer.java:123)` → `at pkg.Outer$Inner.m(:123)` — the source file is the simple class name cut at `$` (JLS file naming + `StackTraceElement.toString()`); verified per frame, 580/580 in ten real issues.
- Markdown heading links: `[Getting Started](#getting-started)` → `[Getting Started](#)` — GitHub's slug of the link text (GitHub Docs "Section links", `github-slugger`); verified per link.

Rule line (counted in M): `∴ Stack frames: "at C.m(:N)" = "at C.m(S.java:N)", S = C after its last ".", cut at the first "$".` (34 tok) / `∴ Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces, "-" and "_", then spaces → "-".` (40 tok).

**Why it is below the dictionary's floor.** `bench/z46/floor.ts` measures the LZ77 phrase count of each file's o200k token stream; DAEDALUS's M is 1.09–1.20× that count on prose, i.e. the copy mechanism is at its bound. ENTHYMEME removes positions whose content is *not a copy* of anything in the message.

**Receipts** (`bench/z46/receipts/SUMMARY.md`, o200k, `OMEGA_DET=1`, every row round-trip checked):

| lane | files | raw | DAEDALUS | ENTHYMEME | Δ |
|---|---:|---:|---:|---:|---:|
| JVM traces (real GitHub issue bodies) | 10 | 22 419 | 11 283 | 10 708 | **−575 (−5.1 %)**, 9 wins / 1 tie / 0 losses; best −150 (−9.8 %) |
| READMEs with heading links (first 24 KB) | 6 | 36 214 | 24 077 | 22 906 | **−1 171 (−4.9 %)**, 5 wins / 1 tie / 0 losses; best −365 (−9.1 %) |
| shipped lanes (prose/code/JSON/licence/ops) | 22 | | | | ties (identity guard) — see SUMMARY |
| PHP / .NET traces (negative space) | 11 | | | | ties — rules do not fire |

Measured and **rejected** (artifacts kept): PHP PSR-4 paths (+13…+47: the trace prints the caller's file, not the class's), .NET frames (free file names), quote-block references (0 foldable blocks in a top-posted thread), same-URL links (10 in 150 files).

Independent reader `bench/enthymeme_decode.py` (CPython, written from the rule sentences) agrees with the TypeScript decoder on all emitted wires (`bench/z46/receipts/xcheck-*`). Native in-context decode of a shipped prompt is walked through in `bench/z46/REPORT.md` §G.

## ANAGNORISIS (`src/lib/omega/anagnorisis.ts`, key `anagnorisis`) — Z45

Public-canon recognition: standard licence texts / per-file notices are replaced by `【SPDX-ID; layout…: blanks】` references the reader already knows; then DAEDALUS. −82.7 % on the 59 licence files it recognises (end-to-end 106 files), ties elsewhere; Python reader `bench/anagnorisis_decode.py`, 26/26. Full report `bench/z45/REPORT.md`.

Also in this branch: CRASIS (punctuation fusion, Z45), and the vendored cores of #27 (GRAMMA-Ω) and #28 (ANAMNESIS) with their measurements in `bench/z44/`.

Build: `npx tsc --noEmit -p .` and `npm run build` pass.
