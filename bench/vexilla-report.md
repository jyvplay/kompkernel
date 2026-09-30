# VEXILLA-⚑ — Rule-Based Emoji Flag Restoration Codec

*Byte-exact · lossless · direct-reasoning · bare-LLM-readable (no system prompt,
no skills.md, one chat turn). o200k_base tokenizer. Registered and wired into the
worker, synthesis/Optimal-Router, METATRON tournament, registry, and Workbench UI.*

---

## 1. The measured blind spot

Emoji **flags** are among the most token-expensive characters that appear in
ordinary chat, i18n/localization docs, travel/sports/news copy, and social
marketing — and **no codec in this repository touched them.** Measured this
session on the live tokenizer (`gpt-tokenizer`, o200k_base):

| content | tokens | why |
|---|---|---|
| single regional flag `🇺🇸` | **4** | 2 Regional-Indicator code points, 2 tok each |
| 15-flag locale list | **60** | 15 × 4 |
| subdivision **tag flag** `🏴󠁧󠁢󠁳󠁣󠁴󠁿` (Scotland) | **26** | black flag + 5 Tag-Latin chars + cancel tag |

The entire existing stack (METATRON / PANOPTES / KALLOS / …) leaves **every one
of these at 0% savings** — confirmed by running `metatronEncode` /
`panoptesEncode` / `evaluateAllCodecsDynamically` on flag content: `save 0`.

## 2. The rule (no dictionary — the inverse is *structural*)

Like STOICHEIA (styled alphabets) and ARITHMOS (numerals), VEXILLA needs **no
per-item dictionary** because the inverse is a closed-form Unicode rule:

- **Regional-indicator flag** = exactly two Regional Indicator Symbols
  (U+1F1E6..U+1F1FF), one per ASCII letter: `RI(c) = 0x1F1E6 + (c − 'A')`.
  A flag ⇔ a 2-letter ISO code, **bijectively** (verified over all 26×26 pairs).
- **Subdivision tag flag** = waving black flag U+1F3F4 + Tag-Latin chars
  (U+E0020..U+E007E = ASCII 0x20..0x7E) + CANCEL TAG U+E007F.
  `🏴󠁧󠁢󠁳󠁣󠁴󠁿` ⇔ `🏴 + "gbsct" + cancel`.

## 3. Wire format

Four sentinels, **each measured = 1 token** in o200k_base and **disjoint from
every other codec's reserved marks** (incl. STOICHEIA's `† ‡ ※ ¤`):

- `¶ … §` (U+00B6 / U+00A7) — regional-flag run, 2 uppercase letters per flag.
- `¬ … ¦` (U+00AC / U+00A6) — subdivision tag flag, tag-latin payload.
- `°` (U+00B0) MARK "applied" · `±` (U+00B1) ESCAPE (only when raw text starts
  with a sentinel — the sole, unavoidable +1-token case, identical to STOICHEIA).

Inline single-chat contract (emitted **only for the kinds present**, no live
flag-emoji examples which would themselves cost 4–26 tokens):
`¶..§=flags,2 letters each` (~10 tok) · `¬..¦=🏴+tag-latin flag` (~11 tok).

## 4. Verification gates (honest by construction)

1. **Self-verify:** a wire is emitted **only if** `vexillaDecode(wire) === input`
   byte-for-byte **and** the contract-inclusive message is strictly cheaper than
   raw; otherwise total identity. So savings are never overstated.
2. **Real tokenizer:** every accept/reject uses `countTokens`, not estimates.
3. **Exhaustive bijection:** all **676** regional flags + a tag-flag battery
   round-trip with **0** failures.
4. **Independent CPython decoder** (`bench/vexilla_decode.py`): TS-encoded wires
   decode byte-exact in a second language — **5/5** cross-language, proving
   exactness is a property of the *wire format*, not the JS runtime.

## 5. Results (`bench/vexilla-redteam.ts`, contract-inclusive, o200k_base)

```
  ✓apply  locale list (15 flags)     in= 62 msg= 58 save=  4  (6%)
  ✓apply  adjacent flag run          in= 20 msg= 18 save=  2  (10%)
  ✓apply  tag flag (Scotland)        in= 30 msg= 22 save=  8  (27%)
  ✓apply  three tag flags            in= 80 msg= 29 save= 51  (64%)
  ·ident  single flag in prose       in=  8 msg=  8 save=  0   (honest: contract not amortized)
  ·ident  marketing post / plain prose / bare emoji …  save 0 (correctly not applied)
22 cases · applied=4 · exact_failures=0 · honesty/regression_failures=0
exhaustive round-trip (676 regional + 8 tag): 0 failures
```

Via **METATRON** the same lane is captured automatically: `Match 🏴󠁧󠁢󠁳󠁣󠁴󠁿 vs 🏴󠁧󠁢󠁷󠁬󠁳󠁿 and
🏴󠁧󠁢󠁥󠁮󠁧󠁿 …` → winner `vexilla`, **87 → 36 tokens (saved 51, 58%)**, `metatronDecode`
round-trip exact. Full battery after integration: vexilla ✓, metatron 28/0,
stoicheia 57/0, panoptes 41/0, episteme 28/0, kallos 76/0, arithmos 78/0,
Optimal Router **243/0**; `tsc` clean; `vite build` clean.

## 6. Honest scope (what it does *not* do — measured negative space)

- **Single / space-separated regional flags** don't compress: the ~10-token
  contract isn't amortized (gate correctly returns identity). Wins need a
  *tag flag* or a *run/list* of regional flags.
- **ZWJ sequences** (`👨‍👩‍👧‍👦`) are a **phantom**: inserting any visible join marker
  between the component emoji costs the same 11 tokens as the original ZWJ
  (measured) — the emoji never merge with neighbors; only *dropping* joins would
  help, and that is lossy. Not attempted.
- **Skin-tone / keycaps / enclosed alphanumerics** save ≤1 token per glyph and
  lose to bracket overhead in their natural *isolated* usage (measured). Excluded.
- **General English prose** is at the tokenizer floor for a byte-exact,
  no-logit-access codec — see `bench/redteam-audit-2026.md`. VEXILLA is a
  focused lane (like ARITHMOS=numerals, KALLOS=styled fonts), not a prose codec.

## 7. Grounding (real, published, ≤ 50 years)

- Unicode Standard — Regional Indicator Symbols (U+1F1E6..U+1F1FF); Tags block
  (U+E0000..U+E007F); UTS #51 *Unicode Emoji*, flag sequences ED-14 / ED-14a.
- SilverSpeak (arXiv:2406.11239) and 2026 confusable / "denial-of-spend"
  analyses: multi-code-point clusters inflate BPE token cost up to 5.2× with no
  tokenizer defense — VEXILLA is the *compressing* canonicalizer for the flag case.
