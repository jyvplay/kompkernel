# The Aaronson–Ambainis conjecture

> **A proof of the Aaronson–Ambainis conjecture**
>
> David Turturean, [PSI](https://psi.inc), `david@psi.inc`

[![Build Lean formalization](https://github.com/physical-superintelligence/aaronson-ambainis/actions/workflows/build-lean.yml/badge.svg?branch=main)](https://github.com/physical-superintelligence/aaronson-ambainis/actions/workflows/build-lean.yml)
[![Comparator](https://github.com/physical-superintelligence/aaronson-ambainis/actions/workflows/comparator.yml/badge.svg?branch=main)](https://github.com/physical-superintelligence/aaronson-ambainis/actions/workflows/comparator.yml)
[![Release files](https://github.com/physical-superintelligence/aaronson-ambainis/actions/workflows/release-check.yml/badge.svg?branch=main)](https://github.com/physical-superintelligence/aaronson-ambainis/actions/workflows/release-check.yml)
[![Lean 4.33.0](https://img.shields.io/badge/Lean-4.33.0-blue)](lean-toolchain)
[![Mathlib v4.33.0](https://img.shields.io/badge/Mathlib-v4.33.0-blue)](lakefile.toml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)

This repository contains a paper and a Lean 4 formalization of a proof of the Aaronson–Ambainis conjecture: a bounded polynomial of low degree on the discrete cube has an influential variable.

## Result

Let `p` be a real polynomial in `N` variables of degree at most `d` such that `0 ≤ p(X) ≤ 1` for all `X ∈ {0,1}^N`, and suppose that the variance of `p(X)`, for `X` uniform on `{0,1}^N`, is at least `ε > 0`. Then some variable `i` has

```text
Inf_i[p]  ≥  (8√15 / (125 π^4)) · ε^{5/2} / d^6  ≥  (ε/d)^7 ,        Inf_i[p] := E_X[(p(X) − p(X^i))²],
```

where `X^i` is `X` with the `i`-th bit flipped. This is Conjecture 1.7 of S. Aaronson and A. Ambainis, *The need for structure in quantum speedups*, Theory of Computing 10 (2014), 133–166 (Conjecture 6 of [arXiv:0911.0996v3](https://arxiv.org/abs/0911.0996v3)), which asks for a bound of the form `(ε/d)^{O(1)}`.

On the cube `{−1,1}^n` the statement reads (Theorem 1.1 of the paper): for `n ≥ 1`, every function `f : {−1,1}^n → [−1,1]` of degree at most `d ≥ 1` has a coordinate `j` with `Inf_j(f) ≥ (√15 / (500 π^4)) · Var(f)^{5/2} / d^6`, where `Inf_j(f) = E[((f(x) − f(x^j))/2)²]`.

The public Lean declarations are:

```lean
theorem aaronson_ambainis : PrintedConjecture
theorem aaronson_ambainis_explicit : ExplicitBound
theorem aaronson_ambainis_pm : ExplicitBoundPM
theorem aaronson_ambainis_of_fbsDegreeBound : FbsDegreeBound → ExplicitBoundImproved
```

The five propositions that occur in the four theorems above are defined in [`AaronsonAmbainis/Conjecture.lean`](AaronsonAmbainis/Conjecture.lean), a file that imports only Mathlib and uses no definition of this project. `PrintedConjecture`, the first definition in `Conjecture.lean`, is the conjecture in the normalisation of Aaronson and Ambainis, with the bound `(ε/d)^7`; to check that `aaronson_ambainis` proves the conjecture, a reader needs to read only `PrintedConjecture`:

```lean
def PrintedConjecture : Prop :=
  ∀ (N d : ℕ) (p : MvPolynomial (Fin N) ℝ), p.totalDegree ≤ d →
    (∀ X : Fin N → Bool,
      0 ≤ MvPolynomial.eval (fun i => if X i then (1 : ℝ) else 0) p ∧
        MvPolynomial.eval (fun i => if X i then (1 : ℝ) else 0) p ≤ 1) →
    ∀ ε : ℝ, 0 < ε →
      (∑ X : Fin N → Bool,
          (MvPolynomial.eval (fun i => if X i then (1 : ℝ) else 0) p
            - (∑ Y : Fin N → Bool, MvPolynomial.eval (fun i => if Y i then (1 : ℝ) else 0) p)
                / 2 ^ N) ^ 2) / 2 ^ N ≥ ε →
      ∃ i : Fin N,
        (∑ X : Fin N → Bool,
          (MvPolynomial.eval (fun k => if X k then (1 : ℝ) else 0) p
            - MvPolynomial.eval
                (fun k => if Function.update X i (!X i) k then (1 : ℝ) else 0) p) ^ 2) / 2 ^ N
          ≥ (ε / (d : ℝ)) ^ 7
```

`ExplicitBound` is `PrintedConjecture` with the bound `(8√15 / (125 π^4)) · ε^{5/2} / d^6`, and `ExplicitBoundPM` is Theorem 1.1 of the paper of this repository, on the cube `{−1,1}^n` (the bit `true` is `1` and the bit `false` is `−1`), in the form with a lower bound `ε` for the variance, with the lower bound `(√15 / (500 π^4)) · ε^{5/2} / d^6` for the influence. In `Conjecture.lean` the power `ε^{5/2}` is the real power `ε ^ ((5 : ℝ) / 2)`.

The fourth theorem has a hypothesis: `FbsDegreeBound` is Theorem 1.7 of A. Agarwal and S. Ben-David, [arXiv:2410.19062](https://arxiv.org/abs/2410.19062), which is not formalized here. Its conclusion, `ExplicitBoundImproved`, is the statement of `ExplicitBound` with the constant `32√15 / (125 π^4)` in place of `8√15 / (125 π^4)`.

## Status

The Lean development is complete: the four theorems above are proved with no placeholder and no added axiom, and they have been re-checked by two independent implementations of the Lean kernel (see [Trust boundary](#trust-boundary)).

The proof, the paper and the formalization were produced by AI models (see [License and disclosure](#license-and-disclosure)).

## Start here

- **For the mathematics:** read the paper, [`paper/aaronson_ambainis_paper.pdf`](paper/aaronson_ambainis_paper.pdf).
- **For the statement:** read [`AaronsonAmbainis/Conjecture.lean`](AaronsonAmbainis/Conjecture.lean) and compare it with [`problem_statement.md`](problem_statement.md).
- **For the final theorems:** open [`AaronsonAmbainis/Main.lean`](AaronsonAmbainis/Main.lean).
- **For a guided tour:** read [`notes/FORMALIZATION_GUIDE.md`](notes/FORMALIZATION_GUIDE.md) and the table in [`notes/PAPER_TO_LEAN.md`](notes/PAPER_TO_LEAN.md).
- **For verification details:** read [`notes/AXIOM_AUDIT.md`](notes/AXIOM_AUDIT.md) and [`notes/VERIFICATION.md`](notes/VERIFICATION.md).

## Proof at a glance

The proof is elementary and has four parts.

- **An inequality for all pairs of points** (Sections 3–5 of the paper). Let `g : {−1,1}^n → {0,1}`, and choose at every point `x` a fractional certificate `λ^x` of `g`, that is, non-negative weights on the coordinates which give total weight at least 1 to every set of coordinates whose flipping changes the value of `g` at `x`. The paper and the Lean files call such a vector a *row* of `g` at `x`. A bijection theorem for the set of points at which `g = 1` is derived from a statement about the terms of lowest degree in the determinant of a matrix of monomials indexed by these points. It gives the determinant inequality (Corollary 3.2); from this follows an inequality for antipodal pairs of points, and from that, applied on every subcube, the all-pairs inequality: for all positive weights `w_j`, the sum of `1 / Σ_{j : x_j ≠ y_j} w_j λ^x_j λ^y_j` over all pairs of points with `g(x) = 1` and `g(y) = 0` is at most `2^{n−1} Σ_j b_j(g) / w_j`. Here `b_j(g) = 2^{n−1} I_j(g)`, and `I_j(g)` is the probability that flipping the coordinate `j` changes the value of `g`.
- **Integration over the level** (Section 7). Let `f` be a real function on the cube with a certificate `a^x` for its increments at every point `x`: non-negative weights on the coordinates such that `|f(x) − f(y)|` is at most the weight of the set of coordinates in which `x` and `y` differ (a row of `f` at `x`). For a level `t` and a point `x` with `f(x) ≠ t`, the vector `a^x / |f(x) − t|` is a fractional certificate at `x` of the level set `{f > t}`, that is, of the function which is 1 where `f > t` and 0 elsewhere. The all-pairs inequality for the level sets, integrated over `t`, gives the integrated all-pairs inequality: for all positive weights `w_j`, the sum of `(f(x) − f(y))^3 / (6 Σ_{j : x_j ≠ y_j} w_j a^x_j a^y_j)` over all pairs of points with `f(y) < f(x)` is at most `4^{n−1} Σ_j L_j(f) / w_j`, where `L_j(f) = E|f(x) − f(x^j)|` is the mean absolute increment of `f` in the coordinate `j`. The Cauchy–Schwarz inequality and a choice of the weights `w_j` then give the third-moment inequality `E[(max(f − r, 0))^3] · Pr[f ≤ r] ≤ (3/2) K² max_j L_j(f)` for every real `r`, where `K` bounds the total weight of the certificates. Applied at a median of a non-constant `f`, it gives a coordinate `j` with `L_j(f) ≥ Var(f)^{3/2} / (6 K²)`.
- **Averaging over coordinates** (Section 8). Averaging `f` over the coordinates `k` whose influence is small compared with `L_k(f)`, and applying the last bound to the average, gives a coordinate `j` with `Inf_j(f) ≥ (√15/125) · Var(f)^{5/2} / (L(f) K²)`, where `L(f) = Σ_j L_j(f)`.
- **The row bound and the sensitivity at every point** (Section 6). A function `f : {−1,1}^n → [−1,1]` of degree at most `d` has at every point a certificate for its increments of total weight at most `π² d²`. This bound is known with a better constant (Agarwal and Ben-David). A complete proof by their method is included; it uses Markov's inequality for polynomials, Chebyshev polynomials and linear programming duality. A step of this proof also shows that `Σ_j |f(x) − f(x^j)| ≤ 4 d²` at every point `x`, so that `L(f) ≤ 4 d²`. With `K = π² d²` and `L(f) ≤ 4 d²`, the bound of the third part is the main theorem.

For Boolean functions the all-pairs inequality has a further consequence, the two-sided inequality (Section 5): if `g` is not constant, then `4 · E[1_{g=1}/‖λ^x‖] · E[1_{g=0}/‖λ^x‖] ≤ max_j I_j(g)`, where `‖λ^x‖` is the total weight of `λ^x`. The proof of the main theorem does not use it.

The passage through level sets and fractional certificates follows a plan of S. Lovett and J. Zhang (*Fractional certificates for bounded functions*, ITCS 2023, Section 5); the all-pairs inequality, applied to every level set and integrated over the level, takes the place of the inequality that their plan leaves as a conjecture.

The first part is related to D. Reimer's proof of the van den Berg–Kesten conjecture (*Combin. Probab. Comput.* 9, 2000) and to the proof of the dual inequality by J. Kahn, M. Saks and C. Smyth (*Combin. Probab. Comput.* 20, 2011). Without its count of the points that keep a given coordinate, the bijection theorem is equivalent to Reimer's Butterfly Lemma. The passage from antipodal pairs to all pairs is the one used in those two proofs. The lemma on the fractional certificates at two points at which `g` takes different values is due to R. Kulkarni and A. Tal (*On fractional block sensitivity*, 2016).

The number `L_j(f)/2` is known as the L1 influence of the coordinate `j`. The bound `Σ_j |f(x) − f(x^j)| ≤ 4 d²` is the inequality of Y. Filmus, H. Hatami, N. Keller and N. Lifshitz (*On the sum of the L1 influences of bounded functions*, 2016) with the constant 4 in place of 2; that the sum of the L1 influences is bounded by a polynomial in the degree was asked by Aaronson and Ambainis and first proved by A. Bačkurs and M. Bavarian.

## Repository contents

```text
.
├── problem_statement.md          the conjecture as printed, and the statements formalized here
├── paper/                        the paper: PDF, LaTeX source, build file, checksums
├── AaronsonAmbainis.lean         root file: imports every module of the library
├── AaronsonAmbainis/
│   ├── Conjecture.lean           the statements, written with Mathlib only
│   ├── Main.lean                 the final theorems
│   ├── Defs.lean                 cube, wings, rows, influences, variance, mean absolute
│   │                             increments, degree
│   ├── Statements.lean           the statements of the chain (the links) as propositions
│   ├── DetDefs.lean              the matrix of monomials and its lowest-degree terms
│   ├── AllPairsDefs.lean         the all-pairs inequality as a proposition
│   ├── RowDefs.lean              the links of the proof of the row bound (Section 6) as propositions
│   ├── DetLow/                   Section 3: the determinant is non-zero; its lowest-degree terms
│   ├── DetBij/                   Section 3: the bijection theorem and the determinant inequality
│   ├── DetTheorem.lean           the determinant inequality (Corollary 3.2)
│   ├── TwoSided/                 Sections 4 and 5: antipodal, all-pairs and two-sided inequalities
│   ├── Level/                    Section 7: integration over the level, third-moment inequality,
│   │                             mean absolute increments
│   ├── Average/                  Section 8: averaging over coordinates, the bound for the influences
│   ├── Row/                      Section 6: Markov's inequality at an endpoint, block inequality,
│   │                             sensitivity at every point
│   ├── Pack/                     Section 6: the packing bound
│   ├── Dual/                     Section 6: duality and the row bound
│   ├── MainTheorem.lean          the main theorem (Theorem 1.1) from the links
│   ├── Chain.lean                the links chained; the main theorem with no hypothesis
│   ├── Bridge/                   from the main theorem to the statements of Conjecture.lean
│   ├── AxiomReport.lean          prints the axioms behind the main declarations
│   └── Comparator/               challenge and solution of a comparator run; not part of the library
├── notes/
│   ├── FORMALIZATION_GUIDE.md    reading order, the chain of the proof, the directories
│   ├── PAPER_TO_LEAN.md          each statement of the paper and its Lean counterpart
│   ├── AXIOM_AUDIT.md            the static audit, the axiom report and what they do not show
│   ├── VERIFICATION.md           pins, commands and the recorded checks
│   └── source-audit.json         machine-readable result of the static audit
├── comparator/                   the comparator run: configuration, pinned tools, description
├── verification/                 recorded outputs of the checks
│   ├── README.md                 what each record is and how it was produced
│   ├── source-digest.txt         the digests of the Lean sources that were checked
│   ├── archive-files.txt         the files that the recorded runs received, with their digests
│   ├── axiom-report.txt          output of `make axioms`
│   ├── declaration-count.txt     output of `make count`
│   ├── replay-log.txt            the recorded runs: commands, machines, results
│   ├── comparator/               the record of the sandboxed comparator run, with its outputs
│   └── control/                  a small project that a build accepts and a replay rejects;
│                                 five small comparator runs, four of which must be rejected
├── scripts/                      the check scripts used by the Makefile
├── .github/                      the build workflow, the comparator workflow, a pull-request template
├── Makefile                      `make check`, `make replay`, `make paper`, ...
├── lakefile.toml, lake-manifest.json, lean-toolchain
├── CITATION.cff, NOTICE, LICENSE, CONTRIBUTING.md
├── .gitattributes, .gitignore
└── SHA256SUMS
```

## Build and verify

Install [elan](https://github.com/leanprover/elan), the Lean version manager; the checks also use `make` and `python3`. Then, in the repository:

```bash
lake exe cache get   # download the compiled Mathlib
make check           # import check, static audit, build, axiom report
make replay          # replay the project's declarations through the kernel
```

The individual steps:

```bash
make imports         # local imports resolve; Conjecture.lean imports only Mathlib
make audit           # the sources contain no placeholder, no axiom, no way around the kernel
lake build           # compile the project
make axioms          # print the axioms behind the final theorems and check the list
make replay          # leanchecker on every declaration of the project
make replay-fresh    # leanchecker on everything behind the final theorems, from an empty environment
make count           # count the declarations in the compiled files
make digest          # one SHA-256 digest of the Lean sources and the pins
make comparator      # comparator on the four final theorems (Linux only)
```

`make comparator` needs four more tools and a Linux machine; [`comparator/README.md`](comparator/README.md) says how to build them and what a run shows.

`make replay` starts one replay task for each module, and each task loads the imports of its module. With the number of tasks that run at a time left to Lean, it used 173 GB of memory on a machine with 8 cores (one task needs about 7 GB). On a machine with less memory, replay the modules one after the other with `LEAN_NUM_THREADS=1 make replay`; this used 7.4 GB and took 11 minutes.

`make replay-fresh` re-checks Lean core, Mathlib and the project together; it needs about 9 GB of memory. The Lean version is pinned in `lean-toolchain` (Lean 4.33.0) and the dependencies in `lake-manifest.json` (Mathlib v4.33.0).

## Build the paper

```bash
make paper
```

The PDF is committed, so this is needed only after a change to the LaTeX source. The build uses `latexmk` if it is installed and `tectonic` otherwise.

## Trust boundary

What has been checked by machine:

- **Static audit.** The Lean sources of the library contain no `sorry`, no `axiom`, no `native_decide`, no `unsafe`, `partial`, `implemented_by` or `extern` declaration, no `set_option`, and no new syntax, macro, notation or elaborator (`make audit`). The only `sorry` below `AaronsonAmbainis/` are the four open proofs of the comparator challenge, a file that no file of the library imports.
- **Axioms.** For each of the four final theorems, `#print axioms` lists exactly `[propext, Classical.choice, Quot.sound]`. These are standard Lean principles used through Mathlib (`make axioms`).
- **Kernel replay.** `leanchecker` replays every declaration of the project through the Lean kernel, outside the elaborator (`make replay`), and replays everything on which the final theorems depend, Lean core and Mathlib included, from an empty environment (`make replay-fresh`).
- **A second kernel.** The same two replays were made with [lean4lean](https://github.com/digama0/lean4lean), an independent implementation of the Lean type checker.
- **A control.** A small project in which a false statement is added with the kernel switched off is accepted by `lake build`, and `#print axioms` reports no axiom for it. Both checkers reject it. This is why the replays, and not only the build and the axiom report, are part of the verification.
- **Comparator.** [Comparator](https://github.com/leanprover/comparator) compares the four final theorems with a challenge file that imports nothing but `Conjecture.lean`, checks their axioms, and has their proofs replayed by nanoda, a type checker written in Rust, and by a Lean kernel. A sandboxed run on a machine hosted by GitHub accepted the four theorems, and on a second machine comparator accepted one small correct solution and rejected four deliberately wrong ones, each at the intended check. The setup is described in [`comparator/README.md`](comparator/README.md) and the run is recorded in [`verification/comparator/README.md`](verification/comparator/README.md).

The recorded runs, with tool versions and source digests, are in [`notes/VERIFICATION.md`](notes/VERIFICATION.md).

What these checks do not cover:

- **The statement.** That `PrintedConjecture` says what the conjecture says is for a reader to confirm. The definition uses only Mathlib notions (`MvPolynomial`, `totalDegree`, `eval`, finite sums); [`problem_statement.md`](problem_statement.md) gives the printed conjecture next to it.
- **The paper.** The paper is written for human readers and is not itself machine-checked. [`notes/PAPER_TO_LEAN.md`](notes/PAPER_TO_LEAN.md) records which Lean declaration corresponds to each statement of the paper, and where the Lean proof takes another route. Sections 1.3, 1.4, 1.5 and 9 of the paper (consequences, earlier work, the overview of the proof, remarks and open questions), the examples and a few further passages have no formal counterpart; they are listed in that file, in the section "Statements of the paper with no Lean counterpart".
- **The foundations.** Lean's kernel and compiler, the definitions of Mathlib, and the machines on which the checks ran are trusted.

## Citation

```bibtex
@misc{turturean2026aaronsonambainis,
  author       = {Turturean, David},
  title        = {A proof of the {Aaronson--Ambainis} conjecture},
  year         = {2026},
  note         = {Preprint, with a Lean 4 formalization},
  howpublished = {\url{https://github.com/physical-superintelligence/aaronson-ambainis}}
}
```

Citation metadata is also in [`CITATION.cff`](CITATION.cff).

## License and disclosure

The Lean code, the scripts and the documentation are released under the [Apache License 2.0](LICENSE). The paper is copyright of its author. See [`NOTICE`](NOTICE) for attributions.

The mathematical statements, the first draft of the paper and the Lean formalization were produced by AI models, in a research harness developed by David Turturean at PSI. David Turturean reviewed the paper and is responsible for its correctness.
