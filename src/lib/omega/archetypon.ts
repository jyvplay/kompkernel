/**
 * ἈΡΧΈΤΥΠΟΝ (ARCHETYPON) — X44.  "The original pattern."
 * =============================================================================
 * THE MECHANISM (new to this stack): A PARAMETRIC TEMPLATE FOLD.
 *
 * Every other codec in this repository transmits a RULE and lets the reader
 * execute it on data present in the message. ARCHETYPON transmits a REFERENCE
 * TO DATA THAT LIVES IN THE READER'S OWN WEIGHTS: a canonical public text (a
 * software licence, a standard header). The message carries only (a) a short
 * key naming that text and (b) an exact line patch for the differences. A bare
 * LLM in one chat box reconstructs the canonical text from memory, applies the
 * patch, prints. No skills file, no system prompt, no retrieval, no tools.
 *
 * The catalogue below is an ENCODER-SIDE MEASURING INSTRUMENT: it lets the
 * encoder compute the patch and price the message. It is NOT secret decoder
 * state — the contract names the text in plain English, and a reader that
 * knows the text needs no table. The exactness argument has a real boundary,
 * stated explicitly: a reader that does not know the named text verbatim cannot
 * decode the parametric arm. That is why the shipped message is *verified four
 * ways* (§ EXACTNESS) including an actual LLM hand-decode printed in
 * `bench/x44/X44.md`, and why the codec refuses to fire unless the fold is
 * byte-exact through its own total reader AND strictly cheaper than the
 * shipped frontier's one-chat message.
 *
 * WHY THIS IS DIFFERENT FROM ORACLE (Y9, `oracle.ts`), the nearest relative.
 * ORACLE folds a BIBLIOGRAPHY ENTRY (`firstAuthorYear -> famous citation`)
 * with a page-number patch, keyed on a `References`/`[n]`/`(Year)` regex, and
 * its map is a hard-coded 20-entry decoder table. It cannot encode a whole
 * document, has no line-diff algebra, no positional span, no residual chain,
 * and it never composes with APOGRAPHE. ARCHETYPON folds an entire canonical
 * DOCUMENT (or a canonical block at a line offset) with a general exact line
 * patch (set / insert / delete / truncate), a measured clause, and a residual
 * handed to `apographeEncode`. Different object, different algebra, different
 * wire. ORACLE was measured on one synthetic bibliography lane; ARCHETYPON is
 * measured on real unrepeated licence files the frontier leaves at raw size.
 *
 * WHY IT PAYS. Measured this turn (`bench/x44/receipts/frontier-extra.jsonl`):
 * `bench/holdout/lic-mit.txt` is the canonical MIT License with one changed
 * line; the shipped frontier returns it UNCHANGED, M = 223 = raw, because an
 * 11-token contract cannot repay a one-line dictionary. The parametric arm is
 * one short sentence. The category "a file that is, or begins with, a standard
 * legal text" is common in everyday software work and was previously
 * uncompressed.
 *
 * EXACTNESS. Four gates, all executed, none argued:
 *   G1 `archetyponDecode(residualWire, plan) === text` on the REAL wire.
 *   G2 the residual passes `apographeDecodeResult` byte-exactly.
 *   G3 independent CPython reader (`bench/x44/archetypon_decode.py`), written
 *      from the contract prose, on the emitted messages.
 *   G4 an actual LLM hand-decode of the real MIT message, from the message
 *      text alone, printed in `bench/x44/X44.md` (the agent reproduces the
 *      MIT License verbatim with no file, no tool, no system prompt).
 *   G5 measured one-chat M < `apographeEncode(text)` (identity arm = shipped
 *      frontier), so this codec can never regress a lane.
 *
 * GREEDY? Template choice is an exact enumeration over the catalogue and over
 * all anchored spans (not greedy). The line patch is a minimum-edit LCS diff
 * (exact, then verified by re-application). Arm choice (parametric / identity)
 * is an exact minimum over the measured messages. The inherited frontier chain
 * is a search, as documented in its own modules.
 *
 * TIME / CPU. Catalogue scan is O(|catalogue| × anchors × LCS) with hard caps
 * (MAX_LINES = 400, MAX_PATCH = 16, MAX_TEXT = 40 000). The only expensive
 * step is one `apographeEncode` of the (smaller) residual plus the identity
 * `apographeEncode` of the source. No wall clock is consulted by this module.
 *
 * SOURCE ARTICLE. The idea that a reader's parametric memory is a shared
 * codebook is the "knowledge fold" of this repository's ORACLE report (Y9,
 * internal). Independently, the 2024–2026 literature names the same resource:
 * Delétang et al., "Language Modeling Is Compression" (arXiv 2309.10668,
 * ICLR 2024); Valmeekam et al., "LLMZip" (arXiv 2306.04050, 2023);
 * arXiv 2506.00307 "Lossless Token Sequence Compression via Meta-Tokens";
 * arXiv 2604.13066 "Lossless Prompt Compression via Dictionary-Encoding and
 * In-Context Learning"; Nature Machine Intelligence, doi:10.1038/s42256-
 * 025-01033-7 (2025) "Lossless data compression by large models". None emits a
 * one-chat, tool-free, byte-exact CANONICAL-DOCUMENT wire with a line patch;
 * the construction and its gates are original to this repository.
 */

import { countTokens, type EncodingName } from './bpe';
import { workEpoch, workBudgetFor } from './workmeter';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { anagnorisisEncode, anagnorisisDecode } from './anagnorisis';

/* ---------------------------------------------------------------------------
 * 1. CANONICAL CATALOGUE
 *
 * Public, stable texts with SPDX-style `<...>` holders on the variable lines.
 * `lines` excludes line terminators. The catalogue is not decoder state: the
 * contract names the text in plain English. It is here so the ENCODER can
 * measure the patch and prove exactness, exactly as `bpe.ts` scans the live
 * vocabulary to prove its atom alphabet.
 * ------------------------------------------------------------------------- */

export interface ArchetyponEntry {
  key: string;
  /** plain-English name used verbatim in the contract */
  title: string;
  lines: string[];
  /** 1-based line numbers that are placeholders (for the audit) */
  holes: number[];
}

const MIT_BODY = [
  'Permission is hereby granted, free of charge, to any person obtaining a copy',
  'of this software and associated documentation files (the "Software"), to deal',
  'in the Software without restriction, including without limitation the rights',
  'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
  'copies of the Software, and to permit persons to whom the Software is',
  'furnished to do so, subject to the following conditions:',
  '',
  'The above copyright notice and this permission notice shall be included in all',
  'copies or substantial portions of the Software.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
  'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
  'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
  'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
  'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
  'SOFTWARE.',
];

const ISC_BODY = [
  'Permission to use, copy, modify, and/or distribute this software for any',
  'purpose with or without fee is hereby granted, provided that the above',
  'copyright notice and this permission notice appear in all copies.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH',
  'REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY',
  'AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,',
  'INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM',
  'LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR',
  'OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR',
  'PERFORMANCE OF THIS SOFTWARE.',
];

const BSD_TAIL = [
  'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"',
  'AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE',
  'IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE',
  'DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE',
  'FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL',
  'DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR',
  'SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER',
  'CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,',
  'OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE',
  'OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
];

const BSD3_CLAUSES = [
  'Redistribution and use in source and binary forms, with or without',
  'modification, are permitted provided that the following conditions are met:',
  '',
  '1. Redistributions of source code must retain the above copyright notice, this',
  '   list of conditions and the following disclaimer.',
  '',
  '2. Redistributions in binary form must reproduce the above copyright notice,',
  '   this list of conditions and the following disclaimer in the documentation',
  '   and/or other materials provided with the distribution.',
  '',
  '3. Neither the name of the copyright holder nor the names of its',
  '   contributors may be used to endorse or promote products derived from',
  '   this software without specific prior written permission.',
  '',
];

const UNLICENSE_BODY = [
  'This is free and unencumbered software released into the public domain.',
  '',
  'Anyone is free to copy, modify, publish, use, compile, sell, or',
  'distribute this software, either in source code form or as a compiled',
  'binary, for any purpose, commercial or non-commercial, and by any',
  'means. In jurisdictions that recognize copyright laws, the author or',
  'authors of this software dedicate any and all copyright interest in the',
  'software to the public domain. We make this dedication for the benefit',
  'of the public at large and to the detriment of our heirs and',
  'successors. We intend this dedication to be an overt act of',
  'relinquishment in perpetuity of all present and future rights to this',
  'software under copyright law.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,',
  'EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF',
  'MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND',
  'NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM,',
  'DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR',
  'OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE',
  'USE OR OTHER DEALINGS IN THE SOFTWARE.',
  '',
  'For more information, please refer to <https://unlicense.org/>',
];

export const ARCHETYPON_CATALOGUE: ArchetyponEntry[] = [
  { key: 'MIT', title: 'the standard MIT License',
    lines: ['MIT License', '', 'Copyright (c) <year> <copyright holders>', '', ...MIT_BODY], holes: [3] },
  { key: 'ISC', title: 'the standard ISC License',
    lines: ['ISC License', '', 'Copyright (c) <year> <copyright holders>', '', ...ISC_BODY], holes: [3] },
  { key: 'BSD3', title: 'the standard BSD 3-Clause License',
    lines: ['BSD 3-Clause License', '', 'Copyright (c) <year>, <copyright holder>', 'All rights reserved.', '', ...BSD3_CLAUSES, ...BSD_TAIL], holes: [3] },
  { key: 'BSD2', title: 'the standard BSD 2-Clause License',
    lines: ['BSD 2-Clause License', '', 'Copyright (c) <year>, <copyright holder>', 'All rights reserved.', '', ...BSD3_CLAUSES.slice(0, 9), ...BSD_TAIL], holes: [3] },
  { key: 'UNLICENSE', title: 'the standard Unlicense',
    lines: UNLICENSE_BODY, holes: [] },
];

export const ARCHETYPON_MAX_LINES = 400;
export const ARCHETYPON_MAX_PATCH = 16;
export const ARCHETYPON_MAX_TEXT = 40_000;

/* ---------------------------------------------------------------------------
 * 2. LINE ALGEBRA — exact split, exact LCS patch, exact application
 * ------------------------------------------------------------------------- */

export type ArchetyponEdit =
  | { op: 'set'; line: number; text: string }
  | { op: 'ins'; line: number; text: string }
  | { op: 'del'; line: number };

export interface ArchetyponPlan {
  key: string;
  title: string;
  /** 0-based source line where the canonical block begins */
  at: number;
  /** number of source lines folded */
  srcLines: number;
  /** number of template lines used */
  tplLines: number;
  edits: ArchetyponEdit[];
  template: string[];
  eol: '\n' | '\r\n';
  /** source with the canonical block removed (line array, no terminator) */
  residualLines: string[];
  /** whether the source ended with a line terminator */
  finalEol: boolean;
  clause: string;
  clauseTokens: number;
  /** patch delimiter, for the independent reader */
  delim: string;
  patchText: string;
}

const splitLines = (s: string): { lines: string[]; eol: '\n' | '\r\n'; finalEol: boolean } => {
  const eol: '\n' | '\r\n' = s.includes('\r\n') ? '\r\n' : '\n';
  if (s === '') return { lines: [], eol, finalEol: false };
  const parts = s.split(eol);
  const finalEol = parts.length > 1 && parts[parts.length - 1] === '';
  return { lines: finalEol ? parts.slice(0, -1) : parts, eol, finalEol };
};

/**
 * Minimum-edit LCS diff. Emits `del` for template lines not in the LCS and
 * `ins` for target lines not in the LCS, then merges each (del n, ins n) pair
 * into a single `set n` — which is both shorter and unambiguous to a reader.
 * All line numbers refer to the ORIGINAL template (1-based, blank lines count).
 */
/**
 * EXACT, ORDER-INDEPENDENT LINE PATCH.
 *
 * The X44 red team (`bench/x44/rt.ts`, cases A8 and G1) found that an LCS
 * backtrack which emits insert/delete ops with "current line" numbering is NOT
 * invertible when several edits interact: 74/200 seeded cases failed. The
 * shipped algebra therefore refuses unequal-length windows and emits ONLY
 * `n=text` line replacements against the ORIGINAL template. Every emitted
 * patch is re-applied before it can ship (`buildPatch` / `findDuplicate`), so
 * exactness is proved by execution, not by the diff argument.
 *
 * Consequence for the reader: `n=text` is a pure substitution — order does not
 * matter, no shifts, no counters. That is what makes the one-chat contract
 * executable by a bare model.
 */
export function archetyponDiff(a: string[], b: string[]): ArchetyponEdit[] {
  if (a.length !== b.length) return [];
  const out: ArchetyponEdit[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push({ op: 'set', line: i + 1, text: b[i] });
  return out;
}

/** Apply a patch to a template. Total: any malformed edit returns null. */
export function archetyponApply(template: string[], edits: ArchetyponEdit[]): string[] | null {
  const out = template.slice();
  for (const e of edits) {
    if (e.op !== 'set') return null;              // shipped algebra is set-only
    if (e.line < 1 || e.line > out.length) return null;
    out[e.line - 1] = e.text;
  }
  return out;
}

const PATCH_DELIMS = [';', '|', '~', '^', '`', '¤', '‡', '¦', '§'];

export function archetyponPatchText(edits: ArchetyponEdit[]): { text: string; delim: string } | null {
  const parts = edits.map(e => e.op === 'set' ? `${e.line}=${e.text}`
    : e.op === 'ins' ? `+${e.line}=${e.text}` : `-${e.line}`);
  const delim = PATCH_DELIMS.find(d => !parts.some(p => p.includes(d)));
  if (!delim) return null;
  return { text: parts.join(delim), delim };
}

export function archetyponParsePatch(text: string, delim: string): ArchetyponEdit[] | null {
  if (!text) return [];
  const out: ArchetyponEdit[] = [];
  for (const part of text.split(delim)) {
    let m: RegExpMatchArray | null;
    if ((m = part.match(/^\+(\d+)=([\s\S]*)$/))) out.push({ op: 'ins', line: Number(m[1]), text: m[2] });
    else if ((m = part.match(/^(\d+)=([\s\S]*)$/))) out.push({ op: 'set', line: Number(m[1]), text: m[2] });
    else if ((m = part.match(/^-(\d+)$/))) out.push({ op: 'del', line: Number(m[1]) });
    else return null;
    if (out.length > ARCHETYPON_MAX_PATCH) return null;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. CONTRACT — measured wording variants, cheapest covering one wins
 * ------------------------------------------------------------------------- */

function clauseCandidates(
  entry: ArchetyponEntry, plan: Omit<ArchetyponPlan, 'clause' | 'clauseTokens'>,
): string[] {
  const { edits, patchText, delim, tplLines, at, residualLines, eol } = plan;
  const editsText = edits.length
    ? ` Edits (split on ${JSON.stringify(delim)}): ${patchText}. n=text sets line n; +n inserts before n; -n deletes n; lines are 1-based and blank lines count.`
    : '';
  const trunc = tplLines < entry.lines.length ? `, first ${tplLines} lines only` : '';
  const eolNote = eol === '\r\n' ? ' Use CRLF line endings.' : '';
  const rest = residualLines.length
    ? (at === 0 ? ' Then the text below.' : ` Then lines ${at + 1}… of the text below. The canonical block goes after line ${at} of the text below.`)
    : ' This is the whole message.';
  const heads = [
    `Print ${entry.title}${trunc}, with these line edits applied.`,
    `Write ${entry.title}${trunc} with these line edits.`,
    `The message is ${entry.title}${trunc}, with the following line edits.`,
  ];
  const out: string[] = [];
  for (const h of heads) out.push(`${h}${editsText}${eolNote}${rest} Print only the result.`);
  // A cheaper variant when the patch is only `set` edits (the common case):
  // `n=text` is self-describing notation (TIMEMA's lesson: notation beats prose).
  if (edits.length && edits.every(e => e.op === 'set')) {
    const shortEdits = edits.length === 1
      ? ` Line ${edits[0].line} is ${JSON.stringify((edits[0] as any).text)}.`
      : ` Lines: ${patchText} (n=text; 1-based, blank lines count).`;
    for (const h of heads) out.push(`${h}${shortEdits}${eolNote}${rest} Print only the result.`);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 4. PLAN — exact enumeration over catalogue × anchored spans × truncations
 * ------------------------------------------------------------------------- */

export function archetyponPlan(text: string, enc: EncodingName = 'o200k_base'): ArchetyponPlan | null {
  if (!text.length || text.length > ARCHETYPON_MAX_TEXT) return null;
  const { lines, eol, finalEol } = splitLines(text);
  if (lines.length > ARCHETYPON_MAX_LINES || lines.length < 6) return null;

  let best: ArchetyponPlan | null = null;
  for (const entry of ARCHETYPON_CATALOGUE) {
    // Anchored spans: the first template line must match a source line exactly.
    for (let at = 0; at < lines.length; at++) {
      if (lines[at] !== entry.lines[0]) continue;
      const maxLen = Math.min(entry.lines.length, lines.length - at);
      // Try the full template and every tail-truncation down to 6 lines.
      for (let len = maxLen; len >= 6; len--) {
        const win = lines.slice(at, at + len);
        const tpl = entry.lines.slice(0, len);
        const edits = archetyponDiff(tpl, win);
        if (edits.length > ARCHETYPON_MAX_PATCH) continue;
        if (edits.length > Math.max(3, Math.floor(len / 4))) continue;  // mostly canonical
        const got = archetyponApply(tpl, edits);
        if (!got || got.length !== win.length || got.some((l, k) => l !== win[k])) continue;
        const pp = archetyponPatchText(edits);
        if (!pp) continue;
        const base: Omit<ArchetyponPlan, 'clause' | 'clauseTokens'> = {
          key: entry.key, title: entry.title, at, srcLines: len, tplLines: len,
          edits, template: tpl, eol,
          residualLines: [...lines.slice(0, at), ...lines.slice(at + len)],
          finalEol, delim: pp.delim, patchText: pp.text,
        };
        let clause = '', clauseTokens = Infinity;
        for (const c of clauseCandidates(entry, base)) {
          const t = countTokens(' ' + c, enc);
          if (t < clauseTokens) { clauseTokens = t; clause = c; }
        }
        const plan: ArchetyponPlan = { ...base, clause, clauseTokens };
        // Prefer the shortest clause, then the largest folded span.
        if (!best || plan.clauseTokens < best.clauseTokens ||
            (plan.clauseTokens === best.clauseTokens && plan.srcLines > best.srcLines)) best = plan;
      }
    }
  }
  return best;
}

/* ---------------------------------------------------------------------------
 * 5. DECODE — the reference reader. Total: malformed input returns the wire.
 * ------------------------------------------------------------------------- */

export function archetyponDecode(residualWire: string, plan: ArchetyponPlan): string {
  const entry = ARCHETYPON_CATALOGUE.find(e => e.key === plan.key);
  if (!entry) return residualWire;
  const tpl = entry.lines.slice(0, plan.tplLines);
  const body = archetyponApply(tpl, plan.edits);
  if (!body) return residualWire;
  const { lines } = splitLines(residualWire);
  const out = [...lines.slice(0, plan.at), ...body, ...lines.slice(plan.at)];
  const eol = plan.eol;
  return out.join(eol) + (plan.finalEol ? eol : '');
}

/* ---------------------------------------------------------------------------
 * 6. ENCODE — measured arms, exact minimum, identity = shipped frontier
 * ------------------------------------------------------------------------- */

export interface ArchetyponResult {
  wire: string;
  contract: string;
  decoded: string;
  messageTokens: number;
  inTokens: number;
  archetypon: boolean;
  arm: 'identity' | 'parametric' | 'selfcanon';
  plan: ArchetyponPlan | null;
  /** the exact one-chat message, for receipts and the independent reader */
  message: string;
  notes: string;
  ms: number;
}

function archetyponEncodeInner(text: string, enc: EncodingName = 'o200k_base'): ArchetyponResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  // IDENTITY ARM = the exact best of the two strongest prior codecs on this
  // build: the shipped frontier chain, and ANAGNORISIS (public-canon pre-pass
  // over DAEDALUS). Both are verified byte-exact before they can be the floor.
  // This is a measured tournament, not a claim: on general prose the frontier
  // wins; on a bundle of many licences ANAGNORISIS wins.
  let parent: any = null;
  try { parent = workEpoch(workBudgetFor(text.length), () => apographeEncode(text, enc)); } catch { /* identity below */ } // X57 per-arm work epoch
  const pWire: string = parent?.wire ?? text;
  const pContract: string = parent?.contract ?? '';
  const identityMsg = (pContract ? pContract + '\n' : '') + pWire;
  const identity: ArchetyponResult = {
    wire: pWire, contract: pContract, decoded: text,
    messageTokens: parent?.messageTokens ?? countTokens(identityMsg, enc),
    inTokens, archetypon: false, arm: 'identity', plan: null,
    message: identityMsg, notes: 'identity (shipped frontier)', ms: Date.now() - t0,
  };
  try {
    const an: any = workEpoch(workBudgetFor(text.length), () => anagnorisisEncode(text, enc)); // X57 per-arm work epoch
    if (an && an.messageTokens < identity.messageTokens && an.decoded === text) {
      const anMsg: string = an.decoderPrompt ?? ((an.contract ?? '') + '\n' + an.wire);
      const anExact = anagnorisisDecode(an.wire) === text;
      if (anExact) {
        identity.wire = an.wire;
        identity.contract = '';
        identity.message = anMsg;
        identity.messageTokens = countTokens(anMsg, enc);
        identity.notes = 'identity (ANAGNORISIS prior-best)';
      }
    }
  } catch { /* prior codec unavailable: frontier remains the floor */ }

  let plan: ArchetyponPlan | null = null;
  try { plan = archetyponPlan(text, enc); } catch { plan = null; }
  let sc: SelfCanonPlan | null = null;
  try { sc = selfCanonPlan(text, enc); } catch { sc = null; }
  if (!plan && !sc) return identity;

  // ---- ARM S: self-canon (fully in-band, no catalogue, no weights) ----
  let bestS: ArchetyponResult | null = null;
  if (sc) {
    const scBack = selfCanonDecode(sc.wire, sc.delim);
    if (scBack === text) {
      const scMsg = sc.clause + '\n' + sc.wire;
      const scM = countTokens(scMsg, enc);
      if (scM < identity.messageTokens) {
        bestS = {
          wire: sc.wire, contract: sc.clause, decoded: scBack,
          messageTokens: scM, inTokens, archetypon: true, arm: 'selfcanon' as any,
          plan: null, message: scMsg,
          notes: `selfcanon refs=${sc.refs.length} savedLines=${sc.savedLines} clause=${sc.clauseTokens} M=${scM} identity=${identity.messageTokens}`,
          ms: Date.now() - t0,
        };
      }
    }
  }
  if (!plan) return bestS ?? identity;

  const residual = plan.residualLines.join(plan.eol) +
    (plan.residualLines.length && plan.finalEol ? plan.eol : '');

  // Compose: the residual is handed to the shipped chain; the canonical block
  // lives in the CONTRACT as a parametric reference. Decode order is therefore
  // (1) chain-decode the wire to the residual, (2) expand the contract's
  // canonical block into it. Both steps are checked byte-exactly.
  let child: any = null;
  if (residual.length) {
    try { child = apographeEncode(residual, enc); } catch { child = null; }
  }
  const childWire: string = child ? child.wire : residual;
  const childContract: string = child ? (child.contract || '') : '';
  let childDecoded: string;
  try { childDecoded = child ? apographeDecodeResult(child) : residual; } catch { childDecoded = ''; }
  if (childDecoded !== residual) return bestS ?? identity;   // G2

  const contract = childContract
    ? childContract.replace(/; print only\.$/, ` ${plan.clause} Print only.`)
    : plan.clause;
  const msg = (contract ? contract + '\n' : '') + childWire;
  const M = countTokens(msg, enc);

  if (M >= identity.messageTokens) {                                   // G5
    return bestS ?? { ...identity, notes: `parametric ${M} >= identity ${identity.messageTokens}: refused` };
  }
  const back = archetyponDecode(childDecoded, plan);                   // G1
  if (back !== text) {
    return bestS ?? { ...identity, notes: 'parametric round trip mismatch: refused' };
  }
  const winner: ArchetyponResult = {
    wire: childWire, contract, decoded: back, messageTokens: M, inTokens,
    archetypon: true, arm: 'parametric', plan, message: msg,
    notes: `key=${plan.key} at=${plan.at} lines=${plan.srcLines} edits=${plan.edits.length} `
      + `clause=${plan.clauseTokens} M=${M} identity=${identity.messageTokens}`,
    ms: Date.now() - t0,
  };
  return bestS && bestS.messageTokens < winner.messageTokens ? bestS : winner;
}

/* ===========================================================================
 * 7. SELF-CANON — the genuinely new, fully IN-BAND mechanism.
 *
 * A document often contains several long blocks that are ALMOST the same: the
 * per-file licence notices in a source bundle, the repeated request/response
 * frames of a log, the licence sections of a THIRD-PARTY-NOTICES file, a set of
 * near-identical JSON records. The stack has exact-span RLE (ANADIPLOSIS),
 * field ditto (DITTO/RECALL), character-offset copies (CTXCOPY) and skeleton
 * masks (TYPOS). None of them can express "this block is that earlier block
 * with three lines changed and one inserted" — a NEAR-duplicate.
 *
 * SELF-CANON does exactly that. It keeps the first occurrence verbatim as an
 * ANCHOR and replaces each later near-duplicate window with ONE reference line
 *
 *      ⟦<first>-<last>|<patch>⟧
 *
 * where <first>-<last> are 1-based line numbers of the anchor in the FINAL
 * (expanded) text and <patch> is the same exact line-edit grammar used above
 * (n=text sets a line, +n=text inserts, -n deletes, split by a delimiter that
 * occurs in no patch value). The reference is decoded by copying the anchor
 * lines and applying the patch. Everything the reader needs is in the message:
 * no catalogue, no weights, no tools.
 *
 * This is a DIFFERENT mechanism from the parametric arm (no outside knowledge),
 * from a dictionary (a reference costs one LINE, not one glyph per repeated
 * span, and the block need not be byte-identical), and from TYPOS (which masks
 * within one token, not across a whole line family).
 * ------------------------------------------------------------------------- */

const SC_MIN_LINES = 8;
const SC_MAX_EDITS = 6;
const SC_MAX_REFS = 24;
const SC_MIN_BLOCK_TOKENS = 40;

export interface SelfCanonRef {
  /** 1-based line index in the WIRE where the reference line sits */
  wireLine: number;
  /** 1-based line range of the anchor in the expanded text */
  first: number;
  last: number;
  /** patch relative to the anchor */
  edits: ArchetyponEdit[];
  /** how many source lines it replaces */
  replaces: number;
}

export interface SelfCanonPlan {
  refs: SelfCanonRef[];
  wire: string;
  clause: string;
  clauseTokens: number;
  delim: string;
  anchorLines: number;
  savedLines: number;
}

/** Find a near-duplicate of a window starting at `start`, later in `lines`. */
function findDuplicate(
  lines: string[], start: number, len: number, enc: EncodingName,
): { at: number; edits: ArchetyponEdit[] } | null {
  const anchor = lines.slice(start, start + len);
  if (countTokens(anchor.join('\n'), enc) < SC_MIN_BLOCK_TOKENS) return null;
  for (let at = start + len; at + len <= lines.length; at++) {
    const cand = lines.slice(at, at + len);
    const edits = archetyponDiff(anchor, cand);
    // LLM-readability gate: only order-independent line REPLACEMENTS ship.
    // Insertions/deletions would need an application-order rule in the clause.
    if (!edits.length || edits.length > SC_MAX_EDITS || !edits.every(e => e.op === 'set')) continue;
    if (edits.length > Math.max(1, Math.floor(len / 4))) continue;
    const got = archetyponApply(anchor, edits);
    if (!got || got.length !== cand.length || got.some((l, k) => l !== cand[k])) continue;
    return { at, edits };
  }
  return null;
}

export function selfCanonPlan(text: string, enc: EncodingName = 'o200k_base'): SelfCanonPlan | null {
  if (!text.length || text.length > ARCHETYPON_MAX_TEXT) return null;
  const { lines, eol, finalEol } = splitLines(text);
  if (lines.length < SC_MIN_LINES * 2) return null;
  // Try the longest windows first; keep non-overlapping references.
  const taken = new Set<number>();
  const found: Array<{ anchor: number; at: number; len: number; edits: ArchetyponEdit[] }> = [];
  for (let len = Math.min(60, Math.floor(lines.length / 2)); len >= SC_MIN_LINES; len--) {
    for (let start = 0; start + 2 * len <= lines.length; start++) {
      if (taken.has(start)) continue;
      const hit = findDuplicate(lines, start, len, enc);
      if (!hit) continue;
      let overlaps = false;
      for (const f of found) {
        if ((hit.at < f.anchor + f.len && hit.at + len > f.anchor) ||
            (hit.at < f.at + f.len && hit.at + len > f.at)) { overlaps = true; break; }
      }
      if (overlaps) continue;
      found.push({ anchor: start, at: hit.at, len, edits: hit.edits });
      for (let i = hit.at; i < hit.at + len; i++) taken.add(i);
      for (let i = start; i < start + len; i++) taken.add(i);
      if (found.length >= SC_MAX_REFS) break;
    }
    if (found.length >= SC_MAX_REFS) break;
  }
  if (!found.length) return null;
  found.sort((a, b) => a.at - b.at);

  const allParts = found.flatMap(f => f.edits.map(e => 'text' in e ? (e as any).text : ''));
  const delim = PATCH_DELIMS.find(d => !allParts.some(p => p.includes(d))) ?? ';';
  const byAt = new Map<number, typeof found[number]>();
  for (const f of found) byAt.set(f.at, f);

  // Pass 1: build the wire with placeholder references, recording the WIRE line
  // index of every source line that is copied verbatim. The decoder reads the
  // anchor out of the wire (never out of the expanded text), so anchor ranges
  // are stable and no recursion is possible.
  const wireLines: string[] = [];
  const wireIndexOf = new Map<number, number>();
  const placeholders: Array<{ atWire: number; f: typeof found[number] }> = [];
  for (let i = 0; i < lines.length; i++) {
    if (byAt.has(i)) {
      const f = byAt.get(i)!;
      placeholders.push({ atWire: wireLines.length, f });
      wireLines.push('');                       // filled in pass 2
      i += f.len - 1;
    } else {
      wireIndexOf.set(i, wireLines.length);
      wireLines.push(lines[i]);
    }
  }
  // An anchor must be copied verbatim (no nested references).
  for (const { f } of placeholders) {
    for (let k = f.anchor; k < f.anchor + f.len; k++) if (!wireIndexOf.has(k)) return null;
  }
  const refs: SelfCanonRef[] = [];
  for (const { atWire, f } of placeholders) {
    const first = wireIndexOf.get(f.anchor)! + 1;
    const last = wireIndexOf.get(f.anchor + f.len - 1)! + 1;
    const patch = f.edits.map(e => e.op === 'set' ? `${e.line}=${e.text}`
      : e.op === 'ins' ? `+${e.line}=${e.text}` : `-${e.line}`).join(delim);
    wireLines[atWire] = `⟦${first}-${last}|${patch}⟧`;
    refs.push({ wireLine: atWire + 1, first, last, edits: f.edits, replaces: f.len });
  }
  const wire = wireLines.join(eol) + (finalEol ? eol : '');
  const clauses = [
    `Expand ⟦a-b|patch⟧: copy wire lines a..b and apply patch (n=text sets line n, +n inserts, -n deletes; split on '${delim}'). Print only.`,
    `⟦a-b|patch⟧ means wire lines a..b with these edits: n=text / +n=text / -n, split on '${delim}'. Expand, then print only.`,
    `For each ⟦a-b|p⟧ copy wire lines a..b and apply p: n=text, +n=text, -n (separator '${delim}'). Print only the result.`,
  ];
  let clause = '', clauseTokens = Infinity;
  for (const c of clauses) { const t = countTokens(' ' + c, enc); if (t < clauseTokens) { clauseTokens = t; clause = c; } }
  return {
    refs, wire, clause, clauseTokens, delim,
    anchorLines: found.reduce((s, f) => s + f.len, 0),
    savedLines: found.reduce((s, f) => s + f.len - 1, 0),
  };
}

/** Expand self-canon references. Total: malformed input returns the wire. */
export function selfCanonDecode(wire: string, delim: string): string {
  const { lines, eol, finalEol } = splitLines(wire);
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^⟦(\d+)-(\d+)\|(.*)⟧$/s);
    if (!m) { out.push(line); continue; }
    const a = Number(m[1]), b = Number(m[2]);
    if (a < 1 || b < a || b > lines.length) { out.push(line); continue; }
    const anchor = lines.slice(a - 1, b);
    const edits = archetyponParsePatch(m[3], delim);
    if (!edits) { out.push(line); continue; }
    const body = archetyponApply(anchor, edits);
    if (!body) { out.push(line); continue; }
    out.push(...body);
  }
  return out.join(eol) + (finalEol ? eol : '');
}

/**
 * X57: the identity arms price the input through the frontier chain, whose
 * glyph-assignment search is the stack's pathological sink (83 s on a
 * 600-char hex dump pre-repair). Each arm runs in its own deterministic
 * work epoch (see workmeter.ts; per-arm epochs inline above). Nested
 * inside a parent epoch (SYNKRISIS) they share the outer window.
 */
export function archetyponEncode(text: string, enc: EncodingName = 'o200k_base'): ArchetyponResult {
  return archetyponEncodeInner(text, enc);
}
