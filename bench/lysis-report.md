# LYSIS-λ — Escape-Sequence / Character-Reference Resolution Codec

*Byte-exact · lossless · direct-reasoning · bare-LLM-readable (no system prompt,
no skills.md, one chat turn). o200k_base. Registered + wired into the worker,
synthesis/Optimal-Router, METATRON tournament (candidate 9), registry, Workbench.*

This turn was run under the W14 protocol (formal model → outcome space → frontier
→ negative space → mechanism portfolio → adversary → verification → repair). The
protocol is summarized below; the **artifact** is `src/lib/omega/lysis.ts`.

---

## A. Formal model
- **Admissible object:** a string `x`. A codec is a pair (encode, decode) with a
  one-time inline *contract* the model reads in the same chat turn.
- **Access model:** a bare LLM, single chat in/out, **no** system prompt / skills.md
  / tools / logit access.
- **Resource counted:** o200k_base tokens of the *message the user actually sends*
  = contract + wire (real `gpt-tokenizer`, never an estimate).
- **Success:** ∀x, `decode(encode(x)) = x` byte-for-byte, AND for the target class
  `message_tokens(x) < tokens(x)`, AND the transform is reconstructible by a bare LLM.
- **Failure/identity:** if the round-trip or the strict token-reduction gate fails,
  emit identity (never a regression beyond the unavoidable +1 sentinel escape).
- **Regime:** general prose + **ops/i18n payloads**; short→long; tolerances exact.
- **Adjacent problems NOT solved:** rendered-Unicode restoration (KALLOS/STOICHEIA),
  numerals (ARITHMOS), flags (VEXILLA), repetition/dictionary (proteus/daedalus).

## B. Outcome space (resolved)
- **H+ (achieved):** escape-sequence resolution is a large, byte-exact, dictionary-free
  compression lane. **Verified.**
- **H− (confirmed, standing):** *general English prose* is at the tokenizer floor for
  a byte-exact, no-logit codec — re-confirmed here (plain prose → identity). LYSIS does
  not claim prose gains; it targets the escaped-payload class, which is pervasive in
  real ops and "hybrid prompt-output" text.
- **H∂ (boundary):** gains scale with escape density; below ~4 Latin escapes the
  ~10-token contract is not amortized (gate → identity). Correct and honest.

## C. Frontier (imported results, restated)
- **Lossless prompt compression** SOTA needs either fine-tuning (LTSC, arXiv:2506.00307),
  a **system-prompt dictionary** (dictionary-encoding + ICL, arXiv:2604.13066; CompactPrompt),
  or **non-readable binary packing** (LoPace arXiv:2602.13266, zstd+BPE, 72%). All violate
  our bare-LLM / readable constraint. LYSIS occupies the open interface they leave: a
  **rule-only, dictionary-free, readable** transform.
- **The specific inflation LYSIS removes is field-measured (NEW 2026 sources):**
  QuantumNous/new-api #7368/#7369 — a 7,800-char Chinese payload: **5,847 tok** as
  `ensure_ascii=False` vs **31,515 tok** as `ensure_ascii=True` (**5.39×**); OpenAI
  dev-community 1375117 — OpenAI's own multi-tool-call serialization forces the escaping
  for **10–15×** bloat on KR/JA/ZH; dacli #303 — "ü is one or two tokens, while \u00fc is
  several." `ensure_ascii=True` is **Python json.dumps' default**, so this is the common
  client shape, not an edge case.

## D. Negative space (shapes that look like wins but fail — with the test that catches each)
1. **Decode-all then drop the escape marker** → lossy (can't tell `\u00e9` from literal é). *Caught:* round-trip gate.
2. **Uppercase-hex fold to lowercase** (`\u00E9`→é→`\u00e9`) → byte-different. *Caught:* gate → identity (test case present).
3. **`\\u0041` treated as an escape** → it's an escaped backslash + literal "u0041". *Caught:* backslash-aware parser + gate.
4. **Surrogate pair split** (`\ud83d`,`\ude00` folded separately) → two lone surrogates, not 😀. *Caught:* pair-combining decode + gate.
5. **Lone high surrogate folded** → ill-formed string. *Caught:* lone surrogates kept spelled-out.
6. **Escape resolving to a delimiter code point** (`\u00ab`→«) corrupts region parsing. *Caught:* RESERVED_CP kept spelled-out; test present.
7. **HTML hex `&#xE9;` folded as decimal** → wrong char. *Caught:* decimal-only matcher; hex → identity.
8. **Named entity `&amp;` folded** → needs a dictionary; ambiguous. *Not attempted;* passes through literally inside H-regions.
9. **Mixed literal-non-ASCII + escapes in one region** → re-escape would escape the literals too. *Caught:* literal non-ASCII breaks regions.
10. **Region delimiter appears literally in input** (« ») → misparse. *Caught:* round-trip gate → identity.
11. **Whole-input region rule when input has literal non-ASCII outside escapes** → mismatch. *Caught:* per-region gate.
12. **Contract omitted (assume LLM "just knows")** → not reconstructible / dishonest. *Rejected:* contract always emitted for present schemes.
13. **Claiming raw wire savings** (excluding contract) → overstates. *Rejected:* `messageTokens` = contract+wire.
14. **`\n \t \" \\` folded** → they are 1 token already (Δ0). *Rejected:* only `\uXXXX` folded.
15. **Percent-encoding folded unconditionally** (`%2F`→/) → ASCII targets are Δ1 and collide with real `%`. *Deferred;* not in v1 (measured marginal, needs its own gate).
16. **Estimator-style token counting** → the very bug (#7368) that caused 5× *over-billing*. *Rejected:* real tokenizer only.

## E. Mechanism (this codec) + the six mechanism-distinct lanes considered
LYSIS's lane = **escape/reference resolution** (mechanism: closed-form codepoint↔escape
bijection + self-verify). The five other mechanisms weighed this turn, with the receipt
that ruled them out (measured live, o200k_base):
- **Multilingual grammar substitution** (the user's idea): H− for byte-exact single messages —
  English is already token-optimal; foreign single tokens only beat multi-word English
  connectives and the substitution is *lossy translation* (`on the other hand`→`néanmoins`
  changes bytes). *Improved version delivered below.*
- **Whitespace/indent/separator runs:** already tokenizer-merged (10 spaces = 1 tok). Phantom.
- **ZWJ/skin-tone emoji decomposition:** phantom (join markers cost the same as ZWJ). *Measured last turn.*
- **Enclosed alphanumerics:** lose to bracket overhead in isolated usage. *Measured.*
- **Repeated-phrase phrasebook (ops):** already covered (proteus ~30% on JSON logs) or at floor (~2% on prose). *Measured.*

## F/H. Artifact + verification (external, not self-review)
- **Self-verify gate:** every wire satisfies `lysisDecode(wire) === input` before emission.
- **Red-team** (`bench/lysis-redteam.ts`): 22 adversarial cases + **4000-case fuzz** →
  **0 exact failures, 0 honesty/regression failures, 0 fuzz failures.**
- **Independent CPython decoder** (`bench/lysis_decode.py`): TS-encoded wires decode
  byte-exact in a second language — **5/5** cross-language + selftest PASS. (A machine-checkable
  *certificate*, in the spirit of the Aug 2026 Lean-verified AI-math results — verification, not
  social proof.)
- **Full battery after integration:** lysis ✓, vexilla ✓, metatron 28/0, stoicheia 57/0,
  panoptes 41/0, episteme 28/0, kallos 76/0, arithmos 78/0, **Optimal Router 249/0**;
  `tsc` clean; `vite build` clean; diagnostics 2/0.

## Results (contract-inclusive, o200k_base)
```
  japanese i18n strings         55 → 32   (−42%,  14 escapes)
  korean tool-call payload      44 → 27   (−39%,   9 escapes)
  emoji astral surrogate pairs  44 → 31   (−30%,  10 escapes)
  spanish accents               34 → 28   (−18%,   5 escapes)
  html decimal entity prose     28 → 24   (−14%,   6 refs)
  GIANT non-ASCII JSON         287 → 76   (−74%,  84 escapes)   ← scales to the real 5–15× case
  aggregate WHERE APPLIED:     492 → 218  (−55.7%)
  plain prose / ascii JSON / code / uppercase-hex / … → identity (exact, honest)
```
Via METATRON the lane is captured automatically: a Japanese JSON payload
**61 → 30 tok (−51%)**, `metatronDecode` round-trip exact.

## I. Repair log
- Contract shrunk 17→10 tok after the first run showed small realistic payloads
  (spanish/html) failing the amortization gate. Re-ran ALL gates after the change
  (redteam + fuzz + CPython cross-check + full battery) — no trust inherited.

## The user's grammar idea, improved (Pareto-superior form)
The literal idea (translate to shorter foreign single-tokens) is **H− for byte-exact**
prose (proven, receipts above). Its *correct kernel* — "unify on single-token glyphs,
then fold a second stack that treats a lane as pure text" — is exactly what LYSIS realizes:
the **grammar-agnostic** view treats the payload as *bytes*, and the single-token
"unifying glyphs" are the resolved characters (é, 你, 😀) that the tokenizer already
represents in 1 token, recovered from their multi-token escaped spellings by a rule the
model reads inline. The two folded stacks (METATRON tournament + Optimal Router) then pick
the true minimum per input.
