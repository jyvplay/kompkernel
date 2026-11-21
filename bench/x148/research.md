# X148 research notes — live sources, individually inspected to the depth stated

Fetched this turn (full text unless noted):

- BiYacc 2015 (CEUR Vol-1396 p43): reversible parser/printer pairs; `get:S→V`,
  `put:S×V→S`; PutGet/GetPut laws preserve layout through the ORIGINAL source.
  Relevance: prior art for exact round-trip text transforms; it is about
  grammar-directed re-synthesis, not token compression, and gives no
  source-free decoder guarantee for our contract line.
- LTSC 2025 (arXiv 2506.00307): LZ77-like repeated token sequences become
  meta-tokens with a prepaid dictionary; ~27%/18% average gains with attention
  estimates 47%/33%. Requires added vocabulary and fine-tuning — incompatible
  with the unchanged-native-chat constraint; recorded as a boundary, not a
  candidate.
- Pod::Text::Overstrike (metacpan): the actual renderer of our fixtures; bold
  `c BS c`, underline `_ BS c`, outermost wins. The fixture manuals are real
  installed-module renders, not synthetic prose.
- DoubleAI girth-8/5 (web page full text): prime-power q explicit (q³+1)-regular
  families, girth ≥ 8/5·log_{q³} n − O(1); determinant certificate
  det(w−I) ≠ 0; claims Lean+Mathlib. Primary PDF fetch FAILED (transport) —
  the Lean artifact is NOT examined; claim stays unverified by us.
- DoubleAI zk-ECDSA (web page + repo README via GitHub API): SP1/Groth16
  existence/cost proof for a 993,181-gate / 1205-qubit circuit; circuit itself
  private; verification needs SP1 + ~11 GB + Rust (unavailable here). Audited
  to README depth only, including the Trail of Bits forgery history of the
  Google predecessor — treated as an UNVERIFIED claim.
- OpenAI `Computation.lean` (GitHub blob, provenance in
  `receipts/research-provenance.json`): `Trace`/`RunsIn`/`CostedTrace` —
  state-dependent operation costs become target runtime bounds only under an
  explicit per-state cost hypothesis; useful vocabulary, no codec mechanism.
- Anthropic E3 failure memo (`receipts/anthropic-failure-memo.diff`): engine
  memo of failed defeq pairs per declaration — validates the general pattern
  "exact failure caches are engine-grade optimizations"; our exact-value memos
  are the same genus; no new codec.
- Axiom dihedral monotonicity (`receipts/axiom-dihedral-main.lean`): orbit-wise
  rate interpolation; hypotheses explicit (rate functions constant on inverse
  orbits). No interface to compression found.
- DeepMind PQXDH headline (`receipts/deepmind-headline.lean`): δ-correct KEM
  failure terms enter the bound by union bound over sessions; conditional ROM
  statement shape. No interface to compression found.
- Search-only, not fetched: AACL 2026 strategic deletion (lossy by design);
  Z-token learned codes (fine-tuning required). Neither is admissible.

## Boundary conclusion

No fetched source yields a new admissible mechanism for byte-perfect,
native-readable, no-new-vocabulary compression beyond what the stack already
has. The one genuinely new in-stack mechanism this turn is EPITYPOS (overstrike
style-stack factorization of REAL renderer output), with PERIBALLON as an
opt-in environment-read scope experiment and two falsified speed candidates.
