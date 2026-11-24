# X171 — METRIDA (experimental, unwired)

**Acceptance: false.** A real new bounded codec was implemented, not renamed
from KYKLOS. It has not delivered the requested broad Pareto improvement.
No production encoder or tokenizer defaults changed.

## A — Domain and quantifiers
UTF-8-stable strings, at most 50,000 UTF-16 units. JSON dictionary contains 1–4
unique ASCII-letter markers and two ASCII-letter words of unequal length per
marker (each 1–100 letters). Marked lines contain at most eight marker sites.
Decoder enumerates at most 256 ordered assignments and accepts exactly one
whose replacement-length sum matches the transmitted integer. Literal lines and
all other characters are preserved; replacements are never rescanned.
Correctness is conditional on this accepted format, not universal compressibility.
Transport rejects isolated surrogates. Marker/dictionary/contract and parent
message are included in o200k_base token prices.

## B — Hypotheses
H+: more than ten net tokens saved on multiple varied prose/ops settings,
original byte recovery, independently verified complete prices, successful basic
single-message native decoding, and significant whole-stack speed improvement.
Speed gate: aggregate CPU and wall ratios <=0.90, every protected lane <=1.0,
identical output hashes. H−: these tested candidates fail those gates; this is
not an impossibility theorem. H-boundary: finite inverse correctness and strict
fallback may hold while native readability, broad gain and speed remain false
or unmeasured. Native decoding is NOT_RUN.

## C — Mechanism and novelty boundary
METRIDA pays one integer constraint per marked line, not an occurrence-choice
tape or temporal cursor. Repeated mixed assignments often collide under a sum;
these are rejected, not resolved by language plausibility. Novelty is a bounded
repository review, not a universal originality claim. See `structural.py` and
`receipts/structural.json` for six mechanism branches, concrete falsifiers and
gaps: ambiguous aliases, cycles, normalization/repair, semantic side information,
ordered dictionary tapes, and streamed BPE counting. Only the first is a new
codec; the others are structural investigations or an actual speed experiment,
not six fabricated successful codecs.

## D — Greediness and limits
Planner ranks up to 16 frequent words, considers unequal-length pairs and up to
four unused Q/Z/X/J markers. It tries leading candidates and shrinks each line's
selected prefix until unique. This is greedy, not an optimum certificate. Parent
selector makes at most one expensive parent call, checks exact recovery, and
keeps the verified incumbent on ties, losses or exceptions. Each line solve costs
O(8*256), with bounded dictionary lookup and linear scanning; planner adds a
bounded number of solves and tokenizations. The existing parent has its own
costs: the one-call cap is not a wall-time guarantee. Full-source output size is
checked during expansion. Literal source containing tilde is conservatively
excluded by the planner.

## E — Executed evidence
* Preliminary portfolio: 34 sources, 218 plans, zero raw wins.
* Fresh unit/transport/count checks: 27,574; 3,279 exhaustive short sources;
  37 corpus sources, 240 plans; 8,013 saved inverse pairs.
* Independent dynamic-programming inverse: 8,264 checks including eight saved
  base/candidate parent wires, zero errors. Separate inverse is not a model.
* Four full-parent trials: email 486→581, KB620→711, ps381→480,
  JSON653→755. All losses; selector retains incumbent. Gate32 checks passed.
* Count reference gates: 16,192 checks each A/B; B boundary target 2,880.
* Six-lane isolated ABBA: 24 identical wires, CPU ratio0.9831801,
  wall0.9848291. Regressions include KB and diff. **Speed rejected**.
* TypeScript noEmit and production build exit0. Build36.69seconds is not a
  paired speed measurement. Native handoff prepares two prompts, no model run.

## F — False-solution firewall
`modal.py` rejects 27 explicit shortcut shapes and a false conjunctive Pareto
claim. Its concrete two-function countermodel refutes program-existence ⇒ any
native decoder succeeds. It is an evidence-schema check, not a theorem prover
for arbitrary English. Source self-report, partial reader support, header-free
pricing, niche-only gains and finite-to-universal inference remain forbidden.

## G — Research
See `research.md`, pinned GitHub source hashes and fetch script. Individual
conditional statements were read; no Lean kernel or exhaustive proof audit ran.
The uncertain-prior communication theorem has shared knowledge assumptions that
cannot be imported as free native decoding. New binary codes do not imply BPE gains.

## H — Repairs
No weighted-sum variant was deployed. A briefly edited instruction was restored
before the fresh unit and inverse gates; code and contract both use unweighted
sums. Any future semantic change requires fresh tests, parent prices, malformed
attacks, independent inverse and native evaluation. Old receipts are not proof
for repaired variants.

## I — Frontier
Fresh canonical replay completed: all 29 wires identical to X170, 11,962tokens.
Prices/token-ID checks pass on all29. Separate Python parent reader:22exact,
7unsupported,0mismatches; repository TypeScript reader:21exact,8unsupported.
Unsupported is not success. Fresh category totals/leaders: PROSE3429/word,
OPS/TABULAR5580/glyph, CODE/STRUCT2636/word, OTHER317/no tape. Local fixture
leaders are in receipts/local-leaders.json, not global-optimality claims.
Speed runs paused the actual replay Node and resumed it in finally; paused time
is not encode CPU. The broader Requests benchmark was not rerun this turn.

## J — Decision and next falsifier
Keep METRIDA unwired and the speed patch benchmark-only. The highest-information
next codec experiment is a position-sensitive constraint that separates mixed
orders, with its longer instructions and integer priced before parent search;
it might still lose and is not implemented here. Basic-chat byte-exact decoding
needs a genuinely external single-message run. Merge is requested independently
of scientific acceptance and does not turn this negative result into a win.

Integration note: staged whitespace checking flags one source-preserved trailing
space in native/36.txt and Vite's captured log line. These evidence bytes are
intentionally retained, not normalized. Build and noEmit passed; no native
response or theorem-kernel execution is implied by those checks.
