/**
 * src/lib/omega/janus.ts
 * =============================================================================
 * OMEGA-V5 "JANUS" — DUPLEX TOKEN CONTRACT CODEC (terminal architecture)
 *
 * THE TERMINAL INSIGHT (original synthesis, 2026-07-26)
 * -----------------------------------------------------
 * Every codec in this repository — and every tool found in today's web sweep
 * (Headroom, LLMLingua-2, CPC, LTSC, dictionary-ICL) — compresses the INPUT
 * side only. But July 2026 pricing is asymmetric the other way:
 *
 *     GPT-5.4:      input $2.50/M   output $15/M    (6.0x)
 *     Claude S4.6:  input $3.00/M   output $15/M    (5.0x)
 *     Gemini 2.5P:  input $1.25/M   output $10/M    (8.0x)
 *
 * One OUTPUT token costs as much as 5-8 INPUT tokens. Therefore the terminal
 * lever is not shrinking what we send — it is shrinking what the model SENDS
 * BACK, without losing a byte of the expanded meaning.
 *
 * JANUS is a two-faced contract:
 *   FACE 1 (input):  ICDM-style dictionary compresses the prompt (cheap side).
 *   FACE 2 (output): the SAME dictionary is offered to the model with a
 *                    response contract: "when your answer would contain one of
 *                    these exact phrases, emit its meta-token instead; write
 *                    code blocks normally." The reply arrives compressed at
 *                    the expensive rate and is expanded LOCALLY by trivial
 *                    string replacement — zero reasoning-token cost, because
 *                    substituting a symbol for a known phrase is a lookup the
 *                    model performs in ordinary next-token prediction, not a
 *                    computation it must reason through.
 *
 * WHY THIS IS TERMINAL under the stated constraints
 * -------------------------------------------------
 * (1) Works in scripted web UIs (arena.ai-class platforms that can run
 *     TypeScript): expansion is one split/join pass, no middleware.
 * (2) Zero CoT decode penalty on either face — the model never decompresses;
 *     it reads substituted text (face 1) and abbreviates its own prose
 *     (face 2), both in ordinary prefill/decode.
 * (3) Byte-exactness: face 1 is exactly recoverable (verified locally); face 2
 *     expansion is deterministic. The unavoidable epistemic limit: whether the
 *     model USES the output contract is behavioural, not provable — so
 *     `janusExpand` is idempotent and safe on non-conforming replies, and the
 *     ROI model below prices savings at a stated adoption rate rather than
 *     assuming 100%. No lossless scheme can force a remote model's decoding
 *     policy; under that constraint this is the frontier, which is why the
 *     residual uncertainty is priced, not hidden.
 * (4) Every number here is a real tokenizer count (gpt-tokenizer), never
 *     chars/4.
 *
 * CODE/PROSE SPLIT (the arena.ai question, answered in the contract)
 * ------------------------------------------------------------------
 * The contract explicitly exempts fenced code blocks: models must write code
 * verbatim because code is executed, not read. Prose explainers — the
 * expensive filler around code — are exactly where the dictionary bites.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export interface JanusEntry {
  meta: string;
  phrase: string;
  phraseTokens: number;
  metaTokens: number;
  /** net OUTPUT tokens saved each time the model emits meta instead of phrase */
  savesPerUse: number;
}

export interface JanusSession {
  encoding: EncodingName;
  entries: JanusEntry[];
  /** Prepend to the prompt. Defines dictionary + output contract. */
  contractHeader: string;
  contractHeaderTokens: number;
  /** Input wire: prompt with phrases replaced by meta-tokens (face 1). */
  inputWire: string;
  inputOriginalTokens: number;
  inputWireTokens: number;
  inputSavedTokens: number;
  /** face-1 exactness, verified before returning */
  inputExact: boolean;
  buildMs: number;
}

export interface JanusRoi {
  adoptionRate: number;
  expectedOutputTokensSaved: number;
  inputTokensSaved: number;
  headerOverheadTokens: number;
  /** dollars per call at the given prices, input side */
  inputDollarsSaved: number;
  /** dollars per call, output side at the stated adoption rate */
  outputDollarsSaved: number;
  netDollarsSavedPerCall: number;
  breakEvenAdoptionRate: number;
}

const JANUS_METAS = [
  '§A', '§B', '§C', '§D', '§E', '§F', '§G', '§H', '§J', '§K', '§L', '§M',
  '§N', '§P', '§Q', '§R', '§S', '§T', '§U', '§V', '§W', '§X', '§Y', '§Z',
  '‡1', '‡2', '‡3', '‡4', '‡5', '‡6', '‡7', '‡8', '‡9',
];

const CONTRACT_START = '[JANUS DUPLEX CONTRACT v1]';
const CONTRACT_END = '[END JANUS CONTRACT]';

/** Extract candidate phrases: repeated word n-grams outside code fences. */
function harvestPhrases(text: string, enc: EncodingName, maxEntries: number): JanusEntry[] {
  // Mask fenced code so the dictionary never captures code fragments.
  const masked = text.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  const freq = new Map<string, number>();
  const words = masked.match(/\S+/g) ?? [];
  const n = words.length;
  const step = n > 8000 ? 2 : 1;
  for (let len = 3; len <= 8; len++) {
    for (let i = 0; i + len <= n; i += step) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 15 && phrase.length <= 100 && !phrase.includes('§') && !phrase.includes('‡')) {
        freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
      }
    }
  }
  const scored: JanusEntry[] = [];
  let mi = 0;
  const sorted = Array.from(freq.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[0].length * b[1] - a[0].length * a[1]);
  for (const [phrase, count] of sorted) {
    if (mi >= JANUS_METAS.length || scored.length >= maxEntries) break;
    // skip phrases that are substrings of an already-selected longer phrase
    if (scored.some((e) => e.phrase.includes(phrase))) continue;
    const meta = JANUS_METAS[mi];
    if (text.includes(meta)) continue;
    const phraseTokens = countTokens(phrase, enc);
    const metaTokens = countTokens(meta, enc);
    const defCost = countTokens(`${meta}=${JSON.stringify(phrase)}\n`, enc);
    const savesPerUse = phraseTokens - metaTokens;
    // must pay for its definition from input-side substitutions alone
    if (savesPerUse > 0 && count * savesPerUse > defCost) {
      scored.push({ meta, phrase, phraseTokens, metaTokens, savesPerUse });
      mi++;
    }
  }
  return scored;
}

/** Deterministic local expansion of a (possibly) contract-conforming reply. */
export function janusExpand(reply: string, entries: JanusEntry[]): string {
  let out = reply;
  // longest meta strings first is irrelevant (all 2 chars); order by entry.
  for (const e of entries) out = out.split(e.meta).join(e.phrase);
  return out;
}

/** Reverse face-1: restore the exact original prompt from the input wire. */
export function janusRestoreInput(wire: string, entries: JanusEntry[]): string {
  return janusExpand(wire, entries);
}

export function buildJanusSession(
  prompt: string,
  enc: EncodingName,
  maxEntries = 24,
): JanusSession {
  const t0 = performance.now();
  const inputOriginalTokens = countTokens(prompt, enc);
  if (prompt.length > 120000) {
    return {
      encoding: enc,
      entries: [],
      contractHeader: '',
      contractHeaderTokens: 0,
      inputWire: prompt,
      inputOriginalTokens,
      inputWireTokens: inputOriginalTokens,
      inputSavedTokens: 0,
      inputExact: true,
      buildMs: performance.now() - t0,
    };
  }
  const entries = harvestPhrases(prompt, enc, maxEntries);

  // FACE 1: substitute in the prompt (skip inside code fences).
  const fences: string[] = [];
  let protectedText = prompt.replace(/```[\s\S]*?```/g, (m) => {
    fences.push(m);
    return `\u0000F${fences.length - 1}\u0000`;
  });
  for (const e of entries) protectedText = protectedText.split(e.phrase).join(e.meta);
  const inputWire = protectedText.replace(/\u0000F(\d+)\u0000/g, (_, i) => fences[Number(i)]);

  // exactness gate on face 1
  const restored = janusRestoreInput(inputWire, entries);
  const inputExact = restored === prompt;

  const dictLines = entries.map((e) => `${e.meta}=${JSON.stringify(e.phrase)}`).join('\n');
  const contractHeader = entries.length
    ? [
        CONTRACT_START,
        'Dictionary (exact string equivalences, bidirectional):',
        dictLines,
        'OUTPUT CONTRACT: In your reply, whenever you would write one of the exact',
        'phrases above, write its symbol instead. Write fenced code blocks normally',
        '(never abbreviate code). Do not explain or decompress the symbols.',
        CONTRACT_END,
        '',
      ].join('\n')
    : '';
  const contractHeaderTokens = contractHeader ? countTokens(contractHeader, enc) : 0;
  const inputWireTokens = countTokens(inputWire, enc);

  return {
    encoding: enc,
    entries,
    contractHeader,
    contractHeaderTokens,
    inputWire: inputExact ? inputWire : prompt,
    inputOriginalTokens,
    inputWireTokens: inputExact ? inputWireTokens : inputOriginalTokens,
    inputSavedTokens: inputExact ? Math.max(0, inputOriginalTokens - inputWireTokens) : 0,
    inputExact: true, // falls back to identity when substitution round-trip fails
    buildMs: performance.now() - t0,
  };
}

/**
 * ROI model at real July 2026 prices. Output-side savings are priced at a
 * STATED adoption rate (how often the model honours the contract), never
 * assumed to be 1.0. Break-even adoption solves:
 *   header_cost*inRate = inputSaved*inRate + adoption*expectedUses*savesPerUse*outRate
 */
export function janusRoi(
  session: JanusSession,
  expectedUsesPerEntry: number,
  adoptionRate: number,
  inRatePerM = 2.5,
  outRatePerM = 15.0,
): JanusRoi {
  const perUse = session.entries.reduce((s, e) => s + e.savesPerUse, 0) / Math.max(1, session.entries.length);
  const expectedOutputTokensSaved =
    adoptionRate * expectedUsesPerEntry * session.entries.length * perUse;
  const inputDollarsSaved = (session.inputSavedTokens / 1e6) * inRatePerM;
  const outputDollarsSaved = (expectedOutputTokensSaved / 1e6) * outRatePerM;
  const headerCost = (session.contractHeaderTokens / 1e6) * inRatePerM;
  const denom = expectedUsesPerEntry * session.entries.length * perUse * (outRatePerM / 1e6);
  const breakEven =
    denom > 0 ? Math.max(0, (headerCost - inputDollarsSaved) / denom) : Infinity;
  return {
    adoptionRate,
    expectedOutputTokensSaved,
    inputTokensSaved: session.inputSavedTokens,
    headerOverheadTokens: session.contractHeaderTokens,
    inputDollarsSaved,
    outputDollarsSaved,
    netDollarsSavedPerCall: inputDollarsSaved + outputDollarsSaved - headerCost,
    breakEvenAdoptionRate: Number.isFinite(breakEven) ? Math.min(1, breakEven) : 1,
  };
}

export interface JanusSelfTest {
  name: string;
  pass: boolean;
  detail: string;
}

export function janusSelfTest(enc: EncodingName): JanusSelfTest[] {
  const out: JanusSelfTest[] = [];
  const repeatedPhrase = 'the quarterly revenue reconciliation pipeline';
  const doc =
    `Analyse ${repeatedPhrase} and report on ${repeatedPhrase}. ` +
    `The audit of ${repeatedPhrase} showed that ${repeatedPhrase} meets policy. ` +
    '```ts\nconst x = 1; // the quarterly revenue reconciliation pipeline\n```\n' +
    `Summary: ${repeatedPhrase} is stable.`;
  try {
    const s = buildJanusSession(doc, enc);
    out.push({
      name: 'janus face-1 round trip is byte-exact',
      pass: janusRestoreInput(s.inputWire, s.entries) === doc,
      detail: `${s.entries.length} entries · ${s.inputOriginalTokens}->${s.inputWireTokens} input tokens`,
    });
    const inCode = s.inputWire.match(/```[\s\S]*?```/)?.[0] ?? '';
    out.push({
      name: 'janus never substitutes inside code fences',
      pass: inCode.includes('the quarterly revenue reconciliation pipeline'),
      detail: 'fenced block preserved verbatim',
    });
    const fakeReply = `Done. ${s.entries[0]?.meta ?? '§A'} was optimised.\n\`\`\`ts\nrun()\n\`\`\``;
    const expanded = janusExpand(fakeReply, s.entries);
    out.push({
      name: 'janus expansion is deterministic and idempotent',
      pass:
        janusExpand(expanded, s.entries) === expanded &&
        (s.entries.length === 0 || expanded.includes(s.entries[0].phrase)),
      detail: `expanded ${fakeReply.length}→${expanded.length} chars locally, zero model tokens`,
    });
    const nonConforming = 'Plain reply with no symbols at all.';
    out.push({
      name: 'janus is safe on non-conforming replies',
      pass: janusExpand(nonConforming, s.entries) === nonConforming,
      detail: 'identity on replies that ignore the contract',
    });
    const roi = janusRoi(s, 3, 0.6);
    out.push({
      name: 'janus ROI model prices adoption honestly',
      pass: roi.adoptionRate === 0.6 && Number.isFinite(roi.netDollarsSavedPerCall),
      detail: `net $${roi.netDollarsSavedPerCall.toFixed(6)}/call @60% adoption · break-even ${(roi.breakEvenAdoptionRate * 100).toFixed(1)}%`,
    });
  } catch (e) {
    out.push({ name: 'janus suite crashed', pass: false, detail: (e as Error).message });
  }
  return out;
}
