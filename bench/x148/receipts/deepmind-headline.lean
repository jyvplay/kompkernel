/-
Copyright 2026 Google LLC

All code is licensed under the Apache License, Version 2.0 (the "Apache 2.0"); you may not use this file except in compliance with the Apache 2.0 license. You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
limitations under the License.
-/

module

public import Computational.Specifications.Pqxdh.Security.Headline
public import Computational.Specifications.Pqxdh.Security.Auth.Headline
public import Computational.Specifications.Assumptions.KemCorrect
public import Computational.Specifications.Assumptions.KeyInd1KeyRo
public import Computational.Specifications.Pqxdh.Bound

/-!
# The one-key PQXDH headline statement for a δ-correct KEM

**Trusted: the statement.** This file states `PqxdhCorrectAndSecureδ`, the top-level correctness and
one-key security specification for the PQXDH handshake, used by the CLI security theorem
`CliPqxdhSecurityFor` (`Computational/Specifications/LibsignalCli/StatementPqElf.lean`). See
`Computational/docs/TRUSTED_BASE.md` and `Computational/docs/DEVIATIONS.md` (DEV-PQ21, DEV-C5).

Because Kyber-1024 is only δ-correct rather than perfectly correct, `PqxdhKeyIndReductionBoundδ`
assumes `CryptoWellFormedPrimitivesδ P` and `KemDeltaCorrect P δ` (`KemCorrect.lean`) and adds
`kemDecapsFailureTerm S δ` (`Bound.lean`) to the active-session bound `pqxdhKeyIndBoundActive S b.q_on`.
In the one-key identity model (one Curve25519 scalar per honest principal for both X25519 and
XEdDSA), `PqxdhKeyIndSecureδ` bounds `KeyInd1KeyRoAdvantage` (`KeyInd1KeyRo.lean`) under
`GapSigEufCma`, `KemShCr`, and `GapDhWithSign`, while `PqxdhAuth1KeySecureδ` (`Auth/Headline.lean`)
bounds first-message authentication and privacy additionally under `PrfChainKey`, `PrfMsgKeys`,
`AeadIndCpa`, and `PrfHmac` (DEV-C5).

Following FG24 (Thm. 5.1, Game 2), honest decapsulation of an honest initiator's Kyber ciphertext
under a reusable last-resort Kyber pre-key can fail with probability at most `δ` per `(session,
pre-key)` pair; `kemDecapsFailureTerm S δ` accounts for a union bound over at most `S.N_send_tot`
initiator sessions and `S.N_spk_tot` honest Kyber pre-keys, doubled for `boolBias` advantage.
-/

@[expose] public section

set_option autoImplicit false

namespace SignalPqxdh.Security

open scoped ENNReal
open SignalPqxdh
open _root_.ReductionDsl (Ty CostedReduction TwoStageCostedReduction Mid)
open SignalPqxdh.Costed

/-! ## Advantage bounds -/

/-- Static key-indistinguishability bound `pqxdhKeyIndBound` plus `kemDecapsFailureTerm S δ`. -/
noncomputable def pqxdhKeyIndAdvantageBoundδ (S : Setup) (δ : ℝ≥0∞)
    (epsSig epsKemShCr epsGapDh : ℝ≥0∞) : ℝ≥0∞ :=
  pqxdhKeyIndBound S epsSig epsKemShCr epsGapDh + kemDecapsFailureTerm S δ

/-- Activity-bounded key-indistinguishability bound under a δ-correct KEM for online non-RO query
budget `q_on`. -/
noncomputable def pqxdhKeyIndAdvantageBoundActiveδ (S : Setup) (q_on : Nat) (δ : ℝ≥0∞)
    (epsSig epsKemShCr epsGapDh : ℝ≥0∞) : ℝ≥0∞ :=
  pqxdhKeyIndBoundActive S q_on epsSig epsKemShCr epsGapDh + kemDecapsFailureTerm S δ

/-! ## Security statements -/

/-- Advantage bound for reduction family `R`: for every δ-correct primitive suite `P` satisfying
`CryptoWellFormedPrimitivesδ P` and every `b`-bounded adversary `A`, `KeyInd1KeyRoAdvantage` is at
most `pqxdhKeyIndAdvantageBoundActiveδ` evaluated at `R`'s assumption adversaries. -/
def PqxdhKeyIndReductionBoundδ (S : Setup) (R : KeyIndReductionFamily S) : Prop :=
  ∀ (P : Primitives), CryptoWellFormedPrimitivesδ P →
    ∀ (δ : ℝ≥0∞), KemDeltaCorrect P δ →
    ∀ (b : QueryBudget) (A : BoundedAdv (KeyIndAdversary S) b),
      KeyInd1KeyRoAdvantage S P A.1 ≤
        pqxdhKeyIndAdvantageBoundActiveδ S b.q_on δ
          (GapSigEufCma P P.isValidDhTriple (R.sig b A))
          (KemShCr P (R.shcr b A))
          (GapDhWithSign P P.isValidDhTriple P.pow8 (R.gdh b A))

/-- One-key random-oracle key indistinguishability at setup `S` under a δ-correct KEM: existence of
a `ReductionDsl` family meeting the syntactic cost/block bounds, semantic query bounds, and
`PqxdhKeyIndReductionBoundδ` (each query-bounded adversary `A` is invoked once without rewinding). -/
def PqxdhKeyIndSecureδ (S : Setup) : Prop :=
  ∃ R : KeyIndCostedReductionFamily S,
    KeyIndCostedReductionBounds S R ∧
    KeyIndReductionQueryBounds S R.eval ∧
    PqxdhKeyIndReductionBoundδ S R.eval

/-- Combined one-key PQXDH security at setup `S`: random-oracle key indistinguishability and
first-message authentication and privacy (`Auth/Headline.lean`). -/
def PqxdhSecureδ (S : Setup) : Prop :=
  PqxdhKeyIndSecureδ S ∧ PqxdhAuth1KeySecureδ S

/-- Top-level PQXDH correctness and one-key computational security under a δ-correct KEM
(`PqxdhCorrect` takes the decapsulation output as an explicit hypothesis and needs no KEM
correctness assumption). -/
def PqxdhCorrectAndSecureδ : Prop :=
  ∀ (P : Primitives) (S : Setup),
    (WellFormedPrimitivesδ P → PqxdhCorrect P) ∧
    PqxdhSecureδ S

end SignalPqxdh.Security
