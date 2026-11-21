# X151 live research, scope and non-results

Searches and repository audit performed in this session; no exhaustive survey claimed.
No Lean/Lake/Docker executable was found. Node, TypeScript/esbuild, Vite, Python,
git and gh were actually used. No independent agent or model endpoint was run.
Python wire reconstruction is an independent implementation, not an independent
human review or native-chat experiment. CPU profiling is not simulation.

## Literature interfaces (last twenty years where dated)

- Gavalakis/Kontoyiannis (2020), https://doi.org/10.3390/e22060705:
  conditional compression asymptotics for stationary ergodic source/side-information
  pairs with side information available at both ends. This does not grant a finite
  self-contained o200k token bound or a behavioral LLM decoder. Our side information
  must be transmitted or derived unambiguously from the same wire.
- PathPiece (2024), https://arxiv.org/pdf/2402.18376, and optimal segmentation (2025),
  https://aclanthology.org/2025.loreslm-1.24.pdf: segmentation optimization is distinct
  from changing the text the hosted tokenizer actually receives. We cannot submit
  an arbitrary cheaper segmentation to a basic chat UI. Neither result proves
  unchanged model performance from fewer tokens.
- LogBlock (2021), https://users.encs.concordia.ca/~shang/pubs/Kundi_TSE_2021.pdf:
  preprocessing can worsen compression at small blocks; reported log-byte metrics
  do not include our readable in-band protocol. LogReducer (2021),
  https://www.usenix.org/system/files/fast21-wei.pdf: templates, correlated numeric
  variables and deltas followed by LZMA; useful mechanisms but not native chat wires.
- Sadié, Metcheka, Ndoundam (2024), *Two High Capacity Text Steganography Schemes
  Based on Color Coding*, https://link.springer.com/chapter/10.1007/978-3-031-63110-8_14
  (live search result 5): permutation/numeration embedding uses colored cover text.
  Capacity is not net compression and color side information is not free text.
  Related open PDF: https://arima.episciences.org/14255/pdf (search result 2).
- *Steganography 19 — The Order of the Code* (2010),
  https://www.codeproject.com/Articles/62290/Steganography-19-The-Order-of-the-Code
  (search result 4): arbitrary ordered objects carry a factorial number of states.
  This directly defeats any claim that DIATHESIS invents permutation embedding.
  The repository-specific experiment is embedding into existing independent grammar
  rule order. VALENCE already uses permutation ranks; METATAXIS changes tape order.
  Search result excerpts were inspected; no claim of full paper proof replay.
- ISBN check digit: http://cms-content.bates.edu/prebuilt/wg4n46final.pdf (2005,
  outside requested twenty-year window, standard background only). Already rejected
  in x55/x56, not a new codec. Goodbooks rounded identifiers are unsuitable original
  ground truth: https://zenodo.org/records/23413348. Never fabricate missing digits.

## Frontier-lab claims, individually scoped

These are claim assessments, not proof certification or an exhaustive list of
ALL new mathematics. The requested global exhaustive audit was not completed.

| Claim/source | What was examined | Exact remaining gap / codec relevance |
|---|---|---|
| Anthropic FLT, https://www.anthropic.com/research/formalizing-fermats-last-theorem and https://github.com/anthropics/fermats-last-theorem | Prior X150 source/Git inspection, retained here | Formalization of an already proved theorem is not a new mathematical solution. No local Lean replay. No compression lemma transferred. |
| OpenAI science release, https://openai.com/index/building-scientific-understanding-with-academic-communities/ | Prior X150 materials, including `../x150/receipts/openai-079.md` | Local-smoothing hypotheses and mathematical statement equivalence require expert checking. A static SAT proposition is not a proof. Withheld QCD material cannot be verified here. |
| OpenAI mathematics release, https://openai.com/index/sharing-ai-progress-in-mathematics/ | New X151 live search | Broad result/formalization claims not individually replayed. No inference of universal compression. |
| DeepMind AlphaProof Nexus, https://arxiv.org/html/2605.22763v1 | New X151 live search reports 9 of 353 Erdős problems | Formal artifacts may certify encoded statements; historical equivalence and build replay remain unverified. No finite token/readability consequence established. |
| Double AI high-girth graphs, https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory | Prior X150 claim inspected; PDF fetch failed | Explicit construction/Lean claim, not locally verified. No evidence that its graph family optimizes grammar tape tokens. |
| Other frontier labs | No exhaustive enumeration or proof audit | Unknown, not negative evidence and not certification. |

## Applicable elementary bound, not an imported breakthrough

For n distinct independent rules all n! orders preserve the grammar expansion.
Their order can carry at most log2(n!) bits. Twelve rules provide 479001600 orders,
so all 28-bit (seven hexadecimal digit) values can be represented. The reader takes
rank modulo 16^7. This capacity assumes unique keys, a shared canonical ordering,
known window boundaries, and independence. The full protocol and changed token
adjacencies still cost tokens. Thus positive capacity is not positive net saving.
For all byte strings of fixed length N, injective lossless compression cannot make
every string shorter in bytes: fewer shorter outputs exist than 256^N inputs.
This says nothing about impossibility of improvements on these 29 structured lanes.
