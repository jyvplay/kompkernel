# Individual pinned proof-source follow-ups

15 files retrieved across seven projects, with commit/path/SHA256 identities in
`receipts/research-artifacts.json`. This is source inspection only. No Lean,
nanoda, SAT certificate replay, independent agent, or expert review was executed.
The findings below refine the earlier trust interfaces; they do not certify the
entire imported proof graph or a codec result.

## OpenAI

Fetched `SubexponentialSAT/Main.lean`, `Computation.lean`, and
`SubexpRawIDRuntime.lean`. Main is an import/description entry point, not a
standalone executable SAT solver. The primitive machine has finite tape and
state counts; a transition acts on one bit/blank cell, rather than granting an
unbounded arithmetic operation for free. `Feasible(width)` existentially chooses
one primitive machine and positive constants before the universally quantified
formula in `DecidesWithBound`. `of_completed` still requires a source-program
correctness/runtime premise and introduces explicit polynomial/exponent
slowdowns. Those hypotheses cannot be erased by citing the file name. The source
neither provides a benchmarked JavaScript optimizer nor a native chat decoder.
No claim that the challenge's intentional `sorry` invalidates its separate
solution; no claim that source availability is a kernel run.

## Anthropic formal-math

Re-fetched CountedToPadded Defs/Need and followed RunFor. The concrete
`fold_reaches` lemma requires `7*S+2 ≤ room`, a machine reachability witness and
sufficient fuel length. `runForPoly` is for machines whose individual steps are
polynomial-time. These are resource hypotheses, not a universal practical speed
claim. No dependency compilation or instantiation for our codec was performed.

## Anthropic FLT

Followed the previous theorem wrapper into `P2M/Sol/S_fermat_last_theorem.lean`.
Its solution delegates to `FLT.fermatLastTheorem`, converting strictly positive
natural arguments to nonzero premises, with n≥3. This resolves one wrapper
interface; it does not replay the downstream proof. FinalCheck and PROOF-PATH
were retrieved again to preserve the intended statement and documented scope.
A source-level wrapper match is not an independent Lean check and has no direct
compression consequence.

## DoubleAI

Followed the LRAT bridge into CNF and chess Spec. CNF satisfaction is over arrays
of signed integer literals; well-formedness matters to the conversion used in
Trust. `legalMoves` filters pseudo-moves by own-king safety after `play`;
`Reachable` is inductively initial position plus legal transitions. The final
63-move statement therefore lives in this explicit chess model, not arbitrary
board diagrams. We did not prove the model matches every intended chess rule,
replay the 7,224 certificates, or audit the separate girth theorem. The prior
RouteA-vs-RouteB distinction remains essential.

## Google DeepMind

Re-fetched Erdős 741(i), following the explicit `SandorA` counterexample and its
`SandorA_has_pos_density` / no-partition lemmas to the final false-answer target.
`HasPosDensity` is imported from FormalConjectures, not newly established by
merely reading its name here. This investigation did not close that imported
definition/dependency interface, so no full proof validation is asserted.
Its sumset-density counterexample supplies no bound for fixed-tokenizer text
compression.

## Harmonic

Re-fetched IMO2025P3 and inspected `isBonza` on positive naturals and the final
least-constant statement. Positivity, divisibility and the extremizing
construction are material. The axiom-print directive is source code, not a
locally executed axiom report. No transfer to compression is justified.

## ByteDance Seed

Separately re-fetched its IMO2025/P3 source, preserving its integer-valued
formulation with positive-argument hypotheses and separate upper/attainment
theorems. A problem title shared with Harmonic does not make these files
mutually verified implementations. No kernel was run and no codec theorem is
imported.

## Scope of 'all labs'

The requested exhaustive audit has not been achieved. Searches are selective,
proof graphs are much larger than these files, and available tooling cannot
certify native model behavior. The useful lesson is to retain statement,
assumptions, executable witness and verification outcome as separate artifacts.
