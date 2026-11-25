# X180 research and novelty triage

Cutoff: **2026-11-14**, the date supplied for this session. A condensed handoff
incorrectly asserted November 25. Search results include November 20–24 reports;
those are outside the cutoff and cannot establish an event as of this session.
No RH proof, lab proof or theorem kernel was independently validated here.

## Recent compression literature (within five years)

Primary pages actually fetched this turn:

- Akagi, Okabe, Mieno, Nakashima, Inenaga, *Minimal Absent Words on Run-Length
  Encoded Strings*, CPM 2022, DOI 10.4230/LIPIcs.CPM.2022.27.
  https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.CPM.2022.27
  The abstract describes O(m)-space reporting of MAWs in O(|MAW(T)|) time for
  RLE size m; one of five MAW classes has size unbounded by m. This is a string
  data-structure result, not a complete-token native-chat codec theorem.
- *Computing Minimal Absent Words and Extended Bispecial Factors with CDAWG
  Space*, IWOCA 2024, DOI 10.1007/978-3-031-63021-7_25.
  https://link.springer.com/chapter/10.1007/978-3-031-63021-7_25
  Abstract/preview fetched, not the paywalled full proof. Reporting uses O(e_min)
  space and O(|MAW(S)|) time, with e_min the smaller forward/reverse CDAWG size.
  APOUSIA does not implement that data structure or inherit its bounds.
- Rahman et al., *An Enhanced Text Compression Approach Using Transformer-based
  Language Models*, arXiv:2412.15250v1, 2024.
  https://arxiv.org/html/2412.15250v1
  Opening material fetched: reported BLEU 27.31/25.78/50.45 and reconstruction
  by trained transformers do not establish original-byte recovery. Calling LZW
  lossless inside a pipeline does not certify that pipeline's preprocessing and
  learned reconstruction. Modal shortcut: semantic restoration ≠ byte equality.

Earlier current-turn searches also found *Language Modeling Is Compression*,
ICLR 2024 (2309.10668), and *On the compressiveness of BWT* (2411.11298).
Search-only material is not a proof audit. Shared-model arithmetic coding and
BWT measure separations do not establish direct basic-chat decoding. Classical
antidictionary coding (Crochemore/Mignosi/Restivo/Salemi, 1999/2000) is ancestry,
not within-five-years novelty. No new information-theoretic theorem is claimed.

## Mechanism comparison

Focused source inspection, not exhaustive semantic equivalence proof:

| Existing mechanism | Difference from APOUSIA |
|---|---|
| DIADOCHI | Transmits ordered successor queues and consumes a literal at every transition. APOUSIA transmits a constant successor rule once and omits those occurrences entirely; count terminates cycles. Both are finite-context mechanisms. |
| MONODROMOS | Transmits edge multiplicities and proves a unique complete walk; APOUSIA uses deterministic local rules plus residual order, no Euler solver. |
| STOIBAS | Breadth-first JSON nodes, not sequential field prediction. |
| LEXARITHMOS | Fixed numeral grammar, not learned in-band context rules. |
| KRYPTOLYSIS | Reversible alphabet rotation, no omission. |
| DEIKTIS | Suffix-context copy pointer/length, not constant successor rules. |
| SYMFRAZ | Sorts numeric streams by frozen skeleton context; no forced emissions. |
| KYKLOS | Marker-triggered cyclic word dictionaries; requires marker events and cursor, unlike output-context-triggered omission. |
| METRIDA | Unique assignments constrained by line length sums, not deterministic transitions. |
| KLADOS | Adaptive BST addresses with literal updates; no finite-context omission. |
| LZ/grammar family | Prior search inspected HYLE/LETHE and identified numerous existing LZ/grammar modules; APOUSIA still has classical finite-context/prediction ancestry. |

A new source module and a distinct wire grammar are established. Novelty against
ALL semantic variants in the stack is not established; the acceptance gate stays
open rather than treating a new Greek name as discovery.

## Individual mathematics interfaces

Fresh live search used `OpenAI Anthropic Google DeepMind DoubleAI formal
mathematics Lean proof 2026 November`. It returned inconsistent/secondary and
post-cutoff RH reports; these are leads, not certified evidence. The November 11
Science report on Yang–Mills is also secondary, not a locally replayed certificate:
https://www.science.org/content/article/ai-rivals-tackle-one-physics-deepest-mathematical-challenges

The concrete separately tracked interfaces remain those pinned in X179's
`receipts/research-artifacts.json` and discussed in its research.md:
OpenAI SqrtLogSpace counting-program existence versus transport lemma;
Anthropic formal-math resource definitions; Anthropic FLT delegated import path;
DoubleAI All63 encoding equivalence plus certificates versus separate witness;
Google DeepMind AlphaProof positive limiting density versus limsup;
Harmonic positive-natural IMO formulation; ByteDance integer formulation.
Those prior source inspections are **not fresh kernel replays in X180**. No
individual project's theorem has been imported as a compression proof, and no
exhaustive all-labs investigation has been completed. The RH claim requires a
primary pinned artifact, exact theorem/axiom comparison and actual kernel replay
before any local verification claim, regardless of press reports.
