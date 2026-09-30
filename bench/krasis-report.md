# KRASIS-⊕ — Unicode Canonical-Composition (NFD→NFC) Restoration Codec

*Byte-exact · lossless · direct-reasoning · bare-LLM-readable (no system prompt,
no skills.md, one chat turn). o200k_base. Registered + wired into the worker,
synthesis/Optimal-Router, METATRON tournament (candidate 10), registry, Workbench.*

Run under the W15 protocol. Artifact: `src/lib/omega/krasis.ts`.

---

## A. Formal model
- **Admissible object:** a string `x` + a one-time inline *contract* read in the same chat turn.
- **Access model:** bare LLM, single chat in/out; **no** system prompt / skills.md / tools / logits.
- **Resource counted:** o200k_base tokens of the message actually sent = contract + wire (real `gpt-tokenizer`).
- **Success:** ∀x, `decode(encode(x)) = x` byte-for-byte, AND for the target class `message_tokens(x) < tokens(x)`, AND the transform is a rule a bare LLM can read.
- **Failure/identity:** if the round-trip or the strict token gate fails → identity (never a regression beyond the unavoidable +1 sentinel escape).
- **Regime:** general prose + ops; short→long; exact tolerance.
- **Adjacent problems NOT solved (kept distinct):** *rendered* Unicode variants — styled alphabets (KALLOS/STOICHEIA), numerals (ARITHMOS), fullwidth (PROCRUSTES), flags (VEXILLA), ligatures/compatibility (EPISTEME); escape sequences (LYSIS). KRASIS is the only codec that touches **normalization form** (canonical composition).

## B. Outcome space (resolved)
- **H+ (achieved):** canonical NFD→NFC is a large, byte-exact, dictionary-free lane. **Verified** (Korean −84%).
- **H− (standing):** English/ASCII prose is at the tokenizer floor (ASCII never decomposes; identity confirmed).
- **H∂ (boundary):** gains scale with decomposition *density*. Dense decomposed CJK/accented text → huge; sparse accents in mostly-ASCII → the ~10-token contract may not amortize (gate → identity). Honest and correct.

## C. Frontier (imported results, restated)
- **UAX #15 (Unicode Normalization Forms):** NFC is canonical composition; for canonically-decomposed `x`, `NFD(NFC(x)) = x`. This is the exact, standard, dictionary-free inverse KRASIS relies on (verified over the whole battery).
- **The tax is real and unhandled (NEW 2026 grounding):** nicezic/Korean-tokenizer measured a held-out **NFD/NFC token ratio ≈ 6.98×** for BPE, and tabulates that **o200k / GLM / Meta tokenizers apply NO normalizer** — so NFD is billed in full. macOS/APFS stores Finder-created filenames as NFD vs shell-created as NFC (HN 35336510: "the bytes are different even though they look the same"); borgbackup #4771 shows `l\xc3\xa4` vs `la\xcc\x88` for the identical-looking `lä.txt`. The **open interface** the frontier leaves: a *bare-LLM-readable, byte-exact* recompressor — occupied here.
- Prior lossless-prompt SOTA (LTSC 2506.00307 fine-tune; dictionary-ICL 2604.13066 system prompt; LoPace 2602.13266 binary) all violate our constraints; KRASIS is rule-only + readable.

## D. Negative space (shapes that look like wins but fail — each with its detector)
1. **NFKC/NFKD instead of NFC** → *lossy* (folds ﬁ→fi, ①→1, fullwidth→half; not byte-reversible). *Caught:* only canonical NFC used; NFKC cases → identity.
2. **Strip diacritics** (résumé→resume) → lossy. *Rejected:* never done.
3. **Apply NFC blindly to whole input** when it contains precomposed chars mixed with NFD → NFD(NFC(x)) re-decomposes the precomposed ones. *Caught:* per-run fallback + round-trip gate (test "precomposed é between NFD ê ü" → identity).
4. **Compose a base to the wrong following mark across a region boundary** → wrong bytes. *Caught:* regions include the base for every mark; gate verifies.
5. **Singleton canonical decompositions** (Å U+212B→U+00C5, Ω U+2126→U+03A9) have no combining mark → not detected. *Detected as a limitation:* test present, → identity (safe, honest; not claimed).
6. **Lone/leading combining mark** (orphan U+0301) → composes to nothing meaningful. *Caught:* gate → identity (test present).
7. **Zalgo (many stacked marks)** → NFC may reorder by combining class ≠ original. *Caught:* round-trip gate → identity (test present).
8. **Region delimiter ‹ › appears literally in input** → misparse. *Caught:* RESERVED check in `roundTrips` + gate → identity (test present).
9. **Claiming raw-wire savings** (excluding contract) → overstates. *Rejected:* `messageTokens` = contract + wire.
10. **Estimating tokens** → the actual mis-billing bug in the field. *Rejected:* real tokenizer only.
11. **Assuming the LLM re-emits NFC** (no rule) → not reconstructible. *Rejected:* inline NFD contract always emitted.
12. **Composing already-NFC text** → 0 change, wasted markers. *Caught:* candidate discovery + token gate → identity (tests "already NFC …").
13. **Splitting on ASCII boundaries** (would orphan a combining mark from its ASCII base 'e'). *Caught:* affected-map marks the base before each mark; test "combining mark on ascii base".
14. **Surrogate-pair base + mark** mis-indexed → wrong slice. *Handled:* affected-map extends across the high surrogate.
15. **NFD-emoji adjacency** (astral emoji next to decomposed text) → region must not corrupt the emoji. *Caught:* gate; test present.
16. **Whole-doc region when a precomposed char sits between decomposed runs** → step-1 gate fails, step-2 per-run only touches decomposed runs. *Caught:* two-attempt transform + gate.

## E. Mechanism (this codec) vs. the other lanes weighed this turn (with receipts)
KRASIS's lane = **canonical composition** (mechanism: NFC↔NFD bijection on canonical input + self-verify). Other mechanisms measured live and ruled out this turn:
- **Mojibake repair (UTF-8-as-Latin-1):** real but small (Δ2–6/phrase) and edge-case-heavy (control bytes); deferred.
- **HTML hex `&#xH;` / percent `%XX` / quoted-printable:** LYSIS-family extensions (Δ per char), not a new mechanism; deferred.
- **Multilingual grammar substitution (the user's literal idea):** H− for byte-exact prose — lossy translation; *improved form delivered below.*
- **Whitespace / ZWJ / enclosed alphanumerics / phrasebook:** phantom or already covered (measured prior turns).

## F/H. Artifact + verification (external, not self-review)
- **Self-verify gate:** every wire satisfies `krasisDecode(wire) === input` before emission.
- **Red-team** (`bench/krasis-redteam.ts`): 22 adversarial + **5000-case fuzz** (NFC/NFD/mixed) → **0 exact, 0 honesty/regression, 0 fuzz failures.**
- **Independent CPython decoder** (`bench/krasis_decode.py`, stdlib `unicodedata`): TS-encoded wires decode byte-exact in a second language & normalization engine — **6/6** cross-language + selftest PASS (a machine-checkable certificate; Python NFD ≡ JS NFD).
- **Full battery after integration:** krasis ✓, lysis ✓, vexilla ✓, metatron 28/0, stoicheia 57/0, panoptes 41/0, episteme 28/0, kallos 76/0, arithmos 78/0, **Optimal Router 255/0**; `tsc` clean; `vite build` clean; diagnostics 2/0.

## Results (contract-inclusive, o200k_base)
```
  korean document (NFD)   212 → 33   (−84%,  41 combining cp)   ← ~6× real-world case
  korean phrase (NFD)     101 → 22   (−78%,  20 cp)
  macos filename (NFD)     47 → 26   (−45%,   8 cp)
  vietnamese doc (NFD)     54 → 38   (−30%,  21 cp)
  portuguese / french      31/39 → 29/37 (−6% / −5%, sparse accents)
  aggregate WHERE APPLIED: 484 → 185 (−61.8%)
  already-NFC / ascii / plain CJK / singletons / zalgo → identity (exact, honest)
```
Via METATRON the lane is captured automatically: a Korean NFD document **212 → 33 tok (−84%)**, `metatronDecode` round-trip exact; the Optimal Router selects it.

## I. Repair log
- `composedChars` audit computed cleanly (dead first attempt removed) before commit; no logic change to encode/decode. All gates re-run after the edit (redteam + 5000-fuzz + CPython + full battery).

## The user's grammar idea, improved (Pareto-superior form)
The literal "translate to shorter foreign single-tokens" is H− for byte-exact prose (lossy).
Its correct kernel — *"unify on single-token glyphs; fold a second stack that treats a lane
as pure text"* — is exactly KRASIS: the **grammar-agnostic** view treats the text as bytes and
**merges** (κρᾶσις) multi-codepoint decomposed sequences into the single precomposed glyph the
tokenizer already represents in one token (안 not ᄋ+ᅡ+ᆫ; é not e+◌́). The two folded stacks
(METATRON tournament + Optimal Router) then pick the true minimum per input across KRASIS,
LYSIS, VEXILLA, STOICHEIA, and the rest.
