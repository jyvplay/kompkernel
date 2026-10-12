/**
 * src/lib/omega/phalanx4.ts
 * =============================================================================
 * PHALANX-P4 — PHALANX-P3 with one unified legend line instead of per-stage rule headers.
 * (exact, byte-perfect, self-verified end to end; identity unless it pays)
 *
 * The stages are the same as P3 (UUIDFOLD-U2, DIRFOLD-A1, DITTO-F1, KOINE-K1 [gated],
 * RECALL-R1 [gated], VERITAS-VX). Each stage encodes the prefix-free body of the stage below
 * it, so no stage header lives inside the data. Only the stages that applied are named, in ONE
 * legend line at the top of the wire, with a short clause per stage.
 *
 * WIRE
 *   line 1  "PHALANX-P4 legend: " + one clause per applied stage, outside-in: [rc] [ko] [dt] [da] [uu].
 *           Absent when no stage applied.
 *   rest    the VERITAS-VX output (a "[[VX1 ... ]]" block then the body, or the plain body)
 *   identity: "PHALANX-P4: identity" line, then the text verbatim.
 *
 * GATES (one downstream-aware check per optional stage; the legend clause is counted)
 *   K kept iff tokens(VX(K-body) + legend with ko) < tokens(VX(input-body) + legend without ko).
 *   R kept iff tokens(VX(R-body) + legend with rc) < tokens(VX(input-body) + legend without rc).
 *   VX: its own sentinel block, unchanged from P3; kept iff it changes the body.
 * DECODE (single chat, no skill, no system prompt)
 *   Read the legend line. Undo [vx], then [rc], [ko], [dt], [da], [uu] in that order.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { uuidfoldEncode, uuidfoldDecode, UUIDFOLD_RULE, OFF as UUIDFOLD_OFF } from './uuidfold';
import { dirfoldAEncode, dirfoldADecode, DIRFOLD_A_RULE, DIRFOLD_A_ESC } from './dirfold-a';
import { dittoEncode, dittoDecode, DITTO_RULE, DITTO_ESC } from './ditto';
import { veritasEncode } from './veritas';
import { withVxLegend, veritasDecodeL } from './veritas-w';
import { koineEncode, koineDecode, KOINE_HEADER, KOINE_ESC, KOINE_MIN_K } from './koine';
import { recallEncode, recallDecode, RECALL_HEADER, RECALL_ESC } from './recall';

export const PHALANX4_ESC = 'PHALANX-P4: identity';
const LEGEND_PREFIX = 'PHALANX-P4 legend: ';
const VX_SENTINEL = '[[VX1\n';

type Tag = 'uu' | 'da' | 'dt' | 'ko' | 'rc';
const ORDER: Tag[] = ['rc', 'ko', 'dt', 'da', 'uu']; // outside-in decode order
/** Stages whose headers move into the legend. The others keep their own P3 header lines inline. */
const LEGEND_TAGS: Tag[] = ['rc', 'ko'];

/** Terse clauses. Each restates its stage's decoder; the stage modules are the authority. */
const CLAUSE: Record<Tag, string> = {
  rc: '[rc] @d = same-numbered field of the line d up (d>=1); @:x = literal x; fields are runs of non-space characters, whitespace copied; no line above line 1.',
  ko: '[ko] &k:r = first k chars of the same-numbered field above, then r; &:x = literal x; fields are runs of non-space characters, whitespace copied; line 1 has no reference.',
  dt: '[dt] ^ = same field as the line above; a field that really starts with ^ gets one extra ^; fields split on single spaces.',
  da: "[da] a last field '=name' = the directory part of the line above's last field (up to and including its last '/'; empty if none), then name; fields split on spaces and tabs.",
  uu: '[uu] a whole alphanumeric run of 32 uppercase hex digits with a letter A-F = lowercase UUID; dashes after digits 8,12,16,20.',
};


/** Rule header and identity escape of each stage (as the stage modules emit them). */
const HEAD: Record<Tag, { rule: string; esc: string | null }> = {
  uu: { rule: UUIDFOLD_RULE, esc: UUIDFOLD_OFF },
  da: { rule: DIRFOLD_A_RULE, esc: DIRFOLD_A_ESC },
  dt: { rule: DITTO_RULE, esc: DITTO_ESC },
  ko: { rule: KOINE_HEADER, esc: KOINE_ESC },
  rc: { rule: RECALL_HEADER, esc: RECALL_ESC },
};

const DECODE: Record<Tag, (w: string) => string> = {
  uu: uuidfoldDecode,
  da: dirfoldADecode,
  dt: dittoDecode,
  ko: koineDecode,
  rc: recallDecode,
};

/**
 * Strip a stage's own header from its output. Returns the body the next stage works on and whether
 * the stage APPLIED (rule header present). An identity escape is stripped too but does not count as
 * applied: a stage that is not named in the legend is never decoded, so its escape is not needed.
 */
function strip(tag: Tag, wire: string): { applied: boolean; body: string } {
  const h = HEAD[tag];
  if (wire.startsWith(h.rule + '\n')) return { applied: true, body: wire.slice(h.rule.length + 1) };
  if (h.esc !== null && wire.startsWith(h.esc + '\n')) return { applied: false, body: wire.slice(h.esc.length + 1) };
  return { applied: false, body: wire };
}

/**
 * Legend line for an applied set (outside-in order). Empty when no stage applied, so an unstaged
 * wire is just VERITAS (or the text). VERITAS has no clause: its own [[VX1 block is the description,
 * as in P3, and a clause for it would cost more than the gain on most files.
 */
function legendFor(applied: Set<Tag>): string {
  const parts: string[] = [];
  for (const t of LEGEND_TAGS) if (applied.has(t)) parts.push(CLAUSE[t]);
  return parts.length ? LEGEND_PREFIX + parts.join(' ') : '';
}

export function phalanx4Decode(wire: string): string {
  if (wire.startsWith(PHALANX4_ESC + '\n')) return wire.slice(PHALANX4_ESC.length + 1);
  let rest = wire;
  let legend = '';
  if (wire.startsWith(LEGEND_PREFIX)) {
    const nl = wire.indexOf('\n');
    if (nl < 0) throw new Error('PHALANX-P4: legend without body');
    legend = wire.slice(0, nl);
    rest = wire.slice(nl + 1);
  }
  let t = veritasDecodeL(rest);
  for (const tag of LEGEND_TAGS) {
    if (!legend.includes('[' + tag + '] ')) continue;
    t = DECODE[tag](HEAD[tag].rule + '\n' + t);
  }
  // Inline stages: their own header lines (P3 style) are the first line of their input, so the
  // P3 decoders find them directly.
  t = dittoDecode(t);
  t = dirfoldADecode(t);
  t = uuidfoldDecode(t);
  return t;
}

function safeDecode(w: string): string | null {
  try { return phalanx4Decode(w); } catch { return null; }
}

export interface Phalanx4Result {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'phalanx4' | 'identity';
  applied: Tag[];
  vxKept: boolean;
  inTokens: number;
  outTokens: number;
}

export function phalanx4Encode(text: string, enc: EncodingName = 'o200k_base', minK = KOINE_MIN_K): Phalanx4Result {
  const inTokens = countTokens(text, enc);
  const applied = new Set<Tag>();

  // Stage chain on prefix-free bodies (each stage encodes the body of the stage below it).
  let body = text;
  const run = (tag: Tag, wire: string) => {
    if (!LEGEND_TAGS.includes(tag)) { // inline: keep the stage's own header line (P3 style)
      if (wire.startsWith(HEAD[tag].rule + '\n')) applied.add(tag);
      body = wire;
      return;
    }
    const s = strip(tag, wire);
    if (s.applied) applied.add(tag);
    body = s.body;
  };
  run('uu', uuidfoldEncode(body, enc).wire);
  run('da', dirfoldAEncode(body, enc).wire);
  run('dt', dittoEncode(body, enc).wire);

  // Tokens of the final VERITAS form plus the legend clauses that the candidate set implies.
  const cost = (b: string, set: Set<Tag>) =>
    countTokens(veritasEncode(b, enc).wire, enc) + countTokens(legendFor(set), enc);

  // K gate (downstream = VERITAS + legend clause).
  const beforeK = body;
  const k = koineEncode(beforeK, enc, minK);
  const kS = strip('ko', k.wire);
  const withK = new Set(applied); if (kS.applied) withK.add('ko');
  if (k.mode === 'koine' && kS.applied && cost(kS.body, withK) < cost(beforeK, applied)) {
    applied.add('ko'); body = kS.body;
  }

  // R gate (downstream = VERITAS + legend clause).
  const beforeR = body;
  const r = recallEncode(beforeR, enc);
  const rS = strip('rc', r.wire);
  const withR = new Set(applied); if (rS.applied) withR.add('rc');
  if (r.mode === 'recall' && rS.applied && cost(rS.body, withR) < cost(beforeR, applied)) {
    applied.add('rc'); body = rS.body;
  }

  // VX: outermost body transform; it is kept iff it changes the body.
  // VX gate (real tokens, legend included): keep the dictionary only if the legend-carrying VX wire is smaller.
  const legend = legendFor(applied);
  const vxWire = veritasEncode(body, enc).wire;
  const withVx = (legend ? legend + '\n' : '') + withVxLegend(vxWire);
  const noVx = (legend ? legend + '\n' : '') + body;
  const vxKept = vxWire.startsWith(VX_SENTINEL) && countTokens(withVx, enc) < countTokens(noVx, enc);
  const v = vxKept ? withVx : noVx;

  const decoded = safeDecode(v);
  const outTokens = countTokens(v, enc);
  if (decoded !== text || outTokens >= inTokens) {
    const needsEsc = text.startsWith(PHALANX4_ESC + '\n') || text.startsWith(LEGEND_PREFIX) || safeDecode(text) !== text;
    const idWire = needsEsc ? PHALANX4_ESC + '\n' + text : text;
    return {
      wire: idWire, decoded: text, exact: true, mode: 'identity', applied: [], vxKept: false, inTokens,
      outTokens: needsEsc ? countTokens(idWire, enc) : inTokens,
    };
  }
  return { wire: v, decoded: decoded as string, exact: true, mode: 'phalanx4', applied: ORDER.filter((t) => applied.has(t)), vxKept, inTokens, outTokens };
}
