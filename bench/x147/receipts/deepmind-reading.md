# Reading the theorems as a cryptographer

This guide translates the Lean computational security statements into standard Katz-Lindell and
Bellare-Rogaway concrete-security notation. We focus on Lemma 1, the one-key PQXDH handshake
theorem `SignalPqxdh.Security.headlineδ` in
[`Computational/Theorems/Lemmas.lean`](../Theorems/Lemmas.lean), and walk through its adversary
model, exact advantage and resource bounds, scale evaluation at `deploymentSetup` and under
standard-model Curve25519 accounting within Lemma 1's one-key ROM game (`KeyInd1KeyRoAdvantage` /
`HkdfRO`), reduction guarantees, and trust boundaries.

## 1. The adversary model

In [`Computational/Specifications/Pqxdh/Game.lean`](../Specifications/Pqxdh/Game.lean), a handshake
adversary `A : KeyIndAdversary S` is an arbitrary VCVio oracle computation
`A.run : OracleComp (unifSpec + keyIndSpec S) Bool`. The left summand `unifSpec` supplies unbounded
uniform random coins, while `keyIndSpec S` exposes the multi-user PQXDH handshake oracles (party
registration, pre-key generation, session initiation and acceptance, identity and signed-pre-key
compromises, session-key reveals, the `testSession` challenge, known-secret-key registration, and
queries to the lazy handshake random oracle `HkdfRO`).

The theorem restricts `A` only through an explicit oracle-query budget `b : QueryBudget` with fields
`q_ro`, `q_roRoot`, `q_total`, and `q_on` (`q_on := q_total` by default). The typeclass instance `HasQueryBound (KeyIndAdversary S)`
defines `QueryBounded A b` as five `OracleComp.IsQueryBoundP` caps on `A.run`: at most `b.q_ro`
random-oracle queries, at most `S.N_send_tot` initiator queries, at most `S.N_recv_tot` responder
queries, at most `b.q_total` game-oracle queries of any kind (`isGameQuery`, which excludes coin
draws), and at most `b.q_on` online registration/key-generation/session queries (`isKeyIndOnlineQuery`; `b.q_roRoot` is unused on `KeyIndAdversary`, whose oracle interface has no root-KDF query,
though it remains in the shared budget formulas below). The subtype
`BoundedAdv (KeyIndAdversary S) b` pairs `A` with a proof of `QueryBounded A b`.

No running-time bound is placed on `A` itself. For concrete black-box reductions this is strictly
stronger than quantifying only over time-bounded adversaries: the advantage inequality holds for
every query-bounded oracle decision tree `A`, regardless of how much internal computation `A`
performs between oracle calls. Efficiency enters on the reduction side: the theorem bounds each
reduction's own added work and oracle queries relative to a single black-box run of `A`, so a reader
who instantiates `A` in any concrete machine model with running time $t$ immediately obtains
assumption adversaries running in time $t$ plus the reduction's explicit polynomial overhead.

## 2. Textbook reading of `PqxdhKeyIndSecureδ`

Lemma 1 (`SignalPqxdh.Security.headlineδ : PqxdhCorrectAndSecureδ` in
[`Lemmas.lean`](../Theorems/Lemmas.lean), defined in
[`HeadlineDelta.lean`](../Specifications/Pqxdh/Security/HeadlineDelta.lean)) pairs functional
correctness (`WellFormedPrimitivesδ P → PqxdhCorrect P` for all primitives `P : Primitives`) with
one-key random-oracle key indistinguishability (`PqxdhKeyIndSecureδ S` for all replication setups
`S : Setup`) and one-key first-message authentication and payload privacy (`PqxdhAuth1KeySecureδ S`,
[`Auth/Headline.lean`](../Specifications/Pqxdh/Security/Auth/Headline.lean), DEV-C5); this section
reads the `KeyInd` conjunct.

Unfolding `PqxdhKeyIndSecureδ S` together with `Headline.lean`, `Bound.lean`, `CostedBudgets.lean`,
and `Assumptions.lean` gives the concrete-security statement below. Fix a setup `S : Setup` with
per-party and per-bundle limits `(N_id, N_recv, N_opk, N_no_opk, N_send_opk, N_send_no_opk)` and
derived totals (`Game.lean`):
`N_spk_tot = N_id · N_recv`,
`N_opk_tot = N_spk_tot · N_opk`,
`N_no_opk_tot = N_spk_tot · N_no_opk`,
`N_recv_tot = N_opk_tot + N_no_opk_tot`,
`N_send_opk_tot = N_id · N_send_opk`,
`N_send_tot = N_send_opk_tot + N_id · N_send_no_opk`,
`N_sess_tot = N_send_tot + N_recv_tot`, and
`N_dh = N_id + N_spk_tot + N_opk_tot + N_send_tot`.

There exist `ReductionDsl` reduction families `R : KeyIndCostedReductionFamily S` yielding, for
every query budget `b : QueryBudget` and bounded adversary `A : BoundedAdv (KeyIndAdversary S) b`,
three assumption adversaries `(R₁(A), R₂(A), R₃(A)) = (R.eval.sig b A, R.eval.shcr b A, R.eval.gdh b A)`
such that for all `P : Primitives` satisfying `CryptoWellFormedPrimitivesδ P` and all `δ : ℝ≥0∞`
satisfying `KemDeltaCorrect P δ` (`KemCorrect.lean`):

$$\mathsf{Adv}^{\mathsf{KeyInd\text{-}1Key\text{-}RO}}_{S,P}(A) \;\le\;
  c_1 \cdot \mathsf{Adv}^{\mathsf{GapSigEufCma}}_P(R_1(A))
  + c_2 \cdot \mathsf{Adv}^{\mathsf{KemShCr}}_P(R_2(A))
  + c_3 \cdot \mathsf{Adv}^{\mathsf{GapDhWithSign}}_P(R_3(A))
  + \frac{n_{\mathrm{dh}}(n_{\mathrm{dh}} - 1) + n_{\mathrm{send}}(n_{\mathrm{send}} - 1)}{2^{251}}
  + \frac{n_{\mathrm{spk}}(n_{\mathrm{spk}} - 1)}{2^{256}}
  + 2 \cdot N_{\mathrm{send\_tot}} \cdot N_{\mathrm{spk\_tot}} \cdot \delta.$$

Every symbol above maps to an exact Lean definition:

* Left-hand side (`KeyInd1KeyRoAdvantage S P A.1` in
  [`KeyInd1KeyRo.lean`](../Specifications/Assumptions/KeyInd1KeyRo.lean)): the real-or-random
  distinguishing bias $2 \cdot |\Pr[\text{win}] - 1/2|$ (`boolBias`) on the 96-byte handshake output
  in `pqxdhKeyIndImpl1KeyRo`, where each honest party uses one Curve25519 scalar for both X25519 and
  XEdDSA and `HkdfRO` models the handshake HKDF (non-fresh tested sessions are replaced by a uniform
  coin at the end of `pqxdhKeyInd1KeyExpForHandshake`).
* Assumption advantages (`Assumptions.lean`): winning probabilities in $[0, 1]$ for XEdDSA EUF-CMA
  with the X25519 decisional DH oracle (`GapSigEufCma P P.isValidDhTriple (R.eval.sig b A)`),
  two-stage Kyber-1024 semi-honest collision resistance (`KemShCr P (R.eval.shcr b A)`), and
  single-pair X25519 Gap-DH modulo cofactor projection `P.pow8` with an XEdDSA signing oracle on the
  first challenge key (`GapDhWithSign P P.isValidDhTriple P.pow8 (R.eval.gdh b A)`).
* Exact coefficients and collision terms (`pqxdhKeyIndBoundActive S b.q_on` in
  [`Bound.lean`](../Specifications/Pqxdh/Bound.lean), with $n_{\mathrm{id}} = \min(b.\mathrm{q\_on}, N_{\mathrm{id}})$, $n_{\mathrm{spk}} = \min(b.\mathrm{q\_on}, N_{\mathrm{spk\_tot}})$, $n_{\mathrm{opk}} = \min(b.\mathrm{q\_on}, N_{\mathrm{opk\_tot}})$, $n_{\mathrm{send}} = \min(b.\mathrm{q\_on}, N_{\mathrm{send\_tot}})$, $n_{\mathrm{send\_opk}} = \min(b.\mathrm{q\_on}, N_{\mathrm{send\_opk\_tot}})$, and $n_{\mathrm{dh}} = \min(b.\mathrm{q\_on}, N_{\mathrm{dh}})$, bounded above by `pqxdhKeyIndBound S` via `pqxdhKeyIndBoundActive_le`, with equality once $b.\mathrm{q\_on} \ge N_{\mathrm{dh}}$):
  $c_1 = n_{\mathrm{id}}$,
  $c_2 = n_{\mathrm{spk}} \cdot n_{\mathrm{send}}$,
  $c_3 = 2 \cdot \bigl(n_{\mathrm{spk}} \cdot (n_{\mathrm{id}} + n_{\mathrm{send}}) + n_{\mathrm{id}} \cdot n_{\mathrm{send}} + n_{\mathrm{opk}} \cdot n_{\mathrm{send\_opk}}\bigr)$,
  X25519 clamped-key collision term $(n_{\mathrm{dh}}(n_{\mathrm{dh}} - 1) + n_{\mathrm{send}}(n_{\mathrm{send}} - 1)) / 2^{251}$ (from `ec_coll_bound` $= 2^{-250}$ over unordered active pairs, bounded above by $(N_{\mathrm{dh}}(N_{\mathrm{dh}} - 1) + N_{\mathrm{send\_tot}}(N_{\mathrm{send\_tot}} - 1)) / 2^{251}$), and
  Kyber-1024 public-key collision term $n_{\mathrm{spk}}(n_{\mathrm{spk}} - 1) / 2^{256}$ (from `kem_coll_bound = 2^-255` over unordered active bundle pairs, bounded above by $N_{\mathrm{spk\_tot}}(N_{\mathrm{spk\_tot}} - 1) / 2^{256}$).
* KEM decapsulation-failure term (`kemDecapsFailureTerm S δ` in `Bound.lean`, added to
  `pqxdhKeyIndBoundActive S b.q_on` by `pqxdhKeyIndAdvantageBoundActiveδ` in `HeadlineDelta.lean`):
  $2 \cdot N_{\mathrm{send\_tot}} \cdot N_{\mathrm{spk\_tot}} \cdot \delta$, union-bounding honest
  decapsulation failures (`KemDeltaCorrect P δ`) across initiator sessions and reusable Kyber
  pre-keys, times the `boolBias` factor `2`.

The resource bounds in `KeyIndCostedReductionBounds` and `KeyIndReductionQueryBounds`
([`Headline.lean`](../Specifications/Pqxdh/Security/Headline.lean),
[`CostedBudgets.lean`](../Specifications/Pqxdh/Security/CostedBudgets.lean),
[`Assumptions.lean`](../Specifications/Assumptions/Assumptions.lean)) guarantee:

* Step-cost overhead (`sig_cost`, `shcr_cost`, `gdh_cost`): each $R_i$ has syntactic cost
  `totalCost b.q_total ≤ stepCostBudget S b`, where
  `stepCostBudget S b = 2 ^ 16 * (b.q_total + 1) ^ 2 + 2 ^ 15 * (b.q_total + 1) * (M_dh + M_sess) + 2 ^ 10 * (b.q_total + 1) * (Nat.log 2 S.N_dh + Nat.log 2 S.N_sess_tot) + 2 ^ 11 * M_dh ^ 2 + 2 ^ 8 * M_dh * M_sess` (`M_dh = min b.q_total S.N_dh`, `M_sess = min b.q_total S.N_sess_tot`; `A`'s `unifSpec`
  coin draws pass directly through `Iface.fwdU` to the challenger's coin source, while
  `totalCost b.q_total` bounds setup, `b.q_total` handled game queries, and finalization). Counting
  `A`'s own coin draws inside $\mathrm{time}(A)$, in DSL step units
  $\mathrm{time}(R_i(A)) \le \mathrm{time}(A) + \mathrm{stepCostBudget}(S, b)$.
* Output block-size and program-size bounds (`sig_blocks`, `shcr_blocks`, `gdh_blocks` via `GRedBlockBounded` and
  `GRed2BlockBounded`, `.size ≤ reductionSizeBudget + 2 ^ 12 * bits (stepCostBudget S b)`, with table size-honesty `ops_sizeHonest` and `samp_sizeHonest`): when
  challenge inputs, game queries, and oracle answers fit $\ell$ blocks (`ValFits ℓ`), every output
  of $R_i$ fits `outputSizeBudget S b ℓ = 2 * stepCostBudget S b * (ℓ + 1) + 2 * (b.q_total + 1) * ℓ`.
* Oracle query bounds:
  * Signing queries: $q_{\mathrm{sig}} \le 2 \cdot \min(N_{\mathrm{spk\_tot}}, N_{\mathrm{recv}})$ on $R_1(A)$ and $R_3(A)$,
    set in `KeyIndCostedReductionFamily.eval` and enforced semantically by `sig_bounded` and
    `gdh_bounded` (`GapSigEufCmaAdv.Bounded`, `GapDhWithSignAdv.Bounded`), alongside the syntactic
    per-query bound `≤ 2 * b.q_total` (`sig_q_sig`, `gdh_q_sig`). $R_2(A)$ has no signing oracle.
  * Decisional DH queries: $q_{\mathrm{ddh}} \le \mathrm{gdhQueryBudget}(S, b) = \min\bigl(4 \cdot b.\mathrm{q\_total}^2,\, 4 M_{\mathrm{ro}} M^{\mathrm{on}}_{\mathrm{sess}} + 2 M^{\mathrm{on}}_{\mathrm{sess}}(M^{\mathrm{on}}_{\mathrm{sess}} - 1)\bigr) + b.\mathrm{q\_total} + S.N_{\mathrm{dh}} + S.N_{\mathrm{sess\_tot}}$ ($M_{\mathrm{ro}} = \min(b.\mathrm{q\_ro}, b.\mathrm{q\_total})$, $M^{\mathrm{on}}_{\mathrm{sess}} = \min(\min(b.\mathrm{q\_on}, b.\mathrm{q\_total}), S.N_{\mathrm{sess\_tot}})$: session queries are online, so they are capped by $b.\mathrm{q\_on}$, unlike the $M_{\mathrm{sess}}$ of `stepCostBudget`) semantically on
    $R_1(A)$ and $R_3(A)$ (`sig_bounded`, `gdh_bounded`, alongside syntactic `≤ 4 * b.q_total ^ 2 + b.q_total + S.N_dh + S.N_sess_tot` in `sig_q_ddh`, `gdh_q_ddh`). $R_2(A)$ has no
    DDH oracle.
  * Primitive-oracle queries (`primSpec`):
    $q_{\mathrm{prim}} \le \mathrm{gdhPrimQueryBudget}(S, b) = 32(b.\mathrm{q\_total} - M^{\mathrm{on}}_{\mathrm{sess}}) + 16(M^{\mathrm{on}}_{\mathrm{sess}} + 1)(5 S.\mathrm{N\_dh} + S.\mathrm{N\_sess\_tot} + 12)$ semantically on $R_1(A)$ and $R_3(A)$ (`sig_bounded`, `gdh_bounded`), and
    $q_{\mathrm{prim}} \le \mathrm{primQueryBudget}(S, b) = 16 \cdot (b.\mathrm{q\_total} + 1) \cdot (5 S.\mathrm{N\_dh} + S.\mathrm{N\_sess\_tot} + 12)$ syntactically (`sig_q_prim`, `shcr_q_prim`, `gdh_q_prim`) and on $R_2(A)$ (`shcr_bounded`).

## 3. Scale evaluation at `deploymentSetup` and concrete parameter regimes

The reference scale `deploymentSetup`
([`BoundProofDefs.lean`](../Proofs/SpecLemmas/Pqxdh/Security/BoundProofDefs.lean)) sets
`N_id = 2 ^ 20`, `N_recv = 32` ($2^5$), `N_opk = 32` ($2^5$), `N_no_opk = 32` ($2^5$),
`N_send_opk = 512` ($2^9$), and `N_send_no_opk = 512` ($2^9$). Its derived totals are
$N_{\mathrm{spk\_tot}} = 2^{25}$, $N_{\mathrm{opk\_tot}} = 2^{30}$,
$N_{\mathrm{recv\_tot}} = 2^{31}$, $N_{\mathrm{send\_opk\_tot}} = 2^{29}$, $N_{\mathrm{send\_tot}} = 2^{30}$,
$N_{\mathrm{sess\_tot}} = 3 \cdot 2^{30} = 3{,}221{,}225{,}472$,
$N_{\mathrm{dh}} = 2^{20} + 2^{25} + 2^{30} + 2^{30} = 2{,}182{,}086{,}656 \approx 2^{31.023}$, and
$N_{\mathrm{dh}} + N_{\mathrm{sess\_tot}} + 1 = 2^{20} + 2^{25} + 5 \cdot 2^{30} + 1 = 5{,}403{,}312{,}129 \approx 2^{32.331}$.

Suppose `A` runs in time $t$ under budget $b$. At $S = \mathrm{deploymentSetup}$, with $M_{\mathrm{dh}} = \min(b.\mathrm{q\_total}, N_{\mathrm{dh}})$ and $M_{\mathrm{sess}} = \min(b.\mathrm{q\_total}, N_{\mathrm{sess\_tot}})$, each $R_i(A)$ runs
in time at most $t + \mathrm{stepCostBudget}(S, b)$
DSL steps, making at most $q_{\mathrm{sig}} \le 2 \cdot \min(2^{25}, 32) = 64$ signing queries,
$q_{\mathrm{ddh}} \le \mathrm{gdhQueryBudget}(S, b) = \min\bigl(4 \cdot b.\mathrm{q\_total}^2,\, 4 M_{\mathrm{ro}} M^{\mathrm{on}}_{\mathrm{sess}} + 2 M^{\mathrm{on}}_{\mathrm{sess}}(M^{\mathrm{on}}_{\mathrm{sess}} - 1)\bigr) + b.\mathrm{q\_total} + S.N_{\mathrm{dh}} + S.N_{\mathrm{sess\_tot}}$
DDH queries ($M_{\mathrm{ro}} = \min(b.\mathrm{q\_ro}, b.\mathrm{q\_total})$, $M^{\mathrm{on}}_{\mathrm{sess}} = \min(\min(b.\mathrm{q\_on}, b.\mathrm{q\_total}), S.N_{\mathrm{sess\_tot}})$: session queries are online, so they are capped by $b.\mathrm{q\_on}$, unlike the $M_{\mathrm{sess}}$ of `stepCostBudget`), and $q_{\mathrm{prim}} \le \mathrm{gdhPrimQueryBudget}(S, b) = 32(b.\mathrm{q\_total} - M^{\mathrm{on}}_{\mathrm{sess}}) + 16(M^{\mathrm{on}}_{\mathrm{sess}} + 1)(5 S.N_{\mathrm{dh}} + S.N_{\mathrm{sess\_tot}} + 12)$
primitive queries on $R_1, R_3$ (`primQueryBudget S b` on $R_2$; for example, at $b.\mathrm{q\_ro} = b.\mathrm{q\_total} = 2^{40}$ and
$b.\mathrm{q\_roRoot} = 0$, $\mathrm{stepCostBudget} \approx 2^{96.00}$, about $30$ bits below
Curve25519's $\approx 2^{126}$ generic discrete-logarithm step count, while at
$b.\mathrm{q\_ro} = b.\mathrm{q\_total} = 2^{22}$ and $b.\mathrm{q\_roRoot} = 0$, clamping $M_{\mathrm{dh}}, M_{\mathrm{sess}} \le 2^{22}$ eliminates the passive $O(N_{\mathrm{dh}}^2)$ floor so $\mathrm{stepCostBudget} \approx 2^{61.03}$).

For every $b.\mathrm{q\_on}$, `pqxdhKeyIndAdvantageBoundActiveδ deploymentSetup b.q_on δ` is bounded above by the static `pqxdhKeyIndAdvantageBoundδ deploymentSetup δ` (`pqxdhKeyIndBoundActive_le`), with equality once $b.\mathrm{q\_on} \ge N_{\mathrm{dh}} = 2{,}182{,}086{,}656 \approx 2^{31.023}$ (at $b.\mathrm{q\_on} = 2^{30}$, $c_1, c_2, c_3$, the Kyber collision term, and `kemDecapsFailureTerm` already attain their static values, whereas $n_{\mathrm{dh}} = \min(b.\mathrm{q\_on}, N_{\mathrm{dh}})$ in the X25519 collision term saturates at $N_{\mathrm{dh}}$). Evaluating at `deploymentSetup` for $b.\mathrm{q\_on} \ge N_{\mathrm{dh}}$ (with the general active $b.\mathrm{q\_on}$ form in parentheses) gives the six
closed-form terms symbolically in the assumption advantages and $\delta$:

* `GapSigEufCma` term: $c_1 \cdot \varepsilon_{\mathrm{Sig}}$ with exact coefficient $c_1 = 2^{20}$ (or $\min(b.\mathrm{q\_on}, 2^{20})$ in general).
* X25519 collision term: $\bigl((2^{20} + 2^{25} + 2^{30} + 2^{30})(2^{20} + 2^{25} + 2^{30} + 2^{30} - 1) + 2^{30}(2^{30} - 1)\bigr) / 2^{251} = 5{,}640{,}433{,}955{,}807 / 2^{231} \approx 2^{-188.64}$ (or $\bigl(n_{\mathrm{dh}}(n_{\mathrm{dh}} - 1) + n_{\mathrm{send}}(n_{\mathrm{send}} - 1)\bigr) / 2^{251}$ in general, with $n_{\mathrm{dh}} = \min(b.\mathrm{q\_on}, 2{,}182{,}086{,}656)$ and $n_{\mathrm{send}} = \min(b.\mathrm{q\_on}, 2^{30})$).
* `KemShCr` term: $c_2 \cdot \varepsilon_{\mathrm{KemShCr}}$ with exact coefficient $c_2 = 2^{25} \cdot 2^{30} = 2^{55}$ (or $\min(b.\mathrm{q\_on}, 2^{25}) \cdot \min(b.\mathrm{q\_on}, 2^{30})$).
* Kyber-1024 key-collision term: $2^{25} \cdot (2^{25} - 1) / 2^{256} = 33{,}554{,}431 / 2^{231} \approx 2^{-206}$ (or $n_{\mathrm{spk}}(n_{\mathrm{spk}} - 1) / 2^{256}$ in general, with $n_{\mathrm{spk}} = \min(b.\mathrm{q\_on}, 2^{25})$).
* `GapDhWithSign` term: $c_3 \cdot \varepsilon_{\mathrm{GapDh}}$ with exact coefficient
  $c_3 = 2 \cdot \bigl(2^{25} \cdot (2^{20} + 2^{30}) + 2^{50} + 2^{59}\bigr) = 2^{60} + 2^{56} + 2^{51} + 2^{46} = \frac{17{,}441}{16{,}384} \cdot 2^{60} \approx 2^{60.09}$ ($\le 2^{60.1}$, or bounded by $O(b.\mathrm{q\_on}^2)$ when $b.\mathrm{q\_on} \ll 2^{25}$).
* KEM $\delta$-term (`kemDecapsFailureTerm deploymentSetup δ`): $2 \cdot 2^{30} \cdot 2^{25} \cdot \delta = 2^{56} \cdot \delta$.
  At the Kyber-1024 round-3 specification heuristic $\delta = 2^{-174}$, this equals $2^{-118}$
  exactly. The Main Theorem (`libsignal_cli_pq_secure_elf_binary`) instantiates $\delta$ via the
  proved bound `kyber1024_kem_delta_correct` ($\delta_{\mathrm{kem}} = \varepsilon + 2^{-112}$ under
  `KyberNoiseGap ε`, [DEV-PQ21](DEVIATIONS.md#dev-pq21)), giving $2^{56} \cdot \varepsilon + 2^{-56}$
  at `deploymentSetup`.

**Why $b.\mathrm{q\_total} = 2^{40}$ at `deploymentSetup` is asymptotic/qualitative in the standard model.**
The statistical collision terms above ($\approx 2^{-188.64}$ and $\approx 2^{-206}$) and the
decapsulation-failure term ($2^{56}\varepsilon + 2^{-56}$ under `KyberNoiseGap ε` via
`kyber1024_kem_delta_correct`, or $2^{-118}$ at the heuristic $\delta = 2^{-174}$) do not depend on
adversary running time, and the multi-user loss coefficients grow polynomially in the active/setup counts. However, the computational
assumption advantages $\varepsilon_{\mathrm{Sig}}, \varepsilon_{\mathrm{KemShCr}}, \varepsilon_{\mathrm{GapDh}}$
must be evaluated at the reductions' combined running time $t' \le t + \mathrm{stepCostBudget}(S, b)$.
Although quadratic tightening places $\mathrm{stepCostBudget} \approx 2^{96.00}$ at
$b.\mathrm{q\_total} = 2^{40}$ (and the composed end-to-end handshake reduction overhead
$\mathrm{bhAdapterCostBudget} + \mathrm{bhE2ECostBudget} + \mathrm{stepCostBudget}(S, b_{\mathrm{ki}}) \approx 2^{96.03}\text{--}2^{96.16}$,
§6) roughly $30$ bits below the $\sim 2^{126}$-step threshold where generic discrete
logarithm over Curve25519's prime-order subgroup ($p \approx 2^{252}$) succeeds with probability $1$,
randomized discrete-logarithm algorithms (e.g., Pollard's rho) give the conjectured best-known-attack
hardness estimate
$\varepsilon_{\mathrm{GapDh}}(t_{\mathrm{grp}}) \approx (t_{\mathrm{grp}}^2 + q_{\mathrm{ddh}}) / 2^{252}$
(a heuristic generic-attack estimate, not a proven standard-model bound).
Because `GapDhWithSign` is a standard-model assumption over a concrete primitive record `P`
(adversaries can evaluate X25519 locally within their $t'$ steps rather than solely via `primSpec`),
standard-model runtime accounting must allow $t_{\mathrm{grp}} \propto t'$. At $b.\mathrm{q\_on} = b.\mathrm{q\_total} = 2^{40}$
($t' \approx 2^{96.00}$), $(t')^2 / 2^{252} \approx 2^{-59.99}$, making
$c_3 \cdot \varepsilon_{\mathrm{GapDh}} \approx 2^{60.09} \cdot 2^{-59.99} \approx 2^{+0.10} > 1$
vacuous at $q_{\mathrm{total}} = 2^{40}$. One cannot plug runtime-independent
Curve25519 baselines such as $\varepsilon_{\mathrm{GapDh}} \le 2^{-127}$ or $2^{-120}$ into $b.\mathrm{q\_total} = 2^{40}$ at
`deploymentSetup` to claim 67-bit or 60-bit standard-model Curve25519 security.

**Standard-model Curve25519 accounting, within Lemma 1's one-key ROM game (`KeyInd1KeyRoAdvantage` / `HkdfRO`, $t' \ll 2^{120}$).**
At moderate query counts ($b.\mathrm{q\_on}, b.\mathrm{q\_total} \le 2^{24}$), active-count clamping in `pqxdhKeyIndBoundActive` and dynamic $M_* = \min(b.\mathrm{q\_total}, S.N_*)$ clamping in `stepCostBudget`, `bhAdapterCostBudget`, and `bhE2ECostBudget` keep the reduction overhead near $2^{64}$ even at `deploymentSetup` as well as at enterprise and team scales, so standard-model Curve25519 runtime accounting
($t_{\mathrm{grp}} \le t'$, without generic-group restrictions on X25519) gives non-vacuous Gap-DH
terms within Lemma 1's one-key random-oracle game (`KeyInd1KeyRoAdvantage` / `HkdfRO`; Lemma 1 still
models handshake HKDF as `HkdfRO` rather than in the ROM-free standard model, while Clause 2 of `CliPqxdhSecurityFor` additionally carries the
$+ 2 \cdot \varepsilon_{\mathrm{ro}}$ random-oracle-to-HKDF gap term under the `KeyIndRoGap` premise,
[DEV-CLI16](DEVIATIONS.md#dev-cli16), not bounded in Lean, whereas Clause 1 keeps
`KeyInd1KeyRealAdvantage` unbounded). The MAC-forgery supremum `macForgeryProb` and the five companion session forgery and spurious-step
suprema (`eps0IdealUnit`, `epoch0ChainForgeryTerm`, `spuriousStepTerm`,
`forgedEpochStartSpuriousStepTerm`, and `spkSwapSpuriousStepTerm`) restrict `c < 2^32` and
`ser.length < 2^32`, keeping all six non-vacuous in the random-function / ROM heuristic
($\approx 2^{-64}$ per uniform-key tag test, heuristic, not proved in Lean;
[DEV-LS23](DEVIATIONS.md#dev-ls23), [`TRUSTED_BASE.md`](TRUSTED_BASE.md) §4). Active-session
forgery in `SessionSecure`, `ModelSecure`, and `CliPqxdhSecurityFor` is therefore a proved guarantee
whose session multiplicities are listed in [DEV-LS31](DEVIATIONS.md#dev-ls31) and
[DEV-C14](DEVIATIONS.md#dev-c14) (scaling linearly in $q_{\mathrm{ep}}$ and $q$ as
$(92 \cdot q_{\mathrm{ep}} + 96) \cdot q \cdot 2^{-64}$ per promoted session for
$q_{\mathrm{ep}} \ge 1$ and $112 \cdot q \cdot 2^{-64}$ at $q_{\mathrm{ep}} = 0$, e.g.
$\approx 2^{-12.47}$ across $2^{25}$ promoted sessions at $q = q_{\mathrm{ep}} = 1{,}024$), bounded below by
Libsignal's protocol-inherent 8-byte wire-MAC floor ($\approx 4 \cdot q_{\mathrm{DR}} \cdot 2^{-64}$,
e.g. $2^{-38}$ at $q_{\mathrm{DR}} = 2^{24}$ and $2^{-32}$ at $q_{\mathrm{DR}} = 2^{30}$). Note
that hoisting MAC forgeries into buckets makes this session bound formally incomparable with the
earlier per-cell form rather than a strict tightening: it drops the MAC term from
$O(q_{\mathrm{ep}}^2 \cdot q^2 \cdot \mu)$ to $O(q_{\mathrm{ep}} \cdot q \cdot \mu)$ in exchange
for up to $1.95\times$ more PRF-PRNG terms, up to $1.74\times$ more FS-AEAD terms (for $q \ge 1$),
and a re-indexed, enlarged reduction family under `ratchetCostBudget q (qep + 1)`
([DEV-C14](DEVIATIONS.md#dev-c14)). Because
this 64-bit wire-tag floor grows with delivered/injected messages regardless of reduction
tightness, concrete security summaries should report two separate numbers rather than folding them
into one headline figure: (i) cryptographic (key-secrecy) bit security from the computational
reduction terms and 256-bit/Kyber statistical terms at runtime $t'$, and (ii) the 8-byte wire-MAC
authenticity bound as a separate function of receiver/delivery/epoch counts ($S.N_{\mathrm{recv\_tot}}$
in `pqxdhAuthBound`; $q_{\mathrm{Start}}$, per-session $q = qs(k)$, and $q_{\mathrm{ep}}$ in
[DEV-C14](DEVIATIONS.md#dev-c14)).

## 4. Structural properties of the reductions

Each reduction in `KeyIndCostedReductionFamily S` is a first-order syntax tree (`CostedReduction` or
`TwoStageCostedReduction` in
[`ReductionDsl/Core.lean`](../Specifications/Reductions/ReductionDsl/Core.lean)):

* Black-box and single-run: `CostedReduction.eval` runs `A` once through `simulateQ` without
  inspecting `A`'s code or internal state, and `TwoStageCostedReduction.eval1` / `eval2` pauses `A`
  at most once and resumes its saved continuation once without rewinding or cloning.
* Uniform in `P` and `A`, indexed by `(S, b)`: in `PqxdhKeyIndSecureδ S`, the witness `∃ R` precedes
  `∀ (P : Primitives)` and `∀ (b : QueryBudget) (A : BoundedAdv … b)`. The program cannot embed
  `P`-dependent advice and reaches `P` only via `primSpec` and `sigAndDdhSpec` queries. Because
  `ReductionDsl` loops carry static bounds computed from `(S, b)`, `R` is parameterized by `S` and
  indexed by `b` (`QueryBudget → CostedReduction …`), so different budgets `b` may select different
  syntax trees, each obeying `stepCostBudget S b` and the query and block-size bounds.
* Syntactic costs and `noncomputable`: `totalCost` is a structural recursion on `Expr` and `Comp`
  syntax. Lean's `noncomputable` keyword on real-valued bounds or `ProbComp` distributions only
  suppresses Lean native code generation and has no bearing on `ReductionDsl` program syntax or cost
  bounds; `Expr` has no constructor for `Classical.choose` or arbitrary Lean functions.
* No hidden constants: natural-number literals `.nat n` and constant-operand `mulK k`, `divK k`,
  `modK k` pay `bits n = Nat.log 2 n + 1`, general variable multiplication `x * y` and
  exponentiation are absent, `add` grows bit-length by at most `1`, bounded list append `appendL K`
  pays `K` beyond its operands, byte literals `BOp.lit w v` in `CostedTables.lean` pay
  `w + v.length`, and index sampling `PSamp.index N` pays `bits N + 1`. Together with
  `ops_sizeHonest` and `samp_sizeHonest`, the size theorem (`Comp.fits_eval`, exposed via
  `outputSizeBudget S b ℓ`) prevents low-cost programs from building large values.

## 5. Trust caveats

Two boundaries separate the machine-checked cost and query theorems from a physical running-time
statement:

* Trusted tables, weights, and game definitions: the headline types fix the shared operation table
  `pqAtomicOps`, interfaces `pqPrimIface` and `pqSigAndDdhIface`, uniform samplers `pqAtomicSamplers`, and
  game codec `pqKeyIndCodec S`
  ([`AtomicOps.lean`](../Specifications/Reductions/ReductionDsl/AtomicOps.lean) and [`TargetCodecs.lean`](../Specifications/Reductions/ReductionDsl/TargetCodecs.lean)), along with
  the query weights `primIfacePrimQueryWeight`, `chalIfacePrimQueryWeight`,
  `chalIfaceSigQueryWeight`, `chalIfaceDdhQueryWeight`, and `samplerZeroQueryWeight`
  (`CostedBudgets.lean`). Lean checks size honesty and the budget inequalities against those
  definitions, while human review checks that each declared op cost, sampler width, codec reshaping,
  query weight, and game specification reflects the intended cryptographic model (see
  [`TRUSTED_BASE.md`](TRUSTED_BASE.md) and [`DEVIATIONS.md`](DEVIATIONS.md)).
* Reader-supplied cost model for `A` and the primitives: because `A` is bounded only by its oracle
  queries, Lean bounds the reduction's added syntactic overhead (`stepCostBudget`,
  `outputSizeBudget`) and oracle call counts (`q_sig`, `q_ddh`, `q_prim`), not `A`'s own internal
  computation or the concrete cycle count of evaluating `P`'s primitives. Mapping
  $\mathrm{time}(R_i(A)) \le \mathrm{time}(A) + \text{overhead}$ to RAM instructions or circuit
  gates uses the reader's execution model for `A` and `P`.

## 6. Multi-session composition, compiled-binary headlines, and further pointers

Sections 1 through 5 trace Lemma 1 (`headlineδ` / `PqxdhKeyIndSecureδ`). Lemma 2 (`session_secure` /
`SessionSecure` in [`StatementSession.lean`](../Specifications/Session/StatementSession.lean)),
Lemma 3 (`model_secure_costed` / `ModelSecure` in
[`StatementModel.lean`](../Specifications/Composition/StatementModel.lean)), and the compiled-binary
headlines (`libsignal_cli_pq_binary_correct` and `libsignal_cli_pq_secure_elf_binary` in
[`Main.lean`](../Theorems/Main.lean), stated via `CliPqxdhSecurityFor` in
[`StatementPqElf.lean`](../Specifications/LibsignalCli/StatementPqElf.lean) and
[`CliBinaryPq.lean`](../../LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean)) follow the same pattern:
adversaries are query-bounded `OracleComp` computations, advantage bounds are closed expressions in
assumption advantages and statistical terms, and reductions are cost-bounded `ReductionDsl`
programs.

* Lemma 3 (`ModelSecure`, multi-session model composition): composes the one-key standard-model
  handshake `ki := pqxdhKeyIndImpl1KeyReal S P` with up to `qStart` Double Ratchet + SPQR V1
  sessions (`modelIface` in [`ModelIface.lean`](../Specifications/Game/ModelIface.lean); the
  lazy-to-exact prefix key-sampling equivalence is proved internally rather than assumed as a
  premise). It existentially quantifies a `(b, qStart, qDR, qInst)`-indexed reduction family
  `reds : CompositionCostedReductionFamily S ℓ P C K qep decT encT`
  ([`StatementPqReds.lean`](../Specifications/Reductions/Pqxdh/StatementPqReds.lean), instantiated at
  `qInst := Finset.sup (Finset.range qStart) qs`) over the
  shared 32-byte block signature `atomicSig ℓ Pt` (`AtomicSort.blocks ℓ Pt`, where `.plain` has size
  `ℓ / 32 + 1`), the single-step primitive table `atomicE2EOps`, the coin-only uniform sampler table
  `atomicBaseSamplers`, and `e2eTargetGameCodec` (`e2eGameCodec`, `codecCost = 64`) in
  [`AtomicOps.lean`](../Specifications/Reductions/ReductionDsl/AtomicOps.lean), [`TargetCodecs.lean`](../Specifications/Reductions/ReductionDsl/TargetCodecs.lean),
  and [`StatementBinaryHarnessCore.lean`](../Specifications/Game/StatementBinaryHarnessCore.lean),
  with the 25,000-step Double Ratchet and SPQR symmetric-chain skips unpacked into bounded
  `ReductionDsl` loops. Conjunct 1 (`CompositionCostedReductionFamilyBounded P C K qep decT encT reds`)
  holds unconditionally for all `P`, while `SignalPqxdh.WellFormedPrimitivesδ P` scopes Conjunct 2
  (the query bounds `keyIndReductionBudget S qStart b` on `advK` and `qs k` on `prefixRed`, and the `ComposedAdvantage` security bound).
* CLI and ELF security (`CliPqxdhSecurityFor`): specializes to `CliPqxdhElfSecure` (the
  security conjunct of the Main Theorem `libsignal_cli_pq_secure_elf_binary`, with
  `exc? := some (CliReachesSampleNttStuckElf elf addrs)`, DEV-CLI22) and to the model-run
  statement `LibsignalCliPqSecure` (with `exc? := none`). Four existential `ReductionDsl` packages
  connect the binary game to the leaf
  assumptions, with closed-form polynomial step-cost budgets in
  [`StatementBinaryHarnessCore.lean`](../Specifications/Game/StatementBinaryHarnessCore.lean),
  [`CostedBudgets.lean`](../Specifications/Pqxdh/Security/CostedBudgets.lean),
  [`StatementSpkModel.lean`](../Specifications/Session/StatementSpkModel.lean), and
  [`LibsignalBound.lean`](../Specifications/Session/ACD19/Ratchet/LibsignalBound.lean):
  * `L_cli : CliToModelAdapterProg` over `atomicAdapterOps`, `e2eBhAdapterIface` (`e2eAdapterIface`,
    `Samplers.empty`), and `e2eBhAdapterCodec` (`e2eAdapterCodec`, `codecCost = 64`), preserving
    every query budget 1-for-1 and bounded unconditionally by `CliAdapterCostBounded` against
    `bhAdapterCostBudget S b qStart qDR ℓ = 2 ^ 6 * (b.q_total + qStart + qDR + 1) * (2 * M_id + 56 * M_spk + 3 * M_opk + 2 * M_send + 2 * Nat.log 2 S.N_id + 8 * Nat.log 2 S.N_spk_tot + 2 * Nat.log 2 S.N_opk_tot + 2 * Nat.log 2 S.N_send_tot + 4 * qStart + 4 * ℓ + 2 ^ 12)`
    (clamping dynamic table sizes at `M_* = min b.q_total S.N_*`);
  * `reds : CompositionCostedReductionFamily` (instantiated at
    `Re := reds P Wp.C Wp.Q.K qep decT encT b qStart qDR (Finset.sup (Finset.range qStart) qs)`), packaging the 1-stage `kindRed` to
    `e2eKeyIndTargetIface S ℓ Pt` and the 2-stage `prefixRed k` to `e2eSessionTargetIface ℓ Pt` over
    `e2eTargetGameCodec S ℓ Pt` (`codecCost = 64`), bounded unconditionally for all `P`
    (`CompositionCostedReductionFamilyBounded`) against
    `bhE2ECostBudget S b qStart qDR qInst qep ℓ = 2 ^ 10 * (b.q_total + qStart + qDR + 1) * (b.q_total + nOpk + nInst + qInst + Nat.log 2 qep + 10 * (nId + nSpk + nSend + nRecv) + maxForwardJumps + ℓ + 1) + 2 ^ 13 * nInst * (nId + nSpk + nRecv + 1)`
    (`nId`, `nSpk`, `nOpk`, `nSend`, `nRecv` `= min b.q_total S.N_*`, `nInst = min qStart nSend`);
  * `RK : KeyIndCostedReductionFamily S` at `b_ki = keyIndReductionBudget S qStart b`
    ($b_{\mathrm{ki}}.\mathrm{q\_total} = b.\mathrm{q\_total} + 2 \cdot \min(q_{\mathrm{Start}}, S.N_{\mathrm{send\_tot}})$ and
    $b_{\mathrm{ki}}.\mathrm{q\_on} = b.\mathrm{q\_on} + 2 \cdot \min(q_{\mathrm{Start}}, S.N_{\mathrm{send\_tot}})$);
  * `D : SessionCostedReductionFamily Pt ℓ` (Lemma 2), whose Double Ratchet + SPQR V1 per-session reduction stack
    bounds `Fig8CostedReds` and the promoted `SessionCostedReductions` under
    `ratchetCostBudget q (qep + 1)` (`ratchetCostBudget q qep = 2 ^ 12 * (q + 1) ^ 2 * (maxForwardJumps + bits qep)`), the four two-stage FS-AEAD hybrid reductions (`prgRedZero`, `multiRed`, `prgRedAuth`, `multiRedAuth`) under
    `fsRatchetCostBudget (min (2 * q) (q + 2)) (qep + 1)`, the lightweight FS-AEAD adapter reductions under
    `ratchetFsAdapterBudget (min (2 * q) (q + 2)) (qep + 1)`, and the leaked-SPK / Hop-2 bundle `SpkCostedReds` (`spkCostedBounds` in
    [`StatementSpkModel.lean`](../Specifications/Session/StatementSpkModel.lean)) under
    `spkLeakRedUBudget q = 16 * (q + 2)` and `spkHopBudget q qep ℓ = min (spkTier1Budget q qep) (spkTier2Budget q qep ℓ)`
    (compared to the earlier per-cell session bound, the bucket-partitioned bound drops the MAC term from `O(qep²·q²·μ)` to `O(qep·q·μ)` while enlarging/re-indexing `D` and increasing PRF-PRNG and FS-AEAD term counts by up to `1.95×` and `1.74×` for `q ≥ 1`, making the two statements formally incomparable; [DEV-C14](DEVIATIONS.md#dev-c14)).

For symbol-by-symbol mappings and language details, see [`GLOSSARY.md`](GLOSSARY.md),
[`REDUCTION_DSL_TUTORIAL.md`](REDUCTION_DSL_TUTORIAL.md), [`PQXDH.md`](PQXDH.md), and
[`docs/PAPER_MAP.md`](../../docs/PAPER_MAP.md).
