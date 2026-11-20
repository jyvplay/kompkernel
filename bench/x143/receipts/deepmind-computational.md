# Computational Security Proof

This is the entry document for the computational security proof of libsignal's one-to-one session.
The arguments are based on ACD19: Alwen, Coretti, Dodis, "The Double Ratchet: Security Notions,
Proofs, and Modularization for the Signal Protocol" (ePrint 2018/1037, version 2020-02-21). Paper
items are cited as "ACD19 Thm 6", "ACD19 Fig. 2", "ACD19 §5.2".

For the PQXDH handshake and end-to-end composition, items are also cited from
FG24: Fiedler, Günther, "Security Analysis of Signal's PQXDH Handshake" (ePrint 2024/702); BJKS24:
Bhargavan, Jacomme, Kiefer, Schmidt, "Formal verification of the PQXDH Post-Quantum key agreement
protocol for end-to-end secure messaging" (USENIX Security 2024) and its CryptoVerif model
`PQXDH.m4.ocv`; and Signal's "The PQXDH Key Agreement Protocol" (Revision 3, 2024). Only the
classical parts of FG24 (Thm 5.1) and BJKS24 (Thms 2, 5, 6) are used; their post-quantum theorems
(FG24 Thm 5.2, BJKS24 Thm 3) have no counterpart here ([DEV-PQ19](DEVIATIONS.md#dev-pq19)).

| Document | What it gives you |
|---|---|
| this file | where things are, and an index of the other documents |
| [`READING_THE_THEOREMS.md`](READING_THE_THEOREMS.md) | how to read the Lean security statements in concrete-security notation, worked through on Lemma 1 (`PqxdhKeyIndSecureδ`) |
| [`TRUSTED_BASE.md`](TRUSTED_BASE.md) | the three tiers of the trusted base, with exact numbers and a reading list |
| [`DEVIATIONS.md`](DEVIATIONS.md) | every place where the Lean differs from ACD19, one entry per ID |
| [`docs/PAPER_MAP.md`](../../docs/PAPER_MAP.md) | the project paper, section by section, with the Lean names that formalize it |
| [`GLOSSARY.md`](GLOSSARY.md) | paper notation, libsignal terms, Lean notation, and older project names |
| [`REDUCTION_DSL_TUTORIAL.md`](REDUCTION_DSL_TUTORIAL.md) | the reduction DSL `ReductionDsl`: syntax, costs, worked examples, proof tips |
| [`PQXDH.md`](PQXDH.md) | the libsignal PQXDH code paths the model follows, and the PQXDH bound evaluated term by term at deployment parameters |

Where things are:

| Path | Contents |
|---|---|
| `Computational/Theorems/Lemmas.lean` | Lemmas 1–3 of the paper (PQXDH, single session, composition) and `kyber1024_kem_delta_correct` (concrete Kyber-1024 decapsulation-failure bound) |
| `Computational/Theorems/Main.lean` | Lemma 4 (the binary refines the model) and the Main Theorem (Theorem 2 of the paper), in lake library `CliElfLib` |
| `Computational/Specifications/LibsignalCli/StatementPqElf.lean` | the statement of the Main Theorem (`CliPqxdhBinaryCorrectAndSecure`); Lemma 4's (`CliPqxdhBinaryCorrect`) is in `LibsignalBinary/Specifications/SignalSession/CliBinaryPq.lean` |
| `Computational/Specifications/` | the game, assumptions, reductions, handshake and session specifications |
| `Computational/Proofs/` | the proofs (checked by Lean; not part of the trusted base) |
| `Computational/Tests/` | non-vacuity, sanity, consistency and known-answer tests |

Please see the associated paper, `docs/PAPER_MAP.md`, and the html web site for a gloss of the theorems.
