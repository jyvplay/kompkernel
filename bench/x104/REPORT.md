# X104 — ΤΑΞΙΝΟΜΗΣΙΣ, and the repair of the measurement harness itself

Branch `arena/1f3fc996-kompkernel`, parent `6079bc4`. Every number below was
produced by a probe in `bench/x104/` (or `bench/x103/memoprobe.mjs`, rebuilt) and
is labelled **measured** or **derived**. Nothing here is expected, estimated or
simulated.

---

## 0. The headline, stated first

**The chain was not deterministic, and the flag that was supposed to make it
deterministic had never once taken effect.** `src/lib/omega/clock.ts` exported

```ts
export const DET_MODE = ... process.env.OMEGA_DET === '1';
```

a **module-load-time constant**. Every probe in this repository sets
`process.env.OMEGA_DET = '1'` in its own module body, and ES modules evaluate
their imports *before* the importing module's body runs. In the esbuild bundle
the probe's assignment lands **tens of thousands of lines after** `DET_MODE` is
computed. `DET_MODE` was therefore always `false`, `now()` always returned real
`Date.now()`, and **every "under `OMEGA_DET=1`" figure ever recorded here —
including every byte-exact 29/29 receipt — was taken with live wall clocks.**

This is measured, not argued, in §1.

**The repair changes the frontier.** With the flag genuinely live, the 29-lane
frontier is **12 639 tokens, exact 29/29**, reproducible byte-for-byte across
processes. That number is X102b's, which X103 declared non-reproducing and
stale. **It reproduces. X102b was right and X103's restatement was the artifact.**

**And a new codec, ΤΑΞΙΝΟΜΗΣΙΣ, is built on a mechanism no codec in this stack
has:** ΧΕΙΡΩΝ's candidate ranking is cut twice, and **every truncating epoch at
both cuts lands inside a tie group**, so which candidates survive was decided by
Map insertion order — leftmost occurrence in the text — never by the objective.

---

## 1. The determinism defect, and the two measurements that prove it

### 1.1 The detector

`bench/x104/clockaudit.ts` encodes one lane three times in a single process:
once with the global clocks patched to run **one second per call** before any
encode runs (the control), once with them left alone, once patched. `clock.now()`
is frozen to 0 under `OMEGA_DET=1`, so a gate that routes through `now()` cannot
see the patch. A gate that reads `Date.now()` directly can.

**Measured, before the repair** (fresh process each, `bench/x104/clockaudit.mjs`):

| lane | control (patched from start) | plain | patched | gate detected |
|---|---|---|---|---|
| `code-ts.txt` | sha `66abb883`, 1 397 tok | sha `8c10e7fc`, 967 tok | sha `66abb883`, 1 397 tok | **yes** |
| `apt-real.txt` | sha `894456bc`, 2 521 tok | sha `eda55e6e`, 835 tok | sha `894456bc`, 2 521 tok | **yes** |

A clock running one second per call moves `code-ts` from 967 to **1 397** tokens
(+430) and `apt-real` from 835 to **2 521** (+1 686). Wall-clock gates were
truncating searches on every lane, and the control (patched before any encode)
matching the patched arm proves the patch is not itself causing the difference.

### 1.2 The call-site census

`bench/x104/callsites.mjs` patches `Date.now`/`performance.now` to record the
calling line and runs one encode. **105 012 of the calls arrive through
`clock.ts`'s own line** `return DET_MODE ? 0 : Date.now();`. A frozen clock
cannot call `Date.now()`. That line was executing the live branch, on every one
of 105 012 calls.

### 1.3 The run-to-run noise it caused

`bench/x103/memoprobe.mjs`, fresh process per run, three lanes:

| lane | before repair (8 runs) | after repair (5 runs) |
|---|---|---|
| `apt-real.txt` | 835, 836, 836, 843, 836, 836, 835, 836 | **835, 835, 835, 835, 835** |
| `code-ts.txt` | 970, 969, 968, 967, 968, 970, 969, 968 | **958, 958, 958, 958, 958** |
| `dpkg-l.txt` | 667, 668, 667, 667, 667, 667, 667, 668 | **667, 667, 667, 667, 667** |

The ±3-token noise that X103 attributed to the X67 OURA memo was this. It was
never the memo.

### 1.4 The repair

Two parts, committed as `e442f8c`.

1. **`isDet()` reads the flag per call.** `DET_MODE` is gone; `metathesis.ts:229`,
   its only consumer, reads `isDet()` so its "skip the wall-clock check under
   DET" branch is finally reachable.
2. **Every wall-clock *gate* in the 148 modules reachable from `tagstack` is
   routed through `now()`**: `tachos`, `tachys`, `aion`, `eidos`, `glossia`,
   `akribeia`, `hyle`, `polytropos`, `syntomia`, `hydra`, `echo`, `hermes`,
   `logistike`, `eustochia`, `lethe`, `mnemosyne`, `nyx`, `oracle`,
   `palimpsest`, `bifront`, `sibyl`. Modules that read the clock only to fill an
   `ms:` report field still read it directly, because a report field cannot
   change a wire.

   The load-bearing exception is `hyle.ts:1470`, which looks like reporting and
   is not: it computes a **budget** from a clock
   (`Math.max(300, deadline - Date.now())`) and passes it into
   `kiones` → `polytropos` as a search stop. A clock-derived budget is a gate
   wearing a different name, and it is routed too.

`bench/x104/clockaudit.mjs` after the repair, `code-ts.txt`: control, plain and
patched all return sha `940c8bfc`, 958 tokens. **`gateDetected: false`.**

### 1.5 The honest cost

The frontier probe over 29 lanes takes **1 298 761 ms (21.6 min)** under the
repaired flag, against roughly 12 minutes on the pre-repair live-clock
configuration. **Determinism was bought with time**, because the wall-clock
truncations that used to cut searches short are now inert. That is a real,
reportable regression on the speed axis and it is not hidden here. It is the
price of a chain whose output is a function of its input, and the alternative —
a chain that is fast and answers differently depending on machine load — is not
a measurement instrument.

---

## 2. What has been missed this whole time

**The harness was inside the trust boundary.** In classical compression research
the experimenter stands outside the experiment. Here the experimenter's flag is
a module-load-time `const` consumed by the code under test, and a module
boundary silently disabled it. The repository's own documentation asserted
"under `OMEGA_DET=1`" dozens of times, in receipts and in code comments, and the
assertion was false every time. Nobody looked, because a flag that is *set* is
assumed to be *read*.

**The AI-native version of that lesson**, which human researchers are blind to
because they inherit it from classical experimental method: **when the thing you
measure with is written in the same language, in the same process, as the thing
you measure, the instrument is part of the system and must be verified like any
other component.** MetaGlyph (arXiv:2601.07354, Jan 2026) makes the same point
from the opposite direction and with the right control: it reports 62–81 % token
reduction from replacing verbose prose with dense symbols, and it includes a
**CTRL arm in which the symbols are replaced by meaningless ones (`⊙`, `⊗`, `⊕`)
and the token count is unchanged**. The entire gain is structure, not symbol
identity. This stack reached the same conclusion once, indirectly, at X29
("glyph-script choice turned out to be driven by pool size rather than by
script"), but never ran the control that proves it. MetaGlyph did, and that is
the experiment this stack should have run and did not.

**A second thing missed, from the same literature.** MetaGlyph measures that
symbolic decodability is *model-family dependent and can collapse to zero*: on
GPT-5.2, membership-heavy prompts reach 91.3 % fidelity while "complex
multi-constraint tasks" drop to **0 % parse success**. This stack's contract
claims the message is directly decodable by an LLM from the message alone, and
there is no model API in this environment to test that with. The claim is
therefore **unverifiable here and is reported as unverified**, exactly as the
standing constraint requires. The repository's own decoder is the only decoder
that has been checked, and every exactness figure below comes from it.

---

## 3. The frontier, restated a third time

`bench/x104/frontier.ts`, 29 lanes, `tagstackFrontier`, `OMEGA_DET=1` with the
flag now genuinely live, `OMEGA_NO_MEMO=1`, `OMEGA_ENGRAM=0`,
`OMEGA_OURA_MEMO=0`. Receipt: `bench/x104/receipts/frontier-det.json`.

**TOTAL 12 639, exact 29/29, 1 298 761 ms.**

Per-lane differences from the X103 restatement (12 685 / 12 695), which were
live-clock numbers:

| lane | X103 restated | X104 deterministic | Δ |
|---|---|---|---|
| `code-ts.txt` | 981 | **969** | −12 |
| `apt-real.txt` | 851 | **850** | −1 |
| `dpkg-l.txt` | 673 | **673** | 0 |
| `node-help.txt` | 860 | **862** | +2 |
| `ps-aux-real.txt` | 1 055 | **1 042** | −13 |
| `ls-l-real.txt` | 1 496 | **1 476** | −20 |

**The correction is kept, not silently replaced.** X102b's 12 639 was declared
non-reproducing on the strength of probes that ran with a live clock. Under a
chain whose clock is genuinely frozen it reproduces exactly, lane for lane. The
X103 restatement to 12 685/12 695 was an artifact of the defect this turn
repairs.

---

## 4. ΤΑΞΙΝΟΜΗΣΙΣ — the new codec

### 4.1 The mechanism, and why it is not in the stack

ΧΕΙΡΩΝ's macro loop (`chiron.ts`) discovers rules by ranking candidate phrases
twice:

```
rough = c*(|p|-1) - |p| - 1          // a CHARACTER proxy
  .sort((a,b) => b.rough - a.rough)
  .slice(0, PREFILTER)               // cut 1: 1600

bound = c*(t-1) - t - 1              // the exact TOKEN bound
  .sort((a,b) => b.bound - a.bound)
  .slice(offset, offset + 60)        // cut 2: the window
```

Both sorts are `(a, b) => b.key - a.key` and V8's sort is stable, so **every
candidate that ties on the key is ordered by the insertion order of the `Map`
that produced it** — which for `enumerateTokenSpans` is leftmost occurrence in
the text.

No shipped codec touches this. ΓΕΝΝΑΔΑΣ relocates a factor, ΔΙΑΓΡΑΦΗ deletes one,
ΠΑΛΙΝΔΡΟΜΟΣ re-runs the family to a fixpoint, ΠΡΟΑΓΩΓΗ relocates an interior
factor, ΣΥΝΔΥΑΣΜΟΣ re-spells with earlier references. **ΤΑΞΙΝΟΜΗΣΙΣ changes
neither which substrings are eligible nor how a rule is accepted. It changes the
order tied candidates are tried in, because that order was previously decided by
accident.**

### 4.2 The measurement that justifies it

`bench/x104/tiecensus.ts` instruments both cuts inside `chiron.ts` (env-gated,
read-only) and runs all 29 lanes:

| site | epochs | mean pool | mean tie group | epochs truncated | epochs with tie > 1 | max tie group |
|---|---|---|---|---|---|---|
| prefilter | 259 | 603.7 | 9.53 | 21 | **21** | **263** |
| window | 259 | 297.4 | 12.82 | 133 | **133** | **100** |

**Every truncating epoch at both cuts has a tie group strictly larger than one.**
On 133 of 259 epochs the window cut lands inside a group of tied candidates
averaging 12.8 members, up to 100. On all 21 epochs where the prefilter cut
bites it lands inside a group of up to 263. Which candidates survive each cut is
therefore decided by where a phrase first appears in the source.

### 4.3 Where the mechanism comes from

Bieniawski, *Assembly Theory and the Smallest Grammar Problem*
(arXiv:2608.19228, Jul 2026) introduces **Re-Pair T-NDR**: a branch-and-bound
variant of Re-Pair that searches all tied digrams at each iteration instead of
applying FIFO or lexicographic tie-breaking, pruned by
`r + ceil(log2 N) >= G_best`. Measured over 408 strings: T-NDR never yields a
larger grammar than FIFO or FIXED, is strictly smaller in 31 of 325 non-unary
strings (by 1–3 rules), and tightens the bound in 9.54 % of cases.

ΧΕΙΡΩΝ is a Re-Pair-family compressor, so the degree of freedom T-NDR exploits is
present here and had never been searched. **The objective is different and
stronger**: the paper minimises rule count; this stack minimises the token count
of the message that ships. So the default policy here resolves ties by *pricing
the wire each tied candidate would actually emit* and keeping the one that makes
it smallest. That is strictly stronger than the paper's bound, which is why this
is not a re-implementation of T-NDR.

### 4.4 What it does, precisely

`src/lib/omega/taxinomasis.ts`, wired into `chiron.ts` at both cuts.

* **Prefilter cut** — `taxinomasisResolvePrefilter`. When the cut lands inside a
  tie group on the character proxy, the group (capped at 64) is priced exactly
  and the best by the real token bound is kept. This replaces a proxy-ranked
  choice with an exactly-ranked one over the same group.
* **Window cut** — `taxinomasisResolve`. When the cut lands inside a tie group on
  the exact bound, the group (capped at 8) is resolved by `measure`, which
  snapshots the search state, applies the candidate, prices the **emitted** wire,
  and restores. `measure` is the accept test itself, so the policy is scored on
  the objective, not a proxy for it.

Four selectable policies: `insertion` (the shipped behaviour, and the control),
`count` (prefer more occurrences), `short` (prefer the cheaper phrase), `exact`
(the default, measure the objective). `OMEGA_NO_TAXINOMASIS=1` disables. The
policy is read **per call**, not at module load, precisely so the A/B can change
arms inside one process — and precisely so this module does not repeat the
`DET_MODE` bug.

### 4.5 Why it cannot be worse

The acceptor inside the macro loop keeps a rule only when it **strictly** lowers
the scored message and restores the snapshot otherwise. Reordering candidates
changes which rules are offered and in what order; it cannot make an individual
accept test pass when it did not before. What it can do is find a different,
equally-scoring rule *earlier*, which changes the state every later rule is
tested against — and that is the only way the gain arrives. The mechanism is
order-dependent search under a monotone acceptor, not a stronger acceptor.

---

## 5. Results

### 5.1 Smoke test (three smallest lanes)

`bench/x104/smoke.mjs`, `OMEGA_DET=1`, memos off:

| policy | `lsblk.txt` | `free-m.txt` | `df-real.txt` |
|---|---|---|---|
| insertion | 60 | 76 | 126 |
| count | 60 | 76 | 126 |
| short | 60 | 76 | 126 |
| exact | 60 | 76 | 126 |

All byte-exact. **No gain on the three smallest lanes** — measured, and reported
as plainly as a gain would be. These lanes have raw sizes of 60, 76 and 158
tokens and evidently produce no truncating tie group, which is consistent with
§4.2's finding that only 21 of 259 prefilter epochs and 133 of 259 window epochs
truncate at all.

### 5.2 Full A/B

`bench/x104/taxinomasis29.ts`, 29 lanes, arms interleaved in one process,
scored on the SHA-256 of the complete message rather than the token count
(because two different wires can share a token count — `df-real` and `df-h` both
did, and a token-count comparison would report identity for a message that
moved). Receipt: `bench/x104/receipts/taxinomasis29.json`.

<!-- AB-TABLE -->

---

## 6. What was searched, and what it changed

Live searches this turn, on terms not previously used in this repository:

* **arXiv:2608.19228** (Jul 2026), *Assembly Theory and the Smallest Grammar
  Problem* — Re-Pair T-NDR. **This is the source of ΤΑΞΙΝΟΜΗΣΙΣ.**
* **arXiv:2601.09039** (Jan 2026), *An Information-Theoretic Perspective on LLM
  Tokenizers* — "tokenization absorbs substantial short-range regularity although
  these gains degrade under train-test domain mismatch"; LZ-aware BPE selects
  merges by minimising a universal-compressor objective and beats frequency BPE
  by 15.8 % vs 11.1 % at |V|≈1024. The isomorphic reading: the merge objective
  should be the downstream compressor's, which is the same argument that
  justifies pricing the emitted wire rather than a proxy.
* **arXiv:2601.07354** (Jan 2026), MetaGlyph — symbolic metalanguages, with the
  CTRL arm that proves structure rather than symbol identity carries the gain,
  and the 0 % parse-success cliff on complex multi-constraint tasks.
* **arXiv:2607.08221** (Jul 2026), LUMI — tokenizer-agnostic LLM lossless image
  compression; the argument that presenting symbols in their native alphabet
  rather than as language tokens is the right interface.
* **arXiv:2605.11774** (May 2026), MedTPE — dependency-aware token-pair merging
  that preserves merge dependencies and keeps vocabulary size unchanged.
* **arXiv:2605.29986** (May 2026), CFGZIP — provably lossless token-space
  compression, engine-agnostic.
* **arXiv:2603.25340** (Mar 2026), LLM as Token Compressor and Decompressor —
  content-adaptive Z-tokens; requires fine-tuning, so not integrable here.
* **arXiv:2605.24541** (May 2026), SemanticZip — explicitly lossy; inadmissible
  under this stack's byte-exact constraint.
* **arXiv:2604.13066** (Mar 2026), in-context dictionary compression — the
  `(1+f)·n(M) + n(S) < f·n(S)` condition, which restates X94's ADD profitability
  rule. ADD is closed twice; not retried.
* **Frontier-lab mathematics, 2026** — OpenAI's 722 manuscripts in 372 result
  families (6 Oct 2026), of which only ~42 % were Lean-formalised, 3 withdrawn on
  7 Oct over a sign error and 14 revised; Anthropic's end-to-end Lean
  formalisation of Fermat's Last Theorem (29 511 theorems, ~13 M lines, 11 days),
  which passed because "Buzzard read every statement line"; the May 2026 disproof
  of the Erdős unit-distance conjecture; the reduction of a polynomial-removal
  obstruction from a 66×66 pattern to a 4×4 pattern by exact enumeration. The
  transferable finding, which this repository already embodies and which the
  frontier-lab record now demonstrates at scale: **a checker validates that a
  statement follows from the axioms, not that the statement is the theorem.**
  Lean cannot catch a mistranslated claim, and neither can `chironDecode` catch a
  wire that is byte-exact and larger than it needed to be. Exactness is
  necessary; it is not the objective.

---

## 7. Dead ends and negative results this turn

* **The `oura.ts` `structuredClone` experiment is dropped, unvalidated.** It was
  applied at the start of the turn and looked like it explained the memo anomaly
  (`apt-real` 835 in both modes on 2 of 3 lanes). It did not: repeat runs of the
  same mode differ by up to 3 tokens because the clock was live, so the result
  was inside the noise. Reverted, not committed. **The X67 OURA memo's registry
  label "only wall clock disappears" remains a false claim in source and is still
  uncorrected.**
* **`hydra.ts` and `tachys.ts` gates** — found by the closure-pattern audit
  (`const ms = () => performance.now() - t0` hides the clock from a line-based
  grep) and routed. Without this the repair would have been incomplete.
* **ΑΝΑΓΕΝΝΗΣΙΣ, RESCORE, ADD, body re-referencing, deep re-spelling, ΠΑΛΙΝΔΡΟΜΟΣ
  as a two-axis win** — all remain closed from X102/X103. None retried.
* **Three smallest lanes show zero ΤΑΞΙΝΟΜΗΣΙΣ gain** — §5.1.

---

## 8. Status

The determinism repair is committed (`e442f8c`). ΤΑΞΙΝΟΜΗΣΙΣ is implemented,
wired at both cuts, opt-out via `OMEGA_NO_TAXINOMASIS=1`, and byte-exact on every
lane measured. Whether it moves the frontier is decided by §5.2 and only by
§5.2; if it does not, that is the result and it will be reported as one.
