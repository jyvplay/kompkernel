# X171 source refresh — inspection, not proof certification

Sources were retrieved during this session. GitHub source commits and SHA256s are
in `receipts/research-artifacts.json`; fetch script is reproducible. Lean/lake/coqc
were not available; no theorem kernel ran. These are individual bounded readings,
not an exhaustive audit of laboratory mathematical claims.

* OpenAI `FixedPaperTerminalBounds.lean`, pinned in receipt: `eventually_paperTerminals_of_rated`
  assumes eventually `PaperRatedRows`, plus address bounds, templates, field,
  finite models, conditions, and canonical scans. The proof combines startup,
  branch clocks, geometry and supplied rated rows. It does not by itself discharge
  all these hypotheses or establish VP≠VNP. Transfer: expose resource assumptions
  rather than promoting a conditional bound to unconditional compression.
* Anthropic `CountedToPadded/Compare.lean`: `visit_total` preserves counted plus
  remaining symbols; `visit_work` consumes one tree node. `wordCompared` gives
  polynomial-time comparison with unary padding under the encoding framework.
  This is not a practical tokenizer speed theorem or an ETH proof audit.
* Google DeepMind `erdos_741.parts.i.lean`: `SandorA_fluctuation_bounds`
  assumes a disjoint partition and positive existing sumset densities. It
  constructs diverging subsequences with a positive fluctuation gap. Density
  definitions and positivity cannot be dropped. No general codec conclusion.
* Harmonic IMO2025 P3: `finite_S_constraint` requires `isBonza`, finite and
  nonempty S; concludes S={2}. Source inspection only, not a full proof replay.
* ByteDance Seed P3: `lte_2_3n_minus_1` assumes positive integer n and gives the
  parity-dependent 2-adic valuation. Boundary n=0 is excluded; this lemma is not
  the whole Olympiad solution or a compression theorem.
* DoubleAI https://www.doubleai.com/papers/girth85.pdf : fresh retrieval failed
  this turn. Prior X170 reading retained in that ledger, not relabeled a fresh
  successful audit. Claimed graph bounds depend on the stated algebraic family.

New literature:

1. Igor Zavadskyi, *Lossless text compression by means of binary-coded ternary
   number representation*, Discrete Applied Mathematics 351 (2024), 15–22,
   DOI10.1016/j.dam.2024.03.003. Publisher abstract fetched at
   https://www.sciencedirect.com/science/article/abs/pii/S0166218X2400101X .
   Binary dictionary lookup and ratio/speed tradeoffs do not establish native
   language-model readability or improvements in the repository's token metric.
2. Juba, Kalai, Khanna, Sudan (2011), *Compression without a Common Prior*,
   https://conference.iiis.tsinghua.edu.cn/ICS2011/content/paper/23.pdf .
   First chunk retrieved. Sender and receiver priors differ pointwise by at most
   alpha; a common graph/dictionary and alpha-squared probability separation
   support disambiguation. Neither the common graph nor correct priors may be
   assumed free here. METRIDA instead explicitly tests uniqueness of finite
   ordered assignments; that is a different, paid zero-error constraint.

Search-only leads (not validated results): arxiv2404.03626 trained compressed
representations; arxiv2504.16380 statistical side-information converse;
arxiv2502.05959 guessing with abandonment. Access/error models differ. Stanford
and UPenn fetches failed; the alternate ICS source above succeeded. Secondary
2026 extraordinary RH/FLT/Navier–Stokes/UGC and verification-percentage headlines
were not verified and are not adopted. Highest-information next research action:
replay pinned kernels with full imports and inspect the precise final statements,
not infer mathematical breakthroughs from filenames or snippets.
