# X118 — protocol, outcome space, and falsification ledger

## A. Admissible objects
Finite UTF-8 strings (the 29 canonical lanes plus any source a candidate is
tested on). A codec is a pair (E,D) with D(E(x)) = x **byte for byte**. The wire
is a single plain chat message: contract + body, no system prompt, no skills
file, no weights, no tools, no local residual withheld from the reader.

## B. Access model
The decoder sees exactly the emitted message. Every rule it needs is stated
in-band. Programmatic exactness is checked by the repository's own inverse and,
where claimed, by an independent CPython reader handed nothing but the message.
LLM-blind decode is **not** claimed (RTCE, arXiv 2601.13398, reports inverse-code
execution failures); only copy/position/arithmetic rules are used.

## C. Counted resource
Primary: o200k_base tokens of the COMPLETE message (contract + LF + wire),
counted with the library encoder, never an additive estimate. Secondary: wall
and CPU ms of `tagstackEncode` under pinned audit flags. Both are reported.

## D. Success / failure (quantifier order)
∀ lane ∈ 29: tokens(ON) ≤ tokens(OFF) ∧ decode(ON)=source ∧ exact(OFF).
∃ lane: tokens(ON) < tokens(OFF). Aggregate wall/CPU must not rise.
OFF is the X116 shipped configuration, re-verified this turn to reproduce the
X116 A/B ON hashes 29/29 (bench/x117/receipts/verify-frontier.log).

## E. Parameter regime / units / tolerances
Encoding o200k_base; OMEGA_DET=1; token tolerance 0 (exact integer counts);
byte tolerance 0 (SHA-256 of message and of token-id sequence compared). Marker must
be a single o200k token absent from the source. Key cost is charged in full.

## F. Adjacent problems NOT substituted
Not lossy summarization; not binary packing (AlphaZip/LoPace); not system-prompt
dictionaries (2604.13066); not retraining a tokenizer (BoundlessBPE); not the
unreadable entropy tier (AITHER); not optimal reflow (Knuth–Plass). The object
is the readable, byte-exact, in-band message frontier.

## G. Outcome space and evidence threshold
- **H+**: a Pareto-superior codec ships (strict token win on ≥1 lane, 0 worse,
  exact 29/29, aggregate speed not worse). Threshold: balanced A/B + OFF=X116
  hash verification + independent cold read + mutation battery.
- **H−**: no screened mechanism clears the complete-message frontier gate.
- **H∂**: raw-token wins that do not compose with the parent frontier.
Declared threshold before running: a candidate is admitted only if its COMPLETE
message (key + frontier-encoded rewritten body) is strictly below the incumbent
COMPLETE message in the same process and decodes byte-exactly. Raw screens are
necessary-but-not-sufficient filters and are labelled as such.

## H. Frontier achievability / impossibility (hypotheses stated)
- Achievability: ΣΥΝΘΕΣΙΣ fuses three independent record entailments
  (ΕΝΑΛΛΑΓΗ mode radix, ΜΗΚΟΣ symlink measure, ΣΥΜΦΥΊΑ tail template) into one
  41-token key replacing a 48-token nested key over the SAME rewritten body
  (commute verified). Hypothesis: the frontier body wire is identical for the
  same body under OMEGA_DET=1, so Δtokens = keyDelta = −7 on ls-l-real. The
  balanced A/B tests this; it is not asserted before the receipt.
- Impossibility (empirical, this corpus): a source rewrite that injects markers
  into a lane whose parent is a numeric/column model (DIASTEMA/AKOLOUTHIA-2)
  tends to RAISE the complete message, because the markers break the model the
  parent was exploiting. Observed on prices (+114) and findmnt (+77).

## I. Mechanism-distinct approaches (≥6), each with a real artifact
Every row below was actually executed; the artifact is the receipt. "Proved"
means machine-checked here; "unresolved" is the open interface; "cheapest
falsification" is the test that was run; "local-vs-global" is the gap between
the raw screen and the complete-message frontier gate.

1. **Negation contraction** (auxiliary+not → n't, escaped existing n't).
   Construction: morphological rewrite + escape marker. Artifact:
   receipts/screen.json `negation`. Proved: own inverse on fired lanes.
   Unresolved: whether 4 corpus sites amortize a key. Cheapest falsification:
   raw complete-key screen → +24 corpus, REFUSED. Local-vs-global: never reached
   the frontier; too few sites.
2. **Vertical character-affix residual** (bidirectional prefix/suffix copy of a
   field from one of K≤8 lines above). Construction: per-field residual marker.
   Artifact: receipts/affix-screen.json. Proved: own inverse + composed inverse
   exact on findmnt/prices. Unresolved: composition with column parents.
   Cheapest falsification: complete-message frontier gate → findmnt +77,
   prices +114, REFUSED. Local-vs-global: raw −501 corpus became +77/+114 at
   the frontier (markers break DIASTEMA/synkrisis models). Nearest prior art:
   KOINE (prefix, k=1), ANAPHORA-FOLD (whole-field, unregistered/negative).
3. **Unified-diff hunk-count entailment** (@@ counts recomputed from body).
   Artifact: receipts/screen.json `hunkCounts`. Proved: the fixture's counts
   are NOT body-consistent (hunk2 header 6/18 vs body 5/15; hunk3 10/14 vs
   6/9, measured by independent Python count). Falsification: the entailment
   premise is false on the fixture → REFUSED before any encode.
4. **Unified-diff derived-header entailment** (b/P=a/P; ---/+++ reuse path).
   Construction: drop derivable headers, restore from the diff --git path.
   Artifact: receipts/diff-screen.json + diff-screen.candidate.txt. Proved:
   own + composed inverse exact, 6 hits. Cheapest falsification: complete
   message 443 vs base 414 → +29, REFUSED. Local-vs-global: raw −22 became +29
   because the frontier already interns the path; the 39-token key dominates.
5. **Sentence-case channel** (ASCII-lower + predictable capitals + flip coords).
   Artifact: receipts/screen.json `sentenceCase`. Proved: own inverse exact.
   Falsification: raw +13,948 corpus (exception coords cost more than the fold
   saves; code-ts 1422→4392). REFUSED.
6. **Markdown separator-row entailment** (|---| row from header cell count).
   Artifact: receipts/screen.json `mdSeparator`. Proved: inverse exact on 2
   lanes. Falsification: raw +22 corpus (key > separator cost). REFUSED.
7. **SQL row-count footer entailment** ((N rows) from data-row count). Artifact:
   receipts/screen.json `rowCount`. Proved: inverse exact on psql. Falsification:
   raw +11 (key > footer cost). REFUSED.

Additional novelty-blocked seams (not re-implemented, cited to the owning
codec): constant-field elision = ELLEIPSIS (and its measured "dictionary-folded
constants are free" finding); JSON identifier-key unquoting = ROSETTA
(`bareableString`/`foldJsonLine`); hanging-indent layout = PADTAB/KENON/GRAMMA
family; sibling affix = PROSPHYSIS/ΣΥΜΦΥΊΑ; numeric deltas = DIASTEMA/AKOLOUTHIA-2.

## J. Negative-result shapes (≥15) and the modal-shortcut test
1. Raw win vanishes at the frontier (verticalAffix findmnt +77).
2. Raw win vanishes at the frontier (diffPaths +29).
3. Marker injection breaks a numeric-progression parent (prices +114).
4. Key cost exceeds gross saving (mdSeparator +22, rowCount +11).
5. Exception channel costs more than the fold saves (sentenceCase).
6. Too few sites to amortize a key (negation +24).
7. Fixture invariant assumed but false (hunk counts not body-consistent).
8. Constant already absorbed by a dictionary glyph (ELLEIPSIS prior finding).
9. Mechanism already owned by a registered codec (ROSETTA JSON unquote).
10. Class predicate ambiguous after marker-free elision (node-help indent).
11. Marker-free elision saves nothing when the glyph absorbs the newline.
12. Bidirectional affix disrupts column alphabets (findmnt inner 483 > 437).
13. Multi-donor reference costs more than the residual it saves.
14. Case-flip coordinate channel explodes on code (code-ts 1422→4392).
15. Identity lanes cannot amortize any key (lsblk/uptime-w/free-m).
16. Re-encoding a rewritten body can change the winning parent (prices
    diastema→akolouthia2), so raw deltas do not transfer.
17. **Modal-shortcut failure test**: the inference "the raw screen saved tokens,
    therefore the frontier will too" is INVALID. It is falsified by #1/#2/#3:
    every raw winner that reached the frontier lost. The screen is explicitly
    labelled necessary-but-not-sufficient, and no raw win is reported as a
    frontier win.

## Second-order adversary (per candidate)
For each fired candidate the inverse was run on the frontier's OWN decode of the
rewritten body (composedExact), not merely on the rewrite; a candidate that
survives its own inverse but breaks under the parent's decode is refused. This
catches the "marker the parent corrupts" failure class (PROSPHYSIS's G1b).

## Stopping rule
Stop only at real budget exhaustion. The shipped improvement this turn is
ΣΥΝΘΕΣΙΣ (H+ CONFIRMED: balanced A/B + repair re-gate, 12 277 → 12 270, Δ−7,
0 worse, 29/29 exact, 3.225× wall / 3.233× CPU). The first A/B caught a +12-token
inner-encoder regression (ab-prefix.json); the repair re-enters the full X74 chain
and was re-gated plus given a new CRC-domain/field-order attack (0 silent accepts).
The seven screened X118 mechanisms are H−/H∂ and are recorded rather than hidden.
