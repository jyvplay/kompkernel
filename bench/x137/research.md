# X137 bounded live research audit — 2026-11-14

This is not an exhaustive audit of ALL lab mathematics. No Lean, SAT certificate,
or paper theorem was built locally. Live searches and primary page retrieval
were executed; reading an abstract or a README is not kernel verification.
No result below supplies a theorem of native LLM decompression or token savings.

## Layout / representation

- Matsuda and Wang, *FliPpr: A System for Deriving Parsers from Pretty-Printers*,
  ESOP 2013, pp.101–120, https://link.springer.com/chapter/10.1007/978-3-642-37036-6_6
  (search result only). Parser inversion is relevant design ancestry, not novel
  compression. Ordinary value roundtrip does not imply arbitrary source-byte roundtrip.
- Matsuda and Wang, *Embedding Invertible Languages with Binders: A Case of the
  FliPpr System*, Haskell 2018, pp.158–171,
  https://research-information.bris.ac.uk/en/publications/embedding-invertible-languages-with-binders-a-case-of-the-flippr-/
  (primary metadata/abstract fetched). DOI 10.1145/3242744.3242758. Tagless-final
  unembedding and Haskell interoperability do not establish compression rates.
- Existing repository WRAPCANON already uses length overflow as a marker-free
  trigger plus literal escapes. KREMA does NOT invent that mechanism. Its added
  layout operation is the literal prefix/current-column plus independent hanging
  margin. STICHOS/PLATOS/PTYCHE/STELI must remain comparators, not be erased from
  novelty accounting. This is standard predictive layout coding, not a new genus.

## Individually bounded lab checks

1. **OpenAI:** refreshed `openai/math` history via GitHub API; exact fetched text
   saved in `receipts/openai-history.md`, source
   https://github.com/openai/math/blob/main/history.md . Corrections/withdrawals
   matter: previous X136 audit counted three withdrawals and fourteen repairs.
   No theorem build or universal correctness claim made here.
2. **Anthropic:** fetched primary `3sum-apsp/README.md` from
   https://github.com/anthropics/formal-math/tree/main/3sum-apsp , saved as
   `receipts/anthropic-3sum.md`. It explicitly distinguishes word-RAM program
   results, mathematical identities, conditional running-time implications,
   and unproved real-input running-time claims. Headline integer bounds include
   3SUM O(n^1.9992), min-plus/APSP O(n^2.99942). Challenge `sorry` placeholders
   are not automatically missing library proofs; statement-to-proof alignment
   is a separate gate. README inspection is not our verification of that gate.
3. **Gemini/AlphaEvolve:** primary opening portion of
   https://arxiv.org/html/2608.16884v1 (2026) fetched. Reports matrix multiplication
   exponent below 2.371177 versus 2.371339, with both numerical optimization and
   AlphaEvolve contributions. Certification sections were not replayed/read in
   full. An asymptotic exponent is not measured speed for this tokenizer/stack.
4. **doubleAI:** opening portion of October 2026 primary
   https://www.doubleai.com/papers/girth85.pdf fetched. Claims explicit graph
   families of degree q^3+1 and girth at least (8/5) log_(q^3)(n)-O(1).
   Arithmetic/certificate arguments were not independently verified. Earlier
   X136 python-chess check of a 190-ply/63-check finite witness remains only a
   finite witness, not their universal chess bound or this unrelated graph proof.
5. **Axiom:** primary README freshly saved in `receipts/axiom-mordell.md` from
   https://github.com/AxiomMath/Mordell . Claims Faltings/Mordell formalization
   in Lean 4.35.0, no sorry/native_decide/added axioms; states finite rational
   points for smooth projective geometrically integral curves of genus >=2
   over number fields. These are repository claims, not a local build. Does not
   provide an effective point bound or a text compression algorithm.
6. **Harmonic/OpenAI:** fresh search for Aristotle formalization scope returned
   the primary 2026 writeup https://arxiv.org/pdf/2601.07421 . Search excerpt
   distinguishes Jan 4 partial/ambiguous interpretation of Erdős #728 from the
   intended-statement upgrade formalized Jan 6. No local Lean replay. This is
   precisely why formal validity and fidelity to the requested statement are
   distinct gates. Secondary pages claiming formal verification makes review
   unnecessary are not adopted as evidence.

All dated papers above are within twenty years. They inform scope checking,
not a fabricated proof of the requested Pareto codec. Reproduce a claim only
with its exact toolchain, dependencies, final proposition, assumptions and proof;
then separately test its applicability to this finite implementation.
