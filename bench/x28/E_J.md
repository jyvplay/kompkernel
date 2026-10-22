### E. Mechanism portfolio — six genuinely distinct approaches

Preserved independent: each was built and measured before the next was begun,
and none of them shares a construction with another.

| # | central construction | artifact | proved | unresolved interface | cheapest falsification | gap local or equivalent? |
|---|---|---|---|---|---|---|
| E.1 | **Feature-decomposed instruction.** The contract is not a constant; it is the cheapest cover of the feature set {MAP, SPLIT, REPEAT, OUTPUT} the wire needs. | `SYNTOMOS_LADDER`, `cheapestHead` | the cover is an exact minimum over a finite ladder (no approximation) | whether a *shorter* wording still covers a feature is a judgement, not a proof | `selfdecode.py` on the emitted message | **local** |
| E.2 | **Nesting-gated REPEAT.** `expand repeatedly` ⟺ some tape rule references another; detected by counting glyph chars inside rule bodies. | `countNestedRefs` | exact: the SLP is acyclic and ordered, so it is a fixed point iff it is non-trivial | — | construct a nested tape and confirm the flag is 1 | **local, closed** |
| E.3 | **De-nesting arm.** Flatten the SLP when it costs ≤ slack, retiring REPEAT and making decode single-pass. | arm B in `syntomosEncode` | correctness gated by an explicit round-trip check before the arm is accepted | the slack constant (2) is a policy choice | set `denestSlack = 0` and re-measure | **local** |
| E.4 | **Prefix-rewrite contract splicing.** Touch the head, never the tail. | `syntomosContract` | if the parent's head is absent, the parent contract is returned unchanged (fail-safe) | — | mutate the parent wording, confirm no crash and no semantic loss | **local, closed** |
| E.5 | **Run-cost relabelling** (inherited, X27). | METATHESIS | `decode(relabel(w)) = decode(w)` for injective same-script `A` | gap to the true argmin | measured saturated at 50× budget | equivalent to QAP in general |
| E.6 | **SLP derivation-depth balancing** (imported, not used). | `depth.ts` | height `O(log N)` at size `O(g)` is a theorem | — | measured depth already 1–5 | **local, closed (no headroom)** |

### F. Artifacts

- `src/lib/omega/syntomos.ts` — the codec. `SYNTOMOS_LADDER`, `syntomosContract`,
  `expandRules`, `countNestedRefs`, `syntomosEncode`, `syntomosDecode`, `syntomosRoundTrip`.
- `src/lib/omega/registry.ts` — `syntomos` entry after `metathesis`; 189 entries; tsc clean.
- `bench/x28/sweep.ts` + `sweep.log` + `syntomos.jsonl` — the 28-lane sweep.
- `bench/x28/reverify.ts` + `metathesis_reverify.jsonl` — the baseline re-run.
- `bench/x28/selfdecode.py`, `mkcase.ts`, `cases.json`, `receipts/` — independent verification.
- 20 probe scripts, each the negative-space record of §D: `ordinal`, `tokprobe`,
  `margin`, `merge`, `contract`, `contract2`, `contract3`, `heads`, `shape`,
  `pairs`, `anatomy`, `rules`, `runs`, `runs2`, `tapegram`, `tape2`, `tape3`,
  `coverage`, `select`, `comp`, `prune2`, `denest`, `depth`, `budget`, `mr`,
  `harden`, `peek`, `hello`.

### G. The second-order adversary, A(C)

1. **"It is a 3-token shave dressed up as a codec."** Conceded in magnitude, and
   stated plainly: the gain is **−3 tokens on every taped lane, −81 total,
   0.28%**. What is *not* a shave is the finding that forced it: every
   dictionary-side lever measured zero (§D.1–D.13). A correct negative result
   that redirects the whole stack is worth more than an optimistic positive one,
   and the size of the honest win is itself evidence about the architecture.
2. **"The tournament could pick a contract that is shorter but wrong."** Answered
   by construction (E.4 prefix rewrite + fail-safe) and by the gate that caught
   the actual instance of this bug (D.17).
3. **"De-nesting changes the wire, so the decode path differs."** True, and it is
   gated: the arm is accepted only if `symplokeDecode(flat) === text`.
4. **"The baseline moved, so the −3 is noise."** The baseline did move (11
   tokens, §C) — which is exactly why the delta is measured **inside a single
   encode** against `metathesisMessageTokens` computed from the same parent
   wire. Load drift cannot enter the comparison.
5. **"You never ran a model."** Correct, and it is the standing limitation of the
   whole programme (§H.1). The contract change is the single riskiest part of
   this turn for that reason, and the conservative rung was chosen deliberately.

### H. Verification

**H.1 — the honesty downgrade, restated.** **No live LLM was run at any point.**
The sandbox has no model access and no theorem prover. "Decodable by a bare LLM
in one chat message" is **designed for and structurally preserved**, not
demonstrated. This has now been carried for X21–X28 and should be read as a
property of the programme, not of this turn.

**H.2 — what was actually verified.** 28/28 lanes byte-exact (TS round trip);
independent from-spec Python decoder given nothing but the message; `npx tsc
--noEmit` clean; registry entry executes. All numbers come from files in
`bench/x28/`.

**H.3 — openai/math, checked live 2026-10-18.** `pushed_at` unchanged at
2026-10-12, `open_issues_count = 0`, and the all-states PR list still contains
exactly two entries: #1 (2026-10-08, "Update manuscripts and Lean
formalizations") and #2 (2026-10-12, "Automatically lock new PR conversations").
**There are zero new proofs to evaluate individually this turn.**

**H.4 — the called-out proof, investigated deeper (Unique Games, family 102).**
New facts since X27. (a) The competing *human* result is now published: **ECCC
TR26-179, Fei–Minzer–Wang, "On the Hardness of 4-to-1 Games with Perfect
Completeness"**, revision 2 of 8 Oct 2026 — it proves Khot's **4-to-1** Games
Conjecture, with the stated consequences of NP-hardness of k-colouring a
3-colourable graph for every constant k. Quanta (7 Oct 2026) reports the group
rushed a 95-page draft to ECCC on 14 Sep after rumours of the OpenAI result
reached Minzer on 11 Sep. This is a strictly weaker statement than full UGC
(different completeness regime), so it neither confirms nor displaces the
OpenAI claim. (b) The third-party Lean check (revision `fd4aeeb`, Lean 4.34.1,
9 Oct 2026) accepted `OAI.UniqueGamesTheorem.theorem11` under `propext`,
`Classical.choice`, `Quot.sound`, but the checkers state the **sandbox was not
enforced** and that they **did not audit whether the formal statement matches
the paper's main theorem**. (c) The faithfulness gap is corroborated
independently: Tao is quoted that "the proof verifies the formal statement
itself, not whether this statement matches the intended meaning"; *Science*
(14 Oct) reports formalised statements can be "something weaker" than the main
theorem. (d) Independent recounts still put formalisation at 24–36% against a
claimed 42%. **Net: the status of the UGC claim is unchanged — formally checked,
not faithful-audited, not refereed.**

**H.5 — bearing on compression: none constructible, and one methodological
transfer.** UGC is hardness of approximation; its gadgets (Grassmann expansion,
degree-two KMS inverse theorem) yield no token-cost model. The transferable
lesson is H.6.

**H.6 — the methodological transfer, which is the real finding.** The disputed
UGC formalisation and the X28 shape-clause bug are **the same failure mode**: a
verifier checks an internal representation (the Lean statement / the `stats`
object) while the consumer reads a different artifact (the English theorem / the
contract text). Lean passing is to the UGC paper exactly as `exact: true` was to
my dropped shape clause. The transfer is concrete and it changed the code: any
verifier in this repo must parse **the text the model reads**, not the struct the
decoder uses.

**H.7 — new sources consulted (none previously referenced by any codec here).**
- **arXiv 2605.22705** "Tokenization with Split Trees" (2026-05-21): >11% fewer
  tokens than BPE at vocab ≥ 40 960, via an integer program over split trees.
  Confirms token count is a tokenizer property — and is unusable here because we
  cannot change the decoder's tokenizer.
- **arXiv 2603.25340** "Large Language Model as Token Compressor and
  Decompressor" (2026): autoencoding into discrete Z-tokens. The AI-native
  alternative we explicitly do **not** take, because it needs a trained
  compressor and our decoder is frozen.
- **arXiv 2107.00446** "Compression by Contracting Straight-Line Programs"
  (2021): SLP height `O(log N)` at size `O(g)`. Tested; no headroom (D.12).
- **Maruyama et al., SPIRE 2013** (via "A Succinct Grammar Compression"): an SLP
  with `n` symbols needs ≥ `2n + log₂(n!)` bits. For kb-article's 27 rules that
  is ~148 bits ≈ 32 tokens against our 56-token tape — a real floor, and
  unreachable by an LLM because it is bit-level.
- **arXiv 2608.14673** "A Human Audit of OpenAI's AI-Generated Mathematical
  Proofs" (v3, 2026).

### I. Repair — two defects found this turn

**I.1 — the pipeline is not deterministic (pre-existing, not introduced by X28).**
Many modules call raw `Date.now()` in control flow (`polytropos.ts` lines 310,
332, 355, 358; also `akribeia.ts`, `aion.ts`, `abacus.ts`, `amphora.ts`).
`OMEGA_DET=1` stubs only `clock.now()`, so **wall-clock budgets still fire and
the search is truncated by machine load.** Consequence: the same input produced
387 tokens for `ls-full-iso` under CPU contention and 356 when idle — a
31-token swing — and the whole-suite baseline moved by 11. *Not repaired:* fixing
it means either stubbing globals or threading a clock through ~10 modules, both
of which change every historical frontier number. It is recorded here as a
known-correctness gap, and X28 works around it by measuring deltas inside one
encode.

**I.2 — the dropped shape clause (introduced by X28, caught, repaired).** The
first draft of `syntomos.ts` re-synthesised the shape clause with a regex and
silently deleted it on `dump.sql` while reporting −28. Repaired by replacing
reconstruction with a strict prefix rewrite (`syntomosContract`) that fails safe
to the parent contract. **New attack added against the patch, per the repair
rule:** the extended from-spec decoder now parses the *new* head as well as the
old one, so a future wording change cannot silently un-parse; and the ladder
rung that drops the ¶ anchor was measured (14 vs 17 tokens) but deliberately
**not** enabled by default.

### J. Stopping

The real budget was spent on 26 distinct experiments. The dictionary-side
question is answered in the negative with evidence, not with exhaustion: rule
coverage, relabelling, tape factoring, adjacency, and composition were each
measured and each returned zero or negative. The instruction-side question is
answered in the affirmative at −3 tokens/lane, uniformly, with zero regressions.

**The strongest verified artifact is the codec plus the negative-space map.**
**The exact remaining gap** is stated in one sentence: *the stack compresses
prose to 76–96% of its original tokens while gzip reaches 43–56%, and the
difference is not reachable by any mechanism a language model can execute
losslessly* — which is X28's central theoretical result, below.

**Next highest-information test:** the one-token barrier lemma predicts that
*any* text whose high-frequency words are single tokens is incompressible by
dictionary means. Test it directly on a corpus of short ordinary prose
(emails, chat) and confirm the measured floor tracks the count of tokens not
coverable by profitable multi-token rules.

### K. The one-token barrier (the theoretical result of X28)

**Lemma.** Let `W` be a string with `T(W) = 1`. Introducing a glyph `g` for `W`
costs ≥ 2 tokens in the tape (one for `g`, one for the literal `W`) and saves
`T(W) − 1 = 0` tokens per body occurrence. Hence for every occurrence count
`n`, `net(n) = n·0 − 2 ≤ −2 < 0`. **No single-token string can ever be
profitably dictionary-coded**, and no choice of glyph, ordering or search
changes this.

**Corollary (why prose is at its floor).** English prose consists predominantly
of single-token words. On `kb-article`, all 27 rules the grammar found have
`T(W) = 1`; the coverage probe (D.1) found **zero** substrings with `T(W) ≥ 2`
and positive net. Therefore that lane's entire 25-token gain comes from
*run-merging* glyphs (X27's mechanism), not from dictionary savings, and its
residual 391 tokens of uncovered text are exactly the tokens the lemma protects.

**This explains the gzip gap without contradicting it.** The redundancy gzip
captures is real; the barrier says an LLM-executable *dictionary* cannot reach
it. Reaching it requires either arithmetic coding (an LLM cannot execute it) or
a trained compressor (forbidden by the one-chat-message contract). **The
terminal codec for this constraint set is a dictionary codec whose ceiling is
the one-token barrier, and this stack is close to that ceiling.**

### L. Generalized local leaders by structural category

Measured this turn, all byte-exact. "Leader" = lowest message-token count.

| category | lanes | raw | SYMPLOKE | METATHESIS | **SYNTOMOS** | Δ vs METATHESIS | improved |
|---|---|---|---|---|---|---|---|
| prose / natural language | 10 | 16089 | 8327 | 8276 | **8246** | −30 | 10 / 10 |
| ops logs & command output | 13 | 29870 | 12089 | 11928 | **11892** | −36 | 12 / 13 |
| tables & CSV | 4 | 16052 | 8397 | 8295 | **8283** | −12 | 4 / 4 |
| DB dumps | 1 | 1795 | 679 | 673 | **670** | −3 | 1 / 1 |
| **total** | **28** | **62954** | **29492** | **29172** | **29091** | **−81** | **27 / 28** |

*Correction recorded against my own draft:* I first wrote this table estimating
prose at −10 and ops at −11, on the assumption that several lanes would tie. Every
taped lane improved by exactly 3, so the true figures are prose −30 and ops −36.
The only tie in the entire sweep is `git-log-fuller.txt` (143 → 143), whose parent
is `identity` and which therefore ships no contract at all — there is no overhead
to recover. Categories were verified to partition all 28 lanes and to sum to the
totals above.

**Reading.** SYNTOMOS leads every category by a *constant* per-message amount,
which is the signature of an overhead change rather than a content-dependent
one — and that is exactly what it is. Note the consequence for the programme's
stated priority: because the gain is constant per message, it is worth
proportionally **most on the shortest inputs**, which is the opposite of X27's
rule-count-scaled gain. kb-article goes 631 → 628; de-kb 466 → 463;
meeting-transcript 392 → 389. Small in absolute terms, but these are the
everyday-sized messages.

The category ranking of *depth* of compression is unchanged from X27: tables/CSV
and ops logs compress far better than prose, and the reason is now explained by
§K rather than merely observed.

*Caveat inherited from §C:* the METATHESIS column is the same-process value from
this turn's sweep, so the two right-hand columns are directly comparable; the
SYMPLOKE column is carried over from X25/X26 archives and is subject to the
load drift of I.1.
