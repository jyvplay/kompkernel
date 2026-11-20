[![](logo.svg)](https://axiommath.ai/)

# The Mordell Conjecture in Lean

A Lean 4 (v4.35.0) formalization of Faltings' theorem, the Mordell conjecture, following the proof of E. Bombieri, *The Mordell conjecture revisited* (Ann. Scuola Norm. Sup. Pisa Cl. Sci. (4) 17 (1990), 615–640), of P. Vojta's theorem (*Siegel's theorem in the compact case*, Ann. of Math. 133 (1991), 509–548), built on [Mathlib](https://github.com/leanprover-community/mathlib4) and on [the Stacks Project in Lean](https://github.com/AxiomMath/Stacks). Lean's kernel checks every proof. There is no `sorry`, no `native_decide` and no added axiom.

## The Mordell conjecture

Let `k` be a number field and `C` a smooth projective geometrically integral curve over `k` of genus `g = dim_k H¹(C, 𝒪_C) ≥ 2`. Then the set `C(k)` of `k`-rational points of `C` is finite.

```lean
theorem Faltings.finite_setOf_comp_eq_id_of_two_le_genus (k : Type u) [Field k] [NumberField k]
    {C : Scheme.{u}} (f : C ⟶ Spec (.of k)) [IsCurve k f] [IsProjectiveVariety k f]
    [Smooth f] [GeometricallyIntegral f] (hg : 2 ≤ genus f) :
    {σ : Spec (.of k) ⟶ C | σ ≫ f = 𝟙 _}.Finite
```

([Mordell/MordellConjecture/Curve.lean](Mordell/MordellConjecture/Curve.lean).) Equivalently, in the language of function fields of one variable (H. Stichtenoth, *Algebraic Function Fields and Codes*): if `F/K` is a function field of genus at least two over a number field `K`, then `F/K` has only finitely many places of degree one, that is, places `v` whose residue field `κ(v)` is one-dimensional over `K`:

```lean
theorem Faltings.finite_setOf_place_isDegreeOne {K F : Type*} [Field K] [NumberField K] [Field F]
    [Algebra K F] [Algebra (RatFunc K) F] [IsScalarTower K (RatFunc K) F] [FunctionField K F]
    (h : 2 ≤ genus K F) :
    {v : Place K F | v.IsDegreeOne}.Finite
```

([Mordell/MordellConjecture/FunctionField.lean](Mordell/MordellConjecture/FunctionField.lean).) The genus is `dim_K 𝒜_F / (𝒜_F(0) + F)`, computed from the adeles of `F/K` (`Faltings.genus`), and it agrees with the genus of the smooth projective model of `F/K`.

The proof follows Bombieri. The Mordell–Weil theorem (`Faltings.group_fg_of_numberField`) makes `J(k)` a finitely generated group for the Jacobian `J` of `C`, and the Néron–Tate height turns `J(k) ⊗ ℝ` into a Euclidean space. Vojta's inequality, in Bombieri's form (Theorems 1 and 2 of the paper, [Mordell/BombieriVojta/Conclusion/](Mordell/BombieriVojta/Conclusion/)), shows that two points of `C(k)` of large norm and very different norms cannot be close in angle; so each cone of small angle contains only finitely many points of `C(k)` of large norm, while Northcott's theorem bounds the points of small norm.

### All in one statement, with Mathlib only

The statement of the LeanEval problem [`faltings`](https://lean-lang.org/eval/problems/faltings/) (from [lean-eval](https://github.com/leanprover/lean-eval)), which defines places, adeles and the genus of a function field of one variable from Mathlib alone, is proved verbatim, with its definitions, as `LeanEval.AlgebraicGeometry.Faltings.faltings` in [Mordell/LeanEval/Faltings.lean](Mordell/LeanEval/Faltings.lean):

```lean
theorem faltings [NumberField K] [BundledFunctionField K F] (h : 2 ≤ genus K F) :
    {v : Place K F | Module.rank K (IsLocalRing.ResidueField v) = 1}.Finite
```

The same file proves the problem's second statement, that an element of a function field has only finitely many poles, as `LeanEval.AlgebraicGeometry.Faltings.finite_setOf_place_notMem`. The problem's places are the library's places, its adele ring is the library's up to reindexing, and its genus is `Faltings.genus` (`Faltings.LeanEval.genus_eq`).

## Structure

`import Mordell` brings in the whole library, [Mordell](Mordell/), about 430 modules written by AI agents. Every proof is kernel-checked; the code has not yet been reviewed by humans.

A declaration that formalizes an item of Bombieri's paper or of the background it uses carries the attribute `@[faltings "label"]` (defined in [Mordell/Attr.lean](Mordell/Attr.lean)), where the label names the item, for example `thm_main` for the theorem above.

The library uses the Stacks Project in Lean for schemes, curves, Picard groups, cohomology and abelian varieties, and builds on it heights on projective space, the Mordell–Weil theorem, Jacobians and the theta divisor, the Néron–Tate pairing, and Bombieri's estimates (`Mordell/BombieriVojta/`).

## Axioms

Proofs use only the standard axioms `propext`, `Classical.choice` and `Quot.sound`. After `import Mordell`, `#print axioms` on any declaration lists exactly what it rests on, for example

```lean
#print axioms LeanEval.AlgebraicGeometry.Faltings.faltings
-- 'LeanEval.AlgebraicGeometry.Faltings.faltings' depends on axioms: [propext, Classical.choice, Quot.sound]
```

## Building

```
lake exe cache get
lake build
```

`lake exe cache get` downloads Mathlib's compiled files. The Stacks Project modules this library uses are compiled locally, so the first build takes a long time and a lot of memory.

## License

[Apache 2.0](LICENSE).
