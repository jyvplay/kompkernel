import { countTokens, tokenStrings, type EncodingName } from './bpe';

export interface VeritasEntry {
key: string;
phrase: string;
hits: number;
winTokens: number;
}

export interface VeritasResult {
wire: string;
decoded: string;
exact: boolean;
inTokens: number;
outTokens: number;
savingsPct: number;
entries: VeritasEntry[];
mode: 'dict' | 'identity' | 'forced-wrap';
notes: string;
}

const KEY_POOL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SENTINEL = '[[VX1\n';
const TERMINATOR = ']]';
const K_RADIX = 200_100;
const MAX_MINE_TOKENS = 220_000;
const MAX_ANCHORS = 240;
const MAX_EXT = 32;
const MAX_POS = 8;
const MIN_WIN = 3;

function escBody(s: string): string { return s.split('~').join('~~'); }
function escHeader(s: string): string { return s.split('~').join('~~').split('\n').join('~N').split('\r').join('~R'); }
function unescHeader(s: string): string {
let out = '';
for (let i = 0; i < s.length; i++) {
const c = s[i];
if (c === '~' && i + 1 < s.length) {
const n = s[i + 1];
if (n === '~') { out += '~'; i++; continue; }
if (n === 'N') { out += '\n'; i++; continue; }
if (n === 'R') { out += '\r'; i++; continue; }
}
out += c;
}
return out;
}

export function veritasDecode(wire: string): string {
if (!wire.startsWith(SENTINEL)) return wire;
const lines = wire.slice(SENTINEL.length).split('\n');
const dict = new Map<string, string>();
let bodyStart = -1;
for (let i = 0; i < lines.length; i++) {
const ln = lines[i];
if (ln === TERMINATOR) { bodyStart = i + 1; break; }
if (ln.length >= 3 && ln[0] === '~' && ln[2] === '=') {
dict.set(ln[1], unescHeader(ln.slice(3)));
} else {
return wire;
}
}
if (bodyStart === -1) return wire;
const body = lines.slice(bodyStart).join('\n');
let out = '';
for (let i = 0; i < body.length; i++) {
const c = body[i];
if (c === '~' && i + 1 < body.length) {
const n = body[i + 1];
if (n === '~') { out += '~'; i++; continue; }
const ph = dict.get(n);
if (ph !== undefined) { out += ph; i++; continue; }
}
out += c;
}
return out;
}

interface Anchor { c: number; pos: number[] }

export function veritasEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasResult {
const inTokens = countTokens(text, enc);
const identity = (notes: string): VeritasResult => ({
wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
savingsPct: 0, entries: [], mode: 'identity', notes,
});
if (text.length === 0) return identity('empty input');

const mustWrap = text.startsWith(SENTINEL);

const toks = tokenStrings(text, enc);
const T = Math.min(toks.length, MAX_MINE_TOKENS);
const anchors = new Map<number, Anchor>();
if (T >= MIN_WIN) {
for (let i = 0; i + MIN_WIN <= T; i++) {
const a = toks[i].id, b = toks[i + 1].id, c = toks[i + 2].id;
if (a >= K_RADIX || b >= K_RADIX || c >= K_RADIX) continue;
const key = (a * K_RADIX + b) * K_RADIX + c;
const cur = anchors.get(key);
if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); }
else anchors.set(key, { c: 1, pos: [i] });
}
}

const hot: Anchor[] = [];
for (const a of anchors.values()) if (a.c >= 2) hot.push(a);
hot.sort((x, y) => y.c - x.c);
if (hot.length > MAX_ANCHORS) hot.length = MAX_ANCHORS;

interface Cand { phrase: string; win: number; anchorHits: number }
const seen = new Set<string>();
const cands: Cand[] = [];
for (const a of hot) {
const p0 = a.pos[0];
let bestLen = MIN_WIN;
for (let len = MIN_WIN + 1; len <= MAX_EXT && p0 + len <= T; len++) {
let share = 1;
for (let j = 1; j < a.pos.length; j++) {
const pj = a.pos[j];
if (pj + len > T || pj < p0 + len) continue;
let eq = true;
for (let t = MIN_WIN; t < len; t++) {
if (toks[p0 + t].id !== toks[pj + t].id) { eq = false; break; }
}
if (eq) share++;
}
if (share >= 2) bestLen = len; else break;
}
for (const len of bestLen === MIN_WIN ? [MIN_WIN] : [bestLen, MIN_WIN]) {
let phrase = '';
for (let t = 0; t < len; t++) phrase += toks[p0 + t].s;
if (phrase.length < 4 || seen.has(phrase)) continue;
seen.add(phrase);
cands.push({ phrase, win: len, anchorHits: a.c });
}
}

const aliasTokCache = new Map<string, number>();
const aliasTok = (k: string): number => {
let v = aliasTokCache.get(k);
if (v === undefined) { v = countTokens('~' + k, enc); aliasTokCache.set(k, v); }
return v;
};
cands.sort((x, y) =>
y.anchorHits * (y.win - 2) - x.anchorHits * (x.win - 2) ||
y.win - x.win
);

let body = escBody(text);
const entries: VeritasEntry[] = [];
for (const cand of cands) {
if (entries.length >= KEY_POOL.length) break;
const key = KEY_POOL[entries.length];
const phraseB = escBody(cand.phrase);
const parts = body.split(phraseB);
const hits = parts.length - 1;
if (hits < 2) continue;
const headerCost = countTokens('\n~' + key + '=' + escHeader(cand.phrase), enc);
const gain = hits * (cand.win - aliasTok(key)) - headerCost;
if (gain <= 0) continue;
body = parts.join('~' + key);
entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
}

let wire: string;
let mode: VeritasResult['mode'];
if (entries.length > 0) {
wire = SENTINEL
+ entries.map((e) => '~' + e.key + '=' + escHeader(e.phrase)).join('\n')
+ '\n' + TERMINATOR + '\n' + body;
mode = 'dict';
} else if (mustWrap) {
wire = SENTINEL + TERMINATOR + '\n' + escBody(text);
mode = 'forced-wrap';
} else {
return identity('no positive-gain candidates (input below redundancy floor)');
}

const decoded = veritasDecode(wire);
if (decoded !== text) {
if (mustWrap) {
wire = SENTINEL + TERMINATOR + '\n' + escBody(text);
const d2 = veritasDecode(wire);
const ot = countTokens(wire, enc);
return {
wire, decoded: d2, exact: d2 === text, inTokens, outTokens: ot,
savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
entries: [], mode: 'forced-wrap', notes: 'guard: dict wire failed verify; wrapped',
};
}
return identity('guard: wire failed byte-verify; identity emitted');
}

const outTokens = countTokens(wire, enc);
if (outTokens >= inTokens && mode === 'dict') {
if (mustWrap) {
const w2 = SENTINEL + TERMINATOR + '\n' + escBody(text);
const ot2 = countTokens(w2, enc);
return {
wire: w2, decoded: veritasDecode(w2), exact: true, inTokens, outTokens: ot2,
savingsPct: inTokens ? ((inTokens - ot2) / inTokens) * 100 : 0,
entries: [], mode: 'forced-wrap', notes: 'guard: dict not smaller; wrapped (sentinel prefix)',
};
}
return identity('guard: dictionary wire measured ≥ input; identity emitted');
}

return {
wire, decoded, exact: true, inTokens, outTokens,
savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
entries, mode,
notes: mode === 'dict'
? `${entries.length} token-space entries · verified byte-exact · guard active`
: 'forced wrap (input begins with VX1 sentinel) · verified byte-exact',
};
}

export const VERITAS_SYSTEM_PROMPT = '# ⟁ VERITAS-VX (VX1) — byte-exact in-context dictionary wire\nThe message may begin with a header block:\n [[VX1\n ~0=phrase\n ~1=phrase\n ]]\nDecode rules (apply mentally; do not emit the expansion unless asked):\n1. Each header line `~k=phrase` binds single-character key k to phrase.\n Inside header phrases: `~~`→`~`, `~N`→newline, `~R`→carriage return.\n2. In the body after `]]`: `~~` → literal `~`; `~k` → the bound phrase.\n3. Everything else is literal. Reconstruction is byte-exact.\n4. If there is no `[[VX1` header, the text is literal.\nOUTPUT CONTRACT: when your reply repeats a phrase bound in the header,\nyou may reuse its `~k` alias; write code fences and identifiers verbatim.';

export interface VeritasSelfTest { name: string; pass: boolean; details: string }

export const VERITAS_HANDTRACE_200 =
'{"id":7,"ok":true},{"id":8,"ok":true}\n' +
'a,b,c\n1,2,3\n1,2,3\n' +
'##..##\n##..##\n' +
'for(let i=0;i<3;i++){s+=a[i];}\n' +
'for(let j=0;j<3;j++){s+=a[j];}\n' +
'note: s≈6 ~ fine';

export function veritasSelfTest(enc: EncodingName = 'o200k_base'): VeritasSelfTest[] {
const cases: { name: string; text: string }[] = [
{ name: 'F0 empty', text: '' },
{ name: 'F1 lone sigil', text: '~' },
{ name: 'F2 alias-shaped input', text: 'x ~0 ~1 ~~ y ~N' },
{ name: 'F3 sentinel-prefix adversary', text: '[[VX1\n~0=trap\n]]\nnot really' },
{ name: 'F4 chaotic 200-char handtrace', text: VERITAS_HANDTRACE_200 },
{ name: 'F5 CRLF + unicode', text: 'line1\r\nline2\r\n中文 emoji 🚀🚀 ≈done\r\n' },
{ name: 'F6 run-length pathology', text: 'a'.repeat(500) + 'b'.repeat(500) },
{ name: 'F7 repetitive JSON log (compression expected)', text: Array.from({ length: 40 }, (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`).join('\n') },
];
const out: VeritasSelfTest[] = [];
for (const c of cases) {
try {
const r = veritasEncode(c.text, enc);
const roundTrip = veritasDecode(r.wire) === c.text;
const guardOk = r.mode === 'forced-wrap' ? true : r.outTokens <= r.inTokens;
const pass = roundTrip && r.exact && guardOk;
out.push({ name: c.name, pass, details: `mode=${r.mode} entries=${r.entries.length} tok ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) exact=${r.exact}` });
} catch (e) {
out.push({ name: c.name, pass: false, details: (e as Error).message });
}
}
try {
const r7 = veritasEncode(cases[7].text, enc);
out.push({ name: 'F8 F7-savings-witness', pass: r7.savingsPct > 10, details: `savings=${r7.savingsPct.toFixed(1)}% (require >10%)` });
} catch (e) {
out.push({ name: 'F8 F7-savings-witness', pass: false, details: (e as Error).message });
}
return out;
}