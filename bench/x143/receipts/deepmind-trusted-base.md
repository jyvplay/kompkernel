# The trusted base of the `libsignal-cli` CLI theorems

Lean's kernel checks every proof in this repository. To trust a theorem, you read its
**statement** and the **definitions** the statement uses, and you trust the shared foundations and
tools. You never need to read a proof. This file says exactly what that means, with numbers. Start
with [`README.md`](README.md) if you have not read it.

The Main Theorem (`Main`) is `CryptoVerification.LibsignalCli.libsignal_cli_pq_secure_elf_binary`
([`Computational/Theorems/Main.lean`](../Theorems/Main.lean), statement `CliPqxdhBinaryCorrectAndSecure cliElfBytes` in
[`Computational/Specifications/LibsignalCli/StatementPqElf.lean`](../Specifications/LibsignalCli/StatementPqElf.lean)),
proved from the four modular lemmas `L1`–`L4` and the unconditional no-OOM proof `cliElf_noOOM_elf` (discharged via `ElfNoOomPlacedInstK.cliElf_noOOM_of_parseK` on `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`, 0 premises) via `main_of_lemmas` (§1, "Main from lemmas"):
the correctness and security of the `libsignal-cli` CLI's ELF on PQXDH directories with SPQR:
correctness directly at the closed FIPS / RFC / ML-KEM primitive bundle `realPEParams` (`realCrypto`, `realPqxdhPrims`: `CryptoVerification.LibsignalSpqrV1.sha256Compress`, `CryptoGames.AES256.aes256Enc`, `CryptoGames.AES256.aes256Dec`, `CryptoGames.RFC7748.x25519Ref`, `CryptoGames.RFC7748.x25519PubFromSecretRef`, `CryptoGames.SHA512.sha512CompressState`, `CryptoGames.MLKEM.kyber1024EncapsVec`, `CryptoGames.MLKEM.kyber1024DecapsVec`, and `CryptoGames.MLKEM.mlkem768Incremental`) executed directly from the parsed ELF image (`cliRunElf` starting from plain `ElfImage.loadState` with no initial memory patches, resolving panic and `SampleNTT` addresses from the ELF `.symtab` without library placement), up to `.OutOfMemory` (`CliReachesOOMElf`, DEV-CLI15) or `SampleNTT` seed divergence (`CliReachesSampleNttStuckElf`, DEV-CLI22); security
with no `.OutOfMemory` premise (for `cliElfBytes`, no PQXDH-mode run reaches `.OutOfMemory` on the
modelled 1 GiB machine) and `exc? := some (CliReachesSampleNttStuckElf elf addrs)` adding an unbounded `2 · CliPqxdhFlagProb` `SampleNTT` seed-divergence term (probability `0` under an idealized random XOF, but not bounded in Lean; DEV-CLI22). Lemma 4 (`L4`) is
`CryptoVerification.SignalSession.libsignal_cli_pq_binary_correct`
([`Computational/Theorems/Main.lean`](../Theorems/Main.lean), statement `CliPqxdhBinaryCorrect cliElfBytes` in
[`LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean`](../../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)). Both ELF computational headlines (`Main`, `L4`), together with the two ELF-direct symbolic headlines (`comp_refines_cli`, `signal_session_secure`), are in the
non-default Lake library `CliElfLib` (§7); the headlines of the default library are Lemma 1 (`L1`)
`SignalPqxdh.Security.headlineδ` ([`Computational/Theorems/Lemmas.lean`](../Theorems/Lemmas.lean), statement `PqxdhCorrectAndSecureδ` in
[`Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean`](../Specifications/Pqxdh/Security/HeadlineDelta.lean)), Lemma 2 (`L2`)
`CryptoVerification.E2E.session_secure` ([`Computational/Theorems/Lemmas.lean`](../Theorems/Lemmas.lean), statement
`SessionSecure` in [`Computational/Specifications/Session/StatementSession.lean`](../Specifications/Session/StatementSession.lean)), Lemma 3
(`L3`) `CryptoVerification.E2E.model_secure_costed`
([`Computational/Theorems/Lemmas.lean`](../Theorems/Lemmas.lean), statement `ModelSecure` in
[`Computational/Specifications/Composition/StatementModel.lean`](../Specifications/Composition/StatementModel.lean)), and
`CryptoVerification.E2E.kyber1024_kem_delta_correct` (`KyberDelta`;
[`Computational/Theorems/Lemmas.lean`](../Theorems/Lemmas.lean), statement `Kyber1024KemDeltaCorrect` in
[`Computational/Specifications/LibsignalCli/Kyber1024Delta.lean`](../Specifications/LibsignalCli/Kyber1024Delta.lean)).
The object-level placement witness (`ElfPlaced.cliElf_linkedIn`), object-level label proof (`CliLabelsFromObjects` in `LibsignalBinary/Proofs/Placed/CliLabels.lean`), and the kernel-checked `.symtab`-vs-placement cross-check (`ElfDirectBridge.cliElf_symtab_agrees_with_placement`) remain built as untrusted proofs outside the headline set (§5).

The model-run theorem `CryptoVerification.E2E.libsignalCliPqSecure_holds`
([`Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean`](../Proofs/LibsignalCli/HeadlinePqCliClosed.lean), statement `LibsignalCliPqSecure` in
[`Computational/Proofs/LibsignalCli/StatementPqSecure.lean`](../Proofs/LibsignalCli/StatementPqSecure.lean)) states the security of the
`libsignal-cli` CLI on PQXDH directories with SPQR for any implementation `run` that meets the CLI's
functional spec `CliSpecPqxdh`. §1 gives its single-theorem breakdown alongside the closure table of the
headlines, and §7 lists all computational and symbolic headlines with their closures.

The theorems in `Computational/Theorems/` hold only the paper's computational results, in two files:
- [`Lemmas.lean`](../Theorems/Lemmas.lean) (default library): `SignalPqxdh.Security.headlineδ` (`L1`: model-level
  PQXDH security under a `δ_kem`-correct KEM), `CryptoVerification.E2E.session_secure` (`L2`: Double
  Ratchet + SPQR V1 single-session security over context mixtures),
  `CryptoVerification.E2E.model_secure_costed` (`L3`: multi-session model
  composition with costed reductions at the one-key standard-model handshake
  `pqxdhKeyIndImpl1KeyReal`), and `CryptoVerification.E2E.kyber1024_kem_delta_correct` (`KyberDelta`:
  concrete Round-3 CRYSTALS-Kyber-1024 `(1568B, 3168B)` key-generation length validity and
  `δ_kem = ε + 1 / 2 ^ 112` decapsulation-failure bound under `KyberNoiseGap ε`, DEV-PQ21).
- [`Main.lean`](../Theorems/Main.lean) (the CLI binary built from source, `CliElfLib`): `L4`
  `libsignal_cli_pq_binary_correct` and the Main Theorem `libsignal_cli_pq_secure_elf_binary` (§7).

The first-message round-trip theorems are in
[`Computational/Tests/NonVacuity/FirstMessageRoundtrip.lean`](../Tests/NonVacuity/FirstMessageRoundtrip.lean).
Each theorem of `Computational/Theorems/` states a proposition from
`Computational/Specifications/` (for the CLI, also `LibsignalBinary/Specifications/SignalSession/`)
and is proved by the theorem with the same name and the suffix `_proof` in `Computational/Proofs/`;
the theorem files are Tier 1. [`Computational/scripts/check_computational_deps.py`](../scripts/check_computational_deps.py) (rule 3) checks that a theorem file
declares nothing else, and [`scripts/TrustedClosure.lean`](../../scripts/TrustedClosure.lean) (rule 5, run via [`scripts/trusted-closure.sh`](../../scripts/trusted-closure.sh)) enforces that no headline's
trusted closure unfolds a definition from a proof file and reports each headline's kernel axioms (`## Axioms` in `trusted_closure.md`) for inspection. Running `./scripts/trusted-closure.sh --headlines-file scripts/trust_banner_headlines.txt` after `lake build CliElfLib` audits all 6 promoted theorems of `Computational/Theorems/` and 2 of the 5 ELF-direct headlines of `Symbolic/Theorems/` (`comp_refines_cli` and `signal_session_secure`; 8 headlines total in [`scripts/trust_banner_headlines.txt`](../../scripts/trust_banner_headlines.txt) — the 3 additional real-primitive symbolic headlines `real_prims_admissible`, `comp_refines_cli_real`, and `signal_session_secure_real` share the same trusted files and are listed in §7) and emits the module trust banners of §3 (`trusted_banners.csv`). Independently, [`comparator/run.sh`](../../comparator/run.sh) fail-closed enforces `std3`-only axioms (`propext`, `Classical.choice`, `Quot.sound`) while replaying every headline theorem in a fresh Lean kernel against the challenge statements in [`comparator/`](../../comparator/).

In addition to the CLI theorems, this repository proves:
- the model-level PQXDH computational security headline `SignalPqxdh.Security.PqxdhCorrectAndSecureδ`
  (`Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean`, proving correctness, one-key
  random-oracle `KeyInd` security under a `δ_kem`-correct KEM `KemDeltaCorrect P δ_kem`,
  `CryptoWellFormedPrimitivesδ P`, `GapSigEufCma`, `KemShCr`, and `GapDhWithSign`, and one-key
  first-message `Auth` security (`PqxdhAuth1KeySecureδ`, DEV-C5) under
  `GapSigEufCma`, `KemShCr`, `GapDhWithSign`, `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`, and `PrfHmac`, in
  `Computational/Proofs/SignalPqxdh/Delta/Statements.lean`), together with
  standalone untrusted proofs of two-key `KeyInd` and `Auth`/`FirstMsg` in
  `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`
  and SHA-512 random-oracle reductions for `GapDhWithSign` and `GapSigEufCma` in
  `Computational/Proofs/SignalPqxdh/XeddsaRom/`; and
- the single-session Double Ratchet + SPQR V1 theorem `SessionSecure` (`L2`, `StatementSession.lean`)
  and multi-session model composition `ModelSecure` (`L3`, `StatementModel.lean`), using the shared
  SPQR V1 session bound definitions in `Computational/Specifications/Session/StatementComposed.lean`
  (DEV-C5, DEV-C8–DEV-C13, DEV-KFF1). Unpartnered first-message payload privacy and authentication
  are covered by Lemma 1's one-key `Auth` conjunct (`PqxdhAuth1KeySecureδ`) and are not folded into
  the composed or CLI headlines (`DEV-C5`).

Abbreviations: ACD19 = Alwen, Coretti, Dodis, "The Double Ratchet" (ePrint 2018/1037, version
2020-02-21); SM = secure messaging; CKA = continuous key agreement; FS-AEAD = forward-secure
authenticated encryption with associated data; PRF-PRNG = the root key derivation function of
ACD19 §4.3; OT-CCA = one-time chosen-ciphertext security (ACD19 Def. 2); T = the statement files;
std3 = the axioms `propext`, `Classical.choice`, `Quot.sound`.

## 1. The three tiers, with numbers

All numbers in this document are computed from the compiled `.olean` artifacts on the current
repository (`arm64-semantics` `v0.56.1`, commit `b62b68b0`) by
[`scripts/trusted-closure.sh`](../../scripts/trusted-closure.sh). The first rows below are for the
model-run theorem `libsignalCliPqSecure_holds` (`LibsignalCliPqSecure`, with clause 2 at the
one-key PQXDH bound; §7); the rows marked "All 4" are the union over the 4 theorems of the default
library (`L1`, `L2`, `L3`, and `KyberDelta` in `Computational/Theorems/Lemmas.lean`).

| Tier | What | Files | Constants | Code lines | Lines (with docs) | Do you read it? |
|---|---|---:|---:|---:|---:|---|
| 1 | The statement files (T) that `libsignalCliPqSecure_holds` uses, read in full | 19 | 923 | 3,431 | 5,950 | Yes |
| 1 | The file that declares it, `Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean`, read in full | 1 | | 27 | 53 | Yes |
| 2 | Definitions from this repository that T uses | 74 | 3,710 | 9,510 | 11,740 | Yes, the definitions only |
| 1 | All 4: the statement files (`defaultStatementFiles`), read in full | 27 | 1,054 | 4,902 | 8,174 | Yes, to trust all of them |
| 1 | All 4: the theorem file of the default library (`Lemmas.lean`), read in full | 1 | | 26 | 93 | Yes, to trust all of them |
| 2 | All 4: definitions from this repository that T uses | 79 | 3,813 | 10,106 | 12,486 | Yes, to trust all of them |
| 3 | `arm64-semantics`: machine state, relocations, process loader and types, plus `VerifiedLibraries/Common/Spec/Curve25519.lean` | 5 | 111 | 217 | 441 | No: shared engine |
| 3 | Foundations: Lean core 6,017, Mathlib 3,340, VCVio 438, others 108 | 268 | 2,421 | 4,419 | 9,903 | No: shared libraries |
| 3 | Axioms: std3 | | 3 | | | No: standard |
| — | Everything else in the 1,561 repository files outside T in the import closure of `HeadlinePqCliClosed.lean`: proofs, and the parts of Tier 2 files outside the closure | 1,561 | | | 1,383,725 | No: Lean checks them |

**The headlines.** One `--headlines-file scripts/trust_banner_headlines.txt` run of
`scripts/trusted-closure.sh` over the 8 theorems of
[`scripts/trust_banner_headlines.txt`](../../scripts/trust_banner_headlines.txt) (the 6 promoted theorems of
`Computational/Theorems/` and 2 of the 5 ELF-direct headlines of `Symbolic/Theorems/`, `comp_refines_cli` and `signal_session_secure`; the 3 real-primitive headlines `real_prims_admissible`, `comp_refines_cli_real`, and `signal_session_secure_real` share the same trusted files and are listed in §7), after `lake build CliElfLib`. The columns are the Main
Theorem (`Main`) `libsignal_cli_pq_secure_elf_binary`, Lemma 1 (`L1`) `headlineδ`, Lemma 2
(`L2`) `session_secure`, Lemma 3 (`L3`) `model_secure_costed`, Kyber-1024 $\delta_{\mathrm{kem}}$
(`KyberDelta`) `kyber1024_kem_delta_correct`, Lemma 4 (`L4`)
`libsignal_cli_pq_binary_correct`, the ELF-direct `Symbolic/Theorems/` headlines `comp_refines_cli` (`SymRefines`) and
`signal_session_secure` (`SymSecure`), and their union across all 8.
T is the 27 statement files of `defaultStatementFiles` (§2). The files whose definitions the
headlines use only in part (`StatementIdsModel.lean`, `SmDir.lean`, `PqxdhSessionModel.lean`,
`EffSalt.lean`, `SchemeModel.lean`, `KeyInd1KeyReal.lean`) are Tier 2 (`UniformStart.lean` lives in `Computational/Proofs/SpecLemmas/Session/UniformStart.lean`), and
`SmScheme.lean`, `PqStatement.lean`, `StatementPqSecure.lean`, `StatementPqElfAnyKem.lean`, `CliLabels.lean`, and
`SessionCliGuards.lean`, which no promoted headline of `scripts/trust_banner_headlines.txt` uses, are not in T. The
T rows count the part of T in each closure; you still read all 27 T files in full (8,174 lines, 4,902 code lines).

| Tier | What | Main | `L1` (`headlineδ`) | `L2` (`session_secure`) | `L3` (`model_secure_costed`) | `KyberDelta` | `L4` (`binary_correct`) | `SymRefines` | `SymSecure` | Union |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|  | Constants in the closure (reached) | 10,210 | 5,394 | 6,890 | 6,952 | 3,294 | 5,603 | 9,243 | 9,298 | 14,493 |
| 1 | T in the closure: files / constants | 21 / 962 | 12 / 910 | 9 / 108 | 10 / 470 | 7 / 155 | 10 / 432 | 9 / 409 | 9 / 409 | 27 / 1,389 |
| 1 | T in the closure: code lines / lines with docs | 2,801 / 3,779 | 2,653 / 3,322 | 361 / 475 | 1,245 / 1,671 | 449 / 689 | 1,067 / 1,695 | 977 / 1,549 | 977 / 1,549 | 4,902 / 8,174 (read in full) |
| 1 | Theorem files: code lines / lines | 21 / 112 (`Main.lean`) | 26 / 93 (`Lemmas.lean`) | as `L1` | as `L1` | as `L1` | as Main | 20 / 83 (`Refinement.lean`) | 19 / 85 (`Security.lean`) | 86 / 373 (4 files) |
| 2 | Repository definitions: files / constants | 81 / 3,888 | 29 / 1,298 | 64 / 3,317 | 51 / 3,053 | 17 / 199 | 45 / 2,268 | 71 / 4,031 | 74 / 4,084 | 112 / 5,823 |
| 2 | Repository definitions: code lines / lines with docs | 10,302 / 12,698 | 2,530 / 2,999 | 8,100 / 10,019 | 7,102 / 8,572 | 913 / 1,162 | 5,350 / 6,552 | 8,788 / 10,507 | 8,999 / 10,781 | 14,361 / 17,514 (8-headline union) |
| 3a | `arm64-semantics`: files / constants / code lines / lines with docs | 41 / 1,450 / 6,763 / 9,031 | 1 / 2 / 4 / 5 | 0 | 1 / 2 / 4 / 5 | 1 / 49 / 105 / 145 | as Main | as Main | as Main | 41 / 1,450 / 6,763 / 9,031 |
| 3b | Generated (`GeneratedLean.*`): files / constants / code lines / lines with docs | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3c | Foundations: files / constants / code lines / lines with docs | 297 / 2,645 / 5,085 / 11,384 | 243 / 2,216 / 4,075 / 9,159 | 268 / 2,426 / 4,593 / 10,087 | 259 / 2,387 / 4,494 / 9,977 | 215 / 2,018 / 3,573 / 8,171 | 57 / 1,163 / 2,268 / 6,305 | 97 / 2,016 / 4,541 / 9,109 | 97 / 2,018 / 4,562 / 9,130 | 333 / 3,484 / 7,353 / 14,142 (8-headline union) |
| 3 | Axioms | std3 | std3 | std3 | std3 | std3 | std3 | std3 | std3 | std3 |

To trust all 8 promoted headlines in `scripts/trust_banner_headlines.txt` (together with the 3 real-primitive symbolic headlines in `Symbolic/Theorems/{Refinement,Security}.lean`, bringing the ELF-direct symbolic headlines to 5 across the same trusted files) you read **19,349 code lines** (**26,061 lines with docs**) of this
repository: T in full (27 files, 4,902 code lines, 8,174 lines with docs), the 4 theorem files
(86 code lines, 373 lines), and Tier 2 (112 files, 5,823 unfolded definitions, 14,361 code lines,
17,514 lines with docs). Tier 2 includes `instDecidableEligibleForSessionPromotion` and its
canonical protobuf decoder in `Symbolic/Specifications/Concrete/SessionRecordDecidable.lean` plus
`instDecidablePreKeyNoMatch` in `Symbolic/Specifications/Refinement/Statement.lean`, because
`TrustedClosure` unfolds instance bodies; those never need reading because a `Decidable p` instance
is correct by its type. In the default library (`L1`, `L2`, `L3`, and `KyberDelta`) the union has
27 T files (1,054 unfolded definitions in closure), 1 theorem file (`Lemmas.lean`, 26 code lines,
93 lines), and 79 Tier-2 files (3,813 definitions, 10,106 code lines, 12,486 lines with docs), with
1 engine file (`VerifiedLibraries/Common/Spec/Curve25519.lean`, 49 constants, 105 code lines / 145
lines) and 0 generated files.

The generated tier (`3b`) is **empty (0 files, 0 constants, 0 lines)** across all 8 banner headlines (and
across the module-level import closure of the 27 statement files). The ELF-run headlines (`Main` and `L4`
of `Main.lean`, and 4 of the 5 `CliElfLib` headlines of `Symbolic/Theorems/`: `SymRefines`, `SymSecure`, `comp_refines_cli_real`, and `signal_session_secure_real`) state the run directly on
`cliElfBytes` (Tier 1, `LibsignalBinary/Specifications/SignalSession/CliElf.lean`, `file_bytes%` with
SHA-256 pin `f35c326d…`): instructions execute from plain loaded ELF memory (`ElfImage.loadState`
with zero initial memory patches, running `aes` and SPQR CPU-feature probes against `AT_HWCAP = 0x1b`),
and the 23 function addresses (18 Rust panic entry points and 5 `SampleNTT` entry points) are
resolved by name from the ELF's `.symtab` via engine `Arm64.Trusted.Process.Overrides` and
`resolveCliElfAddrs` in `CliBinaryPq.lean` (§5); the fifth `Symbolic/Theorems/` headline, `real_prims_admissible`, proves `RealPrimsAdmissible` directly and does not mention the run. All `GeneratedLean.*` modules — `LibsignalSessionPlacedObj` +
`Shard0..31`, `LibsignalSessionExtractedObj`, and `SignalSessionIoPlacedObj` — live strictly on the
import path of proofs (where the bridge `ElfDirectBridge` and untrusted `CliLabelsFromObjects`
cross-check the ELF's `.symtab` against the extracted objects and unique placement).

### Main from lemmas

The Main Theorem (`libsignal_cli_pq_secure_elf_binary` in
`Computational/Theorems/Main.lean`, proof `libsignal_cli_pq_secure_elf_binary_proof`
in `Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean`) is derived from the KEM-generic
intermediate theorem `libsignal_cli_pq_secure_elf_binary_any_kem` (`main_of_lemmas` in
[`Computational/Proofs/LibsignalCli/MainOfLemmas.lean`](../Proofs/LibsignalCli/MainOfLemmas.lean),
applied to the four modular headline statements `L1`–`L4` as black boxes plus the no-OOM premise
`hNoOOM`) combined with `kyber1024_kem_delta_correct` (`Computational/Theorems/Lemmas.lean`,
DEV-PQ21):

```text
main_of_lemmas :
  SignalPqxdh.Security.PqxdhCorrectAndSecureδ →
  (∀ {Pt} [DecidableEq Pt] [Zero Pt] [SampleableType Pt] (ℓ : ℕ), SessionSecure (Pt := Pt) ℓ) →
  (∀ {Pt} (S : SignalPqxdh.Setup) (ℓ : ℕ), ModelSecure (Pt := Pt) S ℓ) →
  CliPqxdhBinaryCorrect bytes →
  (∀ (elf : ElfImage) (addrs : CliElfAddrs),
    ElfImage.parse bytes = .ok elf →
    resolveCliElfAddrs bytes elf = .ok addrs →
    ∀ (i : Inputs), CliPqxdhInputs realPEParams i →
      ¬ CliReachesOOMElf elf addrs i) →
  (∀ {Pt} [DecidableEq Pt] [Zero Pt] [SampleableType Pt] (S : SignalPqxdh.Setup) (ℓ : ℕ),
    CliHaltedBoundProp (Pt := Pt) S ℓ) →
  CliPqxdhBinaryCorrectAndSecureAnyKem bytes
```

`libsignal_cli_pq_secure_elf_binary_any_kem_proof` applies `main_of_lemmas` to `headlineδ_proof` (`L1`),
`session_secure_proof` (`L2`), `model_secure_costed_proof` (`L3`),
`libsignal_cli_pq_binary_correct_proof` (`L4`), and `cliElf_noOOM_elf` (`hNoOOM`;
discharged in `ElfHeadlinePq.lean` from `ElfNoOomPlacedInstK.cliElf_noOOM_of_parseK` on `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed` through `ElfDirectBridge.cliReachesOOMElf_iff`), and `libsignal_cli_pq_secure_elf_binary_proof` instantiates it at `kyber1024KemKeyGen` using `kyber1024_kem_delta_correct_proof`. Inside `MainOfLemmas.lean`, the assembly uses
only the CLI-to-model adapter coupling and the atomic costed adapter program (`CliPqAdapterCoupling.lean`,
`CliPqKeyIndStep.lean`, `CliPqStartStep.lean`, `CliPqAdapterSmStep.lean`, `Computational/Proofs/E2E/Dsl/AtomicLift.lean`),
depending on `std3` alone (`L3` is unconditional at `ki := pqxdhKeyIndImpl1KeyReal S P`).

### Reproducing the trusted base and per-theorem axioms

[`scripts/TrustedClosure.lean`](../../scripts/TrustedClosure.lean) starts from the *type* of each
headline theorem. It collects, transitively, every constant reachable through the types and bodies
of definitions, abbreviations, instances, inductive types, and structures. It does not unfold
proofs: a theorem met inside a definition is listed by name and type only, because its proof body
does not change what the statement means. "Code lines" exclude blank lines and comments; "Lines
(with docs)" are the union of the source ranges of the unfolded constants, doc comments included
(for Tier 1, the full length of the T files; a theorem file declares theorems only, so no constant
of it is unfolded). The `Arm64.*` modules come from two Lake packages in `arm64-semantics`
(`Arm64.Trusted.*` from the nested `arm64` package, `Arm64.Testing.*` from `Arm64/Testing`), so
[`scripts/trusted-closure.sh`](../../scripts/trusted-closure.sh) merges both `.olean` directories on
`LEAN_PATH` before running `scripts/TrustedClosure.lean`.

After installing the prerequisites in [`README.md`](../../README.md), build the default library and
`CliElfLib`, then run `scripts/trusted-closure.sh`:

```bash
# 1. Build the default library and the SHA-256-pinned stock `ld.lld` CLI ELF library (`CliElfLib`):
lake exe cache get
ulimit -S -s 524288
export LAKE_RESTORE_ARTIFACTS=true
export LEAN_NUM_THREADS=8   # ~1 worker per 4 GiB of free RAM
lake build
./scripts/cli-elf-stock --stdbin --build
./scripts/cli-elf-stock --stdbin --verify-pin --lean-mod LibsignalBinary/Specifications/SignalSession/CliElf.lean
lake build CliElfLib

# 2. Default computational lemmas (`L1`, `L2`, `L3`, and `KyberDelta` in `Computational/Theorems/Lemmas.lean`):
./scripts/trusted-closure.sh --out-dir /tmp/closure-default

# 3. All 8 computational and ELF-direct symbolic binary headlines (`scripts/trust_banner_headlines.txt`):
./scripts/trusted-closure.sh --headlines-file scripts/trust_banner_headlines.txt --out-dir /tmp/closure-banners

# 4. The 14 `symbolicHeadlines` (`Symbolic/Theorems/` and `Symbolic/Tests/ExternWitness.lean`;
#    3 additional real-primitive headlines are listed in §7):
./scripts/trusted-closure.sh --symbolic --out-dir /tmp/closure-symbolic

# 5. Any single theorem (e.g. the model-run theorem `libsignalCliPqSecure_holds`):
./scripts/trusted-closure.sh --out-dir /tmp/closure-model-run \
  --headline libsignal_cli_pq_secure:CryptoVerification.E2E.libsignalCliPqSecure_holds:Computational.Proofs.LibsignalCli.HeadlinePqCliClosed
```

Each run exits `1` if Rule 5 is violated (any definition from a proof tree unfolded in a headline's
statement closure) and writes three artifacts in `--out-dir`:
- `trusted_closure.md`: per-tier file, constant, code-line, and line-with-docs summary tables, plus
  the exact kernel axioms (`propext`, `Classical.choice`, `Quot.sound`) of every requested headline;
- `trusted_closure.csv`: one row per reached constant (`name`, `kind`, `unfolded`, `tier`, `file`,
  `start_line`, `end_line`, `code_lines`, and `headlines` listing which theorems reach it); and
- `trusted_banners.csv`: per-module banner classification (`B1`–`B4`), definition/theorem counts,
  and the exact `trusted_names` and `untrusted_definitions` lists (§3).

To independently replay the headline proofs from scratch in a fresh Lean kernel and check that
their statements match the challenge specifications up to syntactic identity with only `std3`
axioms, run [`comparator/run.sh`](../../comparator/run.sh) (see [`README.md`](../../README.md),
"Verify Headline Theorems with Comparator").

**Single-theorem summary (`libsignalCliPqSecure_holds`).** Across all tiers the closure of
`libsignalCliPqSecure_holds` has 366 files, 7,165 constants unfolded (of 8,268 reached), 16,774 code
lines, and 25,688 trusted lines with docs. You read the 19 T files in full: 5,950 lines (3,431 code lines), of which 3,604 lines (2,628 code
lines) belong to declarations the statement uses, plus `HeadlinePqCliClosed.lean` (53 lines, 27 code lines).
Together with Tier 2 (11,740 lines / 9,510 code lines across 74 files), you read **12,968 code
lines** (**17,743 lines with docs**) of this repository; to trust all 4 default-library theorems, **15,034 code
lines** (**20,753 lines with docs**). Lean checks the remaining **1,383,725 lines** of the 1,561
repository files outside T in `HeadlinePqCliClosed.lean`'s import closure, plus the 92,534 lines of generated
code (37 files: the 33 sharded `LibsignalSessionPlacedObj*` files, 88,566 lines, and 4 engine placed-object
files, 3,968 lines) on that import path, for you.

**Import closure versus trusted closure.** `HeadlinePqCliClosed.lean` imports 25 of the 27 T files.
Even the import closure over-counts what you read: some imported files are mostly specifications
or proofs for other layers (for example `LibsignalBinary/Specifications/LibsignalTripleRatchet.lean`,
729 lines, of which 23 — the interface `SpqrModel`, 6 code lines — are in the union closure of the 3 default theorems).
Quote the trusted closure, not the import closure.

### Structured vs. flat leaf-assumption session bounds

All `ReductionDsl` operator tables and target interfaces are unified in
`AtomicOps.lean` and `TargetCodecs.lean` (via `Ops.sum` bundles over shared `atomicSig ℓ Pt`), with
`simFig8`, `simDeliverForge`, `epoch0Red`, and `uniformStartRed` carried as
cost-checked `CostedReduction` fields of `SessionCostedReductions` (`StatementComposed.lean`), so
zero uncosted distinguishers appear in `Computational/Specifications/`. `Main`'s concrete per-session bound
(`bhPrefixFullBoundMixV1With`, `refuseCorrB0`, `hiddenSaltMixtureBound`, plus `2 * CliKemFailProb`) preserves the modular multi-hop `L2`/`L3` mixture structure rather than collapsing into a single flat existential
leaf-assumption sum (`Σ c_i * ε_i(R_i)` plus statistical terms and the top-level `MlKem.KemFailBad` term `2 * sessionKemFailProb` / `2 * CliKemFailProb`):
- `ReductionDsl` does not yet include a sequential `CostedReduction` composition combinator in
  `Computational/Proofs/` to collapse `L_bh`, `R_e2e`, and the `SessionCostedReductions` hops into
  single-stage leaf adversaries directly in `Main`'s statement (three leaf challenger interfaces,
  `aes256PrfIface`, `hmacPrfIface`, and `leafSigAndDdhIface`, are defined in `TargetCodecs.lean`
  for future leaf-level composition and remain outside the headline closures).
- Removing `refuseCorrB0` and the `∫⁻ ... ∂𝒟[oa]` mixture structure from `Main`'s statement would
  require lifting the session reduction composition into `MainOfLemmas.lean` while keeping `L2`
  (`SessionSecure`) as the modular intermediate statement.

## 2. Tier 1: the statement files (T)

Read them in this order.

In this section `libsignalCliPqSecure_holds` is the model-run theorem in `HeadlinePqCliClosed.lean`
(statement `LibsignalCliPqSecure`, a corollary in `Computational/Proofs/`, §7). `CliPqxdhSecurityFor` and its
optional excused-abort term `withExcusedAbortTerm` live in
`Computational/Specifications/LibsignalCli/StatementPqElf.lean`, which imports
`StatementPqOomGame.lean` for `CliPqxdhFlagProb` and `CliKemFailProb` (§3).

This first table holds the SM-mode statement files that the CLI theorems share with the session
model; the CLI's own specifications and its PQXDH-mode statements are in the last table of this
section. Closure counts are over the 3 theorems of the default library (`L1`, `L2`, `L3`).
`EffSalt.lean` and `SchemeModel.lean` (trusted in
part: `serializedPartyAddresses`, `partyDeviceId`, `partyIdentityKeyBytes`, `partyIdentityKey`, `partyAddressName`) are Tier 2: neither is a T file.

| File | Defines | Code lines (in closure / file) | Lines with docs (in closure / file) |
|---|---|---:|---:|
| `LibsignalBinary/Specifications/LibsignalE2E/SchemeModel.lean` | the parties, `spqrOffSessionParams`, `initKeysE`, `Reach` and the models `sendModelSpqrOff` / `recvModelSpqrOff` | 8 / 55 | 20 / 167 |
| `LibsignalBinary/Specifications/LibsignalE2E/State.lean` | the state, `binStateOf`, `encodeRecord`, `shortCiphertext`, `spqrOffB` | 32 / 67 | 65 / 177 |
| `LibsignalBinary/Specifications/LibsignalE2E/HooksCommon.lean` | `**Checked by Lean.**` (not in T): the proof-side formatting hook helpers (`fmtWriteHook0`, `formatInnerHook0`) and `writeVecHeader` (whole-function AES-CBC hooks `aesEncHook0` / `aesDecHook0` and byte/output helpers `aesInput`, `aesKey`, `aesIv`, `aesEncOut`, `aesDecOut` live in untrusted `LibsignalBinary/Proofs/E2E/AesHooks0.lean`; bump-allocator, `mem*`, whole-function `aesEncHook`/`aesDecHook`, `String::clone`, time, and `extraImagePanicNames` / `isImagePanicSymbol` / `withImagePanics` definitions live in `LibsignalBinary/Proofs/SpecLemmas/SignalSession/HooksCommonLegacy.lean`; ELF-direct CLI panic dispatch uses `cliPanicSymbolsPlaced` / `cliPanicOverrides` in `CliBinaryPq.lean`). No theorem of the default library or `Computational/Theorems/Main.lean` unfolds it under the panic-only `cliProgElf` (`0` external hooks) | 0 / 13 | 0 / 51 |
| `LibsignalBinary/Specifications/CryptoGames/AEAD/EffSalt.lean` | `**Trusted in part.**` (`effectiveHkdfSalt` and `fit32`, which `effectiveHkdfSalt` uses; `effectiveHkdfSalt32` is in no headline's closure): the effective 32-byte HKDF salt (DEV-LS25); imports only Mathlib. `effectiveHkdfSalt` and `fit32` are used by the PQXDH `Auth` specification (`PrfMsgKeys` in `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`, in the closure of Lemma 1) and by `Computational/Proofs/CryptoGames/AEAD/HKDFProofDefs.lean` (`msgKeys_effSalt`) | 4 / 11 | 6 / 44 |

`Computational/Tests/Guards/SessionCliGuards.lean` (last table of this
section) contributes no constant to the statements; it checks `idOfE_ne_cli` (`partyIdentityKey .A ≠ partyIdentityKey .B`, §5; on the ELF-direct headlines, panic and `SampleNTT` addresses are resolved by name from `.symtab` by `resolveCliElfAddrs` in `CliBinaryPq.lean`, cross-checked against the extracted objects and placement in untrusted `ElfDirectBridge.cliElf_symtab_agrees_with_placement` and `CliLabelsFromObjects` in `LibsignalBinary/Proofs/Placed/CliLabels.lean`). The deviations of the CLI statements are listed in
[`DEVIATIONS.md`](DEVIATIONS.md) (`DEV-CLI*`, `DEV-E*`, `DEV-M*`); the text there is
authoritative.

### PQXDH model-level security headline (`SignalPqxdh.Security.PqxdhCorrectAndSecureδ`)

Read them in this order (`Computational/Specifications/{Pqxdh,Assumptions}/` and `Computational/Specifications/Reductions/ReductionDsl/`):

| File | Tier | Defines |
|---|---|---|
| `Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean`, `Computational/Specifications/Assumptions/KemCorrect.lean` | Tier 1 (`HeadlineDelta.lean`: `**Trusted: the statement.**`); `KemCorrect.lean` Tier 2 | `kemHonestExchangeFails`, `KemDeltaCorrect`, `CryptoWellFormedDh`, `CryptoWellFormedKemδ`, `CryptoWellFormedPrimitivesδ` (extending `WellFormedPrimitivesδ` from `Model.lean`), `pqxdhKeyIndAdvantageBoundActiveδ`, `pqxdhKeyIndAdvantageBoundδ`, `PqxdhKeyIndReductionBoundδ`, `PqxdhKeyIndSecureδ` (one-key `HkdfRO` game `pqxdhKeyIndImpl1KeyRo` under `GapSigEufCma`, `KemShCr`, and `GapDhWithSign`, bounded by active-count `pqxdhKeyIndAdvantageBoundActiveδ S b.q_on δ`), `PqxdhSecureδ S := PqxdhKeyIndSecureδ S ∧ PqxdhAuth1KeySecureδ S`, and the closed `δ`-correct KEM headline `SignalPqxdh.Security.PqxdhCorrectAndSecureδ` (correctness and `PqxdhSecureδ`, DEV-C5, DEV-PQ13, DEV-PQ21). Standalone two-key `KeyInd` and `Auth`/`FirstMsg` statements (`Pqxdh2KeyKeyIndSecureδ`, `PqxdhAuthSecureδ`, `Pqxdh2KeySecureδ`, `Pqxdh2KeyCorrectAndSecureδ`) live in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean` outside the trusted base |
| `Computational/Specifications/Pqxdh/Security/Headline.lean` | Tier 1 (`**Trusted: the statement.**`) | `KeyIndReductionFamily`, `KeyIndCostedReductionFamily`, the per-kind cost classifier and counts `keyIndQueryKind` / `keyIndKindCounts`, `KeyIndCostedReductionBounds` (syntactic `totalCost ≤ stepCostBudget S b`, per-kind `CostBoundedByKind keyIndQueryKind (keyIndKindCounts b) (stepCostBudgetSplit S b b.q_ro)`, `GRedBlockBounded`, `.size` bounds, `totalQueries chalIfaceSigQueryWeight ≤ 2 * b.q_total`, `totalQueries chalIfaceDdhQueryWeight ≤ 4 * b.q_total ^ 2 + b.q_total + S.N_dh + S.N_sess_tot`), and `KeyIndReductionQueryBounds` (semantic `IsQueryBoundP` caps `q_sig ≤ 2 * min S.N_spk_tot S.N_recv` on `R.sig` and `R.gdh`, bilinear `q_ddh ≤ gdhQueryBudget S b`, and `q_prim ≤ gdhPrimQueryBudget S b` on `R.sig` and `R.gdh`, `q_prim ≤ primQueryBudget S b` on `R.shcr`), used by `PqxdhCorrectAndSecureδ` and `CliPqxdhSecurityFor`. Standalone two-key reduction bundles (`KeyInd2KeyCostedReductionFamily`, `AuthCostedReductionFamily`) are in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`, the one-key `Auth` bundles are in `Computational/Specifications/Pqxdh/Security/Auth/Headline.lean`, and the `δ_kem = 0` wrappers are in `Computational/Proofs/SpecLemmas/Pqxdh/Security/Headline.lean` |
| `Computational/Specifications/Pqxdh/Security/Auth/Headline.lean` | Tier 1 (`**Trusted: the statement.**`) | the second conjunct of Lemma 1: `PqxdhAuth1KeySecureδ` (one-key first-message `Auth`, DEV-C5) with its bound `pqxdhAuthAdvantageBoundδ` (`pqxdhAuthBound` plus `kemDecapsFailureTerm S δ`), `authGdhQueryBudget`, the per-kind cost classifier and counts `authQueryKind` / `authKindCounts`, the reduction bundles `Auth1KeyReductionFamily`, `Auth1KeyCostedReductionFamily` (over `pqAtomicOps`, `pqAuthSigAndDdhIface`, `pqAuthPrimIface`, `pqPrfMkIface`, `pqPrfHmacIface`, and `authCodec`, with `.eval`), `Auth1KeyCostedReductionBounds` (including the per-kind `*_costByKind` fields `CostBoundedByKind authQueryKind (authKindCounts b) (stepCostBudgetSplit S b (b.q_ro + b.q_roRoot))`), `Auth1KeyReductionQueryBounds`, `PqxdhAuth1KeyReductionBoundδ`, and the primitive-free `FirstMsgPTag` / `AuthPTag` challenger interfaces and `authCodec` (`codecCost = 32`) |
| `Computational/Specifications/Pqxdh/Security/Auth/Game.lean` | Tier 1 (`**Trusted: definitions used by the statement.**`) | the `Auth`/`FirstMsg` game read by `PqxdhAuth1KeySecureδ`: the key-schedule and AEAD assumptions `AeadIndCpa`, `PrfHmac`, `PrfChainKey`, `PrfMsgKeys` (with `prfMsgKeysSpec`, `prfHmacSpec`), the first root-KDF random oracle `evalRootKdfOrRo`, the shared `Auth` oracle body and experiment (`AuthQuery`, `AuthResponse`, `AuthState`, `AuthAdversary`, `authSpec`, `runAuthSend`, `pqxdhAuthImpl`, `pqxdhAuthExpCore`, `pqxdhAuthExp`, `AuthAdvantage`), its query budget (`HasQueryBound (AuthAdversary S)`, with the online-query predicate `isAuthOnlineQuery` bounding `q_on`), the closed-form bound (`rootKdfRoTerm`, `pqxdhAuthBound`), and the one-key game (`pqxdhAuthExpCoreWith`, `pqxdhAuthImpl1Key`, `pqxdhAuth1KeyExp`, `Auth1KeyAdvantage`) |
| `Computational/Specifications/Pqxdh/Bound.lean` | Tier 1 (`**Trusted: the statement.**`) | `pqxdhKeyIndBoundActive` with the active counts `activeIdCount`, `activeSpkCount`, `activeOpkCount`, `activeSendCount`, `activeSendOpkCount`, `activeDhCount`, `pqxdhKeyIndBound` and `kemDecapsFailureTerm` (`pqxdhAuthBound` and `rootKdfRoTerm` for the `Auth` game are in `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`) |
| `Computational/Specifications/Pqxdh/Game.lean` | Tier 1 (`**Trusted: the statement.**`) | the multi-user `KeyInd` oracle implementation `pqxdhKeyIndImpl` and state `KeyIndState`, query budgets (`Setup`, `QueryBudget` with `q_on`, `isKeyIndOnlineQuery`), the game-query selectors `isGameQuery` and `isGameQueryOfKind`, and cleanliness predicates (`keyIndInitCorruptionClause`, `isKeyIndInitStillFresh`, `isKeyIndRespStillFresh`, `allTestedClean`). `evalRootKdfOrRo` and Game 2 (`Auth`) are in `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`; the standalone two-key `pqxdhKeyIndExp` / `KeyIndAdvantage` is in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthGames.lean` |
| `Computational/Specifications/Assumptions/Assumptions.lean` | Tier 1 (`**Trusted: the statement.**`) | the three cryptographic assumptions of Lemma 1: `GapDhWithSign` (single-pair X25519 Gap-DH modulo `pow8` with an XEdDSA signing oracle on the first challenge key, DEV-PQ17), `KemShCr` (Kyber-1024 semi-honest collision resistance), and `GapSigEufCma` (XEdDSA EUF-CMA with the X25519 decisional DH oracle), together with `sigAndDdhSpec`, `primSpec`, `primQueryBudget`, `gdhPrimQueryBudget`, and `gdhQueryBudget`. The key-schedule and AEAD assumptions of Lemma 1's `Auth` conjunct (`AeadIndCpa`, `PrfChainKey`, `PrfMsgKeys`, `PrfHmac`) are in `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`. Standalone two-key assumptions (`GapDH`, `SigEufCma` in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthGames.lean`, and `KemIndCca`, `HkdfRO`, `RootKdfRO`, `AeadIntCtxt`, `AeadMuIntCtxt`, `IkTwoKeyIdealisation`, `CryptoWellFormedPrimitives` in `Computational/Proofs/SpecLemmas/SignalPqxdh/Assumptions.lean`) and SHA-512 random-oracle reductions from `GapDhWithSign` and `GapSigEufCma` to `GapDH` under `XeddsaCurveLaws` (`Computational/Proofs/SignalPqxdh/XeddsaRom/`) are outside the trusted base |
| `LibsignalBinary/Specifications/SignalPqxdh/Model.lean` | Tier 1 (`**Trusted: the statement.**`) | the pure PQXDH handshake and 5-step first-message key schedule (`Primitives`, `WellFormedKemδ`, `WellFormedSpqr`, `WellFormedDh`, `WellFormedSig`, `WellFormedKdf`, `WellFormedAead`, `WellFormedPrimitivesδ`, `initiateKeys`, `acceptKeys`, `initiate`, `accept`, `PqxdhCorrect`; `WellFormedPrimitives` with `kem_corr` is in `LibsignalBinary/Proofs/SpecLemmas/SignalPqxdh/ModelProofDefs.lean`), and the first-message MAC input (`firstMsgAD`, `firstMsgHdrLen`, `aeadMacInput`: prost's field order, DEV-PQ31) |
| `Computational/Specifications/Reductions/ReductionDsl/Core.lean`, `Computational/Specifications/Reductions/ReductionDsl/Samplers.lean` | Tier 2 (`Core.lean`: `**Trusted in part.**`, the input-conditioned size and bounded-fuel definitions `Ty.BaseFits`, `OpsBaseBounded`, `SampBaseBounded`, `Ty.listDepth`, `Ty.NoNestedLists`, `Ty.HasNoTbl`, `Ty.treeBlocks`, `Expr.costWithTbl`, `Comp.costWithTbl`, `GameCodec.FitsOn`, `GameCodec.BaseFitsOn`, `CostedReduction.totalCostBounded`, `TwoStageCostedReduction.run1Bounded`, `runFuelBounded`, `TwoStageCostedReduction.eval1Bounded`, `TwoStageCostedReduction.eval2Bounded`, `TwoStageCostedReduction.totalCostBounded` are in no headline's closure; `Samplers.lean`: `**Trusted in part.**`, `unifSamplers0` is in no headline's closure) | the protocol-agnostic costed reduction DSL (`Sig` with mandatory `sz` and no default `sz = 1`, `Ty`, `Ty.Fits`, `ValFits`, `Ops`, `Ops.opSize`, `OpsSizeHonest`, `Ops.sum`, `bits`, `Expr`, `Samplers`, `SampSizeHonest`, `Iface`, `Comp`, `GameCodec`, `CostedReduction`, `TwoStageCostedReduction`, `.eval`, `.eval1`, `.eval2`, `totalCost`, `totalQueries`, `reductionSizeBudget`, `Expr.size`, `Comp.size`, `CostedReduction.size`, `TwoStageCostedReduction.size`, `AllGameQueriesFit`, `supportWhen`, `Iface.AnswerFits`, the per-query-kind cost `Expr.costAt`, `Comp.pureEval?`, `Comp.costAt`, `ValidKindCosts`, `totalCostByKind`, `CostBoundedByKind` (its query half, `Comp.queriesAt`, `ValidKindQueries`, `totalQueriesByKind`, `QueriesBoundedByKind`, is proof-side in `Computational/Proofs/ReductionDsl/KindedQueries.lean`), `UniformSamplerTag`, `sampleIndex`, `unifSamplers`, `unifSamplers0`), shared across PQXDH, Double Ratchet, E2E composition, and the CLI adapter |
| `Computational/Specifications/Reductions/ReductionDsl/AtomicOps.lean`, `Computational/Specifications/Reductions/ReductionDsl/TargetCodecs.lean`, `Computational/Specifications/Pqxdh/Security/CostedBudgets.lean` | Tier 2 (`AtomicOps.lean` and `CostedBudgets.lean`: `**Trusted: definitions used by the statement.**`; `TargetCodecs.lean`: `**Trusted in part.**`) | the shared 32-byte block signature `pqAtomicSig` (`atomicSig 0 Empty`, `AtomicSort.blocks`), pure operator table `pqAtomicOps` (`atomicPureOps 0 Empty`, `97` `AtomicPureOp` constructors with zero cryptographic primitives in PQXDH reduction syntax), coin-only uniform sampler table `pqAtomicSamplers` (`atomicBaseSamplers 0 Empty`), primitive-free target challenger interfaces `pqPrimIface` (`PTag`) and `pqSigAndDdhIface`, game codec `pqKeyIndCodec` (`codecCost = 64`), polynomial step-cost budget `stepCostBudget`, per-kind step-cost budget `stepCostBudgetSplit`, block-width budget `outputSizeBudget`, split challenger query weights `chalIfaceSigQueryWeight` and `chalIfaceDdhQueryWeight`, size-honesty predicates `PqOpsSizeHonest` and `PqSampSizeHonest`, and block-size predicates `GRedBlockBounded` and `GRed2BlockBounded` |

### The CLI statements, the PQXDH-mode models and the shared PQXDH definitions (`LibsignalBinary/Specifications/SignalSession/`, `Computational/Specifications/{Game,LibsignalCli,Session,Composition,Reductions/Pqxdh,Reductions/ReductionDsl}/`, `Computational/Tests/Guards/`)

| File | Tier | Defines |
|---|---|---|
| `LibsignalBinary/Specifications/LibsignalE2E/PqxdhHooksCommon.lean`, `PqxdhInputs.lean` | Tier 1 (`PqxdhInputs.lean` in the default closure); `PqxdhHooksCommon.lean` is not in T (**Checked by Lean.**, outside `CliBinaryPq.lean`'s imports, with `0` of its 12 definitions unfolded under the panic-only `cliProgElf`) | the proof-side PQXDH + SPQR hook functions (`compress512Hook`, Kyber1024 `kemEncapsHook`/`kemDecapsHook`, and the 5 `libcrux_ml_kem::mlkem768` hooks over `Q.K : MlKem`, used only for untrusted ghost-table replay; all 7 Ed25519/scalar curve-core operations are closed in `modelPrims` over `VerifiedLibraries.Common.EdPoint`, and `libcruxHmacHook`, `spqrHookTable`, and `pqxdhHookTable` live in proof-side `LibsignalBinary/Proofs/SpecLemmas/SignalSession/PqxdhHooksLegacy.lean`); the 4-field free primitive bundle `PqxdhPrims` (`F512`, `encaps`, `decaps`, `K`), the parameters `PEParams`, typed inputs `LocalIdentity` and `PreKeyBundleFields`, and the byte bridge `ofU8` / `toU8` / `fitVec` (`PqxdhInputs.lean`, `DEV-PQ1`–`DEV-PQ3`, `DEV-PQ5`, `DEV-PQ6`) |
| `LibsignalBinary/Specifications/LibsignalE2E/HooksMallocng.lean` | not in the trusted base (**Checked by Lean.**: outside `CliBinaryPq.lean`'s imports, with `0` of its 3 definitions unfolded on the 0-hook stock ELF) | the shared `mallocng` subroutine-hook helpers `restoreCallerRegs`, `stepRustAlloc1`, and `stepRustDealloc1` over `VerifiedLibraries.mallocngLib.codeROSubroutineHook` (`libcruxHmacHookMallocng` lives in untrusted `LibsignalBinary/Proofs/HookDischarge/CryptoMallocngBudgetBase.lean` and `aesEncHookMallocng` / `aesDecHookMallocng` live in untrusted `LibsignalBinary/Proofs/E2E/AesHooks0.lean`) |
| `LibsignalBinary/Specifications/LibsignalSpqrV1/Entries.lean` | not in the closure (no theorem of `Computational/Theorems/` uses it) | public-API SPQR V1 store contract: `RecordPqStateLengthBelow2Pow32` and `loadSessionSpecPqStateLengthBound` (`DEV-SPQR1`, `DEV-SPQR3`, `DEV-SPQR5`); no public-API V1 run statement (the E2E chain consumes the untrusted `withStores_okVT` / `withStoresDec_okVT` directly) |
| `LibsignalBinary/Specifications/LibsignalE2E/PqxdhModelLink.lean`, `StateXModel.lean` | Tier 1 (`PqxdhModelLink.lean`); Tier 2 (`StateXModel.lean`: `**Trusted: definitions used by the statement.**`, all 9 of its definitions) | the primitive bridge `modelPrims X W : SignalPqxdh.Primitives` (with `rfl` guards equating every derived field to `SignalPqxdh.*Ref`) and the generalized `SessionRecord` encoder `encodeRecordUnderExtras` carrying public PQXDH metadata (`RecordExtras`) and serialized SPQR V1 state |
| `LibsignalBinary/Specifications/LibsignalE2E/PqxdhCorrectModel.lean`, `PqxdhSessionModel.lean` | Tier 1 (`PqxdhCorrectModel.lean`); Tier 2, trusted in part (`PqxdhSessionModel.lean`: `ReachablePqxdhSession`, `firstMessageBody`, `wirePrekey`, `wireWhisper`) | the PQXDH handshake models with SPQR V1 (`pqxdhSpqrSession W`, `pqxdhSessionParams W`): `initiateState` and `recvPrekeyState` with their typed inputs (`ResponderPreKeySecrets`, `PreKeyMessageFields`) (`PqxdhCorrectModel.lean`); the pending-session wire model `sendWirePending`, `ReachablePqxdhSession`, `sendModelPq` / `recvModelPq` and `honestBundle` (`PqxdhSessionModel.lean`). `recvPrekeyModel` (`LibsignalBinary/Proofs/SpecLemmas/LibsignalE2E/PqxdhCorrectModelProofDefs.lean`), `sendWireModel` and the Prop `PqxdhFirstMessageRoundtrip` (`Computational/Proofs/E2E/PqxdhSessionModelProofDefs.lean`) are proof-side; `PqxdhFirstMessageRoundtrip` is proved in `Computational/Proofs/E2E/Pqxdh/FirstMessageRoundtrip.lean` and checked in `Computational/Tests/NonVacuity/FirstMessageRoundtrip.lean`. `CliSpecPqxdh` (`PqDir.lean`) states the CLI against these models |
| `LibsignalBinary/Specifications/SignalSession/Run.lean`, `SmDir.lean`, `PqDir.lean` | Tier 1 (`Run.lean`, `PqDir.lean`); `Run.lean` (which defines `CliRun`) is in the closure of every CLI theorem; `SmDir.lean` is Tier 2, trusted in part (`partyAddress`, `textBytes`, in the closure of `Main` and `L4`); `PqDir.lean` is in the closure of `Main`, `L4`, `SymRefines`, `SymSecure`, and `libsignalCliPqSecure_holds` | the specs of the `libsignal-cli` CLI over any implementation `run : CliRun`: a run's inputs and outcome, the command line, the directory layout and `observe` (`Run.lean`, no libsignal model); `CliSpecE` (the SM game's directories `dirOfE`, `send` and `recv` of `2 ‖ c` against `sendModelSpqrOff` / `recvModelSpqrOff` on `Reach`, DEV-CLI1, DEV-CLI2; `LibsignalBinary/Proofs/SpecLemmas/SignalSession/SmDirProofDefs.lean`, proof-side, over `dirOfE` of `SmDir.lean`); `CliSpecPqxdh` (PQXDH directories `encodeDir` of a `PqParty`, `init` / `send` / `recv` against `initiateState`, `messageEncrypt`, `tryDecryptFromRecord` and `recvPrekeyState`, with the stores' replay and trust state; `PqDir.lean`) |
| `LibsignalBinary/Proofs/SignalSession/SmScheme.lean`, `PqStatement.lean` | Banner `**Checked by Lean.**` (proof-side; moved from `Specifications/SignalSession/`): in no closure of the 8 theorems of `scripts/trust_banner_headlines.txt`. The binary theorem `libsignal_cli_pq_binary_correct` states `CliSpecPqxdh` directly; `pqCliFirstMessageRoundtrip` (`Computational/Tests/NonVacuity/FirstMessageRoundtrip.lean`) and the proof `pqCliSteadyRefinesSM_proof` (`Computational/Proofs/LibsignalCli/PqSteadyRefine.lean`) use `PqStatement.lean` | statements about the `libsignal-cli` CLI for one implementation `run : CliRun`: `cliSchemeFromInitKeys init run` (the CLI as an ACD19 SM scheme: Init-A / Init-B written by `init`, `send` / `recv` runs in the party's directory, DEV-CLI1, DEV-CLI2; `SmScheme.lean`); and the model-level statements `PqCliSteadyRefinesSM` (on an acknowledged session, `send` / whisper `recv` of the CLI's models update the session as the SPQR V1 session model `pqxdhSessionParams W` does, with the session model's stdout when the session's remote identity is trusted) and `PqCliFirstMessageRoundtrip` (Alice's `init` on Bob's honest bundle and first `send` give a typed pre-key message that Bob's `recv` decrypts to the plaintext when his store accepts the Kyber pre-key's use) (`PqStatement.lean`, `DEV-CLI3`) |
| `LibsignalBinary/Specifications/SignalSession/Process.lean`, `CliRun.lean`, `CliProcess.lean` | Tier 2 (`CliProcess.lean`: `**Trusted: definitions used by the statement.**`, all 4 of `CliProcess.lean`'s definitions unfolded; `CliRun.lean`: `**Trusted: definitions used by the statement.**`, its sole definition `CliHooks` unfolded in the symbolic ELF headlines and none in the computational ELF headlines; `Process.lean`: `**Trusted in part.**`, all but `ProcessResult`), in the closure of the ELF theorems (`CliElfLib`) only: no theorem of the default target uses them | the CLI as a process. `Process.lean`: `processInputs` (argv, stdin, files and directories; 8 MiB stack, DEV-CLI7; `AT_SECURE = 0`, DEV-CLI6, and `AT_HWCAP = 0x1b`, FP/ASIMD/AES/PMULL with LSE bit 8 = 0; plain `ElfImage.loadState` runs both `aes` and SPQR's `Once::call` CPU-feature probes with zero initial `.data` patches, DEV-CLI10), with `ProcessResult` (untrusted; `ProcessRunsTo` / `ElfRunsTo` / `outcomeOf` are in `LibsignalBinary/Proofs/SpecLemmas/SignalSession/ProcessProofDefs.lean`). `CliRun.lean`: the symbolic primitive parameter bundle `CliHooks` (`W.C` / `W.Q`, guarded per input by `RealHooksAgreeOnInput` in `ElfBinding.lean`); all `55` external de-hooked symbols (audited by `alink_check.py` via untrusted `cliDehookedSymsPlaced` in `LibsignalBinary/Proofs/Placed/CliBinaryPqPlaced.lean`) — `read_file`, `read_stdin`, `write_file`, and `write_stdout` in `SignalSessionIoPlacedObj`, the `5` `__rust_*` allocator shims, `memcpy` and `memset` on `VerifiedLibraries.mallocngLib` blocks `20`/`21`, `memmove`, `bcmp`, and `strlen` from `self-contained/libc.a`, and the `41` compiled-Rust rows in the `15` `lib2_*.o` objects (including `std::sys::sync::once::futex::Once::call`, `cpufeatures::aarch64::getauxval_hwcap`, `core::fmt::write` and its `7` `core::fmt` `Formatter` / `Display::fmt` externs, `alloc::fmt::format::format_inner`, the `2` `x25519_dalek` operations, all `7` `curve25519_dalek` Ed25519/scalar operations, Kyber-1024 `encapsulate`/`decapsulate` and all `7` `mlkem768::incremental` functions, `sha2::sha256::compress256`, `sha2::sha512::compress512`, `libcrux_hmac::hmac`, and `signal_crypto::aes_cbc::{aes_256_cbc_encrypt, aes_256_cbc_decrypt}` with `aes` 0.9.1 `autodetect::Aes256` ARMv8 hardware AES + `fixslice64`) — plus `<String as Clone>::clone` execute their linked ELF bytes directly under `cliProgElf` (`0` non-panic external hooks; only the `18` Rust panic symbols are intercepted as `SIGABRT`, DEV-E7; DEV-E1, DEV-E8, DEV-CLI4, DEV-CLI8, DEV-CLI19, DEV-CLI21; legacy ghost-table I/O helpers live in `LibsignalBinary/Proofs/SpecLemmas/SignalSession/IoHooksLegacy.lean` and `CliRunFixed.lean`). `CliProcess.lean`: `sigAbrt`, `abortOnPanic`, `OutcomeMatchesProcess`, and `cliProcessInputs` (`argv = "libsignal-cli" :: i.argv`) |
| `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean`, `PqDirNoMatch.lean` | Tier 1 (`**Trusted: the statement.**`), listed in `defaultStatementFiles` (`scripts/TrustedClosure.lean`) and in the closure of the ELF theorems (`CliElfLib`) only. Lemma 4 `libsignal_cli_pq_binary_correct : CliPqxdhBinaryCorrect cliElfBytes` states correctness directly at the closed primitive bundle `realPEParams` (`realCrypto`, `realPqxdhPrims`: FIPS 180-4 SHA-256 / SHA-512, FIPS 197 AES-256, RFC 7748 X25519, round-3 Kyber-1024, and FIPS 203 ML-KEM-768 incremental), up to `.OutOfMemory` (`CliReachesOOMElf`, DEV-CLI15) or `SampleNTT` seed divergence (`CliReachesSampleNttStuckElf`, DEV-CLI22); it is proved by `libsignal_cli_pq_binary_correct_proof` (`Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean`) via `ElfDirectBridge.cliPqxdhBinaryCorrect_of_plainPanPlaced` | the ELF-direct PQXDH-mode statements about an ELF (no library placement). `PqDirNoMatch.lean`: `CliSpecPqxdhNoMatch` (DEV-CLI11: `recv` of a typed pre-key message over a session that does not match it runs to `pqRecvPrekeyModel` on the same state with no session; on an accept every file but the session file agrees (`Outcome.AgreeExcept`, `OutcomeMatchesModelExceptPath`), the session file's bytes are not claimed, DEV-CLI11). `CliBinaryPq.lean`: `realCrypto`, `realPqxdhPrims`, and `realPEParams`; the `18` mangled Rust panic symbols `cliPanicSymbolsPlaced` (`isCliPanicSymbolPlaced` lives in untrusted `CliBinaryPqPlaced.lean`), and the `5` mangled `SampleNTT` entry names (`kyberEncapsElfSym`, `kyberDecapsElfSym`, `mlkemFromSeedElfSym`, `mlkemEncaps1ElfSym`, `mlkemDecapsElfSym`); `CliElfAddrs` and `resolveCliElfAddrs` (resolving all `23` function addresses via `Arm64.Process.parseSymtabFull` and `Arm64.Process.resolveSym` and checking pairwise distinctness); the ELF-direct execution relation `cliPanicOverrides`, `cliProgElf` (`overrideProgram execSyscall cliPanicOverrides addrs.panicAddrs` — `0` non-panic external hooks, intercepting only the `18` Rust panic entry points as `SIGABRT`, DEV-E7), `CliRunsToElf` (starting directly from plain `elf.loadState (cliProcessInputs i)` with zero initial `.data` patches), and `cliRunElf`; `CliPqxdhInputs`, `CliReachesOOMElf` (the `.OutOfMemory` excuse of `CliPqxdhElfCorrect`, DEV-CLI15), `MlKemSampleNttStuckAtElf` and `CliReachesSampleNttStuckElf` (the `SampleNTT` seed-divergence excuse of `CliPqxdhElfCorrect`, `CliElfProgress`, and `CliPqxdhElfSecure`, DEV-CLI22), `cliExcusedElf`, `OutcomeOrExcusedAbort`, `CliSpecPqxdhOrExcusedAbort`, and `CliSpecPqxdhNoMatchOrExcusedAbort` (DEV-CLI15, DEV-CLI22); `CliPqxdhElfCorrect` (for every extras `X`, `CliSpecPqxdh` and `CliSpecPqxdhNoMatch` of `cliRunElf elf addrs` at `realPEParams`, up to `.OutOfMemory`, DEV-CLI15, or `SampleNTT` seed divergence, DEV-CLI22; SPQR V1) and `CliPqxdhBinaryCorrect bytes` (`∃ elf addrs, ElfImage.parse bytes = .ok elf ∧ resolveCliElfAddrs bytes elf = .ok addrs ∧ CliPqxdhElfCorrect elf addrs`) |
| `LibsignalBinary/Proofs/Placed/CliLabels.lean`, `GeneratedLean/LibsignalSessionExtractedObj.lean` | Banner `**Checked by Lean.**` (proof-side; moved out of the trusted base and headline set): `0` constants in any headline closure | untrusted object-level label cross-check `CliLabelsFromObjects` (`Obj.LabelsFromObjects cliLinkObjs libsignalSessionLib`, `CliProbeLabelsAnchored`, `CliExternLabelsUndefined`, `CliPanicLabelsSound`) over `libsignalSessionExtractedObjs`, kept building alongside `ElfDirectBridge.cliElf_symtab_agrees_with_placement` (§5) |
| `LibsignalBinary/Proofs/SpecLemmas/SignalSession/CliExternsFixed.lean` | Banner `**Checked by Lean.**`: no theorem of `Computational/Theorems/` unfolds it (those theorems state the ELF-direct panic-only program). The fixed table meets the contracts (`cliExterns_ok`, `LibsignalBinary/Proofs/SignalSession/Cli/CliExternsWitness.lean`) | proof-side fixed-image CLI extern contracts `CliExternsOk P A ext` (DEV-E1, DEV-E6) |
| `Computational/Specifications/Game/StatementPq.lean` | Tier 1 (`**Trusted: the statement.**`), in the closure of `libsignal_cli_pq_secure_elf_binary` and of `libsignalCliPqSecure_holds` (the game; its bound is stated in `StatementPqElf.lean` and `StatementPqSecure.lean`) | the CLI security game on PQXDH directories with SPQR (`cliPqExp`, `CliPqxdhAdvantage`), defined as the generic composed game at the binary interface: `cliPqExp … A = composedExp (cliIface …) A.run` (`GenericGame.lean`; `Computational/Tests/Guards/GenericGameGuard.lean` checks by `rfl` that it unfolds to the driver-level body). It uses the adversary and oracles, the `KeyInd` handler `bhDrvKeyInd`, guard `bhDrvGuard`, bookkeeping (`ModelDriverInstance`, `ModelDriverInstanceMeta`, `ModelDriverState`, extended by `CliDriverState` with per-instance `CliPartyState` game states), `cliOracleImplR` (projecting `corr-P` to `BinState`), and win condition (`StatementBinaryHarnessCore.lean`), at `P := modelPrims X W`, with every SM step one call of `run : CliRun` on a retained party directory (`cliPqDirInputs` over `CliPartyState.dir`, read back along `cliPqPartyPathsOf` by `cliPqReadBack` in `Dir.cliPqAfter` across `exit 0` calls; DEV-CLI18): Alice's `init <Bob> bundle` (`pqInitInputs`) and Bob's initial directory `cliPqxdhDirBobBeforeAccept` (`cliPartyStateB0`) at the instance start (the peer's identity key pinned, Bob's Kyber pre-key last-resort, no session record seeded), then `send` / `recv`. CLI-specific refusals: DEV-CLI13 (Alice and pre-key inputs), DEV-CLI14 (length gate) |
| `Computational/Specifications/Game/StatementPqOomFlag.lean` | Tier 1 (`**Trusted: the statement.**`), listed in `defaultStatementFiles` (`scripts/TrustedClosure.lean`), imported by `StatementPq.lean` (whose monadic CLI scheme and driver use it), `StatementPqOomGame.lean`, and `StatementSession.lean` | the monadic secure-messaging scheme `SMSchemeRM` (`SMSchemeRM.initState`) and the R-game oracles `transmitRM`, `challRM`, `deliverRM`, `injectRM`, `oracleImplRM`, `cliOracleImplRM` over a monad `M`, instantiated at `M := ProbComp` (the game `cliPqExp`), `M := WriterT (List Inputs) ProbComp` (the logged CLI game of `StatementPqOomGame.lean`), and `M := WriterT (List Coins) ProbComp` (the send-coin-logged R-game `smSchemeCoinLogged` / `gameRCoinLogged` of `StatementSession.lean`); the lifts `liftStateT`, `liftQueryImplStateT2` |
| `Computational/Specifications/Game/StatementPqOomGame.lean` | Tier 1 (`**Trusted: the statement.**`), listed in `defaultStatementFiles` (`scripts/TrustedClosure.lean`), imported by `StatementPqElf.lean` for `CliPqxdhFlagProb` and `CliKemFailProb` | the input-logged CLI game: `cliRunLogged`, `runCliDriverLogged`, `cliPqxdhExpFlagged` (the driver of `StatementPq.lean` run in `WriterT (List Inputs) ProbComp`, logging every input passed to `run`) and `CliPqxdhFlagProb` (the probability that a logged input satisfies a predicate), which `withExcusedAbortTerm` in `CliPqxdhSecurityFor` adds as `2 * CliPqxdhFlagProb …` (at `CliPqxdhExcusedAbort exc run W`, counting PQXDH inputs where `exc i` holds and `run i = none ∨ run i = some .aborted`) when `exc? = some exc` (instantiated at `some (CliReachesSampleNttStuckElf elf addrs)` in `CliPqxdhElfSecure` for `SampleNTT` seed divergence, DEV-CLI22, and `exc? := none` in model-level `LibsignalCliPqSecure`); `cliCoinsTape?` and `CliKemFailProb` (the probability in `cliPqxdhExpFlagged` on the adversary `A` itself that `W.Q.K.KemFailBad` holds on `z.2.filterMap cliCoinsTape?`, i.e., some ordered pair `(t₁, t₂)` of logged 64-byte coins tapes satisfies `W.Q.K.tapePairFails t₁ t₂ = true`, added as `2 * CliKemFailProb …` to both clauses of `CliPqxdhSecurityFor`); `CliPqxdhExpFlaggedFaithful` (proved in `Computational/Proofs/LibsignalCli/Oom/Faithful.lean`; advantage transfer off bad inputs in `Computational/Proofs/LibsignalCli/Oom/Transfer.lean`) and `CliPqBadProbVanishes` |
| `Computational/Specifications/Game/GenericGame.lean` | Tier 1 (`**Trusted: the statement.**`), in the closure of `L3` and the theorems that use `cliPqExp` (through `StatementPq.lean`) | the generic composed game `G(Σ)` of the paper (§5.2.1): `composedSpec S ℓ St` (the adversary's oracles: uniform coins, `SignalPqxdh.keyIndSpec S`, `bhDrCtlSpec S`, and per-instance `SM.spec St (Plain ℓ) (BitVec 512) Bytes`), the interface record `ComposedIface S ℓ` (leaked-state type `St`, primitives `prims`, driver state `Drv`, `init`, `impl`, `won`), the experiment `composedExp I A` (sample `b`; run `I.impl b` from `I.init b` and `KeyIndState.empty S true`; random bit if `allTestedSessionsFresh I.prims` fails on the final `KeyInd` state; else `b' == b || I.won d b`) and `ComposedAdvantage` (`boolBias`). The CLI instance `cliIface` (`Σ_bin`) is in `StatementPq.lean`; the model instance `modelIface` (`Σ_model^H`, any `KeyInd` handler) is in `ModelIface.lean`, `L3`'s statement `ModelSecure` in `StatementModel.lean` (both Tier 1, headline `model_secure_costed`), and `L2`'s statement `SessionSecure` in `StatementSession.lean` (Tier 1, headline `session_secure`); their proofs are in `Computational/Proofs/LibsignalCli/{GenericGameModel,HeadlineModel,HeadlineSession}.lean` (untrusted) |
| `Computational/Specifications/Session/StatementSession.lean` | Tier 1 (`**Trusted: the statement.**`), in the closure of `L2` (`session_secure`, `Computational/Theorems/Lemmas.lean`); `GameRCoinLoggedFaithful` is proved in `Computational/Proofs/SpecLemmas/Session/GameRCoinLogged.lean` (not unfolded by `L2`) | Lemma 2 (`L2`, App. C.3): the per-session Double Ratchet + SPQR V1 bound `sessionAdvantageBound` (definitionally equal to the body of `bhPrefixFullBoundMixV1With`), the send-coin-logged R-game `smSchemeCoinLogged` and `gameRCoinLogged` (running `oracleImplRM` of `StatementPqOomFlag.lean` in `WriterT (List Coins) ProbComp`, with faithfulness proposition `GameRCoinLoggedFaithful`), the top-level ML-KEM failure term `sessionKemFailProb` (the probability under `oa >>= fun o => gameRCoinLogged … (A o)` that `K.KemFailBad (z.2.map coinBytes) = true`), and `SessionSecure ℓ`, quantifying existentially over first-order costed session reductions `D : SessionCostedReductionFamily Pt ℓ` satisfying `SessionCostedReductionFamilyBounded ℓ D` and universally over primitive/group assumptions (`Encaps1Total K`, `Dh.Commutes`, `X25519RealizesDh`, `DhKerUniform`, `2 * (q + 1) + 25002 < 2 ^ 32`, `δ`) and any index/context mixture `oa : ProbComp α` of `(ida o, idb o, s o)` and `q`-query-bounded session adversaries `A o`, bounding mixed `SM.gameR` bias by `sessionAdvantageBound … + 2 * sessionKemFailProb …` |
| `Computational/Specifications/Game/ModelIface.lean`, `Computational/Specifications/Composition/StatementModel.lean` | Tier 1 (`**Trusted: the statement.**`), in the closure of `L3` (`model_secure_costed`, `Computational/Theorems/Lemmas.lean`); `Computational/Proofs/SpecLemmas/Composition/ModelLazyCond.lean` is outside `L3`'s closure (`**Checked by Lean.**`, used internally by `HeadlineModel.lean` via `PrefixLazy1KeyReal.lean`) | Lemma 3 (`L3`, App. C.3): `modelIface` (`Σ_model^H`) and `KeyIndAdvantageForHandshake` (`ModelIface.lean`), and `ModelAdversaryPerInstanceBounded` and `ModelSecure S ℓ` (`StatementModel.lean`): at `ki := pqxdhKeyIndImpl1KeyReal S P`, costed reductions `reds : CompositionCostedReductionFamily S ℓ P C K qep decT encT` satisfy `CompositionCostedReductionFamilyBounded P C K qep decT encT reds` unconditionally for all `P` and, under `SignalPqxdh.WellFormedPrimitivesδ P` (scoping Conjunct 2), bound `ComposedAdvantage (modelIface … ki …) A` by `2 · KeyIndAdvantageForHandshake S P ki advK` (with `advK` within `keyIndReductionBudget S qStart b`) plus the `qStart`-session hybrid sum of raw single-session `SM.gameR` biases mixed over stage 1 (`stageOneAsProbComp (((reds b qStart qDR (Finset.sup (Finset.range qStart) qs)).prefixRed k).eval1 …)`), with no `ModelLazyCond` premise, no session assumption table, and no session reduction bundle `D` |
| `Computational/Proofs/LibsignalCli/StatementPqSecure.lean` | In no closure of the 8 theorems of `scripts/trust_banner_headlines.txt` (**Checked by Lean.**), the statement of the model-run theorem, proved by `libsignalCliPqSecure_holds` (`Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean`); axioms in §7 | `CliPqxdhSecurityForAbstract` (the abstract-group CLI PQXDH security proposition over `(run, X, Wp, exc?)` and arbitrary `Pt`) and its model-run specialization `LibsignalCliPqSecure`: for every `run` with `CliSpecPqxdh run X W` and the hypotheses on the primitives `MlKemEncaps1SucceedsOn64ByteHeaderAndSeeds W.Q.K`, `CryptoWellFormedPrimitivesδ (modelPrims X W)`, `KemDeltaCorrect (modelPrims X W) δ_kem`, the X25519 relation and group laws, `DhKerUniform Dh`, the `u32` counter/window bound `_hq32` (`2 * (qs k + 1) + 25002 < 2 ^ 32`), and the query bounds `CliGameAdversaryPerInstanceBounded`, the existential reductions `L_cli`, `RK`, `D`, `R_e2e` with the cost and query bounds `CliAdapterCostBounded` and `CompositionCostedReductionFamilyBounded` bound `CliPqxdhAdvantage` (1) by `2 · KeyInd1KeyRealAdvantage advK` + the Double Ratchet + SPQR V1 prefix sum + `kemDecapsFailureTerm S δ_kem` + `2 · CliKemFailProb`, with no idealization, and (2) under `KeyIndRoGap S P advK ε_ro` by `2 · (pqxdhKeyIndAdvantageBoundActiveδ S b_ki.q_on … + ε_ro)` (with `b_ki := keyIndReductionBudget S qStart b`) + the same prefix sum + `kemDecapsFailureTerm S δ_kem` + `2 · CliKemFailProb` (DEV-CLI16). `CliSpecPqxdhNoMatch` is not a hypothesis: the game never makes such a call (DEV-CLI13, and Bob takes a pre-key message over a session only if its header is the instance's) |
| `Computational/Specifications/LibsignalCli/StatementPqElf.lean`, `StatementPqElfAnyKem.lean` | Tier 1 (`StatementPqElf.lean`: `**Trusted: the statement.**`, listed in `defaultStatementFiles` in `scripts/TrustedClosure.lean` and in the closure of the Main Theorem `libsignal_cli_pq_secure_elf_binary` in `Computational/Theorems/Main.lean`); Banner `**Checked by Lean.**` (`StatementPqElfAnyKem.lean`, `0` constants in any headline closure, used by the intermediate lemma `libsignal_cli_pq_secure_elf_binary_any_kem`) | `CliPqxdhSecurityFor S ℓ ForRuns` (`StatementPqElf.lean`), the canonical CLI PQXDH security proposition at the closed primitive bundle `realPEParams` (`realCrypto`, `realPqxdhPrims`), the concrete Curve25519 prime-order x-only subgroup (`X25519Pt`, `x25519Dh`, `x25519EncPt`, `x25519EncT`, `x25519DecT`, `x25519Delta = 1 / 2 ^ 250` in `LibsignalBinary/Specifications/CryptoGames/DH/X25519Group.lean`), and the concrete Curve25519/XEdDSA and round-3 CRYSTALS-Kyber-1024 unreached model operations (`realUnreachedPrims CryptoGames.MLKEM.kyber1024KemKeyGen`: `realPow8`, `realScalarMul`, `realScalarAdd`, `realXeddsaSign`, `realIsValidDhTriple`, `kyber1024KemKeyGen`), parameterized by `ForRuns` over `(run, exc?)`: there are reductions `L_cli`, `RK`, `D`, `reds` with the cost and query bounds `KeyIndCostedReductionBounds`, `KeyIndReductionQueryBounds`, `SessionCostedReductionFamilyBounded`, `CliAdapterCostBounded` and `CompositionCostedReductionFamilyBounded` such that, under `_hKemColl` (`≤ 1 / 2 ^ 255` on `kyber1024KemKeyGen`), `KyberNoiseGap ε` (instantiating `δ_kem := ε + 1 / 2 ^ 112`, DEV-PQ21; key-generation wire lengths `(1568, 3168)` proved unconditionally by `kyber1024_kem_delta_correct`), `ℓ < 10 ^ 6`, `_hq32`, and `CliGameAdversaryPerInstanceBounded`, `CliPqxdhAdvantage` is bounded (1) by `2 · KeyInd1KeyRealAdvantage advK` + the Double Ratchet + SPQR V1 prefix sum + `kemDecapsFailureTerm S (ε + 1 / 2 ^ 112)` + `2 · CliKemFailProb`, and (2) under `KeyIndRoGap S P advK ε_ro` by `2 · (pqxdhKeyIndAdvantageBoundActiveδ S b_ki.q_on (ε + 1 / 2 ^ 112) … + ε_ro)` (with `b_ki := keyIndReductionBudget S qStart b`) + the same prefix sum + `kemDecapsFailureTerm S (ε + 1 / 2 ^ 112)` + `2 · CliKemFailProb` (DEV-CLI16); `withExcusedAbortTerm` adds `2 · CliPqxdhFlagProb …` (`StatementPqOomGame.lean`, over `CliPqxdhExcusedAbort exc run realPEParams` with `run i = none ∨ run i = some .aborted`) to both bounds only when `exc? = some exc`. `CliPqxdhElfSecure S ℓ elf addrs`: `CliPqxdhSecurityFor` at the ELF-direct process `cliRunElf elf addrs`, with `exc? := some (CliReachesSampleNttStuckElf elf addrs)` (charging `SampleNTT` seed divergence as `+ 2 · CliPqxdhFlagProb`, DEV-CLI22) and no `.OutOfMemory` premise or allocation-failure term on the run. `CliPqxdhBinaryCorrectAndSecure bytes`: `bytes` parse as an ELF `elf`, `resolveCliElfAddrs bytes elf = .ok addrs`, and `(elf, addrs)` meets `CliPqxdhElfCorrect elf addrs` and `CliPqxdhElfSecure S ℓ elf addrs` for every `S`, `ℓ`. `StatementPqElfAnyKem.lean` holds the KEM-generic counterparts `CliPqxdhSecurityForAnyKem`, `CliPqxdhElfSecureAnyKem`, and `CliPqxdhBinaryCorrectAndSecureAnyKem` over arbitrary `(kemKeyGen, δ_kem)` (byte-identical up to the `*AnyKem` renames to the pre-PR generic definitions), tied to `CliPqxdhSecurityForAbstract` in `Computational/Tests/Guards/ConcreteX25519OldToNew.lean` |
| `Computational/Specifications/LibsignalCli/Kyber1024Delta.lean`, `Computational/Specifications/Assumptions/Kyber1024Correct.lean`, `LibsignalBinary/Specifications/CryptoGames/KEM/Kyber1024KeyGen.lean` | Tier 1 (`Kyber1024Delta.lean`: `**Trusted: the statement.**`, listed in `defaultStatementFiles`); Tier 2 (`Kyber1024Correct.lean`, `Kyber1024KeyGen.lean`: `**Trusted: definitions used by the statement.**`) | concrete Round-3 CRYSTALS-Kyber-1024 key generation (`kyber1024KeyPairWith`, `kyber1024KeyPair`, `kyber1024KemKeyGen` using the shared `sampleNtt` matrix sampler of `MlKem.lean` and validated against the 10 official Round-3 NIST `PQCkemKAT_3168.rsp` vectors in `MlKemOfficialKat.lean`), the single noise-explicit honest K-PKE failure predicate `kyber1024KpkeFailsWith` with real `SHA3-512`/`SHAKE-256` noise extractors `kyber1024RealNoiseKG`/`kyber1024RealNoiseEnc`, the real/ideal experiments `kyber1024RealKpkeFailsExp`/`kyber1024IdealKpkeFailsExp` and CBD-noise idealization gap hypothesis `KyberNoiseGap ε` (`ε ≤ Pr[σ = coins]` under a `SHAKE-256` random oracle, `= 2^-256` if `SHA3-512` is also a random oracle, `ε = 0` for independent keygen/encaps `PRF` random functions, DEV-PQ21), and the target statement `Kyber1024KemDeltaCorrect` (`(1568B, 3168B)` keygen length validity and `KemDeltaCorrect (modelPrims (realUnreachedPrims kyber1024KemKeyGen) realPEParams) (ε + 1 / 2 ^ 112)` from `KyberNoiseGap ε`; unfolding and FO faithfulness checked in `Computational/Tests/Guards/Kyber1024NoiseSpecGuard.lean`) |
| `Computational/Specifications/Reductions/Pqxdh/StatementPqReds.lean` | Tier 2 (`**Trusted: definitions used by the statement.**`), in the closure of `L3` (`model_secure_costed`), the Main Theorem `libsignal_cli_pq_secure_elf_binary`, and the model-run theorem `libsignalCliPqSecure_holds` | the model-game promotion step `compositionLocalStart` (used by `modelIface` in `ModelIface.lean`) and the E2E composition reduction bundles over `AtomicOps.lean` (`atomicSig`, single-step `atomicE2EOps`, coin-only `atomicBaseSamplers`), `TargetCodecs.lean` (`e2eKeyIndTargetIface`, `e2eSessionTargetIface`, `e2eGameCodec`, `prefixCtxT`), and `StatementBinaryHarnessCore.lean` (`e2eTargetGameCodec`): `CompositionCostedReductions` (1-stage `kindRed` and 2-stage `prefixRed k`), the `(b, qStart, qDR, qInst)`-indexed family `CompositionCostedReductionFamily`, `CompositionCostedReductionsBounded` and `CompositionCostedReductionFamilyBounded` (bounded unconditionally by `bhE2ECostBudget S b qStart qDR qInst qep ℓ` at `qInst := Finset.sup (Finset.range qStart) qs` via `GRedBounded` / `GRed2Bounded`, and per query kind via `GRedCostByKind` / `GRed2CostByKind` at `bhKindCounts b qStart qDR` against `bhE2ECostBudgetByKind S b qStart qDR qInst qep ℓ`), and `bhPrefixFullBoundMixV1With`. Checked by compile-time guards `Computational/Tests/Guards/StatementPqRedsGuard.lean`, `Computational/Tests/Guards/HeadlineSamplersGuard.lean`, and `Computational/Tests/Guards/HeadlineAtomicOpsGuard.lean` |
| `Computational/Specifications/Assumptions/KeyInd1KeyReal.lean` | Tier 2 (`**Trusted: definitions used by the statement.**`: it only supplies definitions that the statements use), in the closure of `L1` (`headlineδ`, via `pqxdhKeyInd1KeyExpForHandshake`), the Main Theorem `libsignal_cli_pq_secure_elf_binary`, and the model-run theorem `libsignalCliPqSecure_holds` | the key-indistinguishability game with one-key identities and the real key derivation: `pqxdhKeyIndImpl1KeyReal` (`.initPrin`: one sampled scalar is both identity keys, as `bhDrvKeyInd` at `useRo = false`; `.roQuery`: the real `hkdfDerive96`; `.revealDhSecrets`: no answer; every other query: `pqxdhKeyIndImpl false`), `pqxdhKeyInd1KeyExpForHandshake` (the experiment over an oracle `ki`: from `KeyIndState.empty`, classical freshness), `pqxdhKeyInd1KeyRealExp` (`pqxdhKeyInd1KeyExpForHandshake` on `pqxdhKeyIndImpl1KeyReal`), `KeyInd1KeyRealAdvantage` (DEV-CLI16) |
| `Computational/Specifications/Assumptions/KeyInd1KeyRo.lean` | Tier 2 (`**Trusted: definitions used by the statement.**`), in the closure of `L1` (`headlineδ`), the Main Theorem `libsignal_cli_pq_secure_elf_binary`, and the model-run theorem `libsignalCliPqSecure_holds`: 3 definitions, 14 trusted lines (8 code lines) in the default closure and 20 trusted lines (10 code lines) in the 8-theorem union | the key-indistinguishability game with one-key identities and the random-oracle key derivation, bounded by `PqxdhKeyIndSecureδ`, and the hypothesis of clause 2 of the CLI statements: `pqxdhKeyIndImpl1KeyRo` (`.initPrin`: `pqxdhKeyIndImpl1KeyReal`'s; every other query: `pqxdhKeyIndImpl true`, so the key derivation is `HkdfRO`, assumption 2; guard `Computational/Tests/Guards/KeyInd1KeyRoGuard.lean`), `KeyInd1KeyRoAdvantage` (`pqxdhKeyInd1KeyExpForHandshake` on it), and `KeyIndRoGap` (`KeyInd1KeyRealAdvantage ≤ KeyInd1KeyRoAdvantage + ε`: assumption 2 instantiated on the one-key game, `ε = 0` in the random-oracle model, DEV-PQ14, DEV-CLI16) |
| `LibsignalBinary/Specifications/SignalSession/CliElf.lean` | Tier 1 (`**Trusted: the statement.**`), in the closure of the ELF theorems (`CliElfLib`) only; no default root imports it | only `cliElfBytes`: the bytes of `.GeneratedLean/cli-elf/libsignal-cli.elf` (`1,024,984` B), read at elaboration by the engine's trusted `file_bytes%`, which fails unless the file's SHA-256 equals the pin written in this file (`f35c326d90895b1b52e5daf099bdc5cadff1e34ba3352b807a06a3d94c33e56a`). The ELF is not committed: [`scripts/cli-elf-stock`](../../scripts/cli-elf-stock) (`--stdbin --build`) links it reproducibly from source with stock LLVM `ld.lld` (`-static -no-pie --no-relax --gc-sections`, `-T third_party/libsignal/libsignal-session/cli-elf/stock/stock_c2.ld`, rendered from `cli-elf/stock.ld`) from the compiled crate objects and trimmed `alloc`/`std` sysroot members of `libsignal-session/translation.toml`, the `libsignal-cli-io` crate object of `cli/io/translation.toml`, and the `lib2_*.o` objects of `cli/rt/translation.toml` (§5)—together with `rustc 1.98.1`'s `self-contained/` CRT and `libc.a`, `cli-elf/stock/rdl_shim.S`, the zero-word extern-stub object `extern_stubs_clean.o` (both assembled with `zig 0.16.0`; no Zig-compiled `libc` routines are linked), and `cli-elf/std-main`, pinned in `cli-elf/stock/inputs_stock_stdbin.lock`. Outside Lean, `./scripts/cli-elf-stock --stdbin --verify-pin --lean-mod LibsignalBinary/Specifications/SignalSession/CliElf.lean` and `./scripts/stock-pin/alink_check.py --ci --lock third_party/libsignal/libsignal-session/cli-elf/stock/m4_stock.lock --inputs-lock third_party/libsignal/libsignal-session/cli-elf/stock/inputs_stock_stdbin.lock` (§5) verify the pin and link invariants. The pin is the only place a byte of the ELF is named. `cliElfImage` and the lemmas about it are in the untrusted `CliElfProof` module |
| `Computational/Tests/Guards/SessionCliGuards.lean` | not in the trusted base (**Checked by Lean.**: no theorem imports it) | kernel-checked `decide` guard (`idOfE_ne_cli`) checking that the two parties' identity keys `partyIdentityKey .A`, `partyIdentityKey .B` differ |
| `Computational/Specifications/Session/SpkHop2Red.lean`, `StatementSpkModel.lean`, `StatementIdsModel.lean` | `StatementSpkModel.lean` is a T file (197 lines, `**Trusted: the statement.**`); `SpkHop2Red.lean` (`**Trusted in part.**`: `KeyU`, `initKeysU`, `sessionSchemeU` are in no headline's closure; its `configRefuseEarlyBobCorr` is the SM configuration of `bhConfigSpkS` and so of the PQXDH-mode game, DEV-LS33 / DEV-LS34) and `StatementIdsModel.lean` (`**Trusted: definitions used by the statement.**`: `idsOf`, `paramsIdsWithSpqr`, `sessionSchemeFixedSpk`) are Tier 2 | uniform-start keys and scheme (`KeyU`, `initKeysU`, `sessionSchemeU`), restrictions `noBobCorrInEpoch0` (`DEV-LS33`), `noBobCorrWhileAliceBelowEpoch10` (`DEV-LS34`), `configRefuseEarlyBobCorr`, and the hop-2 terms (`spkSwapHybridCount`, `spkSwapSpuriousStepTerm`, `spkSwapCreationPointHitTerm`, `hop2CreateCollTerm`, `spkSwapHiddenScalarGuessTerm`; `SpkHop2Red.lean`); leaked-signed-pre-key sampled keys, costed reduction bundle, dedicated SPK/hop-2 step-cost budgets, and forgery term (`SampledSessionKey`, `initKeysOfSampled`, `SpkCostedReds`, `spkLeakRedUBudget`, `spkTier1Budget`, `spkTier2Budget`, `spkHopBudget`, and `spkCostedBounds` over `atomicSessionOps` / `atomicPureOps`, `coinOnlyIface`, `extractPtPrfIface`, `extractPtPrfBaseIface`, `extractPtPrfCodec`, and `e2eSessionCodec`, passing Bob's signed-pre-key scalar `s : BitVec 256` via `rIn` with zero secret-carrying operators, and `epoch0ChainForgeryTerm`; `StatementSpkModel.lean`); and the session parameters and fixed-SPK scheme (`paramsIdsWithSpqr`, `idsOf`, `sessionSchemeFixedSpk`; `StatementIdsModel.lean`). `uniformStartDistinguisher` (`Computational/Proofs/SpecLemmas/Session/UniformStart.lean`) and the shallow reductions and proof lemmas in `Computational/Proofs/E2E/` (including `HeadlineSpkSession.lean`) are outside the trusted base |
| `Computational/Specifications/Session/StatementComposed.lean` | Tier 2 (688 lines, `**Trusted in part.**`): 33 of its 35 definitions (all except `fsAeadSlotSumBound` and `paramsV1`) are in the closure of `L2` (`session_secure`), the Main Theorem, and the model-run theorem `libsignalCliPqSecure_holds`: `Encaps1Total`, `refineConst`, `eps0IdealUnit`, `SessionCostedReductions`, `sessionCostedReductionsBounded`, `SessionCostedReductionFamily`, `SessionCostedReductionFamilyBounded`, `fsAeadAuthSlotSumBound`, `fsChainPrgMixtureTerm`, `fsSaltWireMixtureTerm`, `fsAeadMixtureBound`, `fsAeadAuthMixtureCompBound`, `hiddenSaltMixtureBound`, `fig8MixShortAuthV1`, `fig8MixShortPrivV1`, `uniformStartMixtureBound`, `prefixAdvAvg`, `prefixPrfAvg`, `prefixPrgAvg`, `prefixWireAvg`, `DhKerUniform`, and the 12 definitions of `RefuseB0` (`RefuseM`, `RefuseState` with `onAccept` / `onDeliver` / `onSend`, `refuseChall`, `refuseCorr`, `refuseCorrB0`, `refuseCorrB0Impl`, `refuseDeliver`, `refuseInject`, `refuseTransmit`). Proof-side mirror helpers and budget monotonicity lemmas are checked by Lean in `Computational/Proofs/SpecLemmas/Session/StatementComposed.lean` | the shared session-level bound definitions of the PQXDH-mode CLI statements and of Lemma 2 (`StatementSession.lean`): `Encaps1Total`, the `RefuseB0` wrapper, the mixture averages `prefix*Avg`, the SPQR V1 session bound (`uniformStartMixtureBound`, `hiddenSaltMixtureBound`, `fig8MixShortAuthV1`, `fig8MixShortPrivV1`, `fsAeadMixtureBound`, `fsAeadAuthMixtureCompBound`, `fsAeadAuthSlotSumBound` at `qR := min (2 * q) (q + 2)`), the costed session reduction bundles (`SessionCostedReductions` — including costed `spk`, `fig8`, `fs`, `simFig8`, `simDeliverForge`, `epoch0Red`, `uniformStartRed`, `challSimDF`, `B_cka`, `B_prng`, `B_fs`, `B_cka_u`, `B_prng_u`, and `B_fs_u` over `atomicSessionOps`, `atomicFig8Ops`, `atomicFsOps`, and `TargetCodecs.lean` — along with `sessionCostedReductionsBounded`, `SessionCostedReductionFamily`, `SessionCostedReductionFamilyBounded`), and `DhKerUniform`; `DEV-C5`, `DEV-C8`–`DEV-C13`, `DEV-KFF1` |
| `Computational/Specifications/Game/StatementBinaryHarnessCore.lean` | Tier 2 (1,091 lines, `**Trusted: definitions used by the statement.**`): in the closure of `L3` (`model_secure_costed`), the Main Theorem, and the model-run theorem `libsignalCliPqSecure_holds`. Proof-side definitions (`MlKemEncaps1SucceedsOn64ByteHeaderAndSeeds`, `ModelPrimsWellFormedTargetV1`, `X25519SubgroupWitnessTargetV1`, `normalizeExtras`, `ModelPrimsSharedAssumptions`, `ModelPrimsCryptoAssumptions`, `ModelPrimsGuardedAssumptions`, `BH.peParamsWithK`, `BH.pqxdhPrimsWithK`, `BHX25519BaseLink`, `bhRecvExtrasOfHdr`, and shallow reduction helpers) are checked by Lean in `Computational/Proofs/SpecLemmas/Game/{StatementBinaryHarnessCore,BhShallowHelpers}.lean` | the definitions that `cliPqExp`, `modelIface`, and `CliPqxdhSecurityFor` use: the injection filter `bhInjOK` (refusing injected inputs above `stdinCapBytes` = `2^20` before `receive`, DEV-CLI14 / DEV-CLI21), the `KeyInd` handler `bhDrvKeyInd`, `bhNoOpkRespPromoted`, the bundle-consistent `startDR` guards `bhDrvGuard` and `bhE2EGuard`, the bookkeeping `ModelDriverInstance`, `ModelDriverInstanceMeta`, `ModelDriverState`, `BHModelInst`, `BHE2EDrvState`, the model-game step helpers `bhE2EStepLocalSm` and `bhE2EFinishStartSpk` (used by `modelIface`), and end-of-game cleanliness `allTestedSessionsFresh`; the `ReductionDsl` CLI-to-model adapter type, interface, codecs, and budget (`bhCtlUnStart`, `e2eBhAdapterIface`, `e2eBhAdapterCodec`, `e2eTargetGameCodec`, `CliToModelAdapterProg` over `atomicAdapterOps` from `AtomicOps.lean` and `e2eAdapterIface`, `e2eAdapterCodec`, `e2eGameCodec` from `TargetCodecs.lean`, `bhAdapterCostBudget`, `CliAdapterCostBounded`); the online / offline random-oracle query split `bhQueryKind`, `bhKindCounts`, the per-kind budgets `bhAdapterCostBudgetByKind` and `bhE2ECostBudgetByKind`, and the adapter kind-forwarding predicate `CliAdapterForwardsKinds`; the `KeyInd` reduction query budget `keyIndReductionBudget` (`keyIndReductionBudget S qStart b`), the E2E cost budget `bhE2ECostBudget` (`bhE2ECostBudget S b qStart qDR qInst qep ℓ`), and boundedness predicate (`GRed2Bounded`, `stageOneAsProbComp`); and the hypothesis `CliGameAdversaryPerInstanceBounded` |

## 3. Tier 2: definitions from this repository that T uses

Per file, "lines" in the tables below (except the `ReductionDsl` table, which gives whole-file
lengths) is the part in the union of the closures of the 4 theorems of the default library (`L1`,
`L2`, `L3`, and `KyberDelta` in `Computational/Theorems/Lemmas.lean`), formatted as `trusted_lines / file_lines
(trusted_code_lines)`. A file's trust banner is computed over the 8 theorems of
`scripts/trust_banner_headlines.txt` (below). Read in this order:
the bound (`Ratchet/LibsignalBound.lean`), the game, the session model, the bound's terms and
reductions, the primitives' games, the hook models. These tables cover the Double Ratchet stack;
the PQXDH and CLI files are in §2, the SPQR V1 files in §7.

> [!NOTE]
> The definitions that the symbolic proof also uses are in `LibsignalBinary/`
> ([`LibsignalBinary/README.md`](../../LibsignalBinary/README.md)): the CryptoGames files
> `Primitives.lean`, `PRNG/Defs.lean`, `FSAEAD/Defs.lean`, `FSAEAD/Construction.lean`,
> `FSAEAD/Security.lean`, the `AEAD/*Defs.lean` files, `AEAD/LibsignalAead.lean`,
> `Ratchet/LibsignalSession.lean`, `Ratchet/RootKdfDefs.lean`, `Ratchet/ChainDefs.lean`, and
> `Ratchet/CreateChainDefs.lean` under `LibsignalBinary/Specifications/CryptoGames/`, and the
> `LibsignalBinary/Specifications/Libsignal*.lean` hook models under
> `LibsignalBinary/Specifications/`. The tables below use names relative to those directories.
>
> The `SignalMessage` wire format (`SignalMessage.tryFrom`, its errors, `PublicKey.deserialize`)
> and prost's codec `protoSignalCodec` are in
> `LibsignalBinary/Specifications/LibsignalSignalMessage.lean`, which the symbolic statement shares.
> `LibsignalBinary/Proofs/ProtoCodecKat.lean` holds only `decide` guards (**Checked by Lean**), so it is not in the
> tables.

**The SM game and the ACD19 reductions** (`Computational/Specifications/Session/ACD19/SM/` and
`LibsignalBinary/Specifications/CryptoGames/SM/`; also
`LibsignalBinary/Specifications/CryptoGames/Party.lean`, `LibsignalBinary/Specifications/CryptoGames/PRNG/Defs.lean`, `LibsignalBinary/Specifications/CryptoGames/Primitives.lean`):

| File | Lines / file (code) | Contains |
|---|---:|---|
| `SM/LibsignalGame.lean` | 142 / 222 (86) | the restricted game (`configR1`, the window rule): DEV-LS1–LS4, LS6 |
| `SM/Game.lean` | 242 / 361 (145) | ACD19 Fig. 2 and Defs. 6, 8 (the game's oracles and state) |
| `SM/Construction.lean` | 27 / 157 (9) | ACD19 Fig. 8's state and header types (`**Trusted in part.**`: `initParty`, `send`, `receive`, `scheme` are in no headline's closure) |
| `SM/Theorem8And12Statements.lean` | 13 / 78 (5) | `healEpoch` (`t*_L + 2`, DEV-SM27) and the 6-oracle `DeliverForge` game specification `SM.specDF` |
| `PRNG/Defs.lean` | 121 / 200 (73) | ACD19 Fig. 7 and Def. 17 (PRF-PRNG) |
| `Party.lean` | 13 / 58 (10) | parties and epochs (`**Trusted in part.**`: `Party.senderOf` is in no headline's closure) |
| `Primitives.lean` | 8 / 105 (6) | ACD19 Def. 1 (AEAD) and `otccaSpec` |

`Computational/Proofs/CryptoGames/SM/{Reductions,Engine,BlankedPrivRed,Theorem1Reductions}.lean`
(ACD19 §5.3's reductions B1–B3, the simulation they share, the blanked B3,i, DEV-LS13, and ACD19
App. A's B1, B2, `Thm1.challSim`) live under `Computational/Proofs/` and are used by no theorem of
`Computational/Theorems/` (only the standalone ACD19 theorems of §7 use them;
**Checked by Lean.**).

**The session model and the bound's terms** (`Computational/Specifications/Session/ACD19/Ratchet/` and
`LibsignalBinary/Specifications/CryptoGames/Ratchet/`):

| File | Lines / file (code) | Contains |
|---|---:|---|
| `Ratchet/LibsignalBound.lean` | 451 / 649 (367) | the named slot terms (`chainPRGTermCosted`, `chainPRGTermAuthCosted`, `saltPRFTermCosted`, `saltPRFTermAuthCosted`, `wireOtccaTermCosted`, `wireOtccaTermAuthCosted`, `multiSlotAdvCosted`, `multiSlotAdvAuthCosted`, `pubToADCosted`, `macForgeryTerm`, `fsSlotCount`), `Fig8CostedReds` (over `atomicFig8Ops`, including `redCKAAuth`, `redPRNGAuth`, `redFSAuth`, `redCKAPriv`, `redCKAPrivU`, `redPRNGPriv`, `redFSPriv`, `redFSPrivCoin`), `FsCostedReds` (over `atomicFsOps`, with two-stage `prgRedZero`, `multiRed`, `prgRedAuth`, and `multiRedAuth` evaluated via `evalTwoStage1`), `GRedBounded`, `GTwoStageBounded`, `GRedCostByKind`, `GRed2CostByKind`, `CostedFits`, `CostedMidFits`, `CostedOpsSizeHonest`, `CostedSampSizeHonest`, `ratchetCostBudget`, `fsRatchetCostBudget`, `ratchetFsAdapterBudget`, `fsCostedBounds`, `fig8CostedBounds`, `CKA.MakesAtMostQueries`, `PRFPRNG.MakesAtMostQueries`, `LCt`, `FsAdv`, `lBlank`, `Fig8Adv`, `LibAdv` (`**Trusted in part.**`, 29 of 38 definitions: `saltPRFTerm`, `wireOtccaTerm`, `multiSlotAdv`, `pubToAD` and related uncosted helpers are in no headline's closure; `Refine.SimProg`, `Refine.evalSim`, `fig8ShortBoundWith`, `fsShortBoundWith`, `fsCompBoundWith`, `simCostedBounds`, and the uncosted `fig8ShortBound`, `fsShortBound`, `fsCompBound`, and `chainPRGTerm` are in `Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/LibsignalBound.lean`) |
| `Ratchet/LibsignalSession.lean` | 655 / 831 (402) | the Lean model of libsignal's session (ratchet, encrypt, decrypt) |
| `Ratchet/LibsignalSessionSM.lean` | 112 / 162 (59) | the session model as an SM scheme (ghost epochs, keys) |
| `Ratchet/LibsignalSMInstance.lean` (`LibsignalBinary/Specifications/CryptoGames/Ratchet/`) | 123 / 440 (50) | ACD19 Fig. 8 types and primitives over 32-byte effective salts (`Salt32`, `LibsignalCiphertextWithSalt32`, `LibsignalMsgPublicPart`, `LibsignalWireOracleSpec`, `lWire`, `lChainPRG`, `lSaltPRF32`, `dummyKey`, `vec32`), `X25519RealizesDh`, `ratchetKeyAdmissible`, `configR1OnCurve`, `macForgeryProb` (13 of its 33 definitions; the remaining Fig. 8 wrapper definitions and salt/wire reductions are outside the headline closures) |
| `Ratchet/LibsignalSim.lean` | 88 / 162 (44) | Fig. 8 state/ciphertext types (`Fig8St`, `Fig8C`), the spurious-step terms (`evictedKeySpuriousStepPrg`, `wireMacVerifiesTest`, `rootKdfSpuriousStepUnit`, `spuriousStepTerm`, `pointSpuriousStepPrg`, `rootKdfForgedEpochStartUnit`, `forgedEpochStartSpuriousStepTerm`), and `rootKdfAsPrg` (`**Trusted in part.**`, 10 of 13 definitions: `Fig8Comp`, `tagBytes`, `toWire` are in no headline's closure); `epoch0Term`, `GhostChain`, `epoch0Distinguisher`, `SimState`, and `Refine.sim` live in `Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/{LibsignalSim,LibsignalSimShallow,LibsignalSimC}.lean` outside `Computational/Specifications/` |
| `Ratchet/RootKdfDefs.lean`, `ChainDefs.lean`, `CreateChainDefs.lean`, `WireRatchetDefs.lean` | 32 / 79 (23), 13 / 69 (8), 16 / 55 (9), 3 / 43 (2) | root KDF as PRF-PRNG, chain step, key creation, `padOrTruncatePlain` |

**The primitives' games and libsignal's AEAD and reference primitives** (`LibsignalBinary/Specifications/CryptoGames/`: `CKA/`,
`FSAEAD/`, `AEAD/`, `Hash/`, `DH/`, `KEM/`):

| File | Lines / file (code) | Contains |
|---|---:|---|
| `CKA/Defs.lean` | 148 / 253 (86) | ACD19 Def. 12, Fig. 3, Def. 13 |
| `CKA/LibsignalCKA.lean` | 75 / 140 (29) | ACD19 §4.1.2's CKA over an abstract DH function, the X25519 model |
| `CKA/DDHDefs.lean` | 4 / 49 (3) | the CKA state type `CKA.DDH.State` |
| `FSAEAD/Defs.lean` | 27 / 330 (18) | ACD19 Def. 14 (syntax: `FSAEADScheme`, `ReceiveResult`) and the adversary type `FSAEAD.Adversary`; the game and advantage (Fig. 5, Def. 15, used by the paper theorems of §7), the query helpers and the restricted-AD predicates are outside the closure |
| `FSAEAD/Construction.lean` | 14 / 95 (7) | ACD19 Fig. 6, corrected (DEV-FS7–FS9) (`**Trusted in part.**`: the state types `RatchetSenderState`, `RatchetReceiverState`; `fromAEADPRG` and `skipKeys` are in no headline's closure) |
| `FSAEAD/Hybrid.lean`, `HybridWith.lean` | 3 / 263 (1), 8 / 332 (3) | the hybrid index helpers `isLookaheadHop` (`Hybrid.lean`) and `slotToHybridHopIndex`, and the oracle interface `IndexedOtccaSpec` (`HybridWith.lean`); ACD19 Thm 5's hybrids and reductions in both files are outside the closure (the paper theorems of §7 use them) |
| `Security.lean` | 4 / 69 (3) | the adversary type `RatchetAdversary` (`FSAEAD/PubDefs.lean`, 109 lines, the public message part `movePubPartToAD` (DEV-FS19), is in no headline's closure: **Checked by Lean.**) |
| `AEAD/WireAeadDefs.lean` | 139 / 203 (79) | the wire OT-CCA game and libsignal's wire AEAD (13 of 14 definitions; `toWireEnc` is outside the closure) |
| `AEAD/HMACDefs.lean`, `HKDFDefs.lean`, `CBCDefs.lean`, `CBCDecDefs.lean`, `Aes256.lean` | 48 / 97 (29), 38 / 86 (25), 54 / 150 (25), 31 / 85 (19), 0 / 216 (0) | HMAC-SHA256/8, HKDF, AES-256-CBC with PKCS#7 over an abstract block cipher, and (`Aes256.lean`, `**Trusted: definitions used by the statement.**`, unfolded by the placed theorems of `CliElfLib` only) the concrete FIPS 197 AES-256 block cipher `aes256Enc` / `aes256Dec` |
| `AEAD/EtMDefs.lean`, `LibsignalAead.lean` | 51 / 341 (36), 11 / 58 (6) | cipher and MAC syntax, the PRF game; identity keys |
| `Hash/Sha512.lean` | 0 / 118 (0) | concrete FIPS 180-4 SHA-512 compression `sha512CompressState` (unfolded by the placed theorems of `CliElfLib` only) |
| `Hash/Keccak.lean` | 0 / 190 (0) | concrete FIPS 202 Keccak-p[1600] / SHA-3 / SHAKE functions called by Kyber-1024 and ML-KEM-768 (unfolded by the placed theorems of `CliElfLib` only) |
| `DH/X25519.lean` | 0 / 113 (0) | concrete RFC 7748 Curve25519 Montgomery ladder `x25519Ref` and `x25519PubFromSecretRef` (unfolded by the placed theorems of `CliElfLib` only) |
| `KEM/MlKem.lean` | 0 / 621 (0) | concrete round-3 Kyber-1024 (`kyber1024EncapsVec`, `kyber1024DecapsVec`), FIPS 203 ML-KEM-768 incremental (`mlkem768Incremental`), and the 7 `SampleNTT` seed-termination predicates (`Shake128SeedTerminates`, `Shake128MatrixTerminates`, `Mlkem768FromSeedTerminates`, `Mlkem768Encaps1Terminates`, `Mlkem768DecapsTerminates`, `Kyber1024EncapsTerminates`, `Kyber1024DecapsTerminates`) over `CryptoGames.SHA3` (all 63 definitions unfolded by the placed theorems of `CliElfLib` only) |

**The `ReductionDsl` reduction DSL, unified atomic operator tables, and target interfaces/codecs**
(`Computational/Specifications/Reductions/ReductionDsl/` and `Computational/Specifications/Pqxdh/Security/`):

| File | Total lines (code) | Contains |
|---|---:|---|
| `Computational/Specifications/Reductions/ReductionDsl/Core.lean` | 1,096 (792) | generic costed reduction DSL (`Sig` with mandatory `sz` and zero default `sz = 1`, `Ty`, `Ty.Fits`, `ValFits`, `Var`, `Env`, `Ops`, `Ops.opSize`, `OpsSizeHonest`, `Ops.sum`, `bits`, `Expr`, `Expr.eval`, `Expr.cost`, `Expr.size`, `reductionSizeBudget`, `Samplers`, `SampSizeHonest`, `Samplers.empty`, `Samplers.sum`, `Iface`, `Iface.withSamp`, `Iface.liftP`, `Iface.AnswerFits`, `Comp`, `Comp.eval`, `Comp.cost`, `Comp.queries`, `Comp.size`, `GameCodec`, `handlerImpl`, `CostedReduction`, `CostedReduction.impl`, `CostedReduction.eval`, `CostedReduction.totalCost`, `CostedReduction.totalQueries`, `CostedReduction.size`, `Mid`, `TwoStageCostedReduction`, `TwoStageCostedReduction.run1`, `TwoStageCostedReduction.eval1`, `TwoStageCostedReduction.eval2`, `TwoStageCostedReduction.totalCost`, `TwoStageCostedReduction.totalQueries`, `TwoStageCostedReduction.size`, `AllGameQueriesFit`, `supportWhen`, `Expr.costAt`, `Comp.pureEval?`, `Comp.costAt`, `CostedReduction.ValidKindCosts`, `CostedReduction.totalCostByKind`, `CostedReduction.CostBoundedByKind`, `TwoStageCostedReduction.ValidKindCosts`, `TwoStageCostedReduction.totalCostByKind`, `TwoStageCostedReduction.CostBoundedByKind`; 699 trusted lines / 586 code lines across 65 of 93 definitions; in no headline's closure: `Ty.BaseFits`, `OpsBaseBounded`, `SampBaseBounded`, `Ty.listDepth`, `Ty.NoNestedLists`, `Ty.HasNoTbl`, `Ty.treeBlocks`, `Expr.costWithTbl`, `Comp.costWithTbl`, `GameCodec.FitsOn`, `GameCodec.BaseFitsOn`, `CostedReduction.totalCostBounded`, `TwoStageCostedReduction.run1Bounded`, `runFuelBounded`, `TwoStageCostedReduction.eval1Bounded`, `TwoStageCostedReduction.eval2Bounded`, `TwoStageCostedReduction.totalCostBounded`) |
| `Computational/Specifications/Reductions/ReductionDsl/Samplers.lean` | 70 (34) | coin-only uniform sampler helpers (`sampleIndex`, `UniformSamplerTag`, `unifSamplers`, `unifSamplers0`; 29 trusted lines / 25 code lines across 3 of 4 definitions) |
| `Computational/Specifications/Reductions/ReductionDsl/AtomicOps.lean` | 1,205 (1,005) | unified 16-sort signature `atomicSig ℓ Pt` (`AtomicSort`, mandatory 32-byte block measure `AtomicSort.blocks`), coin-only samplers `atomicBaseSamplers` (`bv128`, `bv256`, `bv512`) and `atomicSamplers` (adds `pt` at `AtomicUnifBase.cost .pt = 12`, total `Comp.cost = 13`, matching the explicit uniform `X25519Pt` sampler proved exact-uniform and cost-matched in `Computational/Tests/Guards/X25519PtSamplerGuard.lean`), 8 atomic operator sub-tables totaling `143` operators (`atomicPureOps` with `97` `AtomicPureOp`s for byte/slice/varint/protobuf/wire/state codecs, with literal-payload byte measure `AtomicPureOp.opSize`, plus `46` curve-check, point-codec, symmetric, DH-group, SPQR/ML-KEM-768, and PQXDH operators across `atomicCurveCheckOps` [`2`], `atomicPtEncOps` [`1`], `atomicPtDecOps` [`1`], `atomicSymOps` [`11`], `atomicGroupOps` [`8`], `atomicSpqrKemOps` [`12`], and `atomicPqxdhOps` [`11`]), and the composed `Ops.sum` bundles `atomicAdapterOps` (`99`), `atomicFsOps` (`109`), `atomicFig8Ops` (`117`), `atomicSessionOps` (`132`), and `atomicE2EOps` (`135`) |
| `Computational/Specifications/Reductions/ReductionDsl/TargetCodecs.lean` | 1,202 (1,011) | primitive-free target challenger `Iface`s and source `GameCodec`s across L1 (`pqAtomicSig`, `pqAtomicOps`, `pqAtomicSamplers`, `PTag`, `pqPrimIface`, `pqSigAndDdhIface`, `pqKeyIndCodec`, extended for `Auth` in `Computational/Specifications/Pqxdh/Security/Auth/Headline.lean` with `FirstMsgPTag`, `AuthPTag`, `pqAuthPrimIface`, `pqAuthSigAndDdhIface`, `pqPrfMkIface`, `pqPrfHmacIface`, `authCodec`), L2 (`coinOnlyIface`, `extractPtPrfBaseIface`, `extractPtPrfIface`, `extractPtPrfCodec`, `atomicPrfIface`, `atomicPrfCodec`, `saltPrfTargetIface`, `wireOtccaTargetIface`, `slotOtccaTargetIface`, `slotOtccaCodec`, `fsaeadPubTargetIface`, `fsaeadPubCodec`, `fsaeadRatchetCodec`, `ckaTargetIface`, `prngTargetIface`, `fsaeadHeaderIface`, `fig8SmIface`, `fig8SmIfaceDF`, `fig8SmCodec`, `fig8SmCodecDF`, `e2eSessionCodec`), and L3/CLI adapter (`e2eKeyIndTargetIface`, `e2eSessionTargetIface`, `e2eAdapterIface`, `e2eGameCodec`, `e2eAdapterCodec` with `codecCost = 64`), plus unused leaf challenger interfaces (`aes256PrfIface`, `hmacPrfIface`, `leafSigAndDdhIface`; 117 of 122 definitions in the 8-theorem union) |
| `Computational/Specifications/Pqxdh/Security/CostedBudgets.lean` | 180 (90) | PQXDH polynomial step-cost and block-width budgets (`stepCostBudget`, `stepCostBudgetSplit`, `outputSizeBudget`, `ValFits`, `PqOpsSizeHonest`, `PqSampSizeHonest`, `GRedBlockBounded`, `GRed2BlockBounded`, `primIfacePrimQueryWeight`, `chalIfacePrimQueryWeight`, `chalIfaceSigQueryWeight`, `chalIfaceDdhQueryWeight`, `samplerZeroQueryWeight`; 96 trusted lines / 64 code lines) |

**Atomic-operator discipline, untrusted reduction witnesses, and compile-time closure guards.** All
protocol reductions share the single operator module `AtomicOps.lean` and the single
target-interface and game-codec module `TargetCodecs.lean`. No reduction operator bakes in secret
game state or composite multi-step loops: secret-keyed challenger calls flow exclusively through
typed `TargetCodecs.lean` tags, Bob's signed-pre-key scalar `s : BitVec 256` in
`StatementSpkModel.lean` is passed via `rIn`, and all reduction-specific state transitions (including
the 25,000-step Double Ratchet and SPQR symmetric-chain skip loops, the 2,000-entry skipped-key
lookup/eviction scans, and the outer session simulators and PRG distinguishers `simFig8`,
`simDeliverForge`, `epoch0Red`, and `uniformStartRed` in `SessionCostedReductions`) are
expressed as untrusted first-order `ReductionDsl.Expr` / `ReductionDsl.Comp` programs in
`Computational/Proofs/SignalPqxdh/Security/ReductionDsl/`, `Computational/Proofs/ReductionDsl/`, and
`Computational/Proofs/E2E/Dsl/`, checked by Lean with zero uncosted distinguishers in
`Computational/Specifications/`. Three compile-time guards in `Computational/Tests/Guards/` audit
this boundary at build time:
- `HeadlineAtomicOpsGuard.lean`: kernel `rfl` equalities and typed projections (Layer 1) plus a
  compile-time `#eval` import-graph and 7-root statement-closure audit (Layer 2) pinning the 2-entry
  `Sig` allowlist (`atomicSig`, `pqAtomicSig`), the 15-entry `Ops` allowlist (`Ops.sum`, `pqAtomicOps`,
  the 8 `atomic*Ops` sub-tables, and the 5 composed `atomic*Ops` bundles), the 16-entry `GameCodec`
  allowlist (including `authCodec`), positive reachability of all 8 `Atomic*Op` inductives, zero per-protocol `*CostedTables`
  modules or uncosted distinguishers in `Computational/Specifications/`, and 7 negative self-tests.
- `HeadlineSamplersGuard.lean`: kernel size-honesty and `.sDom = .unit` theorems (Layer 1) plus a
  7-root statement-closure `#eval` audit (Layer 2) pinning the 4-entry coin-only sampler allowlist
  (`unifSamplers`, `atomicBaseSamplers`, `atomicSamplers`, `pqAtomicSamplers`), banning protocol-state
  references inside samplers, and running 5 negative self-tests.
- `StatementPqRedsGuard.lean`: kernel type and budget checks on `CompositionCostedReductions`.

**Cost and value-size conventions.** The protocol-agnostic value-size and size-honesty predicates
`Ty.Fits`, `ValFits`, `OpsSizeHonest`, and `SampSizeHonest` are defined once in
`Computational/Specifications/Reductions/ReductionDsl/Core.lean`, where `Sig.sz` is mandatory (no
default `sz = 1`). `Core.lean` also defines a second, cost-independent family (`Ty.BaseFits`,
`OpsBaseBounded`, `SampBaseBounded`, `GameCodec.FitsOn`, `GameCodec.BaseFitsOn`) that is in no
headline's closure. Across all layers (PQXDH L1, Double Ratchet + SPQR L2, multi-session composition
L3, and the CLI-to-model adapter), `AtomicSort.blocks ℓ Pt` in `AtomicOps.lean` measures base values
in concrete 32-byte blocks (`.plain` = `ℓ / 32 + 1`, `.pbytes w` and `.bytes w` =
`(x.length + 31) / 32 + 1`, `.ghostSt` and `.binSt` unpacked by record/state block counts, `.pt` = `1`,
`.nat` = `(Nat.log2 n + 256) / 256`), with `OpsSizeHonest` and `SampSizeHonest` proved unconditionally
for every atomic sub-table and bundle in `Computational/Proofs/ReductionDsl/AtomicTablesHonest.lean`:
1. **PQXDH (`CostedBudgets.lean`, `Headline.lean`, and `Auth/Headline.lean`)**: `KeyIndCostedReductionBounds` and `Auth1KeyCostedReductionBounds` enforce
   `PqOpsSizeHonest pqAtomicOps`, `PqSampSizeHonest pqAtomicSamplers`, `totalCost ≤ stepCostBudget S b`,
   the per-kind step cost `CostBoundedByKind … ≤ stepCostBudgetSplit S b q_off` with online and random-oracle queries counted separately,
   `.size ≤ reductionSizeBudget + 2 ^ 12 * bits (stepCostBudget S b)`,
   `totalQueries` (including signing queries `≤ 2 * b.q_total` and syntactic DDH queries `≤ 4 * b.q_total ^ 2 + b.q_total + S.N_dh + S.N_sess_tot` / `≤ 5 * b.q_total ^ 2 + b.q_total + S.N_dh + S.N_sess_tot`, paired with semantic `q_sig ≤ 2 * min S.N_spk_tot S.N_recv` and bilinear `q_ddh ≤ gdhQueryBudget S b` / `authGdhQueryBudget S b` in `KeyIndReductionQueryBounds` and `Auth1KeyReductionQueryBounds`), and `∀ ℓ`,
   `GRedBlockBounded S b ℓ` / `GRed2BlockBounded S b ℓ` bounded by `outputSizeBudget S b ℓ`
   (`pqKeyIndCodec.codecCost = 64`, `authCodec.codecCost = 32`; with `AuthCostedReductionBounds` for the standalone two-key `Auth` proof in `Computational/Proofs/`).
2. **Double Ratchet + SPQR V1 session reductions (`LibsignalBound.lean`, `StatementSpkModel.lean`,
   `StatementComposed.lean`)**: `fsCostedBounds`, `fig8CostedBounds`, and
   `sessionCostedReductionsBounded` enforce `GRedBounded` and `GTwoStageBounded` under
   `fsRatchetCostBudget (min (2 * q) (q + 2)) (qep + 1)` across the four two-stage FS-AEAD hybrid reductions (`prgRedZero`, `multiRed`, `prgRedAuth`, `multiRedAuth`) and `ratchetFsAdapterBudget (min (2 * q) (q + 2)) (qep + 1)` across the five lightweight FS-AEAD adapters in `FsCostedReds`, and under
   `ratchetCostBudget q (qep + 1)` across `Fig8CostedReds` and all reductions of
   `SessionCostedReductions` (`simFig8`, `simDeliverForge`, `epoch0Red`,
   `uniformStartRed`, `challSimDF`, `B_cka`, `B_prng`, `B_fs`, `B_cka_u`, `B_prng_u`, `B_fs_u`), paired with semantic target query
   bounds (`FSAEAD.MakesAtMostQueries`, `CKA.MakesAtMostQueries`, `PRFPRNG.MakesAtMostQueries`),
   while `spkCostedBounds` (`StatementSpkModel.lean`) bounds `SpkCostedReds` under
   `spkLeakRedUBudget q` (`16 * (q + 2)`) for `spkLeakRedU` and
   `spkHopBudget q qep ℓ = min (spkTier1Budget q qep) (spkTier2Budget q qep ℓ)` for `spkLeakRed`,
   `hop2PrgRedK`, and `hop2PrfRedK`, with single-step chain operations (`chainStep`,
   `spqrChainNextKey`) in `AtomicOps.lean` and the 25,000-step Double Ratchet / SPQR skip loops and
   2,000-entry skipped-key scans unpacked as bounded `Comp.iter` programs in
   `Computational/Proofs/ReductionDsl/`.
3. **Multi-session E2E composition and CLI-to-model adapter (`StatementPqReds.lean`,
   `StatementBinaryHarnessCore.lean`)**: `CliAdapterCostBounded` bounds `CliToModelAdapterProg` by
   `bhAdapterCostBudget S b qStart qDR ℓ`, and `CompositionCostedReductionsBounded` bounds `kindRed`
   and `prefixRed k` by `bhE2ECostBudget S b qStart qDR qInst qep ℓ` at
   `qInst := Finset.sup (Finset.range qStart) qs` (with `keyIndReductionBudget S qStart b` bounding
   `advK`'s handshake queries and `e2eGameCodec.codecCost = 64`, `e2eAdapterCodec.codecCost = 64`),
   through `GRedBounded` / `GRed2Bounded`. In addition to these total bounds, all three bound their
   step cost per source-query kind (`GRedCostByKind` / `GRed2CostByKind`, wrapping
   `CostBoundedByKind`, against `bhAdapterCostBudgetByKind` and `bhE2ECostBudgetByKind`):
   `bhQueryKind` puts offline random-oracle `.roQuery` calls in kind `1` and every online query in
   kind `0`, and `bhKindCounts b qStart qDR` counts them separately (`min b.q_ro b.q_total` and
   `min b.q_on b.q_total + qStart + qDR`). The per-kind budgets are the total budgets with
   `min b.q_on b.q_total` in place of `b.q_total` (also in the clamped table sizes), plus a
   separate charge per offline call. Only the cost is per kind: the target-query counts remain
   totals (`qSum = (List.ofFn (bhKindCounts b qStart qDR)).sum`), and `CliAdapterForwardsKinds`
   carries the per-kind counts of the composed adversary through `L_cli` to `B_A`, the source
   adversary of `kindRed` / `prefixRed k`.

**The hook models and codec** (`LibsignalBinary/Specifications/`):

| File | Lines / file (code) | Contains |
|---|---:|---|
| `LibsignalBinary/Specifications/LibsignalSignalMessage.lean` | 317 / 423 (215), 37 of its 38 definitions | the `SignalMessage` wire format (`tryFrom`, errors, `PublicKey.deserialize`) and prost's protobuf codec `protoSignalCodec`, as Lean functions; shared with the symbolic statement |
| `LibsignalBinary/Specifications/LibsignalTripleRatchet.lean` | 23 / 729 (6) | the parametric SPQR interface `SpqrModel` (`send`, `recv`, `sendPanics`, `recvPanics`); `entryOf`, `rngFillHook`, `zeroizeSecretHook`, `readVec32`, `diffieHellmanHook`, and `pubFromSecretHook` are in no headline closure (under the panic-only `cliProgElf` with `0` external hooks; the layered `tripleRatchetExterns` is checked by Lean) |
| `LibsignalBinary/Specifications/LibsignalTripleRatchetRepr.lean` | 81 / 659 (47) | layouts and the uuid 1.26.1 parser model `uuidTryParse` (17 of its 52 definitions in the default closure; the theorems of `Computational/Theorems/Main.lean` also unfold `errTag`, 18 of 52; `logFilterAddr` is in no closure) |
| `LibsignalBinary/Specifications/LibsignalSpqr.lean` | 0 / 138 (0) | the empty-state `spqr::recv` model `spqrRecvEmpty` (the message-preamble check, DEV-LS24) |
| `LibsignalBinary/Specifications/LibsignalSpqrV1/KemFailFind.lean` | 12 / 76 (8) | `MlKem.tapePairFails` (`Bool` function on two byte lists `(t₁, t₂)` testing whether `t₁.length = 64 ∧ t₂.length = 64` and `K.honestExchangeFails ⟨t₁, _⟩ ⟨t₂.take 32, _⟩ = true`) and `MlKem.KemFailBad` (`Bool` predicate on a send-tape log testing whether some ordered pair `(t₁, t₂)` has `K.tapePairFails t₁ t₂ = true`, whose real-game probability `sessionKemFailProb` and `CliKemFailProb` charge at top level), in the closure of `L2` (`session_secure`), the Main Theorem `libsignal_cli_pq_secure_elf_binary`, and `libsignalCliPqSecure_holds` (`**Trusted in part.**`, 2 of 7 definitions: the chosen-coin ML-KEM-768 failure-finding search game `MlKem.KemFailFindAdversary`, `MlKem.kemFailFindGame`, `MlKem.kemFailFindAdvantage`, and aliases `KemFailFind` and `kemFailFindAdvantage`, DEV-KFF1, are outside the headline closures) |
| `LibsignalBinary/Specifications/HkdfSalt.lean` | 2 / 31 (1) | the HKDF salt type `Salt`, an optional 32-byte salt: `hkdfExtract`, `hkdf`, `deriveMessageKeys`, and `kdfPRG` (`Computational/Proofs/CryptoGames/AEAD/HKDFProofDefs.lean`) take a `Salt`, and `spqrRecvEmpty` returns one on success |
| `LibsignalBinary/Specifications/LibsignalAesCbc.lean` | 3 / 77 (2) | the LE byte encoding `toLEBytes` (`**Trusted in part.**`: 1 of its 4 definitions in the default closure; the ELF theorems of `CliElfLib` also unfold `blockToBytes` and `bytesToKey` via `PqxdhModelLink.lean`, 3 of 4 across the 8-headline union; `returnToLinkRegister` is in no headline closure) |

**No module under `Computational/Proofs/` or `LibsignalBinary/Proofs/` (the binary proofs) is
used by the statement of a theorem in `Computational/Theorems/`.** Both hold only proofs that Lean
checks: no trusted definition is declared there, and no file there has a trust banner other than
**Checked by Lean.** The standalone ACD19 theorems of §7 (`libsignal_session_sm_r1_proto` and the
ACD19 `theorem*` rows) are stated in `Computational/Proofs/` by design; they are not
headlines of `scripts/TrustedClosure.lean`, and they make no file trusted. `Computational/Tests/Guards/` is a proof tree like the rest of `Computational/Tests/`.

### Trust banners in Lean files

Every Lean file on the import path of the 8 headlines of
[`scripts/trust_banner_headlines.txt`](../../scripts/trust_banner_headlines.txt) (the 6 promoted theorems of
`Computational/Theorems/{Lemmas,Main}.lean` and the 2 ELF-direct headlines of `Symbolic/Theorems/{Refinement,Security}.lean`), outside the proof trees and `Symbolic/` specs,
starts its module docstring with one of four banners computed by `scripts/TrustedClosure.lean`
(`trusted_banners.csv` of a `--headlines-file scripts/trust_banner_headlines.txt` run):

| Banner | Meaning |
|---|---|
| **Trusted: the statement.** | a T file |
| **Trusted: definitions used by the statement.** | every definition in the file is in the closure; its theorems are checked by Lean |
| **Trusted in part.** | the banner names the definitions in the closure (or points here); the rest is checked by Lean |
| **Checked by Lean.** | no headline uses anything from the file |

The table below lists every file of `LibsignalBinary/Specifications/` outside T whose definitions only
the theorems of `CliElfLib` unfold (Tier 2 of their closures), and the names those
theorems unfold (`trusted_names` of `trusted_banners.csv`). These files say **Trusted in part.**, except `CryptoGames/AEAD/Aes256.lean`,
`CryptoGames/Hash/Sha512.lean`, `CryptoGames/DH/X25519.lean`, `CryptoGames/DH/X25519Group.lean`,
`CryptoGames/KEM/MlKem.lean`, `CliRun.lean`, and `CliProcess.lean`, whose definitions are all unfolded and which say **Trusted:
definitions used by the statement.** The Tier-2 files of `Symbolic/Specifications/`, which only the ELF-direct
headlines of `Symbolic/Theorems/` unfold, are listed directly in `trusted_banners.csv`.

| File | Names the theorems of `CliElfLib` unfold (`Main` and `L4` in `Computational/Theorems/Main.lean` the same, and `SymRefines` and `SymSecure` the same except that they unfold nothing of `SmDir.lean`) |
|---|---|
| `LibsignalBinary/Specifications/CryptoGames/AEAD/Aes256.lean` | `aes256Enc`, `aes256Dec`, and the FIPS 197 cipher / key-schedule definitions they call (all its definitions) |
| `LibsignalBinary/Specifications/CryptoGames/Hash/Sha512.lean` | `sha512CompressState` and the FIPS 180-4 round / schedule definitions it calls (all its definitions) |
| `LibsignalBinary/Specifications/CryptoGames/Hash/Keccak.lean` | `KeccakState`, `keccakRoundConstants`, `keccakRhoOffset`, `laneGet`, `keccakF1600Round`, `keccakF1600`, `keccakZeroState`, `packLane64`, `unpackLane64`, `keccakAbsorbBlock`, `keccakPadBlocks`, `keccakAbsorb`, `keccakExtractRate`, `keccakSqueezeBlocks`, `keccakSponge`, `sha3_256List`, `sha3_512List`, `shake256List` (18 of its 24 definitions; `sha3_256`, `sha3_512`, `shake256`, `shake128List`, `keccakPermuteN`, and `shake128BlockAt` are outside the headline closures) |
| `LibsignalBinary/Specifications/CryptoGames/DH/X25519.lean` | `x25519Ref`, `x25519PubFromSecretRef`, `x25519Basepoint`, and the RFC 7748 Montgomery-ladder / Curve25519 field definitions they call (all its definitions) |
| `LibsignalBinary/Specifications/CryptoGames/DH/X25519Group.lean` | `twistOrderL`, `x25519ZeroKey`, `x25519BaseKey`, `isX25519SubgroupKey`, `X25519Pt`, `publicKeyFintype`, `x25519BasePt`, `x25519Dh`, `x25519EncT`, `x25519EncPt`, `x25519DecT`, `x25519Delta`, and the `DecidableEq`/`Zero`/`SampleableType` instances on `X25519Pt` (all its definitions; `Main` only) |
| `LibsignalBinary/Specifications/CryptoGames/KEM/MlKem.lean` | `mlkem768Incremental`, `kyber1024EncapsVec`, `kyber1024DecapsVec`, the `SampleNTT` seed-termination predicates `Shake128SeedTerminates`, `Shake128MatrixTerminates`, `Mlkem768FromSeedTerminates`, `Mlkem768Encaps1Terminates`, `Mlkem768DecapsTerminates`, `Kyber1024EncapsTerminates`, `Kyber1024DecapsTerminates`, and the FIPS 203 ML-KEM-768 / Kyber-1024 definitions they call (all 63 of its definitions) |
| `LibsignalBinary/Specifications/RecordCodecs/Proto.lean` | `IdentityKeyPairStructure`, `PreKeyRecordStructure`, `SignedPreKeyRecordStructure` and the `encode` of each, `encodeProto3BytesField`, `encodeProto3Fixed64Field`, `encodeProto3Uint32Field`, `le64Bytes` (10 of its 29 definitions) |
| `LibsignalBinary/Specifications/SignalSession/SmDir.lean` | `partyAddress`, `textBytes` (2 of its 11 definitions; `Main` and `L4` only) |
| `LibsignalBinary/Specifications/SignalSession/CliRun.lean` | `CliHooks` (its sole definition, unfolded in `SymRefines` and `SymSecure`; legacy `writeFileHook`, `writeStdoutHook`, and `PathOk` helpers moved to `LibsignalBinary/Proofs/SpecLemmas/SignalSession/IoHooksLegacy.lean`; see §2) |
| `LibsignalBinary/Specifications/SignalSession/Process.lean` | `processInputs` (all but `ProcessResult`; see §2) |
| `LibsignalBinary/Specifications/SignalSession/CliProcess.lean` | `OutcomeMatchesProcess`, `abortOnPanic`, `cliProcessInputs`, `sigAbrt` (all 4 of its definitions; see §2) |

`LibsignalBinary/Specifications/LibsignalHmac.lean`, `LibsignalBinary/Specifications/LibsignalE2E/HooksCommon.lean`,
`LibsignalBinary/Specifications/LibsignalE2E/HooksMallocng.lean`,
`LibsignalBinary/Specifications/LibsignalE2E/PqxdhHooksCommon.lean`, `LibsignalBinary/Specifications/LibsignalSpqrV1/TokenNames.lean`, and `LibsignalBinary/Specifications/RustHeap/Vec.lean`
are **Checked by Lean.**: no headline unfolds any of their definitions
(under the ELF-direct panic-only `cliProgElf`, `0` external hooks; `TokenNames.lean` holds only the demangled names used by untrusted placed proofs). `CliElf.lean`, `CliBinaryPq.lean`, `PqDirNoMatch.lean`, and
`StatementPqElf.lean` are T files (`defaultStatementFiles`, counted in §1); `Process.lean`,
`CliRun.lean`, and `CliProcess.lean` are Tier 2 (while `CliLabels.lean` and `CliExternsFixed.lean`
are under `Proofs/`, **Checked by Lean.**).

Rule 5 of `scripts/TrustedClosure.lean` (`specImportClosureViolations` over `.olean` import headers, alongside the internal CI spec-import lint) enforces that no file across `{Computational,LibsignalBinary,Symbolic}/Specifications/` imports (directly or transitively) any non-`Specifications/` repository module (`Proofs/`, `Theorems/`, `Tests/`, `Heap/`, etc.) or `Arm64.Legacy*`; [`Computational/scripts/check_computational_deps.py`](../scripts/check_computational_deps.py) checks
that no file of `Computational/Specifications/` imports a proof, a theorem, or a test and that each
theorem's body in `Computational/Theorems/` is its `_proof` (rules 2 and 3), while
[`comparator/run.sh`](../../comparator/run.sh) verifies every computational and symbolic headline
against its challenge statement with `std3`-only kernel axioms.

One statement file (**Trusted: the statement.**) holds definitions that only the theorems of
`CliElfLib` unfold, and two shared `LibsignalBinary/Specifications/` Tier-2 files have more names in those closures than in the default
one (`HooksCommon.lean`, `HooksMallocng.lean`, and `PqxdhHooksCommon.lean` have `0` unfolded definitions on the stock ELF with `0` non-panic external hooks, DEV-E7):

| File | Names the theorems of `CliElfLib` unfold beyond the default closure |
|---|---|
| `LibsignalBinary/Specifications/SignalSession/PqDirNoMatch.lean` | `AgreeExcept`, `OutcomeMatchesModelExceptPath` (2 of its 3 definitions; `CliBinaryPq.lean` states `CliSpecPqxdhNoMatchOrExcusedAbort` directly over them) |
| `LibsignalBinary/Specifications/LibsignalTripleRatchetRepr.lean` | `errTag` |
| `LibsignalBinary/Specifications/LibsignalAesCbc.lean` | `blockToBytes`, `bytesToKey` (`returnToLinkRegister` is in no headline closure) |

Reductions in the costed security statements are deep-embedded `ReductionDsl` programs (`CostedReduction` and
`TwoStageCostedReduction` from `Computational/Specifications/Reductions/ReductionDsl/Core.lean`) whose polynomial step cost (`totalCost`),
oracle-query counts (`totalQueries`), and value-size honesty (`OpsSizeHonest`, `SampSizeHonest`,
`CostedOpsSizeHonest`, `CostedSampSizeHonest`, `GRedBounded`, `GRedCostByKind`, `GRed2CostByKind`,
`PqOpsSizeHonest`,
`PqSampSizeHonest`, `GRedBlockBounded`, `GRed2BlockBounded`) are checked by Lean; the concrete
reduction programs reside in `Computational/Proofs/SignalPqxdh/Security/ReductionDsl/`, `Computational/Proofs/ReductionDsl/`, and `Computational/Proofs/E2E/Dsl/`
outside the trusted base, guarded by `Computational/Tests/Guards/HeadlineAtomicOpsGuard.lean` and `Computational/Tests/Guards/HeadlineSamplersGuard.lean`.

### Full name lists for banners that point here

When a **Trusted in part.** file uses too many definitions to list inline in its module banner, the
banner points here (and `trusted_banners.csv` records the complete machine-generated list for every
module). Each row below lists the file's `trusted_names` from the default `scripts/TrustedClosure.lean`
run, followed by any definitions that only the `CliElfLib` headlines unfold, marked ELF-only:

| File | Unfolded definitions (`trusted_names`) |
|---|---|
| `LibsignalBinary/Specifications/CryptoGames/AEAD/WireAeadDefs.lean` | `WireAEAD`, `WireAdversary`, `WireCodec`, `WireState`, `idealEnc`, `libsignalReceiveWire`, `libsignalWireAead`, `wireDecrypt`, `wireEncode`, `wireEncrypt`, `wireOtccaAdvantage`, `wireOtccaGame`, `wireSpec` (13 of 14 definitions; `toWireEnc` is outside the closure) |
| `LibsignalBinary/Specifications/CryptoGames/Ratchet/LibsignalSMInstance.lean` | `LibsignalCiphertextWithSalt32`, `LibsignalMsgPublicPart`, `LibsignalWireOracleSpec`, `Salt32`, `X25519RealizesDh`, `configR1OnCurve`, `dummyKey`, `lChainPRG`, `lSaltPRF32`, `lWire`, `macForgeryProb`, `ratchetKeyAdmissible`, `vec32` (13 of 33 definitions) |
| `Computational/Specifications/Reductions/ReductionDsl/TargetCodecs.lean` | 114 definitions in the default closure plus 3 ELF-only definitions (`E2EAdapterTag`, `e2eAdapterCodec`, `e2eAdapterIface`) = 117 of 122 definitions: all L1, L2, L3, and CLI-adapter target `Iface`s, `GameCodec`s, tag inductives, and sort/value bijections (`coinOnlyBaseIface`, `coinOnlyIface`, `extractPtPrfBaseIface`, `extractPtPrfIface`, `extractPtPrfCodec`, `atomicPrfIface`, `atomicPrfCodec`, `pqAtomicSig`, `pqAtomicOps`, `pqAtomicSamplers`, `PTag`, `pqPrimIface`, `pqSigAndDdhIface`, `pqKeyIndCodec`, `keyIndCodec`, `saltPrfTargetIface`, `wireOtccaTargetIface`, `slotOtccaTargetIface`, `slotOtccaCodec`, `fsaeadPubTargetIface`, `fsaeadPubCodec`, `fsaeadRatchetCodec`, `ckaTargetIface`, `prngTargetIface`, `fsaeadHeaderIface`, `fig8SmIface`, `fig8SmIfaceDF`, `fig8SmCodec`, `fig8SmCodecDF`, `e2eSessionCodec`, `prefixCtxT`, `e2eKeyIndTargetIface`, `e2eSessionTargetIface`, `e2eCtlSpec`, `e2eDrSpec`, `e2eComposedGameSpec`, `e2eGameCodec`, plus their tag/codec helpers and ELF-only `e2eAdapterIface`, `e2eAdapterCodec`, `E2EAdapterTag`; only the three unused leaf interfaces `aes256PrfIface`, `hmacPrfIface`, `leafSigAndDdhIface` and the `SignalPqxdh.Costed` aliases `PU32` and `keyIndCodec` at EOF are outside the headline closures) |

## 4. What Lean does not check, so you check it by reading

1. **The `ReductionDsl` interpreter, unified atomic operator/interface/codec modules, and CLI-boundary
   relabelling.** Every reduction program in PQXDH (`KeyIndCostedReductionFamily S` in
   `Computational/Specifications/Pqxdh/Security/Headline.lean` and `HeadlineDelta.lean`, `Auth1KeyCostedReductionFamily S` in `Computational/Specifications/Pqxdh/Security/Auth/Headline.lean`, and the standalone `KeyInd2KeyCostedReductionFamily` and `AuthCostedReductionFamily` in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`, witnessed in
   `Computational/Proofs/SignalPqxdh/Security/ReductionDsl/`) and in the Double Ratchet, SM, FS-AEAD, CKA, PRNG,
   `DeliverForge`, epoch-0 / uniform-start PRG distinguishers, and E2E stack (`Fig8CostedReds`, `FsCostedReds` in
   `Computational/Specifications/Session/ACD19/Ratchet/LibsignalBound.lean`,
   `SessionCostedReductions` in
   `Computational/Specifications/Session/StatementComposed.lean`, `SpkCostedReds` in
   `Computational/Specifications/Session/StatementSpkModel.lean`, `CliToModelAdapterProg` in
   `Computational/Specifications/Game/StatementBinaryHarnessCore.lean`, and
   `CompositionCostedReductionFamily` in
   `Computational/Specifications/Reductions/Pqxdh/StatementPqReds.lean`, witnessed in
   `Computational/Proofs/ReductionDsl/` and `Computational/Proofs/E2E/Dsl/`) is an
   untrusted deep-embedded `ReductionDsl` program (`CostedReduction` or `TwoStageCostedReduction`) in `Computational/Proofs/` whose runtime step
   cost (`totalCost`), program size (`.size`), oracle query counts (`totalQueries`), and 32-byte block value-size bounds
   (`OpsSizeHonest`, `SampSizeHonest`, `CostedOpsSizeHonest`, `CostedSampSizeHonest`, `GRedBounded`,
   `GTwoStageBounded`, `GRed2Bounded`, `GRedCostByKind`, `GRed2CostByKind`, `PqOpsSizeHonest`,
   `PqSampSizeHonest`, `GRedBlockBounded`, `GRed2BlockBounded`) are
   machine-checked by Lean. To trust that these
   bounds assign honest atomic primitive/oracle costs and run the adversary once with polynomial overhead,
   you read the 3,573-line (2,842 code-line) 4-file `ReductionDsl` specification (`Core.lean`,
   `Samplers.lean`, `AtomicOps.lean`, and `TargetCodecs.lean` in
   `Computational/Specifications/Reductions/ReductionDsl/`) and the PQXDH, Ratchet, SPK, and E2E budget definitions
   (`Computational/Specifications/Pqxdh/Security/CostedBudgets.lean`,
   `Computational/Specifications/Session/ACD19/Ratchet/LibsignalBound.lean`,
   `Computational/Specifications/Session/StatementSpkModel.lean`,
   `Computational/Specifications/Game/StatementBinaryHarnessCore.lean`).
2. **The fixed-test terms are small.** `macForgeryProb`, `forgedEpochStartSpuriousStepTerm`, `spuriousStepTerm`, `eps0IdealUnit`, `epoch0ChainForgeryTerm`, `spkSwapSpuriousStepTerm`, and the second half of `epoch0Term` are
   non-uniform suprema over fixed tests of concrete HMAC, HKDF, and X25519 (with chain counter `c < 2^32` and wire length `ser.length < 2^32` across all of them, checked by `Computational/Tests/Guards/MacSupCapsGuard.lean`), not advantages of efficient adversaries. In particular,
   restricting `c < 2^32` and `ser.length < 2^32` makes `macForgeryProb` and the companion spurious-step / epoch-0 forgery suprema non-vacuous in the random-function
   heuristic (for an idealized random function `{0,1}^256 × {0,1}* → {0,1}^64`, the unbounded
   supremum over all `ser` is `1` almost surely, whereas over `ser.length < 2^32` Chernoff plus a
   union bound concentrates it at `≈ 2^-64` almost surely), while computational PRF security of
   `hmacScheme F` alone still does not bound a non-uniform supremum; for concrete `hmacWith F`,
   `macForgeryProb F ≈ 2^-64` rests on pointwise key-regularity (min-entropy) of the compression
   function `F` — that no
   finite-state inner block-chain map `g_m : ShaState → ShaState` correlates
   `g_m(F(IV, k₀ ⊕ ipad))` with `F(IV, k₀ ⊕ opad)` to bias
   `trunc₆₄(F(F(IV, k₀ ⊕ opad), pad₉₆(g_m(s₀(k)))))` under uniform `k` (DEV-LS23). Separately,
   `δ` is a parameter that the hypothesis `_hδ` ties to the key-collision probability. `macForgeryProb` is at
   least `2^-64` for every choice of primitives (an 8-byte tag), which sets the 8-byte MAC tag floor
   of the bound ([`READING_THE_THEOREMS.md`](READING_THE_THEOREMS.md), DEV-LS31). In `StatementComposed.lean` and
   `StatementSession.lean` (`fig8MixShortAuthV1`, `fig8MixShortPrivV1`, `hiddenSaltMixtureBound`,
   `fsAeadMixtureBound`, `fsAeadAuthMixtureCompBound`, `fsAeadAuthSlotSumBound`), non-honest
   wire-MAC forgeries are hoisted out of the `(t, j)` loop so `4 * macForgeryTerm Z q = 4 · q · macForgeryProb`
   is paid once per last-leak bucket (`8 · q · macForgeryProb` across honest-header and forged-header
   modes in `fig8MixShortAuthV1`), once per privacy challenge-epoch FS-AEAD instance (`fig8MixShortPrivV1`),
   and once per `DeliverForge` boundary cell or `(tL, par)` parity bucket (`hiddenSaltMixtureBound`).
   Together with the companion spurious-step and epoch-0/SPK 8-byte tag-test terms, the per-session
   contribution grows linearly in `qep` and `q` as `(92 · qep + 96) · q · 2^-64` for `qep ≥ 1`
   (`112 · q · 2^-64` at `qep = 0`, e.g. `≈ 2^-12.47` across `2^25` promoted sessions at
   `q = qep = 1,024`). Compared to the earlier per-`(t, t_L, j)` cell bound, this bucket partition
   is formally incomparable rather than a strict tightening: it drops the MAC term from
   `O(qep² · q² · μ)` to `O(qep · q · μ)` in exchange for up to `1.95×` more PRF-PRNG terms, up to
   `1.74×` more FS-AEAD terms (for `q ≥ 1`; `2.33×` at `q = 0, qep = 1`), and a re-indexed, enlarged
   reduction family under `ratchetCostBudget q (qep + 1)` (DEV-C14).
3. **The closed primitive specifications, process/syscall model, and `.symtab` labels match the real standards, OS, and ELF** (tier 2–3, §3 & §5), for the theorems of
   `Computational/Theorems/Main.lean` (`cliProgElf` intercepts only the `18` Rust panic symbols as `SIGABRT` via `cliPanicOverrides`, DEV-E7, with `0` non-panic external hooks, so the theorems of `Main.lean` use no external hook model, and the argued DEV-E1 applies only to the proof-side fixed-image table `cliHookTable`; the 23 function addresses — 18 panic entries and 5 `SampleNTT` entries — are resolved by name from the pinned ELF's `.symtab` via `resolveCliElfAddrs`).

For the PQXDH (`PqxdhCorrectAndSecureδ`), leaked-SPK, PQXDH-mode CLI, and model-level composed
(`StatementComposed.lean`, `StatementModel.lean`) headlines, you likewise check: (1) the unified
`ReductionDsl` atomic operators, coin-only samplers, target interfaces, and game codecs
(`Computational/Specifications/Reductions/ReductionDsl/{AtomicOps,Samplers,TargetCodecs}.lean`),
together with the PQXDH budgets (`CostedBudgets.lean`), the leaked-SPK reduction types and budgets
(`StatementSpkModel.lean`: `spkLeakRedUBudget`, `spkHopBudget`), and the multi-session E2E composition and CLI-adapter reduction bundles and budgets
(`StatementPqReds.lean` and `keyIndReductionBudget` / `bhAdapterCostBudget` / `bhE2ECostBudget` in
`StatementBinaryHarnessCore.lean`); (2) the leaked-SPK
terms (`epoch0ChainForgeryTerm`, `spkSwapSpuriousStepTerm`, `spkSwapCreationPointHitTerm`, `hop2CreateCollTerm`, `spkSwapHiddenScalarGuessTerm`), the
PQXDH collision/KEM-correctness terms (`pqxdhKeyIndAdvantageBoundActiveδ S b.q_on δ_kem 0 0 0` and `kemDecapsFailureTerm S δ_kem`
in `Bound.lean` and `HeadlineDelta.lean`), and the SPQR V1 hidden-salt and ML-KEM failure terms
(`hiddenSaltMixtureBound` in `StatementComposed.lean` and `2 * sessionKemFailProb` in `SessionSecure` /
`2 * CliKemFailProb` on both clauses of `CliPqxdhSecurityFor`, over `MlKem.tapePairFails` and `MlKem.KemFailBad`
in `KemFailFind.lean`, DEV-LS36, DEV-KFF1); and (3) for the ELF theorems, the 9 closed primitive
specifications of `realPEParams` (`realCrypto`, `realPqxdhPrims`) and `.symtab` resolver `resolveCliElfAddrs` in `CliBinaryPq.lean` and `StatementPqElf.lean` (`0` non-panic external hooks on the stock ELF, with only the `18` Rust panic entry points intercepted as `SIGABRT`, DEV-E7: SHA-256 `sha256Compress`, FIPS 197 `aes256Enc`/`aes256Dec`, RFC 7748 `x25519Ref`/`x25519PubFromSecretRef` over `x25519Basepoint`, FIPS 180-4 `sha512CompressState`, Kyber-1024 `kyber1024EncapsVec`/`kyber1024DecapsVec` over FIPS 202 `CryptoGames.SHA3`, and FIPS 203 `mlkem768Incremental`).

## 5. Tier 3: the shared foundations and tools

- **Lean's kernel and std3.** Standard (`propext`, `Classical.choice`, `Quot.sound`).
- **No `bv_decide` or compiler-trust axioms.** No headline theorem depends on a `bv_decide`
  certificate axiom (`<lemma>._native.bv_decide.ax_…`) or any compiler-evaluation axiom
  (`ofReduceBool`, `ofReduceNat`, `trustCompiler`):
  [`comparator/run.sh`](../../comparator/run.sh) (and
  [`arm64-semantics/scripts/axiom-audit`](../../arm64-semantics/scripts/axiom-audit)) fail-closed
  enforces that every headline's axiom cone is a subset of `std3`, and
  [`scripts/trusted-closure.sh`](../../scripts/trusted-closure.sh) reports each headline's exact
  kernel axioms (`## Axioms` in `trusted_closure.md`) for inspection. Trusting the headlines does
  not require trusting Lean's compiler or runtime on SAT-certificate checks.
- **Mathlib and VCVio**, at the versions pinned in [`lake-manifest.json`](../../lake-manifest.json). VCVio provides the probability
  monad, `boolBias` (the advantage), and `PRGScheme`.
- **`arm64-semantics`**, the AArch64 instruction semantics, memory model, and image loader, pinned as
  a git submodule (commit `b62b68b0`, tag `v0.56.1`).
  The engine's own `Arm64/Trusted/*` and `Specs/*` trees are self-contained (trusted modules import
  no proof or testing module) and free of soundness escapes (`axiom`, `sorry`, `bv_decide`,
  `native_decide`, `unsafe`, `@[implemented_by]`, `@[extern]`), with zero theorems in `Spec`
  modules. Its syntax and semantics follow the Arm Architecture
  Reference Manual A64 encoding classes and ASL specification ([`arm64-semantics/README.md`](../../arm64-semantics/README.md)), and it is
  differentially tested against Unicorn (QEMU's AArch64 core), the Sail Armv9.4-A model, and LLVM's
  assembler. Overrides run through `Step.extern`, which faults if an override changes a frozen byte or the
  symbol table. The default library's closures use 1 engine file (`VerifiedLibraries/Common/Spec/Curve25519.lean`, 2 constants, 5 lines, 4 code lines); the
  closure of `libsignalCliPqSecure_holds` uses 4 `Arm64/Trusted/*` files (56 constants, 278 lines, 107 code lines) plus `VerifiedLibraries/Common/Spec/Curve25519.lean` (47 constants, 136 lines, 99 code lines).
  The theorems of `CliElfLib` also use the trusted ELF process loader and symbol-override layer
  (`Process/Loader.lean`, `Process/Overrides.lean` [30 constants], `Process/Semantics.lean`, `Process/Types.lean`),
  the instruction semantics (`ISA/*`), the system calls
  (`Syscalls/*`, including `Syscalls/Fs/ReadWritev.lean`), and
  definitions from one engine file outside `Arm64/Trusted/`: `EdPoint` / Curve25519 field
  definitions from `VerifiedLibraries/Common/Spec/Curve25519.lean` (49 constants, 145 lines / 105 code
  lines). Neither `ProofLib/Placed/Multi.lean`, `Arm64/Trusted/Object/{Labels,Placed}.lean`,
  `Arm64/Trusted/Process/Placed.lean`, `VerifiedLibraries/Mallocng/Spec/PlacedLib.lean`, nor
  `ProofLib/Hoare/{LibcHooks,MultiCodeROHook}.lean` is in any headline's trusted closure.
  In all, the 8-theorem union has 41 engine files, 1,450 unfolded constants, and 9,031 lines (6,763 code
  lines): 40 under `Arm64/Trusted/` (1,401 constants, 8,886 lines, 6,658 code lines), plus the 1 file outside `Arm64/Trusted/` (`VerifiedLibraries/Common/Spec/Curve25519.lean`, 49 constants, 145 lines, 105 code lines). None of the 8 closures unfolds a definition of the engine's
  `Arm64/Legacy/Object/{LinkedImage,Loader}.lean` or the engine's testing loader `Arm64/Testing/Harness/ElfRegionLoad.lean`.

  **Scatter/gather stdio syscalls (`readv` / `writev`).** `Syscall.standard` models `readv` (65) and `writev` (66) as scatter/gather stdio I/O (`Syscalls/Fs/ReadWritev.lean`, trusted). On the pinned stock `ld.lld` ELF (SHA-256 `f35c326d…`), `llvm-objdump -d` finds 32 `svc` sites, none issuing `readv`; the single `writev` site (`0x479578`) is in musl's `__stdio_write` (`0x4794bc`), whose address appears as a data pointer only in the `write` slot of `__stderr_FILE` (`0x4cd028` in `.data`), and no instruction branches to it directly. Measured, not kernel-checked; no theorem relies on it.
- **Trust shift: ELF-direct execution (`.symtab` resolution instead of library placement).**
  The ELF headlines (`Main`, `L4`, `SymRefines`, `SymSecure`) execute directly on the parsed ELF image `cliElfBytes`, starting from plain `elf.loadState (cliProcessInputs i)` with no initial `.data` patch, without quantifying over a `MultiPlacement` or importing `rust-obj2lean`'s generated object bundle.
  - **What left the trusted base:** `libsignalSessionLib` / `libsignalSessionMultiLib`, `GeneratedLean.LibsignalSessionPlacedObj` (+ `Shard0..31`, 85,724 lines), `GeneratedLean.LibsignalSessionExtractedObj` (11,300 lines), `ProofLib/Placed/Multi.lean` (`DataDisjoint`), `Arm64/Trusted/Object/{Labels,Placed}.lean`, `Arm64/Trusted/Process/Placed.lean`, `LinkedAt` / `LinkedIn` (`libsignal_cli_elf_linked_in`), `CliLabelsFromObjects` / label gate A (`libsignal_cli_labels_from_objects`), `Placed.CliElfCodeMatchesPlaced`, `DirectOrBranchStub`, `LibsignalSpqrV1/TokenNames.lean`, assumption `A-LINK` as a headline requirement, and initial `.data` patching for SPQR's CPU probe (SPQR's linked `Once::call` probe now runs on the modelled `AT_HWCAP = 0x1b` auxv). Tier 3b (`generated`) is now **0 files / 0 constants / 0 lines**.
  - **What entered the trusted base:** engine `Arm64.Trusted.Process.Overrides` (`parseSymtabFull`, `resolveSym`, `overrideProgram`, 30 constants — already part of the engine's `Arm64/Trusted/` tree), together with `CliElfAddrs`, `resolveCliElfAddrs`, `cliPanicOverrides`, `cliProgElf`, `CliRunsToElf`, and `cliRunElf` in `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean`.
  - **The remaining trust point:** the pinned ELF's `.symtab` accurately labels the `23` resolved function addresses: the `18` Rust panic entry points (`cliPanicSymbolsPlaced`, intercepted with `abortOnPanic`) and the `5` `SampleNTT` entry points (`kyberEncapsElfSym`, `kyberDecapsElfSym`, `mlkemFromSeedElfSym`, `mlkemEncaps1ElfSym`, `mlkemDecapsElfSym`, naming the seed-divergence excuse). Every other instruction is fetched directly from the plain loaded ELF memory.
  - **Off-TCB kernel-checked cross-checks:** `LibsignalBinary.Proofs.SpecLemmas.SignalSession.ElfDirectBridge.cliElf_symtab_agrees_with_placement` proves in Lean's kernel that all `23` `.symtab`-resolved addresses coincide with the unique `libsignalSessionLib` placement (`ElfPlaced.cliElf_linkedIn`) and that `cliProgElf` has the exact same `externAt?` and `Step` relation as the placed program, while untrusted `CliLabelsFromObjects` (`LibsignalBinary/Proofs/Placed/CliLabels.lean`) and `scripts/stock-pin/alink_check.py` remain built and checked in CI.
- **The extern interception model** (theorems of `CliElfLib` only). On the stock `ld.lld` ELF, `cliProgElf` (`CliBinaryPq.lean`) uses `overrideProgram execSyscall cliPanicOverrides addrs.panicAddrs` to intercept only the `18` mangled Rust panic symbols of `cliPanicSymbolsPlaced` as `SIGABRT` (DEV-E7; `0` non-panic external hooks; the empty audit table `cliHookTablePlaced` and the 55-symbol audit list `cliDehookedSymsPlaced` live in untrusted `LibsignalBinary/Proofs/Placed/CliBinaryPqPlaced.lean`), while `realPEParams` (`realCrypto`, `realPqxdhPrims` in `CliBinaryPq.lean`, and `realCliHooks : CliHooks` in `ElfBinding.lean`) fixes the closed specification-level primitive bundle (SHA-256, FIPS 197 AES-256, RFC 7748 X25519, FIPS 180-4 SHA-512, Kyber-1024 / FIPS 202 SHA-3, and FIPS 203 ML-KEM-768).
  De-hooked, so the linked ELF bytes execute directly from loaded memory: all `55` external symbols listed in untrusted `cliDehookedSymsPlaced` — the
  `5` `__rust_*` allocator shims wired to `VerifiedLibraries.mallocngLib` (discharged proof-internally via `cliElf_mallocng_linkedIn`), `read_file`,
  `read_stdin`, `write_file`, and `write_stdout` in `SignalSessionIoPlacedObj` proved against musl
  `open`/`read`/`write`/`close`/`__errno_location` in `LibsignalBinary/Proofs/{SignalSession/CliIo,HookDischarge/CliIoFmt}/`,
  `memcpy` and `memset` executed as `VerifiedLibraries.mallocngLib` blocks `20` and `21`,
  `memmove`, `bcmp` (with the `memcmp` it tail-calls), `strlen`, `memrchr`, `from_utf8`,
  `core::fmt::write` (with its `7` `core::fmt::Formatter::{write_str, pad}` and `<str / u8 / u32 / u64 / usize as Display>::fmt` externs),
  `alloc::fmt::format::format_inner`, `duration_since`, `SystemTime::add`, `subtle::black_box`,
  the two X25519 `Drop::drop` destructors (`StaticSecret`, `SharedSecret`), the two X25519 operations
  (`<PublicKey as From<&StaticSecret>>::from`, `StaticSecret::diffie_hellman`), the `7` `curve25519_dalek`
  Ed25519/scalar operations, `libcrux_ml_kem` Kyber-1024 (`mlkem1024::kyber::{encapsulate, decapsulate}`)
  and all `7` `mlkem768::incremental` functions (`KeyPairCompressedBytes::{pk1, pk2, from_seed}`,
  `encapsulate1`, `encapsulate2`, `decapsulate_compressed_key`, `validate_pk_bytes`),
  `sha2::sha256::compress256`, `sha2::sha512::compress512`,
  `libcrux_hmac::hmac` (with its `libcrux_sha2::hacl::*` SHA-256 helpers),
  `cpufeatures::aarch64::getauxval_hwcap`,
  `std::sys::sync::once::futex::Once::call` (executing SPQR's CPU-feature probe on `AT_HWCAP = 0x1b` and selecting the ARMv8 `PMULL` GF(2¹⁶) path), and
  `signal_crypto::aes_cbc::aes_256_cbc_encrypt` and `aes_256_cbc_decrypt` (running with `aes` 0.9.1
  `autodetect::Aes256` ARMv8 hardware AES + `fixslice64`) — plus `<String as Clone>::clone`.
  By definition of `cliProgElf addrs = overrideProgram execSyscall cliPanicOverrides addrs.panicAddrs`, interception (`externAt? a ≠ none`) occurs exclusively at the `18` resolved panic addresses `addrs.panicAddrs`, so every non-panic instruction executes its loaded ELF bytes directly. DEV-E6 and DEV-E8
  record the allocator and AES-256-CBC cutovers; DEV-E1, E3, CLI4, CLI8, and CLI19 apply only to the
  proof-side fixed-image hook table `cliHookTable`. The bump allocator (`E2E.allocHook0`,
  `E2E.reallocHook0`, `E2E.allocZeroedHook0`, the never-freeing `E2E.deallocHook`, in
  `LibsignalBinary/Proofs/SpecLemmas/SignalSession/HooksCommonLegacy.lean`) remains a fixed
  model only for the proof-side fixed-image helpers over `cliHookTable`
  (`LibsignalBinary/Proofs/SpecLemmas/SignalSession/CliRunFixed.lean`), which
  are outside the closure of `Computational/Theorems/`: the headline theorems use panic-only
  `cliProgElf` and execute the linked `mallocng` allocator bytes directly (DEV-E6; the fixed table
  also meets the live-token extern contracts `cliExterns_ok` in
  `LibsignalBinary/Proofs/SignalSession/Cli/CliExternsWitness.lean`).
  **AES-256-CBC is de-hooked on the stock ELF (DEV-E8).** In the ELF headlines,
  `signal_crypto::aes_cbc::aes_256_cbc_encrypt` and `aes_256_cbc_decrypt` (`lib2_10.o`),
  `cpufeatures::aarch64::getauxval_hwcap` (`lib2_12.o`), and the `aes` 0.9.1 `autodetect::Aes256`
  implementation (`lib2_9.o` + monomorphized `aes::armv8` `AESE`/`AESD`/`AESMC`/`AESIMC` routines in
  `lib2_10.o` selected at `AT_HWCAP = 0x1b`, with `fixslice64` fallback) execute from `.text.lib2` and
  are verified against `aesCbcEncrypt` / `aesCbcDecrypt` at the trusted FIPS 197 block cipher
  `CryptoGames.AES256.{aes256Enc, aes256Dec}` (`LibsignalBinary/Specifications/CryptoGames/AEAD/Aes256.lean`);
  whole-function `aesEncHook0` / `aesDecHook0` and `aesEncHookMallocng` / `aesDecHookMallocng`
  (`LibsignalBinary/Proofs/E2E/AesHooks0.lean`) remain only for proof-side fixed-image statements.
  Not hooks: the `uuid`, `prost`, and `spqr` crates are compiled into the image, so
  `Uuid::try_parse`, prost's `decode_varint_slow` / `DecodeError::from` / `push`, and
  `spqr::recv` / `spqr::decode_state` are code the proofs execute. What you read instead are two
  tier-2 models the statement fixes: `uuidTryParse` (`LibsignalTripleRatchetRepr.lean`, a transcription
  of uuid 1.26.1 `src/parser.rs`), which names the parties' addresses, and `spqrOffB`
  (`LibsignalE2E/State.lean`, the empty-state preamble check of `spqr::recv`, DEV-LS24).
  **`bcmp` executes linked musl code.** `bcmp` (the libc byte compare LLVM emits for byte-slice
  `==`) executes musl's `bcmp` (and the `memcmp` it tail-calls) directly from the pinned ELF bytes.
  **DEV-E1, argued, not proved (proof-side `cliHookTable` only; `cliProgElf` is panic-only).** The legacy hooks of `cliHookTable` (e.g. `writeStdoutHook`, outside the ELF headlines) preserve every
  register they do not output, while a real libc may clobber all caller-saved state (`x0`–`x18`,
  caller-saved SIMD/FP registers, NZCV flags). A caller that relied on
  one of those surviving would still verify. That none does is argued, not machine-checked: correct
  compiler output never relies on a caller-saved register across a call, and the reached call sites
  read only the outputs. For the proof-side fixed-image extern table,
  `CliExternsFixed.lean` states per-row contracts `CliExternsOk`, where only callee-saved registers survive a call (DEV-E1).
- **Symbolic CLI refinement extern hypotheses.**
  The symbolic refinement statement
  ([`Symbolic/Specifications/Refinement/Statement.lean`](../../Symbolic/Specifications/Refinement/Statement.lean), outside the closures of
  `Computational/Theorems/`) assumes only the machine-free crypto laws
  `ExternContractsHoldCli` (`ExternCryptoLawsHold` and
  `X25519TorsionShiftsRejected`), tied to the CLI's primitive hooks
  (`LibsignalBinary/Specifications/SignalSession/CliRun.lean`) and the 9 closed primitive specifications
  (SHA-256, FIPS 197 AES-256, RFC 7748 X25519, FIPS 180-4 SHA-512, Kyber-1024 / FIPS 202 SHA-3, and FIPS 203 ML-KEM-768)
  by `HooksMatchInterpretation` / `HooksMatchPlaced` and `realCliHooks` / `RealHooksAgreeOnInput`
  ([`Symbolic/Specifications/Refinement/ElfBinding.lean`](../../Symbolic/Specifications/Refinement/ElfBinding.lean)), with no assumed contracts on
  in-image code. Per-call `RealHooksAgreeOnInput W i` combines `ElfGuard.DirsAgreeOnInput` (encoded
  party key-file and spec-domain agreement with `realCliHooks`) and `ElfGuard.ModelAgreesOnInput`,
  guarding both `elfRel` and `CliElfProgress` (both guards simplify to `True` when
  `W = realCliHooks`). In addition, `Proven.Refinement.real_prims_admissible` proves
  `RealPrimsAdmissible` (`∃ interp, ExternContractsHoldCli interp ∧ RealPrimsMatch interp`), and
  `Proven.Refinement.comp_refines_cli_real` / `Proven.Security.signal_session_secure_real` state
  refinement and security directly over the unfiltered run relation `elfRelReal` at `realCliHooks`
  (`0 sorry`, `std3` axioms; §7).

### Off-TCB build provenance, object-level label cross-check, and stock `ld.lld` link check (`alink_check.py`)

Neither `rust-obj2lean` nor `CliLabelsFromObjects` nor assumption `A-LINK` is part of the ELF-direct
headlines' trusted base (`GeneratedLean.*` has `0` files in every headline closure). They remain
built and checked in CI as independent cross-checks that the pinned stock `ld.lld` ELF was built
reproducibly from source and that its `.symtab` labels match the pre-link Rust objects:
- `LibsignalBinary.Proofs.SpecLemmas.SignalSession.ElfDirectBridge.cliElf_symtab_agrees_with_placement` checks in Lean's kernel that all `23` `.symtab`-resolved addresses of `resolveCliElfAddrs` coincide with the unique `libsignalSessionLib` placement (`ElfPlaced.cliElf_linkedIn`);
- `LibsignalBinary/Proofs/Placed/CliLabels.lean` (`CliLabelsFromObjects`, over `libsignalSessionExtractedObjs` in `GeneratedLean/LibsignalSessionExtractedObj.lean` and engine `Arm64/Trusted/Object/Labels.lean`) checks in Lean's kernel that `libsignalSessionLib`'s labels come from the pre-link objects; and
- [`scripts/stock-pin/alink_check.py`](../../scripts/stock-pin/alink_check.py) machine-checks rules `(i)`–`(vii)` on the stock `ld.lld` build.

The engine's legacy linker (`untrusted_legacy_linker` / `snapshot-link`) is retired from both the shipped CLI build and the repository's statement and proof closures (`scripts/cli-elf` is a helper module imported by `cli-elf-stock`). `./scripts/cli-elf-stock --stdbin --build` links `.GeneratedLean/cli-elf/libsignal-cli.elf` (`cliElfBytes`, SHA-256 `f35c326d…`, pinned in `cli-elf/stock/inputs_stock_stdbin.lock` with `native_only = []`) directly with stock LLVM `ld.lld` (`22.1.8`, `-static -no-pie --no-relax --gc-sections`, `-T third_party/libsignal/libsignal-session/cli-elf/stock/stock_c2.ld`, rendered from `cli-elf/stock.ld`; rule `(iv)`), producing 4 `PT_LOAD` segments matching `StdBinaryLayout` from:
- the `13` session Rust relocatable objects of `libsignal-session/translation.toml` (`10` compiled `rustc 1.98.1` crate objects + `3` trimmed `alloc`/`std` sysroot rlib members), corresponding to `cliLinkObjs = libsignalSessionExtractedObjs` (`libsignalSessionLib` = `libsignalSessionMultiLib`; see object-identity disclosure below);
- the `libsignal-cli-io` crate's own `rustc 1.98.1` object `lib1_0.o` of `cli/io/translation.toml` (class `S`, extracted separately into `SignalSessionIoPlacedObj`, outside `cliLinkObjs` and outside `libsignalSessionLib`);
- the `15` `lib2_*.o` objects of `cli/rt/translation.toml` (class `S`; `rustc 1.98.1` crate roots for the de-hooked Rust rows and linked panic bodies, carved from sysroot `libcore-276de952897abe1c.rlib`, `liballoc-5ed91a8779ad9241.rlib`, and `libstd-96c9fe7a07d47cf2.rlib` plus `Cargo.lock`-pinned `curve25519_dalek`, `x25519_dalek`, `libcrux_ml_kem`, `sha2`, `libcrux_sha2`, `libcrux_hmac`, `aes`, `signal_crypto`, and `cpufeatures` rlibs by a `trimmedFrom` keep-set trim, SHA-256-pinned in `cli-elf/stock/m4_stock.lock` `[[lib2_objects]]`, which `cli-elf/stock/inputs_stock_stdbin.lock` pins by `m4_lock_sha256`): `lib2_0.o` (`core::slice::memchr::memrchr`, `core::fmt::{write, Formatter::*, Display::fmt}`, and linked `core::panicking::*` / `core::slice::index::*` / `core::option::*` / `core::result::*` / `core::str::*` panic entries), `lib2_1.o` (`core::str::converts::from_utf8`), `lib2_2.o` (`std::time::SystemTime::duration_since` with local callee `Timespec::sub_timespec`), `lib2_3.o` (`subtle::black_box::<u8>`, `MontgomeryPoint::zeroize`, and the `7` `curve25519_dalek` Ed25519/scalar operations plus X25519 curve/field/table helpers), `lib2_4.o` (`<x25519_dalek::SharedSecret as Drop>::drop`, `<x25519_dalek::StaticSecret as Drop>::drop`, `<x25519_dalek::PublicKey as From<&StaticSecret>>::from`, and `StaticSecret::diffie_hellman`), `lib2_5.o` (`libcrux_ml_kem` `mlkem1024::kyber::{encapsulate, decapsulate}` and `mlkem768::incremental::*`), `lib2_6.o` (`sha2::sha256::compress256` and `sha2::sha512::compress512`), `lib2_7.o` (`libcrux_sha2::hacl::*` SHA-256/SHA-384/SHA-512 helpers), `lib2_8.o` (`libcrux_hmac::hmac`), `lib2_9.o` (`aes::armv8::features::features_aes::{STORAGE, init_get::init_inner}` and `aes::soft::fixslice::{aes256_decrypt, aes256_encrypt, aes256_key_schedule}` and helpers), `lib2_10.o` (`signal_crypto::aes_cbc::{aes_256_cbc_decrypt, aes_256_cbc_encrypt}` plus monomorphized `aes::armv8::*` `AESE`/`AESD`/`AESMC`/`AESIMC` routines), `lib2_11.o` (`alloc::fmt::format::format_inner` plus `alloc::alloc::handle_alloc_error` and `alloc::raw_vec::capacity_overflow`), `lib2_12.o` (`cpufeatures::aarch64::getauxval_hwcap`), `lib2_13.o` (`std::sys::sync::once::futex::Once::call`), and `lib2_14.o` (`<std::time::SystemTime as Add<Duration>>::add`) (each in `.text.lib2` at the `:text_b` tail, at or above `e_entry` `0x475000`, with read-only data in `.rodata.lib2`, placed by `cli-elf/stock/stock_c2.ld`); `rust-obj2lean` does not extract them, so these rows stay `libsignalSessionLib` externs that `Placed.CliElfCodeMatchesPlaced` guarantees are never intercepted (only the 18 panic symbols may be intercepted), and their code is executed and proved from the SHA-pinned `cliElfBytes`, so build provenance adds nothing to the trusted base;
- the StdBin entry harness object (`cli-elf/std-main`, whose weak `main` loses to `cliLinkObjs`'s strong `main`);
- `cli-elf/stock/rdl_shim.S` assembled with `zig 0.16.0` (`rdl_shim.o`, class `N`, forwarding the `5` `__rustc::__rust_*` global-allocator shims to `mallocng` and providing abort-only `rust_begin_unwind` and `__rust_alloc_error_handler` handlers that branch to musl `abort`);
- `rustc 1.98.1`'s `aarch64-unknown-linux-musl/lib/self-contained/{crt1.o, crti.o, crtn.o, libc.a}` (class `R`: musl `_start`/`__libc_start_main`/`exit`/`abort`, the 24-block `mallocng` allocator, `memcpy`, `memset`, `memmove`, `memcmp`, `bcmp`, `strlen`, `getauxval`, and POSIX syscall wrappers); and
- `extern_stubs_clean.o` (class `Z`, assembled with `zig 0.16.0`; no Zig-compiled `libc` routines are linked: `STB_GLOBAL` 4-byte `0x00000000` / `udf #0` stubs for retired hook stub slots and unhooked unreachable externs, and the `3` displaced weak outline atomics `__aarch64_ldadd8_rel`, `__aarch64_ldadd8_relax`, `__aarch64_cas8_acq_rel`).

**Machine-checked A-LINK (`scripts/stock-pin/alink_check.py`, A-LINK v0.3.2).** Untrusted proof modules (`LibsignalBinary/Proofs/Placed/{CliBinaryPqPlaced,CliLabels}.lean` and `ElfDirectBridge.lean`) check in Lean's kernel that `libsignalSessionLib`'s blocks, data, relocations, and exports appear in `cliElfBytes` (`LinkedAt` = `Placeable` + `InElf`), that `cliElf_symtab_agrees_with_placement` matches the `.symtab` resolver against the placement, and that `libsignalSessionLib`'s labels come from `cliLinkObjs` (`CliLabelsFromObjects`); `VerifiedLibraries.mallocngLib` placement and the `55`-symbol `cliDehookedSymsPlaced` audit list live in `LibsignalBinary/Proofs/Placed/CliBinaryPqPlaced.lean`. Outside Lean's kernel, `./scripts/cli-elf-stock --stdbin --ci --verify` checks that external symbols referenced from RX resolve as expected, and `./scripts/stock-pin/alink_check.py --ci --lock third_party/libsignal/libsignal-session/cli-elf/stock/m4_stock.lock --inputs-lock third_party/libsignal/libsignal-session/cli-elf/stock/inputs_stock_stdbin.lock` verifies rules `(i)`–`(vii)` on the staged stock `ld.lld` link inputs (`stock-link.json`), `link.map`, and output ELF:
- **(i) Non-local symbol collision ban.** No non-local definition (strong, weak, or common) in any non-`cliLinkObjs` input or pulled-in archive member shares a name with a non-local definition of `cliLinkObjs`, except `main`.
- **(ii) Entry-harness weak `main`.** The StdBin entry harness `.o` weakens only `main` (`STB_WEAK`), which resolves in `cliElfBytes`'s `.symtab` to `cliLinkObjs`'s unique strong `main` export (`main < e_entry`).
- **(iii) Unhooked `R`/`N`/`S` partition.** Every surviving symbol in `X = R_undef \ R_def` defined by a real input (`R`, `N`, or `S`) that is neither a `cliHookTablePlaced` key (empty, in untrusted `CliBinaryPqPlaced.lean`) nor a `cliPanicSymbolsPlaced` panic belongs to the disjoint lock-pinned sets `real_proved` (`72` symbols: `mallocng`, `memcpy`, `memset`, `rdl_shim` allocator shims and abort-only panic handlers, `read_file`, `read_stdin`, `write_file`, `write_stdout`, musl startup/exit/abort, `getauxval`, and reader/writer syscalls including `write`, `memmove`, `bcmp`, and `strlen` from `self-contained/libc.a`, the compiled-Rust roots including `std::sys::sync::once::futex::Once::call` and `core::fmt` indirect callbacks plus local `curve25519_dalek`, `libcrux_ml_kem`, `libcrux_sha2::hacl::*`, `aes::armv8::*`, and `aes::soft::fixslice::*` helpers in the `15` `lib2_*.o` objects, and the `memcmp` that `bcmp` tail-calls; union-checked against `CliBinaryPq.lean`'s panic table and `CliBinaryPqPlaced.lean`'s empty hook table) or `real_hook_reached` (`[]` on the 0-hook stock ELF).
- **(iv) Pinned linker flags and script.** `ld.lld` runs with `--no-relax` and `-static`, the SHA-256-pinned linker script `third_party/libsignal/libsignal-session/cli-elf/stock/stock_c2.ld`, which `scripts/cli-elf-stock` renders from `cli-elf/stock.ld` (placing `memmove`, `memcmp`, `bcmp`, `strlen` in the `.text.b_pre` tail below `e_entry`) and fails on any drift, and no `--wrap`, `--defsym`, `-z muldefs` / `--allow-multiple-definition`, `-z lazy`, `-shared` / `-pie`, thin archives, or LTO / bitcode inputs; weak-undefined symbols outside `X` match the pinned allowlist (`ElfImage.parse` in Lean also requires static `ET_EXEC` without `PT_INTERP` / `PT_DYNAMIC`).
- **(v) Single definer and byte equality across `R` / `N` / `S` / `Z`.** Every retained `ld.lld -Map` `MapInputSection` resolves to its SHA-verified staged input `.o`/`.a(member)` (with `trimmedFrom.keepSet` verified on the `3` trimmed `alloc`/`std` sysroot `.o`s against their untrimmed sysroot rlib members). Every surviving `x ∈ X` (outside `discarded` symbols with zero surviving references after `--gc-sections`) has a unique definer in `R` (`self-contained/` CRT / `libc.a`), `N` (`rdl_shim.o`, with undefineds checked against `n_undef_map`), `S` (`lib1_0.o` and the `lib2_*.o` objects of `cli/rt/translation.toml`), or `Z` (`extern_stubs_clean.o`, `STB_GLOBAL` 4-byte `udf #0`, displacing no archive definition except the `3` weak `compiler_builtins` outline atomics), and each pulled-in `R`/`N`/`S` section in `cliElfBytes` equals its input `.o` bytes outside verified relocation sites (including `R_AARCH64_TLSIE_*` → `TLSLE` under `--no-relax`; unresolved weak-to-0 references fail).
- **(vi)–(vii) Transitive relocation closure, non-weak hook/body bindings, `libc.a` byte locks, data globals, and archive checks.** Following relocations from `real_proved` definers reaches zero `Z` stubs outside the allowed fail-stop set (`failstop_z`, rule `(vi)`). Every `s2_real_body_lock` symbol has non-`STB_WEAK` binding; `memcpy` (`99` words) and `memset` (`65` words) have `0` text relocations and match `rustc 1.98.1` `self-contained/libc.a` byte-for-byte alongside `memmove`, `memcmp`, `bcmp`, and `strlen` (`22` words, `0` relocs); kept external `STT_OBJECT` globals match the allowlist (`MAX_LOG_LEVEL_FILTER`, `ED25519_BASEPOINT_TABLE`, `ED25519_BASEPOINT_TABLE_INNER_DOC_HIDDEN`); no `.rlib` is passed directly to `ld.lld`, `libunwind.a` contributes `0` retained members, and `--ci` fails on any drift against `m4_stock.lock` and `inputs_stock_stdbin.lock`.

**What stays trusted for build provenance and panic stubs:**
- on the headline side, only that `cliElfBytes`'s `.symtab` accurately labels the `23` resolved function addresses (the `18` Rust panic entries intercepted at entry by `abortOnPanic`, `CliProcess.lean`, DEV-E7 — whose linked bodies reach musl `abort` only via the abort-only `rdl_shim` handlers `rust_begin_unwind` and `__rust_alloc_error_handler` and write no stderr panic message — and the `5` `SampleNTT` entries), while reaching any unhooked `udf #0` stub (including the `3` displaced outline atomics) halts and is excluded by `ProcessRunsTo` step safety (`cliProgElf` has `0` non-panic external hooks on the stock ELF);
- on the off-TCB build-provenance side (if you also want to check that `cliElfBytes` came from the pinned source): `scripts/stock-pin/alink_check.py`, `scripts/cli-elf-stock` via its checked output (DEV-M7), and `rust-obj2lean`'s `trusted_extractor` for the untrusted `CliLabelsFromObjects` cross-check.

**Trimming.** The extractor's in-memory section trimming (`Trim`) keeps every `.symtab` entry. A symbol in a dropped section is emitted as `.other` (never `.undef`), so trimming cannot hide a definition from `CliExternLabelsUndefined` or `RelocMatches`; both fail closed. For the `3` `[[sysroot_objects]]` trims in the stock link, `alink_check.py` verifies `trimmedFrom.keepSet` against the untrimmed sysroot rlib member `.o`.

The named sets on the stock `ld.lld` ELF, for reference (verified by `alink_check.py` and `CliPqAllocPremiseGuard.lean`; the de-hooked audit list `cliDehookedSymsPlaced` and empty `cliHookTablePlaced` live in untrusted `LibsignalBinary/Proofs/Placed/CliBinaryPqPlaced.lean`):
- `cliDehookedSymsPlaced` (`55` external de-hooked symbols whose linked ELF bytes execute): the `5` `__rustc::__rust_*` allocator shims (`rdl_shim.o` → `VerifiedLibraries.mallocngLib`), `read_file`, `read_stdin`, `write_file`, and `write_stdout` (`libsignal_cli_io` `lib1_0.o`), `memcpy` and `memset` (`self-contained/libc.a`, `VerifiedLibraries.mallocngLib` blocks `20` and `21`), `memmove`, `bcmp`, and `strlen` (`self-contained/libc.a`, linked below `e_entry`; `bcmp` tail-calls the unhooked `memcmp`), and `memrchr`, `from_utf8`, `core::fmt::write` (with its `7` `core::fmt::Formatter::{write_str, pad}` and `<str / u8 / u32 / u64 / usize as Display>::fmt` externs), `alloc::fmt::format::format_inner`, `SystemTime::duration_since`, `<SystemTime as Add<Duration>>::add`, `subtle::black_box`, the `2` X25519 `Drop::drop` destructors, the `2` X25519 operations (`PublicKey::from`, `StaticSecret::diffie_hellman`), the `7` `curve25519_dalek` Ed25519/scalar operations, `libcrux_ml_kem` Kyber-1024 (`mlkem1024::kyber::{encapsulate, decapsulate}`) and all `7` `mlkem768::incremental` functions (`KeyPairCompressedBytes::{pk1, pk2, from_seed}`, `encapsulate1`, `encapsulate2`, `decapsulate_compressed_key`, `validate_pk_bytes`), `sha2::sha256::compress256`, `sha2::sha512::compress512`, `libcrux_hmac::hmac` (with its `libcrux_sha2::hacl::*` SHA-256 helpers), `cpufeatures::aarch64::getauxval_hwcap`, `std::sys::sync::once::futex::Once::call` (executing SPQR's CPU-feature probe on `AT_HWCAP = 0x1b`), and `signal_crypto::aes_cbc::{aes_256_cbc_encrypt, aes_256_cbc_decrypt}` (with `aes` 0.9.1 `autodetect::Aes256` ARMv8 hardware AES + `fixslice64`; compiled Rust in the `15` `lib2_*.o` objects that `stock/stock_c2.ld` places in `.text.lib2` at the `:text_b` tail, at or above `e_entry`); `<String as Clone>::clone` executes as an intra-library `libsignalSessionLib` block;
- hooked C names (`0` rows): `memmove`, `bcmp`, and `strlen` are linked from `rustc 1.98.1` `self-contained/libc.a` (`native_only = []`, class `R`), and `memcmp` in `libc.a` is unhooked in `real_proved` (called by `bcmp`, never by `libsignalSessionLib` blocks);
- hooked `libsignal_cli_io` exports (`0` rows): `read_file`, `read_stdin`, `write_file`, and `write_stdout` execute from `lib1_0.o` (class `S`);
- hooked cryptographic and formatting primitives (`0` rows), and `18` Rust panic symbols (`cliPanicSymbolsPlaced` in `CliBinaryPq.lean`): linked in `.text.lib2` (`lib2_0.o`, `lib2_11.o`) and intercepted at entry by `cliProgElf` via `abortOnPanic` (DEV-E7).

**Label resolution (`Obj.LabelsFromObjects`).** `Obj.LabelsFromObjects` models `lld`'s static resolution (now an untrusted cross-check in `LibsignalBinary/Proofs/Placed/CliLabels.lean`). A non-local name resolves (`Obj.Resolves`) to an `STB_GLOBAL` or `STB_WEAK` definition in an allocated section that is not in a COMDAT group discarded by an earlier group of the same signature (`Obj.Discarded`), and every other non-local definition of the name must be a weak definition that loses to it. Two `STB_GLOBAL` definitions, an `SHN_ABS` / `SHN_COMMON` / `STB_GNU_UNIQUE` competitor, or a discarded winner fail closed. Relocations against non-local symbols target the `Resolves` winner even when the symbol is defined in the same object (only `STB_LOCAL` symbols target their own definition), and code and data slices may not come from discarded sections.

On the pinned objects (`f35c326d…`), `cliLinkObjs` has no `STB_WEAK` or other non-`GLOBAL`/`LOCAL` symbol, no name with two non-local definitions, no non-local definition in `SHN_ABS` / `SHN_COMMON`, no named local undefined symbol, and no COMDAT group with an extracted member section: 13 extracted objects, 8,199 symbols (1,409 `GLOBAL`, 6,790 `LOCAL`), 687 non-local definitions under 687 names, and 3 COMDAT groups, all `DW.ref.rust_eh_personality` with no extracted members (`GeneratedLean/LibsignalSessionExtractedObj.lean`).

### What `SessionCliGuards.lean` ties down, and what it does not

Kernel-checked (`Computational/Tests/Guards/SessionCliGuards.lean`): the parties' identity keys `partyIdentityKey .A`, `partyIdentityKey .B` differ (`idOfE_ne_cli`). (Untrusted `ElfDirectBridge.cliElf_symtab_agrees_with_placement` and `CliLabelsFromObjects` separately cross-check the `18` ELF-direct panic symbols of `cliPanicSymbolsPlaced` against the extracted objects.)

Not tied down: that each resolved `.symtab` entry really came from the upstream source build (off-TCB `scripts/stock-pin/alink_check.py` and `scripts/cli-elf-stock`, DEV-M7).

## 6. The hypotheses, and why each is reasonable

- **`CliSpecPqxdh run X W`**: the model-run theorem `libsignalCliPqSecure_holds`
  (`StatementPqSecure.lean`) holds for every implementation `run : CliRun` that meets the CLI's
  functional spec on the game's directories (DEV-CLI1, DEV-CLI2). For the pinned ELF, Lemma 4
  `libsignal_cli_pq_binary_correct` (`Computational/Theorems/Main.lean`) proves `CliSpecPqxdh` and
  `CliSpecPqxdhNoMatch` (up to `.OutOfMemory`, `CliReachesOOMElf`, DEV-CLI15, or `SampleNTT` seed divergence, `CliReachesSampleNttStuckElf`, DEV-CLI22) for `cliRunElf elf addrs` at `realPEParams` (`realCrypto`, `realPqxdhPrims`) across all extras `X`.
- **Unconditional `.OutOfMemory` freedom on PQXDH inputs, and the `SampleNTT` seed-divergence excuse (`DEV-CLI22`)**: `CliPqxdhElfSecure` takes no `.OutOfMemory` premise and adds no allocation-failure term, while passing `exc? := some (CliReachesSampleNttStuckElf elf addrs)` so both clauses of the security bound gain an unbounded `+ 2 · CliPqxdhFlagProb … (CliPqxdhExcusedAbort (CliReachesSampleNttStuckElf elf addrs) …)` term for the event that a PQXDH call reaches one of the 5 `libcrux_ml_kem` `SampleNTT` entry points with a never-terminating SHAKE-128 matrix seed (probability `0` under an idealized random XOF, but not bounded in the theorem since the adversary influences the seeds; DEV-CLI22). The 1 GiB physical-memory budget (`ProcessInit.physMemAvail := 2 ^ 30`, the engine default kept by `cliProcessInputs`) is part of the trusted machine model. On it, `cliElf_noOOM_elf` (`ElfHeadlinePq.lean`, bridged via `ElfDirectBridge.cliReachesOOMElf_iff` from `ElfNoOomPlacedInstK.cliElf_noOOM_of_parseK` and `ElfPlaced.cliElf_mallocng_linkedIn`) proves unconditionally that no run on `CliPqxdhInputs realPEParams` reaches `.OutOfMemory` (with per-call `fds ≥ 3` closedness carried as the proof-side `FdsHiFrame` conjunct of `VmPreserved` and ghost-to-real transfer proved by `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`). Lemma 4's statement, and with it the correctness conjunct `CliPqxdhElfCorrect` of the Main Theorem, excuses both `.OutOfMemory` (DEV-CLI15) and `SampleNTT` seed divergence (DEV-CLI22), and the symbolic progress clause `CliElfProgress` excuses `SampleNTT` seed divergence (DEV-CLI22).
- **`ℓ < 10^6`**: fixed message length.
- **The modelling hypotheses** (`_hDh`, `_hX`, `_hdec`, `_hdum`, `_hz`, `_hδ`): they tie
  the primitives to an abstract Diffie–Hellman group with encodings (injectivity of `encT` follows
  from `_hdec`; AES-256 round-trip `D k (E k x) = x` is proved unconditionally at `realCrypto`). They are not proved
  about real Curve25519; they restrict which primitive semantics the bound speaks about.
- **`_hq32`**: in PQXDH mode `2 * (qs k + 1) + 25002 < 2 ^ 32` (`qs k ≤ 2^31 - 12503`, matching Lemma 2; every reachable `SessionRecord` encodes to at most `1,209,331 < 2^31` B independently of `qs k`, `encodeRecordX_length_le_1209331_cli`).
- **`_hq`**: at most `q` queries, as in ACD19 Def. 8.

The prime-order witness in `Computational/Tests/NonVacuity/PrimeOrderX25519Satisfiable.lean`
(alongside `Computational/Tests/NonVacuity/PqHeadlineSatisfiable.lean`) instantiates `Pt25519` over
the x-only subgroup of certified prime order `l25519 = 2^252 + 27742317777372353535851937790883648493`
(`Fintype.card Pt25519 = (l25519 + 1) / 2 > 2^251`) with RFC 7748 clamped scalars and proves joint
satisfiability of all hypotheses of `SessionSecure` (`session_hypotheses_satisfiable_prime_order`)
and `LibsignalCliPqSecure` (`cli_pq_headline_hypotheses_satisfiable_prime_order`) with the tight
point-fiber bound `δ = 2^-250` and `δ_kem = 0` (supplementing the two-point `Bool` witness at
`δ = 1` in `Computational/Proofs/SessionHeadlineProto.lean`; in the placed real-primitive witness
`Computational/Tests/NonVacuity/ModelPrimsWitnessReal.lean` at `realPEParams`
(`realPqxdhPrims.{encaps, decaps}` = `CryptoGames.MLKEM.{kyber1024EncapsVec, kyber1024DecapsVec}`),
`KemDeltaCorrect` is witnessed trivially at `δ_kem = 1` for dummy `XReal.kemKeyGen` (`cliPqxdhElfSecure_real_9eq_instantiable` on `CliPqxdhElfSecureAnyKem`) and instantiated directly on `CliPqxdhElfSecure` at `δ_kem = ε + 1 / 2 ^ 112` for concrete `kyber1024KemKeyGen` (`cliPqxdhElfSecure_kyber1024_instantiable`, matching the universal bound proved by `libsignal_cli_pq_secure_elf_binary` via `kyber1024_kem_delta_correct` in `Computational/Theorems/Lemmas.lean`, statement `Kyber1024KemDeltaCorrect` in `Computational/Specifications/LibsignalCli/Kyber1024Delta.lean`, under `KyberNoiseGap ε`, DEV-E8 / DEV-PQ21). `pqOom_hypotheses_satisfiable`
(`Computational/Tests/NonVacuity/PqOomSatisfiable.lean`; at prime order
`pqOom_hypotheses_satisfiable_prime_order`) witnesses the hypotheses of the `some exc` body of
`CliPqxdhSecurityFor` (unaffected by widening `CliPqxdhExcusedAbort` to `run i = none ∨ run i = some .aborted`, which only enlarges the flag event on the bound's right-hand side; DEV-CLI22). The ELF-direct PQXDH-mode headlines take no heap or ghost-to-real transfer premise.

For the PQXDH and session statements (`SignalPqxdh.Security.PqxdhCorrectAndSecureδ`,
`SignalPqxdh.Security.Headline`, `SessionSecure`), the
hypotheses are `BoundedAdv … b` (`b : QueryBudget`)
for the multi-user security games, `WellFormedPrimitivesδ P` (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`),
`CryptoWellFormedPrimitivesδ P` and `KemDeltaCorrect P δ_kem`
(`Computational/Specifications/Assumptions/KemCorrect.lean`, `HeadlineDelta.lean`,
DEV-PQ21; `WellFormedPrimitives P` / `CryptoWellFormedPrimitives P` for the `δ = 0`
corollary `Headline`), and — for `SessionSecure`
(`StatementSession.lean` / `StatementComposed.lean`) — `Encaps1Total K` and the consolidated `u32`
counter/window budget `2 * (q + 1) + 25002 < 2 ^ 32` (`DEV-SPQR7`, with ML-KEM-768
failures charged at top level as `2 * sessionKemFailProb` in `SessionSecure` and `2 * CliKemFailProb` on both clauses of `CliPqxdhSecurityFor` via `MlKem.KemFailBad`; `DEV-KFF1`). The model-run statement `LibsignalCliPqSecure` (`StatementPqSecure.lean`) specializes the abstract-group `CliPqxdhSecurityForAbstract` over arbitrary `(Pt, W, X)`. By contrast, `CliPqxdhElfSecureAnyKem` (`StatementPqElfAnyKem.lean`) specializes `CliPqxdhSecurityForAnyKem` at `realPEParams`, the concrete Curve25519 prime-order x-only subgroup (`X25519Pt`, `x25519Dh`, `x25519EncPt`, `x25519EncT`, `x25519DecT`, `x25519Delta = 1 / 2 ^ 250` in `LibsignalBinary/Specifications/CryptoGames/DH/X25519Group.lean`), and `realUnreachedPrims kemKeyGen`, discharging ML-KEM-768 `encaps1` totality, AES-256 round-trip, all seven session DH/group laws (`Dh.Commutes`, `X25519RealizesDh`, `decT ∘ encT = some`, `encT ≠ dummyKey`, `dh x 0 = 0`, `DhKerUniform`, and the `2^-250` base-point fiber bound), and all 55 non-`kemKeyGen` fields of `CryptoWellFormedPrimitivesδ` as proved lemmas (`ConcreteX25519Group.lean`, `ConcreteX25519Pow8.lean`, `ConcreteX25519Prims.lean`; DEV-E8, DEV-LS29), and the Main Theorem headline `CliPqxdhElfSecure` (`StatementPqElf.lean`) further fixes `kemKeyGen := kyber1024KemKeyGen` and instantiates `δ_kem := ε + 1 / 2 ^ 112` under `KyberNoiseGap ε` via `kyber1024_kem_delta_correct` (DEV-PQ21; discharging `kemKeyGen_valid` unconditionally). The remaining premises in `CliPqxdhSecurityFor` are `_hKemColl` (`≤ 1 / 2 ^ 255` on `kyber1024KemKeyGen`), `KyberNoiseGap ε`, `ℓ < 10 ^ 6`, the query bounds `CliGameAdversaryPerInstanceBounded`, and
`_hq32 : 2 * (qs k + 1) + 25002 < 2 ^ 32` (`qs k ≤ 2^31 - 12503`), matching Lemma 2 (`encodeRecordX_length_le_1209331_cli` bounds every reachable session record by `1,209,331 < 2^31` B independently of `qs k`). `CryptoWellFormedPrimitivesδ` / `CryptoWellFormedPrimitives` include
the law `pow8_base_len` (`P.pow8 p = P.pow8 (P.x25519Base e) → p.length = 32`), which the `PrfHmac`
reduction of the `Auth` bound (Lemma 1's one-key `Auth` conjunct and the standalone two-key proof) uses (DEV-PQ31) and which real X25519 satisfies. In
`LibsignalBinary/Proofs/SpecLemmas/LibsignalE2E/PqxdhModelLink.lean`, the `_eq_ref` laws of
`modelPrims X W` hold by `rfl`, and
`Computational/Tests/SignalPqxdh/SignalPqxdh.lean` provides concrete witnesses `testPrimitives` satisfying
`WellFormedPrimitives` (`LibsignalBinary/Proofs/SpecLemmas/SignalPqxdh/ModelProofDefs.lean`) and `cwfPrimitives` satisfying `CryptoWellFormedPrimitives`
(`cwfPrimitives_cryptoWellFormed`, including `pow8_base_len`) with zero `sorryAx`.

## 7. Other headlines

**The headlines of `Computational/Theorems/` and `libsignalCliPqSecure_holds`.** These are the six
promoted theorems of `Computational/Theorems/` (`Main.lean` and `Lemmas.lean`), measured in the
`--headlines-file scripts/trust_banner_headlines.txt` run of §1 (plus the intermediate KEM-generic
lemma `libsignal_cli_pq_secure_elf_binary_any_kem` in `Main.lean`, `10,195` constants, `std3`), together with the model-run theorem
`libsignalCliPqSecure_holds` (`Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean`),
measured via `--headline` (§1).

| Theorem | What it says | Constants (reached) | Axioms |
|---|---|---:|---|
| `CryptoVerification.LibsignalCli.libsignal_cli_pq_secure_elf_binary` (`Main`, the Main Theorem; `Computational/Theorems/Main.lean`, module of `CliElfLib`; proof `libsignal_cli_pq_secure_elf_binary_proof` in `Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean` from `libsignal_cli_pq_secure_elf_binary_any_kem_proof` + `kyber1024_kem_delta_correct_proof`; statement `CliPqxdhBinaryCorrectAndSecure cliElfBytes`, `Computational/Specifications/LibsignalCli/StatementPqElf.lean`) | the `libsignal-cli` ELF built from source with stock `ld.lld` and pinned by SHA-256 (`CliElf.lean`) parses, resolves its 23 `.symtab` function addresses (`resolveCliElfAddrs`), and meets `CliPqxdhElfCorrect` and `CliPqxdhElfSecure` (`cliRunElf elf addrs`, starting from plain `elf.loadState (cliProcessInputs i)` with no initial `.data` patch, `0` non-panic external hooks, panic interception only at the `18` resolved panic addresses as `SIGABRT`, DEV-E7) at the closed primitives `realPEParams`, the concrete Curve25519 prime-order x-only subgroup (`X25519Pt`, `x25519Dh`, `x25519Delta = 1 / 2 ^ 250`), and `realUnreachedPrims kyber1024KemKeyGen` (with no `.OutOfMemory` premise and `exc? := some (CliReachesSampleNttStuckElf elf addrs)`): under `_hKemColl` (`≤ 1 / 2 ^ 255`) and `KyberNoiseGap ε` (`δ_kem = ε + 1 / 2 ^ 112`, DEV-PQ21), the bound of `libsignalCliPqSecure_holds` below plus an unbounded `+ 2 · CliPqxdhFlagProb` for `SampleNTT` seed divergence (`CliPqxdhExcusedAbort`, DEV-CLI22); assembled from `L1`–`L4` and `cliElf_noOOM_elf` (`hNoOOM`) via `main_of_lemmas` (`libsignal_cli_pq_secure_elf_binary_any_kem`) combined with `kyber1024_kem_delta_correct` (§1, "Main from lemmas") | 10,210 | std3 |
| `CryptoVerification.SignalSession.libsignal_cli_pq_binary_correct` (`L4`; `Computational/Theorems/Main.lean`, module of `CliElfLib`; proof `libsignal_cli_pq_binary_correct_proof` in `Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean`; statement `CliPqxdhBinaryCorrect cliElfBytes`, `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean`) | the `libsignal-cli` ELF built from source with stock `ld.lld` and pinned by SHA-256 (`CliElf.lean`) parses, resolves its 23 `.symtab` function addresses (`resolveCliElfAddrs`), and its ELF-direct process (`cliRunElf elf addrs`, starting from plain `elf.loadState (cliProcessInputs i)` with no initial `.data` patch, `0` non-panic external hooks, panic interception only at the `18` resolved panic addresses as `SIGABRT`, DEV-E7) meets the PQXDH-mode specs `CliSpecPqxdh` and `CliSpecPqxdhNoMatch` (DEV-CLI11) at the closed primitives `realPEParams` (`realCrypto`, `realPqxdhPrims`) for every model extras `X`, up to `.OutOfMemory` or `SampleNTT` seed divergence (`CliPqxdhBinaryCorrect`, DEV-CLI15, DEV-CLI22) | 5,603 | std3 |
| Model-run theorem: `CryptoVerification.E2E.libsignalCliPqSecure_holds` (`Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean`, default library; statement `LibsignalCliPqSecure` in `Computational/Proofs/LibsignalCli/StatementPqSecure.lean`) | the `libsignal-cli` CLI on PQXDH directories with SPQR, for any implementation `run` that meets `CliSpecPqxdh run X W`: `CliPqxdhAdvantage` is at most the Double Ratchet + SPQR V1 prefix sum + `2 · KeyInd1KeyRealAdvantage` + `kemDecapsFailureTerm` + `2 · CliKemFailProb`, and under `KeyIndRoGap` the same with `2 · (pqxdhKeyIndAdvantageBoundActiveδ S b_ki.q_on … + ε_ro)` in place of the `KeyInd1KeyRealAdvantage` term (DEV-CLI16); the game refuses some adversary inputs (DEV-CLI13, DEV-CLI14) | 8,268 | std3 |
| `SignalPqxdh.Security.headlineδ` (`L1`; `Computational/Theorems/Lemmas.lean`, proof `headlineδ_proof` in `Computational/Proofs/SignalPqxdh/Delta/Statements.lean`, statement `SignalPqxdh.Security.PqxdhCorrectAndSecureδ` in `Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean`) | Lemma 1 (App. C.3): PQXDH under a `δ_kem`-correct KEM (`CryptoWellFormedPrimitivesδ P`, `KemDeltaCorrect P δ_kem`, DEV-PQ13, DEV-PQ21): correctness, one-key random-oracle `KeyInd` under `GapSigEufCma`, `KemShCr`, and `GapDhWithSign`, and one-key first-message `Auth` (`PqxdhAuth1KeySecureδ`, DEV-C5) under `GapSigEufCma`, `KemShCr`, `GapDhWithSign`, `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`, and `PrfHmac` | 5,394 | std3 |
| `CryptoVerification.E2E.session_secure` (`L2`; `Computational/Theorems/Lemmas.lean`, proof `session_secure_proof` in `Computational/Proofs/LibsignalCli/HeadlineSession.lean`, statement `SessionSecure` in `Computational/Specifications/Session/StatementSession.lean`) | Lemma 2 (App. C.3): Double Ratchet + SPQR V1 single-session security with leaked signed pre-key over an arbitrary context/adversary mixture `oa : ProbComp α`, witnessing costed session reductions `D : SessionCostedReductionFamily Pt ℓ` (`SessionCostedReductionFamilyBounded ℓ D`) and bounding mixed `SM.gameR` bias by `sessionAdvantageBound + 2 * sessionKemFailProb` (fixed-context security at `α := Unit`, `oa := pure ()`) | 6,890 | std3 |
| `CryptoVerification.E2E.model_secure_costed` (`L3`; `Computational/Theorems/Lemmas.lean`, proof `model_secure_costed_proof` in `Computational/Proofs/LibsignalCli/HeadlineModel.lean`, statement `ModelSecure` in `Computational/Specifications/Composition/StatementModel.lean`, with `ModelIface.lean`) | Lemma 3 (App. C.3): at the one-key standard-model handshake `ki := pqxdhKeyIndImpl1KeyReal S P` (whose lazy and exact prefix experiments are proved equal internally in `HeadlineModel.lean` via `PrefixLazy1KeyReal.lean`), costed reductions `reds : CompositionCostedReductionFamily …` satisfy `CompositionCostedReductionFamilyBounded` unconditionally for all `P` and, under `SignalPqxdh.WellFormedPrimitivesδ P` (scoping Conjunct 2), bound `ComposedAdvantage (modelIface … ki …) A` by `2 · KeyIndAdvantageForHandshake S P ki advK` plus the `qStart`-session hybrid sum of raw single-session `SM.gameR` biases mixed over stage 1, with no `ModelLazyCond` premise, no session assumption table, and no session reduction bundle `D` | 6,952 | std3 |
| `CryptoVerification.E2E.kyber1024_kem_delta_correct` (`KyberDelta`; `Computational/Theorems/Lemmas.lean`, proof `kyber1024_kem_delta_correct_proof` in `Computational/Proofs/Kyber1024Delta/HeadlineProof.lean`, statement `Kyber1024KemDeltaCorrect` in `Computational/Specifications/LibsignalCli/Kyber1024Delta.lean`) | Concrete Round-3 CRYSTALS-Kyber-1024 (`kyber1024KemKeyGen` + `realPEParams`): `(1568B, 3168B)` key-generation wire-length validity and `KemDeltaCorrect (modelPrims (realUnreachedPrims kyber1024KemKeyGen) realPEParams) (ε + 1 / 2 ^ 112)` under the single CBD-noise idealization hypothesis `KyberNoiseGap ε` (`Kyber1024Correct.lean`, DEV-PQ21), over concrete `SampleNTT` (`SHAKE-128`) matrix `Â`, `SHA3-256` message hash, exact `Compress_{11,5,1}` / `Decompress_{11,5,1}` rounding, and Fujisaki–Okamoto re-encryption | 3,294 | std3 |

**The symbolic headlines (`./scripts/trusted-closure.sh --symbolic`).** The symbolic model and
binary refinement proofs in `Symbolic/Theorems/` and `Symbolic/Tests/ExternWitness.lean` define 17
headlines (plus the `realAes256ContractsSatisfiable_cli` non-vacuity witness): the 14
`symbolicHeadlines` measured by `--symbolic` below (`scripts/TrustedClosure.lean`; see
[`docs/PAPER_MAP.md`](../../docs/PAPER_MAP.md) §5.1) plus 3 real-primitive headlines listed
immediately beneath the table:

| Theorem | Module | Constants (reached) | Repository lines (code) | Axioms |
|---|---|---:|---:|---|
| `Proven.ForwardSecrecy.forward_secrecy`, `Proven.PostCompromiseSecurity.post_compromise_security` | `Symbolic.Theorems.ModelSecurity` | 3,111 / 3,112 | 1,703 (1,490) / 1,710 (1,496) | std3 |
| `Proven.Handshake.alice_initiator_secrecy`, `bob_responder_secrecy`, `authentication`, `peer_authentication`, `handshake_forward_secrecy`, `kci_resistance`, `session_independence`, `hndl_resistance` (8 handshake properties) | `Symbolic.Theorems.ModelSecurity` | 3,095–3,100 | 1,628–1,652 (1,433–1,452) | std3 |
| `Proven.RefinementPreservation.comp_refinement_preservation_cli` | `Symbolic.Theorems.RefinementPreservation` | 4,891 | 4,629 (3,887) | std3 |
| `Proven.ExternWitness.comp_externsSatisfiable_cli` | `Symbolic.Tests.ExternWitness` | 670 | 391 (245) | std3 |
| `Proven.Refinement.comp_refines_cli` (`SymRefines`, `CliElfLib`) | `Symbolic.Theorems.Refinement` | 9,243 | 12,056 (9,765) | std3 |
| `Proven.Security.signal_session_secure` (`SymSecure`, Theorem 1, `CliElfLib`) | `Symbolic.Theorems.Security` | 9,298 | 12,330 (9,976) | std3 |

In addition to the 14 `symbolicHeadlines` measured above, `Symbolic/Theorems/Refinement.lean` and
`Symbolic/Theorems/Security.lean` also prove the three real-primitive symbolic headlines
(`CliElfLib`, `0 sorry`, `std3` axioms): `Proven.Refinement.real_prims_admissible`
(`RealPrimsAdmissible`, proving that some interpretation satisfying `ExternContractsHoldCli` agrees
with `realCliHooks` via `RealPrimsMatch`), `Proven.Refinement.comp_refines_cli_real`
(`CompRefinesCliBinaryReal cliElfBytes`), and `Proven.Security.signal_session_secure_real`
(`SignalSessionSecureReal cliElfBytes`), which fix the primitives to `realCliHooks` via
`RealPrimsMatch` over guarded execution traces with no `RealHooksAgreeOnInput` filter (`elfRelReal`).

**Standalone ACD19 and session-model theorems outside `Computational/Theorems/`.** Each standalone
ACD19 theorem has its own, smaller trusted closure (measured via `./scripts/trusted-closure.sh
--headline …`). None of the `CryptoGames.*` rows uses the CLI or any definition of T; the SPQR-off
session-model theorem `libsignal_session_sm_r1_proto` uses 139 lines (74 code lines) across 6 files
of T plus 8,652 Tier-2 lines (including `effectiveHkdfSalt32`).

| Theorem | ACD19 | Constants (reached) | Repository lines with docs (code) | Axioms |
|---|---|---:|---:|---|
| `CryptoVerification.LibsignalSession.libsignal_session_sm_r1_proto` (`Computational/Proofs/SessionHeadlineProto.lean`) | SPQR-off session model | 6,417 | 8,791 (7,030) | std3 |
| `CryptoGames.SM.Construction.theorem6_h1_blank_concrete` / `theorem6_h1_blank_stage2` (`Computational/Proofs/CryptoGames/SM/Theorem6Libsignal.lean`) | Thm 6 at H1 | 3,081 / 3,217 | 1,827 (1,440) / 2,829 (2,363) | std3 |
| `CryptoGames.SM.Construction.theorem8` / `theorem8_stage2_bucket_prng` (`Computational/Proofs/CryptoGames/SM/Theorem8.lean`) | Thm 8 | 2,995 / 3,005 | 1,612 (1,248) / 1,931 (1,560) | std3 |
| `CryptoGames.SM.Construction.theorem12` / `theorem12_stage2` (`Computational/Proofs/CryptoGames/SM/Theorem12.lean`) | Thm 12 | 2,985 / 3,021 | 1,628 (1,266) / 1,754 (1,364) | std3 |
| `CryptoGames.SM.theorem1_h1_blank` (`Theorem6Libsignal.lean`) / `CryptoGames.SM.Thm1.lemma17` (`Computational/Proofs/CryptoGames/SM/Theorem1.lean`) | Thm 1 / Lem 17 | 2,766 / 2,732 | 526 (404) / 423 (308) | std3 |
| `CryptoGames.CKA.dhScheme_correct` (`Computational/Proofs/CryptoGames/CKA/DHProof.lean`) | §4.1.2 DH CKA correctness | 55 | 65 (29) | std3 |
| `CryptoGames.FSAEAD.Thm5.theorem5With_on_multi` (`Computational/Proofs/CryptoGames/FSAEAD/Theorem5On.lean`) | Thm 5 | 2,856 | 809 (608) | std3 |

**Checked theorems outside the headline closures.** Lean checks these, and no headline uses them:
`pqxdhFirstMessageRoundtrip` and `pqCliFirstMessageRoundtrip`
(`Computational/Tests/NonVacuity/FirstMessageRoundtrip.lean`); `pqCliSteadyRefinesSM_proof`
(`Computational/Proofs/LibsignalCli/PqSteadyRefine.lean`); the standalone two-key `KeyInd` and
`Auth`/`FirstMsg` proofs (`Pqxdh2KeyKeyIndSecureδ`, `PqxdhAuthSecureδ`, `Pqxdh2KeySecureδ`,
`Pqxdh2KeyCorrectAndSecureδ` in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`);
the standalone SHA-512 random-oracle XEdDSA reductions (`XeddsaSignRoundtrip`,
`GapDhWithSignRoBound1A`, `GapDhWithSignRoBound1B`, `GapSigEufCmaRoBoundQuad`,
`GapSigEufCmaRoBound` in `Computational/Proofs/SignalPqxdh/XeddsaRom/`, DEV-PQ13);
and the standalone session-refinement proof `libsignal_refines_C_proof`
(`Computational/Proofs/CryptoGames/Ratchet/SessionProofs/RefinementC.lean`, built through `Computational/Tests.lean`).

All of the ACD19, model-level PQXDH (`PqxdhCorrectAndSecureδ` / `Headline`), default-library
(`Computational/Theorems/Lemmas.lean`), and `CliElfLib` (`Computational/Theorems/Main.lean` and
`Symbolic/Theorems/{Refinement,Security}.lean`) theorems use only `std3`. To trust one of
them as a formalization of its item, read its statement and the definitions it uses
(`trusted_closure.csv`, column `headlines`).

**SPQR V1 model & placed integration.** The concrete Lean model of `spqr` 1.6.0 (`spqrV1` / `spqrV1Recv`,
`LibsignalBinary/Specifications/LibsignalSpqrV1/`: one file per `spqr` module, assembled in `Model.lean` /
`Assemble.lean`; libcrux ML-KEM-768 as uninterpreted functions in `MlKem.lean`; extern-stub contracts
`SpqrHooks` and CPU-probe cell symbols in `Hooks.lean`) is part of Tier 2 of `L2`, `L3`, and the
PQXDH-mode CLI theorems.
The SPQR specs' normal-return posts (`spqrSendSpec`, `spqrRecvSpec`, `spqrRecvSpecExactKey` in
`LibsignalBinary/Specifications/LibsignalTripleRatchet.lean`, bridged from `optKeyBytesAt` /
`recvResultExactKeyAt` in `LibsignalBinary/Specifications/LibsignalSpqrV1/Statements.lean`) say that the
model does not panic on the call's inputs (`¬ S.sendPanics` / `¬ S.recvPanics`), so the callers'
models, which abort when SPQR panics (`TripleRatchet.decrypt`, `OutgoingTripleRatchet.encrypt`),
take their normal branch whenever `spqr::send` / `spqr::recv` returns.
The legacy SPQR-off hypothesis `Corr.SpqrOffCorrect`
(`Computational/Proofs/CryptoGames/Ratchet/LibsignalWireRoundTrip.lean`, DEV-LS24) holds only for SPQR switched off
(`spqrOffB`) or an idealized salt channel and is retained solely for the standalone SPQR-off session
corollary `libsignal_session_sm_r1_proto`; the main headlines (`L2`, `L3`, `Main`) prove SPQR V1
directly without it.
`LibsignalBinary/SpecAudit/SpqrV1.lean` (`#spec_nonvacuous!` / `#spec_lint!`) and
the differential vectors from real `spqr` (`LibsignalBinary/Proofs/SpqrV1/Vectors/*Check.lean`) are
checked by Lean as roots of the default library `LibsignalSpqrV1Spec`.
`LibsignalBinary/Specifications/LibsignalSpqrV1/Entries.lean` states the public-API V1
store contract (`RecordPqStateLengthBelow2Pow32`, `loadSessionSpecPqStateLengthBound`), while the
placed CLI/E2E proofs discharge SPQR V1 send/recv/init across `LibsignalBinary/Proofs/SpqrV1Placed/`
and `LibsignalBinary/Proofs/SignalSession/Cli/`.

**PQXDH under a δ-correct KEM.** `SignalPqxdh.Security.PqxdhCorrectAndSecureδ`
(`Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean`, proved in
`Computational/Proofs/SignalPqxdh/Delta/Statements.lean`) states functional correctness under
`WellFormedPrimitivesδ P` (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`), one-key
random-oracle `KeyInd` security (`PqxdhKeyIndSecureδ`, adding `kemDecapsFailureTerm S δ` to
`pqxdhKeyIndBoundActive S b.q_on` — bounded above by `pqxdhKeyIndBound S` via `pqxdhKeyIndBoundActive_le`, with equality once `b.q_on ≥ S.N_dh` — under `KemDeltaCorrect P δ`, `GapSigEufCma`, `KemShCr`, and `GapDhWithSign`;
DEV-PQ13, DEV-PQ21), and one-key first-message `Auth` security (`PqxdhAuth1KeySecureδ` in
`Computational/Specifications/Pqxdh/Security/Auth/Headline.lean`, game `Auth1KeyAdvantage` in
`Computational/Specifications/Pqxdh/Security/Auth/Game.lean`, adding `kemDecapsFailureTerm S δ` to `pqxdhAuthBound`
under `GapSigEufCma`, `KemShCr`, `GapDhWithSign`, `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`, and `PrfHmac`; DEV-C5). It includes `Computational/Specifications/Assumptions/KemCorrect.lean`
(`kemHonestExchangeFails`, `KemDeltaCorrect`, `CryptoWellFormedDh`, `CryptoWellFormedKemδ`,
`CryptoWellFormedPrimitivesδ`) and `Computational/Specifications/Assumptions/KeyInd1KeyRo.lean`
(`pqxdhKeyIndImpl1KeyRo`, `KeyInd1KeyRoAdvantage`) in the PQXDH headline's trusted closure. Standalone statements and proofs
of two-key `KeyInd` and `Auth`/`FirstMsg` (`Pqxdh2KeyKeyIndSecureδ`, `PqxdhAuthSecureδ`,
`Pqxdh2KeySecureδ`, `Pqxdh2KeyCorrectAndSecureδ` in
`Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`) and SHA-512 random-oracle
reductions from `GapDhWithSign` and `GapSigEufCma` to `GapDH`
(`Computational/Proofs/SignalPqxdh/XeddsaRom/`) live outside the trusted base. `headlineδ` is the
only model-level PQXDH theorem of `Computational/Theorems/`.

**What the CLI statements do not claim.** The CLI statements are about the CLI's whole process.
`LibsignalCliPqSecure` (`StatementPqSecure.lean`) bounds the CLI game on PQXDH directories with the
bound definitions of `StatementBinaryHarnessCore.lean` and `StatementComposed.lean`, under
`CliSpecPqxdh run X W`, and the theorems of `Computational/Theorems/Main.lean` prove that spec and
that bound for the pinned ELF at the closed primitive bundle `realPEParams` (SHA-256 `sha256Compress`, FIPS 197 AES-256, RFC 7748 X25519, FIPS 180-4 SHA-512, Kyber-1024 over FIPS 202 SHA-3, and FIPS 203 ML-KEM-768) for correctness (up to allocation failure, DEV-CLI15) and, for security, with no allocation premise (§6). They are limited in these ways:
- the results are for the modelled 1 GiB physical-memory budget; after a run aborts on a failed allocation, stdout and the files are not claimed (DEV-CLI15);
- the PQXDH-mode CLI game refuses, without running the CLI, a `recv` whose input is `2^32` bytes or
  longer, or is a pre-key message whose inner message is `2^32 - 2048` bytes or longer
  (`cliPqLenOk`, DEV-CLI14), and on `inject` refuses inputs above `stdinCapBytes` (`2^20`) before
  `receive` (`bhInjOK`, DEV-CLI14 / DEV-CLI21; the binary exits `2` and writes nothing on such
  inputs, and no honest delivery is affected for `ℓ < 10^6`);
- unpartnered first-message payload privacy and first-message (initiator→responder) authentication
  (for pre-key messages that are not promoted into a session under `hdr == d.hdr`) are covered at
  model level by Lemma 1's one-key `Auth` conjunct (`PqxdhAuth1KeySecureδ`), but are not folded
  into the composed or CLI headlines (DEV-C5);
- clause 1 of the PQXDH-mode security bound keeps the term `2 · KeyInd1KeyRealAdvantage advK` (the real
  one-key handshake with HKDF-SHA256), and no standard-model theorem bounds it: clause 2 reduces it to
  Lemma 1's one-key PQXDH bound via `KeyIndRoGap` (the random-oracle modelling of HKDF, assumption 2 on
  the one-key game, `KeyInd1KeyRo.lean`, DEV-CLI16).
