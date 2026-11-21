# X154 — ARKESIS and tokenizer rank-index experiment

Status: research artifacts, not a certified terminal codec. See receipts for the
latest completed results. Experimental ARKESIS is unwired; native-chat verification
is unavailable. No merge should be inferred from token wins.

## A–G. Formal contract

Admissible source objects are UTF-8-stable strings. ARKESIS's subdomain is valid
JSON whose **lexical** tree renders exactly to the source using width1/2/4,
canonical comma/colon spacing, LF and final LF. Duplicate keys, original number
lexemes and escape spellings are preserved; no JSON.parse/stringify roundtrip is
used to serialize the source. Limits: 50000 UTF-16 code units, depth128, at most
10000 parsed nodes; malformed or out-of-domain strings receive the incumbent.

Access: encoder has source, fixed tokenizer and existing parent modules. Decoder
gets only the complete final message. No external dictionary, source file, skills
file or system instructions may be used for the native gate. Programmatic readers
are a separate gate. Tools actually used are listed in research.md.

Resource vector: complete o200k_base message tokens, exact source bytes, encoder
process CPU/wall time, and decoder behavior. Headers/parent representation are
charged. Peak-memory implications and extra parent calls are not free. TypeScript
rewrites are CPU work, not a fixed elapsed-time guarantee.

Quantifiers: token-only selection asserts, **for each admitted source x**, the
selected message has price <= that source's verified incumbent; for at least one
measured x, saving >10 tokens. This finite result is not `exists codec C, forall
sources x, all models M decode exactly and every resource improves`. A native
claim requires specifying M and a blind first-response protocol, then verifying
source bytes for the prescribed trials. No M was invoked here.

Incumbent: current TAGSTACK configuration plus X152 HOMOSEMA and X153 KENOMA,
not a weakened raw-text comparison. Deterministic flags are OMEGA_DET=1,
OMEGA_NO_MEMO=1, OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0, OMEGA_NO_OROTHESIA=1.
Tolerances: zero byte differences, exact integer token prices. Speed gate, declared
before measurement: >=10% lower aggregate wall AND CPU, no per-lane regression,
and identical final messages in 12 cold-process ABBA calls across three fixed lanes.

Adjacent problems NOT substituted: JSON value equality, canonicalization without
residuals, semantic summarization, payload-only compression, token-ID transmission,
changing the tokenizer/vocabulary, known-source model reconstruction, character
length optimization, microbenchmark speed, or a theorem stated in different units.

## H. Hypotheses and thresholds

- H+: a cardinality representation can improve an existing parent frontier. A
  complete-wire >10-token gain plus independent exact read supports only this
  bounded hypothesis. Native and runtime gates are still separate.
- H−: the full conjunction is impossible. Not established. An injective code with
  vocabulary size V has at most sum(i=0..t)V^i strings of at most t tokens; this
  counting constraint rules out arbitrary universal shortening beyond capacity,
  not structured JSON or prose improvements. No unverified ETH assumption used.
- H∂: behavior depends on lexical layout, model, size and parent. Tested losses
  and domain refusals bound the positive result; they are not hidden.

## New mechanism: ARKESIS

ARKESIS replaces JSON's delimiter topology by prefix cardinalities: `{N` starts
N key:value pairs, `[N` starts N values; leaf JSON tokens remain literal, spaces
separate items. Child countdowns locate ends, independently of indentation or
closing symbols. The inverse reconstructs canonical layout and copies each raw
leaf/key lexeme. This differs from KENOMA's retained-indentation side information.
It is classical preorder degree coding, not a claimed new mathematical primitive.
The repository novelty audit is scoped in research.md.

Construction argument: by structural induction, a scalar is copied; at an object
or array the supplied count determines exactly how many recursively decodable
children to consume. Key order and each raw key/scalar are retained. Applying the
fixed renderer reconstructs the source **because admission compares every byte**.
The optional selector checks the composed parent inverse and strictly compares
complete prices. Unsupported incumbent readers fall back, never count as passes.

Search is non-greedy enumeration of widths1/2/4 and an exact final argmin with the
incumbent. Identical folded payloads share a parent call within that enumeration.
Parsing/formatting has bounded depth; conservatively O(N²) worst-case character
copying under substring/immutable-string implementations, O(depth*N) rendered
intermediate size. It is not a bound on inherited parent search or total wall time.
No broad prose improvement is implied: ordinary prose is outside this JSON domain.

## Six independent mechanism tracks (not six new inventions)

`portfolio.ts` screens existing mechanism families on canonical29; all available
rewrite inverses are executed. `hash-probes.ts` is a separately executed causal
experiment. Early tracks do not share an acceptance outcome.

| Track | Concrete artifact / established portion | Remaining interface | Cheapest attacker / gap scope |
|---|---|---|---|
| Prefix cardinality | arkesis.ts, unit.ts, trial.ts; exact lexical tree roundtrips | native read, broad utility, added parent runtime | wrong count/truncation/duplicate-key loss; local format/readability gap |
| Layout-derived endings | existing kenoma.ts, portfolio.ts; exact eligible inverse | no prose applicability, cold-chat gate | dedent with noncanonical close spacing; local |
| Affine layout differences | existing ptyche.ts, portfolio.ts; inverse checked | parent cost cannot be inferred from raw proxy | tabs and irregular widths; local |
| Permutation information channel | existing diathesis.ts, eligibility screen | carrier/header pricing and native rank reading | repeated entries/permutation boundary; local for finite domain, broad target unresolved |
| Function-derived numeric fields | existing mekos.ts, portfolio.ts; symlink size byte-count inverse | insufficient frequency/header payoff | multibyte target plus stale reported length; local |
| Rank-index hashing | speed-build.mjs, hash-probes.ts, bpe-gate.ts | isolated full-stack timing and full canonical regression | colliding 3/4-byte keys, absent keys, invalid UTF8 vocab entries; local implementation gap |

No success in one track is inherited by another. ARKESIS's cardinality arm is one
mechanism, not multiple discoveries because several widths were tested.

## Adversarial verification and modal shortcuts

617 TypeScript checks exercise nested/empty containers, escaped strings, Unicode,
duplicate keys, -0, exponent overflow lexemes, CRLF/no-final-LF refusals and depth
limits. Independent Python uses tokenization plus counted recursive rendering,
reusing only X152's separate Python parent reader. Its 32 attacks cover malformed
counts, truncated/trailing/deep streams, Unicode line separators and lexical keys.
The codec has no repaired logic inheriting stale trust; any later repair must
rerun these gates and add an attack specific to that repair.

`modal.py` rejects22 explicitly flagged deceptive shapes (receipt lists each),
including omitted instructions, weak baseline, source mismatch, self-report,
semantic normalization, native substitution, heldout leakage, character/token
transfer, free runtime, contaminated/memo timing, aggregate hiding regressions,
challenge-as-proof, source-as-replay, repaired-but-not-retested and NOT_RUN-as-pass.
The modal failure here is **program inverse => native behavioral verification**:
execute the detector with nativeSubstitute=true; it must reject. Structured flags
are not an automated theorem prover over arbitrary prose.

## Research and next decisive gate

New literature and individual OpenAI/Anthropic/DeepMind/Double AI investigations
are in research.md. No universal survey or proof-kernel replay was possible.
Use native.md and the exact native-packet.txt for a blind basic-chat first-response
byte comparison. That test remains higher information than another in-context
assistant description of how the inverse works.

## Reproduction

Bundle TS runners with esbuild --bundle --platform=node --format=esm, run with node.
`node bench/x154/speed-build.mjs` creates A/B benchmark and reference-gate builds.
`python3 bench/x154/speed-run.py` must run only after all other heavy jobs exit.
`python3 bench/x154/independent.py <jsonl receipts>` checks sources on disk, not
encoder self-report. `attacks.py`, `modal.py`, and `compare-frontier.py` are direct
Python runners. Generated bundles are ignored; source/receipt fixtures are retained.

## Completed quantitative outcomes

| Source | Strongest incumbent | ARKESIS full wire | Selected saving |
|---|---:|---:|---:|
| Canonical json-pkg | 653 | 674 | 0, fallback |
| VS Code JSON manifest | 867 | **822** | **45 (5.19%)** |
| VS Code HTML manifest | 826 | 828 | 0, fallback |

Three independent Python source-byte reads pass; all three composed wires pass
reference pricing, UTF-8 transport, token-ID roundtrip and strict-selector replay.
There are617 codec checks,32 independent attacks and11 wrapper attacks. The latter
include a mismatched incumbent, a wrong parent payload, header-cost rejection,
source instability and one-call deduplication across width variants.

The prospective unrelated ESLint manifest trial hit900seconds before writing a
complete incumbent/candidate row: **TIMEOUT, no result**, not heldout confirmation.
Its source/ref/license and predeclared plan are retained. Hence positive breadth
still consists of one previously studied same-project JSON manifest, not broad
prose/ops. Canonical configuration was rerun independently:29/29 identical wires,
11962tokens. Reference prices/token-ID transport29/29; bounded project source
reader21/29 with eight unsupported. Category totals/leaders remain: prose3429
(word), ops5580 (glyph), code2636 (word), other317 (no tape class).

### Two speed hypotheses tested and rejected at the deployment threshold

1. Multiplicative hashing of3/4-byte rank keys reduces measured mean vocabulary
   insertion probes19.42→1.03 and9.07→1.04, but isolated whole-stack ABBA yields
   CPU ratio**1.007737**, wall**1.003135**, so the significant-speed gate FAILS.
   Four candidate canonical rows matched before further regression was deliberately
   stopped to isolate timing; no full29 candidate claim. Not deployed.
2. An actual CPU profile then located rank lookup and GC hot spots. A second
   implementation uses exact allocation-free5..8-byte keys in typed-array open
   addressing, preserving the original3/4-byte tables. Both builds pass14909
   canonical/Unicode checks plus285436 surrounding-vocabulary attacks. Isolated
   ABBA yields CPU ratio**0.997783**, wall**0.995764**, also FAILING the gate and
   showing per-lane regressions. Not deployed. The few-tenths-percent aggregate
   movement is not claimed as significant.

All24 timing-run output wires match the fresh canonical frontier. These failures
are useful causal evidence: reducing insertion probes or removing a string-key
allocation does not by itself accelerate the complete encoder. No production
speed source changed. The profile itself is excluded from Git; its summary and
profile-run output are retained. Exact A/B patches/build scripts are reproducible.

Typecheck and production build pass after heavy jobs exited. The earlier build
was resource-killed during concurrent benchmark work; its log/status remain and
are not counted as a pass. Concurrent trial times are never speed comparisons.

**Acceptance:** a new bounded token-advancing codec exists, but native behavior,
broad prose/ops gains, significant acceleration and conjunctive Pareto superiority
remain unmet. Do not merge on these results. No impossibility conclusion is drawn.

### Fresh complete API replay

`full-api.ts` completed with all incumbent computation enabled:867→822, one extra
ARKESIS parent call,237142.804mswall/248891.229msCPU. Complete final message matches
the blind native packet, reference price and source bytes. This is a measured cost,
not a paired runtime improvement. Full-api.json contains the exact message.
