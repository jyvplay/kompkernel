# STOICHEIA-Σ — Formal Verification & Scientific Report

## 1. Abstract
STOICHEIA-Σ is an exact, byte-perfect, bare-LLM-readable lossless codec that
restores **all thirteen Unicode Mathematical Alphanumeric alphabet families** —
double-struck (𝔻/ℝℂℕℤℚ), script, bold-script, fraktur, bold-fraktur,
bold-italic, sans-serif (regular/bold/italic/bold-italic), monospace, bold, and
italic — plus the **Letterlike-Symbol "holes"** (ℝ ℂ ℕ ℙ ℚ ℤ ℍ 𝔽 ℬ ℱ ℋ …) that
sit outside the contiguous plane blocks. It is a faithful **superset of KALLOS**,
which restores only four of these families and leaves the other nine — the single
most common output of public "fancy text" generators and of math/PDF copy-paste —
completely uncompressed (0% savings).

## 2. The measured blind spot (o200k_base, live tokenizer)
KALLOS's own docstring names its target as "stylized social media, developer
profiles, and AI system prompt templates." Yet, measured this session:

| input (fancy-text-generator style) | raw tok | KALLOS msg | STOICHEIA msg | STOICHEIA wire-only | saved (single-chat) | exact |
|---|---:|---:|---:|---:|---|:--:|
| double-struck heading | 115 | 115 | 71 | 34 | 44 (38.3%) | ✓ |
| script heading | 92 | 92 | 56 | 21 | 36 (39.1%) | ✓ |
| fraktur band name | 93 | 93 | 64 | 28 | 29 (31.2%) | ✓ |
| bold-italic emphasis | 108 | 108 | 67 | 30 | 41 (38.0%) | ✓ |
| sans-bold-italic | 99 | 99 | 67 | 29 | 32 (32.3%) | ✓ |
| multi-family bio + math | 217 | 217 | 141 | 84 | 76 (35.0%) | ✓ |

KALLOS = raw on every row (it cannot see these families). The **single-chat**
number includes the full inline decoder contract in every message; the
**wire-only** number is the amortized cost once the contract is understood inside
a conversation (e.g. double-struck 115 → 34 = **70% savings**).

## 3. Mechanism (a faithful generalization of KALLOS)
1. Scan for maximal runs of styled characters from ONE family.
2. Replace each run with `†X…‡`, where `†` and `‡` are each exactly **1 token**
   in o200k_base and `X` is a 1-char family selector.
3. Restore by re-applying the exact per-family codepoint table (holes included).
4. **Self-verification gate**: emit a candidate ONLY IF `decode(wire) === input`
   byte-for-byte AND the full single-chat message is strictly cheaper than the
   raw input. Otherwise the codec is a total identity pass-through.
5. **Bare-LLM contract**: a compact inline header (listing only the families
   actually present) lets a fresh GPT-4o / Claude / Gemini / DeepSeek chat
   reconstruct the exact styled Unicode with NO system prompt, NO skills.md, NO
   tools — a single chat turn suffices.

## 4. Grounding (real, published, ≤ 50 years)
- **Unicode Standard**, *Mathematical Alphanumeric Symbols* (U+1D400–U+1D7FF) &
  *Letterlike Symbols* (U+2100–U+214F): exact plane layout + reserved-slot holes.
- **UAX #15 (Unicode Normalization Forms, NFKC)**: used as the machine-checked
  ground truth for the forward table — **726/726 (family,char) pairs verified**.
- **SilverSpeak (arXiv:2406.11239, 2024)** and 2026 confusable / "denial-of-spend"
  analyses: homoglyph/styled substitution inflates BPE token cost **up to 5.2×**
  with no tokenizer-level defense. STOICHEIA is the *compressing* defense.
- Context (why plain prose is at the floor): lossless prompt-compression methods
  that beat the tokenizer on ordinary prose require either **model fine-tuning**
  (LTSC, arXiv:2506.00307) or an **inline dictionary that only amortizes on
  repetition** (CompactPrompt arXiv:2510.18043; LoPace arXiv:2602.13266; ctxfold).
  Under the bare-LLM single-chat constraint, non-repetitive ASCII prose therefore
  has no free lunch — confirmed empirically (§6, H−).

## 5. Red-Team Verification Results (`npx tsx bench/stoicheia-redteam.ts`)
- **57 / 57 gates passed.**
- G1: all 726 (family,char) mappings agree with NFKC ground truth.
- G3: an **independent CPython decoder** (`bench/stoicheia_decode.py`, separate
  runtime AND separate implementation) agrees byte-for-byte on every fixture.
- G4: totality on empty / dangling daggers / literal `†…‡` collisions / emoji /
  CJK — never crashes, never corrupts.
- G5: honest gate — when applied, `messageTokens < inTokens`; when not applied,
  wire === input and savings == 0 (no phantom gains).
- G6: pareto vs KALLOS — never worse, strictly better on the nine new families.
- G7: **500 randomized fuzz inputs**, exact round trip, zero crashes.

## 6. Outcome space
- **H+ (achievable):** styled-alphabet inflation is real and large; STOICHEIA
  captures 31–39% single-chat (up to ~70% amortized) where the whole current
  stack sits at 0%. VERIFIED.
- **H− (impossible under constraints):** plain non-repetitive ASCII prose cannot
  be compressed below the tokenizer floor by any exact, prompt-free, LLM-decodable
  transform. The codec (and the Optimal Router) correctly floor to identity.
- **H∂ (boundary):** a few *scattered single* styled letters on a *short* message
  do not amortize the inline contract; the codec honestly declines to identity.
  The win grows with run length and run count (contract amortization).

## 7. Exact remaining gap / next highest-information test
- Greek styled variants (bold/italic Greek 𝛂…) are out of scope for v1 because
  base Greek letters are already 1 token; a net-positive mapping there needs a
  base-Greek (not ASCII) target and is left as measured future work.
- Highest-information next test: a held-out corpus of real copied-from-PDF math
  and real fancy-text-generator social bios, to estimate population-level
  prevalence and expected savings.
