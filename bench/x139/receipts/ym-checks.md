# What the formal checks cover

Our checks express selected expectations in Lean and prove that the submitted construction satisfies them. A successful build establishes those formal propositions. Human review is still needed to establish that the definitions and statements express the intended physics and mathematics. The [assessment](../../../docs/assessment-1.pdf) discusses that review.

The [worked-example index](examples/README.md) maps the current assessment’s A1–A8 evidence labels to commented Lean walkthroughs. A7 denotes the combined target; A8 denotes the separate OPE target.

## The combined witness

[AcceptanceSpec.lean](../checks/AcceptanceSpec.lean) defines `CombinedAcceptance`; [CombinedAcceptance.lean](../checks/CombinedAcceptance.lean) proves it. For each allowed gauge group and positive construction penalty, the theorem chooses a Wilson family before the requested extraction order. For each such order, a refinement supplies one table and one `Spec.Final` witness satisfying all the acceptance clauses. This prevents the clauses from being satisfied using unrelated choices of theory.

| Check | Formal interface | Interpretation and scope |
|---|---|---|
| A3, A7: Finite lattice theory and limits | `LatticeAndScale` | The submitted probability law agrees with the selected `lgt` Wilson law after the stated coupling conversion. Finite moments, common calibration, full fixed-volume UV convergence and extracted IR convergence are related on the same family. |
| A1: Phase averaging and independent OS axioms | `PhaseAndOS` | The lattice-limit table is the phase average. The selected centered stress-trace scalar family satisfies the Douglas–Mei–Yin E0–E4 axioms and arity-linear E0′ growth condition. The actual integrals are identified and shown integrable. This independent bridge concerns that scalar family, not a separately specified all-field OS interface. |
| A6: Stress-tensor normalization | `TranslationWard` | The translation Ward identity is stated with its fixed sign and coefficient for every central field and every phase, together with integrability and independence of the cutoff window. |
| A2: Registered operator content | `OperatorContent` | Exhaustion of the registered invariant polynomial labels, the stated absence of extra null fields, the phase field dictionary, a dense word domain and faithfulness are retained. There is no comparison with an independently constructed canonical Hilbert space. |
| A4: Leading short-distance behavior | `LeadingTrace` | The selected trace two-point kernel has the stated leading logarithmic law and explicit coefficient, and satisfies the group's `KernelUVPowerLaw` predicate. This is not all-orders perturbative matching. |
| A5: Common scale and a positive probe | `LatticeAndScale`, `TwoPointScale.MassLimit` | The scale and coupling calibration and the proved positive lattice probe are included. They do not establish a nonzero intrinsic continuum reference mass. |
| A7: Other submitted conclusions | `SourceConclusions` | Reconstruction, OPE, contact and leading comparison results remain attached to the same witness. Bundling them does not by itself independently validate every source definition. |

The combined theorem does not assert uniqueness of the large-volume limit, a mass gap, confinement, or all-orders perturbative matching. It asserts full fixed-volume UV convergence and the submitted form of IR extraction. Neither a unique phase nor a unique thermodynamic limit is inferred.

## The OS correspondence

[CompleteOS.lean](../checks/CompleteOS.lean) packages the completed scalar bridge. The defining predicates are in [Vendored/Axioms.lean](../checks/YangMills/OSRecon/Vendored/Axioms.lean) and [Growth.lean](../checks/YangMills/OSRecon/Growth.lean). Their OSreconstruction counterparts are included under [provenance/osreconstruction/](../provenance/osreconstruction/).

The runner compares the whole declarations of `OSInnerProduct`, `OsterwalderSchraderAxioms`, `OSArityLinearGrowthCondition` and `BorchersSequence`, including their fields. It applies the recorded normalizations for comments, whitespace, type spellings, the dimension binder and the public seminorm abbreviation. It does not discard the fields of the structures. The normalized-text comparison is a source correspondence check; the copied definitions and all bridge proofs are then compiled together with the October construction on Lean 4.32.0. The full upstream OSreconstruction project is not rebuilt as part of this package.

The scalar correlation functions are paired with zero-diagonal Schwartz tests. This test space and the proved integrability control how the bridge treats coincident-point singularities. Readers checking the physical formulation should review that domain explicitly.

## The additional OPE check (A8)

[OPESpec.lean](../checks/OPESpec.lean) formulates the coefficient bounds and truncated-expansion remainder using a positive radius and explicit quantifiers. [OPECheck.lean](../checks/OPECheck.lean) derives this from the submitted OPE, proves that differences of phases use the same coefficients with a controlled remainder, and checks channel assembly and exact recovery of a single field.

`YMReview.OPE.constructed` retains the submitted `Properties` and the review's `CommonOPE` on the same hierarchy. This is a separate endpoint from `combined_acceptance`; no new theorem here identifies its existential witness with the witness chosen by the combined endpoint. The proof `from_source` can also be applied to a hierarchy whose OPE property has already been obtained.

These checks do not determine explicit Yang–Mills perturbative coefficient values or prove uniqueness under all choices of operator normalization and OPE prescription. The earlier combined Comparator run predates this adapter and therefore did not check it. Its own evidence is listed separately.

## Admissions, axioms and negative controls

The review runner freshly compiles all 43 review modules and audits 13 declarations: eight combined-check declarations and five OPE declarations. It requires zero review warnings and permits only `propext`, `Classical.choice` and `Quot.sound` in the reported dependencies.

Comparator has separate reference and solution modules. The reference proofs deliberately use `sorry`; they state what the solutions must prove. The solution theorem must not depend on `sorryAx` or any other unapproved axiom. Four small control projects check ordinary acceptance and rejection of a changed proposition, an added axiom and a changed definition. The deliberate bad examples are confined to `verification/controls/`.

Exploratory tests beyond the October submitted claims are outside this initial package. The November submission and its additional perturbative matching claims are also outside its scope.
