# Paper → code map

This file maps each element of the paper *Formally Verifying Signal's Security Using AI* (draft of
2026-10-26) to the Lean declarations and files that formalize it. The order follows the paper's
sections. Every path is relative to the repository root. Each row gives a **status**:

* **proved**: a theorem on `main` whose axioms are the three standard ones. `scripts/HeadlineAxioms.lean`
  checks this in CI for the headline theorems (and `scripts/CheckMainOfLemmasClosure.lean` for `main_of_lemmas_placed`; full per-theorem sweeps `scripts/CliAxiomGuard.lean` and `scripts/CliElfAxiomGuard.lean` are manual checks outside CI, Anton 2026-11-07 21:29Z).
* **conditional**: proved, but under a named hypothesis that is not discharged.
* **open**: stated on `main` with `sorry`.
* **disproof**: a statement about a deliberately broken binary. See
  [Bug-injection disproofs and synthetic stubs](#bug-injection-disproofs-and-synthetic-stubs).

Names are stable but line numbers are not, so none are given. Related maps:
[`Computational/docs/README.md`](../Computational/docs/README.md) maps ACD19 (Alwen, Coretti,
Dodis) to the Double Ratchet games,
[`docs/Symbolic/PAPER_DIFFERENCES.md`](Symbolic/PAPER_DIFFERENCES.md) maps Cheval et al.
(2026) and Bhargavan et al. (2024) to the symbolic model and theorems, and
[`Symbolic/BugInjection/README.md`](../Symbolic/BugInjection/README.md) covers the symbolic
bug-injection setup of §6.

---

## §2 Setup for verification: `libsignal-cli`

Both the paper and the code call the CLI `libsignal-cli` (formerly `signal-session`; unrelated to
the community `signal-cli`).

| Paper | Code | Notes |
|---|---|---|
| The CLI (Rust, wraps libsignal v0.105.4) | [`third_party/libsignal/libsignal-session/cli/`](../third_party/libsignal/libsignal-session/cli/) (`src/main.rs`; crates `handshake`, `ratchet`, `io`) | |
| The executable that is verified | `cliElfBytes` in [`LibsignalBinary/Specifications/SignalSession/CliElf.lean`](../LibsignalBinary/Specifications/SignalSession/CliElf.lean) | `file_bytes%` with a pinned SHA-256. Built from source with stock LLVM `ld.lld` by `scripts/cli-elf-stock --stdbin --build` (linker script `third_party/libsignal/libsignal-session/cli-elf/stock/stock_c2.ld`, rendered from `cli-elf/stock.ld`, inputs pinned in `third_party/libsignal/libsignal-session/cli-elf/stock/inputs_stock_stdbin.lock`) |
| Fig. 1: a party is a directory, and an operation is one run | `CliRun`, `CliHooks` ([`CliRun.lean`](../LibsignalBinary/Specifications/SignalSession/CliRun.lean)); `Placed.cliRunPlacedSig mpl mmpl elf W` ([`CliBinaryPq.lean`](../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)); [`CliProcess.lean`](../LibsignalBinary/Specifications/SignalSession/CliProcess.lean) | `Placed.cliRunPlacedSig` is the ELF's relocatable process across placements `(mpl, mmpl)` of `libsignalSessionLib` and `VerifiedLibraries.mallocngLib` under hooks `W` |
| Fig. 2: Bob's directory before and after `m1` | `encodeDir`, `PqParty` ([`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean)) | The file layout of a party |
| Fig. 3: bash scenario (`init`/`send`/`recv`) | `pqInitInputs`, `pqSendInputs`, `pqRecvInputs` ([`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean)) | |
| Hooked primitives vs. allocator, `memcpy`/`memset`, and readers | `CliHooks` ([`CliRun.lean`](../LibsignalBinary/Specifications/SignalSession/CliRun.lean)), `Placed.cliHookTablePlaced` (`27` external hooks + `18` `SIGABRT` panic externs in [`CliBinaryPq.lean`](../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)); musl's `mallocng` (`VerifiedLibraries.mallocngLib`, including `memcpy` and `memset` at blocks `20`/`21`) and `read_file`/`read_stdin` have machine-checked contracts for their AArch64 code (with the `19` de-hooked externs of `Placed.cliDehookedSymsPlaced`, including the `10` libc / Rust-library routines de-hooked at C2 whose linked code runs, resolved via `DirectOrBranchStub`), transferred to the real ELF via per-call `FdsHiFrame` in `VmPreserved` and the K-route proof `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed` (DEV-CLI19); `PEParams` (`W.C`, `W.Q`) | DEV-E8, DEV-PQ1, DEV-CLI19 in [`DEVIATIONS.md`](../Computational/docs/DEVIATIONS.md) |

## §3 AArch64 semantics

These live in the [`arm64-semantics`](../arm64-semantics/) submodule (pinned at v0.51.2). Everything
under [`Arm64/Trusted/`](../arm64-semantics/Arm64/Trusted/) is trusted.

| Paper | Code | Status |
|---|---|---|
| `ElfRunsTo bin pre post` | `ElfRunsTo` in [`LibsignalBinary/Specifications/SignalSession/Process.lean`](../LibsignalBinary/Specifications/SignalSession/Process.lean) | trusted definition |
| `loadElf` | `Arm64.loadElf` in [`arm64-semantics/Arm64/Trusted/Process/Loader.lean`](../arm64-semantics/Arm64/Trusted/Process/Loader.lean); `ElfImage` in [`.../Process/Types.lean`](../arm64-semantics/Arm64/Trusted/Process/Types.lean) | trusted definition |
| `Steps prog s s'` | `inductive Steps` / `Step` in [`arm64-semantics/Arm64/Trusted/ISA/Semantics.lean`](../arm64-semantics/Arm64/Trusted/ISA/Semantics.lean) | trusted definition |
| `State`, `Program` (image + hooks) | `structure State` ([`ISA/State.lean`](../arm64-semantics/Arm64/Trusted/ISA/State.lean)), `structure Program` ([`ISA/Semantics.lean`](../arm64-semantics/Arm64/Trusted/ISA/Semantics.lean)) | trusted definition |
| Decoder; `execInst` | `decode` ([`ISA/Decode.lean`](../arm64-semantics/Arm64/Trusted/ISA/Decode.lean)); `execInstWithSvc` ([`ISA/Eval.lean`](../arm64-semantics/Arm64/Trusted/ISA/Eval.lean)) | trusted. The paper's `execInst` is `execInstWithSvc` |
| System-call model (mm, file/stream I/O, `exit_group`) | [`arm64-semantics/Arm64/Trusted/Syscalls/`](../arm64-semantics/Arm64/Trusted/Syscalls/) | trusted |
| Assertion language; `subroutine_ok` | [`Arm64/Trusted/Spec/SepLogic.lean`](../arm64-semantics/Arm64/Trusted/Spec/SepLogic.lean), [`SepLogicModel.lean`](../arm64-semantics/Arm64/Trusted/Spec/SepLogicModel.lean); `subroutine_ok` in [`Spec/Hoare.lean`](../arm64-semantics/Arm64/Trusted/Spec/Hoare.lean) | trusted |
| Program logic (sep-logic rules, WP calculus, automation), proved sound | [`arm64-semantics/ProofLib/`](../arm64-semantics/ProofLib/) | **not trusted**, checked by Lean |
| Validation against Unicorn / Sail / qemu | [`arm64-semantics/tools/run-trusted-tests/`](../arm64-semantics/tools/run-trusted-tests/), [`arm64-semantics/Arm64/Testing/`](../arm64-semantics/Arm64/Testing/) | testing, not proof |

## §4 Computational proofs

### §4.2 The composed game

| Paper | Code | Status / notes |
|---|---|---|
| Generic game `G(Σ)` | `composedExp` over an interface `ComposedIface` (fields `St`, `prims`, `Drv`, `init`, `impl`, `won`) in [`GenericGame.lean`](../Computational/Specifications/Game/GenericGame.lean); `ComposedAdvantage`. Its oracles, guard, bookkeeping and win condition are the driver of [`StatementBinaryHarnessCore.lean`](../Computational/Specifications/Game/StatementBinaryHarnessCore.lean) (`bhDrvKeyInd`, `bhDrvGuard`, `ModelDriverState`, `allTestedSessionsFresh`, `driverSomeInstanceWon`) | trusted |
| `G(Σbin)` (every ratchet step is a CLI run) | `cliPqExp`, `CliPqxdhAdvantage` in [`StatementPq.lean`](../Computational/Specifications/Game/StatementPq.lean): defined as `composedExp (cliIface …)`, where `cliIface` is `Σbin`. [`Computational/Tests/Guards/GenericGameGuard.lean`](../Computational/Tests/Guards/GenericGameGuard.lean) checks by `rfl` that this is the game the theorems were stated about | trusted |
| `startDR` guard and `inject` filter | `bhDrvGuard`, `bhInjOK` ([`StatementBinaryHarnessCore.lean`](../Computational/Specifications/Game/StatementBinaryHarnessCore.lean)) | `bhInjOK` enforces `decide (c.length ≤ stdinCapBytes)` (`stdinCapBytes = 2^20`, DEV-PQ10 / DEV-CLI14 / DEV-CLI21; `AtomicOps.lean` operation tables unchanged) |
| Handshake oracles (Fiedler–Günther KeyInd) | `pqxdhKeyIndImpl` in [`Pqxdh/Game.lean`](../Computational/Specifications/Pqxdh/Game.lean) | |
| `Hro` (one X25519/XEdDSA key, HKDF as RO) | `pqxdhKeyIndImpl1KeyRo` in [`Assumptions/KeyInd1KeyRo.lean`](../Computational/Specifications/Assumptions/KeyInd1KeyRo.lean) | bounded by Lemma 1 (`PqxdhKeyIndSecureδ`); standalone two-key `pqxdhKeyIndExp` (`Pqxdh2KeyKeyIndSecureδ`) in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean` (DEV-PQ13) |
| `Hlib` (one X25519/XEdDSA key, real HKDF) | `pqxdhKeyIndImpl1KeyReal` in [`Assumptions/KeyInd1KeyReal.lean`](../Computational/Specifications/Assumptions/KeyInd1KeyReal.lean) | DEV-CLI16 |
| Budgets `Nid, Ndh, Nspk, Nopk, Nsend, qstart, qk, qep` | `SignalPqxdh.Setup`, `QueryBudget`, `CliGameAdversaryPerInstanceBounded` ([`StatementBinaryHarnessCore.lean`](../Computational/Specifications/Game/StatementBinaryHarnessCore.lean)) | DEV-C13 |
| Triple Ratchet / SPQR in the interface | `LibsignalBinary/Specifications/LibsignalSpqrV1/` (Lean model of spqr 1.6.0) | trusted (§4.6) |

### §4.3 Reductions as programs

| Paper | Code |
|---|---|
| Costed reduction language and cost measure | [`Computational/Specifications/Reductions/ReductionDsl/Core.lean`](../Computational/Specifications/Reductions/ReductionDsl/Core.lean), [`Samplers.lean`](../Computational/Specifications/Reductions/ReductionDsl/Samplers.lean), [`AtomicOps.lean`](../Computational/Specifications/Reductions/ReductionDsl/AtomicOps.lean), [`TargetCodecs.lean`](../Computational/Specifications/Reductions/ReductionDsl/TargetCodecs.lean) (trusted); proofs in `Computational/Proofs/ReductionDsl/` |
| `cost(R,q) = c_init + q·c_handle + c_finish`; polynomial bounds | [`ReductionDsl/Core.lean`](../Computational/Specifications/Reductions/ReductionDsl/Core.lean); adapter bound `CliAdapterCostBounded` |
| Tutorial | [`Computational/docs/REDUCTION_DSL_TUTORIAL.md`](../Computational/docs/REDUCTION_DSL_TUTORIAL.md) |

### §4.4 Main Theorem and Lemmas

| Paper | Lean theorem | Statement (trusted) | Proof | Status |
|---|---|---|---|---|
| **Main Theorem (binary correctness and security)** | `libsignal_cli_pq_secure_elf_binary_placed` ([`Theorems/Main.lean`](../Computational/Theorems/Main.lean), lake lib `CliElfLib`); advantages and bounds in `ℝ≥0∞` | `CliPqxdhBinaryCorrectAndSecurePlaced cliElfBytes` ([`StatementPqElf.lean`](../Computational/Specifications/LibsignalCli/StatementPqElf.lean)): `parse ∧ CliPqxdhElfCorrectPlaced ∧ ∀ Pt S ℓ, CliPqxdhElfSecurePlaced` | [`Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean`](../Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean) via `main_of_lemmas_placed` ([`MainOfLemmas.lean`](../Computational/Proofs/LibsignalCli/MainOfLemmas.lean)) and `ElfNoOomPlacedInstK.cliElf_noOOM_of_parseK` (with `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`) | proved; headline `Main` (`CliElfLib`); security clause has no assumed-no-OOM premise (DEV-CLI12 retired) and no `2·δ_oom(A)` term (DEV-CLI17 retired) |
| **Main from Lemmas 1–4** | `main_of_lemmas_placed` ([`MainOfLemmas.lean`](../Computational/Proofs/LibsignalCli/MainOfLemmas.lean)) | `PqxdhCorrectAndSecureδ → (∀ …, SessionSecure ℓ) → (∀ …, ModelSecure S ℓ) → CliPqxdhBinaryCorrectPlaced bytes → (∀ …, ¬ CliReachesOOMPlaced …) → CliPqxdhBinaryCorrectAndSecurePlaced bytes` | [`MainOfLemmas.lean`](../Computational/Proofs/LibsignalCli/MainOfLemmas.lean) (closure audited by `scripts/CheckMainOfLemmasClosure.lean`) | proved (`std3` only; 0 underlying L1–L4 security proofs in closure) |
| Main Theorem for any `run` meeting the CLI spec | `libsignalCliPqSecure_holds` ([`Proofs/LibsignalCli/HeadlinePqCliClosed.lean`](../Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean)) | `LibsignalCliPqSecure` ([`StatementPqSecure.lean`](../Computational/Proofs/LibsignalCli/StatementPqSecure.lean)) | [`Proofs/LibsignalCli/HeadlinePqCliClosed.lean`](../Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean) | proved (generic excused-abort shape `CliPqxdhSecurityFor` with `exc? := some exc` remains in [`StatementPqElf.lean`](../Computational/Specifications/LibsignalCli/StatementPqElf.lean) with `CliPqxdhFlagProb` in [`StatementPqOomGame.lean`](../Computational/Specifications/Game/StatementPqOomGame.lean), unused by any headline; DEV-CLI17 retired) |
| Bound term `2 εKI1` | `2 · KeyInd1KeyRealAdvantage advK` (clause 1 of `LibsignalCliPqSecure`) | [`KeyInd1KeyReal.lean`](../Computational/Specifications/Assumptions/KeyInd1KeyReal.lean) | | the term is kept in clause 1; no standard-model theorem bounds it |
| Bound term `2 Nsend Nspk δkem` | `kemDecapsFailureTerm S δ_kem` ([`Security/HeadlineDelta.lean`](../Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean)) | | | |
| Bound term `Σ_k max_f Sess_k(f)` | the prefix-hybrid sum in `LibsignalCliPqSecure` (`prefixSum`, reductions `D`, `R_e2e`) | | | promoted sessions + partnered first pre-key messages; unpartnered first-message payload privacy and authentication are covered by Lemma 1's one-key `Auth` conjunct but not folded in here (DEV-C5) |
| **Corollary** (ROM step `ε_ro`) | clause 2 of `LibsignalCliPqSecure` / `CliPqxdhElfSecurePlaced` | `KeyIndRoGap` ([`KeyInd1KeyRo.lean`](../Computational/Specifications/Assumptions/KeyInd1KeyRo.lean)) | [`MainOfLemmas.lean`](../Computational/Proofs/LibsignalCli/MainOfLemmas.lean) | **conditional** on `KeyIndRoGap`, the ROM instantiation of assumption 2 on the one-key game (`ε_ro = 0` in the ROM, DEV-CLI16) |
| **Lemma 1 (PQXDH correctness, one-key `KIδ` bound for `Hro`, and one-key first-message `Auth`)** | headline `SignalPqxdh.Security.headlineδ` ([`Theorems/Lemmas.lean`](../Computational/Theorems/Lemmas.lean); label `L1`). | `PqxdhCorrectAndSecureδ`, `PqxdhSecureδ`, `PqxdhKeyIndSecureδ`, `pqxdhKeyIndAdvantageBoundδ` ([`Security/HeadlineDelta.lean`](../Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean)), under `GapSigEufCma`, `KemShCr`, `GapDhWithSign` ([`Assumptions.lean`](../Computational/Specifications/Assumptions/Assumptions.lean)); `PqxdhAuth1KeySecureδ`, `pqxdhAuthAdvantageBoundδ` ([`Security/Auth/Headline.lean`](../Computational/Specifications/Pqxdh/Security/Auth/Headline.lean); game `Auth1KeyAdvantage` in [`Security/Auth/Game.lean`](../Computational/Specifications/Pqxdh/Security/Auth/Game.lean)), additionally under `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`, `PrfHmac` (DEV-C5) | [`Proofs/SignalPqxdh/Delta/Statements.lean`](../Computational/Proofs/SignalPqxdh/Delta/Statements.lean) | proved; headline `L1` (default library); standalone `Pqxdh2KeyCorrectAndSecureδ` (`Pqxdh2KeyKeyIndSecureδ`, `PqxdhAuthSecureδ`) in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean` outside the TCB |
| **Lemma 2 (Double Ratchet + SPQR V1 session security)** | headline `session_secure` ([`Theorems/Lemmas.lean`](../Computational/Theorems/Lemmas.lean); label `L2`). Supporting session refinement proof (`libsignal_refines_C`) is listed in `Computational/docs/TRUSTED_BASE.md` §7 | `SessionSecure`, `sessionAdvantageBound` ([`StatementSession.lean`](../Computational/Specifications/Session/StatementSession.lean)) | [`Proofs/LibsignalCli/HeadlineSession.lean`](../Computational/Proofs/LibsignalCli/HeadlineSession.lean) | proved; headline `L2` (default library) |
| **Lemma 3 (multi-session model composition, any `H`)** | headline `model_secure_costed` ([`Theorems/Lemmas.lean`](../Computational/Theorems/Lemmas.lean); label `L3`), statement `ModelSecure` ([`StatementModel.lean`](../Computational/Specifications/Composition/StatementModel.lean)) over the interface `modelIface P ki …` ([`ModelIface.lean`](../Computational/Specifications/Game/ModelIface.lean); `Σ_model^H`, any KeyInd oracle `ki` meeting the lazy-sampling condition `hLazyEq` of [`ModelLazyCond.lean`](../Computational/Proofs/SpecLemmas/Composition/ModelLazyCond.lean)), bounding `ComposedAdvantage` by `2 · KeyIndAdvantageForHandshake ki advK` plus the per-session stage-1 mixture `SM.gameR` bias (with no session assumption table or `D`); proof `model_secure_costed_proof` ([`Proofs/LibsignalCli/HeadlineModel.lean`](../Computational/Proofs/LibsignalCli/HeadlineModel.lean)) from `model_secure`, and `model_secure_1KeyReal` (`H = Hlib`), in [`GenericGameModel.lean`](../Computational/Proofs/LibsignalCli/GenericGameModel.lean). A model-level instance is `composed_pqxdh_dr_security_v1_spqr_of_hiddenSalt` ([`Proofs/E2E/HeadlineComposed.lean`](../Computational/Proofs/E2E/HeadlineComposed.lean)) | `ModelSecure` ([`StatementModel.lean`](../Computational/Specifications/Composition/StatementModel.lean)) | [`Proofs/LibsignalCli/HeadlineModel.lean`](../Computational/Proofs/LibsignalCli/HeadlineModel.lean), [`GenericGameModel.lean`](../Computational/Proofs/LibsignalCli/GenericGameModel.lean) | proved; headline `L3` (default library) |
| **Lemma 4 (machine code refines the model)** | headline `libsignal_cli_pq_binary_correct_placed` ([`Theorems/Main.lean`](../Computational/Theorems/Main.lean); label `L4`) | `CliPqxdhBinaryCorrectPlaced cliElfBytes`, `CliPqxdhElfCorrectPlaced` ([`CliBinaryPq.lean`](../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)) | [`Proofs/LibsignalCli/ElfHeadlinePq.lean`](../Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean), `LibsignalBinary/Proofs/SignalSession/Cli/` | proved; headline `L4` (`CliElfLib`), with no hypothesis on `W`, up to `.OutOfMemory` (`CliReachesOOMPlaced`, DEV-CLI15) |
| **Placement non-vacuity witnesses & label gate A** | `libsignal_cli_elf_linked_in` (label `LinkedIn`), `libsignal_cli_elf_mallocng_linked_in` (label `MallocngLinkedIn`), `libsignal_cli_labels_from_objects` (label `Labels`, all in [`Theorems/Main.lean`](../Computational/Theorems/Main.lean)) | `libsignalSessionLib.LinkedIn cliElfBytes`, `VerifiedLibraries.mallocngLib.LinkedIn cliElfBytes` ([`CliBinaryPq.lean`](../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)), `CliLabelsFromObjects` ([`CliLabels.lean`](../LibsignalBinary/Specifications/SignalSession/CliLabels.lean)) | [`Proofs/LibsignalCli/ElfHeadlinePq.lean`](../Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean) | proved (`CliElfLib`) |
| `run(op, enc(σ), x, r) = obs(step(σ,x;r))` | `CliSpecPqxdh` ([`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean)); `CliSpecPqxdhNoMatch` ([`PqDirNoMatch.lean`](../LibsignalBinary/Specifications/SignalSession/PqDirNoMatch.lean)) | | | |
| `enc` / `obs` / `step` | `encodeDir` / `pqxdhExpectedOutcome` / `pqInitModel`, `pqSendModel`, `pqRecvWhisperModel`, `pqRecvPrekeyModel` ([`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean)) | | | |
| `Inv` (reachable model states) | `PqxdhPartyInSpecDomain` ([`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean)) is the domain in the statement. The paper's invariant is the proof-side reachability argument | | | |
| Size and input-cap premises (record < 2^31, non-base-key files ≤ 2^21, stdin ≤ 2^20, send plaintext ≤ 10^6, input < 2^32, prekey inner + 2048 < 2^32) | `CliSpecPqxdh` clauses and `stdinCapBytes = 2^20`, `fileCapBytes = 2^21`, `maxPlaintextBytes = 10^6` ([`Run.lean`](../LibsignalBinary/Specifications/SignalSession/Run.lean), [`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean)); `bhInjOK` (`decide (c.length ≤ stdinCapBytes)`, [`StatementBinaryHarnessCore.lean`](../Computational/Specifications/Game/StatementBinaryHarnessCore.lean), DEV-CLI14 / DEV-CLI21); `cliPqLenOk` ([`StatementPq.lean`](../Computational/Specifications/Game/StatementPq.lean), DEV-CLI14) | | | |

### §4.5 Premises and §4.7 limitations

| Paper | Code |
|---|---|
| No heap allocation fails | proved unconditionally for `cliElfBytes` on the modelled 1 GiB physical-memory machine (`ProcessInit.physMemAvail = 2^30`): no PQXDH-mode run reaches `.OutOfMemory` (`ElfNoOomPlacedInstK.cliElf_noOOM_of_parseK`, with proof-side fd closedness via `FdsHiFrame` in `VmPreserved` and K-route transfer via `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`), so the Main Theorem's security clause has no allocation premise (DEV-CLI12 retired) and no `2·δ_oom(A)` term (DEV-CLI17 retired). Lemma 4's statement (`CliPqxdhElfCorrectPlaced`) still allows `.OutOfMemory` (DEV-CLI15) |
| Hooked routines meet their specs | `CliHooks` fields (`27` external hooks in `Placed.cliHookTablePlaced`); `HookSat` contracts in `LibsignalBinary/` |
| ML-KEM-768 encapsulation total on SPQR keys | `MlKemEncaps1SucceedsOn64ByteHeaderAndSeeds` ([`StatementBinaryHarnessCore.lean`](../Computational/Specifications/Game/StatementBinaryHarnessCore.lean)), `Encaps1Total` ([`LibsignalBinary/Specifications/LibsignalSpqrV1/Encaps1Total.lean`](../LibsignalBinary/Specifications/LibsignalSpqrV1/Encaps1Total.lean)) |
| `2(q_k + 1) + 25002 < 2^32` ratchet queries per session (`q_k ≤ 2^31 - 12503`) | the premise `_hq32 : ∀ k < qStart, 2 * (qs k + 1) + 25002 < 2^32` in `LibsignalCliPqSecure` and `CliPqxdhElfSecurePlaced` (matching Lemma 2; `encodeRecordX_length_le_1209331_cli` bounds every reachable session record by `1,209,331 < 2^31` bytes) |
| Messages shorter than 10^6 bytes; standard input and injected ciphertexts ≤ 2^20 bytes | the premise `ℓ < 10^6`; `stdinCapBytes = 2^20` and `maxPlaintextBytes = 10^6` in [`Run.lean`](../LibsignalBinary/Specifications/SignalSession/Run.lean), plus `bhInjOK` (`decide (c.length ≤ stdinCapBytes)`, DEV-CLI14 / DEV-CLI21; no `ReductionDsl` operation table is capped) |
| spqr's CPU-feature probe fixed to "no AES/PMULL" | `Placed.cliTokenPatchPlaced` ([`CliBinaryPq.lean`](../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)), DEV-CLI10 |
| Alice refuses every prekey message | DEV-CLI13 ([`StatementPq.lean`](../Computational/Specifications/Game/StatementPq.lean)) |
| Canonical protobuf encoding only (G1); no previous sessions (G2/G5) | `CliSpecPqxdh` domain notes in [`PqDir.lean`](../LibsignalBinary/Specifications/SignalSession/PqDir.lean); DEV-C-PREV |
| All deviations | [`Computational/docs/DEVIATIONS.md`](../Computational/docs/DEVIATIONS.md) |

### §4.6 Trusted computing base

| Paper | Code |
|---|---|
| The trusted base computed from the type of the theorem | `scripts/TrustedClosure.lean`, `scripts/trusted-closure.sh`, `scripts/closure_diff.py` |
| Axiom and closure audit (code/layout kernel-checked against ELF; name labels rest on the trusted extractor's pre-link objects, label gate A `libsignal_cli_labels_from_objects`, with assumption A-LINK machine-checked on the stock `ld.lld` ELF by `scripts/stock-pin/alink_check.py`, see `Computational/docs/TRUSTED_BASE.md`; the legacy linker's output is out of both the shipped ELF build and the kernel-checked statement closure) | `scripts/HeadlineAxioms.lean`, `scripts/CheckPromotedHeadlinesClosure.lean`, `scripts/CheckMainOfLemmasClosure.lean`, `scripts/check_no_axiom_decls.py`, `scripts/check_no_sorry.py` (run in CI); `scripts/CliAxiomGuard.lean`, `scripts/CliElfAxiomGuard.lean` (manual full-tree sweeps outside CI, Anton 2026-11-07 21:29Z) |
| "Trusted" / "Checked by Lean" banners on each file | checked by `scripts/check_docs.py trust-banners` |

## §5 Symbolic proofs

Fig. 4's five-step architecture is split between trusted definitions in
[`Symbolic/Specifications/`](../Symbolic/Specifications/), trusted theorem files in
[`Symbolic/Theorems/`](../Symbolic/Theorems/), and untrusted kernel-checked proofs in
`Symbolic/Proofs/` (entry points in
[`Symbolic/Proofs/TopLevelHelpers/Composed/`](../Symbolic/Proofs/TopLevelHelpers/Composed/)). See
[`docs/Symbolic/PAPER_DIFFERENCES.md`](Symbolic/PAPER_DIFFERENCES.md) for the detailed
comparison with Cheval et al. (2026) and Bhargavan et al. (2024).

### §5.1 Symbolic model

| Paper | Code | Notes |
|---|---|---|
| DyLean framework (`Traceful`, `ExecTrace`, `AttackerKnows`, `genRand`, `sendMessage`, `storeLocalState`, `LocalStateCompromised`, `logEvent`, `dh`/`dhPk`) | External `DY` (`DyLean`), instantiated in [`Model/Composed.lean`](../Symbolic/Specifications/Model/Composed.lean) (`HasExecBytes`, `HasExecTrace`) and [`Model/Instance.lean`](../Symbolic/Specifications/Model/Instance.lean) (`BytesFunctor`, `attackerKnowledge`, `ExecEntryT`, `baseAttackerKnowledge`) | trusted |
| Equational theories: `symEnc`/`symDec` (AES-256-CBC), 8-byte MAC truncation, wire format | [`EquationalTheory/SymEnc.lean`](../Symbolic/Specifications/Model/EquationalTheory/SymEnc.lean), [`Trunc.lean`](../Symbolic/Specifications/Model/EquationalTheory/Trunc.lean), [`TrWireMsg.lean`](../Symbolic/Specifications/Model/EquationalTheory/TrWireMsg.lean) | trusted |
| X25519 non-canonical encodings and small subgroup / 8-torsion | `Variant.SubF` (`Fin 4`, `Fin 8`), `normalizeX25519Key`, `isLowOrderKey`, `x25519TorsionVariant` in [`EquationalTheory/X25519.lean`](../Symbolic/Specifications/Model/EquationalTheory/X25519.lean) | trusted; setting of §6's small-subgroup bug |
| ML-KEM-1024 binding the public key into the shared secret | `CanPQKem`, `Encap.SubF`, `SharedSecret.SubF` (`pk` + `entropy`), `invertKemPublicKey` in [`EquationalTheory/Kem.lean`](../Symbolic/Specifications/Model/EquationalTheory/Kem.lean) | trusted; models `libsignal`'s FO `H(pk)` binding rather than PQXDH Rev. 2 AD |
| PQXDH handshake, dynamic compromises, and `breakDH`/`breakKEM` + `invertDH`/`invertKEM` (Bhargavan et al. + SPQR V1) | `registerIdentity`, `registerCorruptIdentity`, `genSignedPrekey`, `genPQPrekey`, `genOneTimePrekey`, `aliceHandshake`, `bobHandshake`, `compromiseIK`/`compromiseSPK`/`compromisePQSPK`/`compromiseOPK`, `breakDH`/`breakKEM`, `invertDH`/`invertKEM`, `PQXDHEvent` in [`Model/PQXDH.lean`](../Symbolic/Specifications/Model/PQXDH.lean) | trusted |
| Triple Ratchet (Double Ratchet coupled with SPQR, Cheval et al. §4.1–§4.1.4) | `trMsgKeys` ([`Model/MsgKeys.lean`](../Symbolic/Specifications/Model/MsgKeys.lean)); `TRState`, `messageEncrypt`, `messageDecrypt` (atomic DH + SPQR ratchets), `messageDecryptSkipped`, `exposeKey`, `exposeSkipped`, `exposeSpqr`, `TREvent` ([`Model/TripleRatchet.lean`](../Symbolic/Specifications/Model/TripleRatchet.lean)); SPQR V1 algebra ([`EquationalTheory/Spqr.lean`](../Symbolic/Specifications/Model/EquationalTheory/Spqr.lean)) | trusted |
| Composed state machine `Model` (step 1: PQXDH ∘ SPQR ∘ Triple Ratchet) | `aliceStart`, `bobStart`, `HandshakeSession`, `reachability` in [`Model/Composed.lean`](../Symbolic/Specifications/Model/Composed.lean), instantiated over the concrete 12-theory term algebra in [`Model/Instance.lean`](../Symbolic/Specifications/Model/Instance.lean) | trusted |

### §5.2 Security theorems

Role names follow `libsignal`: Alice (`AliceDone`) processes Bob's prekey bundle and sends first
(the initiator; the PQXDH paper's responder), while Bob (`BobDone`) publishes prekeys and receives
first (the responder; its initiator). Each model theorem (step 2) quantifies an attacker-parameterized query `Q(tr, K)` from
[`Symbolic/Specifications/Security/Model.lean`](../Symbolic/Specifications/Security/Model.lean)
over reachable traces of `reachability`; §5.4 reuses the same queries on hardware traces.

| Table 1 row | Lean theorem ([`Symbolic/Theorems/ModelSecurity.lean`](../Symbolic/Theorems/ModelSecurity.lean)) | Statement & query ([`Security/Model.lean`](../Symbolic/Specifications/Security/Model.lean)) | Proof | Status |
|---|---|---|---|---|
| Forward secrecy (Cheval et al. Fig. 3) | `Proven.ForwardSecrecy.forward_secrecy` | `ForwardSecrecy`, `FSQuery` (`mkSecurityTracePredicates`, `HandshakeRootCompromised`; `ExposedSpqr` excuses nothing) | [`TopLevelHelpers/Composed/FS.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/FS.lean) | proved |
| Post-compromise security (Cheval et al. Fig. 4) | `Proven.PostCompromiseSecurity.post_compromise_security` | `PostCompromiseSecurity`, `PCSQuery` (`mkSecurityTracePredicates`) | [`TopLevelHelpers/Composed/PCS.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/PCS.lean) | proved |
| Initiator secrecy (Bhargavan et al. Thm. 7, their responder secrecy) | `Proven.Handshake.alice_initiator_secrecy` | `AliceInitiatorSecrecy`, `AliceInitiatorSecrecyQuery` (`IsHandshakeBlock`, `AliceHandshakeWasCompromised`, `SessionStateExposed`) | [`TopLevelHelpers/Composed/Handshake.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Handshake.lean) | proved |
| Responder secrecy (Bhargavan et al. Thm. 9, their initiator secrecy) | `Proven.Handshake.bob_responder_secrecy` | `BobResponderSecrecy`, `BobResponderSecrecyQuery` (`BobHandshakeWasCompromised`, `SessionStateExposed`) | [`TopLevelHelpers/Composed/Handshake.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Handshake.lean) | proved |
| Authentication (Bhargavan et al. Thm. 8) | `Proven.Handshake.authentication` | `Authentication`, `AuthenticationQuery` (`ResponderSessionAgreement` via `SameDHKey`/`SameOPK`, `HandshakeAuthWasCompromised`) | [`TopLevelHelpers/Composed/Handshake.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Handshake.lean) | proved |
| Theorem 1 corollaries (Bhargavan et al. Thm. 1, App. A — five theorems) | `peer_authentication`, `handshake_forward_secrecy`, `kci_resistance`, `session_independence`, `hndl_resistance` (in `Proven.Handshake`) | `PeerAuthentication` (`PeerAuthenticationQuery`), `HandshakeForwardSecrecy` (`ForwardSecrecyQuery`), `KCIResistance` (`KCIQuery`), `SessionIndependence` (`SessionIndependenceQuery`), `HNDLResistance` (`HNDLQuery`) | [`TopLevelHelpers/Composed/Handshake.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Handshake.lean) | proved |
| Model non-vacuity checks (honest session & premise satisfiability) | — | `SanityHonestSession`, `SanityHonestWithOPK`, `SanityHonestWithoutOPK`, `FSPremiseSatisfiable`, `HandshakeSecrecyPremiseSatisfiable` ([`Symbolic/Tests/ModelNonVacuity.lean`](../Symbolic/Tests/ModelNonVacuity.lean)) | [`Proofs/Tests/Model/ComposedNonVacuity.lean`](../Symbolic/Proofs/Tests/Model/ComposedNonVacuity.lean) | proved (test) |

### §5.3 Assembly-layer events

| Paper | Code | Status / notes |
|---|---|---|
| Hardware byte strings vs. model terms | `HwBytes` vs. `DY.Bytes` in [`Concrete/MachineEvents.lean`](../Symbolic/Specifications/Concrete/MachineEvents.lean) | trusted |
| Hardware trace event (`CliEvent`, step 3) | `CliEvent` (`.run` \| `.env`) in [`Concrete/MachineEvents.lean`](../Symbolic/Specifications/Concrete/MachineEvents.lean) | trusted |
| Table 2 — Run events (`init`, `send`, `recv`) | `RunEvent` (`party`, `cmd`, `input`, `coins`, `exit`) in [`Concrete/MachineEvents.lean`](../Symbolic/Specifications/Concrete/MachineEvents.lean); `CliCall`, `InputsFor`, `runEventOf` in [`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean) | trusted; `exit = none` on an aborted run |
| Table 2 — Environment events (`leak`, `breakDH`, `breakKEM`, `invertDH`, `invertKEM`) | `EnvEvent`, `EnvEvent.IsBreakInvert` in [`Concrete/MachineEvents.lean`](../Symbolic/Specifications/Concrete/MachineEvents.lean) | trusted |
| Provisioned setup `r` and initial party directories | `ProtocolSetup` ([`Refinement/ModelTraces.lean`](../Symbolic/Specifications/Refinement/ModelTraces.lean)); `initDirs`, `DirectorySnapshot` ([`Refinement/CliSetup.lean`](../Symbolic/Specifications/Refinement/CliSetup.lean)) | trusted |
| Secrets leaked by `leak` (setup keys and current session record) | `RecordRec`, `SessionRec`, `ChainRec`, `recordBytes`, `KeyInRecord` ([`Concrete/SessionRecord.lean`](../Symbolic/Specifications/Concrete/SessionRecord.lean)); `KeyInDir`, `LeaksFrom` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)) | trusted |
| Hardware traces `Traces_I(r)` and inversion guards | `CliTraces`, `ValidCall`, `InvertsGuarded` (`HonestDHSecret`, `dhCoinSecrets`) in [`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean) | trusted |

### §5.4 Refinement

Trusted definitions and contract satisfiability:

| Paper | Code | Status |
|---|---|---|
| Concretization `γ`, opaque symbols `S`, ghost `g` (Arquint et al. §4.2) | `gamma` (and `gamma'` with shape/memo), `OpaqueSymbolSemantics`, `Ghost` in [`Refinement/Concretization.lean`](../Symbolic/Specifications/Refinement/Concretization.lean); wire/protobuf encodings in [`Refinement/WireFormat.lean`](../Symbolic/Specifications/Refinement/WireFormat.lean) | trusted |
| Extern interpretation `I` and algebraic/length laws | `ExternInterpretation`, `ExternCryptoLawsHold`, `X25519TorsionShiftsRejected` in [`Concrete/ExternInterpretation.lean`](../Symbolic/Specifications/Concrete/ExternInterpretation.lean); `sha256With`, `hmacWith` in [`Concrete/ByteSpecs.lean`](../Symbolic/Specifications/Concrete/ByteSpecs.lean); symbol constants in [`Concrete/ImageSymbols.lean`](../Symbolic/Specifications/Concrete/ImageSymbols.lean); `ExternContractsHoldCli` in [`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean) | trusted |
| Hooks agree with `I`; relocatable ELF run relation | `HooksMatchInterpretation`, `elfRelPlaced` in [`Refinement/ElfBinding.lean`](../Symbolic/Specifications/Refinement/ElfBinding.lean) | trusted |
| Extern laws and hook agreement jointly satisfiable | `Proven.ExternWitness.comp_externsSatisfiable_cli` ([`Symbolic/Tests/ExternWitness.lean`](../Symbolic/Tests/ExternWitness.lean)), statement `CompExternsSatisfiableCli` ([`SpecLemmas/ElfBindingProofDefs.lean`](../Symbolic/Proofs/SpecLemmas/ElfBindingProofDefs.lean), untrusted, with `ExternInterpretationTotalOnUsedSymbols` in [`SpecLemmas/ExternInterpretationProofDefs.lean`](../Symbolic/Proofs/SpecLemmas/ExternInterpretationProofDefs.lean)), proof [`TopLevelHelpers/Composed/Cli/ExternWitness.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Cli/ExternWitness.lean) | proved |
| Model steps, visible entries, and linear state use | `Step`, `VisEntry`, `stepView`, `runTrace`, `StepsStateFaithful`, `ModelRunWF` in [`Refinement/ModelTraces.lean`](../Symbolic/Specifications/Refinement/ModelTraces.lean) | trusted |
| Well-formed setup `r`; matching and explaining `τ` (`Expl(τ)`) | `ProtocolSetupWF`, `GhostAndSemMatchSetup`, `GhostWF`, `MatchesEvents` (`RunMatches`, `RunRejected`, `EnvMatches`), `PathFaithfulAt` / `ReadsFaithfully`, `Explains` in [`Refinement/TraceExplanation.lean`](../Symbolic/Specifications/Refinement/TraceExplanation.lean) | trusted |
| `Collision(τ)` (explained prefix + unavoidable collision on next run) | `CollisionAfterExplainedPrefix`, `PrefixExplainingGhosts`, `NextEventCollides` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)); `assumedInjective`, `MemoCollisionOn`, `MacTagForgeryOrCollision`, `RecvCollisionOn` ([`Refinement/TraceExplanation.lean`](../Symbolic/Specifications/Refinement/TraceExplanation.lean)) | trusted |
| Hardware attacker knowledge `K_ms` and queries `Q(ms, K_ms)` | `HwAttackerObserves` (seeded with `setupSent` and `send`/`recv`/`leak` entries, excluding `pt`/`rng`/`accept`), `HwAttackerKnows`, `AllSecurityQueriesHoldOnHwTrace` in [`Security/AsmSecure.lean`](../Symbolic/Specifications/Security/AsmSecure.lean); `SignalSessionSecureFor`, `SignalSessionSecurePlaced` in [`Security/Binary.lean`](../Symbolic/Specifications/Security/Binary.lean) | trusted |

Assembly-level refinement, preservation, and security theorems (the two symbolic binary headlines are `comp_refines_cli_placed` and `signal_session_secure_placed`; `*_linked_in` are placement non-vacuity witnesses and `libsignal_cli_labels_from_objects` is label gate A):

| Paper | Lean theorem | Statement (trusted) | Proof | Status |
|---|---|---|---|---|
| **Asm ⊑ Model** (step 4: trace refinement up to collisions) | `Proven.Refinement.comp_refines_cli_placed` ([`Symbolic/Theorems/Refinement.lean`](../Symbolic/Theorems/Refinement.lean), lake lib `CliElfLib`) | `CompRefinesCliBinaryPlaced cliElfBytes` ([`Refinement/ElfBinding.lean`](../Symbolic/Specifications/Refinement/ElfBinding.lean), including unconditional `CliElfProgressPlaced`), instantiating `CompRefinesCli` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)) | [`TopLevelHelpers/Composed/Cli/RefinementElf.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Cli/RefinementElf.lean) | proved; symbolic headline `SymRefinesPlaced` |
| **Sec(Model) ∧ Asm ⊑ Model ⇒ Sec(Asm)** (step 5: refinement preservation) | `Proven.RefinementPreservation.comp_refinement_preservation_cli` ([`Symbolic/Theorems/RefinementPreservation.lean`](../Symbolic/Theorems/RefinementPreservation.lean)) | `CompRefinementPreservationCli` ([`Refinement/RefinementPreservation.lean`](../Symbolic/Specifications/Refinement/RefinementPreservation.lean)) | [`TopLevelHelpers/Composed/Cli/RefinementPreservation.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Cli/RefinementPreservation.lean) | proved |
| **Sec(Asm)** (headline binary security, plus placement witnesses & label gate A) | `Proven.Security.signal_session_secure_placed`, plus `Proven.Security.libsignal_cli_elf_linked_in`, `Proven.Security.libsignal_cli_elf_mallocng_linked_in`, `Proven.Security.libsignal_cli_labels_from_objects` ([`Symbolic/Theorems/Security.lean`](../Symbolic/Theorems/Security.lean), lake lib `CliElfLib`) | `SignalSessionSecurePlaced cliElfBytes` ([`Security/Binary.lean`](../Symbolic/Specifications/Security/Binary.lean)); `libsignalSessionLib.LinkedIn cliElfBytes`, `VerifiedLibraries.mallocngLib.LinkedIn cliElfBytes` ([`CliBinaryPq.lean`](../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)); `CliLabelsFromObjects` ([`CliLabels.lean`](../LibsignalBinary/Specifications/SignalSession/CliLabels.lean)) | [`TopLevelHelpers/Composed/Cli/AsmLevelSecurityElf.lean`](../Symbolic/Proofs/TopLevelHelpers/Composed/Cli/AsmLevelSecurityElf.lean) | proved; symbolic headline `SymSecurePlaced` (with witnesses & label gate A) |

### §5.5 Limitations

| Paper | Code |
|---|---|
| Byte collisions excused rather than bounded probabilistically | `CollisionAfterExplainedPrefix` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)) |
| Hooked routines and cryptographic extern laws trusted | `HooksMatchInterpretation` ([`Refinement/ElfBinding.lean`](../Symbolic/Specifications/Refinement/ElfBinding.lean)), `ExternContractsHoldCli` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)) |
| XEdDSA and SPQR opaque in `γ`; authentic PKI and SPQR fields from earlier honest sends | `OpaqueSymbolSemantics` ([`Refinement/Concretization.lean`](../Symbolic/Specifications/Refinement/Concretization.lean)), `HonestBundleFiles` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)), `PqFromHonest` ([`Refinement/TraceExplanation.lean`](../Symbolic/Specifications/Refinement/TraceExplanation.lean)) |
| Two provisioned honest parties (`alice ≠ bob`) with fixed roles, ≤ 1 prekey of each kind, one active session per file | `initDirs` ([`Refinement/CliSetup.lean`](../Symbolic/Specifications/Refinement/CliSetup.lean)); `ValidCall`, `PreKeyNoMatch` / `BobCallAllowed`, `CliTurn.clearSession` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)) |
| Aborted runs (including failed heap allocations) end the trace | `CliTraces.stop` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)) |
| Leaks reveal only setup secrets and keys in the current session record | `KeyInDir`, `LeaksFrom` ([`Refinement/Statement.lean`](../Symbolic/Specifications/Refinement/Statement.lean)); `KeyInRecord` ([`Concrete/SessionRecord.lean`](../Symbolic/Specifications/Concrete/SessionRecord.lean)) |
| Attacker-chosen SPQR salts in ratchet queries; no header encryption; literature comparison | `trMsgKeys` ([`Model/MsgKeys.lean`](../Symbolic/Specifications/Model/MsgKeys.lean)); [`docs/Symbolic/PAPER_DIFFERENCES.md`](Symbolic/PAPER_DIFFERENCES.md) |

## §6 Finding Historical Bugs

### Bug-injection disproofs and synthetic stubs

A disproof is about a binary with an injected bug, so it needs the buggy binary, its pinned
hash, and the traces of running it. The computational disproofs (including the small-subgroup
refutation of Lemma 4 / the pre-F3 Main Theorem statement) are developed and checked on their
own unmerged branches and have not yet been retargeted to the placed F3 statement
`CliPqxdhBinaryCorrectAndSecurePlaced`, while on `main` the four Cheval et al. (2026) symbolic
CLI mutant disproofs under [`Symbolic/BugInjection/Disproofs/`](../Symbolic/BugInjection/Disproofs/)
are proved (`0` `sorry`) against the pre-F3 fixed-route statement `¬ SignalSessionSecure mutantElf`.
**Pending retarget (`T-12(d)`):** retargeting those four Cheval '26 mutant disproofs from the
pre-F3 fixed-route `SignalSessionSecure` statement to the placed F3 headline
`SignalSessionSecurePlaced` (§5.4) is pending (`T-12(d)`); until `T-12(d)` lands, the mutant
disproofs do not yet negate the placed F3 headlines of §4.4 or §5.4. Separately, ten synthetic
bug-injection obligations under `Symbolic/BugInjection/Synthetic/Disproofs/` remain `sorry`-exempt
stubs on `main` (in the non-default library `BugInjectionDisproofs`, pinned by `scripts/check_no_sorry.py`);
`scripts/HeadlineAxioms.lean` (plus `scripts/CheckMainOfLemmasClosure.lean` for `main_of_lemmas_placed`) and `scripts/check_no_sorry.py` in CI verify that no headline theorem in §4.4 or §5 (`Main`, `L1`–`L4`, `LinkedIn`, `MallocngLinkedIn`, `Labels`, `Symbolic/Theorems/*`, and `comp_externsSatisfiable_cli`) depends on `sorryAx` (narrowed from all §4.4/§5 theorems when `CliAxiomGuard`/`CliElfAxiomGuard` left CI, Anton 2026-11-07 21:29Z).

### Symbolic: ¬(Asm_bug ⊑ Model)

The setup is described in [`Symbolic/BugInjection/README.md`](../Symbolic/BugInjection/README.md).
The bug registry is `third_party/libsignal/bug-injection/bugs.toml`. The driver is
`scripts/bug_injection.py`.

| Paper bug | Witness | Statement on `main` | Status |
|---|---|---|---|
| Weak state (fix cd36118) | `cheval26-weak-state-cli`, `cheval26-weak-state-idx1-cli` | [`Symbolic/BugInjection/Disproofs/Cheval26WeakStateCli.lean`](../Symbolic/BugInjection/Disproofs/Cheval26WeakStateCli.lean), [`Cheval26WeakStateIdx1Cli.lean`](../Symbolic/BugInjection/Disproofs/Cheval26WeakStateIdx1Cli.lean): `spec_half`, `impl_half`, `disproof` | proved (`0` `sorry`) on `main` against pre-F3 `SignalSessionSecure` (`Split.lean` + kernel-checked non-vacuity); retarget to `SignalSessionSecurePlaced` pending (`T-12(d)`) |
| Small subgroup (fix 5293caa), high bit | `cheval26-small-subgroup-high-bit-cli` | [`Disproofs/Cheval26SmallSubgroupHighBitCli.lean`](../Symbolic/BugInjection/Disproofs/Cheval26SmallSubgroupHighBitCli.lean) | proved (`0` `sorry`) on `main` against pre-F3 `SignalSessionSecure`; retarget to `SignalSessionSecurePlaced` pending (`T-12(d)`) |
| Small subgroup, torsion | `cheval26-small-subgroup-torsion-cli` | [`Disproofs/Cheval26SmallSubgroupTorsionCli.lean`](../Symbolic/BugInjection/Disproofs/Cheval26SmallSubgroupTorsionCli.lean) | proved (`0` `sorry`) on `main` against pre-F3 `SignalSessionSecure`; retarget to `SignalSessionSecurePlaced` pending (`T-12(d)`) |

As the paper says, the symbolic disproofs assume that the witness run does not run out of memory
and that the hooked calls return the outputs recorded in the trace.

### Computational: the proof depends on the fix

| Paper | Code | Status |
|---|---|---|
| The model's responder rejects a non-canonical base key | `isCanonical` guard in the PQXDH model's accept step ([`Pqxdh/Game.lean`](../Computational/Specifications/Pqxdh/Game.lean); [`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`](../LibsignalBinary/Specifications/SignalPqxdh/Model.lean)) | on main |
| "Two canonical keys with the same DH value are equal" | the field `canon_pow8_inj` of the primitive assumptions ([`Assumptions/KemCorrect.lean`](../Computational/Specifications/Assumptions/KemCorrect.lean), [`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`](../LibsignalBinary/Specifications/SignalPqxdh/Model.lean)); used e.g. by `eq_of_isCanonical_of_pow8_eq_auth` ([`Proofs/SignalPqxdh/Security/AuthGapDhHopC2.lean`](../Computational/Proofs/SignalPqxdh/Security/AuthGapDhHopC2.lean)) | on main |
| Dependence witness | `not_canon_pow8_inj_of_const_pow8` ([`Computational/Proofs/E2E/ComposedBinaryLinkV1.lean`](../Computational/Proofs/E2E/ComposedBinaryLinkV1.lean)) | proved |
| Removing the check breaks the KeyInd and Auth proofs | delete the check: the build fails at `canon_pow8_inj` | disproof branch |
| Bit-255 twin on concrete test primitives | a test of two keys that differ only in bit 255 | disproof branch |
| `is_canonical` machine code rejects every key the model rejects | `ecPubKeyIsCanonical_call_ok` / `ecPubKeyIsCanonical_call_ok'_trap` against `ecPubKeyIsCanonicalCallSpec` ([`LibsignalBinary/Proofs/E2E/Pqxdh/Shared/IsCanonical.lean`](../LibsignalBinary/Proofs/E2E/Pqxdh/Shared/IsCanonical.lean)) | proved. The range check comes from the machine code. Torsion-freeness comes from the hooked `dalekTorsionFreeStub` contract, as the paper says |
| Weak state is outside the computational game | (no artifact) | argued in prose |
