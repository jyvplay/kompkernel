import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';

export interface LumenEntry { alias: string; phrase: string; hits: number }
export interface LumenResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: LumenEntry[];
  mode: 'lumen' | 'identity' | 'forced-wrap';
  notes: string;
}

const KEY = 'KEY ';
const DIV = '────────';
const MAX_ENTRIES = 80;
const MAX_CANDIDATES = 240;

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
  const scan = text.length > 180_000 ? text.slice(0, 180_000) : text;
  const toks = Array.from(scan.matchAll(/[A-Za-z0-9_.$:/-]+|[^A-Za-z0-9_\s]+|\s+/g));
  const seen = new Set<string>();
  const scored: { phrase: string; score: number }[] = [];
  const push = (phrase: string) => {
    phrase = phrase.trimEnd();
    if (phrase.length < 6 || phrase.length > 160 || phrase.indexOf('\n') !== -1) return;
    if (seen.has(phrase)) return;
    seen.add(phrase);
    const hits = occ(scan, phrase);
    if (hits < 2) return;
    const tok = countTokens(phrase, enc);
    const score = (tok - 1) * hits - tok - 4;
    if (score > 0) scored.push({ phrase, score });
  };
  for (let w = 8; w >= 1; w--) {
    for (let i = 0; i + w <= toks.length; i++) {
      let phrase = '';
      for (let j = 0; j < w; j++) phrase += toks[i + j][0];
      push(phrase);
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES).map((x) => x.phrase);
}

function assemble(entries: LumenEntry[], body: string): string {
  if (entries.length === 0) return body;
  return KEY + 'LUMEN\n' + entries.map((e) => `${e.alias}=${e.phrase}`).join('\n') + '\n' + DIV + '\n' + body;
}

export function lumenDecode(wire: string): string {
  if (!wire.startsWith(KEY)) return wire;
  const firstNl = wire.indexOf('\n');
  if (firstNl < 0) return wire;
  const div = '\n' + DIV + '\n';
  const divAt = wire.indexOf(div, firstNl + 1);
  if (divAt < 0) return wire;
  const rows = wire.slice(firstNl + 1, divAt).split('\n').filter(Boolean);
  let body = wire.slice(divAt + div.length);
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

export function lumenEncode(text: string, enc: EncodingName = 'o200k_base'): LumenResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): LumenResult => ({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, entries: [], mode: 'identity', notes,
  });
  if (!text) return identity('empty input');
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 2) return identity('no free single-token aliases');
  let body = text;
  const entries: LumenEntry[] = [];
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
  if (entries.length === 0) {
    if (!text.startsWith(KEY)) return identity('no measured positive-gain legend entries');
    const wire = KEY + 'LUMEN\n' + DIV + '\n' + text;
    const decoded = lumenDecode(wire);
    const outTokens = countTokens(wire, enc);
    return { wire, decoded, exact: decoded === text, inTokens, outTokens, savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0, entries: [], mode: 'forced-wrap', notes: 'forced wrap for KEY-prefixed input' };
  }
  const decoded = lumenDecode(bestWire);
  if (decoded !== text) return identity('guard: LUMEN failed byte-verify');
  return { wire: bestWire, decoded, exact: true, inTokens, outTokens: bestTokens, savingsPct: inTokens ? ((inTokens - bestTokens) / inTokens) * 100 : 0, entries, mode: 'lumen', notes: `${entries.length} LUMEN legend entries · byte-exact` };
}

export const LUMEN_SYSTEM_PROMPT = [
  'A leading `KEY` block is a legend: each line maps one character to the text it stands for.',
  'The legend ends at the repeated divider line. Expand legend entries bottom-to-top.',
  'Everything after the divider is the message. Reconstruction is exact.',
].join('\n');

export interface LumenSelfTestResult {
  name: string;
  pass: boolean;
  details: string;
}

export function lumenSelfTest(enc: EncodingName = 'o200k_base'): LumenSelfTestResult[] {
  const out: LumenSelfTestResult[] = [];
  const testCases = [
    {
      name: 'Structured JSON/CSV schema test',
      text: Array.from({ length: 6 }, (_, i) =>
        `{"id":${i + 1},"service":"auth-gateway","status":"HEALTHY","latency_ms":${12 + i * 3},"region":"us-east-1"}`
      ).join('\n'),
    },
    {
      name: 'Repetitive log timestamp and status test',
      text: Array.from({ length: 8 }, (_, i) =>
        `2026-09-18T10:15:${String(i * 5).padStart(2, '0')}Z [INFO] worker-${i % 2} processed packet batch size=100 ok=true`
      ).join('\n'),
    },
    {
      name: 'CJK repetitive prose test',
      text: '系统运行正常。数据包处理完成。系统运行正常。数据包处理完成。系统运行正常。数据包处理完成。',
    },
    {
      name: 'Chaotic heterogeneous text test',
      text: 'Summary: worker node restarted.\nservice,env,status\ningest,prod,ok\nquery,prod,ok\n{"event":"restart","count":1}\n注意: 系统加载完成。',
    },
  ];

  for (const tc of testCases) {
    try {
      const res = lumenEncode(tc.text, enc);
      const dec = lumenDecode(res.wire);
      const pass = res.exact && dec === tc.text;
      out.push({
        name: tc.name,
        pass,
        details: `${res.mode} · ${res.inTokens}→${res.outTokens} tok (${res.savingsPct.toFixed(1)}%) · ${res.entries.length} entries`,
      });
    } catch (e) {
      out.push({ name: tc.name, pass: false, details: (e as Error).message });
    }
  }

  return out;
}