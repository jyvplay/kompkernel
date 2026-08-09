import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { ideographPool } from './strata';

export interface PraxisEntry { alias: string; phrase: string; hits: number }
export interface PraxisResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: PraxisEntry[];
  mode: 'praxis' | 'identity' | 'forced-wrap';
  notes: string;
}

const SENTINEL = '[PX2]\n';
const TERM = '[/PX2]\n';
const MAX_ENTRIES = 80;

function occ(text: string, phrase: string): number {
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(phrase, i)) !== -1) {
    n++;
    i += phrase.length;
  }
  return n;
}

function candidates(text: string, enc: EncodingName): string[] {
  const toks = tokenStrings(text.length > 180_000 ? text.slice(0, 180_000) : text, enc);
  const seen = new Set<string>();
  const scored: { phrase: string; score: number }[] = [];
  for (let w = 6; w >= 2; w--) {
    const counts = new Map<string, { first: number; count: number }>();
    for (let i = 0; i + w <= toks.length; i++) {
      let key = '';
      for (let j = 0; j < w; j++) key += toks[i + j].id + ':';
      const cur = counts.get(key);
      if (cur) cur.count++;
      else counts.set(key, { first: i, count: 1 });
    }
    for (const [, info] of counts) {
      if (info.count < 2) continue;
      let phrase = '';
      for (let j = 0; j < w; j++) phrase += toks[info.first + j].s;
      if (phrase.length < 4 || phrase.indexOf('\n') !== -1 || seen.has(phrase)) continue;
      seen.add(phrase);
      scored.push({ phrase, score: info.count * (w - 1) - w - 4 });
    }
  }
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 240).map((x) => x.phrase);
}

function assemble(entries: PraxisEntry[], body: string): string {
  if (entries.length === 0) return body;
  return SENTINEL + entries.map((e) => `${e.alias}=${e.phrase}`).join('\n') + '\n' + TERM + body;
}

export function praxisDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const termAt = wire.indexOf('\n' + TERM);
  if (termAt < 0) return wire;
  const rows = wire.slice(SENTINEL.length, termAt).split('\n').filter(Boolean);
  let body = wire.slice(termAt + 1 + TERM.length);
  const entries = rows.map((row) => {
    const eq = row.indexOf('=');
    return eq === 1 ? { alias: row[0], phrase: row.slice(2) } : null;
  });
  if (entries.some((e) => e === null)) return wire;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    body = body.split(e.alias).join(e.phrase);
  }
  return body;
}

export function praxisEncode(text: string, enc: EncodingName = 'o200k_base'): PraxisResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): PraxisResult => ({ wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens, savingsPct: 0, entries: [], mode: 'identity', notes });
  if (!text) return identity('empty input');
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 2) return identity('no free single-token aliases');
  let body = text;
  const entries: PraxisEntry[] = [];
  let bestWire = text;
  let bestTokens = inTokens;
  for (const phrase of candidates(text, enc)) {
    if (entries.length >= MAX_ENTRIES || entries.length >= free.length) break;
    const hits = occ(body, phrase);
    if (hits < 2) continue;
    const alias = free[entries.length];
    const nextBody = body.split(phrase).join(alias);
    const nextEntries = [...entries, { alias, phrase, hits }];
    const wire = assemble(nextEntries, nextBody);
    const tok = countTokens(wire, enc);
    if (tok >= bestTokens) continue;
    body = nextBody;
    entries.push({ alias, phrase, hits });
    bestWire = wire;
    bestTokens = tok;
  }
  if (entries.length === 0) return identity('no positive token-boundary dictionary entries');
  const decoded = praxisDecode(bestWire);
  if (decoded !== text) return identity('guard: PRAXIS failed byte-verify');
  return { wire: bestWire, decoded, exact: true, inTokens, outTokens: bestTokens, savingsPct: inTokens ? ((inTokens - bestTokens) / inTokens) * 100 : 0, entries, mode: 'praxis', notes: `${entries.length} PRAXIS token-boundary entries · byte-exact` };
}

export const PRAXIS_SYSTEM_PROMPT = [
  '# PRAXIS-PX2 — byte-exact token-boundary dictionary',
  'Rows before [/PX2] map one-character aliases to exact phrases.',
  'Decode bottom-to-top: in the body, replace each alias with its phrase.',
  'Everything else is literal; reconstruction is exact.',
].join('\n');