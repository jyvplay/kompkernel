# Deviations from ACD19, FG24 and libsignal

Every place where the Lean formalization differs from ACD19 (Alwen, Coretti, Dodis, "The Double
Ratchet", ePrint 2018/1037, version 2020-02-21), one entry per ID. The PQXDH entries (`DEV-PQ*`)
and the composition entries (`DEV-C*`) are measured against FG24 (Fiedler, Günther, "Security
Analysis of Signal's PQXDH Handshake", ePrint 2024/702), BJKS24 (Bhargavan, Jacomme, Kiefer,
Schmidt, "Formal verification of the PQXDH Post-Quantum key agreement protocol for end-to-end
secure messaging", USENIX Security 2024, and its CryptoVerif model `PQXDH.m4.ocv`) or libsignal
v0.105.4, as each entry's **Reference** says. Start with [`README.md`](README.md); its §2 lists the
deviations that define the headline's game.

Abbreviations: SM = secure messaging; CKA = continuous key agreement; FS-AEAD = forward-secure
authenticated encryption with associated data; PRF-PRNG = ACD19 §4.3's two-input root key
derivation function; PRG / PRF = pseudorandom generator / function; OT-CCA = one-time
chosen-ciphertext security (Def. 2); AD = associated data; MAC = message authentication code;
HKDF / HMAC = HMAC-based key derivation function / hash-based MAC; SPK = Bob's signed pre-key;
SPQR = Sparse Post-Quantum Ratchet (libsignal's name; off in the verified image); PQXDH = Signal's
name for its hybrid X25519 + Kyber1024 extended Diffie–Hellman handshake ("post-quantum" is part of
the protocol's name only: every PQXDH result here is classical, see [DEV-PQ19](#dev-pq19)); KEM =
key encapsulation mechanism; SH-CR = BJKS24 Def. 1 semi-honest collision resistance; KI = FG24's
key-indistinguishability game (Fig. 8); KOSK = known-own-secret-key registration;
`q`, `q_ep` = number of queries, of epochs; `t*`, `t*_L` = attacked epoch, last leak before it.

## How to read an entry

- **ID** `DEV-<TAG><n>`. Tags: `SM` (ACD19 §3, §5: the SM game, Fig. 8, Thms 1, 6–8, 12), `PRNG`
  (§4.3), `CKA` (§4.1), `FS` (§4.2), `AEAD` (§2.2 and libsignal's AES-CBC + HMAC), `LS` (the
  libsignal session against Fig. 8 and §5.2), `M` and `E` (the binary: machine model and
  environment; authoritative: the list "Deviations of a run of the ELF" in
  `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean`), `PQ`
  (PQXDH: binary entries and the model-level games, against libsignal, FG24 or BJKS24), `SPQR`
  (the SPQR V1 binary statements, against the triple-ratchet SPQR interface, and the SPQR
  hypotheses of the SPQR-on correctness statement, against `spqr` 1.6.0), `C` (the
  composed PQXDH + Double Ratchet games; no paper counterpart), `CLI` (the specs of the
  `libsignal-cli` CLI's calls, `LibsignalBinary/Specifications/SignalSession/`, and which runs of
  the CLI binary its `main` theorem covers). IDs are never
  reused or renumbered.
  `git grep -n DEV-FS5` finds the Lean home of `DEV-FS5`.
- **Reference** (PQ and C entries): what the entry is compared against. `libsignal` (libsignal
  v0.105.4 / the compiled image), `FG24 <item>`, `BJKS24 <item>`, or `ours` (a Lean-only object
  with no counterpart in either paper). For `PQ` entries, "restricts the adversary" and "extends"
  are relative to FG24 Thm 5.1 unless the entry says otherwise.
- **Class**: `formalization` (the same idea stated differently), `paper fix` (a gap or bug in
  ACD19 that had to be fixed), `libsignal` (real libsignal differs from ACD19's scheme), `machine
  model` (a choice in modelling the compiled binary).
- **Effect** on the result: `none`; `constants` (explicit factors or extra terms in a bound);
  `w.l.o.g., proved` / `w.l.o.g., argued` (a restriction shown harmless by a Lean lemma / in prose);
  `restricts the adversary` (the Lean game refuses something ACD19 allows: **the result is weaker**);
  `extends` (the Lean covers more); `out of scope` (part of real libsignal is not modelled);
  `hypothesis` (a hypothesis of the theorem that the deployed primitive does not satisfy: the theorem
  does not literally apply to it; see [DEV-PQ21](#dev-pq21)).
- The **home** is the Lean declaration whose docstring holds the precise text. This catalogue
  summarizes it.

## Read these first

These make the headline weaker than ACD19 Def. 8, weaker than deployed libsignal (DEV-LS22, which is
faithful to ACD19), or leave part of libsignal out. The PQXDH rows (from DEV-PQ19 on) are relative to
FG24 Thm 5.1:

| ID | In one line | Effect |
|---|---|---|
| [DEV-PQ19](#dev-pq19) | **every PQXDH result is classical only**: GapDH for X25519 plus classical assumptions; Kyber1024 enters only through `KemShCr` (SH-CR) and a public-key collision term; **no post-quantum or HNDL security is claimed**, and the HNDL games are defined but not part of any claimed bound | out of scope (deliberate) |
| [DEV-LS6](#dev-ls6) | no correctness in the theorem (ACD19 App. A.1's hybrid H1) | restricts the adversary |
| [DEV-LS1](#dev-ls1) | receive coins are always honest | restricts the adversary |
| [DEV-LS2](#dev-ls2) | no corruption in a party's window | restricts the adversary |
| [DEV-LS4](#dev-ls4) | no corruption of Alice before epoch 10 | restricts the adversary |
| [DEV-LS3](#dev-ls3) | Bob never sends in epoch 0 | restricts the adversary |
| [DEV-LS22](#dev-ls22) | Bob's signed pre-key public key is secret (as in ACD19, unlike libsignal) | none relative to ACD19 |
| [DEV-SM6](#dev-sm6) | corruption waits until nothing uncompromised is in transit | restricts the adversary |
| [DEV-SM7](#dev-sm7) | forgeries at never-sent positions of unhealed epochs do not count | restricts the adversary |
| [DEV-SM3](#dev-sm3) | the leak epoch `tL` never decreases (matters only after an accepted injection) | restricts the adversary |
| [DEV-LS5](#dev-ls5) | injections only with on-curve ratchet keys and `< 2^32`-byte parseable wires | restricts the adversary |
| [DEV-M1](#dev-m1) | injections shorter than 2^32 bytes | restricts the adversary |
| [DEV-LS27](#dev-ls27), [DEV-AEAD2](#dev-aead2) | one message length per session | restricts the adversary |
| [DEV-LS31](#dev-ls31) | the bound has an 8-byte MAC tag floor (`(92 · q_ep + 96) · q · 2^-64` for `q_ep ≥ 1`, `112 · q · 2^-64` at `q_ep = 0`; reaches 1 at `q = 447,781,295` for `q_ep = q`, and stays below `2^-23.01` up to the `_hq32` cap `q = 2,147,471,145` for `q_ep ≤ 10`; bucket partitioning trades a linear (instead of quadratic) MAC term against up to `1.95×` PRF-PRNG and `1.74×` FS-AEAD (`q ≥ 1`; `2.33×` at `q = 0, q_ep = 1`) terms and re-indexed reductions, so it is incomparable with the earlier per-cell bound, DEV-C14) | constants |
| [DEV-M5](#dev-m5) | the binary Double Ratchet statements start from the handshake's output key (PQXDH is covered by separate theorems, DEV-PQ*; model-level composition is in `ModelSecure`, DEV-C5) | out of scope |
| [DEV-LS24](#dev-ls24) | SPQR abstract in the binary Double Ratchet statements (empty-SPQR sessions only); SPQR V1 session security and model-level composition are in `SessionSecure` and `ModelSecure` (DEV-C5) | out of scope |
| [DEV-E8](#dev-e8) | all cryptographic primitives execute verified linked ELF code directly from `cliElfBytes` (0 non-panic hooks; `cliProgElf` overrides only the 18 `.symtab` Rust panics as `SIGABRT`, DEV-E7; instantiated directly at `realPEParams` in the computational headlines, guarded per input by `RealHooksAgreeOnInput` in `comp_refines_cli`/`signal_session_secure`, and instantiated unfiltered at `realCliHooks` via `real_prims_admissible` in `comp_refines_cli_real`/`signal_session_secure_real`; legacy fixed-image `cliHookTable` still hooks primitives) | out of scope (legacy `cliHookTable`) / none (ELF headlines) |
| [DEV-M7](#dev-m7) | the theorem is about one ELF and its build | out of scope |
| [DEV-M9](#dev-m9) | no libsignal session initialisation; no pre-key messages in the SM statements | out of scope |
| [DEV-M17](#dev-m17) | merged into [DEV-CLI10](#dev-cli10) (plain `ElfImage.loadState`, `aes` and SPQR CPU probes run on pinned `AT_HWCAP = 0x1b`, `AT_HWCAP2 = 0`; legacy `cliTokenPatch` only) | out of scope (LSE / other `AT_HWCAP` values) |
| [DEV-CLI10](#dev-cli10) | pinned auxiliary vector (`AT_HWCAP = 0x1b`, `AT_HWCAP2 = 0`, `AT_RANDOM = 0^16`); plain `ElfImage.loadState` runs `aes` and SPQR CPU probes (ARMv8 hardware AES and `PMULL` GF(2¹⁶)) and LL/SC outline atomics (`LSE = 0`) | out of scope (LSE / other `AT_HWCAP` values) |
| [DEV-CLI11](#dev-cli11) | after a pre-key `recv` over a session that does not match it is accepted, the session file's bytes and that party's later calls are not claimed (`CliSpecPqxdhNoMatch`) | out of scope |
| [DEV-CLI15](#dev-cli15) | a PQXDH-mode run that hits `.OutOfMemory` (`CliReachesOOMElf`) has no outcome (`run i = none`) and is excused in `CliPqxdhElfCorrect` (the Main Theorem's security clause has no `.OutOfMemory` premise) | out of scope |
| [DEV-CLI22](#dev-cli22) | a PQXDH-mode run that reaches one of the 5 `libcrux_ml_kem` `SampleNTT` (`sample_from_xof`) entry points with a SHAKE-128 matrix seed that never yields 256 coefficients `< 3329` may fail to terminate (`CliReachesSampleNttStuckElf`) | availability only; the headline security bound gains an unbounded `2·CliPqxdhFlagProb` SampleNTT-divergence term |
| [DEV-CLI13](#dev-cli13) | in the CLI security game on PQXDH directories, Alice refuses every pre-key (`3`-tagged) input without running the CLI | restricts the adversary |
| [DEV-CLI14](#dev-cli14) | in the CLI security game on PQXDH directories, a `recv` input of `2^32` bytes or more, or a canonical pre-key message whose inner message has `2^32 - 2048` bytes or more, is refused without running the CLI (`cliPqLenOk`), and on `inject` an input above `stdinCapBytes` (`2^20`, DEV-CLI21) is refused before `receive` (`bhInjOK`); no honest delivery is refused for `l < 10^6` | restricts the adversary |
| [DEV-CLI16](#dev-cli16) | the CLI security bound keeps the key-indistinguishability advantage of the real handshake (one-key identities, HKDF) as a term; its reduction to the one-key PQXDH bound takes the named hypothesis `KeyIndRoGap` (the ROM instantiation of assumption 2 `HkdfRO` on the one-key game, `ε_ro = 0` in the ROM) | hypothesis |
| [DEV-CLI18](#dev-cli18) | in the CLI security game on PQXDH directories, each `exit 0` call retains the full party directory (`cliPqReadBack` over `cliPqPartyPathsOf`), `corr-P` leaks only the session-record state `BinState` (`cliOracleImplR`), and any non-zero exit leaves the party directory unchanged (`Dir.cliPqAfter`); partial-write crash recovery on mid-commit OS/I/O failures is not modeled (`DEV-CLI4`) | out of scope |
| [DEV-LS30](#dev-ls30) | Thm 3 and the wire OT-CCA reduction are not composed | out of scope |
| [DEV-LS33](#dev-ls33), [DEV-LS34](#dev-ls34) | no `corr-B` in epoch 0 (`noBobCorrInEpoch0`) or while Alice is before epoch 10 (`noBobCorrWhileAliceBelowEpoch10`) in the leaked-SPK game | restricts the adversary |
| [DEV-PQ1](#dev-pq1), [DEV-PQ3](#dev-pq3), [DEV-PQ10](#dev-pq10) | SHA-512, Kyber1024, and all 7 SPQR ML-KEM-768 functions (alongside the 7 `curve25519_dalek` Ed25519/scalar operations, X25519, and `libcrux_hmac::hmac` with its SHA-256 helpers) execute linked ELF code directly with no non-panic hooks (`cliProgElf` overrides only the 18 Rust panic entry points, DEV-E7; instantiated directly at `realPqxdhPrims` in `realPEParams`); SPQR V1 active (`CliSpecPqxdh`, the conclusion of the PQXDH binary statement `CliPqxdhBinaryCorrect`, is stated with `pqxdhSpqrSession realPEParams`); pre-key messages `< 2^32` bytes and `ReachablePqxdhSession` records `< 2^31` bytes | out of scope / restricts the adversary |
| [DEV-PQ13](#dev-pq13), [DEV-PQ14](#dev-pq14), [DEV-PQ15](#dev-pq15), [DEV-PQ16](#dev-pq16) | two-key X25519 + XEdDSA identity idealization in the standalone untrusted two-key `KeyInd` and `Auth` games (Lemma 1 `PqxdhCorrectAndSecureδ`, both `KeyInd` and `Auth`, uses one-key identities under `GapSigEufCma` and `GapDhWithSign`, with standalone SHA-512 ROM reductions to `GapDH` in `Computational/Proofs/SignalPqxdh/XeddsaRom/`); random oracle `HkdfRO` (and `RootKdfRO` in `Auth`); KOSK adversary key registration; canonical X25519 point checks (`isCanonical`) | formalization / restricts the adversary |
| [DEV-PQ21](#dev-pq21) | replaced in `PqxdhCorrectAndSecureδ` and `CliPqxdhSecurityForAnyKem` by `KemDeltaCorrect P δ_kem` (paying `2 · N_spk_tot · N_send_tot · δ_kem`), and instantiated directly in the Main Theorem `libsignal_cli_pq_secure_elf_binary` (`CliPqxdhSecurityFor`, `StatementPqElf.lean`) at concrete Round-3 Kyber-1024 (`kyber1024KemKeyGen`) with `δ_kem = ε + 1 / 2^112` under `KyberNoiseGap ε` (`Kyber1024Correct.lean`) via `kyber1024_kem_delta_correct` (`Computational/Theorems/Lemmas.lean`, `Kyber1024Delta.lean`); retained only in the untrusted `δ_kem = 0` statements in `Computational/Proofs/` | hypothesis |
| [DEV-PQ20](#dev-pq20), [DEV-PQ22](#dev-pq22) | no case of the bound rests on the KEM (no `min(ε_GDH, ε_CCA)`); no one-time Kyber pre-key: every session uses the last-resort `PQSPK` | restricts the adversary / out of scope |
| [DEV-PQ23](#dev-pq23), [DEV-PQ24](#dev-pq24) | corruption only of identity keys and (in `KeyInd`) EC signed pre-keys, no `RevealRand`; a tested session needs its peer uncorrupted when it starts | restricts the adversary |
| [DEV-KFF1](#dev-kff1) | adversary-chosen send coins on SPQR V1 sends require an explicit-reduction (`KemFailFind`) reading for ML-KEM-768 decapsulation failure in `SessionSecure` and the PQXDH CLI headlines | hypothesis / constants |
| [DEV-C5](#dev-c5), [DEV-C8](#dev-c8)–[DEV-C20](#dev-c20) | model-level (`SessionSecure` and `ModelSecure`, proved unconditionally in `Computational/Theorems/Lemmas.lean`) and CLI-level (`libsignal_cli_pq_secure_elf_binary` in `Computational/Theorems/Main.lean` and `LibsignalCliPqSecure`, whose clause 2 assumes `KeyIndRoGap`, DEV-CLI16) composition of `KeyInd` + DR with SPQR V1 (established/promoted sessions + partnered first pre-key message; unpartnered first-message payload privacy and authentication are covered by the one-key `Auth` conjunct of Lemma 1, DEV-C5, but not folded into the composed / CLI statements); `startDR` guard, byte-exact `ikA`/`ikB`/`spkB` pins, `qep²` epoch-guessing loss | out of scope / restricts the adversary / constants |

## Counts

| Layer | formalization | paper fix | libsignal | machine model | total |
|---|---:|---:|---:|---:|---:|
| SM (§3, §5) | 20 | 6 | 1 | 0 | 27 |
| PRNG (§4.3) | 3 | 2 | 0 | 0 | 5 |
| CKA (§4.1) | 9 | 0 | 6 | 2 | 17 |
| FS (§4.2) | 8 | 7 | 6 | 0 | 21 |
| AEAD (§2.2, libsignal) | 4 | 0 | 10 | 1 | 15 |
| LS (libsignal session) | 14 | 0 | 23 | 0 | 37 |
| M, E (binary) | 0 | 0 | 2 | 14 | 16 |
| PQ (PQXDH binary & security) | 16 | 0 | 11 | 3 | 30 |
| SPQR (SPQR V1) | 1 | 0 | 2 | 4 | 7 |
| C, KFF (PQXDH ∘ DR composition) | 15 | 0 | 0 | 0 | 15 |
| CLI (`libsignal-cli` CLI) | 5 | 0 | 5 | 8 | 18 |
| total | 95 | 15 | 66 | 32 | 208 |

An entry with two classes (for example "libsignal, paper fix") is counted under the first. The one
`abstraction` entry (DEV-PQ31) is counted under formalization.

## SM: the SM game, Fig. 8 and the theorems (ACD19 §3, §5, App. A)

Homes: `LibsignalBinary/Specifications/CryptoGames/SM/` (`Game.lean`, `Construction.lean`),
`Computational/Specifications/Session/ACD19/SM/` and `Computational/Proofs/CryptoGames/SM/`. DEV-SM1 to SM10 were "deviations 1–10" of `SM/Game.lean`; DEV-SM11 to
SM15 were "deviations 1–5" of `SM/Construction.lean`.

### DEV-SM1

**A failing `req` undoes everything** · class: formalization · effect: none

- ACD19 §2.1: "if the condition is not satisfied, the oracle … is exited and all actions by it are
  undone". Lean: every oracle of `SM/Game.lean` returns `none` and keeps the state.
- Not a deviation: it matches §2.1. Listed because an older docstring wrongly claimed that Fig. 2
  keeps the effects of `ep-mgmt`.

### DEV-SM2

**The epoch bound `q_ep` is enforced by the game** · class: formalization · effect: constants

- ACD19 Def. 8: `q_ep` is a parameter of the attacker. Lean: `GameState.epMgmt` refuses epochs
  beyond `qep`; an injection accepted beyond `qep + 1` counts as rejected.
- Why: the guesses of `t*`, `t*_L` (App. A) become finite sums of `(qep + 2)²` and `(qep + 1)²`
  terms.

### DEV-SM3

**`tL` only grows** · class: formalization · effect: restricts the adversary (rare runs only)

- ACD19 Fig. 2 assigns `tL ← t_P + 1` and `tL ← max(t_A, t_B)`. Lean: `tL ← max(tL, ·)`.
- In Fig. 2, `tL` never decreases while `|t_A − t_B| ≤ 1`, which honest deliveries keep (argued,
  not proved in Lean). Only an
  accepted injection (`t_A ← max(t_A, t')`) can move one party ahead, after which the other party's
  bad-coin `ep-mgmt` could lower `tL`. In such runs Lean's larger `tL` allows fewer challenges and
  injections.

### DEV-SM4

**A rejected ciphertext changes nothing** · class: formalization · effect: none

- ACD19 Fig. 2's `deliver` and `inject` update `t_P` and delete unconditionally. Lean
  (`deliverImpl`, `injectImpl`): a rejection keeps the state and leaves an honest record in transit.
- This builds ACD19 Def. 7 (A) into the game, and replaying an honest ciphertext is not a forgery.

### DEV-SM5

**Correctness only inside the skip window and for uncompromised records** · class: libsignal,
paper fix · effect: restricts the adversary (correctness game only)

- ACD19 Def. 9 and Fig. 2's `deliver` demand correctness for every delivered record. Lean
  (`GameState.mustBeCorrect`, `SMScheme.maxSkip`): only uncompromised records whose index is at most
  `maxSkip + 1` past the last accepted one.
- Why: libsignal bounds skipping (25,000); injections at compromised positions may legitimately
  consume a record (DEV-FS2). With unbounded `maxSkip` this is ACD19's notion.

### DEV-SM6

**Corruption waits until no uncompromised message to the party is in transit** · class: paper fix ·
effect: restricts the adversary

- ACD19 Fig. 2 `corr-P` only requires `P` not to have a pending challenge. Lean (`corrAllowed`):
  `corr-P` is also refused while any uncompromised record from the other party is in transit.
- Why: the FS-AEAD step of Thm 12 needs DEV-FS6, without which Thm 5's hybrid proof breaks.
- Effect: a message that is never delivered blocks the corruption of its receiver forever, so "a
  message is lost, then its receiver is corrupted" is outside the theorem. `Computational/Tests/Deviations/PaperCorrRule.lean` studies
  the paper's rule: authenticity would survive it, privacy needs a new FS-AEAD argument.

### DEV-SM7

**Forgeries at never-sent positions of unhealed epochs do not count** · class: formalization,
libsignal · effect: restricts the adversary

- ACD19 Fig. 2's `comp` and Fig. 8's `ℓ_prv`, `FS-Max`, `FS-Stop`. Lean (`trivial`): a position not
  in transit, in an epoch `t < tL + Δ`, is trivial: a forgery there does not win.
- Why: Lean's Fig. 8 has no `FS-Max` / `FS-Stop` (DEV-SM11); libsignal keeps up to 5 old receiving
  chains and does not erase by `ℓ_prv` either.

### DEV-SM8

**`|m0| = |m1|` is not checked** · class: formalization · effect: none

- One message type; length leakage must be in the type. For libsignal every message has the fixed
  length `ℓ` (DEV-LS27).

### DEV-SM9

**Losing conditions are checked at the end, and `t*_L` must be exact** · class: formalization ·
effect: none

- ACD19 §3.3: the attacker "loses immediately". Lean (`canon`, `authLosingConditionsAvoided`, `privGame`): checked at
  the end; `t*_L` must be the largest leak below `t*`, so the guesses partition the runs (Lemmas 17,
  18).

### DEV-SM10

**Advantages are biases; `b = true` selects `m1`** · class: formalization · effect: none

- ACD19 §2.1's advantage is `2·P[win] − 1` (printed `2·P[win] − 1/2`, a typo). Lean (`boolBias`,
  `hybridAdvantage`): `2·|P[win] − 1/2|`, equal up to absolute value. Correctness and authenticity
  are probabilities.

### DEV-SM11

**No `FS-Stop`, `FS-Max`, `ℓ_prv` in Fig. 8** · class: formalization · effect: none

- The header is `(t, T)`. These only manage memory; the forgery limit they imply moved into the
  game (DEV-SM7). libsignal's `previous_counter` travels as a public message part (DEV-LS13).

### DEV-SM12

**Only the current sending session is kept** · class: formalization · effect: none

- ACD19 Fig. 8 keeps `v[t]` for every `t`; old sending sessions are never used.

### DEV-SM13

**`λ` is a parameter** · class: formalization · effect: none

- ACD19 Fig. 8's `P-Up(σ, λ)` and `T_cur ← λ`. Lean: `λ` is the parameter `lam`; `T = λ` is `none`;
  a new-epoch header without `T` is rejected.

### DEV-SM14

**The SM coins are the CKA sender coins** · class: formalization · effect: none

### DEV-SM15

**`Send` without a session returns `default`** · class: formalization · effect: none

- For totality; unreachable.

### DEV-SM16

**Algorithms take explicit coins; `Rcv` returns an `Option`** · class: formalization · effect: none

- ACD19 Def. 6. Lean (`SMScheme`, `RecvResult`): deterministic functions of their coins; a
  rejection reveals no `(t', i')`.

### DEV-SM17

**Thm 1 needs no Def. 7 (B)–(E)** · class: paper fix · effect: extends

- ACD19 App. A.2 uses properties (A), (C), (D), (E) of a "natural" scheme (Def. 7). Lean's
  `Thm1.theorem1` assumes only `0 < Δ`. (A) is enforced by the scheme interface (a rejection keeps
  the state, DEV-SM4); guesses are summed, so (E) is not needed; replays count in both games, so (C)
  and (D) are not needed.

### DEV-SM18

**Running time is not modelled** · class: formalization · effect: none

- ACD19's `(t, q, q_ep)`-attackers and "`t' ≈ t`". Lean: adversaries are arbitrary `OracleComp`s,
  and bounds name explicit reductions. Their efficiency is checked by reading, so they are part of
  the trusted base ([`TRUSTED_BASE.md`](TRUSTED_BASE.md) §4). The paper-shaped "uniform"
  corollaries (`theorem6_of_uniform_bounds`) are satisfiable only with `ε = 1`.

### DEV-SM19

**The guesses include `t*_L = −∞` and epoch 0** · class: paper fix · effect: constants

- ACD19 App. A guesses `t* ∈ [q_ep]`, `t*_L ∈ [t* − Δ_SM]`, and claims "H3,0 is identical to H2".
  Lean (`admissibleLastLeakGuesses`, `Config.h3`): sums over `t* ∈ {0, …, qep + 1}` and `t*_L ∈ {−∞, 0, …, t* − Δ}`;
  `h3 i` replaces challenges of epochs `< i`.
- Why: ACD19's ranges omit "no leak" and epoch 0, where Bob sends and can be challenged; with
  epoch-0 challenges "H3,0 = H2" is false.

### DEV-SM20

**Each hop between hidden-bit games costs a factor 2** · class: paper fix · effect: constants

- ACD19 Lemmas 13, 14, 16, 17, 18 (with factor 1). Lean (`lemma16`, `lemma17`, `lemma18`,
  `Theorem12`): factor 2 on each.
- With §2.1's advantage read as `2·P − 1` (Lean's), Lemmas 13, 14, 16, 17, 18 lose a factor 2; read
  as `P − 1/2`, Lemmas 9, 10, 13, 14 and 18 do. ACD19's constants are off by 2 under either reading.

### DEV-SM21

**Thm 1 needs `Δ ≥ 1`** · class: paper fix · effect: none

- With `Δ = 0` an epoch heals in the epoch of the leak. Fig. 8 has `Δ_SM ≥ 2`.

### DEV-SM22

**Thm 6 assumes CKA correctness and SM correctness** · class: formalization · effect: none

- `theorem6_concrete` takes `cka.Correct` (Def. 12) and `hcorr` (SM correctness error 0). Generic
  FS-AEAD correctness is not defined; Thm 7 is proved only for Fig. 6. `theorem6_ddh_fig6` discharges `hcorr`
  by Thm 7.

### DEV-SM23

**Thm 7 is for Fig. 6's FS-AEAD** · class: formalization · effect: none

- `theorem7` assumes the FS-AEAD is `fromAEADPRG` (Fig. 6) with a correct CKA and AEAD.

### DEV-SM24

**Lemma 14 uses `chall-prf` at `t*`** · class: formalization · effect: none

- ACD19 Lemma 14 uses `chall-prng(I)`; `rootPRNG` in `SM/Reductions.lean` uses `chall-prf(I)`,
  equivalent for the hop.

### DEV-SM25

**Lemma 15 has no factor `q` but an extra forgery term** · class: paper fix · effect: constants

- ACD19 Lemma 15 and Thm 12 have `q·ε_fs-aead`. Lean (`lemma15`):
  `Adv(redFSPriv) + 2·Adv(redFSPrivCoin)`. Privacy involves one challenge session, so no `q`; the
  FS-AEAD game counts a forgery in that session as a win, which privacy discards, hence the second
  term.

### DEV-SM26

**The FS-AEAD reductions make up to `2q` queries (at most `q` decryption queries)** · class: formalization · effect: constants

- ACD19 Thm 6 uses FS-AEAD security at `q` queries. Lean (`redFSAuth_queries`, `redFSAuth_dec_queries`, …): each SM query causes at most two FS-AEAD queries (`q_R = 2q`, one `corruptSender` plus one `transmit` or `challenge` in `fsSend`, or `corruptSender` plus `corruptReceiver` in `reveal`), and at most one decryption (`deliver` or `inject`) query (`q_d = q`, in `fsRecv`). So Thm 5's computational slot count (`fsSlotCount`) is applied at `q_R = 2q`, while the decryption and MAC-forgery terms use `q_d = q`.

### DEV-SM27

**`t*_L = −∞` gives CKA challenge epoch 0** · class: formalization · effect: none

- `healEpoch none = 0`: no challenge, advantage 0, so the statement is uniform.

## PRNG: PRF-PRNG (ACD19 §4.3, Fig. 7)

Home: `LibsignalBinary/Specifications/CryptoGames/PRNG/Defs.lean`.

### DEV-PRNG1

**`corr` sets the flag `corr`** · class: paper fix · effect: none (repairs the game)

- ACD19 Fig. 7's `corr` never sets `corr ← true`, so `req ¬corr` is vacuous and the game is
  trivially insecure.

### DEV-PRNG2

**`process` is refused after `chall-prf`** · class: paper fix · effect: none (repairs the game)

- Otherwise the game is trivially insecure. ACD19 Lemma 10 only uses `chall-prf` at `σ_{t*−1}`.

### DEV-PRNG3

**A failing `req` changes nothing** · class: formalization · effect: none

- Matches ACD19 §2.1.

### DEV-PRNG4

**The random function is sampled lazily** · class: formalization · effect: none

### DEV-PRNG5

**`b = true` means random** · class: formalization · effect: none

## CKA: continuous key agreement (ACD19 §4.1, Fig. 3, Thm 3)

Homes: `LibsignalBinary/Specifications/CryptoGames/CKA/`, `Computational/Proofs/CryptoGames/CKA/` and
`Computational/Tests/Deviations/`. DEV-CKA1 to CKA5 were "deviations 1–5" of `CKA/Defs.lean`.

### DEV-CKA1

**Sender coins are explicit** · class: formalization · effect: none

- ACD19 Fig. 3's `CKA-S(γ; r)`. Lean (`CKAScheme.send`): the game samples the coins; `send-P'`
  takes them from the adversary.

### DEV-CKA2

**`req` and ping-pong order** · class: formalization · effect: none

- A failing `req` keeps the state. The ping-pong order, prose in ACD19, is `canSend` / `canReceive`.

### DEV-CKA3

**Plain `send-P` is refused in epoch `t*`** · class: formalization · effect: w.l.o.g., proved

- Lets the DDH reduction embed its challenge. `CKA.advantagePaper_eq`
  (`Computational/Tests/Deviations/PaperFaithfulSendProof.lean`) proves the advantage equal to that of the paper-faithful
  Fig. 3 game.

### DEV-CKA4

**The receiver key is not output; the game does not end** · class: formalization · effect: none

### DEV-CKA5

**`t*` is a parameter; `b = true` means random** · class: formalization · effect: none

- Security is stated for every `t*`.

### DEV-CKA6

**One state type for both parties** · class: formalization · effect: none

### DEV-CKA7

**The advantage is a bias** · class: formalization · effect: none

- As DEV-SM10.

### DEV-CKA8

**Group as a module** · class: formalization · effect: none

- ACD19 Thm 3's cyclic group `G = ⟨g⟩` becomes VCVio module notation with the hypothesis that
  `x ↦ x • g` is a bijection.

### DEV-CKA9

**Out-of-order calls return key 0** · class: formalization · effect: none

- For totality; impossible in ping-pong order.

### DEV-CKA10

**X25519 is not a prime-order group** · class: libsignal · effect: none

- ACD19 §4.1.2 assumes a prime-order group. Lean (`DHFun`, `dhScheme`): the scheme runs over an
  abstract DH function, because X25519 clamps scalars and uses x-only points. Thm 3 then rests on
  DDH for that function as used, which is not textbook DDH. Thm 3 is not composed into the headline
  (DEV-LS30).

### DEV-CKA11

**libsignal draws the next key pair when it receives** · class: libsignal · effect: none here

- ACD19 §5.2 "Deferred randomness for sending". The CKA syntax stays ACD19's; the effect is handled
  by the session's game (DEV-LS1, DEV-LS2).

### DEV-CKA12

**Only prime-order-subgroup points are keys** · class: libsignal · effect: restricts the adversary

- libsignal accepts any 32 bytes (twist, low-order, non-canonical points). The headline's game
  refuses such injections (DEV-LS5).

### DEV-CKA13

**Corruption reveals the raw coins** · class: libsignal · effect: extends

- libsignal stores the clamped key; revealing the coins gives the adversary more.

### DEV-CKA14

**Public-key derivation is a separate hook** · class: machine model · effect: none

- The binary computes public keys by a different code path (`mul_base_clamped`), modelled as its own
  hook (`X25519Model.pubKey_hook`).

### DEV-CKA15

**Honest agreements are never all-zero** · class: libsignal · effect: none

- A hypothesis of `X25519Model`; libsignal's zero check never fires on honest keys.

### DEV-CKA16

**Coins are uniform 256-bit strings** · class: machine model · effect: none

- The caller's random number generator is assumed ideal.

### DEV-CKA17

**The initial CKA key is Bob's signed pre-key** · class: libsignal · effect: out of scope

- ACD19's `k_CKA` is fresh and independent. Bob's SPK is medium-term, shared across sessions and
  also used by PQXDH. See DEV-LS22, DEV-M5.

## FS: forward-secure AEAD (ACD19 §4.2, Figs. 5–6, Thm 5)

Homes: `Computational/Proofs/CryptoGames/FSAEAD/` and, for `Defs.lean`, `Construction.lean` and `Security.lean`,
`LibsignalBinary/Specifications/CryptoGames/FSAEAD/`. DEV-FS1 to FS6 were "deviations 1–6" of
`FSAEAD/Defs.lean`; DEV-FS7 to FS9 were the three "corrections to Fig. 6" of
`FSAEAD/Construction.lean`.

### DEV-FS1

**Every index after the first `corr-A` is compromised** · class: paper fix · effect: none (repairs
the game)

- With ACD19 Fig. 5's `comp`, the adversary computes the next ciphertext after `corr-A` and wins by
  injection, so no scheme is secure.

### DEV-FS2

**No correctness win on compromised records** · class: paper fix · effect: none (repairs the game)

- Injections at compromised indices can legitimately desynchronize the receiver.

### DEV-FS3

**A failing `req` or an ended game returns `none`** · class: formalization · effect: none

### DEV-FS4

**`|m0| = |m1|` is not checked** · class: formalization · effect: none

- One message type; for libsignal it is fixed-length (DEV-AEAD2).

### DEV-FS5

**Correctness only within the skip window** · class: libsignal, paper fix · effect: restricts the
adversary (correctness game only)

- ACD19 Fig. 5 demands immediate decryption of every delivered record. libsignal skips at most
  25,000 messages, and every receiver with a finite window loses Fig. 5's game.

### DEV-FS6

**`corr-B` waits until no uncompromised record is in transit** · class: paper fix · effect:
restricts the adversary

- Otherwise ACD19's hybrid H1 in the proof of Thm 5 is distinguishable from H0. The SM game
  inherits the rule (DEV-SM6).

### DEV-FS7

**Skipped keys are stored under their own index** · class: paper fix · effect: none (repairs the
scheme)

- ACD19 Fig. 6's `skip` writes `D[u] ← K` (a typo).

### DEV-FS8

**Old indices not in `D` are rejected** · class: paper fix · effect: none (repairs the scheme)

- ACD19 Fig. 6 decrypts them under the next chain key and rewinds `i_B`, which breaks forward-secure
  authenticity.

### DEV-FS9

**Skipping is bounded by `maxSkip`** · class: libsignal, paper fix · effect: constants

- libsignal's bound (25,000). With unbounded skipping the number of chain positions is unbounded in
  `q`, so Thm 5's `q·(…)` does not follow. See DEV-FS12.

### DEV-FS10

**A position-indexed PRG family** · class: formalization · effect: none

- `G p` instead of one PRG `G`. libsignal's chain step ignores the position (a constant family =
  Fig. 6).

### DEV-FS11

**No `FS-Stop` / `FS-Max`** · class: formalization · effect: none

- ACD19 Def. 14's memory management is not modelled; the SM layer never erases sessions.

### DEV-FS12

**Thm 5's sum has `2N` terms (`N = (q + 1)(maxSkip + 1)`), tightened on-chain to `2qR + maxSkip + 1`** · class: paper fix, libsignal · effect:
constants

- ACD19 Thm 5: `ε ≤ q·(ε_aead + ε_prg)`. Lean (`Theorem5Statement`): a sum over `2N` chain positions with `N = (q + 1)(maxSkip + 1)`. On the libsignal chain (`Theorem5On.lean`, `fsSlotCount` in `LibsignalBound.lean`), the active slot count is tightened to `2·qR + (maxSkip + 1)` (`qR` main-chain slots + `qR + maxSkip + 1` lookahead slots, `4q + 25001` at `qR = 2q`) for the computational terms in `fsCompBound`, while the 8-byte MAC-forgery term is hoisted outside the slot sum to one global hop per chain (`4·qd·macForgeryProb` per FS-AEAD instance; DEV-LS23, DEV-LS31).

### DEV-FS13

**A factor 2** · class: formalization · effect: constants

- From the bias normalization (DEV-SM10).

### DEV-FS14

**A second hybrid chain for lookahead forgeries** · class: paper fix · effect: constants

- ACD19's proof of Thm 5 (hybrid H3, "injections rejected") misses accepted injections at an
  uncompromised index the sender has not reached; the main chain cannot generate those keys
  consistently with a later `corr-A`. Lean adds a second chain: ×2 steps.

### DEV-FS15

**Named reductions instead of "for all t'-attackers"** · class: formalization · effect: none

- `prgRed j A`, `aeadRed j A`. Their efficiency is checked by reading (DEV-SM18).

### DEV-FS16

**Perfect AEAD correctness is a hypothesis** · class: formalization · effect: none

- As ACD19 Def. 1 assumes.

### DEV-FS17

**The ideal ciphertext may depend on the AD** · class: libsignal · effect: none

- ACD19 Def. 2 draws the ideal ciphertext uniformly. Lean (`otccaGameAdIdeal`, `Theorem5StatementAdIdeal`): from
  `ideal a`, which may depend on the AD, never on the message. libsignal's wire ciphertext carries a
  public header. With `ideal` uniform this is Def. 2 (`otccaAdvantageWith_uniform`, by `rfl`).

### DEV-FS18

**Thm 5 with correctness only on some ADs** · class: libsignal · effect: restricts the adversary

- `Thm5.theorem5With_on` and `Thm5.theorem5With_on_multi` (`FSAEAD/Theorem5On.lean`): correctness
  only on ADs satisfying `ok` (`AEADScheme.CorrectOn`, `FSAEAD/Defs.lean`), for adversaries whose
  encryption ADs satisfy `ok` (`FSAEAD.encBadAD`, `FSAEAD.EncADsOk`, `FSAEAD/Defs.lean`), used on
  the end-to-end chain in `Computational/Proofs/SignalWireShortProto.lean` and
  `Ratchet/SessionProofs/ProstCodec/FSAEADBound.lean`. prost's codec round-trips only short public
  parts.

### DEV-FS19

**A public, authenticated message part; challenges must agree on it** · class: libsignal · effect:
restricts the adversary (of the FS-AEAD and Thm 6 statements)

- libsignal MACs fields that Fig. 8's header lacks (`previous_counter`, SPQR fields). Lean
  (`AEADScheme.movePubPartToAD`, `EqualPubChallenges`, `pubRed`). For the headline the condition is proved
  for the reductions' adversaries, so it does not restrict the headline's adversary (DEV-LS13).

### DEV-FS20

**OT-CCA for adversaries whose ADs share one epoch class** · class: libsignal · effect: restricts
the adversary (of the FS-AEAD statements)

- libsignal's MAC binds the epoch only through its parity (DEV-LS8). Proved for the reductions'
  adversaries, so it does not restrict the headline's adversary.

### DEV-FS21

**`deliver` uses the most recent matching record** · class: formalization · effect: none

## AEAD: AEAD and libsignal's AES-CBC + HMAC (ACD19 §2.2, Defs. 1–2, Fig. 1)

Homes: `LibsignalBinary/Specifications/CryptoGames/Primitives.lean` (DEV-AEAD1), the definitions in
`LibsignalBinary/Specifications/CryptoGames/AEAD/` and the proofs in `Computational/Proofs/CryptoGames/AEAD/`.

### DEV-AEAD1

**Decryption refuses only the challenge pair** · class: formalization · effect: constants

- ACD19 Fig. 1 refuses every decryption query with `e = e*`. Lean (`otccaDecrypt`): only
  `(a*, e*)`, so the adversary may also ask `(a', e*)`. This is a stronger notion than Fig. 1's, so
  the wire OT-CCA terms of the bound assume more of the AEAD than ACD19 does. For an
  encrypt-then-MAC AEAD whose MAC covers the AD, the gap is one MAC forgery (`2^-64` per query with
  an 8-byte tag).

### DEV-AEAD2

**One plaintext length per session** · class: libsignal · effect: restricts the adversary

- AES-CBC with PKCS#7 padding leaks the block count, so the message type is `CBC.Plain ℓ`. No claim
  is made for sessions mixing lengths. See DEV-LS27.

### DEV-AEAD3

**libsignal's AEAD is encrypt-then-MAC with an 8-byte tag** · class: libsignal · effect: constants

- ACD19 assumes an abstract OT-CCA AEAD. libsignal uses AES-256-CBC with PKCS#7 and HMAC-SHA256
  truncated to 8 bytes, so any OT-CCA bound contains `qd·2^-64` for `qd` decryption queries. This
  is the source of the floor in DEV-LS31.

### DEV-AEAD4

**AES is assumed a PRF, not a PRP** · class: formalization · effect: none

- A PRP-to-PRF switch would add a birthday term. Not on the headline's path (DEV-LS30).

### DEV-AEAD5

**HMAC-SHA256/8 is assumed a PRF** · class: formalization · effect: none

- A named assumption, not derived from the compression function.

### DEV-AEAD6

**The message-key HKDF is assumed a PRG** · class: formalization · effect: none

### DEV-AEAD7

**`etm` takes independent keys** · class: libsignal · effect: none

- libsignal derives `(cipher_key, mac_key, iv)` from one seed by HKDF; the derivation is absorbed
  into the chain PRG.

### DEV-AEAD8

**The IV is part of the key** · class: libsignal · effect: none

- libsignal derives the IV and never sends it.

### DEV-AEAD9

**The header is an output of decryption** · class: libsignal · effect: none

- ACD19 Def. 1's `Dec(K, a, e)`. Mirrors libsignal's receiver.

### DEV-AEAD10

**The wire OT-CCA game decrypts arbitrary bytes** · class: libsignal · effect: none

- libsignal MACs the raw received bytes and parses them non-canonically. Lean (`wireOtccaGame`): the
  ideal ciphertext is `encode h (uniform body)` with a uniform tag; security holds for every codec.

### DEV-AEAD11

**Only the path with a local address** · class: libsignal · effect: out of scope

- The legacy path without addresses is not covered.

### DEV-AEAD12

**Key selection belongs to the FS-AEAD layer** · class: libsignal · effect: none

### DEV-AEAD13

**Expected addresses are fixed per scheme** · class: libsignal · effect: none

### DEV-AEAD14

**AES and the SHA-256 compression are arbitrary functions** · class: machine model · effect: none

- `E`, `D`, `F` are parameters in the model-level games; on the stock ELF (0 non-panic external hooks, DEV-E7) they are instantiated to FIPS 197 AES-256 and FIPS 180-4 SHA-256 and execute verified linked code (DEV-E8).

## LS: the libsignal session against Fig. 8 (ACD19 §5.2, Fig. 9)

Homes: `LibsignalBinary/Specifications/CryptoGames/SM/LibsignalGame.lean` (DEV-LS1–LS4, LS6), `Computational/Specifications/Session/ACD19/Ratchet/`,
`Computational/Proofs/CryptoGames/Ratchet/`
(the session model and its definitions are in `LibsignalBinary/Specifications/CryptoGames/Ratchet/`) and
`Computational/Proofs/SessionHeadlineProto.lean`. ACD19 §5.2 lists four differences between its scheme
and Signal: deferred randomness for sending, epoch indexing, the FS-AEAD abstraction (Fig. 9), and
the initial key agreement. The proof does not show that libsignal is an instance of Fig. 8. It
couples the restricted game on the session model with Fig. 8's game (`libsignal_refines_proto`),
with explicit error terms. ACD19 §5.2 ends "the security of Signal itself still follows from our
framework"; for real libsignal that needs DEV-LS1, LS2 and the window terms of LS12.

### DEV-LS1

**Receive takes coins, and they are always honest** · class: libsignal · effect: restricts the
adversary

- ACD19 Fig. 8 runs CKA-S in `Send`; Fig. 2 has adversarial coins only for `transmit` and `chall`.
  libsignal's `dh_ratchet_step` draws the next ratchet key pair at receive time (ACD19 §5.2,
  "Deferred randomness for sending"). Lean (`SMSchemeR.receive`, `deliverR`, `injectR`): receive
  takes coins, which the game always samples honestly.
- Effect: the adversary never controls the randomness of a ratchet key. Its `transmit` coins are
  SPQR's only. ACD19's randomness-failure clause (§3) is covered only for SPQR coins.
- In the SPQR-on correctness game (`corrGameNoInjR` with `HonestCoins`, DEV-LS35) the send coins
  are honest too: the adversary never passes its own coins to `transmit-P` / `chall-P`, so no coins
  in that game are chosen by the adversary. They may still leak through `corr-P`.

### DEV-LS2

**No corruption in a party's window** · class: libsignal · effect: restricts the adversary

- Lean (`inWindow`, `corrR`): `corr-P` is refused between a receive that starts a new epoch of `P`
  and `P`'s next send. Alice starts inside her window.
- Why: after libsignal's eager ratchet step, `P`'s state holds the next sending key and a root key
  one step ahead, which Fig. 8 has not drawn yet; the reduction cannot answer such a `corr-P`.
- Effect: no claim for exactly the exposure that ACD19's deferred randomness was designed to avoid.

### DEV-LS3

**Bob never sends in epoch 0** · class: libsignal · effect: restricts the adversary

- Lean (`noBobSendInEpoch0`): `transmit` and `chall` by Bob in epoch 0 are refused. libsignal's epoch-0
  header carries Bob's signed pre-key public key, which the reduction does not know (DEV-LS22).
  Unreachable through libsignal's public API: Bob's session is created when he decrypts Alice's
  first message.

### DEV-LS4

**No corruption of Alice before epoch 10** · class: formalization · effect: restricts the adversary

- Lean (`noAliceCorrWhileAliceBelowEpoch10`): `corr-A` is refused while `epoch A < 10 = 2·MAX_RECEIVER_CHAINS`. Until then
  Alice's state holds the receiver chain keyed by Bob's signed pre-key public key, which the
  reduction cannot fill in (DEV-LS22).
- Effect: forward secrecy and post-compromise security for compromises of Alice in the first five
  round trips are not covered.

### DEV-LS5

**Injections only with on-curve ratchet keys and `< 2^32`-byte parseable wires** · class: libsignal · effect: restricts the adversary

- Lean (`ratchetKeyAdmissible`, `configR1OnCurve`, `bhInjOK`): an injected ciphertext (including the
  inner `SignalMessage` of a pre-accept partnered tag-3 wire in `bhInjOK`) whose header parses and
  either has `2^32` or more bytes or has a ratchet key that is not `encT` of a group element is
  refused. libsignal accepts any 32 bytes (twist points, mixed-order points, non-canonical
  encodings); the CKA game needs group elements (DEV-CKA12), and bounding parseable injections below
  `2^32` bytes (already enforced by `shortCiphertext` in the binary harness `bhInjOK`, DEV-M1,
  DEV-CLI14) restricts the `macForgeryProb` supremum in standalone `SessionSecure` to
  `ser.length < 2^32` (DEV-LS23).
- `injOK` is also used as an on/off switch: the SPQR-on correctness game sets
  `injOK := fun _ => false` (`configCorrNoInj`, `Computational/Proofs/CryptoGames/SM/LibsignalCorrNoInj.lean`), so
  `injectR` refuses every injection there (DEV-LS35).

### DEV-LS6

**No correctness in the theorem** · class: formalization · effect: restricts the adversary

- Lean (`configR1`): the game is ACD19 App. A.1's hybrid H1, Fig. 2 without the correctness `win`.
  The theorem bounds privacy and authenticity, ACD19's bound without `ε_corr`.
- libsignal rejects honest messages that Def. 9 demands (more than 25,000 ahead, a skipped key older
  than the 2,000 newest, an epoch older than the 5 newest chains). Correctness within these limits
  is proved for the session model (`Corr.libsignal_corr`, `libsignal_corr_proto`, with
  `mustLibsignal`, the windowed correctness of DEV-SM5) but is not composed into either headline.
  Composing it needs a Lemma 16 for the restricted game with the windowed predicate; H1 plus a
  separate correctness theorem was an engineering choice, with no known obstacle.

### DEV-LS7

**Inherited from the generic game** · class: formalization · effect: constants

- DEV-SM6, SM2, SM8, SM3 apply. The Fig. 8 side runs with epoch bound `qep + 1` (at `Refine.sim A`,
  and in the legacy window reductions `simWin k` of `LibsignalSessionStatements.lean`, whose hidden
  `transmit` can open one more epoch).

### DEV-LS8

**Epochs are named by ratchet keys, not numbered** · class: libsignal · effect: constants

- ACD19 §5.2, "Epoch indexing". Lean (`GhostState`, `chainEpochs`): ghost epoch numbers. Def. 7 (B)
  holds only relative to the receiver's ghost chains; the MAC binds the epoch only through its parity,
  so FS-AEAD bounds are stated for one-epoch adversaries (DEV-FS20); two equal ratchet keys break
  chain lookup (DEV-LS18).

### DEV-LS9

**No FS-AEAD abstraction; per-chain skipped-key stores** · class: libsignal · effect: none

- ACD19 §5.2, "FS-AEAD abstraction", and Fig. 9. libsignal keeps a sender chain and up to 5 receiver
  chains, each with up to 2,000 skipped keys stored as seeds, not Fig. 9's global dictionary. The
  simulators track this with ghost chains (`GhostChain`, `toGhost`).

### DEV-LS10

**Bounded state: 25,000 / 2,000 / 5** · class: libsignal · effect: constants

- `MAX_FORWARD_JUMPS`, `MAX_MESSAGE_KEYS`, `MAX_RECEIVER_CHAINS`; ACD19 keeps everything. Fig. 6 is
  instantiated with `maxSkip = 25000`; messages libsignal rejects but Fig. 8 accepts are answered
  "rejected" by the simulator; correctness uses `mustLibsignal` (DEV-LS6).
- Effect: the computational slot sum `fsCompBound` runs over `fsSlotCount qR = 2·qR + 25001`
  active slots (`qR` main-chain slots plus `qR + 25001` lookahead slots; DEV-FS12), while the
  MAC-forgery term is paid once per chain outside the slot sum (DEV-LS23).

### DEV-LS11

**Spurious ratchet steps on evicted epochs** · class: libsignal · effect: constants

- An honest message of an evicted epoch carries a ratchet key the receiver no longer stores, so
  libsignal runs a fresh ratchet step; the MAC check then fails. Fig. 8 would accept it. Term
  `2·spuriousStepTerm`, a supremum over a fixed test of two root-KDF steps, not an adversary advantage.

### DEV-LS12

**libsignal accepts a forged epoch start inside the window** · class: libsignal · effect: constants

- After its eager step `P` accepts an unseen ratchet key, a forged start of epoch `t_P + 2`;
  Fig. 8 rejects `t > t_cur + 1`. This violates ACD19 Def. 7 (E). The main simulator `Refine.sim`
  rejects new-epoch receives inside a window; the coupling (`runWinAt`) bounds the probability of
  the first ambiguous window or signed-pre-key receive directly without window simulator copies.
- Effect: `2·forgedEpochStartSpuriousStepTerm` for an unknown ratchet key inside a window, plus one extra copy of
  `fig8ShortBound … (Refine.sim …)` (via `Thm1.challSim`) for an honest ratchet key while Bob's
  signed pre-key chain is unknown, giving `2·fig8ShortBound` in the headline bound.

### DEV-LS13

**`previous_counter` and other public message parts** · class: libsignal · effect: none

- ACD19 Fig. 8's header is `(t, T, ℓ_prv)`. libsignal sends `previous_counter` (one less than
  Fig. 9's `ℓ_prv`), MACs it and never reads it. Lean (`LibsignalMsgPublicPart`): it travels in a public message part
  together with SPQR's fields and the addresses. Challenge pairs must agree on it (DEV-FS19), and
  ACD19 Lemma 18's fixed message becomes a blanking map that keeps the public part
  (`ThmB.privRedB`). Both are proved for the reductions' adversaries.

### DEV-LS14

**Message keys: chain step, then HKDF with a salt** · class: libsignal · effect: none

- Fig. 6's PRG becomes `ck ↦ (HMAC(ck, 0x02), HMAC(ck, 0x01))`, and the AEAD key, MAC key and IV are
  `HKDF(salt, seed, "WhisperMessageKeys", 80)`.

### DEV-LS15

**Identity keys and addresses inside the MAC** · class: libsignal · effect: none

- The MAC input is `sender_identity ‖ receiver_identity ‖ version ‖ protobuf`; Alice's messages carry
  the addresses until her first successful receive.

### DEV-LS16

**Atomic receive only through the caller's clone** · class: libsignal · effect: none

- ACD19 Def. 7 (A) holds for `try_decrypt_from_record`, not for libsignal's inner methods; the model
  reproduces this and proves atomicity at the session level.

### DEV-LS17

**Adapter conventions** · class: formalization · effect: none

- A failed send returns the old state and an empty ciphertext; a zero initial agreement gives a
  session without sender chain; received plaintexts are fitted to `ℓ` bytes.

### DEV-LS18

**Ratchet-key collisions** · class: libsignal · effect: constants

- From DEV-LS8: term `2·(q_ep + 2)·(q + q_ep + 2)·δ`, with `δ` bounding the probability of any public key
  (hypothesis `hδ`). For X25519 `δ = 2^-250` (clamping leaves 2^251 scalars, and `k`, `−k` give the
  same u-coordinate); the theorem only assumes `hδ`.

### DEV-LS19

**A 32-bit counter, 0-based on the wire** · class: libsignal · effect: none

- ACD19 indices are 1-based and unbounded. libsignal's counter is a `u32`, the wire carries `i − 1`,
  and the chain step panics at `u32::MAX` (DEV-E7). The theorem assumes `q < 2^31 − 12502`
  (`hq32`), far beyond the useful range of the bound.

### DEV-LS20

**The wire format** · class: libsignal · effect: none

- `version ‖ protobuf{ratchet_key, counter, previous_counter, ciphertext, …} ‖ 8-byte MAC`, AES-256-CBC
  then HMAC-SHA256/8 over the raw bytes. The receiver parses the counter before checking the MAC.

### DEV-LS21

**prost's codec and a restricted round trip** · class: libsignal · effect: none

- The headline fixes prost's codec (`protoSignalCodec`, `LibsignalBinary/Specifications/LibsignalSignalMessage.lean`).
  The wire round trip holds only for version 4 and fields shorter than 2^63 bytes, proved for prost
  (`signalRoundTripShort_proto`), and serialized wires of short plaintexts fit in `< 2^32` bytes
  (`signalEncodeFits32_proto`, discharging the `ser.length < 2^32` domain of `macForgeryProb` on
  honest deliveries; DEV-LS23); hence the "short" layer of the proof.

### DEV-LS22

**Bob's signed pre-key public key is secret** · class: libsignal · effect: none relative to ACD19;
restricts the adversary relative to deployed libsignal

- ACD19 §4.1.2's DDH CKA starts from a shared secret `(h, x₀)` with `h = g^{x₀}`, and §5.2 ("Initial
  key agreement") models the initial CKA key as secret. In libsignal `h` is Bob's signed pre-key
  public key, published in his pre-key bundle and reused across sessions. In the game nothing
  reveals it except `corr-B`.
- Effect: the theorem covers adversaries that do not know Bob's signed pre-key public key in advance.
  This is faithful to ACD19 but weaker than deployed libsignal. DEV-LS3, LS4 and the epoch-0 term
  exist because of this.

### DEV-LS23

**The MAC-forgery term `macForgeryProb`** · class: libsignal · effect: constants

- `macForgeryProb F` is the bounded-length non-uniform supremum, over identities, serialized bytes
  with `ser.length < 2^32`, and 8-byte tags, of the probability that an 8-byte HMAC tag under a
  uniform 256-bit key equals the given tag: a concrete key-regularity (min-entropy) property of the
  compression function `F` in Merkle–Damgård `hmacWith F`, not a computational PRF advantage.
  Restricting `ser.length < 2^32` makes the supremum non-vacuous in the random-function heuristic:
  for an idealized random function `{0,1}^256 × {0,1}* → {0,1}^64`, the unbounded supremum over all
  `ser` is `1` almost surely (by Borel–Cantelli), whereas over `ser.length < 2^32`
  (`< 2^(2^35 + O(1))` tuples vs `2^192` expected key hits per tuple) Chernoff plus a union bound
  concentrates the supremum at `≈ 2^-64 (1 + o(1))` almost surely. Computational PRF security alone
  still does not bound this non-uniform supremum (a contrived PRF can plant a constant-tag trigger at
  a secret `< 2^32`-byte message); rather,
  every message `ids ‖ ser` acts on the 256-bit inner chaining state `s₀(k) = F(IV, k₀ ⊕ ipad)` via
  a map `g_m` in the finite transformation monoid generated by `{F(·, B)}` before the single outer
  call `trunc₆₄(F(F(IV, k₀ ⊕ opad), pad₉₆(g_m(s₀(k)))))`, so `macForgeryProb F ≈ 2^-64` holds when
  no such `g_m` correlates `g_m(s₀(k))` with `F(IV, k₀ ⊕ opad)` to bias the 8-byte tag under uniform
  `k`. Honest wires satisfy `ser.length < 2^32` via `signalEncodeFits32_proto` (DEV-LS21), and
  parseable injections satisfy `w.length < 2^32` via `ratchetKeyAdmissible` (DEV-LS5; already
  enforced by `shortCiphertext` in the binary harness, DEV-M1, DEV-CLI14). `macForgeryProb F` is at
  least `2^-64` for every `F`. In `fsShortBound = fsCompBound + 4 * macForgeryTerm C qd`, a single
  global MAC-forgery hop (`CellForgery.lean`, `SignalWireShortProto.lean`) hoists non-honest
  decryption forgeries out of the `fsSlotCount qR` hybrid slot sum, so
  `macForgeryTerm C qd = qd · macForgeryProb C.F` is paid once per chain (`4 · q · macForgeryProb`
  per FS-AEAD instance at `qd = q`; DEV-SM26). In `StatementComposed.lean`
  (`fig8MixShortAuthV1`, `hiddenSaltMixtureBound`, `fsAeadAuthMixtureCompBound`,
  `fsAeadAuthSlotSumBound`), non-honest wire-MAC forgeries are hoisted further out of the `(t, j)`
  loop so `4 * macForgeryTerm Z q` is paid once per last-leak bucket (`8 * macForgeryTerm Z q`
  across honest-header and forged-header modes in `fig8MixShortAuthV1`) and once per `DeliverForge`
  boundary cell or `(t_L, par)` parity bucket (DEV-LS31, DEV-C14).

### DEV-LS24

**SPQR is abstract; the Double Ratchet claims cover empty-SPQR sessions only** · class: libsignal ·
effect: out of scope

- The triple ratchet is not in ACD19 and no post-quantum claim is made. The session model assumes
  `SpqrOffCorrect` (every receiver accepts every sent message with the sender's salt, and SPQR never
  panics), which SPQR off satisfies and real SPQR does not. `SpqrOffCorrect` is temporary: it is the
  hypothesis of the SPQR-off headline and will be removed once the SPQR-on (V1) headline is on main.
- The image is stock libsignal v0.105.4. A session that a PQXDH handshake creates has SPQR on
  (`Version::V1`, `min_version: V1`; DEV-PQ3), and no theorem covers it. The CLI's SM-mode
  statements start from the records the game writes (`binStateOf` of the session model's initial
  states at `spqrOffSessionParams C`, whose SPQR is `spqrOffB`; `SmScheme.lean`, `SchemeModel.lean`), so they are
  claims about empty-SPQR sessions, a state that the deployed handshake does not produce.
- SPQR off is not "accept everything": the image holds the whole `spqr` crate, and on an empty
  state `spqr::recv` still parses the message's preamble and fails with `MsgDecode` if it does
  not parse. The trusted model is `LibsignalSpqr.spqrRecvEmpty`
  (`LibsignalBinary/Specifications/LibsignalSpqr.lean`); the binary statement uses `spqrOffB`
  (`LibsignalBinary/Specifications/LibsignalE2E/State.lean`). Sent messages are empty, the empty message passes
  the check, and `spqrOffB` never panics, so `SpqrOffCorrect` still holds.

### DEV-LS25

**The salt PRF** · class: libsignal · effect: constants

- The receiver takes the salt from an unauthenticated SPQR field before checking the MAC, so the
  adversary can make it expand one seed under several salts. The proof treats `seed ↦ salt ↦ keys`
  as a PRF (`lSaltPRF32`), paying `2·Adv^PRF(lSaltPRF32, …)` per active slot in `fsCompBound` (via
  `lSaltRed ∘ slotSaltRed ∘ multiSlotAdv`), bounds non-challenge-salt decryptions once per chain by
  `macForgeryTerm` before the wire reduction, and reduces the challenge salt (`j = 0`) to `lWire`
  (`lWireRed 0 ∘ slotWireRed ∘ multiSlotAdv`) without a salt-guess factor. With SPQR off every salt
  is empty; the bound is not simplified for that case.
- **Salts are 32-byte effective salts.** `lSaltPRF32`
  (`LibsignalBinary/Specifications/CryptoGames/Ratchet/LibsignalSMInstance.lean`) is a PRF over
  `Salt32 = List.Vector (BitVec 8) 32`, with real answer `deriveMessageKeys F (some salt) seed`: HKDF keyed
  by the uniform 32-byte ikm, over arbitrary 32-byte salts, the BBGS'23 Thm 11 setting, which holds
  for HMAC-based HKDF. The Fig. 8 instance carries the same type: `LibsignalMsgPublicPart.salt` and the ciphertext's
  salt are `Salt32`, and `lAead` keys with `deriveMessageKeys F (some salt)`. The simulator
  (`LibsignalSim.lean`, `mkPub` / `mkC`) maps SPQR's raw `HKDF.Salt` through `effectiveHkdfSalt32`, which
  gives the same message keys (`msgKeys_effSalt`). So `none` and `some 0³²` are one salt, and a
  ciphertext replayed with the other salt is the same ciphertext for the intermediate OT-CCA
  statement. A PRF over the raw `HKDF.Salt` would be false: HKDF-Extract keys HMAC with 32 zero
  bytes for a missing salt (RFC 5869) and HMAC zero-pads its key, so `none` and `some 0³²` give the
  same keys for every seed, and an adversary that queries both wins with advantage close to 1.
- **Upstream salt lengths.** `spqr` 1.6.0's message key is `MessageKey = Option<Vec<u8>>`
  (`src/lib.rs:42`). Chain keys are `[u8; 32]` (`src/chain.rs:229`), but `recv_key(0, 0)` returns
  `Ok(vec![])` (`src/chain.rs:416–418`), and `recv` passes it on unfiltered as `Some([])` on its
  `Ordering::Greater` path (`src/lib.rs:406`). So salts have length 0 or 32. HMAC zero-pads its key
  (RFC 2104 §2), so `None`, `Some([])` and `Some(0³²)` give the same message keys. The effective
  32-byte salt is `CryptoGames.effectiveHkdfSalt` (`LibsignalBinary/Specifications/CryptoGames/AEAD/EffSalt.lean`;
  `hkdfExtract_effSalt`, `msgKeys_effSalt` in `HKDFDefs.lean`).
- **PQXDH.** `PrfMsgKeys` (`Computational/Specifications/Assumptions/Assumptions.lean`) is stated over
  32-byte effective salts (`PrfMsgKeysQuery.derive : List.Vector UInt8 32 → _`, real answer
  `deriveMsgKeys mkSeed (some salt)`), the BBGS'23 Thm 11 setting, and holds for HMAC-based HKDF.
  The reductions query `effectiveHkdfSaltBytes spqrSalt?` and key their caches by it (`sameSaltKey`,
  `mkSaltKeyMatch`, `ReductionsAuthPrf.lean`). The bridge needs every SPQR salt to have at most
  32 bytes: the law `WellFormedPrimitives.spqrInitRecv_salt_len` (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`;
  the send side follows by `spqr_corr`). It is a hypothesis of the PQXDH headline (through
  `CryptoWellFormedPrimitives`) and narrows the `P` covered. Real `spqr` (lengths 0 / 32) and
  SPQR off (`none`) satisfy it.
- **Binary coverage gap (the only open point).** `HKDF.Salt` cannot express upstream's
  `Some([])`. The SPQR-off binary statements (`spqrOffB`) are unaffected: every salt is `none`. The
  CLI's PQXDH-mode statements (`CliSpecPqxdh`, `LibsignalCliPqSecure`: the session model's SPQR is
  `pqxdhSpqrSession W` = `spqrV1Session`), map `Some([])` to `none` (DEV-SPQR2, `recvKeyToSalt?`): same keys, but a
  different value than upstream returns.

### DEV-LS26

**Initial keys and epoch 0** · class: formalization · effect: constants

- The epoch-0 keys are `rootKdf k_root (encPt λ)`, ACD19 Fig. 8's `P-Up(P-Init(k_root), λ)`; Alice
  draws her first sending key at session start. Term `2·epoch0Term`: a PRG advantage for the epoch-0 keys
  plus the probability that Alice accepts an injection on Bob's signed-pre-key chain. PQXDH is out
  of scope (DEV-M5).

### DEV-LS27

**Every message of a session has length `ℓ`** · class: formalization · effect: restricts the
adversary

- ACD19 requires `|m0| = |m1|` only for challenges. No length-hiding claim beyond fixed `ℓ`; the
  binary statement assumes `ℓ < 2^31`. See DEV-AEAD2.

### DEV-LS28

**One session, no stores** · class: libsignal · effect: out of scope

- No previous sessions, no `PreKeySignalMessage` wrapping, no stores, trust checks, registration ids
  or staleness checks; self-sessions excluded.

### DEV-LS29

**An abstract DH group (session lemma `L2`; concrete X25519 in the CLI headline `Main`)** · class: formalization · effect: none

- In Lemma 2 (`SessionSecure`, `StatementSession.lean`) and the standalone session theorems, the CKA
  and PRF-PRNG terms are parameterized over an abstract `Dh` tied to `C.X`/`C.pubKey` by
  `X25519RealizesDh` and encoding hypotheses.
- In the CLI security headline (`CliPqxdhSecurityFor` / `CliPqxdhElfSecure` /
  `CliPqxdhBinaryCorrectAndSecure`, `StatementPqElf.lean`), the group is fixed to the concrete
  Curve25519 prime-order x-only subgroup (`X25519Pt`, `x25519Dh`, `x25519EncPt`, `x25519EncT`,
  `x25519DecT`, explicit `x25519Delta = 1 / 2 ^ 250` in
  `LibsignalBinary/Specifications/CryptoGames/DH/X25519Group.lean`) and `realUnreachedPrims
  kemKeyGen`, with all seven session group laws and all 55 non-`kemKeyGen` fields of
  `CryptoWellFormedPrimitivesδ` discharged as proved lemmas (`ConcreteX25519Group.lean`,
  `ConcreteX25519Pow8.lean`, `ConcreteX25519Prims.lean`).

### DEV-LS30

**Terms left as assumptions** · class: formalization · effect: out of scope

- The headline does not compose Thm 3 (CKA from DDH for X25519), does not reduce the PRF-PRNG term
  or the chain PRG to HMAC, and does not reduce the wire OT-CCA terms to AES and HMAC. These stay as advantage terms, so they are the cryptographic
  assumptions of the theorem. (`Computational/Proofs/ReductionDsl/LibsignalBoundDDHChain.lean` reduces the chain PRG against the 2-query reduction `lChainRed`.)
- The wire OT-CCA terms should be reduced to AES and HMAC with a **tight** bound. A per-slot
  Encrypt-then-MAC bound plugged into every hybrid slot is sound but too loose: it charges
  `qd / 2^64` and `qd` HMAC forgery terms per slot, about `2·(4q + 25001)·q` tag guesses per FS-AEAD instance
  instead of the `4q` of the hoisted MAC-forgery hop (`4 * macForgeryTerm`), and the bound reaches
  `2^-32` at under 100 queries. A tight reduction needs a wire theorem whose forgery bad event is
  counted once per chain, as `fsShortBound` does for `macForgeryProb`. Open.

### DEV-LS31

**The bound has an 8-byte MAC tag floor (reaches 1 at `q = 447,781,295` for `q_ep = q`, not reached below the `_hq32` cap for `q_ep ≤ 10`)** · class: formalization · effect: constants

- With `macForgeryProb ≥ 2^-64` (and `2^-64` per uniform-key 8-byte tag test in the companion
  spurious-step and epoch-0 / SPK terms), the per-session 8-byte tag part of
  `sessionAdvantageBound` (`(92 · q_ep + 96) · q · 2^-64` for `q_ep ≥ 1`, `112 · q · 2^-64` at
  `q_ep = 0`) reaches `2^-32` at `q = 38,347,923` (`q_ep = 0`), `22,845,571` (`q_ep = 1`),
  `4,227,331` (`q_ep = 10`), `9,662` (`q_ep = q/2`), `6,833` (`q_ep = q`), and reaches `1` at
  `q = 633,258,380` (`q_ep = q/2`) and `447,781,295` (`q_ep = q`), while for `q_ep = 0 / 1 / 10`
  it stays below `1` across the entire `_hq32` per-session counter range `q ≤ 2,147,471,145`
  (`≈ 2^-26.19` at `q_ep = 0` and `≈ 2^-23.01` at `q_ep = 10` at `q = 2,147,471,145`; algebraically
  `164,703,072,086,692,426` / `98,120,979,115,476,339` / `18,156,244,167,036,961` without the cap,
  evaluated directly from the closed-form formula above).
- Factors on `macForgeryProb` in `StatementComposed.lean` / `StatementSession.lean`:
  `32 · (q_ep + 1) · q` from `2 * fig8MixShortAuthV1` (`2 × 2 × (q_ep + 1)` last-leak `t_L`
  buckets in `admissibleLastLeakGuesses 3 (q_ep + 2)` × `8 * macForgeryTerm Z q`, split into `4 · q`
  honest-header and `4 · q` forged-header modes while computational slot hops use
  `fsAeadAuthMixtureCompBound`), `24 · (q_ep + 2) · q` from `fig8MixShortPrivV1` (`2 × (q_ep + 2)`
  challenge epochs `i < q_ep + 2` × `3` `t_L`-free `fsAeadMixtureBound` instances `redFSPriv i` and
  `2 * redFSPrivCoin i`, each paying `4 · q`), `(32 · q_ep + 8) · q` for `q_ep ≥ 1` (`24 · q` at
  `q_ep = 0`) from `2 * hiddenSaltMixtureBound` (`2 × ((q_ep + 1)` `B1` cells `+ q_ep` `B2` cells
  `+ 2 · max(1, q_ep)` `(t_L, par)` parity buckets) × `4 * macForgeryTerm Z q`, with computational
  slot hops in `fsAeadAuthSlotSumBound`; DEV-LS23, DEV-LS36), plus `(4 · q_ep + 8) · q · 2^-64`
  from the companion 8-byte tag-test suprema (DEV-C14). (The standalone uncosted `fig8ShortBound` in
  `Computational/Proofs/SpecLemmas/` retains the pre-bucket per-`(t, t_L, j)` sum;
  [`README.md`](README.md) §3 compares with ACD19's composed shape.)
- **Incomparability with the earlier per-cell bound:** hoisting MAC forgeries into these buckets
  drops the MAC term from `O(q_ep² · q² · μ)` to `O(q_ep · q · μ)` in exchange for up to `1.95×`
  more PRF-PRNG terms, up to `1.74×` more FS-AEAD terms (for `q ≥ 1`; `2.33×` at `q = 0, q_ep = 1`),
  and a re-indexed, enlarged reduction family under `ratchetCostBudget q (qep + 1)`, so the session
  statement is formally incomparable with the earlier per-cell form rather than a strict tightening
  (see [DEV-C14](#dev-c14) for the full breakdown).

### DEV-LS32

**`Δ_SM = 3 = 2 + Δ_CKA`** · class: formalization · effect: none

- Matches ACD19 Thm 3 (`Δ_CKA = 1`) and Thm 6. Written `2 + 1` in the statement.

### DEV-LS33

**No corruption of Bob in epoch 0 (`noBobCorrInEpoch0` in `SpkHop2Red.lean`)** · class:
libsignal · effect: restricts the adversary

- `configRefuseEarlyBobCorr` (`SpkHop2Red.lean`) and the wrapper `RefuseB0` (`StatementComposed.lean`)
  refuse `corr-B` while `epoch B = 0` (`noBobCorrInEpoch0`). This is a **strict new refusal**
  relative to `configR1OnCurve`: there, `noAliceCorrWhileAliceBelowEpoch10` (DEV-LS4) restricts
  Alice and DEV-LS3's `noBobSendInEpoch0` forbids only Bob's sends; epoch-0 `corr-B` is allowed.
- It is necessary: in the leaked-pre-key game, Bob's epoch-0 state holds the uniform root key and
  the ratchet scalar `s` that the adversary knows on one side of the proof's hop and not on the
  other; exposing it ends every PRF argument about the root key.
- No observable SM-API state is lost: through libsignal's API Bob's session record exists only
  after his first successful decrypt (`session_recv_prekey`), which starts his epoch 1. Before
  that, Bob holds only PQXDH secrets (identity, signed, one-time and Kyber pre-keys). Compromising
  Bob before his first receive is a **PQXDH-level corruption** (reveal of those secrets), which
  belongs to the PQXDH game (`SignalPqxdh.Security.PqxdhCorrectAndSecureδ`), not the session game.

### DEV-LS34

**No corruption of Bob while Alice is before epoch 10 (`noBobCorrWhileAliceBelowEpoch10` in `SpkHop2Red.lean`)** ·
class: formalization · effect: restricts the adversary

- `configRefuseEarlyBobCorr` (`SpkHop2Red.lean`) refuses `corr-B` while `epoch A < 10`, matching `noAliceCorrWhileAliceBelowEpoch10` (DEV-LS4) for
  `corr-A`. Since `epoch B = 0` implies `epoch A ≤ 1`, `noBobCorrWhileAliceBelowEpoch10` implies `noBobCorrInEpoch0` (DEV-LS33).
- Why: in Hop 2 of the leaked-signed-pre-key proof (`SpkHop2Red.lean`), Alice may still store her
  initial receiver chain `(pub s, ck0)` up to epoch 9 (`MAX_RECEIVER_CHAINS = 5`). While she does,
  a wire carrying sender ratchet key `pub s` hits `ck0` in the `s` world and takes a spurious DH
  step in the hidden-scalar `x` world; withholding `corr-B` in that window keeps the two worlds
  coupled without leaking the diverging state.

### DEV-LS35

**The SPQR-on correctness game has no injections and honest send coins** · class: formalization
· effect: restricts the adversary (correctness game only)

- ACD19 Def. 9 lets the correctness adversary inject at trivial positions and choose send coins.
  Lean (`corrGameNoInjR`, `configCorrNoInj`, `HonestCoins`, `CorrectWithinNoInj` in
  `Computational/Proofs/CryptoGames/SM/LibsignalCorrNoInj.lean`): `injOK := fun _ => false`, so every `inject-P` is
  refused (DEV-LS5), and the adversary never passes its own coins to `transmit-P` / `chall-P`
  (DEV-LS1). Drops, reordering, delays, corruptions of either party and leaked coins remain.
- Why: this is DJKPS25 SM-corr (Lemma 4.4, Remark 2.13). In SM-corr the adversary may inject but
  loses at its first accepted injection; an adversary that answers its own injections "refused" or
  "rejected" wins this game with at least the same probability, because a rejected injection
  changes no game state and libsignal commits a session only on success. This reduction is argued in
  prose in the `corrGameNoInjR` docstring
  (`Computational/Proofs/CryptoGames/SM/LibsignalCorrNoInj.lean`), not machine-checked: no Lean
  lemma states it. Honest coins are needed because
  SPQR's correctness rests on ML-KEM δ-correctness, which holds over uniform randomness only
  (DEV-SPQR6).
- Not used by `Corr.libsignal_corr` or by either headline
  (DEV-LS6).

### DEV-LS36

**Without SPQR salt binding, the refinement has a hidden-salt term bounded on paper only** · class:
formalization · effect: adds a term (refinement under decision C only)

- The refinements `Refine.libsignal_refines` and `Refine.libsignal_refines_weak` assume that an SPQR
  receiver that accepts an honestly sent SPQR message returns the sender's salt (`Corr.SpqrOffCorrect`,
  resp. W1 `Corr.SpqrSaltBindingOn`). Real SPQR need not: a receiver state steered by earlier
  injected SPQR messages can return another salt `salt'` on an honest wire delivered in transit
  (*case 3*), and libsignal then derives the message keys from `HKDF(salt', seed)`.
- Lean (`Refine.libsignal_refines_C_proof` in
  `Computational/Proofs/CryptoGames/Ratchet/SessionProofs/RefinementC.lean`, definitions in
  `Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/LibsignalRefinesCDefs.lean`):
  SPQR only needs send totality and no send panic (`Spqr.sendPanics`) on an
  invariant, for each party's first `q` sends (`Corr.SpqrSendCorrectQ`, W0 graded by a send
  budget). There is no assumption on `spqr::recv`: where it panics (`Spqr.recvPanics`; libsignal
  aborts and stores nothing) `libsignalToModularSchemeSim` answers `rejected`, without a query.
  The reduction `libsignalToModularSchemeSim` (`Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/LibsignalSimC.lean`) keeps the Fig. 8 state of
  corrupted parties and, in case 3 while `safe-inj` fails (*3a*), decides with Fig. 8's own
  `receive` of the salt-replaced ciphertext `c'`; if it accepts, it sends Fig. 8 `deliver` of the
  honest ciphertext (same receiver state change, same query count). When the seed of the position
  is not known to the reduction it answers `rejected` like `sim`. The bound `LibSimC` adds
  `2 · hiddenSaltTerm`: the probability that such a hidden receive would be accepted by Fig. 8
  (and so by libsignal), measured by the probe game `hiddenSaltGame`.
- Case 3 on an honest wire of an evicted epoch (*evicted salt mismatch*): with the sender's salt,
  libsignal's spurious DH step fails its MAC check (DEV-LS11); with `salt'` libsignal reads the wire
  as a new key and may accept it. `libsignalToModularSchemeSim` then runs `sim`'s new-key checks on `c'` at epoch
  `epoch + 1` (not an honest record): if `safe-inj` fails on a `deliver`, no Fig. 8 query moves the
  receiver to that epoch, so `libsignalToModularSchemeSim` answers `rejected` and the probe game counts it in
  `hiddenSaltTerm`; otherwise it sends Fig. 8 `inject` of `c'`, as for any new key.
- Why it is not bounded in Lean: the seed `ck_t` of a hidden position is pseudorandom to the
  adversary but not fresh (it has seen other ciphertexts under it), so the bound chains the CKA,
  root-PRNG and chain-PRG hops of Thm 6 / Thm 5 at a guessed `(t, t_L)` with a MAC forgery under
  `HKDF(salt', seed)` (HKDF-Extract as a dual PRF, as in `spuriousStepTerm`):
  `≲ Σ_{t,t_L} (ε_CKA + ε_PRNG) + q (q_ep + 2) (ε_PRF + 2⁻⁶⁴)`. `authAdvantage` does not cover it
  (it counts injections under `safe-inj` only); a Lean bound needs a deliver-forgery variant of the
  Fig. 8 authenticity game.
- **Caveat (the evicted salt mismatch).** There the seed comes from `DH(x, y)`, with `x` the
  receiver's current DH secret and `y` the evicted honest key. If the adversary knows `x` (it
  corrupted the receiver or chose its send coins in the current epoch), the seed is not
  pseudorandom to it. An adversary that can steer the receiver's SPQR salt can then search `salt'`
  against the 8-byte tag (about `2⁶⁴` work, because libsignal truncates the HMAC-SHA256 tag to 8
  bytes: DEV-AEAD3, DEV-LS31), so `hiddenSaltTerm` need not be small and the bound can be weak for
  such adversaries. This comes from dropping W1, not from `libsignalToModularSchemeSim`: libsignal accepts such a wire,
  and Fig. 8 has no transition for it.
- Paper: DJKPS25 (ePrint 2025/078) has no counterpart term. It asserts without proof that trivial
  injections leave the post-quantum ratchet state unchanged (Lemma 4.7, Hybrid 1; the
  trivial-injection paragraph of Lemma 4.9); that assertion plays the role of W1, which
  `hiddenSaltTerm` replaces. For libsignal with SPQR the assertion does not hold: a trivial
  injection can change the receiver's SPQR state.
- W0 is graded because ungraded W0 (`Corr.SpqrSendCorrect`: `send` total on an invariant closed
  under `send`) is false for SPQR V1, the case decision C is for. A party that never receives stays
  in one chain epoch, and its `2³²`-th send fails (`nextKeyInternal`, `.ctrOverflow` at
  `ctr = u32::MAX`, `chain.rs:231`; the same `u32` cliff as in DEV-SPQR7). `Corr.SpqrSendCorrectQ S q`
  asks for totality only on states with fewer than `q` sends behind them; the game makes at most `q`
  SPQR sends per party (one per `transmit`/`chall` query), and `q < 2³²`. Ungraded W0 implies it
  (`Corr.spqrSendCorrectQ_of_spqrSendCorrect`, `LibsignalSimCFacts.lean`, added with the WP2-C
  proof PR).
  `Refine.libsignal_refines_weak` keeps ungraded W0 and so does not cover SPQR V1.
- Under W1 the term is `0` (`hiddenSaltTerm_eq_zero_of_saltBinding`), and it is `0` for an adversary
  that never corrupts and never chooses send coins (`hiddenSaltTerm_eq_zero_of_uncompromised`;
  both proved in `Computational/Tests/Sanity/LibsignalRefinesCSanity.lean`). Not used by either
  headline.

### DEV-LS37

**Pre-corruption snapshot seed evaluation in `libsignalToModularSchemeSim` (`predictReceiveWithSnapshots`)** · class: formalization · effect: none

- Home: `predictReceiveWithSnapshots` (`Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/LibsignalSimC.lean`,
  `Computational/Proofs/CryptoGames/Ratchet/SessionProofs/RefinementC/KnownSeedEval.lean`).
- In `libsignalToModularSchemeSim`, `LibsignalToModularSchemeSimState` records the pre-corruption state snapshots
  `snaps : List (Party × ℕ × GhostState PQ)` (appended in `simCorrC`), and `fwdC` calls `predictReceiveWithSnapshots` in
  place of `predictReceive`. When an honest wire `w` of record `c` arrives with a modified SPQR salt
  (`c' ≠ c`) while `!sC.base.mir.safeInj 3` holds, and `predictReceive` (`Kept.eval` followed by `sentEval`)
  returns `none`, `predictReceiveWithSnapshots` falls back to `snapshotMessageKeySeed P sC.snaps Q c.1.1 w` and `kDecryptFig8`: if the
  message-key seed at `(t, i)` is reconstructible from a corruption snapshot (via a stored skipped
  message key in `receivingChains`, a sender or receiver chain key at epoch `t`, or the two-step
  root-KDF chain from snapshots of `Q.other` at epochs `t - 2` and `t`), the simulator decrypts `w`
  at the modified salt `c'.2.2.2` and resynchronizes via `resyncC` rather than firing `H.probe Q c'`.
  Thus `probeHook` only sets `sC.base.flag := true` (`hiddenSaltTerm`) when the position is not
  already compromised by a corruption snapshot (`snapshotMessageKeySeed = none`). Whenever `snaps = []` (no
  corruptions) or `predictReceive` returns `some _`, `predictReceiveWithSnapshots` agrees identically with `predictReceive`
  (`evalCK_nil_snaps_eq_evalC`, `evalCK_of_evalC_some`). In
  `Computational/Tests/Sanity/LibsignalRefinesCSanity.lean`, `hiddenSaltTerm_eq_zero_of_saltBinding`,
  `libSim_of_libSimC_weak`, `libsignal_refines_weak_of_C`, and
  `hiddenSaltTerm_eq_zero_of_uncompromised` keep their statements unchanged, now refer to the
  patched `libsignalToModularSchemeSim` / `hiddenSaltTerm`, and still prove that `hiddenSaltTerm = 0` under salt binding
  (W1) and under no corruption (`isCorrQuery = 0`), providing an additional non-vacuity sanity check
  for the patch.

## M, E: the compiled binary

Homes: `LibsignalBinary/Proofs/SignalSession/SmScheme.lean` and
`LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T; the legacy fixed-image SM-mode
definitions `CliBinary.lean` and `CliBinaryFixed.lean` have been removed), and for the shared entries,
`LibsignalBinary/Specifications/LibsignalE2E/` (T). The list "Deviations of a run of the ELF" in
`CliBinaryPq.lean`'s docstring is authoritative. The binary adds no term to the bound: each entry below changes which scheme and game
the bound is about, never its terms. `DEV-E2` to `DEV-E5`, `DEV-M8` and `DEV-M13` are retired.

### DEV-M1

**Inputs of 2^32 bytes or more** · class: machine model · effect: restricts the adversary

- They give `none`; the game refuses such injections (`shortCiphertext`). Honest ciphertexts are
  shorter.

### DEV-M2

**The receive's epoch and index are computed in Lean** · class: machine model · effect: none

- Home: `LibsignalBinary/Proofs/SignalSession/SmScheme.lean`: `cliRecvE`.
- The CLI does not output ACD19 Def. 7 (B)'s `(t, i)`; they come from Lean's header parse
  (`SignalMessage.tryFrom`) and the epoch bookkeeping: index = counter + 1; a ciphertext whose
  header does not parse in Lean but which the CLI accepts gets the current epoch and index 0. They
  decide what counts as a trivial forgery, so this code is trusted; it equals the session model's
  mapping on reachable states.

### DEV-M3

**Fixed protocol addresses** · class: machine model · effect: none

- The wrapper fixes the parties' names and device 1; the session model's bound holds for every
  address.

### DEV-M4

**Fixed identity keys** · class: machine model · effect: none

- As DEV-M3; the bound holds for all distinct identity keys.

### DEV-M5

**Initialisation from the handshake's output (binary Double Ratchet statements)** · class: libsignal ·
effect: out of scope

- In the CLI's SM-mode statements (`SmScheme.lean`), the root KDF of the session key is computed in Lean (`initKeysE`) and
  the game writes both parties' initial session records from its output; no libsignal code
  initialises the session. ACD19 §5.2 ("Initial key agreement") likewise assumes a shared initial
  key.
- PQXDH is not part of these statements. It is covered by separate theorems: binary functional
  correctness of the PQXDH entries (DEV-PQ1–PQ11), classical model-level security
  (`SignalPqxdh.Security.PqxdhCorrectAndSecureδ`, DEV-PQ12–PQ30). No composition of PQXDH with the Double Ratchet
  is claimed (DEV-C5). None of them is folded into the SM-mode statements, and none makes a
  post-quantum claim (DEV-PQ19).

### DEV-M6

**One fixed memory layout** · class: machine model · effect: out of scope

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T), section "Deviations of a run of the ELF".
- The ELF image `elf` (`ElfImage.parse bytes = .ok elf`) is loaded at its static segment addresses (for the
  pinned static non-PIE ELF `cliElfBytes`, linked with stock `ld.lld` under `third_party/libsignal/libsignal-session/cli-elf/stock/stock_c2.ld` at base `0x400000`, 4
  `PT_LOAD` segments). The process gets an 8 MiB stack with its top at `0x7fff_ffff_0000`
  (DEV-CLI7), the auxiliary vector of `SignalSession/Process.lean` (`AT_RANDOM` = 16 zero bytes,
  `AT_HWCAP` = `0x1b` enabling FP, ASIMD, AES, and PMULL while keeping LSE bit 8 `= 0`), `mmap`
  slots from `0x6000_0000_0000`, and `brk` starting at
  `elf.brkStart`.
- A real kernel places the stack, `brk`, and the `mmap` area at random addresses; no claim is made
  for another stack/`mmap`/`brk` layout.

### DEV-M7

**This ELF and its build** · class: machine model · effect: out of scope

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T), section "Deviations of a run of the ELF".
- The claim is about the ELF pinned by SHA-256 in `CliElf.lean` (`.GeneratedLean/cli-elf/libsignal-cli.elf`):
  libsignal v0.105.4's `libsignal-cli` CLI built from source by `scripts/cli-elf-stock --stdbin --build`
  with stock LLVM `ld.lld` (`22.1.8`, `--no-relax`, `-static`, `-no-pie`, `--gc-sections`,
  `-T third_party/libsignal/libsignal-session/cli-elf/stock/stock_c2.ld`, which `scripts/cli-elf-stock` renders from `cli-elf/stock.ld` (`_render_c2_stock_ld`: C2 moves the `4` libc rows `memmove`, `memcmp`, `bcmp`, `strlen` to the `.text.b_pre` tail below `e_entry`) and fails on any drift, pinned in
  `third_party/libsignal/libsignal-session/cli-elf/stock/inputs_stock_stdbin.lock`) from the
  compiled `rustc 1.98.1` crate objects and trimmed `alloc`/`std` sysroot members
  (`translation.toml` and `cli/io/translation.toml`: release profile
  with overflow checks on, ARMv8 hardware AES autodetection, and the software SHA-2 backend), `rustc 1.98.1`'s bundled musl
  runtime `self-contained/{crt1.o, crti.o, crtn.o, libc.a}`, `cli-elf/stock/rdl_shim.S` and the
  zero-word extern-stub object `extern_stubs_clean.o` (both assembled with `zig 0.16.0`; no
  Zig-compiled `libc` routines are linked), and the StdBin entry harness (`cli-elf/std-main`).
  Production builds, other compilers, and other flags are not covered.
- In the promoted ELF-direct headlines (`libsignal_cli_pq_secure_elf_binary`,
  `libsignal_cli_pq_binary_correct`, `comp_refines_cli`, `signal_session_secure`), execution is
  stated directly on `cliElfBytes` with no library placement (`libsignalSessionLib`,
  `ProofLib.Placed.Multi`, `LinkedAt`/`LinkedIn`, `CliLabelsFromObjects`, `CliElfCodeMatchesPlaced`,
  `DirectOrBranchStub`, and assumption `A-LINK` leave the trusted statements). Every instruction
  outside the 18 Rust panic entry points is fetched from plain loaded ELF memory (zero initial
  memory patches). What enters the trusted statement closure is engine
  `Arm64.Trusted.Process.Overrides` (`parseSymtabFull`, `resolveSym`, `overrideProgram`, already
  engine TCB) plus `CliElfAddrs` and `resolveCliElfAddrs` in `CliBinaryPq.lean`. The remaining
  symbol-naming trust point is that `cliElfBytes`'s `.symtab` labels the 18 panic entry points and
  5 `SampleNTT` entries accurately (cross-checked against the extracted objects in untrusted
  `ElfDirectBridge.cliElf_symtab_agrees_with_placement` and `CliLabelsFromObjects`, and checked
  at build time by `scripts/stock-pin/alink_check.py`; see `Computational/docs/TRUSTED_BASE.md` §5).
  The legacy linker (`untrusted_legacy_linker`) is retired from both the shipped ELF build and the
  repository's statement and proof closures.

### DEV-M9

**No pre-key layer and no libsignal session initialisation** · class: libsignal · effect: out of
scope

- Home: `LibsignalBinary/Proofs/SignalSession/SmScheme.lean`, module docstring.
- Init writes the session model's records directly (`binStateOf`, `encodeRecord`): libsignal's
  session initialisation and PQXDH never run in the SM statements. While Alice's record is
  unacknowledged it holds the constant pending pre-key of `encodeRecord` (base key `0x05 ‖ 0^32`,
  no Kyber pre-key).
- A send gives the inner `SignalMessage` of a pre-key message (DEV-CLI1); a receive takes `2 ‖ c`
  only (DEV-CLI2). The pre-key layer and PQXDH are claimed by the PQXDH-mode statements
  (`LibsignalBinary/Proofs/SignalSession/PqStatement.lean`), not by the SM statements.

### DEV-M10

**The identity private keys are public test constants** · class: machine model · effect: none

- Stored in the image; used only by the handshake, which is out of scope.

### DEV-M11

**Each call is a fresh process** · class: machine model · effect: out of scope

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T), section "Deviations of a run of the ELF".
- Each `init` / `send` / `recv` in `cliRunElf` (`CliRunsToElf`) is one run of
  the ELF from plain `ElfImage.loadState` to `exit_group` or `SIGABRT`. In
  `ElfImage.loadState`, the trusted loader's `Arm64.Process.initFsState`
  (`arm64-semantics/Arm64/Trusted/Process/Loader.lean`, l.467) opens only standard streams on file
  descriptors `0`, `1`, and `2` (the initial state from which the proofs establish `FdsGe3Closed`,
  i.e. that `fds ≥ 3` are closed at each `read_file` call); a real process launched with extra
  inherited file descriptors is outside this fresh-process model. The allocator never frees
  (DEV-E6), and the CLI's clock is the constant `UNIX_EPOCH` (`cli/src/lib.rs`). No claim about a
  long-lived process.

### DEV-M12

**Ghost bookkeeping in the state** · class: machine model · effect: none

- The scheme state carries the party and epoch ghost, which the binary does not hold; corruption
  reveals them too (public bookkeeping).

### DEV-M17

**Merged into [DEV-CLI10](#dev-cli10): plain `loadState` runs `aes` and SPQR CPU probes on pinned `AT_HWCAP = 0x1b`, `AT_HWCAP2 = 0` (legacy `cliTokenPatch` only)** · class: machine model ·
effect: out of scope (LSE / other `AT_HWCAP` values)

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T) (`CliRunsToElf` starts
  from plain `elf.loadState (cliProcessInputs i)` with no initial `.data` patch; legacy
  `cliTokenPatch` remains only in proof-side `CliBinaryTokenPatch.lean` / `CliProcessFixed.lean`).
- See [DEV-CLI10](#dev-cli10) for the pinned `AT_HWCAP = 0x1b` / `AT_HWCAP2 = 0` / `LSE = 0` scope.

### DEV-E1

**Hooks write only their outputs** · class: machine model · effect: none (ELF-direct headlines: panic-only `cliProgElf`); w.l.o.g., argued (legacy `cliHookTable`)

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T), section "Deviations of a run of the ELF".
- On the 0-hook stock `ld.lld` ELF (`cliProgElf` intercepts only the `18` panic entry points
  `cliPanicSymbolsPlaced` resolved from `.symtab`, which terminate the process with `SIGABRT`), no hooked extern remains in
  the ELF-direct headlines, so every non-panic call executes linked ELF code under the machine's full
  AArch64 instruction semantics and DEV-E1 has no effect on the headlines.
- For the legacy fixed-image hook table `cliHookTable` (`CliRunFixed.lean`, outside the headline
  closures): under AAPCS64 (the Arm 64-bit procedure call standard) a callee may clobber all
  caller-saved state (`x0`–`x18`, caller-saved SIMD/FP registers, NZCV flags), whereas each hook of
  `cliHookTable` writes only what its definition names and keeps every other register (e.g.
  `writeStdoutHook` writes only `x0` and the trace), so a compiled caller that wrongly relied on a
  caller-saved register surviving a hooked call would still verify.
- Argued, not proved (for legacy `cliHookTable`): correct compiler output never relies on caller-saved registers across a
  call; every reached call site keeps its live values in callee-saved registers and reads only the
  outputs.
- Future work that would make it machine-checked on legacy `cliHookTable`: have those hooks havoc (overwrite with arbitrary
  values) every caller-saved register, the values drawn from the hook choice `W`, and re-run the
  proofs; the result would then hold for every AAPCS64-conforming libc (still for one ELF,
  DEV-M7).
- The CLI does not hook `hashmap_random_keys` (reaching its
  stub halts the run).
- **Proof-side fixed-image extern contracts (`LibsignalBinary/Proofs/SpecLemmas/SignalSession/CliExternsFixed.lean`):
  closed by quantification.** `CliExternsOk P A ext` specifies one `HookSat` contract per
  row of the legacy fixed-image CLI table (47 rows, not only the hooks above). `HookOk` keeps only
  the callee-saved registers, `sp` and the memory a contract names, so a caller that relied on a
  caller-saved register, a flag or result bits the ABI leaves free would fail to verify, and each
  call site must prove the callee's precondition. The trusted base for the CLI's externs is these
  contracts, not the hook bodies. Remaining modelling assumptions of the contracts: each extern
  uses at most its stack budget below `sp` (4 KiB for `mem*` and the allocator, 16 KiB otherwise);
  I/O paths are `PathOk` and ASCII; `duration_since` is pinned on `UNIX_EPOCH` (its only call).
  The fixed table meets them (`cliExterns_ok`, `LibsignalBinary/Proofs/SignalSession/Cli/CliExternsWitness.lean`).
  The proof-side ELF corollaries over these contracts were removed on the move to `main`; the fixed-address PQXDH-mode statements with no allocation premise were retired at Route B2 (DEV-CLI15).

### DEV-E6

**`__rust_dealloc` frees nothing** · class: machine model · effect: w.l.o.g., argued

- Home: `LibsignalBinary/Proofs/SpecLemmas/SignalSession/HooksCommonLegacy.lean`: `deallocHook`.
- No block is reused within a call; a reused block's old bytes would be one more kind of residue.
- **Proof-side fixed-image extern contracts (`LibsignalBinary/Proofs/SpecLemmas/SignalSession/CliExternsFixed.lean`):
  closed by quantification.** `CliExternsOk P A ext` quantifies over every
  allocator `A : RustAlloc` and extern table meeting the contracts.
  `rustDeallocSpec` consumes the block's `live` token, so a use-after-free in the binary cannot be
  proved, and a freed block may be handed out again. One idealization remains (`poolEmp`): the
  allocator's pool needs no program memory at entry, i.e. its blocks come from memory that no other
  frame owns. The proof-side ELF corollaries of these statements were removed on the move to `main`;
  the fixed-address PQXDH-mode statements with no allocation premise were retired at Route B2 (DEV-CLI15).
- Not checked: the outputs must not depend on uninitialised bytes. No CLI theorem varies the
  initial memory and no theorem checks independence from uninitialised bytes, so this rests on the
  argument above alone.

### DEV-E7

**The ELF aborts exactly where the session model panics** · class: machine model · effect: none

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T), section "Deviations of a run of the ELF".
- The session model's panic (a `u32` chain-index overflow) is the outcome `aborted` of the specs;
  `cliProgElf addrs` intercepts the `18` `.symtab`-resolved Rust panic entry points
  (`cliPanicSymbolsPlaced`) via `abortOnPanic` and ends the process with `SIGABRT`
  (`CliProcess.lean`). In the pinned ELF, the linked bodies of those panic functions reach musl
  `abort` only via the abort-only `rdl_shim.S` handlers `rust_begin_unwind` (from `panic_fmt`) and
  `__rust_alloc_error_handler` (from `handle_alloc_error`); the real ELF writes no stderr panic
  message either, so this is not a modelling gap (executing the linked panic chain directly without
  `abortOnPanic` is deferred to a follow-up). Availability only: an abort is a denial of service
  and reveals no secret. Unreachable for sends in the game; for receives it needs MAC-valid
  injected jumps, that is a corruption.

### DEV-E8

**All cryptographic primitives execute verified linked ELF code with no non-panic hooks (18 Rust panic overrides, DEV-E7; legacy `cliHookTable` hooks primitives)** · class: machine model · effect: none (ELF-direct headlines) / out of scope (legacy `cliHookTable`)

- On the stock `ld.lld` ELF (`cliProgElf` in
  `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` has 0 non-panic hooks and
  intercepts only the `18` Rust panic
  entry points `cliPanicSymbolsPlaced` resolved from `.symtab` as `SIGABRT`, DEV-E7; the proof-side `55`-symbol `cliDehookedSymsPlaced`
  inventory and empty `cliHookTablePlaced := []` live in untrusted
  `LibsignalBinary/Proofs/Placed/CliBinaryPqPlaced.lean`), **all cryptographic, I/O, CPU-probe, and
  formatting externs are de-hooked** (and the CLI's coins are plain Rust `cli/src/coins.rs`):
  - **SHA-256 + HMAC and AES-256-CBC (ARMv8 hardware AES + `fixslice64`)**: `sha2::sha256::compress256` and `libcrux_hmac::hmac`
    (together with its `libcrux_sha2::hacl::*` SHA-256 helpers) are verified against FIPS 180-4
    SHA-256 `CryptoVerification.LibsignalSpqrV1.sha256Compress`
    (`LibsignalBinary/Proofs/HookDischarge/CryptoSha256/`); and
    `signal_crypto::aes_cbc::aes_256_cbc_encrypt` and `aes_256_cbc_decrypt` together with `aes`
    0.9.1 `autodetect::Aes256` (`cpufeatures::aarch64::getauxval_hwcap` -> musl `getauxval(AT_HWCAP)`,
    selecting ARMv8 `AESE`/`AESD`/`AESMC`/`AESIMC` at `AT_HWCAP = 0x1b` with `fixslice64` fallback)
    are verified against `aesCbcEncrypt` / `aesCbcDecrypt` at the trusted FIPS 197 AES-256
    specification `CryptoGames.AES256.{aes256Enc, aes256Dec}`
    (`LibsignalBinary/Specifications/CryptoGames/AEAD/Aes256.lean`, proved in
    `LibsignalBinary/Proofs/HookDischarge/CryptoAes/`, with `W.C.E` / `W.C.D` also pinned in
    `HooksMatchPlaced` in `ElfBinding.lean`).
  - **Stage B cutover (`14 → 0` rows in `cliHookTablePlaced`)**: de-hooked `sha2::sha512::compress512`
    (proved against FIPS 180-4 SHA-512 `CryptoGames.SHA512.sha512CompressState` in
    `LibsignalBinary/Proofs/HookDischarge/CryptoSha512/`), x25519-dalek's
    `PublicKey::from(&StaticSecret)` and `StaticSecret::diffie_hellman` (proved against RFC 7748
    `CryptoGames.RFC7748.{x25519PubFromSecretRef, x25519Ref}` in
    `LibsignalBinary/Proofs/HookDischarge/CryptoX25519/`), the `7` `libcrux_ml_kem` Kyber-1024 and
    ML-KEM-768 incremental entry points (proved against round-3 Kyber-1024 and FIPS 203 ML-KEM-768
    over FIPS 202 Keccak/SHA-3 `CryptoGames.{SHA3, MLKEM}` in
    `LibsignalBinary/Proofs/HookDischarge/CryptoMlKem/`), plus `libsignal_cli_io::{write_file,
    write_stdout}`, `core::fmt::write`, and `alloc::fmt::format::format_inner` (proved in
    `LibsignalBinary/Proofs/HookDischarge/CliIoFmt/`).
  - **Closed primitive bundle (`realPEParams`), symbolic per-call guard (`RealHooksAgreeOnInput`),
    and real-primitive symbolic headlines (`real_prims_admissible`, `comp_refines_cli_real`,
    `signal_session_secure_real`)**:
    `CliPqxdhElfCorrect` and `CliPqxdhElfSecure` instantiate the closed primitive bundle
    `realPEParams` (`realCrypto`, `realPqxdhPrims`) directly without quantifying over `CliHooks`, and
    discharge `MlKemEncaps1SucceedsOn64ByteHeaderAndSeeds` and AES-256 round-trip `D k (E k x) = x`
    unconditionally on `mlkem768Incremental` and `aes256Enc`/`aes256Dec` (removing both premises from
    `CliPqxdhSecurityFor`). On the symbolic side, the hook-parametric ELF-direct headlines
    (`comp_refines_cli`, `signal_session_secure`) guard all 9 primitives per input via
    `RealHooksAgreeOnInput` (`realCliHooks` in `Symbolic/Specifications/Refinement/ElfBinding.lean`),
    combining `ElfGuard.DirsAgreeOnInput` (agreement of the calling party's encoded X25519 key files
    `encodeDir` and `PqxdhPartyInSpecDomain` membership with `realCliHooks`) and
    `ElfGuard.ModelAgreesOnInput`, guarding both `elfRel` and `CliElfProgress` (trivially `True` at
    `W = realCliHooks`). In addition, `Proven.Refinement.real_prims_admissible` proves
    `RealPrimsAdmissible` (`∃ interp, ExternContractsHoldCli interp ∧ RealPrimsMatch interp`),
    showing that `realCliHooks` obeys the symbolic extern laws, and
    `Proven.Refinement.comp_refines_cli_real` / `Proven.Security.signal_session_secure_real`
    fix the primitives to `realCliHooks` via `RealPrimsMatch` over guarded execution traces with no
    `RealHooksAgreeOnInput` filter (`elfRelReal`, `0 sorry`, `std3` axioms).
    On the computational side, the Main Theorem `libsignal_cli_pq_secure_elf_binary`
    (`CliPqxdhSecurityFor`) instantiates `realPqxdhPrims` and `kyber1024KemKeyGen` with concrete
    `δ_kem = ε + 1 / 2 ^ 112` under `KyberNoiseGap ε` via `kyber1024_kem_delta_correct` (DEV-PQ21;
    witnessed by `cliPqxdhElfSecure_kyber1024_instantiable` in `ModelPrimsWitnessReal.lean`, while
    `cliPqxdhElfSecure_real_9eq_instantiable` witnesses the KEM-generic `CliPqxdhElfSecureAnyKem` at
    `δ_kem = 1` for dummy `XReal.kemKeyGen` and `PrimeOrderX25519Satisfiable` continues to witness
    `KemDeltaCorrect … 0` at `Q255`).
- Whole-function AES-256-CBC and HMAC hooks (`aesEncHook0` / `aesDecHook0` and `aesEncHookMallocng` /
  `aesDecHookMallocng` moved out of trusted `HooksCommon.lean` / `HooksMallocng.lean` into untrusted
  `LibsignalBinary/Proofs/E2E/AesHooks0.lean`, and `libcruxHmacHookMallocng` moved into untrusted
  `LibsignalBinary/Proofs/HookDischarge/CryptoMallocngBudgetBase.lean`) and the legacy X25519,
  SHA-512, Kyber-1024, ML-KEM-768, `write_*`, and `fmt` hooks remain only in untrusted ghost-table
  replay proofs and the retired fixed-image `cliHookTable`
  (`LibsignalBinary/Proofs/SpecLemmas/SignalSession/CliRunFixed.lean`), outside the closure of
  `Computational/Theorems/` and `Symbolic/Theorems/`.
- The UUID parser is not a hook: `<uuid::Uuid>::try_parse` is in the image (the whole `uuid` crate
  is compiled in) and is verified against the trusted model `uuidTryParse`
  (`LibsignalBinary/Specifications/LibsignalTripleRatchetRepr.lean`, a transcription of uuid 1.26.1 `src/parser.rs`).
- `bcmp` (the libc byte compare LLVM emits for byte-slice `==`) was a hook with a trusted contract
  (`CliHooks.bcmp`: any result whose low 32 bits are zero exactly when the strings are equal,
  `bcmp_ok`) until the second stock `ld.lld` cutover (C2) de-hooked it: the run now executes musl's
  `bcmp` (and the `memcmp` it tail-calls) from the pinned ELF, and the `CliHooks` fields `bcmp` /
  `bcmp_ok` / `utf8Err` were removed from the structure (D-C2b;
  `LibsignalBinary/Specifications/SignalSession/CliRun.lean`).
- Cutover history across `cliHookTablePlaced` (`49 → 0` rows, `55` external de-hooked symbols in
  `cliDehookedSymsPlaced` plus intra-library `<String as Clone>::clone` under SC-1 route (I)):
  `B2-TLIT` (`49 → 47`, `RawVec::grow_one`), F3 + IO.6b (`47 → 39`, `5` `__rust_*` allocator shims,
  `<String as Clone>::clone`, and `read_file`/`read_stdin` proved against musl
  `open`/`read`/`close`/`__errno_location` in `LibsignalBinary/Proofs/SignalSession/CliIo/`), first
  stock `ld.lld` cutover (`39 → 37`, `memcpy`/`memset` on `VerifiedLibraries.mallocngLib` blocks
  `20`/`21`), second stock `ld.lld` cutover C2 (`37 → 27`, `memmove`, `bcmp`, `strlen`, `memrchr`,
  `from_utf8`, `duration_since`, `<SystemTime as Add<Duration>>::add`, `subtle::black_box`, and the
  `2` X25519 `Drop::drop` destructors), `D1.A` crypto cutover (`27 → 18`, the `7`
  `curve25519_dalek` Ed25519/scalar operations and `KeyPairCompressedBytes::{pk1, pk2}`), SHA-256 +
  HMAC (`18 → 16`, `compress256` and `libcrux_hmac::hmac`), AES-256-CBC (`16 → 14`,
  `aes_256_cbc_{encrypt, decrypt}`), and Stage B (`14 → 0` hook rows, adding the `14` former hook
  symbols — `compress512`, the `7` `libcrux_ml_kem` entries, `write_file`, `write_stdout`,
  `core::fmt::write`, `format_inner`, x25519 `PublicKey::from` and `diffie_hellman` — plus the `7`
  `core::fmt` `Formatter::{write_str, pad}` and `<str / u8 / u32 / u64 / usize as Display>::fmt`
  externs in `lib2_0.o`, transferred via per-call `FdsHiFrame` in `VmPreserved` and
  `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`; see DEV-CLI4, DEV-CLI8, DEV-CLI19, DEV-CLI21).
- No shared-pool (`mallocng`) or stub hook remains in `cliHookTablePlaced`. (In the retired
  fixed-image bump-allocator hooks of `HooksCommonLegacy.lean` and `AesHooks0.lean`, outside the
  `Computational/Theorems/` closure, the hooks allocated only the returned `Vec` with `cap = len`,
  DEV-E6.)

## PQ: the PQXDH entries and security games

Homes: `LibsignalBinary/Specifications/LibsignalE2E/PqxdhHooksCommon.lean`, `PqxdhInputs.lean`,
`PqxdhModelLink.lean`, `PqxdhCorrectModel.lean`, `PqxdhSessionModel.lean` and
`LibsignalBinary/Specifications/SignalSession/PqDir.lean`, `PqDirNoMatch.lean`, `CliBinaryPq.lean`
for the binary PQXDH entries (`DEV-PQ1`–`DEV-PQ11`; statements `CliSpecPqxdh`,
`CliSpecPqxdhNoMatch`, `CliPqxdhBinaryCorrect`), and
`Computational/Specifications/{Pqxdh,Assumptions,SignalPqxdh}/` for the model-level PQXDH computational security statements
(`DEV-PQ12`–`DEV-PQ32`, statement `SignalPqxdh.Security.PqxdhCorrectAndSecureδ`, theorem `headlineδ`).

- **Reference.** `DEV-PQ1`–`DEV-PQ11`: libsignal v0.105.4 and the compiled image; FG24 has no
  counterpart (it abstracts primitives and has no implementation). `DEV-PQ12`–`DEV-PQ32`: FG24
  Thm 5.1 (the classical KI theorem) unless the entry names BJKS24 or `ours`.
- **Scope.** All model-level PQXDH results are classical (DEV-PQ19). The HNDL games
  (`pqxdhHndlKeyIndExp`, `pqxdhHndlFirstMsgExp`) and bounds (`pqxdhHndlKeyIndBound`,
  `pqxdhHndlFirstMsgBound`) are defined in Lean but are not part of any claimed bound.

### DEV-PQ1

**SHA-512, Kyber1024, and SPQR's ML-KEM-768 functions execute verified linked ELF code with no non-panic hooks (18 Rust panic overrides, DEV-E7; hooked only in legacy unplaced tables)** · class: machine model ·
effect: none (ELF-direct headlines) / out of scope (legacy unplaced tables)

- The extension of DEV-E8: after the Stage B cutover (`14 → 0`) and ELF-direct run cutover,
  `cliProgElf` (`LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean`) intercepts only
  the `18` panic symbols of `cliPanicSymbolsPlaced` resolved directly from `.symtab` (`cliHookTablePlaced := []` in untrusted `LibsignalBinary/Proofs/Placed/CliBinaryPqPlaced.lean`): `compress512`,
  `kyber::{encapsulate, decapsulate}`, and all `7` `libcrux_ml_kem::mlkem768::incremental` functions
  (`pk1`, `pk2`, `from_seed`, `encapsulate1`, `encapsulate2`, `decapsulate_compressed_key`,
  `validate_pk_bytes`), together with all `7` `curve25519_dalek` Ed25519/scalar operations, X25519,
  and `libcrux_hmac::hmac` (with its `libcrux_sha2::hacl::*` SHA-256/SHA-512 helpers), execute
  verified linked ELF code on the stock ELF, alongside
  the in-image XEdDSA wrapper logic, the `spqr` 1.6.0 state machine, and `RawVec::grow_one`. The
  computational ELF-direct headlines instantiate `realPqxdhPrims` in `realPEParams` directly from
  `CryptoGames.{SHA512, MLKEM}`, and the symbolic ELF-direct headlines guard them per input via
  `RealHooksAgreeOnInput` (`comp_refines_cli` / `signal_session_secure`) or instantiate them
  unfiltered at `realCliHooks` (`comp_refines_cli_real` / `signal_session_secure_real` via
  `real_prims_admissible`). Legacy hook definitions in `PqxdhHooksCommon.lean` and
  `LibsignalBinary/Proofs/SpecLemmas/SignalSession/PqxdhHooksLegacy.lean` remain outside the
  ELF-direct headline closure.

### DEV-PQ2

**Kyber1024 round 3, not FIPS 203 ML-KEM-1024** · class: libsignal · effect: none

- libsignal v0.105.4's `kem::KeyType::Kyber1024` (type byte `0x08`) calls libcrux's round-3
  `mlkem1024::kyber`. The KEM is abstract in the model-level games and pinned to
  `CryptoGames.MLKEM.{kyber1024EncapsVec, kyber1024DecapsVec}` in the placed ELF headlines; a
  security layer's KEM assumption is about Kyber1024 round 3.
- On implicit rejection (`ct ≠ c'`), the trusted Kyber-1024 decapsulation specification
  (`kyber1024DecapsWith` / `kyber1024DecapsVec` in
  `LibsignalBinary/Specifications/CryptoGames/KEM/MlKem.lean`) follows `libcrux` `variant::Kyber`
  (`ind_cca.rs:422–450`), computing `KDF(J(z‖c) ‖ H(c))`
  (`SHAKE-256_32(SHAKE-256_32(z ‖ c) ‖ SHA3-256(c))`), not `pqcrystals` round-3 `KDF(z ‖ H(c))`.
  The specification is what the linked binary runs, so this is a faithful model, disclosed.
- Test vectors: `LibsignalBinary/Proofs/HookDischarge/CryptoMlKem/Spec/MlKemOfficialKat.lean`
  checks the trusted Kyber-1024 encapsulation and decapsulation against counts 0–9 of the NIST
  Round 3 KAT `PQCkemKAT_3168.rsp`. That file has only valid ciphertexts. Its
  `kyber1024RejectionDiffersFromRound3Reference` guard shows the rejection key above on a modified
  official ciphertext. The same file checks the ML-KEM-768 definitions behind
  `mlkem768Incremental` against all 70 ML-KEM-768 cases of the NIST ACVP FIPS 203 vectors.
  `Spec/MlKemKat.lean` checks both specs against `libcrux-ml-kem` 0.0.10.

### DEV-PQ3

**SPQR V1 is active in the handshake and wire entries; functional correctness is proved here, computational security is proved separately (model level and `LibsignalCliPqSecure`)** · class: libsignal ·
effect: out of scope

- The image is built from stock libsignal v0.105.4, with no patch. `initialize_alice_session` and
  `initialize_bob_session` call `spqr::initial_state` with `version: V1, min_version: V1`
  (`rust/protocol/src/ratchet.rs`), so every session that a PQXDH handshake creates has SPQR V1 on.
  `spqr::initial_state`, `spqr::send`, and `spqr::recv` (together with `RawVec::grow_one`, and on
  the stock ELF with 0 non-panic external hooks all `7` `libcrux_ml_kem::mlkem768::incremental` callees, `libcrux_hmac::hmac`,
  and its `libcrux_sha2::hacl::*` SHA-256 helpers) are in-image or de-hooked verified machine code
  (DEV-PQ1).
- **Binary functional correctness of the CLI's PQXDH mode with SPQR V1 (`CliSpecPqxdh`).**
  `CliSpecPqxdh` (`LibsignalBinary/Specifications/SignalSession/PqDir.lean`) specifies the CLI's `init`,
  `send` and `recv` (of a `2`-tagged message, and of a pre-key message with a matching session or
  none) against the session model `pqxdhSessionParams W` with the SPQR V1 model `pqxdhSpqrSession W`; `CliSpecPqxdhNoMatch`
  (`PqDirNoMatch.lean`, DEV-CLI11) covers a pre-key message over a session that does not match. Both
  are proved for the CLI's ELF by Lemma 4 `libsignal_cli_pq_binary_correct`
  (`Computational/Theorems/Main.lean`, statement `CliPqxdhBinaryCorrect`), up to an abort of a run in which an allocation fails (DEV-CLI15) or `SampleNTT` seed divergence (DEV-CLI22).
- **What remains out of scope for SPQR.** No computational security claim is made for SPQR V1 or for
  a composed PQXDH + Triple Ratchet (Double Ratchet + SPQR V1) game: no Double Ratchet security
  statement covers SPQR beyond empty-SPQR sessions from the initial records the game writes
  (DEV-LS24, DEV-C5), and no theorem in `Theorems/` relates
  `session_send_wire` / `session_recv_wire` to the session model
  `libsignalSessionScheme (pqxdhSessionParams W)` with `pqxdhSpqrSession W` as its SPQR component.
- **SPQR panics (`O14`) and proved non-vacuity on reachable/honest states.** Because `spqr` 1.6.0
  contains internal `unwrap()` / `expect()` checks that can panic on adversarial wire inputs,
  extreme counter/window states, or primitive failures, the binary functional correctness statements
  account for `spqr`'s model panic outcomes (`(pqxdhSpqrSession W).send = none` and
  `(pqxdhSpqrSession W).recv = .error "spqr recv: panic"`, corresponding to `sendPanicsB` / `recvPanicsSaltB`).
  The models give `none` exactly where `messageEncrypt` / `tryDecryptFromRecord` return
  `.error .panic`, which includes every stock `spqr::send` / `spqr::recv` panic
  (`OutgoingTripleRatchet.encrypt` / `TripleRatchet.decrypt` throw `.panic` on `Spqr.sendPanics` /
  `Spqr.recvPanics`). The trusted panic conditions of
  `tryDecryptSpec` / `recordDecryptSpec` (`LibsignalBinary/Specifications/LibsignalTripleRatchet.lean`)
  allow a panic whenever `S.recvPanics` holds (for `recordDecryptSpec`, once the version check
  passes); the tight panic conditions
  `tryDecryptOnPanicTight` (`LibsignalBinary/Proofs/TripleRatchet/Decrypt/OnPanicTight.lean`) and
  `recordDecryptOnPanicTight` (`LibsignalBinary/Proofs/Cli/SpqrV1/M4/RecordDecryptPV1.lean`) are
  untrusted and proved.

  Three groups of machine-checked lemmas prove that the SPQR panic predicates are **`false`** on
  initial and honest-schedule reachable states:
  1. **Initial responder pre-key receive (`LibsignalBinary/Proofs/E2E/V1/O14InitRecvNoPanicV1.lean`,
     removed on the move to `main` — proved on `stage3/train` `3d2dbef149`, namespace
     `CryptoVerification.LibsignalSpqrV1`):**
     `recvPanicsSaltB_spqrV1Init_false (F : ShaCompress) (K : MlKem) (dir : SpqrDirection) (k : BitVec 256) (msg : List (BitVec 8)) : recvPanicsSaltB (spqrDeps F K) (spqrHkdfWith F) (spqrV1Init F K dir k) msg = false`
     (via `decodeState_spqrV1Init`, `statesPanic_unchunkedRecv_init_false`,
     `chainPanic_init_epoch1_idx0_false`, and `recvPanicsB_spqrV1Init_false`). This proves that on
     freshly initialized V1 state (`epoch = 1`, `ctr = 0`), `spqr::recv` never panics on well-formed
     v1 messages.
  2. **Honest-schedule send totality
     (`LibsignalBinary/Proofs/SpqrV1Sync/SendTotal/{Defs,Assembly}.lean`, namespace
     `CryptoVerification.SpqrV1Sync.SendTotal`):**
     Under `Encaps1Total K` (`∀ hdr : List (BitVec 8), hdr.length = 64 → (K.encaps1 hdr).isSome = true`),
     `topStmts`, `sendPanics_eq_false_of_isSome`, `sendCorrectQ_of`, `spqrV1SessionB_sendCorrectQ`,
     and `spqrSendTotalReachable_v1` prove that `(spqrV1SessionUniformCoins F K).sendPanics s r = false` and
     `((spqrV1SessionUniformCoins F K).send s r).isSome = true` on every state reachable in the honest SPQR
     game with `< 2^32` sends per epoch.
  3. **Honest-braid send and receive no-panic** (superseded standalone modules
     `Computational/Proofs/SpqrV1Sync/{HonestNoPanic,DeltaLift}.lean`, not part of the current
     repository tree; see DEV-SPQR7 for the current SPQR V1 send/receive coverage).

  **When the three O14 panic predicates CAN be `true` in stock `spqr` 1.6.0 (status labels):**
  - **(a) `SpqrInitialStatePanics`: `not-excluded`** (under-specified `spqrInitialStateSpecP` leaves
    `out.length ≤ 256` unproven, so `serialize_panics_over_256` at `lib.rs:95` is not excluded at
    the spec interface; in concrete `spqrV1Init` the serialized initial state is `< 256` bytes, proved
    by `initialState_libsignal_ok` in `LibsignalBinary/Proofs/SpqrV1/InitFacts.lean`).
  - **(b) `sendPanics` (`sendPanicsB = true` in `LibsignalSpqrV1/Assemble.lean:276–284`):
    `unreachable-in-practice`** on reachable states (`SendTotal.lean` proves `sendPanics = false` for
    `< 2^32` sends from `spqrV1Init`; only reachable on synthetic states with `sent_keys.len = 2000`
    at epoch `< 3` or counter `2^32 - 1`):
    1. *Chain or epoch counter overflow on extreme traces:* in `ChainEpochDirection::next_key_internal`
       (`src/chain.rs:231`, `ChainPanic.ctrOverflow`) when a single chain epoch performs `2^32`
       sends (`ctr = u32::MAX = 2^32 - 1`), or in `ChainEpochDirection::key` (`src/chain.rs:266, 271, 280`,
       DEV-LS36 / DEV-SPQR7) when `ctr ≥ 2^32 - max_ooo_keys` (`2^32 - 2000`), or on 64-bit epoch
       overflow `epoch = u64::MAX` (`ChainPanic.addEpochOverflow`), or on synthetic states with
       `sent_keys.len = 2000` at epoch `< 3`.
    2. *ML-KEM `encaps1` returning `none`:* in `incremental_mlkem768::encaps1`
       (`src/incremental_mlkem768.rs:60`, `StatesPanic.encaps1Failed`) if the parameter `K.encaps1`
       returns `none` (`Err`) on the 64-byte header (excluded for valid ML-KEM-768 instances by
       `Encaps1Total K`, and proved unconditionally for `realPEParams.Q.K`).
  - **(c) `recvPanics` (`recvPanicsSaltB = true`, equivalent to `recvPanicsB = true` by
    `recvPanicsSaltB_eq_recvPanicsB` in `LibsignalSpqrV1/Assemble.lean:1008`):
    `proved-reachable`** on adversarial 4-byte v0 wire `[0, _, _, _]` (`Serialize.lean:162`,
    `panic!("unsupported version")`):
    1. *Adversarial v0 wire header:* on any 4-byte message `[0, _, _, _]` with version byte `0`,
       `spqr`'s deserializer hits `panic!("unsupported version")` (`Serialize.lean:162`).
    2. *Counter/window arithmetic overflow on extreme states:* in `ChainEpochDirection::key` /
       `KeyHistory::get` (`src/chain.rs:192, 266, 271, 280`, `ChainPanic.keyHistoryAddOverflow` /
       `ChainPanic.ctrOverflow`, DEV-LS36 / DEV-SPQR7) once the receiver's chain counter reaches
       `ctr ≥ 2^32 - 2000`, where an incoming message index `at` within `max_jump = 25000` can have
       `at + 2000 ≥ 2^32` and overflow checked `u32` addition.
    3. *Adversarial post-initial SPQR states or primitive failure:* because `ReachablePqxdhSession.recv` admits any
       message `c` for which `Params.receive` returns `some`, a multi-step adversarial trace that
       advances `s.alice.spqr` past initial state (`epoch ≥ 2` or `ctr > 0`) can trigger checked
       epoch addition overflow at `epoch = u64::MAX` (`StatesPanic.unchunkedRecvCt2EpochOverflow`,
       `StatesPanic.unchunkedRecvNextEpochOverflow`, `ChainPanic.addEpochOverflow`), a braid/polynomial
       decoder invariant panic (`BraidPanic`), or `StatesPanic.encaps1Failed` if `K.encaps1` returns
       `none` during a responder-to-initiator epoch transition.

### DEV-PQ5

**Trust on first use** · class: libsignal · effect: out of scope

- Home: `LibsignalBinary/Proofs/SignalSession/PqStatement.lean`.
- The first call that meets the peer's identity key pins it in `identities/<peer>`, and every
  later call checks the pinned key (`PqParty.trusts`, `PqDir.lean`). No claim against identity
  substitution at first contact; which keys are honest is the game's decision.

### DEV-PQ6

**The handshake's RNG is a tape of fixed shape** · class: machine model · effect: none

- `session_initiate` reads 192 bytes in 34 calls for PQXDH (base key 32; Kyber coins: 32 `next_u32`,
  the low byte of each kept, `initiateKemCoins`; first ratchet key 32) plus up to 64 bytes starting
  at byte offset 160 for the initial `spqr::send` (see
  [DEV-SPQR5](#dev-spqr5)); `session_recv_prekey` reads 32.

### DEV-PQ8

**The CLI's fixed environment** · class: libsignal · effect: out of scope

- Home: `LibsignalBinary/Proofs/SignalSession/PqStatement.lean`.
- The clock is `UNIX_EPOCH`, so every record's timestamp is 0; identities are trusted on first use
  (DEV-PQ5); Bob's pre-keys are files, looked up by id.
- The replay state is in the directory (`PqDir.lean`): one-time pre-keys and one-time Kyber
  pre-keys are emptied on use, and a last-resort Kyber pre-key's `.base-keys` refuses a seen
  `(signed pre-key id, base key)` (`markKyberUsed`, `removeOpk`).

### DEV-PQ9

**Unacknowledged sessions never expire** · class: libsignal · effect: none

- Home: `LibsignalBinary/Proofs/SignalSession/PqStatement.lean`.
- `message_encrypt` refuses to send on a pending session older than
  `MAX_UNACKNOWLEDGED_SESSION_AGE` (30 days) at `now`. The CLI's `now` is `UNIX_EPOCH` and every
  reachable record has timestamp 0 (DEV-PQ8), so the check never fires.

### DEV-PQ10

**Pre-key messages below `2^32` bytes; session records and directory files below `2^31` bytes, with non-`.base-keys` files at most `2^21` bytes (`fileCapBytes`, DEV-CLI21)** · class: machine model · effect: restricts the adversary

- Home: `LibsignalBinary/Proofs/SignalSession/PqStatement.lean`.
- `CliRecvPrekeyCorrect` covers `recv` of a pre-key message whose inner message is below
  `2^32 - 2048` bytes: the other fields of the serialized `PreKeySignalMessage` (version byte, ids,
  the 1568-byte Kyber ciphertext, base and identity keys, field keys and lengths; about 1.7 KB) are
  below 2048 bytes, so the whole wire is below `2^32`. This is the machine model's input bound
  (DEV-M1); there is no limit specific to PQXDH.
- The domain `PqxdhPartyInSpecDomain` (`PqDir.lean`) keeps the session record and every directory
  file below `2^31` bytes, and every directory file other than a last-resort `.base-keys` file at
  most `fileCapBytes` (`2^21` bytes; see DEV-CLI21). In the CLI security game's injection filter
  `bhInjOK` (`StatementBinaryHarnessCore.lean`), input above `stdinCapBytes` (`2^20`, `Run.lean`) is refused
  before `receive`: the binary exits `2` and writes nothing (DEV-CLI21), no honest delivery is
  affected for `ℓ < 10^6` (`≤ 1,002,030 < 2^20`, `honest_send_ciphertext_le_stdinCap` in
  `Computational/Proofs/LibsignalCli/CliCapsCompleteness.lean`, under `hreach` — that the session is
  `ReachablePqxdhSession` — and `hm : m.length ≤ maxPlaintextBytes`), and this removes only queries
  that were already refused with no state change: inject-replay of delivered honest ciphertexts
  (≤ 1,002,030 B) is unaffected; only adversarial wires in (2^20, 2^32) move from post-receive
  rejection to pre-receive refusal, at an adversary-known length, so advantage is unchanged (see
  DEV-CLI14). No `ReductionDsl` operation is capped: the operation tables of
  `Computational/Specifications/Reductions/ReductionDsl/AtomicOps.lean` (including
  `atomicAdapterOps`) do not mention `stdinCapBytes`, so every costed-reduction class is unchanged;
  the cap is a filter on the game's `inject` only.

### DEV-PQ11

**No sessions with one's own account (`is_same_account`)** · class: libsignal · effect: restricts
the adversary

- Home: `LibsignalBinary/Proofs/SignalSession/PqStatement.lean`.
- libsignal's `process_prekey` (`session_cipher.rs`) treats a session with one's own account
  specially (`self_session`). The models fix `self_session = false`. The two parties' addresses
  (`partyAddress`) are distinct UUIDs, so the CLI's `is_same_account` check is false on these
  directories. No claim for a party's sessions with its own account.

### DEV-PQ12

**5-step first-message key schedule (`Model.initiate` / `Model.accept`)** · class: libsignal ·
effect: extends

- In libsignal v0.105.4, the PQXDH handshake outputs `DRKey = (rk, ck, pqr)` and the first
  `PreKeySignalMessage` payload is encrypted after an immediate Double Ratchet sending step.
  `SignalPqxdh.Model.initiate` and `accept` (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`) explicitly
  model all five steps: `(rk, ck) → rootCreateChain(rk, DH(eph_A, SPK_B)) = (rk1, ck1_0) →
  chainKdfSeed(ck1_0) = mkSeed → deriveMsgKeys(mkSeed, spqrSalt?) → aes256CbcHmacEnc/Dec` over
  `firstMsgAD`. The PRF assumption `PrfMsgKeys` (`Assumptions.lean`) quantifies over
  attacker-chosen 32-byte effective salts (`effectiveHkdfSaltBytes spqrSalt?`, DEV-LS25) and places no
  cryptographic assumption on SPQR; the only SPQR law used is that salts have at most 32 bytes
  (`WellFormedPrimitives.spqrInitRecv_salt_len`).
- Reference: libsignal v0.105.4. FG24 has no first message (its KI game ends at the session key),
  so steps 2–5 extend FG24. Step 1 also differs from the PQXDH specification: the specification's
  `SK` is 32 bytes; libsignal (and `Model.lean`) derive 96 bytes and split them into
  `(rk, ck, pqr)` (DEV-PQ28).

### DEV-PQ13

**One-key X25519 + XEdDSA identities in Lemma 1 (`PqxdhCorrectAndSecureδ`), and two-key idealization (`IkTwoKeyIdealisation`) in the standalone untrusted `KeyInd` / `Auth` games** · class:
formalization · effect: none (Lemma 1 and Main Theorem); restricts the adversary (standalone two-key and `Auth` results)

- In deployed Signal (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`), a principal's Curve25519 scalar is
  used both for X25519 Diffie–Hellman legs (`DH1`, `DH2`) and for XEdDSA bundle signatures
  (`checkBundleSignatures`). The trusted PQXDH headline Lemma 1 (`PqxdhCorrectAndSecureδ` /
  `PqxdhKeyIndSecureδ` in `Computational/Specifications/Pqxdh/Security/HeadlineDelta.lean`) proves
  key indistinguishability directly for the one-key random-oracle game `pqxdhKeyIndImpl1KeyRo`
  (`KeyInd1KeyRo.lean`), in which each honest principal uses a single scalar for both operations,
  under the joint cryptographic assumptions `GapSigEufCma` (XEdDSA EUF-CMA given the X25519
  decisional DH oracle) and `GapDhWithSign` (single-pair X25519 Gap-DH modulo `pow8` given an XEdDSA
  signing oracle on the first challenge key, queried at most `2 · N_spk_tot` times;
  `Computational/Specifications/Assumptions/Assumptions.lean`).
- Standalone proofs outside the trusted base (`Computational/Proofs/SignalPqxdh/XeddsaRom/`)
  mechanize the SHA-512 random-oracle reductions from both joint assumptions to standalone `GapDH`
  for `libsignal`'s randomized XEdDSA (`xeddsaSignRef`, matching `rust/core/src/curve/curve25519.rs`;
  Degabriele et al., CT-RSA 2012; Thormarker, ePrint 2021/509; Brendel et al., IEEE S&P 2021).
  Over `sha512RoSpec` and under `WellFormedPrimitivesδ P` together with the prime-order
  group-algebra witness `XeddsaCurveLaws P` (`l25519 = 2^252 + 27742317777372353535851937790883648493`,
  `PrimeL25519.lean`), `Statements.lean` and its proof modules establish `XeddsaSignRoundtrip`
  (concrete and ROM sign-then-verify roundtrip and `WellFormedPrimitivesδ` preservation for
  `xeddsaSignRef`), `GapDhWithSignRoBound1A` (single-run `2×` reduction `GapDhWithSignRo ≤
  2 · GapDH + xeddsaSimLoss` with `q_ddh ≤ A.q_ddh` and `q_prim ≤ A.q_prim`, guessing the Edwards
  sign bit in `sig[63]`), `GapDhWithSignRoBound1B` (two-run `1×` reduction `GapDhWithSignRo ≤
  GapDH + xeddsaSimLoss` with `q_ddh ≤ 2 · A.q_ddh + 1` and `q_prim ≤ 2 · A.q_prim`, checking the
  first candidate via `ddhOracle`), and `GapSigEufCmaRoBoundQuad` / `GapSigEufCmaRoBound`
  (rewinding Forking-Lemma reductions giving `GapSigEufCmaRo ≤ √(2(q_H + 1) · GapDH) +
  (q_H + 1)/l25519 + xeddsaSimLoss + xeddsaModLoss` with `q_ddh ≤ 2 · A.q_ddh` and
  `q_prim ≤ 2 · A.q_prim + 1`, where `q_H = q_ro + q_verify + q_prim_sigSign`). A concrete model
  `pZMod` over `ZMod l25519` witnesses joint satisfiability of `WellFormedPrimitivesδ` and
  `XeddsaCurveLaws` (`Computational/Tests/XeddsaRomNonVac.lean`), and `pReal` over `GF(2^255 - 19)`
  with FIPS 180-4 SHA-512 checks byte-exact agreement with `libsignal` v0.105.4 test vectors
  (`Computational/Tests/Kat/XeddsaKatTest.lean`). `XeddsaCurveLaws` is also instantiated directly
  for the concrete `GF(2^255 - 19)` model `modelPrims (realUnreachedPrims kemKeyGen) realPEParams`
  (`xeddsaCurveWitness_realUnreachedPrims` in
  `Computational/Proofs/LibsignalCli/ConcreteX25519Prims.lean`, used via `realXeddsaSign_correct`
  to discharge `sig_corr` in the Main Theorem's proof). Three boundaries separate the standalone
  ROM theorems from the trusted headlines: (a) `WellFormedPrimitivesδ` does not pin
  `P.sigSign = xeddsaSignRef P` (`libsignal-cli` only verifies bundle signatures, though the
  concrete Main Theorem witness sets `realXeddsaSign = xeddsaSignRef`), (b) `P.sha512` in
  `modelPrims` is concrete Merkle–Damgård SHA-512 rather than `sha512RoSpec` ([DEV-PQ1](#dev-pq1)),
  and (c) the Forking-Lemma `√(2(q_H + 1) · GapDH)` loss makes the signature reduction qualitative
  rather than concrete-tight at `deploymentSetup` parameters (`N_id = 2^20`, `q_H = 2^64`).
- Following FG24 (fn. 12, which analyses separate DH and signing keys) and BJKS24 (which does the
  same), the standalone two-key games `pqxdhKeyIndExp` and `pqxdhAuthExp` (together with
  `Pqxdh2KeyKeyIndSecureδ`, `PqxdhAuthSecureδ`, `Pqxdh2KeySecureδ`, and `Pqxdh2KeyCorrectAndSecureδ`
  in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`, outside the trusted base)
  sample the X25519 DH key pair `(ikAPk, secIKA0)` and the XEdDSA signing key pair
  `(ikSignPk, secIKAsign)` independently, and `corruptIK` reveals both secret keys atomically
  (`IkTwoKeyIdealisation`).
- Lemma 1's `Auth` conjunct `PqxdhAuth1KeySecureδ`
  (`Computational/Specifications/Pqxdh/Security/Auth/Headline.lean`) likewise uses one-key
  identities (`pqxdhAuthImpl1Key`, [DEV-C5](#dev-c5)).
- Reference: libsignal (deployed single scalar, matched by `PqxdhKeyIndSecureδ` and
  `PqxdhAuth1KeySecureδ`); FG24 fn. 12 and
  BJKS24 (matched by `Pqxdh2KeyCorrectAndSecureδ` in
  `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`).

### DEV-PQ14

**Random oracle modeling of `HKDF-SHA256` (`HkdfRO`) and first epoch-1 `rootCreateChain`
(`RootKdfRO`)** · class: formalization · effect: none

- In `Computational/Specifications/Pqxdh/Game.lean` and `KeyInd1KeyRo.lean`, the 96-byte PQXDH
  master KDF `HKDF-SHA256(None, ikm).expand(INFO_PQXDH, 96)` is modeled as a lazy random oracle
  `HkdfRO` queried via `roQuery`. In the `Auth`/`FirstMsg` game (`useRo = true`,
  `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`, one-key instance in Lemma 1), the first epoch-1 root KDF `rootCreateChain(rk, DH(eph_A, SPK_B))` is
  likewise modeled as a random oracle `RootKdfRO` (`roRootQuery` in `Auth`, contributing the
  statistical term `rootKdfRoTerm` in `pqxdhAuthBound`).
  The CLI game driver `bhDrvKeyInd` with `useRo = false` at `P_bin := modelPrims X (peParamsWithK W K)`
  runs on one-key identities with the real deterministic SHA-256 HKDF (`pqxdhKeyIndImpl1KeyReal`),
  which differs from the one-key random-oracle game `pqxdhKeyIndImpl1KeyRo` bounded by Lemma 1
  (`PqxdhKeyIndSecureδ`) only by replacing `P_bin.hkdfDerive96` on `roQuery`, `initiate*`, and
  `accept*` with the lazy random oracle `HkdfRO` (`DEV-PQ1`, `DEV-PQ14`; see [DEV-C16](#dev-c16)).
- The CLI's PQXDH security statement `LibsignalCliPqSecure`
  (`Computational/Proofs/LibsignalCli/StatementPqSecure.lean`) has no `useRo` flag: its
  clause 1 bounds the game by the `KeyInd` advantage of the real handshake with one-key identities,
  and its clause 2 assumes `KeyIndRoGap` (`Computational/Specifications/Assumptions/KeyInd1KeyRo.lean`,
  DEV-CLI16), which instantiates assumption 2 (`HkdfRO`) on the one-key game.
- Reference: `HkdfRO` matches FG24 Thm 5.1, which models its KDF as a single random oracle (the RO
  input differs: DEV-PQ28). `RootKdfRO` is ours (used only in the standalone `Auth` proof in
  `Computational/Proofs/`): FG24 has no first message, and BJKS24's CryptoVerif model does not model
  the first root step as an RO.

### DEV-PQ15

**Known-own-secret-key (KOSK) adversary key registration** · class: formalization · effect:
restricts the adversary

- The active registration oracle `registerKey` (`registerAdvKey`, checked by `koskBundleOk` and
  `koskSenderOk` in `Computational/Specifications/Pqxdh/Game.lean`) requires the adversary to supply the
  secret scalar `sk` such that `P.x25519Base sk == pk` (and `sk.length == 32`), ruling out
  rogue-key registrations where the adversary does not know the discrete logarithm of its
  registered key.
- Reference: FG24 Fig. 8. The effect goes both ways. KOSK **restricts** the adversary relative to
  FG24, whose sessions accept arbitrary adversarial bundle and ephemeral keys without knowledge of
  their secrets. Registered adversarial *identities* **extend** FG24, whose parties are all
  honestly generated (and only corruptible).

### DEV-PQ16

**Canonical X25519 point checks (`isCanonical`) on `ekAPk` and `ephAPk`** · class: libsignal ·
effect: restricts the adversary

- `Model.acceptKeys` and `Model.accept` (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`) check
  `P.isCanonical msg.ekAPk` and `P.isCanonical msg.ephAPk` (mirroring `PublicKey::deserialize` /
  `is_canonical` in libsignal) in addition to rejecting all-zero X25519 shared secrets (`!isAllZero
  dh`), ensuring each accepted Diffie–Hellman leg lies in the prime-order subgroup.
- Reference: libsignal. FG24 works in an abstract prime-order group, where the check has no
  counterpart.

### DEV-PQ17

**Single-pair X25519 Gap-DH modulo cofactor-8 equivalence (`pow8`)** · class: libsignal · effect:
constants

- Because X25519 clamps scalars (`clampScalar25519`, clearing the low 3 bits), two 32-byte points
  that differ by an 8-torsion point yield identical Diffie–Hellman outputs under clamped scalars
  (`x25519_pow8_congr` in `Model.lean` and `KemCorrect.lean`, which requires
  `pk1.length = 32 → pk2.length = 32 →` to match X25519's 32-byte truncation; `pow8_base_len` is
  unchanged). `GapDhWithSign` (`Computational/Specifications/Assumptions/Assumptions.lean`, labelled
  `DEV-PQ17` there; standalone `GapDH` in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`)
  follows BJKS24's CryptoVerif model (`PQXDH.m4.ocv:268-291`): the CDH win condition and the
  decisional `isValidDhTriple` oracle test equality up to `P.pow8`, and `Model.initiateKeys` /
  `acceptKeys` require `dhOptNonZero` (`x25519_base_ne_zero`) on each DH leg.
- Reference: BJKS24 / `PQXDH.m4.ocv`, not FG24's GapDH game over a prime-order group. The DDH-oracle
  budget of the reductions is quadratic in the game's queries (`gdhQueryBudget`,
  `Assumptions.lean`).

### DEV-PQ18

**Advantage normalization (`boolBias`: `|Pr[win] - Pr[¬win]| = 2·|Pr[win] - 1/2|`)** · class:
formalization · effect: constants

- All bit-guessing PQXDH games (`KeyInd1KeyRoAdvantage` and `KeyInd1KeyRealAdvantage` in
  `Computational/Specifications/Assumptions/KeyInd1Key{Ro,Real}.lean`, the standalone two-key and
  `Auth` games `KeyIndAdvantage`, `AuthAdvantage`, `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`
  in `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`, `KemIndCca`, `PrfHmac` in
  `Computational/Proofs/SpecLemmas/SignalPqxdh/Assumptions.lean`, and the unclaimed
  `HndlKeyIndAdvantage`, `HndlFirstMsgAdvantage` in
  `Computational/Proofs/SpecLemmas/SignalPqxdh/Game.lean`) define advantage as VCVio's `boolBias` of
  the win bit,
  `|Pr[win] - Pr[¬win]| = 2·|Pr[win] - 1/2| = |Pr[b' = true | b = true] - Pr[b' = true | b = false]|`
  (for a uniform challenge bit). There is no further factor 2.
- Reference: FG24 §3 defines KI advantage as `|Pr[win] - 1/2|`, so our advantage is twice FG24's,
  and a bound here should be compared with twice FG24's bound (DEV-PQ27).

### DEV-PQ19

**Classical-only scope: no post-quantum or HNDL claim** · class: formalization · effect: out of scope
(deliberate)

- Every PQXDH security result (the trusted one-key `PqxdhKeyIndSecureδ` in `HeadlineDelta.lean`, and
  the standalone untrusted two-key `KeyInd` and `Auth` results in `Computational/Proofs/`)
  assumes Gap-DH for X25519 (`GapDhWithSign` in the one-key game, `GapDH` in the two-key games)
  together with classical assumptions (`GapSigEufCma` / `SigEufCma`, `HkdfRO`, and in standalone
  `Auth` `RootKdfRO`, `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`, `PrfHmac`) and classical adversaries.
  Kyber1024 enters only through `KemShCr` (BJKS24 SH-CR, DEV-PQ26) and the public-key collision term
  `N_spk_tot · (N_spk_tot - 1) / 2^256`. If X25519 is broken, the theorems give nothing. **No post-quantum or
  harvest-now-decrypt-later (HNDL) security is claimed.**
- The HNDL games `pqxdhHndlKeyIndExp` / `pqxdhHndlFirstMsgExp`, their advantages, the bounds
  `pqxdhHndlKeyIndBound` / `pqxdhHndlFirstMsgBound` (`Bound.lean`) and the assumptions used only by
  them (`KemIndCca`, `HkdfPRF`, `PrfRk`) are defined in Lean but are **not part of any claimed bound**
  (`Bound.lean`: "not used by the statement"). They model a classical adversary given all X25519
  secrets via `revealDhSecrets`, not a quantum adversary, and no headline theorem mentions them.
- Reference: FG24 Thm 5.2 (post-quantum KI under IND-CCA, PRF and LEAK+r binding against a quantum
  adversary) and BJKS24 Thm 3 have no counterpart here. This is a scope decision, not a gap in a
  claimed result.

### DEV-PQ20

**No case of the bound rests on the KEM (no hybrid `min(ε_GDH, ε_CCA)`)** · class: formalization ·
effect: restricts the adversary

- In FG24 Thm 5.1 several cases are bounded by `min(ε_GDH, ε_CCA)`, and the cleanEE ∧ cleansigE case
  by `n_s · q_RO · ε_CCA`. A session whose only uncompromised secret is the Kyber pre-key is
  therefore covered classically by OW-CCA. In `-D DH` `KeyInd` there is deliberately no `PQSPK`
  freshness disjunct (`keyIndInitCorruptionClause`): such a session is not fresh, and every term of
  `pqxdhKeyIndBound` is DH-, signature- or collision-based.
- Reference: FG24 Thm 5.1. Consequence of DEV-PQ19.

### DEV-PQ21

**Perfect KEM correctness (`kem_corr`)** · class: formalization · effect: hypothesis (and a missing
`δ_corr` term)

- `WellFormedPrimitives.kem_corr` (`Model.lean`), inherited by `CryptoWellFormedPrimitives`
  (`Computational/Proofs/SpecLemmas/SignalPqxdh/Assumptions.lean`), requires decapsulation of every
  honest encapsulation to return the encapsulated secret, for all key-generation seeds and coins.
  The standalone `δ_kem = 0` statements (`PqxdhKeyIndStatement`, `PqxdhAuthStatement` in
  `Computational/Proofs/`) take `CryptoWellFormedPrimitives P`, whereas the trusted headline Lemma 1
  (`PqxdhCorrectAndSecureδ` in `HeadlineDelta.lean`) replaces `kem_corr` by `KemDeltaCorrect P δ_kem`
  and adds `kemDecapsFailureTerm S δ_kem = 2 · N_spk_tot · N_send_tot · δ_kem`.
- Kyber1024 round 3 (DEV-PQ2) has a small, nonzero decryption-failure probability, so `kem_corr`
  does not hold for the deployed KEM; FG24 Thm 5.1 likewise assumes `δ_corr`-correctness and pays
  `n_s · δ_corr`.
- For concrete Round-3 CRYSTALS-Kyber-1024 (`kyber1024KemKeyGen` in
  `LibsignalBinary/Specifications/CryptoGames/KEM/Kyber1024KeyGen.lean` paired with
  `realPEParams.Q.{encaps, decaps}` = `kyber1024{EncapsVec, DecapsVec}`),
  `kyber1024_kem_delta_correct` (`Computational/Theorems/Lemmas.lean`, statement
  `Kyber1024KemDeltaCorrect` in `Computational/Specifications/LibsignalCli/Kyber1024Delta.lean`,
  proof in `Computational/Proofs/Kyber1024Delta/HeadlineProof.lean`) proves `(1568B, 3168B)`
  key-generation length validity and
  `KemDeltaCorrect (modelPrims (realUnreachedPrims kyber1024KemKeyGen) realPEParams) (ε + 1 / 2^112)`
  from the single noise-idealization hypothesis `KyberNoiseGap ε`
  (`Computational/Specifications/Assumptions/Kyber1024Correct.lean`), which bounds the honest K-PKE
  decryption-failure probability under real `SHA3-512` (`G`) / `SHAKE-256` (`PRF`) `CBD_2` noise by
  that under uniform `CBD_2` noise plus `ε` (`ε ≤ Pr[σ = coins]` when `SHAKE-256` is modeled as a
  random oracle, `= 2^-256` if `SHA3-512` is also a random oracle, and `ε = 0` for independent
  key-generation/encapsulation `PRF` random functions, analogous to `KeyIndRoGap` in DEV-CLI16),
  while keeping the `SHAKE-128` `SampleNTT` matrix `Â`, `SHA3-256` message hash `H(r)`, polynomial
  arithmetic, compression rounding, and Fujisaki–Okamoto re-encryption completely concrete.
- The Main Theorem `libsignal_cli_pq_secure_elf_binary` (`CliPqxdhBinaryCorrectAndSecure` /
  `CliPqxdhElfSecure` / `CliPqxdhSecurityFor` in
  `Computational/Specifications/LibsignalCli/StatementPqElf.lean`, proved from
  `libsignal_cli_pq_secure_elf_binary_any_kem` in `Computational/Theorems/Main.lean` — statement in
  `StatementPqElfAnyKem.lean` — and `kyber1024_kem_delta_correct`) fixes
  `kemKeyGen := kyber1024KemKeyGen`, discharges `_hKemValid` unconditionally, and substitutes
  `δ_kem = ε + 1 / 2^112` under `KyberNoiseGap ε` directly into both conclusion bounds. The
  `≤ 1 / 2^255` public-key collision premise `_hKemColl` on `kyber1024KemKeyGen` remains an
  explicit hypothesis because `pk` is determined from uniform 32-byte `d` through concrete unkeyed
  `SHA3-512` (`G`), for which collision/multi-collision bounds cannot be proved unconditionally
  without an idealization on `SHA3-512` (see [`PQXDH.md`](PQXDH.md) §2 fn. 1).
- Reference: FG24 §2 (δ-correct KEM) and Thm 5.1 proof, Game 2 (`n_s · δ_corr`); Kyber v3.02 §1.4.

### DEV-PQ22

**No one-time Kyber pre-key; FG24's session variants are not the modelled ones** · class:
libsignal · effect: out of scope

- `SpkBundleEntry` (`Game.lean`) pairs each signed pre-key with one last-resort `PQSPK`
  (`pqspkId = spkId`); the only one-time pre-key is the EC `OPK`. So every modelled session uses the
  last-resort Kyber key, with or without an EC OPK.
- FG24 analyses two variants: "full" (ephemeral DH plus a signed one-time KEM key) and "reduced"
  (semi-static KEM key). The modelled mix (one-time EC OPK with last-resort KEM key) is the case
  FG24 fn. 13 leaves out, and FG24's one-time KEM case is not modelled. FG24's KEM-key-confusion
  predicates do not arise.
- Classically this costs nothing (DEV-PQ20: no case rests on the KEM). BJKS24 §4.2.2 notes the
  initiator cannot tell a one-time from a last-resort `PQSPK` anyway.
- Reference: libsignal (both kinds of Kyber pre-key exist), FG24 §5 Fig. 10 and fn. 13.

### DEV-PQ23

**Corruption: identity keys, and EC signed pre-keys in `KeyInd` only; no `RevealRand`** · class:
formalization · effect: restricts the adversary

- `corruptIK` reveals the principal's identity secret (both identity secrets in the standalone
  two-key games, DEV-PQ13). `revealSpkSk` (`KeyInd` only) reveals the EC
  signed pre-key secret. There is no oracle revealing a `PQSPK` or `OPK` secret, none revealing a
  session's randomness (FG24 `RevealRand`), and the standalone `Auth` game (`Computational/Proofs/`)
  has no signed-pre-key reveal.
- `revealDhSecrets` exists only in the unclaimed HNDL games (DEV-PQ19).
- Reference: FG24 Fig. 8 (CorruptLTK, CorruptSSKey for every semi-static key, RevealRand).

### DEV-PQ24

**Freshness: the peer must be uncorrupted when the session starts** · class: formalization · effect:
restricts the adversary

- An initiator session records `fresh := honestPeer.isSome`: the bundle's identity key belonged to
  an honest, uncorrupted principal at initiation. `keyIndInitCorruptionClause` requires `s.fresh`
  before its end-of-game disjuncts (peer still uncorrupted, or honest unrevealed SPK, or honest
  OPK). A partnered responder test inherits the initiator's clause (`isKeyIndRespStillFresh`).
- FG24's clean predicates (Fig. 9) do not need this: cleanEE ∧ cleanpeerE and cleanESS cover a
  session whose peer's long-term key was already corrupted, as long as the ephemeral / semi-static
  secrets are clean; on the responder side, cleanESS and cleanEE need nothing about Bob's long-term
  key.
- Initiator-side key-compromise impersonation (Alice's own identity key corrupted) is allowed, as in
  FG24.
- Reference: FG24 Fig. 9.

### DEV-PQ25

**Several `testSession` queries under one bit** · class: formalization · effect: extends

- `KeyInd` allows any number of `testSession` queries, all answered under one hidden bit; a
  non-fresh tested session makes the game output a random coin. FG24 Fig. 8 allows a single Test.
- Reference: FG24 Fig. 8.

### DEV-PQ26

**KEM assumption: BJKS24 SH-CR instead of FG24 LEAK+r-BIND-SS-{CT,PK} and OW-CCA** · class: formalization
· effect: constants

- `KemShCr` (`Assumptions.lean`) is BJKS24 Def. 1: single-user, the honest key pair's secret is
  given to the adversary, and one honest encapsulation to an adversary-chosen `pk'`. FG24 Thm 5.1
  uses multi-user LEAK+r-BIND-SS-{CT,PK} (Def. 3.5) and, for its KEM-based cases, OW-CCA. FG24 §3
  shows that SH-CR and LEAK+r-BIND-SS-{CT,PK} are incomparable (separations both ways).
- The single-user game is paid per (pre-key, sending session) pair: `N_spk_tot · N_send_tot ·
  ε_ShCr`. BJKS24 Thm 5 shows Kyber is SH-CR in the ROM; this is not formalized.
- Reference: BJKS24 Def. 1, Thms 5–6; FG24 Def. 3.5, Thm 5.1.

### DEV-PQ27

**Bound shape against FG24 Thm 5.1** · class: formalization · effect: constants

- With `n_p ↔ N_id`, `n_p · n_ss ↔ N_spk_tot`, `n_s ↔ N_send_tot`, the static capacity form
  `pqxdhKeyIndBound` (`GapDH` in the standalone two-key bound; in the one-key headline
  `PqxdhKeyIndSecureδ` under `GapDhWithSign`, `pqxdhKeyIndBoundActive S b.q_on` replaces each
  `N_*` — including in the collision terms below — by `min b.q_on N_*`, satisfying
  `pqxdhKeyIndBoundActive S b.q_on ≤ pqxdhKeyIndBound S` with equality once `b.q_on ≥ N_dh`)
  matches FG24's cases: `N_spk_tot · N_id` ↔ cleanLTSS, `N_id · N_send_tot` ↔
  cleanELT, `N_spk_tot · N_send_tot` ↔ cleanESS (full), `N_opk_tot · N_send_opk_tot` ↔ cleanEE ∧
  cleanpeerE (DH only; FG24 `n_s²` with `min(ε_GDH, ε_CCA)`).
- FG24 Thm 5.1 is stated for `|Pr[win] - 1/2|` and our advantage is twice that (DEV-PQ18), so
  compare `pqxdhKeyIndBound` (or `pqxdhKeyIndBoundActive` at `b.q_on ≥ N_dh`) with twice FG24's bound.
- The signature term is `min(b.q_on, N_id) · ε_Sig` in `pqxdhKeyIndBoundActive` (`GapSigEufCma` in the
  one-key headline) and `N_id · ε_Sig` in `pqxdhKeyIndBound` (`SigEufCma` in the two-key bound); FG24
  charges `n_p · ε_SIG` in each of four cases.
- Collision terms are `(n_dh · (n_dh - 1) + n_send · (n_send - 1)) / 2^251` for X25519
  (`n_dh = min(b.q_on, N_dh)`, `n_send = min(b.q_on, N_send_tot)`; static cap
  `(N_dh · (N_dh - 1) + N_send_tot · (N_send_tot - 1)) / 2^251`, DEV-PQ17's clamping over unordered
  pairs; FG24 `n²/q`) and `n_spk · (n_spk - 1) / 2^256` for Kyber public keys
  (`n_spk = min(b.q_on, N_spk_tot)`; static cap `N_spk_tot · (N_spk_tot - 1) / 2^256`; FG24 `γ_coll`).
- FG24 terms with no counterpart: the cleanESS reduced-variant hybrid and cleanEE ∧ cleansigE
  (DEV-PQ20, DEV-PQ22), `δ_corr` (DEV-PQ21), `ε_LEAK+r` (DEV-PQ26).
- Reference: FG24 Thm 5.1.

### DEV-PQ28

**KDF input and output fidelity** · class: libsignal · effect: none

- The KDF input is `0xFF^32 ‖ DH1 ‖ DH2 ‖ DH3 [‖ DH4] ‖ SS` (`buildSecrets`) with `INFO_PQXDH`. The
  output is 96 bytes split into `(rk, ck, pqr)`.
- FG24's KDF is abstract: no prefix, no info, a single key `K`.
- Disjointness of the EC and KEM public-key encodings is proved (`encodeEC_ne_encodeKEM`); FG24
  assumes it.
- Reference: libsignal; FG24 §5 Fig. 10.

### DEV-PQ29

**`Auth` / `FirstMsg` game (one-key instance in Lemma 1; two-key instance outside the trusted base)** · class: formalization · effect: extends (see [DEV-C5](#dev-c5))

- The `Auth` game (unilateral responder-to-initiator authentication plus first-message IND-CPA
  under the 5-step key schedule, DEV-PQ12) is defined in
  `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`. Its one-key instance
  (`pqxdhAuthImpl1Key`, `Auth1KeyAdvantage`) is the second conjunct `PqxdhAuth1KeySecureδ` of
  Lemma 1 (`PqxdhCorrectAndSecureδ`, [DEV-C5](#dev-c5)), under `GapSigEufCma`, `KemShCr`,
  `GapDhWithSign`, `PrfChainKey`, `PrfMsgKeys`, `AeadIndCpa`, and `PrfHmac`. The two-key instance
  `pqxdhAuthExp` (two-key model of DEV-PQ13; `PqxdhAuthSecureδ` in
  `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`) stays outside the trusted base.
  FG24 has no counterpart: FG24 proves KI and soundness only.
- The nearest reference is BJKS24 Thm 2 (classical secrecy of the sent message and
  peer-authentication), which gets agreement on the `PQSPK` only if it is in the AD, or (Thm 6) if
  the KEM is SH-CR.
- libsignal's AD (`firstMsgAD = encodeEC ikA ‖ encodeEC ikB ‖ encodeEC ephAPk ‖ pqRatchetMsg`) omits
  the `PQSPK`, hence `KemShCr` in `pqxdhAuthBound`.
- Reference: BJKS24 Thms 2, 6; ours.

### DEV-PQ30

**Partnering by KDF inputs** · class: formalization · effect: none (argued, not proved)

- `keyIndPartner` matches an initiator and a responder session when they agree on every KDF input:
  identity, signed and one-time pre-keys modulo `pow8`, and the exact ephemeral key, `PQSPK` and KEM
  ciphertext. Key identifiers and other header bytes are ignored.
- Raw-byte equality on `kemCt` (`s.hdr.kemCt == r.hdr.kemCt`) and `pqspkPk`
  (`s.peerPqspkPk == r.pqspkPk`) compares fixed-width values (`kyberCtLen` and `kyberPkLen`):
  every accepted `kemCt` has length `kyberCtLen` (`Model.acceptKeys` length guard and
  `CryptoWellFormedPrimitivesδ.kemDecaps_len_reject`), and every encapsulated `pqspkB` has length
  `kyberPkLen` (`CryptoWellFormedPrimitivesδ.kemEncaps_len_reject`, with responder `pqspkPk` of
  length `kyberPkLen` by `kemKeyGen_valid`; see [DEV-PQ32](#dev-pq32)).
- FG24 partners by session identifier and checks `Sound`. No Lean lemma relates the two notions.
- Reference: FG24 §3 (sid, `Sound`).

### DEV-PQ31

**First-message MAC input (`firstMsgAD`, `aeadMacInput`)** · class: abstraction · effect: none
(honest messages); restricts the adversary's encodings and key lengths, and the primitives
(`pow8_base_len`)

- libsignal's first-message MAC (`SignalMessage::compute_mac`, `protocol.rs:214-235`) is
  `HMAC-SHA256(macKey, ser(ikA) ‖ ser(ikB) ‖ 0x44 ‖ prost(SignalMessage))` truncated to 8 bytes, with
  the `SignalMessage` fields `ratchet_key = 1`, `counter = 2`, `previous_counter = 3`,
  `ciphertext = 4`, `pq_ratchet = 5` (omitted if empty) and `addresses = 6`, in tag order.
- The model (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`) MACs
  `aeadMacInput (firstMsgAD ikA ikB ephAPk pq) ct`. `firstMsgAD` is
  `ser(ikA) ‖ ser(ikB) ‖ 0x44 ‖` fields 1-3 (`firstMsgHdrLen = 106` bytes for 32-byte keys)
  followed by field 5 if `pq ≠ []`. `aeadMacInput ad ct` inserts the ciphertext field 4 after the
  first `firstMsgHdrLen` bytes of `ad`, so the MAC input has prost's tag order `1, 2, 3, 4, 5`
  (`aeadMacInput_firstMsgAD`, `Computational/Proofs/SignalPqxdh/Security/AeadMacInputInj.lean`). It is the
  binary's byte string for every `pq`, except that `addresses = 6` is omitted: the model has no
  protocol addresses, and the driver passes `addresses = None`.
- **Machine-checked against the session layer.** `firstMsg_macInput_eq_aeadMacInput`
  (`Computational/Tests/Consistency/FirstMsgMacBridge.lean`) proves, for every ratchet key, ciphertext
  and `pq_ratchet` value, that `macIds sender receiver ‖ serializeContent protoSignalCodec 4 rk 0 0
  ct pq none` (the input of the session model's `computeMac`, which `computeMacSpec` ties to the
  binary's `compute_mac`) equals `aeadMacInput (firstMsgAD …) ct` on the same bytes.
- Every variable-length field is length-delimited, so the MAC input is injective on game associated
  data (`aeadMacInput_firstMsgAD_inj`), as it is in the binary.
- **Bob re-encodes (restricts the adversary's encodings).** Rust's `verify_mac` MACs the received
  bytes (`protocol.rs:166-171`). prost's decoder also accepts non-minimal varints, repeated fields
  (the last wins), any field order, unknown tags and a counter ≠ 0. The model's Bob instead
  rebuilds the canonical encoding with `counter = previous_counter = 0` from the parsed fields. So
  the adversary's wire encodings are restricted to the canonical prost encoding with
  `counter = previous_counter = 0`. This does not weaken the `PrfHmac` argument: the binary's MAC
  input is the received byte string itself, which is trivially injective.
- **EC key lengths.** Injectivity needs 32-byte `ikA`, `ikB` and `ephAPk`. `Model.acceptKeys`
  rejects `|ikAPk| ≠ 32` and `|ekAPk| ≠ 32`, and `Model.accept` rejects `|ephAPk| ≠ 32`. The
  `Auth` game's receive paths (`TwoKeyAndAuthStatements.lean`, `Reductions*.lean`) apply the same checks, and Bob's
  own `ikB` is honest (32 bytes, `x25519Base`). Rust's `PublicKey::deserialize` accepts trailing
  bytes and uses the first 32. The model rejects them instead (restricts the adversary).
- **Scope of the real code path.** Stock v0.105.4 creates sessions with SPQR `Version::V1`
  (`ratchet.rs:85`, DEV-PQ3), so a real first message has a non-empty `pq_ratchet`; the model's
  encoding covers it. On the real pre-key path `message_encrypt` passes `Some(local_address)`, and
  `addresses = 6` is set whenever both names parse as ServiceIds (`protocol.rs:91-92, 239-252`).
  Our driver passes `None`.
- `Computational/Tests/SignalPqxdh/SignalPqxdh.lean` (DEV-PQ31 section) checks that moving the first ciphertext block
  into `pqRatchetMsg` changes the MAC input and is rejected, and that the MAC input has field 4
  before field 5.
- Term 10 of `pqxdhAuthBound` (`Computational/Proofs/`, outside the trusted base), first-message ciphertext integrity, is
  `2 * (2 * N_sess_tot * epsPrfHmac + N_recv_tot / 2^64)`, charged to `PrfHmac`
  (PRF security of HMAC-SHA256 under a uniform 32-byte MAC key).
  `PqxdhAuthStatementWith` (`Computational/Proofs/`) evaluates it at
  `PrfHmac P (R.int b A)`, where `R.int = prfHmacReductionAuth S = prfHmacOfMu
  (aeadMuIntReductionAuth S b A)` (`Security/ReductionsAuthHmac.lean`). The multi-key INT-CTXT
  game `AeadMuIntCtxt` covers all `N_sess_tot` session keys at once (including KCI) in the standalone two-key `Auth` proof.
- Proof (`Computational/Proofs/SignalPqxdh/Security/AuthPrfHmac.lean`, `aeadMuIntCtxt_le_prfHmac`): a hybrid
  over key ranks replaces the HMAC of each key, one at a time, by a random function. Because the
  AEAD is Encrypt-then-MAC with an 8-byte truncated tag, once every tag is random each forgery
  attempt succeeds with probability at most `2^-64`. The tight form
  (`aeadMuIntCtxt_le_prfHmac_of_pow8BaseLen`) has factor `N_sess_tot`; the statement uses
  `2 * N_sess_tot`.
- The hybrid needs every forgery to be at a *fresh* MAC input: a forgery whose MAC input equals
  the challenge's of the same key would query the random function at an old point. Injectivity
  of the length-delimited encoding on good associated data (`aeadMacInput_firstMsgAD_inj`,
  `goodFirstMsgAD`) gives this: a forgery that differs from the challenge ciphertext or AD
  differs in MAC input. The reduction is shown to keep its MAC inputs within this discipline
  (`MacInputDisciplined'`).
- **`pow8_base_len` (restricts the primitives).** `CryptoWellFormedPrimitives.pow8_base_len`
  (`Assumptions.lean`): `P.pow8 p = P.pow8 (P.x25519Base e) → p.length = 32`. Without it, an
  adversary could register a non-32-byte (for example 33-byte) identity key whose `pow8` equals an
  honest key's. It passes the ideal-send check modulo `pow8` but puts a non-32-byte key into the
  challenge AD, outside `goodFirstMsgAD`, where MAC-input injectivity is not available. Real
  X25519 satisfies the law: `pow8` maps non-32-byte inputs to `0^32`, which is never the
  projection of a base-point output (order `ℓ`). The law is in `CryptoWellFormedPrimitives`, not
  `WellFormedPrimitives`, because the correctness witness `idealRoundtripPrimitives` (whose
  `pow8` pads or truncates) violates it. The witness `cwfPrimitives` (`Computational/Tests/SignalPqxdh/SignalPqxdh.lean`,
  with `cwfP8`, `cwfX`, `cwfDh`) satisfies it, so `CryptoWellFormedPrimitives` remains satisfiable
  (`cwfPrimitives_cryptoWellFormed`) with zero `sorryAx`. `x25519_pow8_congr` (`Model.lean`,
  `KemCorrect.lean`) requires `pk1.length = 32 → pk2.length = 32 →` (`pow8_base_len` unchanged)
  so that it remains compatible with `pow8_base_len` and `x25519_inj_pow8` when `x25519 a pk`
  truncates `pk` to 32 bytes (`u8Vec 32` in `pqxdhModelPrims`).

### DEV-PQ32

**Kyber-1024 ciphertext and public-key length rejection (`kyberCtLen`, `kyberPkLen`)** · class:
formalization · effect: `acceptKeys` and `kemEncaps` reject wrong-length inputs (matching libsignal; valid-length behaviour unchanged)

- Both `kyberCtLen = 1568` and `kyberPkLen = 1568` count raw Kyber-1024 bytes, excluding the `0x08`
  (`KeyType::Kyber1024`) key-type prefix byte added on wire serialization (`encodeKEM`).
- `Model.acceptKeys` (`LibsignalBinary/Specifications/SignalPqxdh/Model.lean`) and the standalone
  `Auth` game's `recvOPK` / `recvNoOPK` branches
  (`Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`) check
  `kemCt.length == kyberCtLen` (`1568`) before calling `kemDecaps`.
  `CryptoWellFormedPrimitivesδ` (`Computational/Specifications/Assumptions/KemCorrect.lean`) adds
  `kemDecaps_len_reject` (decapsulation returns `none` when `ct.length ≠ kyberCtLen`) and
  `kemEncaps_len_reject` (encapsulation returns `none` when `pk.length ≠ kyberPkLen`); both laws
  sit on `CryptoWellFormedPrimitivesδ` rather than `WellFormedPrimitivesδ` so session-layer
  correctness theorems (`PqxdhCorrect`) keep their hypotheses unchanged.
- `blockLevelPrims` (`LibsignalBinary/Specifications/LibsignalE2E/PqxdhModelLink.lean`), instantiated
  by `modelPrims`, returns `none` from `kemEncaps` when `pk.length ≠ kyberPkLen` and from
  `kemDecaps` when `ct.length ≠ kyberCtLen`, matching `PublicKey::deserialize` (`kem.rs:319-331`,
  `SignalProtocolError::BadKEMKeyLength`) and `SecretKey::decapsulate` / `Ciphertext::deserialize`
  (`kem.rs:372-384, 489-504`, `SignalProtocolError::BadKEMCiphertextLength`) in libsignal
  (`rust/protocol/src/kem.rs`). Valid-length inputs (`1568` raw bytes) behave identically.
- `kemShCrExp` (`Computational/Specifications/Assumptions/Assumptions.lean`) requires
  `ct'.length = kyberCtLen ∧ pk'.length = kyberPkLen` in its win condition, and `kemCcaSpec`
  (`Computational/Proofs/SpecLemmas/SignalPqxdh/Assumptions.lean`) rejects decryption queries with
  `ct.length ≠ kyberCtLen`. `WellFormedPrimitivesδ.kemKeyGen_valid` states the public- and
  secret-key output lengths (`kyberPkLen` and `3168`), with 32-byte encapsulation totality derived
  via `kemKeyGen_encaps_isSome` from `kemEncaps_isSome`.
- Reference: libsignal (`rust/protocol/src/kem.rs`); BJKS24 Def. 1.

## SPQR: the SPQR V1 binary statements

Homes: `LibsignalBinary/Specifications/LibsignalSpqrV1/Statements.lean`, `Entries.lean` (T).

- **Reference.** The SPQR interface of the triple-ratchet statements (`SpqrSendOk` / `SpqrRecvOk`,
  `spqrSendSpec` / `spqrRecvSpec` in `LibsignalTripleRatchet.lean`) and the compiled `spqr` 1.6.0
  in the libsignal v0.105.4 image. `SpqrSendV1Stmt` / `SpqrRecvV1Stmt` state `spqr::send` /
  `spqr::recv` against `spqrSendSpecT` / `spqrRecvSpecExactKeyBounded`, which are those specs with the
  conjuncts below.
- `Statements.lean` states the Triple Ratchet entry-point statements (`OtrEncryptV1RunStmt`,
  `TryDecryptV1RunStmt`, `RecordDecryptV1RunStmt`, proved in
  `LibsignalBinary/Proofs/TripleRatchet/Statements.lean`), and `Entries.lean` states the public-API
  entry-point specs (`encryptSpecBounded`, `decryptSignalSpecBounded`) and the store contract
  `loadSessionSpecPqStateLengthBound`. There is no public-API V1 run statement: the E2E chain consumes the
  untrusted `withStores_okVT` / `withStoresDec_okVT`
  (`LibsignalBinary/Proofs/Cli/PublicApi/{MessageEncrypt,MessageDecrypt}/WithStoresVT.lean`) directly. The
  CLI's PQXDH-mode statement `CliSpecPqxdh` (`LibsignalBinary/Specifications/SignalSession/PqDir.lean`)
  uses the same SPQR V1 model (`pqxdhSpqrSession W`) and is proved for the CLI's ELF, whose `spqr` code is in
  the image (DEV-PQ3).
- DEV-SPQR6 and DEV-SPQR7 are about the SPQR hypotheses in
  `LibsignalSpqrV1/MlKemCorrect.lean` and `Computational/Proofs/CryptoGames/Ratchet/LibsignalSpqrCorrect.lean`,
  not about the binary statements.

### DEV-SPQR1

**`TokenInit`: standalone SPQR V1 library statements frame `TokenInit` (closed in CLI ELF headlines via `Once::call` + `PMULL`)** · class: machine model ·
effect: out of scope (standalone SPQR V1 library statements) / closed (CLI ELF headlines, see DEV-CLI10)

- The standalone SPQR V1 library statements (`Statements.lean`, `Entries.lean`) and M4 Triple
  Ratchet / public-API entry-point specs (`otrEncryptSpecT`, `tryDecryptSpecT`, `recordDecryptSpecT`,
  `encryptSpecBounded`, `decryptSignalSpecBounded`) still frame `TokenInit img` (`Hooks.lean`) for
  the unaccelerated path.
- In the promoted CLI ELF headlines (`CliBinaryPq.lean`), every CLI call starts from plain
  `ElfImage.loadState (cliProcessInputs i)` with no initial `.data` patch and `AT_HWCAP = 0x1b`,
  runs SPQR's linked `Once::call` CPU probe (`use_accelerated::init` → `getauxval_hwcap` → musl
  `getauxval(AT_HWCAP)`), initializes `STORAGE.0 := 1#8` and `TOKEN.state := 0#32`, and executes
  `accelerated::mul2_unreduced` (`PMULL` 64-bit polynomial multiplication over GF(2)[X], proved
  equal to `unaccelerated.polyMul`; see [DEV-CLI10](#dev-cli10)).

### DEV-SPQR2

**`spqr::recv` can return the key `Some([])`, which `SpqrRecvOk` cannot express** · class:
libsignal · effect: hypothesis (downstream)

- In the version-negotiation `Greater` branch with `msg.index = 0`, `spqr::recv` returns
  `key = Some(vec![])` (spqr `src/lib.rs:401–419`); any peer can trigger it. `spqrSendKeyAt` lays out
  only `none` or a 32-byte key, so `SpqrRecvOk S` is false for every `S`, and the statements that
  assume it (`TryDecryptRunStmt`, the record-decrypt statement, `LibsignalPublicApi.lean`) are
  vacuous on non-empty SPQR states.
- The recv statement therefore targets `spqrRecvSpecExactKey`, whose key type is
  `Option (List (BitVec 8))`; it is a conservative extension of `spqrRecvSpec` (`rfl` lifting).
- Repair (M4), model only: `toSpqrModel.recv` / `recvPanicsSaltB` map the key with
  `recvKeyToSalt?` (`LibsignalSpqrV1/Top.lean`), which reads `Some([])` as no salt, so that case is
  `.ok (state, none)`, not an error and a panic. Under the decrypt precondition `SeedsLen32`
  (DEV-LS9) the HKDF salt `Some(&[])` gives the same keys as `None` (DEV-LS25).
- `spqrRecvResultAt` / `spqrRecvSpec` in `LibsignalTripleRatchet.lean` relax `Salt.none` via
  `spqrRecvKeyAt` to accept either the `None` niche or an allocated empty `Vec<u8>` (`len = 0`),
  bridged by `spqrRecvSpecXT_imp_spqrRecvSpec` (`Statements.lean`, `Assemble.lean`). The V1
  decrypt statements (`TryDecryptV1RunStmt`, `RecordDecryptV1RunStmt` in `Statements.lean`) cross
  `spqr::recv` with `SpqrRecvV1Stmt` through this bridge.

### DEV-SPQR3

**The serialized state is shorter than 2^32 bytes and the message shorter than 2^40** · class:
machine model · effect: restricts the adversary

- Without a bound a decoded structure could make `RawVec` growth hit `capacity_overflow`, a panic
  that no `onPanic` clause admits. The bounds match the triple-ratchet statements' size
  preconditions.
- The message bound follows from `signalMessageAt`. The M4 Triple Ratchet entry-point specs
  (`Statements.lean`) carry the state bound as a pure conjunct (`otrEncryptSpecT`,
  `tryDecryptSpecT`, `recordDecryptSpecT`); at the public entries the store's load contract
  supplies it (`RecordPqStateLengthBelow2Pow32` in `loadSessionSpecPqStateLengthBound`, `Entries.lean`).
- In `LibsignalBinary/Specifications/LibsignalE2E/PqxdhSessionModel.lean` (`O10`, see [DEV-PQ10](#dev-pq10)), both
  inductive step constructors `ReachablePqxdhSession.send` and `ReachablePqxdhSession.recv` carry the input-record bound
  `(encodeRecordUnderExtras (fun _ => x) g).length < 2^31` (which implies `s.alice.spqr.length < 2^32`). Because prost's protobuf
  length varints wrap modulo `2^64`, the SPQR V1 state invariant `ValidState` is only inductive
  across SPQR steps from states shorter than `2^64` bytes
  (`LibsignalBinary/Proofs/SignalSession/Cli/Run/Slots/PqValid.lean`: `validState_spqrV1_send`,
  `validState_spqrV1_recv`, `reachPq_validState`); guarding `ReachablePqxdhSession`'s steps with `< 2^31` makes
  `ValidState` inductive over `ReachablePqxdhSession`.

### DEV-SPQR4

**The recv stack does not wrap through address 0** · class: machine model · effect: w.l.o.g.,
argued

- `spqrRecvSpecExactKeyBounded` requires `spqrRecvStack ≤ sp`. `spqr::recv` passes a stack address as an
  `Option<&VersionNegotiation>` that `chain_from` reads as `None` when it is 0; without the bound
  the precondition admits that `sp`. The decrypt caller already has `rootStack = 2^18 ≤ sp`.

### DEV-SPQR5

**`spqr::send` has at least 64 random-tape bytes** · class: machine model · effect: w.l.o.g.,
argued

- `spqrSendSpecT` requires `64 ≤ x.rest.length`. On a short tape the RNG hook zero-pads and the
  binary returns `Ok`, while the model reports `rngExhausted`. One `spqr::send` draws at most 64
  bytes, so the bound makes `rngExhausted` unreachable. A real RNG never runs short. The M4
  encrypt specs (`otrEncryptSpecT` in `Statements.lean`, `encryptSpecBounded` in `Entries.lean`) require
  the same bound on the whole remaining tape, which is `spqr::send`'s coins.
- In the CLI's PQXDH mode (`CliSpecPqxdh`, `LibsignalBinary/Specifications/SignalSession/PqDir.lean`)
  the `coins` file of `init` has `initiateTapeLen = 192` bytes (`PqxdhInputs.lean`) and that of
  `send` has 64 bytes, so a short tape is outside the specs.

### DEV-SPQR6

**ML-KEM-768 δ-correctness is a hypothesis, and the ct side's key check is part of the event** ·
class: formalization · effect: hypothesis

- `MlKem.lean` treats libcrux ML-KEM-768 as uninterpreted functions and assumes nothing about them.
  A theorem that needs ML-KEM correctness takes `K.CorrectWith δ` (`MlKemCorrect.lean`): one
  honest exchange (`MlKem.honestExchangeFails`: `generate`, `encaps1`, the ct side's key check
  `ek_matches_header`, `encaps2` with the libcrux issue-1275 fix-up, `decaps`) fails with
  probability at most `δ` over a uniform 64-byte keygen seed and uniform 32-byte `m`.
- The key check is part of the event: if `Ct1Sent::recv_ek` rejects the honest `ek`, the exchange
  fails. An honestly generated key pair passes it, so FIPS 203's bound covers the case. Any wrapper
  error also counts as a failure (conservative).
- For real libcrux the intended instance is `K.CorrectWith (2^-164.8)` (FIPS 203 §3.2, Table 1),
  a heuristic bound (SHA3 / SHAKE as random functions), cited and not proved. That the incremental
  API composes to FIPS 203's `KeyGen_internal` / `Encaps_internal` / `Decaps_internal` rests on
  code reading (the module docstring). Sanity facts: `MlKemCorrectFacts.lean` (`δ = 1` holds for
  every `K`; `δ = 0` holds for an idealized `K`).

### DEV-SPQR7

**SPQR-on correctness is demanded only inside SPQR's own window** · class: libsignal · effect:
restricts the adversary (correctness game only)

- `Corr.libsignal_corr` assumes `SpqrOffCorrect` (every SPQR receiver state accepts every sent
  message, DEV-LS24), which real SPQR does not satisfy. The SPQR-on statement
  `Corr.libsignal_corr_spqr` drops it and demands correctness only for records in
  `mustLibsignalSpqr` = `mustLibsignal` (the Double Ratchet window, DEV-SM5) and `spqrWindowOk`
  (SPQR's chain window, `spqr/src/chain.rs`): for header `(E, i)` with `E ≥ 1`, the receiver's
  largest send epoch is at most `E + 1` (SPQR keeps one chain epoch before its send epoch,
  `chain.rs:390–414`), `1 ≤ i`, the index is neither the current counter nor more than 25,000 ahead
  of it nor more than 2,000 behind it (libsignal's `spqr_chain_params`, `ratchet.rs:27–38`), and
  `(E, i)` was not received before. Each condition is tagged Exact or Conservative in
  `spqrWindowOk`'s docstring.
- The window needs the receiver's SPQR history, which neither the session state nor the game state
  records. So the statement is about `libsignalSessionScheme P.withSpqrLog`, whose SPQR state carries a ghost
  log (`Spqr.withLog`); the log never feeds back into the SPQR state or any output.
  `LibsignalSpqrCorrectFacts.lean` checks that `withLog` projects to the original SPQR and that
  `withSpqrLog` changes only `spqr`. `LibsignalSpqrLogProjection.lean` proves the projection for
  the session scheme `libsignalSessionScheme` itself, for all four fields (`initA`, `initB`, `send`,
  `receive`).
- SPQR's own correctness is the hypothesis `Corr.SpqrHonestCorrect S q ε`: in a game that runs only
  SPQR on honest traffic with an adversarial schedule (`Corr.spqrGame`), an in-window message that
  is rejected, any honest message (in the window or not) accepted with a salt different from the
  sender's, or a failed send has probability at most `ε`. Checked: `SpqrOffCorrect S →
  SpqrHonestCorrect S q 0`; sample honest schedules (in order, out of order, across epochs, a jump
  of exactly 25,000) are in the window; a replay, a jump of more than 25,000 indices, a key more
  than 2,000 behind and a message of a dropped chain epoch are not; `deliver-P` sets `win` on an
  accepted honest message with a wrong salt, in the window or not, and not on a rejection outside
  the window (`LibsignalSpqrCorrectFacts.lean`). For SPQR V1 the expected `ε` is `q · δ`
  (DEV-SPQR6); not proved.
- **An accepted honest message must return the sender's salt, in the window or not.**
  `Corr.spqrDeliverStep` sets `win` when SPQR accepts an honest message with a wrong salt, for
  either value of `commit` (a look-only receive counts). Reason: the session puts the salt of every
  receive that SPQR accepts into the message-key HKDF, also for a record outside SPQR's window, e.g.
  a record of an evicted Double Ratchet epoch, whose MAC is checked under a fresh DH step (the
  spurious step, DEV-LS11). If a wrong salt counted only inside the window, an `S` that is perfect
  inside the window but returns a history-dependent salt outside it would satisfy
  `SpqrHonestCorrect S q 0`. The adversary could then retry one evicted record after each of the
  receiver's sends within one DH epoch, with a fresh salt each time: about `q²/4` MAC trials,
  against the `q · qep` that `spuriousStepTerm` charges. An accepted spurious step desyncs
  the Double Ratchet, so a later in-window record fails.

  So the SPQR V1 bound on `SpqrHonestCorrect` (not proved) has to show that every **accepted**
  honest message returns the sender's salt, in the window or not, up to KEM failure. Argument:
  - An accepted header `(E, i)` gets `recv_key(E − 1, i)` (`lib.rs:462–467`).
  - The receiver's receive chain and the sender's send chain of an epoch take the same slice of the
    same HKDF output (`ced_for_direction` with opposite directions, `chain.rs:326–375`) and both
    step with `next_key_internal` (`chain.rs:229–246`).
  - So the key is the sender's whenever the epoch secrets agree; disagreement is a KEM failure,
    already in `q · δ`.

  The window does not enter this argument. It is also exact, so an accepted honest message is
  always in the window. Outside the window SPQR V1 errors:
  1. a dropped epoch is `EpochOutOfRange` (`chain.rs:384–385`);
  2. index `i = ctr` is `KeyAlreadyRequested` (`chain.rs:258–260`);
  3. a jump of more than 25,000 is `KeyJump` (`chain.rs:250–253`);
  4. more than 2,000 behind is `KeyTrimmed` (`chain.rs:192–195`);
  5. an index received before is `KeyAlreadyRequested` (`chain.rs:204–206`) or `KeyTrimmed`.

  The one conservative condition is `1 ≤ i`: header `(1, 0)` is accepted with the empty key
  (`chain.rs:417–418`), and at `E ≥ 2` index `0` is never stored. Honest messages never have
  `i = 0` (`next_key_internal` increments first, `chain.rs:231`).
- **The SPQR V1 bound needs `q + 2000 ≤ 2³²`.** SPQR's chain counters are `u32`, and an overflow
  panics: a send at counter `u32::MAX` (`chain.rs:231`), and a receive with `ctr + 2000 ≥ 2³²` or
  `at + 2000 ≥ 2³²` (`chain.rs:192, 266, 280`; `max_ooo_keys = MAX_MESSAGE_KEYS = 2000`,
  `ratchet.rs:35`, `consts.rs:9`). With at most `q` SPQR sends no counter overflows when
  `q + 2000 ≤ 2³²`. For larger `q`, `SpqrHonestCorrect` is false for SPQR V1: one party sends
  `2³² − 1999` times, delivered in order, and the last receive panics. So the hypothesis has no
  built-in bound on `q`, and an SPQR V1 instance of it carries `q + 2000 ≤ 2³²`. The composed
  statement then has that hypothesis, which implies `libsignal_corr_spqr`'s `q < 2³²`. The `u64`
  epoch counter (`chain.rs:361`) needs no hypothesis: each epoch needs at least one SPQR message, so
  the epoch is at most `q + 1`.
- The SPQR V1 instance is `spqrV1Session F K` (`LibsignalSpqrV1/Init.lean`): `init` is
  `spqr::initial_state` with libsignal's V1 parameters, while `SpqrModel.spqr` has the V0 empty
  state as `init`. `spqrV1Init` returns `[]` if `initial_state` fails, but it never does
  (`initialState_libsignal_ok`, `LibsignalBinary/Proofs/SpqrV1/InitFacts.lean`). The games sample
  coins with `SampleableType`, which `List (BitVec 8)` lacks, so the statements use
  `spqrV1SessionUniformCoins F K`: coins `r : BitVec 512`, used as the 64 RNG-tape bytes `coinBytes r`
  (little-endian). A V1 send reads at most 64 tape bytes: 64 for the ML-KEM key-generation seed
  (`incremental_mlkem768.rs:34–37`), 32 for `encaps1` (`:48–53`), none otherwise.

### DEV-KFF1

**Chosen-coin ML-KEM-768 decapsulation failure (`KemFailFind`, `kemFailFindAdvantage`)** · class:
formalization · effect: adds a term (decision-C SPQR V1 security bound only)

- **Why a separate chosen-coin KEM failure term is needed (`LibsignalBinary/Specifications/LibsignalSpqrV1/KemFailFind.lean`).**
  In the ACD19 / SM security game (`LibsignalBinary/Specifications/CryptoGames/SM/Game.lean`), the adversary can pass chosen send coins
  `r = some rq` (`rq : BitVec 512`) to `transmit-P` and `chall-P` (`DEV-LS1`), which SPQR V1 uses as
  the 64-byte ML-KEM-768 key-generation seed (`generate`) or 32-byte encapsulation randomness
  (`encaps1` / `encaps2`) during honest braid steps before any injection occurs.
  Whereas `K.CorrectWith δ` (`DEV-SPQR6`) bounds the decapsulation failure probability of an exchange
  where **both** the key-generation seed and encapsulation coins are uniformly sampled (`(q : ℝ≥0∞) * δ`),
  a statistical `q · δ` bound is **unsound** when one or both coins are adversary-chosen: if a
  failing `(seed, m)` pair exists (`honestExchangeFails K seed m = true`), an unbounded or preprocessing
  adversary could hardcode those coins into `transmit-P (some rq)` and cause an honest-braid SPQR V1
  epoch secret mismatch with probability `1`.
- **Send-coin scope.** The ACD19 / SM security game allows adversary-chosen send coins `r = some rq` on
  `transmit-P` and `chall-P` throughout the Double Ratchet security games (`DEV-LS1`, `DEV-CKA11`).
- **Explicit-reduction (Rogaway human-ignorance) formulation (`K.kemFailFindAdvantage`).**
  `KemFailFind.lean` defines the single-query search game `K.kemFailFindGame` (with adversary type
  `MlKem.KemFailFindAdversary := Unit → Option (BitVec 512 × BitVec 256)`, winning when `K.honestExchangeFails seed m = true`)
  and its costed `ReductionDsl` counterpart `K.kemFailFindAdvantage A` (`simOps`, `kemFailIface`,
  `simCodec` in `Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/CostedTables.lean`). Whenever an adversary causes an honest-braid
  ML-KEM-768 exchange (whether with adversary-chosen or uniform coins) to fail decapsulation in
  `hiddenSaltGame`, the concrete `ReductionDsl.CostedReduction` reduction `LibsignalSim.kemFailRedProg`
  (`Computational/Proofs/Game/PromotedCostedReds/KemFailRedLoopAndCost.lean`, over the tables in
  `Computational/Proofs/SpecLemmas/Session/ACD19/Ratchet/CostedTables.lean` and evaluation/cost proofs in
  `Computational/Proofs/ReductionDsl/Ratchet/LibsignalSimDF.lean`, running in time `L = 2 * q + 2` and step clamp
  `B = 2 ^ 32`) extracts the failing `(seed, m)` pair from the transcript and wins
  `kemFailFindGame`.
- **Two-way trade-off with [DEV-SPQR2](#dev-spqr2).** Because `spqr::recv` accepts version-negotiation
  and out-of-order messages (mapping `Some([])` to `none` via `recvKeyToSalt?`, DEV-SPQR2), an
  honest-braid KEM decapsulation failure desynchronizes the sender's and receiver's SPQR epoch secrets
  without aborting the session, allowing a subsequent honest wire to be accepted with a mismatched
  SPQR salt (`hiddenSaltGame`). Bounding `hiddenSaltTerm` on `spqrV1SessionUniformCoins` in
  `hiddenSaltBoundV1` / `hiddenSaltMixtureBound`
  (`Computational/Specifications/Session/StatementComposed.lean`, [DEV-C14](#dev-c14)) therefore adds `K.kemFailFindAdvantage` on
  `LibsignalSim.kemFailRedProg`.

## C: the composed PQXDH + Double Ratchet game

Homes: `Computational/Specifications/Session/StatementSession.lean` (T),
`Computational/Specifications/Session/StatementComposed.lean` (T),
`Computational/Specifications/Composition/StatementModel.lean` (T),
`Computational/Specifications/Game/ModelIface.lean` (T),
`Computational/Specifications/Game/StatementBinaryHarnessCore.lean` (T),
`Computational/Proofs/SpecLemmas/Game/StatementBinaryHarnessCore.lean`,
`Computational/Specifications/Game/StatementPq.lean` (T),
`Computational/Specifications/LibsignalCli/StatementPqElf.lean` (T),
`Computational/Proofs/LibsignalCli/StatementPqSecure.lean`,
`Computational/Proofs/SpecLemmas/Reductions/E2E/CompositionCostedTables.lean`,
`Computational/Specifications/Reductions/Pqxdh/StatementPqReds.lean` (T),
`Computational/Proofs/SpecLemmas/Reductions/E2E/CostedTables.lean`,
`Computational/Proofs/SpecLemmas/Session/StatementComposed.lean`,
`Computational/Proofs/E2E/HeadlineComposed.lean`,
`Computational/Proofs/HeadlineV1/HiddenSaltLazyFirstNEHeadline.lean`,
`Computational/Proofs/LibsignalCli/HeadlineSession.lean`,
`Computational/Proofs/LibsignalCli/HeadlineModel.lean`.

- **Reference.** Ours. FG24 §4 notes that PQXDH leaves the ratchets unchanged and proves no
  composition, and BJKS24 does not compose either.
- At the model level, single-session security and multi-session composition are stated separately by
  `SessionSecure` (`Computational/Specifications/Session/StatementSession.lean`, using the shared
  session bound `uniformStartMixtureBound` and costed reduction bundles of
  `Computational/Specifications/Session/StatementComposed.lean`) and `ModelSecure`
  (`Computational/Specifications/Composition/StatementModel.lean`), composing any handshake `ki`
  satisfying the lazy-sampling condition `hLazyEq`
  (`Computational/Proofs/SpecLemmas/Composition/ModelLazyCond.lean`) with up to `qStart` promoted
  Double Ratchet + SPQR V1 sessions (`spqrV1SessionUniformCoins C.F K`) in `modelIface`
  (`Computational/Specifications/Game/ModelIface.lean`) via a two-stage prefix-creation hybrid over
  the `qStart` created DR instances (`CompositionCostedReductions`, `bhPrefixFullBoundMixV1With` in
  `Computational/Specifications/Reductions/Pqxdh/StatementPqReds.lean`).
- **Verification status:**
  Lemma 2 (`CryptoVerification.E2E.session_secure : SessionSecure (Pt := Pt) ℓ` in
  `Computational/Theorems/Lemmas.lean`, proved by `session_secure_proof` in
  `Computational/Proofs/LibsignalCli/HeadlineSession.lean`) and Lemma 3
  (`CryptoVerification.E2E.model_secure_costed : ModelSecure (Pt := Pt) S ℓ` in
  `Computational/Theorems/Lemmas.lean`, proved by `model_secure_costed_proof` in
  `Computational/Proofs/LibsignalCli/HeadlineModel.lean`) and the compiled-binary Main Theorem
  (`CryptoVerification.LibsignalCli.libsignal_cli_pq_secure_elf_binary :
  CliPqxdhBinaryCorrectAndSecure cliElfBytes` in
  `Computational/Theorems/Main.lean`, proved from Lemmas 1–4 via `main_of_lemmas` in
  `Computational/Proofs/LibsignalCli/MainOfLemmas.lean` and
  `Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean`) are **proved unconditionally** with no
  open hypotheses (depending only on `propext`, `Classical.choice`, and `Quot.sound`). In particular, the
  session-level hidden-salt interface `HiddenSaltBoundV1HoldsEx ℓ`
  (`Computational/Proofs/E2E/HeadlineComposed.lean`) is proved with no open hypotheses by
  `hiddenSaltBoundV1HoldsEx` and `hiddenSaltTerm_le_hiddenSaltBoundV1` (at `v1SessionRedsPaper`) in
  `Computational/Proofs/HeadlineV1/HiddenSaltLazyFirstNEHeadline.lean`, combining
  `hiddenSaltTerm_le_add_spuriousStepTerm_v1_refuseCorrB0_lazy'`
  (`Computational/Proofs/HeadlineV1/HiddenSaltLazyFirstNESplit.lean`) with the `firstNE` cell-sum bound
  `sum_forgeGuessedAdvantageCellPaper_le_sum_hiddenSaltCellTermPaperDF` across `admissibleLastLeakGuesses 2 t`
  (proved from the per-cell reductions in `Computational/Proofs/HeadlineV1/DeliverForgeShifted.lean` and
  `Computational/Proofs/HeadlineV1/DeliverForgeDir2.lean`).
- `DEV-C1`–`DEV-C4` and `DEV-C7` are retired
  (see [Retired IDs](#retired-ids)).

### DEV-C5

**Unpartnered first-message payload privacy and authentication closed by the one-key `Auth` game in Lemma 1; modular model-level (`SessionSecure`, `ModelSecure`) and CLI binary-level (`Main.lean`) composition** · class: formalization · effect: scope

- **Closed: unpartnered first messages (one-key `Auth`).** Lemma 1 (`PqxdhCorrectAndSecureδ`)
  states, for every setup `S`, `PqxdhSecureδ S := PqxdhKeyIndSecureδ S ∧ PqxdhAuth1KeySecureδ S`.
  The second conjunct (`Computational/Specifications/Pqxdh/Security/Auth/Headline.lean`, game in
  `Computational/Specifications/Pqxdh/Security/Auth/Game.lean`) bounds the one-key first-message
  `Auth`/`FirstMsg` advantage `Auth1KeyAdvantage`: first pre-key message payload privacy (IND-CPA)
  and first-message (initiator→responder) authentication for **all** first messages, including
  unpartnered ones (pre-key messages that are not promoted into a session under `hdr == d.hdr`;
  [DEV-C11](#dev-c11)): the authentication win event fires when a responder accepts a first message
  for which there is no matching honest initiator send. The game
  uses libsignal's single Curve25519 identity scalar as both X25519 DH key and XEdDSA signing key
  (`pqxdhAuthImpl1Key`), so the earlier two-key-model restriction ([DEV-PQ13](#dev-pq13)) no longer
  applies to `Auth`. The two-key `Auth` bundle (`PqxdhAuthSecureδ` in
  `Computational/Proofs/SignalPqxdh/TwoKeyAndAuthStatements.lean`) is kept outside the trusted base.
  The composed / CLI headline theorems still do not fold the `Auth` conjunct into their statements.
- At the **model** level, Lemma 2 (`CryptoVerification.E2E.session_secure` in
  `Computational/Theorems/Lemmas.lean`, statement `SessionSecure` in
  `Computational/Specifications/Session/StatementSession.lean`, proved unconditionally by
  `session_secure_proof` in `Computational/Proofs/LibsignalCli/HeadlineSession.lean` from
  `hiddenSaltBoundV1HoldsEx` in `Computational/Proofs/HeadlineV1/HiddenSaltLazyFirstNEHeadline.lean`)
  bounds single-session `SM.gameR` bias on `sessionSchemeFixedSpk` running the concrete SPQR V1
  model `spqrV1SessionUniformCoins C.F K` (`LibsignalBinary/Specifications/LibsignalSpqrV1/Init.lean`)
  over arbitrary stage-1 context/adversary mixtures `oa` under decision C
  (`Refine.libsignal_refines_C`, [DEV-LS36](#dev-ls36), [DEV-KFF1](#dev-kff1)). Lemma 3
  (`CryptoVerification.E2E.model_secure_costed` in `Computational/Theorems/Lemmas.lean`, statement
  `ModelSecure` in `Computational/Specifications/Composition/StatementModel.lean`, proved
  unconditionally by `model_secure_costed_proof` in
  `Computational/Proofs/LibsignalCli/HeadlineModel.lean`) composes any `KeyInd` handshake `ki`
  meeting `hLazyEq` with up to `qStart` concurrent promoted Double Ratchet + SPQR V1 sessions in
  `modelIface` (`Computational/Specifications/Game/ModelIface.lean`) via bounded-query two-stage
  prefix-step mixture reductions (`CompositionCostedReductions`), avoiding the
  `N_spk_tot * N_send_tot` slot-hybrid multiplicity.
- At the **binary** level, Lemmas 1–4 assemble into the CLI binary Main Theorem while the
  empty-SPQR SM-mode binary Double Ratchet statements ([DEV-M5](#dev-m5), [DEV-LS24](#dev-ls24))
  remain separate:
  - `CliSpecPqxdh` (`LibsignalBinary/Specifications/SignalSession/PqDir.lean`) gives functional
    correctness of the CLI's PQXDH-mode calls with SPQR V1 (`pqxdhSpqrSession W`), proved for the CLI's ELF
    by Lemma 4 `libsignal_cli_pq_binary_correct` (`Computational/Theorems/Main.lean`), up to an
    abort of a run in which an allocation fails (DEV-CLI15) or `SampleNTT` seed divergence (DEV-CLI22),
  - `LibsignalCliPqSecure` (`Computational/Proofs/LibsignalCli/StatementPqSecure.lean`) is the
    CLI's PQXDH-mode security statement, its clause 2 under `KeyIndRoGap` (DEV-CLI16), proved as
    `libsignalCliPqSecure_holds` (`Computational/Proofs/LibsignalCli/HeadlinePqCliClosed.lean`) and
    instantiated on the CLI's ELF at arbitrary `kemKeyGen` by
    `libsignal_cli_pq_secure_elf_binary_any_kem` (`Computational/Theorems/Main.lean`, statement in
    `StatementPqElfAnyKem.lean`, via `main_of_lemmas` in
    `Computational/Proofs/LibsignalCli/MainOfLemmas.lean`) and at concrete Round-3
    CRYSTALS-Kyber-1024 (`kyber1024KemKeyGen`, `δ_kem = ε + 1 / 2^112` under `KyberNoiseGap ε`,
    [DEV-PQ21](#dev-pq21)) by the Main Theorem `libsignal_cli_pq_secure_elf_binary`
    (`Computational/Theorems/Main.lean`, statement `CliPqxdhBinaryCorrectAndSecure` in
    `Computational/Specifications/LibsignalCli/StatementPqElf.lean`).

### DEV-C8

**The ratchet starts from the RO-keyed `DRKey` in the model-level composition** · class: formalization · effect: scope

- In `StatementComposed.lean` (`keySOf`, `drvImplWithSpqr`), each promoted Double Ratchet instance
  starts directly from the initiator session's 96-byte PQXDH `DRKey` (`rootKey`, `chainKey`, `pqrKey`)
  returned by `testSession sid` (together with freshly sampled Alice initial ratchet coins), where the
  PQXDH master KDF and first epoch-1 root KDF are modelled as random oracles in `KeyInd`
  (`DEV-PQ16`, `DEV-PQ26`). When `composedClean` holds, the PQXDH `KeyInd` hop replaces
  `(rootKey, chainKey, pqrKey)` with independent uniform 32-byte keys before handing them to
  `sessionSchemeFixedSpk` with `spqrV1SessionUniformCoins C.F K`.

### DEV-C9

**`startDR sid` requires exact-byte matches on the mirrored initiator session, principal `ikB`, and bundle `spkB`, and rejects duplicate `ekAPk` headers** · class: formalization · effect: restricts the adversary

- The driver `drvImplWithSpqr` (`StatementComposed.lean`) maintains a transcript-only mirror
  (`DrvState`) of the principals, bundles, and initiator sessions returned by `KeyInd` oracles. On
  `startDR sid`, it promotes `sid` only if the mirrored initiator session, responder principal `ikB`,
  and responder bundle `spkB` match on exact bytes and no previously promoted session used the same
  ephemeral public key `ekAPk`; otherwise `startDR sid` returns `none` (refused).

### DEV-C10

**`startDR` reveals the bundle's `spkSk` via `revealSpkSk`, so sessions sharing that SPK cannot rely on the SPK-only freshness disjunct** · class: formalization · effect: restricts the adversary

- To run the promoted Double Ratchet instance in the leaked-SPK configuration `configRefuseEarlyBobCorr decT encT`
  (where Bob's initial ratchet key is his signed pre-key scalar `s`), `drvImplWithSpqr` obtains the
  responder bundle's signed-pre-key scalar coins `s` by querying `KeyInd`'s `revealSpkSk` oracle at
  `startDR sid`. Consequently, a promoted session (whose bundle's SPK secret has been revealed by
  `startDR`) is fresh only via the peer-IK-uncorrupted disjunct or the OPK-honest disjunct
  (`keyIndInitCorruptionClause`, `Game.lean:474-482`). In particular, a promoted session established
  without a one-time prekey loses forward secrecy against a later corruption of Bob's identity key
  (and `bhDrvGuard` / `bhE2EGuard` refuse `startDR sid` if `bnd.opkB?.isNone` and `u` was already
  corrupted before `startDR`, avoiding promoting a session already unfresh once `SPK_B` is revealed).
  There is no ephemeral or KEM disjunct in the classical (`-D DH`) game (`DEV-PQ19`).

### DEV-C11

**Post-promotion responder steps are handled by the DR instance's party `B`; Option (a) established/promoted-session scope (partnered `hdr == d.hdr` only)** · class: formalization · effect: restricts the adversary / scope

- Once `startDR sid` promotes an initiator session `sid` into DR instance `i`, all subsequent send,
  receive, challenge, and corruption queries for both Alice and Bob on that session go through DR
  instance `i` (`sessionSchemeFixedSpk (paramsIdsWithSpqr C spqr idA idB) ℓ s` in
  `configRefuseEarlyBobCorr decT encT`, with `noBobCorrWhileAliceBelowEpoch10` `DEV-LS34`).
- **Option (a) scope in the CLI PQXDH game (`cliPqExp`, `Computational/Specifications/Game/StatementPq.lean`):**
  It has these receive refusals
  (`cliStepLocalSM`, `cliPqReceive`), plus DEV-CLI13 and DEV-CLI14. The
  game models **established/promoted sessions only** (plus
  Bob's first pre-key receive carrying the promoted initiator session's own header `hdr == d.hdr` on
  an empty `SessionRecord`):
  1. **Pre-accept (`im.bobAccepted = false`):** Pre-accept `inject-B` is refused (`if !im.bobAccepted then return none` in `cliStepLocalSM`), and on `deliver-B` Bob's `SessionRecord` on promoted instance `i` accepts only a canonical tag-3 (`PreKeySignalMessage`) wire matching the byte-exact expected outer wire `c == wirePrekey :: (bhExpectedPreKeyMsg meA.regId sessionHdr m.inner).bytes` (with `gs.trans` unaligned so `SM.oracleImplR` checks `(gs.inTransit .A c).isSome` on the full outer wire `c`), executed as one CLI `recv` of `c` in Bob's directory (`cliPqReceive`, while `s.bytes.isEmpty || s.epochs.epoch == 0`). Any tag-3 wire with `hdr != d.hdr` is refused at the driver boundary before touching `SessionRecord`.
  2. **Post-accept (`im.bobAccepted = true`):** Once Bob has accepted his first pre-key message on
     promoted instance `i`, Bob's `SessionRecord` accepts: (i) whisper (tag-2, `2#8 :: inner`)
     messages on the established Double Ratchet session (one CLI `recv`, `cliPqReceive`), and
     (ii) canonical partnered tag-3 (`PreKeySignalMessage`) wires whose full decoded PQXDH header
     equals the promoted session's own header (`bhHdrOfPreKeyMsg m == bi.hdr` in `cliPqReceive`
     / `bhPartneredInnerBytes true` in `cliStepLocalSM`), which are delivered whole to one CLI
     `recv` that decrypts their inner `SignalMessage` on the existing Double Ratchet session
     (`pqRecvPrekeyModel` on a matching session, `PqDir.lean`) (matching `libsignal`'s
     epoch-0 initiator behavior where Alice continues wrapping outgoing messages in `PreKeySignalMessage`
     until receiving Bob's first reply, while Bob decrypts the inner `SignalMessage` on the existing
     promoted session without re-running `acceptKeys`). Any post-accept tag-3 wire with
     `bhHdrOfPreKeyMsg m != sessionHdr` (including second-session promotion `hdr.ekAPk != d.hdr.ekAPk`
     on a non-empty `SessionRecord`) is refused at the driver boundary (`DEV-LS28`).
  3. **Unpartnered first-message security ([DEV-C5](#dev-c5)):** Unpartnered first-message
     (initiator→responder) authentication and first-message payload IND-CPA across arbitrary responder pre-key
     accepts are covered at model level by the one-key `Auth` conjunct `PqxdhAuth1KeySecureδ` of
     Lemma 1 ([DEV-C5](#dev-c5), [DEV-PQ29](#dev-pq29)); they are not folded into the Main Theorem's
     CLI statement.

### DEV-C12

**`KeyInd.testSession` is withheld from the composed adversary** · class: formalization · effect: restricts the adversary

- In `composedExpWithSpqr` (`StatementComposed.lean`), the composed adversary has direct access to
  every `KeyInd` oracle except `testSession`. Instead, `drvImplWithSpqr` invokes `testSession sid`
  internally when promoting `sid` on `startDR sid`, using the returned `DRKey` (`rootKey`, `chainKey`,
  `pqrKey`) to initialize DR instance `i`.

### DEV-C13

**`ComposedBoundedPIWithSpqr` fixes static per-instance query budgets `qs` and the SPQR V1 braid `spqrV1SessionUniformCoins C.F K`** · class: formalization · effect: restricts the adversary

- `ComposedBoundedPIWithSpqr` (`StatementComposed.lean`) bounds the composed adversary by the PQXDH
  query budget `b : QueryBudget`, at most `qStart` promoted DR instances, and a static per-instance
  SM query budget `qs k` for each instance `k : Fin qStart`, running the
  concrete SPQR V1 braid `spqrV1SessionUniformCoins C.F K` (`Encaps1Total K`).

### DEV-C14

**Per-session query budget `2 * (qs k + 1) + 25002 < 2^32`, `qep²` epoch-guessing loss, and linear per-session MAC term (`(92 · qep + 96) · q · 2^-64`)** · class: formalization · effect: constants

- **Consolidated `u32` counter budget:** `SessionSecure`
  (`Computational/Specifications/Session/StatementSession.lean`, applied at `q = qs k` for each
  promoted session `k < qStart`) requires
  `_hq32 : 2 * (q + 1) + 25002 < 2 ^ 32` (`q ≤ 2^31 - 12503 = 2,147,471,145`), which simultaneously
  discharges SPQR V1's `u32` counter/window bound `q + 2000 ≤ 2^32` ([DEV-SPQR7](#dev-spqr7)),
  `q + 1 < 2^32`, and the simulator clamp budget `B = 2 ^ 32`.
- **Linear per-session MAC and spurious-step term (`(92 · qep + 96) · q · 2^-64` for `qep ≥ 1`, `112 · q · 2^-64` at `qep = 0`):**
  In `sessionAdvantageBound` (`StatementSession.lean`) and `uniformStartMixtureBound`,
  `fig8MixShortAuthV1`, `fig8MixShortPrivV1`, `fsAeadMixtureBound`, and `hiddenSaltMixtureBound`
  (`Computational/Specifications/Session/StatementComposed.lean`), hoisting non-honest decryption
  forgeries out of the `(t, j)` loop yields a per-session MAC-forgery and 8-byte tag-test
  contribution of `112 * q / 2^64` at `qep = 0` and `(92 * qep + 96) * q / 2^64` for `qep ≥ 1`
  (`(88 * qep + 88) * q * macForgeryProb` for `qep ≥ 1` and `104 * q * macForgeryProb` at `qep = 0`
  across `2 * fig8MixShortAuthV1`, `fig8MixShortPrivV1`, and `2 * hiddenSaltMixtureBound`, plus
  `(4 * qep + 8) * q / 2^64` collecting `4 * spuriousStepTerm = 4 * qep * q` across
  `2 * refineConst` and `2 * hiddenSaltMixtureBound`, `2 * forgedEpochStartSpuriousStepTerm = 2 * q`,
  `2 * q * eps0IdealUnit = 2 * q`, `2 * epoch0ChainForgeryTerm = 2 * q`, and
  `2 * spkSwapSpuriousStepTerm = 2 * q`; [DEV-LS11](#dev-ls11), [DEV-LS23](#dev-ls23),
  [DEV-LS31](#dev-ls31), [DEV-LS36](#dev-ls36)). At `q = 2^16 = 65,536` per session with `qep = 0`,
  this single-session contribution is `≈ 2^-41.19` (reaching `2^-32` only at `q = 38,347,923` for
  `qep = 0` or `q = 6,833` for `qep = q`).
- **Regime in which the summed MAC term stays below 1:** the headline bound adds this
  per-session term once per promoted session (`k < qStart`), so its total is
  `qStart · ours(qep, q) · 2^-64`, where `ours(qep, q)` is `112 · q` (`qep = 0`) or
  `(92 · qep + 96) · q` (`qep ≥ 1`), evaluated at
  `μ = 2^-64` (assuming truncated HMAC-SHA256 behaves like a uniform 8-byte tag on distinct
  inputs; see `macForgeryProb`):

  | promoted sessions | `q` per session | `qep` | summed MAC term |
  |---|---:|---:|---:|
  | `2^20` | 100 | 10 | `≈ 2^-27.37` |
  | `2^20` | 1,024 | 0 | `≈ 2^-27.19` |
  | `2^20` | 1,024 | 10 | `≈ 2^-24.01` |
  | `2^20` | 4,096 | 100 | `≈ 2^-18.82` |
  | `2^20` | 1,024 | 1,024 | `≈ 2^-17.47` |
  | `2^25` | 1,024 | 1,024 | `≈ 2^-12.47` |
  | 1 | 2,147,471,145 | 0 | `≈ 2^-26.19` (one session at the `_hq32` counter cap) |
  | 1 | 2,147,471,145 | 10 | `≈ 2^-23.01` (one session at the `_hq32` counter cap) |

  The summed term stays below 1 for up to `2^47.4` promoted sessions at `(q, qep) = (100, 10)`,
  `2^44.0` at `(1024, 10)`, `2^41.2` at `(2^16, 0)`, and `2^37.5` at `(1024, 1024)`. A single
  session reaches 1 at `q = 447,781,295` when `qep = q`, and stays below `2^-23.01` across the
  entire `_hq32` counter range `q ≤ 2,147,471,145` when `qep ≤ 10`, so the
  8-byte MAC term remains non-vacuous at multi-session deployment scale (`≈ 2^-12.47` across
  `2^25` sessions at `q = qep = 1,024`).
- **Incomparability with the earlier per-cell session bound:** The bucket-partitioned session
  statement (`SessionSecure`, and through `sessionAdvantageBound` / `uniformStartMixtureBound` the
  CLI headline `CliPqxdhSecurityFor` and Main Theorem `libsignal_cli_pq_secure_elf_binary`; `L1`
  `headlineδ` and `L3` `model_secure_costed` are unaffected) is **formally incomparable** with the
  earlier per-`(t, t_L, j)` cell bound—neither statement implies the other, so it is a trade-off
  rather than a pure tightening:
  - *MAC-forgery term (much smaller):* drops asymptotically from `O(qep² · q² · μ)` (`≈ 12 · qep² · q² · 2^-64`,
    e.g. `≈ 2^4.59` vacuous at `2^25` sessions with `q = qep = 1,024`) to `O(qep · q · μ)`
    (`(92 · qep + 96) · q · 2^-64` for `qep ≥ 1`, `≈ 2^-12.47` at the same point).
  - *Computational advantage term counts (mixed; PRF-PRNG and FS-AEAD grow):* CKA term counts shrink
    (`0.80×` at `q = qep = 1,024`, at most `0.95×` for `q ≥ 1`; authenticity and deliver-forgery CKA
    drop from quadratic to linear while privacy CKA doubles via `redCKAPrivU`), whereas PRF-PRNG term
    counts grow by up to **`1.95×`** (at `qep = 3, q = 1`; `1.60×` at `q = qep = 1,024`, limit `1.6×`)
    and per-session FS-AEAD slot-sum counts grow by up to **`1.74×`** for `q ≥ 1` (at `qep = 2, q = 1`;
    `1.34×` at `q = qep = 1,024`, limit `1.33×`; reaching `2.33×` at `q = 0, qep = 1`). Under a uniform
    per-primitive advantage bound `ε` shared across reductions meeting the cost and query budgets,
    the computational part grows by less than 1 bit for every `q ≥ 1`.
  - *Re-indexed and enlarged reduction family under `ratchetCostBudget q (qep + 1)`:* the
    existentially quantified family `D : SessionCostedReductionFamily` is re-indexed and adds
    `redCKAPrivU`, `B_cka_u`, `B_prng_u`, `B_fs_u`, `prgRedAuth`, and `multiRedAuth`, constrained
    under `ratchetCostBudget q (qep + 1)` (with `fsRatchetCostBudget (min (2 * q) (q + 2)) (qep + 1)`
    and `ratchetFsAdapterBudget (min (2 * q) (q + 2)) (qep + 1)` for `FsCostedReds`, the same budget
    functions of `(q, qep)`).

### DEV-C15

**Byte-exact identity pins on `KeyInd` handshake queries (`bhDrvAcceptIkOk`, `bhDrvInitiateIkOk`), and refusal of `revealDhSecrets` (`bhDrvKiQueryOk`)** · class: formalization · effect: restricts the adversary

- Home: `Computational/Specifications/Game/StatementBinaryHarnessCore.lean` (T): `bhDrvAcceptIkOk`. Users: the CLI PQXDH security game's driver
  (`Computational/Specifications/Game/StatementPq.lean`, `StatementPqReds.lean`).
- **Responder accepts.** `KeyInd` (`SignalPqxdh/Game.lean`) matches sender identity keys on
  `acceptOPK` / `acceptNoOPK` modulo the cofactor projection `P.pow8`. An 8-torsion twin
  `ikA' = ikA + T` (`T ∈ E[8] \ {0}`) of a mirrored honest principal's key therefore passes
  `KeyInd`'s checks and `Model.acceptKeys` and uses up the responder slot and Kyber replay tuple.
  The driver forwards a responder accept only if `hdr.ikAPk` is byte-equal to a mirrored principal
  key (`bhDrvAcceptIkOk`: `ds.prins.any (fun e => e.2 == hdr.ikAPk)`).
- **Initiations.** `initiateOPK` / `initiateNoOPK` also match `ikB` modulo `P.pow8`. The driver
  forwards them only if no mirrored principal key is a `pow8`-twin of the bundle's `ikB` without
  being byte-equal to it (`bhDrvInitiateIkOk`). The signed pre-key is not checked here: `startDR`
  checks it byte for byte (DEV-C9).
- **`revealDhSecrets`.** `bhDrvKiQueryOk` refuses it (and `testSession`, DEV-C12). It belongs only
  to the unclaimed HNDL games ([DEV-PQ19](#dev-pq19), [DEV-PQ23](#dev-pq23)); the model-level
  composed driver `drvKeyInd` (`StatementComposed.lean`) forwards it, so the driver's game is
  stricter there.

### DEV-C16

**Promoted-instance seeding (`R1`, `F2`), the `useRo` flag & the clause-2 idealization hypotheses (`M1`), self-session exclusion (`DEV-PQ11`, `DEV-LS28`), unpromoted-session scope, `ReductionDsl` E2E / adapter reduction packages (`e2eAdapterOps`, `CliAdapterCostBounded`, `SessionCostedReductionFamily`, `CompositionCostedReductionFamily`), and `modelPrims` `CryptoWellFormedPrimitivesδ` bridge (`F3`, `F4`)** · class: formalization · effect: restricts the adversary / scope

- **Promoted-instance seeding (`R1`, `F2`):** The CLI PQXDH game seeds no record: each record a party holds was
  written by its own `init` or its own first `recv` (`StatementPq.lean`).
- **Non-circular `ReductionDsl` E2E and adapter reduction packages (`CompositionCostedReductionFamily`, `CompositionCostedReductionFamilyBounded`, `CliAdapterCostBounded`, `SessionCostedReductionFamily`, `C7` / `R3`):**
  `CliPqxdhSecurityFor` (`Computational/Specifications/LibsignalCli/StatementPqElf.lean`, specialized
  with `exc? := some (CliReachesSampleNttStuckElf elf addrs)` by `CliPqxdhElfSecure` and
  with `exc? := none` by `LibsignalCliPqSecure`) quantifies
  existentially over four `ReductionDsl` packages:
  - `L_cli : CliToModelAdapterProg S ℓ decT encT` (`C2` / `R1`), a `ReductionDsl.CostedReduction` adapter over the
    32-byte block signature `atomicSig ℓ Pt`, single-step parsing/codec/public-transcript table
    `atomicAdapterOps ℓ decT encT` (zero secret-key, DH, KDF, or decrypt operations), `e2eBhAdapterIface S ℓ Pt`
    (`e2eAdapterIface`, `ReductionDsl.Samplers.empty`), and `e2eBhAdapterCodec S ℓ Pt` (`e2eAdapterCodec`, `codecCost = 64`,
    `Computational/Specifications/Reductions/ReductionDsl/{AtomicOps,TargetCodecs}.lean`), bounded unconditionally by
    `CliAdapterCostBounded` (`GRedBounded` with closed-form polynomial budget
    `bhAdapterCostBudget S b qStart qDR ℓ := 2 ^ 6 * (b.q_total + qStart + qDR + 1) * (2 * M_id + 56 * M_spk + 3 * M_opk + 2 * M_send + 2 * Nat.log 2 S.N_id + 8 * Nat.log 2 S.N_spk_tot + 2 * Nat.log 2 S.N_opk_tot + 2 * Nat.log 2 S.N_send_tot + 4 * qStart + 4 * ℓ + 2 ^ 12)`
    in `StatementBinaryHarnessCore.lean`, clamping dynamic key/session table sizes at `M_* = min b.q_total S.N_*`
    (`M_id`, `M_spk`, `M_opk`, `M_send`), and `1`-for-`1` query preservation `qTot → qTot` for every
    query family in `CliGameAdversaryPerInstanceBounded`).
  - `RK : KeyIndCostedReductionFamily S` bounded by `KeyIndCostedReductionBounds` (`stepCostBudget S b`
    in `CostedBudgets.lean`) and `KeyIndReductionQueryBounds` (evaluated at `b_ki := keyIndReductionBudget S qStart b`
    with `b_ki.q_total = b.q_total + 2 * min qStart S.N_send_tot` and `b_ki.q_on = b.q_on + 2 * min qStart S.N_send_tot` for the one-key
    random-oracle game `pqxdhKeyIndImpl1KeyRo` under `GapSigEufCma`, `KemShCr`, and `GapDhWithSign`).
  - `D : SessionCostedReductionFamily Pt ℓ` bounded by `SessionCostedReductionFamilyBounded` (reusing `SessionCostedReductions`,
    `spkCostedBounds` under `spkLeakRedUBudget q` and `spkHopBudget q qep ℓ` in `StatementSpkModel.lean`,
    `uniformStartMixtureBound`, and `fig8MixShortAuthV1`/`fig8MixShortPrivV1` on `Refine.libsignalToModularSchemeSim` directly from
    `StatementComposed.lean`, so the D4 closure includes `StatementComposed.lean`'s session-bound
    definitions rather than duplicating `BH`-prefixed copies).
  - `reds : CompositionCostedReductionFamily S ℓ P Wp.C Wp.Q.K qep decT encT`
    (instantiated at `Re := reds P Wp.C Wp.Q.K qep decT encT b qStart qDR (Finset.sup (Finset.range qStart) qs)`,
    `Computational/Specifications/Reductions/Pqxdh/StatementPqReds.lean`), a budget-indexed
    `(b, qStart, qDR, qInst) → CompositionCostedReductions` family at `ki := pqxdhKeyIndImpl1KeyReal S P`
    packaging the 1-stage `ReductionDsl.CostedReduction` reduction `kindRed` (to
    `e2eKeyIndTargetIface S ℓ Pt`, producing `advK` within `keyIndReductionBudget S qStart b`) and the 2-stage
    `ReductionDsl.TwoStageCostedReduction` reductions `prefixRed k` (to `e2eSessionTargetIface ℓ Pt`) over
    single-step `atomicE2EOps ℓ P Wp.C Wp.Q.K decT encT`, coin-only uniform `atomicBaseSamplers ℓ Pt`
    (`Computational/Tests/Guards/HeadlineSamplersGuard.lean`), and `e2eTargetGameCodec S ℓ Pt`
    (`e2eGameCodec`, `codecCost = 64`), bounded unconditionally for all `P` by
    `CompositionCostedReductionFamilyBounded` against
    `bhE2ECostBudget S b qStart qDR qInst qep ℓ := 2 ^ 10 * (b.q_total + qStart + qDR + 1) * (b.q_total + nOpk + nInst + qInst + Nat.log 2 qep + 10 * (nId + nSpk + nSend + nRecv) + maxForwardJumps + ℓ + 1) + 2 ^ 13 * nInst * (nId + nSpk + nRecv + 1)`
    (`StatementBinaryHarnessCore.lean`, clamping dynamic table sizes at `nId`, `nSpk`, `nOpk`, `nSend`, `nRecv` `= min b.q_total S.N_*`
    and `nInst := min qStart nSend`, with `qInst := Finset.sup (Finset.range qStart) qs` and the 25,000-step
    Double Ratchet and SPQR symmetric-chain skips unpacked into bounded `ReductionDsl` loops).
  - The CLI headline's reductions and cost budgets use the real-table-op costed forms
    (`CompositionCostedReductionFamily`, adapter arity `CliToModelAdapterProg S ℓ decT encT`, query
    bound `2·qTot`), replacing an earlier `CompositionCostedReductions … pqxdhKeyIndImpl1KeyReal`
    form (query bound `2·qTot+2`, `80·(…)·(qStart+1)` step budgets in the older cost model).
    Because the two cost models charge table operations differently, they are not directly
    comparable; no claim is made that either is weaker. The older form's extra point parameter `lam` of the prefix bound
    (`bhPrefixFullBoundMixV1With`) is gone: `main`'s costed bound has no such parameter.
- **The `useRo` flag, constant `secb := true`, and the clause-2 random-oracle hypothesis (`C3` / `R2` / `M1`):**
  The CLI PQXDH game runs `bhDrvKeyInd` at `useRo = false` (`cliDrvImpl`) and initializes the
  `KeyInd` state with constant `secb := true` (`SignalPqxdh.KeyIndState.empty S true`, as in
  `composedExpWithSpqr`); `LibsignalCliPqSecure`'s clause 2 assumes `KeyIndRoGap` (DEV-CLI16) to step
  from `pqxdhKeyIndImpl1KeyReal` (real `P.hkdfDerive96` on one-key identities, matching `bhDrvKeyInd`
  at `useRo = false`) to `pqxdhKeyIndImpl1KeyRo` (lazy random oracle `HkdfRO` on the same one-key
  identities), which Lemma 1 (`PqxdhKeyIndSecureδ`) bounds directly.
  In `bhDrvKeyInd`, when `useRo = false`, `.roQuery` and `initiate*`/`accept*` evaluate standard-model
  `P.hkdfDerive96` and `.initPrin` initializes each principal with a single identity key
  (`secIKAsign := secIKA0`, `ikSignPk := ikAPk`, so `.corruptIK` reveals `(secIKA0, secIKA0)`),
  whereas `useRo = true` in the standalone model-level composition evaluates `st.roCache` on two-key
  identities (`IkTwoKeyIdealisation`, [DEV-PQ13](#dev-pq13)).
- **Self-sessions excluded (`session_with_self`, `F2(a)`, [DEV-PQ11](#dev-pq11), [DEV-LS28](#dev-ls28)):**
  Stock `libsignal` supports note-to-self and same-account / linked-device sessions
  (`alice_identity == bob_identity`, `session_cipher.rs:285–290`, `ratchet.rs:277–281`,
  `SessionClosure.lean:802–805`) and exempts them (`session_with_self`) from the `counter > 25000`
  (`MAX_FORWARD_JUMPS`) message-keys window check. Consistent with [DEV-PQ11](#dev-pq11) and
  [DEV-LS28](#dev-ls28), `SessionState.takeRatchetState` (`LibsignalSession.lean:839–842`) fixes
  `self_session = false`, so `maxForwardJumps = 25000` is enforced unconditionally.
- **Forged inner `SignalMessage`s on partnered vs. unpromoted honest sessions (`F2(b)`):**
  - *What is counted:* On any promoted instance (`startDR sid` called), once Bob has accepted his first
    message (`im.bobAccepted = true`), a post-accept injection (either a tag-2 whisper wire or a
    partnered tag-3 wire `bhHdrOfPreKeyMsg m == bi.hdr`) carrying a forged inner `SignalMessage`
    (`!bhPartneredInTransitA true`) is routed by `cliStepLocalSM` to `SM.oracleImplR`'s `inject-B`
    oracle (one CLI `recv`, `cliPqReceive`) and counted in `gs.win` (`driverSomeInstanceWon`, bounded by the
    per-session Double Ratchet SM authenticity term in `bhPrefixFullBoundMixV1With`).
  - *What is not counted:* (1) Unpartnered tag-3 headers (`hdr != d.hdr`), which are refused at the
    driver boundary under Option (a) ([DEV-C11](#dev-c11); unpartnered first-message payload privacy
    and authentication are covered by Lemma 1's one-key `Auth` conjunct, [DEV-C5](#dev-c5)). (2) Pre-accept `inject-B`
    (`!im.bobAccepted`), which is refused at the driver boundary (`if !im.bobAccepted then return none`
    in `cliStepLocalSM`). (3) A forged inner
    `SignalMessage` attached to an honestly partnered PQXDH header `s.hdr` where the adversary never
    promotes `s.sid` via `startDR s.sid` (or injects `s.hdr` onto a *different* promoted instance `d'`
    with `d'.sid ≠ s.sid`).
  - *Why unpromoted-session exclusion is WLOG:* Double Ratchet receive queries (`inject-B` /
    `deliver-B`) exist **only** on promoted DR instances created by `startDR sid` (`KeyInd`'s
    `acceptOPK` / `acceptNoOPK` takes only a `HandshakeHdr`, never an inner `SignalMessage`,
    [DEV-C19](#dev-c19)).
- **`modelPrims` primitive bridge and machine-checked `CryptoWellFormedPrimitivesδ` (`normalizeExtras`, `ModelPrimsCryptoAssumptions`, `ModelPrimsWellFormedTargetV1`, `X25519SubgroupWitnessTargetV1`, `C8` / `R4` / `F3` / `F4`):**
  In `StatementBinaryHarnessCore.lean`, `ModelPrimsCryptoAssumptions` (with its 18-row
  `(T)/(D)/(C)` classification table) isolates the primitive laws needed to discharge
  `CryptoWellFormedPrimitivesδ (modelPrims X W)` directly (`ModelPrimsWellFormedTargetV1`), while
  `normalizeExtras W X` and `ModelPrimsGuardedAssumptions` provide the normalized-extras corollary
  `CryptoWellFormedPrimitivesδ (modelPrims (normalizeExtras W X) W)`.
  `_hP : SignalPqxdh.CryptoWellFormedPrimitivesδ (modelPrims X (peParamsWithK W K))`
  is a hypothesis of `LibsignalCliPqSecure` (`_hP`).

### DEV-C17

**Initiator-identity freshness at Bob's first accept, and no adversary `revealSpkSk` of the instance's own responder slot (`ModelDriverInstanceMeta`, `bhDrvInstClean`, `bhE2EDrvInstClean`)** · class: formalization · effect: restricts the adversary

- Home: `Computational/Specifications/Game/StatementBinaryHarnessCore.lean` (T): `ModelDriverInstanceMeta`. Users: the CLI PQXDH security game's driver
  (`Computational/Specifications/Game/StatementPq.lean`).
- In `SignalPqxdh/Game.lean` (`isKeyIndInitStillFresh`), an initiator session's freshness depends
  on the responder's keys and not on the initiator's own identity key `ikA`. In the responder's
  handshake (`Model.acceptKeys`), `dh1 = DH(spkB_sk, ikA)` is the only leg binding `ikA` when the
  adversary picks its own base key and encapsulates to Bob's public Kyber pre-key. An adversary
  that corrupts `ikA` (KCI on Bob) before Bob's first accept, or reveals Bob's signed pre-key, can
  forge a pre-key message under `ikA` that Bob accepts while Alice's session is still fresh
  (`DEV-PQ24`).
- The driver records per promoted instance whether Bob has accepted (`bobAccepted`) and whether
  `ikA` was corrupted at that moment (`ikACorrAtAccept`, set once by `bhMetaAfterSM`). Corrupting
  `ikA` after Bob's first accept sets nothing. `bhDrvMirror` prepends `(u, j)` to `revealedSpks`
  when the adversary queries `revealSpkSk u j`; the driver's own reveal at `startDR` (DEV-C10)
  does not.
- The check is per instance (replacing the earlier global `bhDrvClean` / `advRevealedSpk`
  gate flagged in Sam Schlesinger's review). `bhDrvInstClean ds i` (and `bhE2EDrvInstClean σ i` for
  the end-to-end driver, which reads the responder slot from `respPrin`/`respSpkIdx`) is false when
  instance `i` has no initiator principal, has `ikACorrAtAccept`, or its own responder slot is in
  `revealedSpks`. Only SM queries addressed to such an instance get the default answer
  (`bhSmDefaultWithSpqr`); other instances are unaffected. Revealing one signed pre-key therefore
  excludes only the sessions that used that pre-key; it does not stop the game for every session.

### DEV-C18

**State-dependent routing of tag-3 (`PreKeySignalMessage`) wire messages (`bhDecodePreKeyMsgE`, `cliPqReceive`, `cliStepLocalSM`) and post-accept in-transit inner-wire alignment in D4 (`bhWireInnerBytes`, `bhPartneredInnerBytes`, `bhAlignTransForBob`, `bhPartneredInTransitA`)** · class: formalization · effect: restricts the adversary / scope

- On Bob's first pre-key receive (a CLI `recv` with no session, B3.2(b) Case 1), `CliSpecPqxdh` gives
  the outcome of `pqRecvPrekeyModel` (`recvPrekeyState`). Once Bob's record is non-empty (`bobAccepted = true`, B3.2(b) Case 2),
  under Option (a) ([DEV-C11](#dev-c11)), Bob's `SessionRecord` accepts whisper (tag-2, `2#8 :: inner`)
  wires and partnered same-session tag-3 (`PreKeySignalMessage`) wires (`bhHdrOfPreKeyMsg m == sessionHdr`),
  both decrypted by one CLI `recv` (`cliPqReceive`), while refusing unpartnered tag-3 wires
  (`bhHdrOfPreKeyMsg m != sessionHdr`).
- The CLI PQXDH game's receive step (`cliPqReceive`, `cliRunStdSM`, `cliStepLocalSM`,
  `Computational/Specifications/Game/StatementPq.lean`) enforces this two-phase routing rule
  with `bhDecodePreKeyMsgE`, `bhHdrOfPreKeyMsg`, `bhPartneredInnerBytes`, `bhAlignTransForBob` and
  `bhPartneredInTransitA` (`StatementBinaryHarnessCore.lean`):
  - **Pre-accept (`bobAccepted = false`, Case 1):** pre-accept `inject-B` is refused (`none`); on
    `deliver-B`, a canonical tag-3 wire buffer `c` is accepted if and only if
    `c == wirePrekey :: (bhExpectedPreKeyMsg bi.meA.regId bi.hdr m.inner).bytes` (with `gs.trans` left
    unaligned by `bhAlignTransForBob false` so `SM.oracleImplR` checks byte-exact
    `(gs.inTransit .A c).isSome` on the outer wire `c`), and `c` is one CLI `recv` in Bob's directory
    (`cliPqReceive`). Any other wire returns `none`.
  - **Post-accept (`bobAccepted = true`, Case 2):** a canonical tag-3 (`PreKeySignalMessage`) wire `c`
    with `bhHdrOfPreKeyMsg m == bi.hdr` (and the length gate `cliPqLenOk`) is passed whole to one CLI
    `recv` (`cliPqReceive`; `cliRunStdSM` with `bhAlignTransForBob true` aligning any matching Alice in-transit record
    by inner `SignalMessage` bytes `bhWireInnerBytes r.ct == some inner`), while any tag-3 wire with
    `bhHdrOfPreKeyMsg m != bi.hdr` is refused (`none`; see [DEV-C11](#dev-c11)). Non-tag-3 whisper
    wires (`wireWhisper :: body`) are one CLI `recv` as well.
  - **Outer `PreKeySignalMessage` parse fidelity (`bhDecodePreKeyMsgE` vs `prost`):**
    1. *Why a binary-refinement outer decoder or `preKeyStoreEventsBytes` cannot be used directly:*
       `LibsignalSessionApi.lean` defines only `ProtoPreKeySignalMessage.encode` (no outer
       `PreKeySignalMessage` decoder exists in the binary refinement; only the inner `SignalMessage`
       has `protoSignalCodec.decode`). Moreover, `preKeyStoreEventsBytes (m : PreKeyMessageFields)`
       (`LibsignalBinary/Proofs/SpecLemmas/LibsignalE2E/PqxdhCorrectModelProofDefs.lean`) is a
       47-byte post-execution trace containing only `kpkId`, `spkId`, `baseKey`, and `opkId`
       (omitting the 1568-byte `kyberCt` and 32-byte `idPub`) and is emitted only after
       `session_recv_prekey` succeeds on an empty record, whereas the game must route `c` before
       invoking `SM.oracleImplR`. On the canonical domain `3#8 :: m.bytes`
       (`m : PreKeyMessageFields`, `PreKeyMessageFields.bytes`), `bhDecodePreKeyMsgE` is the exact
       left-inverse (by definition it returns `some m` only when `c == wirePrekey :: m.bytes`).
    2. *Concrete divergence classes `(a)–(e)` where the binary (`PreKeySignalMessage::try_from` +
       `prost`) may accept the outer wrapper while `bhDecodePreKeyMsgE` returns `none` (and
       `cliPqReceive` refuses `c`, paralleling `DEV-PQ31`):*
       - **(a) Version byte low nibble:** outer version byte `v` whose low nibble `≠ 4` (`libsignal`
         at `protocol.rs:441–452` checks only the high nibble `(v >> 4) == 4` and ignores the low
         nibble, whereas `PreKeyMessageFields.bytes` and `bhDecodePreKeyMsgE` require
         `v = versionByte 4 = 0x44`; `0x34` with `(v >> 4) = 3` is also rejected by
         `bhDecodePreKeyMsgE`).
       - **(b) Field ordering, unknown fields, and varints:** outer `PreKeySignalMessage` protobuf
         fields out of ascending field-number order (`1, 2, 3, 4, 5, 6, 7, 8`), unknown field tags
         skipped by `prost` (`skip_field`), non-minimal LEB128 varints on outer fields/lengths, or
         multi-byte field tags (`decode_varint_slice`).
       - **(c) Repeated fields:** repeated `bytes` fields (`base_key`, `identity_key`, `message`,
         `kyber_ciphertext`), which `prost`'s `bytes::merge` (`extend_from_slice`) appends across
         occurrences, and repeated `u32` fields (`pre_key_id`, `registration_id`,
         `signed_pre_key_id`, `kyber_pre_key_id`), where `prost` keeps the last value.
       - **(d) Overlong DJB key slices:** `base_key` (field 2) or `identity_key` (field 3) slices
         longer than 33 bytes (`PublicKey::deserialize` at `core/curve.rs:84–105` reads `0x05` plus
         the first 32 key bytes and ignores trailing bytes, whereas `bhParseDjbKeyField` and
         `PreKeyMessageFields` require length 33).
       - **(e) Kyber ciphertext field (field 8):** `libsignal` also checks
         `kyberBytes.length == 1569` starting with version byte `0x08` (`1568` ciphertext bytes),
         matching `bhParseKyberCtField` as written, except under **(c)** when the 1569 bytes are split
         across repeated field-8 entries that `bytes::merge` appends to 1569 bytes.
  - **Pre-accept in-transit inner-wire alignment, `bhInjOK` (`c.length ≤ stdinCapBytes` and `m.inner.length + 2048 < 2 ^ 32`), and tag-3 Alice receive refusal in `StatementBinaryHarnessCore.lean` (`bhInjOK`, `bhWireInnerBytes`, `bhPartneredInnerBytes`, `bhAlignTransForBob`, `bhPartneredInTransitA`, `cliRunStdSM`, `cliStepLocalSM`, `C4`, `C5`, `M-1`, `M-2`):**
    On `inject`, `bhInjOK` enforces
    `decide (c.length ≤ stdinCapBytes) && shortCiphertext c && decide (m.inner.length + 2048 < 2 ^ 32) && ratchetKeyAdmissible ...` on tag-3
    wires (`C5(a)`, WLOG because `shortCiphertext c` already caps `c.length < 2 ^ 30` so
    `m.inner.length + 2048 < 2 ^ 30 + 2048 < 2 ^ 32`). Because an adversary may re-wrap an honestly
    sent Alice `SignalMessage` `inner` inside a different partnered outer tag-3 wrapper prior to
    Bob's first accept (e.g., changing the unused outer `m.regId` field, or combining `Hdr_0` with
    `Body_1` pre-accept), `cliRunStdSM` aligns `gs.trans` on `deliver-B(c)` via
    `bhAlignTransForBob`: when `bhPartneredInnerBytes im.bobAccepted bi.hdr c = some inner`, it
    replaces `r.ct` with `c` on the first `.A` record in `gs.trans` satisfying
    `bhWireInnerBytes r.ct == some inner` before invoking `SM.oracleImplR` (so `SM.deliverR` passes
    the exact wire `c` to Bob's CLI `recv`, `cliPqReceive`), and afterward sets
    `gs'.trans := gs.trans.filter (fun rec => rec.pos != rMatched.pos)` on `some (.accepted ..)`
    and restores `gs'.trans := gs.trans` on any rejection. Symmetrically, on pre-accept partnered
    `inject-B(c)` (`C5(c)`), `cliStepLocalSM` refuses (`return none`) when
    `bhPartneredInTransitA im.bobAccepted bi.hdr c gs` holds (preventing an adversary from re-wrapping
    an in-transit Alice `inner` with a modified `m.regId` to bypass `SM.injectR`'s `inTransit`
    check). And on `deliver-A(c)` / `inject-A(c)`, `cliStepLocalSM` refuses any tag-3 wire
    (`C5(b)`): the CLI game refuses every input to Alice whose first byte is `3` before any call
    (DEV-CLI13).

### DEV-C19

**Responder `KeyInd.acceptOPK` / `acceptNoOPK` oracle vs. the CLI's pre-key `recv` (`bhDrvKeyInd` vs. `cliPqRecv`)** · class: formalization · effect: scope

- In the CLI PQXDH game (`cliPqExp`, `Computational/Specifications/Game/StatementPq.lean`),
  Bob's first pre-key receive (`deliver-B` / `inject-B` with `im.bobAccepted = false` and
  `hdr == bi.hdr`) on a promoted Double Ratchet instance is one CLI `recv` in Bob's directory, and
  the session record it writes becomes Bob's state for all later CLI calls.
- By contrast, the PQXDH `KeyInd` oracle's `.acceptOPK` and `.acceptNoOPK` queries (`bhDrvKeyInd`
  delegating to `pqxdhKeyIndImpl useRo S P_bin`) execute the pure model handshake
  `SignalPqxdh.Model.acceptKeys P_bin`: `KeyInd`'s `acceptOPK` / `acceptNoOPK` takes only a
  `HandshakeHdr` (without an inner `SignalMessage` ciphertext or `SessionRecord`) and returns only
  `.unitResp` / `.noneResp` while updating `KeyInd`'s responder session table `st.respSessions` and
  OPK/Kyber replay state. `CliSpecPqxdh` specifies Bob's `recv` of the pre-key message by the session
  model's responder handshake (`pqRecvPrekeyModel`, `LibsignalBinary/Specifications/SignalSession/PqDir.lean`).

### DEV-C20

**Bundle-consistent `startDR` promotion guard (`ModelDriverBase.bundles`, `ModelDriverBase.opks`, `bhBaseOpkOk`, `bhDrvGuard`, `bhE2EGuard`, `CliToModelAdapterProg`)** · class: formalization · effect: restricts the adversary (WLOG argument, informal)

- In `StatementBinaryHarnessCore.lean` (used by the CLI PQXDH game), `bhBaseMirror` records `(bnd.spkB, bnd.pqspkB)` per `(u, j)` in
  `ModelDriverBase.bundles` on honest `.genSPK u j, .bundleResp bnd` responses, and `opkPk` per
  `(u, j, o)` in `ModelDriverBase.opks` on honest `.genOPK u j o, .pkResp opkPk` responses. The
  `startDR sid` promotion guards (`bhDrvGuard`, `bhE2EGuard`, and the `CliToModelAdapterProg`
  mirror-list promotion check over `e2eAdapterOps`)
  require that the initiator session's bundle `bnd` match the mirrored responder slot `(u, j)` on
  both `(spkB, pqspkB)` and (when `bnd.opkB? = some (opkId, opkPk)`) the mirrored OPK at
  `(u, j, o)` (`bhBaseOpkOk`).
- `startDR` refuses sessions whose bundle mixes `pqspk`/`opk` across slots; real Bob's decapsulation
  would derive a different key, so no shared session exists (restricts the adversary, WLOG argument,
  informal).

## CLI: the `libsignal-cli` CLI statements

Homes: `LibsignalBinary/Specifications/SignalSession/` (T). These entries are about the specs of
the CLI's calls (`CliSpecE`, `CliSpecPqxdh`, `CliSpecPqxdhNoMatch`) against libsignal's behaviour on the CLI's directories;
the bound gets no term from them. The PQXDH directory spec (`PqDir.lean`) also stays inside
`DEV-C-PREV` (one current session, no previous ones), and its directories hold the replay state
that DEV-PQ8 left to the caller. DEV-CLI6 and DEV-CLI7 are about the CLI process rather than its
calls: they limit which runs of the binary, and on which systems, the composed `main` theorem covers. DEV-CLI13,
DEV-CLI14, DEV-CLI16 and DEV-CLI18 are about the CLI security game on PQXDH directories and its bound
(`Computational/Specifications/Game/StatementPq.lean`,
`Computational/Proofs/LibsignalCli/StatementPqSecure.lean`); DEV-CLI16 is the one entry of this
section that puts a term in a bound (DEV-CLI17, the excused-abort term, is retired; see Retired IDs).

### DEV-CLI1

**The SM game delivers the inner `SignalMessage` of a pre-key message** · class: libsignal · effect: none

- On the SM game's directories Alice's sends print `3 ‖ PreKeySignalMessage` until her first
  receive (the model records carry the unacknowledged flag). The receiver has no pre-keys and
  rejects that wire, so the CLI scheme takes field 4 (the `SignalMessage`, byte-equal to
  `session_send`'s output, measured on the v9 binary) as the ciphertext and calls `recv` with
  `2 ‖ SignalMessage`. The pre-key wrapper is a function of public fields and the `SignalMessage`.

### DEV-CLI2

**The SM spec covers `recv` of whisper messages only** · class: libsignal · effect: none

- `CliSpecE` says nothing about `recv` of input whose first byte is not `2` (the CLI would run
  `message_decrypt_prekey` on `3 ‖ …`). The CLI scheme only ever calls `recv` with `2 ‖` the
  game's ciphertext, so every input the game's delivery oracle passes is in the domain.

### DEV-CLI3

**Pre-key messages in prost's canonical encoding only** · class: libsignal · effect: out of scope

- `CliRecvPrekeyCorrect` (`PqStatement.lean`) covers `recv` of `3 ‖ m.bytes` for typed pre-key
  messages `m` (`PreKeyMessageFields.bytes`: the fields in `PreKeySignalMessage::new`'s order, each once).
  libsignal's parser (prost) also accepts other encodings of the same message (fields in any order,
  unknown fields, a repeated field whose last occurrence wins, trailing key bytes); measured on the
  v9 binary: of 53 variants of one pre-key message, 12 were accepted with the same output and files,
  3 with only the stored `remote_registration_id` different, 38 rejected. No claim about `recv` of a non-canonical
  pre-key message; a game that delivers adversarial pre-key messages must deliver them typed.

### DEV-CLI4

**The CLI's I/O does not fail except as specified** · class: machine model · effect: out of scope

- In the CLI statements (`CliBinaryPq.lean` / `CliRun.lean`), the CLI's four I/O functions (crate
  `libsignal-cli-io`, `cli/io/`: kept out of `libsignalSessionObj` and translated separately by
  `cli/io/translation.toml` into `SignalSessionIoPlacedObj`) are proved against bounded
  specifications over the engine's file system (with legacy hook contracts `writeFileHook` and
  `writeStdoutHook` in `CliRun.lean` and `readFileHook` and `readStdinHook` in `CliRunFixed.lean`
  retained outside the ELF-direct headline closure). All four compiled C-ABI musl paths in `lib1_0.o`
  execute directly on the stock ELF (0 non-panic external hooks, DEV-E7; `read_file` and `read_stdin` over
  `open`/`read`/`close`/`__errno_location`, de-hooked at F3 and proved in
  `LibsignalBinary/Proofs/SignalSession/CliIo/`; `write_file` and `write_stdout` over 0-allocation
  `open`/`write`/`close`/`__errno_location` loops with `O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC`
  mode `0o666`, `< 4096`-byte NUL-free stack path check before `open`, `EINTR` retry, `n == 0`
  treated as `Err`, `close` on every exit after `open`, and `EBADF` on closed `fd 1` treated as
  `Ok(())` matching `std`'s `handle_ebadf` and `read_stdin`, de-hooked at Stage B `14 → 0` and
  proved in `LibsignalBinary/Proofs/HookDischarge/CliIoFmt/`, DEV-CLI19) and fail only where
  modeled: a path of `cliPathMaxBytes = 4096` bytes or more (`ENAMETOOLONG`) or containing an
  interior NUL byte (checked on the stack without heap allocation before `openat` /
  `TraceEvent.fileChanged`), a path through a regular file (`ENOTDIR`), a missing parent on write
  (`ENOENT`), a directory where a file is expected (`EISDIR`), a regular file above `fileCapBytes`
  (`2^21`) on `read_file`, standard input above `stdinCapBytes` (`2^20`) on `read_stdin`, or an OOM
  abort on a read buffer (`ENOENT` maps to `Ok([])` on `read_file`, and `EBADF` on `fd 0` maps to
  `Ok(out)` in the C-ABI loop; see DEV-CLI21).
- On the stock ELF (0 non-panic external hooks, DEV-E7; proof-side `cliHookTablePlaced = []`), both `read_file` / `read_stdin` and
  `write_file` / `write_stdout` execute real musl `open`/`read`/`write`/`close` system calls in the
  linked code (only in the legacy hook table `cliHookTable` do `writeFileHook` / `writeStdoutHook`
  bypass file descriptors and system calls).
  A real kernel can also fail in other ways (`EMFILE`, `ENOSPC`, `EIO`, a short write, a full disk
  during the commit); the CLI then exits 2, possibly after a partial commit. On a non-empty
  `write_stdout` to a pipe whose reader has closed (after `Stores::commit` has written the party's
  files), the CLI is killed by `SIGPIPE` (signal `13`, shell status `141`, empty stderr) when
  `SIGPIPE` has its default disposition, and exits `2` on `EPIPE` (empty stderr) when `SIGPIPE` is
  inherited as ignored. No claim about such runs.
- Permission bits and ownership are not modelled (the engine's file system has no mode bits). Where Linux denies an access (`EACCES`, e.g. writing a mode-0444 file or into a mode-0555 directory as a non-root user), the specifications return `Ok` and change the file, while the real CLI exits 2 and changes nothing (observed under QEMU on static-musl builds, not on the pinned `cliElfBytes`). No claim about runs in which permissions deny an access the CLI makes.

### DEV-CLI6

**Only non-setuid runs** · class: machine model · effect: out of scope

- The engine's loader always starts the process in normal (not secure) mode: `AT_SECURE = 0` is a literal
  in `buildInitialStack`. `processInputs` keeps `AuxvConfig`'s defaults `uid = euid = gid = egid = 1000`
  ("non-setuid execution"). So musl's startup, which reads these auxv entries, is proved only for the path
  a normal run takes (all 596 instructions from `_start` to `main`).
- A setuid or setgid run of the binary is not covered. Covering it would need musl's secure-mode startup
  path and a named hypothesis on the auxv values. That hypothesis would not go into the image-init facts.

### DEV-CLI7

**Systems whose stack limit is below 8 MiB** · class: machine model · effect: out of scope

- `processInputs` (`Process.lean`) gives the CLI's process an 8 MiB stack (`stackSize := 8388608`)
  instead of the engine's default 128 KiB (`defaultStackSize`). 8 MiB is Linux's default `RLIMIT_STACK`
  (`_STK_LIM`). The engine maps the whole stack when it loads the process; Linux grows the stack on
  demand up to `RLIMIT_STACK`.
- The CLI's theorems cover systems with `RLIMIT_STACK` ≥ 8 MiB. With a lower limit, a run the theorems
  say exits could instead be killed by `SIGSEGV` when its stack passes the limit; no claim about such
  runs. (Linux also counts the environment strings and its own initial stack data against the limit;
  the engine's `envp` is empty.)

### DEV-CLI8

**The CLI's hooked I/O model omits real read `Vec`-growth allocations** · class: machine model · effect: out of scope

- Both the legacy hook-form I/O contracts (`CliRun.lean`: `writeFileHook` / `writeStdoutHook`, and
  `CliRunFixed.lean`: `readFileHook` / `readStdinHook`, all outside the placed headline closure after
  F3 and Stage B) and the compiled `libsignal-cli-io`
  crate (`cli/io/src/lib.rs`, Rust 1.98.1) enforce the same byte and path caps (`stdinCapBytes = 2^20`,
  `fileCapBytes = 2^21`, `cliPathMaxBytes = 4096` with no interior NUL; see DEV-CLI21), whereas at
  the legacy hook boundary the read hooks allocate only the bytes they return (`vecOk`'s exact-size
  block for a non-empty read, nothing for a write). In compiled `libsignal-cli-io` (all four functions
  executed directly on the stock ELF with 0 non-panic external hooks, DEV-E7):
  - Read side (`read_stdin`, `read_file`, de-hooked at F3 and proved against `SignalSessionIoPlacedObj` in
    `LibsignalBinary/Proofs/SignalSession/CliIo/`, DEV-CLI19):
    neither `std::io::BufReader` nor a heap `CString` is used; both read through a `4096`-B stack
    buffer (frames `4,224` B and `8,320` B with stack probes, plus `read_file`'s `4096`-B stack path
    buffer, allocating nothing on an empty read or rejected path) and grow their output `Vec<u8>` via
    `Vec::reserve_exact` on a verified doubling schedule (`4096 B .. 1 MiB` across 9 capacities for
    `read_stdin`, `4096 B .. 2 MiB` across 10 capacities for `read_file`, aborting via
    `handle_alloc_error` on OOM and freeing the buffer before returning `Err` above `1 MiB` / `2 MiB`).
  - Write side (`write_file`, `write_stdout`, linked in `lib1_0.o`, de-hooked at Stage B `14 → 0`, and
    proved in `LibsignalBinary/Proofs/HookDischarge/CliIoFmt/`, DEV-CLI19):
    both perform 0 heap allocations (`write_file` checks and NUL-terminates `< 4096`-byte paths on a
    `4096`-B stack buffer before `open` and loops on `write`/`close`; `write_stdout` loops directly on
    `write(1, …)` with no `LineWriter` buffer).
- At the legacy hook boundary (`cliHookTable`, outside the placed headlines), no claim is made about
  runs in which one of `read_stdin` / `read_file`'s extra `Vec`-growth or transient over-cap
  allocations fails where `vecOk`'s exact-size block fits. In the allocator-budget contracts
  (`LibsignalBinary/Heap/SpecBudget.lean`), `readFileName`, `readStdinName`, `writeFileName`, and
  `writeStdoutName` are all in `cliAllocNames` (`CLI-ATOMIC` dropped 2026-11-02).

### DEV-CLI10

**Pinned auxiliary vector (`AT_HWCAP = 0x1b`, `AT_HWCAP2 = 0`, `AT_RANDOM = 0^16`); plain `loadState` runs `aes` and SPQR CPU probes (ARMv8 hardware AES + `PMULL` GF(2¹⁶)) with LL/SC outline atomics (`LSE = 0`)** · class: machine model · effect: out of scope (ARMv8.1+ LSE / other `AT_HWCAP` values)

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T) (`CliRunsToElf` runs `cliProgElf addrs` directly from plain `elf.loadState (cliProcessInputs i)` with zero initial `.data` patches; legacy `cliTokenPatch` remains only in proof-side `CliBinaryTokenPatch.lean` / `CliProcessFixed.lean`), `LibsignalBinary/Specifications/SignalSession/CliProcess.lean` (T) (`cliProcessInputs`), `LibsignalBinary/Specifications/SignalSession/Process.lean` (T) (`processInputs`), and `arm64-semantics/Arm64/Trusted/Process/Loader.lean` (`AuxvConfig`).
- The pinned ELF links `std::sys::sync::once::futex::Once::call`, `cpufeatures::aarch64::getauxval_hwcap`, `__aarch64_cas4_acq`, `__aarch64_swp4_rel`, and musl `getauxval`. On the first `aes` 0.9.1 operation and the first SPQR GF(2¹⁶) operation, their runtime feature probes call `getauxval(AT_HWCAP)` against the initial stack auxiliary vector set up by `ElfImage.loadState` and read via `__libc.auxv` after musl's `__init_libc`; SPQR's `Once::call` runs `spqr::encoding::gf::check_accelerated::use_accelerated::init`, writing `STORAGE.0 := 1#8` and `TOKEN.state := 0#32` (`COMPLETE`) so GF(2¹⁶) multiplication takes `accelerated::mul2_unreduced` (`PMULL` 64-bit polynomial multiplication over GF(2)[X], proved equal to packed `unaccelerated.polyMul`).
- **Pinned auxv scope (not quantified over `hwcap`):** `processInputs` fixes the auxiliary vector to `AT_HWCAP = 0x1b#64` (`HWCAP_FP | HWCAP_ASIMD | HWCAP_AES | HWCAP_PMULL`, with bit 8 `ATOMICS/LSE = 0`), `AT_HWCAP2 = 0#64`, and `AT_RANDOM` = 16 zero bytes. This pins two runtime feature-dispatch choices in the verified run:
  1. Both `aes` 0.9.1 and SPQR 1.6.0 see `(AT_HWCAP & 0x18) != 0` and execute their ARMv8 Cryptographic Extension paths (`AESE`/`AESD`/`AESMC`/`AESIMC` and `PMULL`); CPUs without AES/PMULL (`AT_HWCAP = 0x3`) are not covered by the single-`hwcap` process input.
  2. During `.init_array` startup, `RUST_LSE_INIT::init_lse` calls `std_detect`, reads `AT_HWCAP`/`AT_HWCAP2`, sees `ATOMICS = 0`, and leaves the outline-atomics dispatch byte at `0`. Consequently, outline atomics (including `__aarch64_cas4_acq` / `__aarch64_swp4_rel` inside `Once::call`) take the LL/SC (`ldaxr`/`stlxr`) path in the verified run, whereas ARMv8.1+ CPUs with `ATOMICS` (bit 8) set take the LSE (`casa`/`swpal`) path.
- Also covers [DEV-M17](#dev-m17).

### DEV-CLI11

**After a pre-key `recv` over a session that does not match it is accepted, the session file and the party's later calls are not claimed (`CliSpecPqxdhNoMatch`)** · class: libsignal · effect: out of scope

- Home: `LibsignalBinary/Specifications/SignalSession/PqDirNoMatch.lean` (T): `CliSpecPqxdhNoMatch`,
  a conjunct of `CliPqxdhElfCorrect` (`CliBinaryPq.lean`).
- `CliSpecPqxdh` leaves out `recv` of a typed pre-key message `m` while the party holds a session that
  `m` does not match (`¬ PqSessionMatches`). `CliSpecPqxdhNoMatch` covers it: the run's exit code
  and stdout are those of `pqRecvPrekeyModel` on the same party state with no session, and so are
  its files at every path except the session file; on a reject or a panic the outcome is that
  model's exactly (exit `1` with every file unchanged, the session file included, or abort).
- Why the session file is excepted: on an accept, libsignal v0.105.4 (`process_prekey` →
  `promote_state`) archives the old session, with its unacknowledged pre-key message cleared, as the
  record's previous session, and the CLI writes that record. `encodeRecordUnderExtras` writes no previous
  sessions (`DEV-C-PREV`: one current session), so no `PqParty` encodes that file. Everything else
  of the call is the no-session call: the new session reads no field of the old one, and the inner
  message is decrypted with the new session only. `decrypt_message_with_record` never decrypts with
  the archived session: on an inner `SignalMessage` of the current version (4) a pre-key failure
  stops at once; on another version (e.g. legacy 3) both sessions are refused on the version (the
  archived one is decoded, then skipped without a trial decryption), so the call rejects.
- Effect: no claim about the bytes of the session file such a call writes, and no claim about any
  later call of that party on that directory, whose state is outside `PqxdhPartyInSpecDomain`. A game that uses the
  clause must exclude that party's calls and leaks of its session file until the file is deleted.
  Nothing is lost on a reject.
- Closing it needs records with previous sessions in `PqDir.lean` (the directory model of
  `DEV-C-PREV`'s gap), which would also cover `init` over an existing session.
- Status: decided: not claimed. A CLI claim about the session file's bytes after the overwrite and the party's later
  calls would be a separate statement next to `CliSpecPqxdhNoMatch` over the same inputs, and
  `CliSpecPqxdhNoMatch` would not change.

### DEV-CLI13

**Alice refuses every input whose first byte is `3` in the CLI game (`cliPqReceive`)** · class: formalization · effect: restricts the adversary

- Home: `Computational/Specifications/Game/StatementPq.lean` (T): `cliPqReceive`, the receive
  step of `cliPqExp`.
- In the CLI security game on PQXDH directories, a `recv` by Alice of an input whose first byte is
  `3` (a pre-key message, canonical or not) is refused without running the CLI.
- Why: `CliSpecPqxdh` covers `recv` of a typed pre-key message only with no session or a session that
  matches it (G2, DEV-C-PREV), and no non-canonical pre-key message (DEV-CLI3). Alice always holds
  the session her `init` wrote. The refusal keeps every call of the game inside `CliSpecPqxdh`'s domain.
- Effect: the adversary cannot have Alice process a pre-key message; honest Bob never sends one.
  In deployed libsignal such a message is rejected unless it carries Alice's own base
  key (she holds no pre-keys); the game makes no claim about these calls.

### DEV-CLI14

**Explicit length gate on `recv` in the CLI game (`cliPqLenOk`)** · class: formalization · effect: restricts the adversary

- Home: `Computational/Specifications/Game/StatementPq.lean` (T): `cliPqLenOk`, read by
  `cliPqReceive`, and `Computational/Specifications/Game/StatementBinaryHarnessCore.lean` (T):
  `bhInjOK`.
- A `recv` whose input is not shorter than `2^32` bytes, or is a canonical pre-key message whose
  inner message is not shorter than `2^32 - 2048` bytes, is refused without running the CLI
  (`cliPqLenOk`). On `inject`, input above `stdinCapBytes` (`2^20`, `Run.lean`) is refused before
  `receive` (`bhInjOK`): the binary exits `2`
  and writes nothing (DEV-CLI21); no honest delivery is affected for `ℓ < 10^6` (every honest
  ciphertext is `≤ 1,002,030 < 2^20`, `honest_send_ciphertext_le_stdinCap` in
  `Computational/Proofs/LibsignalCli/CliCapsCompleteness.lean`, under `hreach` — that the session is
  `ReachablePqxdhSession` — and `hm : m.length ≤ maxPlaintextBytes`); this removes only queries that
  were already refused with no state change: inject-replay of delivered honest ciphertexts
  (≤ 1,002,030 B) is unaffected; only adversarial wires in (2^20, 2^32) move from post-receive
  rejection to pre-receive refusal, at an adversary-known length, so advantage is unchanged.
- Why: these are `CliSpecPqxdh`'s bounds on `recv`; with the gate every call of the game is inside its
  domain syntactically, and `bhInjOK` drops injected wires above `stdinCapBytes` that `read_stdin`
  refuses before session decryption. The model game
  `SM.gameR … (configRefuseEarlyBobCorr decT encT)` (`Computational/Specifications/Composition/StatementModel.lean`)
  keeps the uncapped filter, so the adapter of the proof (`cliToModelAdapterProg`,
  `Computational/Proofs/E2E/Dsl/CliAdapterCosted.lean`) mirrors the refusal: it forwards an
  `inject` only when `c.length ≤ stdinCapBytes`, a test composed from the existing `bytesLen`
  operation. No `ReductionDsl` operation table changes, and `CliToModelAdapterProg` is unchanged (on
  train the same test sat in the adapter's own operation table).
- Effect: restricts the adversary, and only for large plaintext bounds `l` on `deliver`. The SM oracles take an
  injected input only under `bhInjOK`, which checks `c.length ≤ stdinCapBytes` (DEV-CLI21) together with the same
  `2^32` / `2^32 - 2048` bounds (DEV-M1, DEV-PQ10), so `cliPqLenOk`
  refuses no injected input that `bhInjOK` admits, and `bhInjOK` drops only injected inputs above
  `stdinCapBytes` where the CLI exits `2` and writes nothing anyway. A delivered input is an honest
  ciphertext in transit; for `l < 10^6` every honest ciphertext has length `≤ 1,002,030 < 2^20`
  (`stdinCapBytes`), so no honest delivery is refused and the gate changes nothing; above that,
  refusing an honest delivery only removes adversary actions.

### DEV-CLI15

**A run that reaches `.OutOfMemory` has no outcome (`run i = none`) and is excused in `CliPqxdhElfCorrect`** · class: formalization · effect: out of scope

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T): `CliReachesOOMElf`,
  the `.OutOfMemory` excuse of `CliPqxdhElfCorrect` (through `OutcomeOrExcusedAbort` in
  `CliSpecPqxdhOrExcusedAbort` / `CliSpecPqxdhNoMatchOrExcusedAbort`; for `SampleNTT` seed
  divergence see [DEV-CLI22](#dev-cli22)).
- On each input `i` that a clause of `CliSpecPqxdh` or `CliSpecPqxdhNoMatch` names, either the run
  terminates with that clause's exact outcome (`run i = some o`), or `run i = none` and `i` reaches
  `.OutOfMemory` (`CliReachesOOMElf elf addrs i`) or a non-terminating `libcrux_ml_kem`
  `SampleNTT` entry ([DEV-CLI22](#dev-cli22)).
- Why: an allocation exhausted at `brk` / `mmap` / `mprotect` / `mremap` stops at
  `s.status = .OutOfMemory` (`run i = none`).
- Effect: no claim about stdout or the files on an excused `run i = none` input. On the security
  side, `.OutOfMemory` is discharged unconditionally on `cliElfBytes` (DEV-CLI12, retired), so
  `CliPqxdhElfSecure` carries no `.OutOfMemory` premise and no allocation-failure term
  (its `exc?` counts only `SampleNTT` seed divergence, [DEV-CLI22](#dev-cli22)).
- **Retired with `AllocNeverFails` at Route B2: the fixed-address statements with no allocation premise.**
  - What they were: until Route B2, proof-side theorems over the fixed-address image (none of them a headline) stated Lemma 4 and the Main Theorem with no excused abort and no allocation premise (`libsignalCliPqSecureElfBinary`, `libsignalCliPqSecureElfBinary_of_main`, `cliElfBytes_pqElfSecure_of_main5`, and earlier fixed-image `libsignal_cli_pq_binary_correct` / `libsignal_cli_pq_secure_elf_binary` in `Computational/Proofs/LibsignalCli/ElfHeadlinePq.lean`).
  - Why retired: they rested on `AllocNeverFails`, the proof that no allocation fails for every `W` on the CLI ELF pinned before the Route B2 relink. They are retired with it.
  - What remains proved: the ELF-direct functional clauses and the PQ security bound.
    - ELF-direct headlines: Lemma 4 `libsignal_cli_pq_binary_correct` (up to `.OutOfMemory` and divergent `SampleNTT`, [DEV-CLI22](#dev-cli22)) and the Main Theorem `libsignal_cli_pq_secure_elf_binary` (its security clause has no `.OutOfMemory` premise since NOOM-CLOSE, and accounts for divergent `SampleNTT` via `withExcusedAbortTerm`, [DEV-CLI22](#dev-cli22)).
    - Fixed-address run: none on `main`. The proof-side `…Ext` ELF theorems (`libsignalCliPqBinaryCorrectExt_cliElf` and `libsignalCliPqSecureElfBinaryExt` under `CliAllocNeverFailsPqWith`, and `cliPqBinaryCorrectOomExt_cliElf_runs` up to an excused abort) were removed on the move to `main`.
  - What is lost: the conclusion that no allocation fails in Lemma 4.
    - ELF-direct headlines: NOOM-CLOSE and FD-RM S4 (`cliElf_noOOM_elf`, via `ElfNoOomPlacedInstK.cliElf_noOOM_of_parseK` with `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`, 0 premises) proved unconditionally, for `cliElfBytes`, that no PQXDH-mode run reaches `.OutOfMemory`; that removed the Main Theorem's `.OutOfMemory` premise (DEV-CLI12, retired). Removing `.OutOfMemory` from Lemma 4 is deferred.
    - Fixed-address run: no plan item proves it. `CliAllocNeverFailsPqWith` and `∀ W, CliPqxdhAllocNeverFails cliElfImage W` stay open.

### DEV-CLI16

**The CLI security bound keeps the real handshake's key-indistinguishability advantage (`KeyInd1KeyRealAdvantage`); its reduction to the one-key PQXDH bound takes the random-oracle step `KeyIndRoGap` (assumption 2 on the one-key game)** · class: formalization · effect: hypothesis

- Home: `Computational/Proofs/LibsignalCli/StatementPqSecure.lean`: `LibsignalCliPqSecure`;
  the real game is in `Computational/Specifications/Assumptions/KeyInd1KeyReal.lean` (Tier 2):
  `pqxdhKeyIndImpl1KeyReal`, `pqxdhKeyInd1KeyExpForHandshake`, `pqxdhKeyInd1KeyRealExp`,
  `KeyInd1KeyRealAdvantage`; the random-oracle one-key game and the hypothesis are in
  `Computational/Specifications/Assumptions/KeyInd1KeyRo.lean` (Tier 2): `pqxdhKeyIndImpl1KeyRo`,
  `KeyInd1KeyRoAdvantage`, `KeyIndRoGap`.
- The CLI runs libsignal's handshake: one Curve25519 identity key does both X25519 and XEdDSA, and
  the key derivation is HKDF-SHA256. Lemma 1 (`PqxdhCorrectAndSecureδ` / `PqxdhKeyIndSecureδ` in
  `HeadlineDelta.lean`) bounds `pqxdhKeyIndImpl1KeyRo`, which uses the same one-key identities and a
  random-oracle key derivation (`HkdfRO`, DEV-PQ14), under `GapSigEufCma`, `KemShCr`, and
  `GapDhWithSign`. `pqxdhKeyInd1KeyRealExp` runs the same experiment with the real key derivation
  `P.hkdfDerive96`, from the same empty state and with the same classical freshness check.
- Clause 1 of `LibsignalCliPqSecure` bounds the CLI game's advantage by
  `2 · KeyInd1KeyRealAdvantage advK`, plus the Double Ratchet + SPQR V1 prefix sum,
  plus `kemDecapsFailureTerm S δ_kem`. No theorem bounds `KeyInd1KeyRealAdvantage` in the standard
  model.
- Clause 2 assumes one hypothesis about `advK` on pure one-key key-indistinguishability games
  (`Computational/Specifications/Assumptions/KeyInd1KeyRo.lean`):
  - `KeyIndRoGap S P advK ε_ro`: the random-oracle step. In the one-key game, replacing the real
    key derivation `P.hkdfDerive96` by the lazily sampled random oracle `HkdfRO` (assumption 2,
    DEV-PQ14) costs at most `ε_ro`. The two games are one experiment (`pqxdhKeyInd1KeyExpForHandshake`) on
    two oracles, `pqxdhKeyIndImpl1KeyReal` and `pqxdhKeyIndImpl1KeyRo`, which differ only in the key
    derivation (`evalHkdfOrRo false` vs `true`, in `initiate*` / `accept*` and on `.roQuery`); guard
    `Computational/Tests/Guards/KeyInd1KeyRoGuard.lean`. This is the standard random-oracle
    modelling of HKDF that FG24 and BJKS24 use, and that Lemma 1 rests on. In the ROM it holds with
    `ε_ro = 0` by convention. It is **not** a theorem of the standard model and is not proved here.

  Under `KeyIndRoGap`, Lemma 1 replaces the `KeyInd` term by `2 · (pqxdhKeyIndAdvantageBoundActiveδ S b_ki.q_on … + ε_ro)`
  (`b_ki := keyIndReductionBudget S qStart b`).
- Why: `KeyIndRoGap` compares only one-key key-indistinguishability games, not whole CLI games.
- Effect: clause 1 keeps `KeyInd1KeyRealAdvantage`. Under `KeyIndRoGap`, clause 2 gives the
  one-key active-count PQXDH bound (`pqxdhKeyIndAdvantageBoundActiveδ S b_ki.q_on` under `GapSigEufCma`, `KemShCr`, and
  `GapDhWithSign`) plus `2 · ε_ro`, which vanishes at `ε_ro = 0` in the random-oracle model.
  Standalone SHA-512 random-oracle reductions from `GapDhWithSign` and `GapSigEufCma` to standalone
  `GapDH` under `XeddsaCurveLaws` live outside the trusted base in
  `Computational/Proofs/SignalPqxdh/XeddsaRom/` (see [DEV-PQ13](#dev-pq13)).
- Not done here (follow-ups, not scheduled):
  - replacing `KeyIndRoGap` by a standard-model argument: bound `KeyInd1KeyRealAdvantage` directly,
    with HKDF-SHA256 as a key derivation function / dual PRF on the Diffie-Hellman secrets (in the
    style of Krawczyk's HKDF analysis and PRF-ODH);
  - a random-oracle statement about the CLI's ELF itself: replace libsignal's HKDF calls in the
    binary (`hkdf` `extract` and `expand_multi_info`, both called by Alice's `HandshakeKeys::derive`
    and inlined in Bob's `Pqxdh::accept`) by trusted hooks that return a random function `H` of the
    PQXDH secrets and the reference HKDF on every other input, and prove the CLI's functional
    statements for every `H`. That would show that the binary uses its handshake key derivation
    only through `H`. With it, a CLI game that samples `H` would have a bound with no
    random-oracle-to-HKDF gap term. A bound on the real binary (real HKDF) would still need the step from the
    random oracle to HKDF.
- One-key random-oracle key indistinguishability in Lemma 1 is proved under the joint X25519/XEdDSA
  assumptions `GapSigEufCma` and `GapDhWithSign`, retiring an earlier unanalysed one-key residual
  `KeyIndOneKeyGap` (`ε_1k`, which cannot be bounded by a small primitive-independent quantity from
  separate black-box `GapDH` and `SigEufCma` alone — an argument, not a Lean theorem). The joint
  assumptions give the adversary an additional oracle in each gap game while eliminating the
  unbounded `ε_1k` term; neither clause implies the other.

### DEV-CLI18

**Retained party directories across `exit 0`, non-zero exit rollback, and `BinState` corruption projection** · class: formalization · effect: out of scope

- Home: `Computational/Specifications/Game/StatementPq.lean` (T): `CliPartyState`, `cliPqPartyPaths`,
  `cliPqPartyPathsOf`, `cliPqReadBack`, `cliPqDirInputs`, `Dir.cliPqAfter`, `cliOracleImplR`,
  `CliDriverState`; mirrored in `StatementPqOomGame.lean` (T).
- At `startDR`, Alice's initial directory (`pqInitInputs`) and Bob's initial directory
  (`cliPartyStateB0`, encoding `cliPqxdhDirBobBeforeAccept`) are seeded from the instance's `KeyInd`
  metadata, and Alice runs `init <Bob> bundle`. On every `exit 0` call (`init`, `send`, `recv`),
  `Dir.cliPqAfter` reads back all present files along `cliPqPartyPathsOf` (`cliPqReadBack` —
  `address`, `identity-key-pair`, `registration-id`, `identities/<peer>`, `sessions/<peer>`,
  `signed-pre-keys/*`, `one-time-pre-keys/*`, `one-time-kyber-pre-keys/*`, and interleaved
  `last-resort-kyber-pre-keys/<id>` and `<id>.base-keys`) into `CliPartyState.dir`, which is passed
  verbatim to that party's subsequent `send` and `recv` calls (`cliPqDirInputs`) without reaching
  back into `KeyInd` metadata.
- On `corr-P`, `cliOracleImplR` projects the leaked party state by `CliPartyState.bin : BinState`
  (`cliIface.St = BinState`): session corruption reveals `sessions/<peer>` and the harness epoch
  bookkeeping (matching `modelIface`'s `GhostState Bytes` session-state corruption surface), while
  long-term identity and pre-key secrets remain governed by `KeyInd` corruption queries.
- Under `CliSpecPqxdh` (`PqDir.lean`), every accepted CLI call writes `encodeDir W st'` along
  `cliPqPartyPathsOf`, so the retained-directory game has the exact same output distribution and
  advantage as a game that re-encodes non-session files from `KeyInd` metadata
  (`Computational/Proofs/LibsignalCli/CliPqRetainedDirEq.lean`); for an arbitrary `run : CliRun` (including
  in the OOM game after an excused abort), feeding back the actual directory snapshot strictly avoids
  silently repairing corrupted identity-pin, pre-key, or `.base-keys` replay-cache files between calls.
- On any non-zero exit (`exited c` with `c ≠ 0`, `aborted`, or `none`), `Dir.cliPqAfter` returns
  `none` and the caller's `CliPartyState` is unchanged (`Dir.cliPqInit` refuses `startDR`,
  `Dir.cliPqSend` returns `(s, [])`, `Dir.cliPqRecv` returns `none`):
  - Under `CliSpecPqxdh`, rejected inputs exit `1` without modifying any party file (`Stores::commit`
    runs only after cryptographic operations succeed).
  - Under `CliSpecPqxdhOrExcusedAbort` (`DEV-CLI15`), a run in which an allocation fails may abort;
    this excuse concerns only the correctness conjunct (Lemma 4). The Main Theorem's security clause
    has no allocation-failure term and no allocation premise (`DEV-CLI17` and `DEV-CLI12`, retired).
  - Mid-commit OS/I/O failures during `Stores::commit`'s sequential multi-file writes (`EMFILE`,
    `ENOSPC`, `EIO`, power loss) are out of scope of the hooked I/O model (`DEV-CLI4`); crash-atomic
    directory commit and partial-write recovery after non-zero exit are not modeled.

### DEV-CLI19

**`libsignal_cli_io` I/O de-hooked: `read_*` at F3, `write_*` at Stage B (`cliHookTablePlaced = []`; legacy `cliHookTable` hooks I/O)** · class: machine model · effect: none (placed ELF) / out of scope (legacy `cliHookTable`)

- Homes: `LibsignalBinary/Specifications/SignalSession/CliRun.lean` (home docstring; legacy
  `writeFileHook` and `writeStdoutHook`, retained for untrusted ghost-table replay and legacy
  fixed-image `cliHookTable` outside the placed headline closures now that `cliHookTablePlaced = []`,
  live in `LibsignalBinary/Proofs/SpecLemmas/SignalSession/IoHooksLegacy.lean`, and legacy
  `readFileHook` / `readStdinHook` live in `CliRunFixed.lean`), `LibsignalBinary/Heap/SpecBudget.lean` (`ReadFileEnv`,
  `ReadStdinEnv`, `WriteFileEnv`, `WriteStdoutEnv`).
- All four `libsignal_cli_io` functions (`read_file`, `read_stdin`, `write_file`, `write_stdout`) are
  de-hooked on the stock `ld.lld` ELF (0 non-panic external hooks, DEV-E7; proof-side `cliHookTablePlaced = []`, `55` external de-hooked
  symbols in `cliDehookedSymsPlaced` across `B2-TLIT` `49 → 47`, F3 `47 → 39`, first stock `ld.lld`
  `39 → 37`, C2 `37 → 27`, `D1.A` `27 → 18`, SHA-256 + HMAC `18 → 16`, AES-256-CBC `16 → 14`,
  Stage B `14 → 0`, and ARMv8 hardware AES + `cpufeatures::aarch64::getauxval_hwcap`, `cliHookTablePlaced_length_guard`, plus `<String as Clone>::clone` as an
  intra-library block under SC-1 route (I)), and the stock `ld.lld` ELF runs their linked compiled
  blocks (`lib1_0.o` / `SignalSessionIoPlacedObj`). `read_file` and `read_stdin` were de-hooked at
  F3's re-link and proved against musl `open`/`read`/`close`/`__errno_location` in
  `LibsignalBinary/Proofs/SignalSession/CliIo/` (`hole2_readFileCond_ok` and `hole2_readStdinCond_ok`
  in `ElfSlicesPqOomPlacedInst.lean`); `write_file` (`304` B) and `write_stdout` (`184` B), which are
  0-allocation C-ABI musl `open`/`write`/`close`/`__errno_location` loops in `cli/io/src/lib.rs`,
  were de-hooked at Stage B and proved in `LibsignalBinary/Proofs/HookDischarge/CliIoFmt/` (reusing
  `muslOpenCreateTrunc_ok` / `muslWriteFile32_ok`). Per-call closedness of `fds ≥ 3` at each I/O
  boundary is carried as a proof-side fact in `VmPreserved` (`FdsHiFrame`), and the ghost-to-real
  transfer from `main`'s ghost-hook run to the real ELF run is proved on the K route
  (`H2KGhostArms`, discharged by `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`). `writeFileHook` and
  `writeStdoutHook` remain only in untrusted ghost-table replay proofs and the legacy fixed-image
  `cliHookTable` (`CliRunFixed.lean`).
- In the `SignalSessionIoPlacedObj` crate export (`lib1_0.o`), the undefined symbol set has 11
  symbols—6 musl (`__errno_location`, `close`, `memcpy`, `open`, `read`, `write`), 4 `__rustc::__rust_*`
  allocator shims (referenced only by `read_*` / `finish_grow`), and `alloc::raw_vec::handle_error`—with
  0 GNU-`std` / `core::io` undefineds and 0 allocator or panic relocations in `write_file` /
  `write_stdout`. `WriteFileEnv` and `WriteStdoutEnv` in `SpecBudget.lean` remain conservative sound
  supersets of `[]`.
- Success-path non-vacuity (sanity check, not part of any headline statement): the whisper `recv`
  success witness (`LibsignalBinary/Proofs/PeakBudget/RealMainEnvNonVacSuccWhisper.lean`) is stated
  on the generic binary-kit environment `realCliMainBinaryKitEnvOf`, whereas the ELF release chain
  uses the `Exact` slot environments (`cliDecPkCanonSlotEnvExact'`: `mkBinaryKitRealCalleeEnvsFixed`
  `initEnv` plus encrypt/decrypt slots guarded by `PeerSpqrStateTight640`). No inclusion lemma
  exists for the `Exact` environment, so success is not shown reachable in the release environment.
  No headline statement or trusted closure depends on this sanity witness.

### DEV-CLI21

**Bounded-read I/O caps (`stdin ≤ 2^20`, files `≤ 2^21`, paths `< 4096`), `send` plaintext ceiling (`≤ 10^6`), and stated last-resort `.base-keys` cap rejection (`markKyberUsed`, `PqxdhPartyInSpecDomain`)** · class: libsignal · effect: none

- Home: `LibsignalBinary/Specifications/SignalSession/PqDir.lean` (T): `PqxdhPartyInSpecDomain` and
  `markKyberUsed` (with cap constants `stdinCapBytes = 2^20`, `fileCapBytes = 2^21`,
  `cliPathMaxBytes = 4096`, and `maxPlaintextBytes = 1_000_000` in
  `LibsignalBinary/Specifications/SignalSession/Run.lean`, legacy hook contracts `writeFileHook` in
  `IoHooksLegacy.lean` and `readFileHook` / `readStdinHook` in `CliRunFixed.lean` (outside the placed headline closures now that `cliHookTablePlaced = []`), top-level refusal clauses in `CliSpecPqxdh`,
  `CliSpecPqxdhNoMatch`, and `CliSpecE`
  (`LibsignalBinary/Proofs/SpecLemmas/SignalSession/SmDirProofDefs.lean`), and completeness proofs
  in `Computational/Proofs/LibsignalCli/CliCapsCompleteness.lean`).
- In the bounded-read CLI build (B2 removed the 2 `grow_one` hooks, `49 → 47`; the F3 + IO.6b
  cutover removed `<String as Clone>::clone` and `7` external de-hooked symbols, `47 → 39`; the
  stock `ld.lld` cutover removed `memcpy` and `memset`—executed as `VerifiedLibraries.mallocngLib`
  blocks `20` and `21` on the stock ELF—leaving `9` external de-hooked symbols and `37` rows
  (`39 → 37`); the second stock `ld.lld` cutover (C2) removes `memmove`, `bcmp`, and `strlen`
  (`self-contained/libc.a`; `bcmp` tail-calls the unhooked `memcmp`) and `memrchr`, `from_utf8`,
  `SystemTime::duration_since`, `<SystemTime as Add<Duration>>::add`, `subtle::black_box`, and the
  `2` X25519 `Drop::drop` destructors (`37 → 27`), the `D1.A` crypto cutover removes the `7`
  `curve25519_dalek` Ed25519/scalar operations and `libcrux_ml_kem`'s
  `KeyPairCompressedBytes::{pk1, pk2}` (`27 → 18`), the SHA-256 + HMAC de-hook removes
  `sha2::sha256::compress256` and `libcrux_hmac::hmac` (with its `libcrux_sha2::hacl::*` SHA-256
  helpers in `.text.lib2`, `18 → 16`), and the AES-256-CBC cutover removes
  `signal_crypto::aes_cbc::{aes_256_cbc_encrypt, aes_256_cbc_decrypt}` (with `aes` 0.9.1
  `fixslice64` in `.text.lib2`, `16 → 14`), and the Stage B cutover removes
  `sha2::sha512::compress512`, the `7` remaining `libcrux_ml_kem` Kyber-1024 and ML-KEM-768
  functions, `libsignal_cli_io::{write_file, write_stdout}`, `core::fmt::write` (adding its `7`
  `core::fmt` `Formatter` / `Display::fmt` externs in `lib2_0.o`),
  `alloc::fmt::format::format_inner`, and `x25519_dalek`'s `PublicKey::from(&StaticSecret)` and
  `StaticSecret::diffie_hellman` (`14 → 0`), and the ARMv8 hardware AES + SPQR CPU-probe cutovers
  add `cpufeatures::aarch64::getauxval_hwcap` and `Once::call`, bringing `cliDehookedSymsPlaced` to
  `55` external de-hooked symbols and `cliHookTablePlaced` to `0` rows, with all four
  `libsignal_cli_io::{read_file, read_stdin, write_file, write_stdout}` functions running their
  linked `lib1_0.o` code, see DEV-CLI19):
  - `read_stdin` caps standard input at `stdinCapBytes = 2^20` (`1,048,576` B), exiting `2` with
    files unchanged when `stdin.length > stdinCapBytes`;
  - `read_file` caps file reads at `fileCapBytes = 2^21` (`2,097,152` B), and both `read_file` and
    `write_file` return `Err` on paths of `cliPathMaxBytes = 4096` UTF-8 bytes or more, or with an
    interior NUL (longest accepted: `4095`);
  - `send` refuses plaintext above `maxPlaintextBytes = 1_000_000` bytes (`lib.rs:90-91`) before
    session encryption with concrete exit `1` and files unchanged (`CliSpecPqxdh` and `CliSpecE`).
    Note that while `cli/src/lib.rs:25`'s doc comment attributes exit `2` to file read/write
    failures, exit `2` in `lib.rs` is produced before `run` on a bad command line (`lib.rs:76-77`)
    or a stdin / `coins` read error (`lib.rs:84-85`) and after `run` on a `commit` / `write_stdout`
    failure (`lib.rs:98`), whereas party-store `Dir::get` read errors inside `run`
    (`stores.rs:135-139`, `lib.rs:93-94`) propagate as errors before `commit` and exit `1` with
    files unchanged.
- Stated reject, effect none (`PqxdhPartyInSpecDomain` and `markKyberUsed`):
  - (i) `PqxdhPartyInSpecDomain` still excludes directories with a non-`.base-keys` file above
    `fileCapBytes` (`2^21`), while keeping `.base-keys` (`baseKeysFile i`) below `2^31` bytes. No
    reachable state has a non-`.base-keys` file above `2^21`: every reachable PQXDH session record
    is `≤ 1,209,331` B (`reachable_sessionRecord_le_fileCap`), every bundle file is `≤ 1,637` B
    (`publicBundleOf_files_le_fileCap`), every fixed-size party store file is `≤ 1,637` B
    (`honest_party_and_bundle_files_le_fileCap`), every CLI coins tape (`init` `192` B, `send` `64`
    B, `recv` `32` B, `keygen` `n ≤ 100` `≤ 16,260` B) is `≤ fileCapBytes`
    (`honest_coins_le_fileCap`), and every `send` ciphertext on `m.length ≤ 1_000_000` is
    `≤ 1,002,030 ≤ stdinCapBytes` (`honest_send_ciphertext_le_stdinCap`).
  - (ii) On a last-resort Kyber pre-key, `markKyberUsed` models the `.base-keys` read cap
    (`37 * seen.length > fileCapBytes → none` on the pre-state `seen`, firing only on the
    last-resort branch after the `kyberOneTime` lookup misses, matching `Dir::get` in `stores.rs`
    `mark_kyber_pre_key_used` failing before `commit`): handshake `#56,680` starts at
    `56,679 * 37 = 2,097,123 ≤ 2^21`, succeeds (`exit 0`), and writes `56,680 * 37 = 2,097,160 > 2^21`
    bytes, and from the `56,681`-st handshake on one unrotated last-resort key onward any new
    pre-key `recv` naming that last-resort key is a modelled rejection (`Outcome.exited 1 []` with
    files unchanged), while Bob's `send`, whisper `recv`, one-time-key `recv`, and matching-session
    promotion stay in `PqxdhPartyInSpecDomain` and keep succeeding, so no trace is dropped.
  - (iii) `cliPqExp` never reaches this rejection: Bob's `.base-keys` starts empty
    (`cliPqxdhDirBobBeforeAccept`) and undergoes at most one `markKyberUsed`
    (`cliPqxdhDirBobAfterAccept`, `StatementPq.lean:151`), so `seen.length ≤ 1` (`0` or `37` B,
    proved in `cliPqExp_lastResort_never_cap_rejected` and `cliPqExp_dir_files_le_fileCap`).
- The CLI specifications (`PqDir.lean`, `Run.lean`, `CliRun.lean`) include the domain narrowing (i)
  and exit-`2` cap branches above; effect is none, because no reachable state is excluded (i).

### DEV-CLI22

**Unbounded `SampleNTT` (`sample_from_xof`) rejection loop in `libcrux_ml_kem` (`MlKemSampleNttStuckAtElf`, `CliReachesSampleNttStuckElf`)** · class: machine model · effect: availability only; the headline security bound gains an unbounded `2·CliPqxdhFlagProb` SampleNTT-divergence term

- Home: `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` (T): `MlKemSampleNttStuckAtElf`
  and `CliReachesSampleNttStuckElf` (with the 6 seed-termination predicates
  `Shake128MatrixTerminates`, `Mlkem768FromSeedTerminates`, `Mlkem768Encaps1Terminates`,
  `Mlkem768DecapsTerminates`, `Kyber1024EncapsTerminates`, and `Kyber1024DecapsTerminates` next to
  `Shake128SeedTerminates` in `LibsignalBinary/Specifications/CryptoGames/KEM/MlKem.lean`, progress
  clause `CliElfProgress` in `Symbolic/Specifications/Refinement/ElfBinding.lean`, and
  excused-abort bound wiring `CliPqxdhExcusedAbort` / `CliPqxdhElfSecure` in
  `Computational/Specifications/LibsignalCli/StatementPqElf.lean`).
- Reference: `libsignal` (`libcrux_ml_kem` `0.0.10` `sampling::sample_from_xof`, `while !done`
  rejection loop over 12-bit candidates `< 3329` squeezed from SHAKE-128).
- At 0 non-panic hooks (`cliProgElf addrs`), the 5 matrix-sampling entry points in the linked ELF
  — Kyber-1024 `encapsulate` (`x0`, `1,568` B; `ρ = pk[1536..1568]`) and `decapsulate` (`x0`,
  `3,168` B; `ρ = sk[3072..3104]`), and incremental ML-KEM-768 `KeyPairCompressedBytes::from_seed`
  (`x0`, `64` B; `ρ = SHA3-512(seed[0..32] ‖ 3)[0..32]`), `encapsulate1` (`x0`, length `x1`;
  returns `Err` when `< 64` B and otherwise samples from `hdr[0..32]`), and
  `decapsulate_compressed_key` (`x0`, `2,400` B; `ρ = dk[2304..2336]`) — execute the compiled
  `sample_from_xof` loop rather than total specification hooks. Because `∀ seed34,
  Shake128SeedTerminates seed34` ranges over all `2^272` concrete SHAKE-128 inputs (including
  adversary-chosen bundle public keys, SPQR V1 headers, stored secret keys, and send coins),
  whole-domain totality cannot be proved by finite evaluation.
- Per-call trajectory excuse (Option A + R1a):
  - `CliReachesSampleNttStuckElf elf addrs i` holds iff the deterministic trajectory from
    plain `elf.loadState (cliProcessInputs i) = .ok s0` on `i` reaches a `.Running` state `u` at one of the 5 `.symtab`-resolved
    symbol addresses (`addrs.{kyberEncapsVa, kyberDecapsVa, mlkemFromSeedVa, mlkemEncaps1Va, mlkemDecapsVa}`)
    whose ABI-passed input bytes negate the corresponding `*Terminates` predicate
    (`MlKemSampleNttStuckAtElf addrs u`).
  - `CliPqxdhElfCorrect` instantiates `OutcomeOrExcusedAbort` at
    `cliExcusedElf elf addrs` (`fun i => CliReachesOOMElf elf addrs i ∨ CliReachesSampleNttStuckElf elf addrs i`),
    and `CliElfProgress` concludes
    `cliRunElf elf addrs i ≠ none ∨ CliReachesSampleNttStuckElf elf addrs i`.
    `OutcomeOrExcusedAbort` never alters a `some o` claim, and any fault or divergence *before*
    reaching a stuck `SampleNTT` entry stays unexcused.
  - On the computational security side (`StatementPqElf.lean`), `CliPqxdhExcusedAbort` counts PQXDH
    inputs satisfying `exc i` with `run i = none ∨ run i = some .aborted`, and
    `CliPqxdhElfSecure` sets `exc? := some (CliReachesSampleNttStuckElf elf addrs)`,
    adding `+ 2 * CliPqxdhFlagProb … (CliPqxdhExcusedAbort (CliReachesSampleNttStuckElf elf addrs) …)` to
    both clauses of the headline security bound (`withExcusedAbortTerm`). This `2 * CliPqxdhFlagProb`
    term is **not bounded in the theorem**: under an idealized random XOF each 12-bit candidate is
    `< 3329` independently with probability `3329 / 4096`, so non-termination has probability `0`,
    but the theorem does not bound this probability for concrete SHAKE-128 and the adversary
    influences the inputs (e.g., bundle public keys and `encapsulate1` headers). If a pathological
    concrete SHAKE-128 seed existed and an adversary supplied it, the flag term reflects that
    denial-of-service / non-termination probability.

## Retired IDs

- `DEV-E4`, `DEV-E5`: retired in an earlier revision of the binary statement.
- `DEV-M14`, `DEV-M15`, `DEV-M16`: reserved in the superseded `*V1.lean` draft; retired so
  that subsequent M-series IDs do not collide.
- `DEV-CLI9` (legacy SM-mode `CliAllocNeverFails` hypothesis on `CliBinaryCorrect`): retired with the
  removal of `LibsignalBinary/Proofs/SpecLemmas/SignalSession/CliBinaryFixed.lean`; the ELF-direct
  PQXDH headlines do not take this hypothesis.
- `DEV-C6`: never assigned (the C entries were numbered with a gap); retired so that it is not
  reused.
- `DEV-C1`–`DEV-C4`, `DEV-C7`: described the earlier SPQR-off composed PQXDH + Double Ratchet draft;
  superseded by the SPQR V1 `StatementComposed.lean` entries above.
- Retired with the removal of the C-ABI harness (its crates, statements and theorems), each because
  its subject is gone or a CLI entry covers it at least as strongly:
  - `DEV-E2` (`hashmap_random_keys` never fails): the CLI does not hook it; reaching its stub
    halts the run, which the binary statement forbids (`CliRun.lean`, fail closed).
  - `DEV-E3` (only a 24-byte zero TLS block is mapped): the harness's TLS block is gone; musl's
    `static_init_tls` is part of the proved process run (`CliProcess.lean`).
  - `DEV-M8` (initialisation is the wrapper's re-implementation): there is no seed code; the game
    writes the initial records, and no libsignal code initialises the session (M, E section:
    "No pre-key layer and no libsignal session initialisation").
  - `DEV-M13` (no allocation fails, `HeapDemandBound`): the hypothesis was removed with the harness
    statement; the legacy SM-mode `CliAllocNeverFails` (`DEV-CLI9`, retired) replaced it; the PQXDH-mode premise that
    replaced it (`DEV-CLI12`, retired) was discharged unconditionally for `cliElfBytes`, and `CliPqxdhElfCorrect` covers runs in
    which an allocation fails (CLI section).
  - `DEV-PQ4` (the responder starts from no session): `CliRecvPrekeyCorrect` covers both no session
    and a matching session; a session that does not match is covered by `CliSpecPqxdhNoMatch` (CLI
    section).
  - `DEV-PQ7` (hookless and panic stubs on the PQXDH paths): the harness crate's stubs are gone;
    in the CLI a stub with no hook halts the run (`CliRun.lean`, "Unhooked stubs fail closed") and
    a panic is `SIGABRT` (`CliProcess.lean`), both proved where claimed.
  - `DEV-SPQR8` (`GSecureWithAbs` assumes `spqr::recv` reads only a 64-byte prefix): the statement
    `GSecureWithAbs` and its file `StatementSpqrAbs.lean` were removed (commit 8df2e47f70).
  - `DEV-SPQR9` (`GSecureWithAbs` states SPQR-state validity from the image, `PqReach`) and
    `DEV-SPQR10` (the salt clause `SpqrHarnessOk` of `GSecureWithAbs`): their subjects are gone.
    Removed with `StatementSpqrAbs.lean` and `SpqrPqReach.lean` (commit 8df2e47f70).
- `DEV-G1`–`DEV-G17`: the restrictions of the scheme-parametric abstract composed game `G(Σ)`
  (`GSecureWith` / `GSecure`). Removed with `Computational/Specifications/Generic/` and
  `Computational/Proofs/Generic/`, which no theorem of `Computational/Theorems/`, no test and no
  script used (dead-code cleanup).
- `DEV-AEAD15` (the codec round-trips only on valid headers, `WireCodec.RoundTripOn`) and `DEV-CLI5`
  (argument vectors of at most 16 KiB, `ArgvFitsInitialStack`): both subjects are proof-side
  definitions outside the trusted closure of every theorem of `Computational/Theorems/`, so neither
  restricts what a theorem claims.
- `DEV-CLI17` (the allocation-failure excused-abort term in the CLI security bound,
  `CliPqxdhAllocFailureAbortProb`): the bound has no allocation-failure term, and since NOOM-CLOSE
  the security clause has no allocation premise either (DEV-CLI12, retired).
  The generic excused-abort form (`CliPqxdhSecurityFor` with `exc? := some exc`,
  `withExcusedAbortTerm`) stays in `Computational/Specifications/LibsignalCli/StatementPqElf.lean`,
  and `CliPqxdhFlagProb` in `Computational/Specifications/Game/StatementPqOomGame.lean`; no theorem
  of `Computational/Theorems/` instantiates it for allocation failure (`CliPqxdhElfSecure`
  instantiates `some (CliReachesSampleNttStuckElf elf addrs)` for `SampleNTT` seed divergence only,
  [dev-cli22](#dev-cli22)).
- `DEV-CLI12` (the security clause assumed that no PQXDH-mode run reaches `.OutOfMemory`): retired
  at NOOM-CLOSE (2026-11-07). `CryptoVerification.LibsignalCli.CliPqxdhElfSecure` has no such premise. For `cliElfBytes`, the
  Main Theorem's proof shows unconditionally on the modelled 1 GiB machine
  that no such run reaches `.OutOfMemory`
  (`cliElf_noOOM_elf`, via `ElfNoOomPlacedInstK.cliElf_noOOMK` with `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`, 0 premises). Lemma 4's statement, and with it the correctness
  conjunct `CliPqxdhElfCorrect` of the Main Theorem, still allows `.OutOfMemory` ([dev-cli15](#dev-cli15)).
  The docstrings of `CliBinaryPq.lean` and `RustHeap/Alloc.lean` that described `¬OOM` as a
  premise of the security statement were corrected on the move to `main`.
- `DEV-C21` (per-session SM query cap `_hq32 : ∀ k < qStart, 80000 * (qs k + 1) + 2100000 < 2 ^ 31` in
  `LibsignalCliPqSecure` and `CryptoVerification.LibsignalCli.CliPqxdhElfSecure`): `_hq32` in
  `LibsignalCliPqSecure` and `CryptoVerification.LibsignalCli.CliPqxdhElfSecure` is now the consolidated
  `u32` counter/window bound `2 * (qs k + 1) + 25002 < 2 ^ 32` ([dev-c14](#dev-c14)), because every
  `ReachablePqxdhSession` record encodes to at most `1,209,331 < 2 ^ 21 < 2 ^ 31` bytes
  (`encodeRecordX_length_le_1209331_cli`, `CliPqSessionCap.lean`) independently of `qs k`. The former
  `DEV-C21` claim that a receive-only party accumulates SPQR chain links and skipped keys (so the cap
  was "not purely a proof artifact") is superseded by `topStateTight_length_le`
  (`Computational/Proofs/SpqrV1Sync/TopStateTight.lean`, feeding `encodeRecordX_length_le_1209331_cli`),
  which kernel-checks that SPQR V1's braid (`≤ 3`-link `phiB` invariant, `≤ 46,880` B) and
  chain/key-history state (`≤ 238,532` B) stay uniformly bounded by `286,196` bytes across arbitrarily
  many steps.
- `DEV-CLI20` (ghost-to-real allocator/IO hook transfer assumed on the four placed ELF headlines,
  `CliElfHole2Assumption`): Retired by FD-RM S4: fd fact proved per call (option (a), `FdsHiFrame`
  in `VmPreserved`); transfer proved on the K route (M1, `ElfSlicesPqOomH2KM1.h2k_ghostArms_closed`).

## Former names

Older docstrings, commits and pull requests use per-file numbers. They map as follows:
"deviation n" of `SM/Game.lean` → `DEV-SMn` (n ≤ 10); of `SM/Construction.lean` → `DEV-SM(n+10)`; of
`CKA/Defs.lean` → `DEV-CKAn`; of `FSAEAD/Defs.lean` → `DEV-FSn`; the "corrections to Fig. 6"
1–3 → `DEV-FS7`–`DEV-FS9`; of `PRNG/Defs.lean` → `DEV-PRNGn`. T's `M1`–`M6`, `E1`–`E7` → `DEV-M1`…,
`DEV-E1`…. "Gap G3" → DEV-LS5; "gap G1" → DEV-LS1, DEV-CKA11; "gap G5" → DEV-LS13. Older
`SignalPqxdh` docstrings used per-file PQXDH numbers: "DEV-PQ3" → DEV-PQ13, "DEV-PQ4" → DEV-PQ14,
"DEV-PQ8" → DEV-PQ17 (`Assumptions.lean` uses the catalogue IDs). On the staged branch,
DEV-CLI21 (the I/O caps) was numbered DEV-CLI18; it was renumbered on the move to `main`, where
DEV-CLI18 is the retained-directory entry. The
[`GLOSSARY.md`](GLOSSARY.md) lists other former project names.
