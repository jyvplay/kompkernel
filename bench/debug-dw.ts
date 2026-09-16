import {
  astraeaLexiconFold,
  astraeaLexiconCodebook,
} from '../src/lib/omega/astraea.ts';
import { rosettaPool, RNS1_REGIONS } from '../src/lib/omega/rosetta.ts';
import { CHAOS_4000 } from './test-4000.ts';

const enc = 'o200k_base';

const folded = astraeaLexiconFold(CHAOS_4000, enc);
const pool = rosettaPool(enc);

const src = new Set<string>();
for (const ch of folded) src.add(ch);
const m = 4 + RNS1_REGIONS.length;
let k = 0;
for (; k <= pool.length - m; k++) {
  let clear = true;
  for (let j = 0; j < m; j++) {
    if (src.has(pool[k + j])) { clear = false; break; }
  }
  if (clear) break;
}

const mark = pool[k];
const lexiconBook = astraeaLexiconCodebook(enc);
const lexiconByGlyph = lexiconBook.byGlyph;

let t = folded;
const regionByGlyph = new Map<string, string>();
for (let i = 0; i < RNS1_REGIONS.length; i++) {
  const glyph = pool[k + 1 + i];
  if (t.includes(RNS1_REGIONS[i])) {
    regionByGlyph.set(glyph, RNS1_REGIONS[i]);
    t = t.split(RNS1_REGIONS[i]).join(glyph);
  }
}

// Flat JSON helper functions
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
function bareableString(s: string): boolean {
  if (s === '') return false;
  if (s.includes('|') || s.includes('=') || s.includes('"') || /\s/.test(s)) return false;
  if (s === 'true' || s === 'false' || s === 'null') return false;
  if (!Number.isNaN(Number(s))) return false;
  return true;
}
function kvEscape(s: string): string { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
function foldJsonLine(line: string) {
  if (!line.startsWith('{') || !line.endsWith('}') || line.length < 4) return null;
  const inner = line.slice(1, -1);
  if (inner.includes('{') || inner.includes('}')) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(line); } catch { return null; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const pairs = [];
  for (const [key, v] of Object.entries(parsed)) {
    if (!KEY_RE.test(key)) return null;
    if (typeof v === 'string') {
      pairs.push({ key, val: bareableString(v) ? v : `"${kvEscape(v)}"` });
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      pairs.push({ key, val: v === null ? 'null' : String(v) });
    } else if (Array.isArray(v)) {
      if (v.length === 0) return null;
      const parts: string[] = [];
      for (const el of v) {
        if (typeof el === 'string') {
          if (!bareableString(el)) return null;
          parts.push(el);
        } else if (typeof el === 'number' || typeof el === 'boolean' || el === null) {
          parts.push(el === null ? 'null' : String(el));
        } else return null;
      }
      pairs.push({ key, val: parts.join('|') });
    } else return null;
  }
  return pairs;
}

function csvFoldableLine(line: string): boolean {
  if (!line.includes(',')) return false;
  for (const f of line.split(',')) {
    if (f.length === 0 || f.includes(' ')) return false;
  }
  return true;
}

const TS_EXT = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?/g;
function extToBasic(match: RegExpExecArray): string {
  const zone = match[8] ? match[8].replace(':', '') : '';
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6]}${match[7] ?? ''}${zone}`;
}

const lines = t.split('\n');
const srcLines = CHAOS_4000.split('\n');
const outLines: string[] = [];

let csvRun: string[] = [];
let csvRunOrig: string[] = [];
let csvRunSrc: string[] = [];

const flushCsv = () => {
  if (csvRun.length >= 2) {
    const payload = csvRun.join('\n');
    const span = mark + 'C' + payload + mark;
    outLines.push(span);
    csvRun = []; csvRunOrig = []; csvRunSrc = [];
    return;
  }
  outLines.push(...csvRunOrig);
  csvRun = []; csvRunOrig = []; csvRunSrc = [];
};

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const srcLine = srcLines[li];

  TS_EXT.lastIndex = 0;
  let tsLine = line;
  let outStr = ''; let last = 0; let match: RegExpExecArray | null;
  while ((match = TS_EXT.exec(line)) !== null) {
    outStr += line.slice(last, match.index) + mark + extToBasic(match);
    last = match.index + match[0].length;
  }
  outStr += line.slice(last);
  if (outStr !== line) tsLine = outStr;

  const pairs = foldJsonLine(tsLine);
  if (pairs !== null) {
    const kv = pairs.map((p) => `${p.key}=${p.val}`).join(' ');
    const span = mark + 'J' + kv + mark;
    flushCsv();
    outLines.push(span);
    continue;
  }

  if (csvFoldableLine(tsLine)) {
    csvRun.push(tsLine.split(',').join(' '));
    csvRunOrig.push(tsLine);
    csvRunSrc.push(srcLine);
    continue;
  }

  flushCsv();
  outLines.push(tsLine);
}
flushCsv();

const bodyCore = outLines.join('\n');

// Decode bodyCore using full expandBodyAstraea logic
function probeBasic(s: string, idx: number): { ext: string; end: number } | null {
  for (let len = 30; len >= 15; len--) {
    if (idx + 1 + len > s.length) continue;
    const cand = s.slice(idx + 1, idx + 1 + len);
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{1,9})?(Z|[+-]\d{4})?$/.exec(cand);
    if (!m || m[0] !== cand) continue;
    const zone = m[8] ? (m[8] === 'Z' ? 'Z' : `${m[8].slice(0, 3)}:${m[8].slice(3)}`) : '';
    const ext = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ?? ''}${zone}`;
    return { ext, end: idx + 1 + len };
  }
  return null;
}

function scanPayloadEnd(s: string, start: number, markStr: string): number {
  for (let i = start; i < s.length; i++) {
    if (s[i] === markStr && probeBasic(s, i) === null) return i;
  }
  return -1;
}

function expand(s: string): string {
  let outStr = '';
  let idx = 0;
  while (idx < s.length) {
    const c = s[idx];
    if (c === mark) {
      const probe = probeBasic(s, idx);
      if (probe) {
        outStr += probe.ext; idx = probe.end; continue;
      }
      if (s[idx + 1] === 'C') {
        const payloadEnd = scanPayloadEnd(s, idx + 2, mark);
        if (payloadEnd > 0) {
          const rows = s.slice(idx + 2, payloadEnd).split('\n');
          const rebuilt = rows.map((row) => row.split(' ').map((f) => expand(f)).join(',')).join('\n');
          outStr += rebuilt; idx = payloadEnd + 1; continue;
        }
      }
      if (s[idx + 1] === 'J') {
        const payloadEnd = scanPayloadEnd(s, idx + 2, mark);
        if (payloadEnd > 0) {
          const payload = expand(s.slice(idx + 2, payloadEnd));
          // Parse kv pairs and unfold
          const parts = payload.match(/\S+=\S+/g) ?? [];
          const unfolded = parts.map((p) => {
            const eq = p.indexOf('=');
            return JSON.stringify(p.slice(0, eq)) + ':' + (p.slice(eq + 1).startsWith('"') ? p.slice(eq + 1) : JSON.stringify(p.slice(eq + 1)));
          }).join(',');
          outStr += '{' + unfolded + '}';
          idx = payloadEnd + 1;
          continue;
        }
      }
    }
    if (regionByGlyph.has(c)) {
      outStr += regionByGlyph.get(c); idx++;
    } else if (lexiconByGlyph.has(c)) {
      outStr += lexiconByGlyph.get(c); idx++;
    } else {
      outStr += c; idx++;
    }
  }
  return outStr;
}

const reexpanded = expand(bodyCore);
console.log('reexpanded === CHAOS_4000:', reexpanded === CHAOS_4000);
if (reexpanded !== CHAOS_4000) {
  for (let idx = 0; idx < Math.max(reexpanded.length, CHAOS_4000.length); idx++) {
    if (reexpanded[idx] !== CHAOS_4000[idx]) {
      console.log(`Mismatch at index ${idx}:`);
      console.log('Expected around index:', JSON.stringify(CHAOS_4000.slice(Math.max(0, idx - 30), idx + 30)));
      console.log('Got around index:     ', JSON.stringify(reexpanded.slice(Math.max(0, idx - 30), idx + 30)));
      break;
    }
  }
}
