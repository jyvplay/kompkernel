# X160 live source follow-up (2026-11-14)

This is a bounded audit, not ALL problems solved by any lab. GitHub source
pins and SHA256s: research/provenance.json. Lean/lake absent; no kernel replay.

## Compression: fresh query and different publisher

Díaz-Domínguez, *Efficient Terabyte-Scale Text Compression via Stable Local
Consistency and Parallel Grammar Processing*, SEA2025,14:1–20,
DOI10.4230/LIPIcs.SEA.2025.14. Publisher landing page and abstract fetched:
https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.SEA.2025.14 .
Stable local consistency lets independently parsed strings produce compatible
core topology; grammars can then be merged. The abstract's genomic scale and
85x ratio are publisher reports, not reproduced experiments. Grammar nonterminals
and binary storage are not a basic-chat interface. Relevant testable transfer:
preserve deterministic rank/order and grammar identity before parallelization,
not infer BPE savings from bits/symbol. HAPLOGRAPHE instead exploits an explicit
format equality: one path in four roles. Classical template coding, no new
compression theorem or exclusive AI discovery.

Fresh search also returned Varki/Gagie/Boucher, *Efficient Grammar Compression
via RLZ-Based RePair*, CPM2026 DOI10.4230/LIPIcs.CPM.2026.5 (search-only; not
paper-audited), and Telegraph English arXiv2605.04426 (semantic rewriting).
Semantic QA accuracy cannot establish byte-perfect inverse; no reported ratios
from either are imported into this experiment.

## OpenAI: advance one imported dependency

Freshly fetched pinned WalkOutput.lean, rather than rereading the terminal
wrapper. `solve_spec` states substring coverage and length <=2*input weight.
Its proof uses histogram equality, record supply, tour coverage, and charge sum;
`Computable.downWords_length` identifies the budget. This exposes obligations
behind the terminal theorem, not a replay of their import closure. The objective
is symbol count on a finite list, not the complete o200k contract. Neither its
factor nor polynomial certificate establishes our parent search runtime.

## Anthropic: Mazur branch split

Fresh pinned S_FreyPackage_Mazur_Frey.lean inspected at its final proof, with
FreyPackage hypotheses inherited from X159. `solution` splits a mod8=3 versus
its negation. The former delegates to Mazur_Frey_of_a_mod_eight; the latter
contradicts a Galois-stable cofixed line by prime exponent cases {5,7,13},11,
and >=17. This is a precise dependency boundary; we have not checked imported
cofixed-line exclusions or built Lean. No implication for text compression.

## Google: support rank is NOT arithmetic tensor equality

Fresh pinned verification_support_rank.ipynb contains a rank24 <2,2,7>
construction. `verify-support.py` parses literal arrays (does not execute
notebook code) and independently sums all784 tensor entries using Python
integers. Receipt: support-rank.json. Values are -8,0,8; all28 target entries
are nonunit. Thus support equality passes while arithmetic tensor equality
fails—an executable example of why changing the theorem's predicate matters.
No minimality, speed or BPE claim. Original license notices retained.

## DoubleAI: new artifact, explicitly conditional SAT boundary

Fresh double-ai/double-check README and pinned ChessProof/Final.lean fetched.
The public README claims at most63 moves if all legal moves give check and
at most364 consecutive checking moves. It explicitly discloses one UNSAT axiom
per SAT instance:7,224 and6,921, respectively. Final.lean delegates to All63 and
C364 final theorems. Publisher/checker claims were not replayed here; README
estimates25GB for Lean and ~120 core-hours for each all-instance re-solve.
This improves on treating a press announcement as a proof audit. The earlier
girth PDF remains unretrieved; it is not replaced by the chess theorem.

## Others / scope

The independent academic SEA source is examined above; no unexamined lab is
called verified to fill a list. Private lab internals, future results, native
model trials, and universal compression claims remain outside access. The
transfer is verifier design: exact target predicate, source ground truth,
complete cost, explicit dependencies, and re-running gates after repair.
