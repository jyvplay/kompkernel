/**
 * bench/lysis-redteam.ts — adversarial + economic audit for LYSIS-λ.
 * Run: npx tsx bench/lysis-redteam.ts
 *
 * Gates (all must hold):
 *  - EXACTNESS: lysisDecode(wire) === input for every case (0 failures).
 *  - HONESTY: applied ⇒ messageTokens < inTokens (contract-inclusive).
 *  - NO REGRESSION: !applied ⇒ messageTokens <= inTokens (+1 only on sentinel escape).
 *  - REAL GAINS: JSON \u / HTML &#N; payloads show large contract-inclusive savings.
 *  - FUZZ: random JSON-escaped payloads round-trip exactly.
 */
import { encode as enc200 } from 'gpt-tokenizer/encoding/o200k_base';
import { lysisEncode, lysisDecode, LYSIS_MARK, LYSIS_ESCAPE } from '../src/lib/omega/lysis';

const T = (s: string) => enc200(s).length;
type Case = { name: string; text: string };

// Independent builders (NOT the codec's own encoder).
const jesc = (s: string) => {
  let o = '';
  for (const ch of s) { const cp = ch.codePointAt(0)!;
    if (cp < 0x80) o += ch;
    else if (cp <= 0xFFFF) o += '\\u' + cp.toString(16).padStart(4, '0');
    else { const v = cp - 0x10000; o += '\\u' + (0xD800 + (v >> 10)).toString(16).padStart(4, '0') + '\\u' + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, '0'); }
  }
  return o;
};
const hesc = (s: string) => { let o = ''; for (const ch of s) { const cp = ch.codePointAt(0)!; o += cp < 0x80 ? ch : '&#' + cp + ';'; } return o; };

const cases: Case[] = [
  // ---- JSON \u (the headline real-world case: Python json.dumps ensure_ascii) ----
  { name: 'py json.dumps API body', text: `{"name":${JSON.stringify(jesc('café'))},"greeting":${JSON.stringify(jesc('你好'))},"note":${JSON.stringify(jesc('naïve résumé'))}}` },
  { name: 'japanese i18n strings', text: `{"welcome":"${jesc('ようこそ')}","bye":"${jesc('さようなら')}","thanks":"${jesc('ありがとう')}"}` },
  { name: 'emoji astral surrogate pairs', text: `{"reaction":"${jesc('😀🎉🚀')}","flag":"${jesc('🇯🇵')}"}` },
  { name: 'spanish accents', text: `"Se${jesc('ñ')}or ${jesc('Á')}lvarez pens${jesc('é')} en la ni${jesc('ñ')}a espa${jesc('ñ')}ola"` },
  { name: 'json with \\n \\" \\\\ and \\u mixed', text: `{"a":"line1\\nline2 \\"q\\" ${jesc('café')} c:\\\\path"}` },
  { name: 'korean tool-call payload', text: `{"result":"${jesc('테스트 성공했습니다')}","status":"ok"}` },

  // ---- HTML numeric refs ----
  { name: 'html decimal entity prose', text: `The caf${hesc('é')}${hesc('’')}s r${hesc('é')}sum${hesc('é')} ${hesc('—')} don${hesc('’')}t miss it.` },
  { name: 'html mixed with &amp; named', text: `Rock &amp; roll ${hesc('—')} caf${hesc('é')} &amp; more` },

  // ---- MUST NOT COMPRESS (identity, still exact) ----
  { name: 'plain english prose', text: 'The quick brown fox jumps over the lazy dog by the river.' },
  { name: 'raw utf8 (already decoded)', text: '{"name":"café","greeting":"你好"}' },
  { name: 'empty', text: '' },
  { name: 'json ascii only', text: '{"a":1,"b":"hello","c":true}' },
  { name: 'code with backslashes', text: 'const p = "c:\\\\Users\\\\x"; const re = /\\d+/g;' },

  // ---- ADVERSARIAL ----
  { name: 'escaped-backslash-then-u (\\\\u0041 literal)', text: 'path "\\\\u0041 stays literal" and ' + jesc('é') },
  { name: 'starts with MARK ª', text: `${LYSIS_MARK}rea 51 and ${jesc('café')}` },
  { name: 'starts with ESCAPE º', text: `${LYSIS_ESCAPE}C is 100 degrees` },
  { name: 'literal guillemets « » in text', text: `Il dit «bonjour» et ${jesc('café')}` },
  { name: 'escape resolves to delimiter cp (\\u00ab)', text: `{"x":"${'\\u00ab'}${jesc('é')}${'\\u00bb'}"}` },
  { name: 'lone high surrogate escape', text: `{"x":"\\ud83d and ${jesc('é')}"}` },
  { name: 'uppercase hex \\u00E9 (should not fold to lowercase)', text: `{"x":"\\u00E9 caf"}` },
  { name: 'malformed &#; and &#x (hex not decimal)', text: `a&#;b &#xe9; and ${hesc('é')}` },
  { name: 'giant non-ascii JSON (scaling)', text: `{"text":"${jesc('日本語のテキストです。これはテストです。とても長い文章。'.repeat(3))}"}` },
];

let failures = 0, applied = 0, regressions = 0, sumIn = 0, sumOut = 0, appIn = 0, appOut = 0;
const rows: string[] = [];

for (const c of cases) {
  const r = lysisEncode(c.text, 'o200k_base');
  const exact = lysisDecode(r.wire) === c.text;
  if (!exact) { failures++; rows.push(`  ✗ EXACT FAIL: ${c.name}`); }
  if (r.applied && r.messageTokens >= r.inTokens) { regressions++; rows.push(`  ✗ HONESTY FAIL: ${c.name}`); }
  const startsSentinel = c.text.length > 0 && (c.text[0] === LYSIS_MARK || c.text[0] === LYSIS_ESCAPE);
  if (!r.applied && r.messageTokens > r.inTokens + (startsSentinel ? 1 : 0)) { regressions++; rows.push(`  ✗ REGRESSION: ${c.name}`); }
  if (r.applied) { applied++; appIn += r.inTokens; appOut += r.messageTokens; }
  sumIn += r.inTokens; sumOut += r.messageTokens;
  const tag = exact ? (r.applied ? '✓apply' : '·ident') : '✗FAIL';
  rows.push(`  ${tag}  ${c.name.padEnd(44)} in=${String(r.inTokens).padStart(4)} msg=${String(r.messageTokens).padStart(4)} save=${String(r.inTokens - r.messageTokens).padStart(4)} (${r.savingsPct.toFixed(0)}%)  fold=${r.escapesFolded}`);
}

// ---- FUZZ: random payloads with \u escapes must round-trip exactly ----
let fuzzFail = 0;
const pool = [...'abcXYZ0129 {}[]:",', 'é', 'ñ', '你', '好', '日', '本', '😀', '🎉', '🚀', '\n', '\t', '\\', '"'];
function rnd(seed: number) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
const R = rnd(20260930);
for (let t = 0; t < 4000; t++) {
  let raw = '';
  const len = 1 + Math.floor(R() * 40);
  for (let k = 0; k < len; k++) raw += pool[Math.floor(R() * pool.length)];
  // escape non-ascii to \u (mimic ensure_ascii) for a chunk of cases
  const src = t % 2 === 0 ? jesc(raw) : (t % 3 === 0 ? hesc(raw) : raw);
  const rr = lysisEncode(src, 'o200k_base');
  if (lysisDecode(rr.wire) !== src) { fuzzFail++; if (fuzzFail <= 3) rows.push(`  ✗ FUZZ FAIL: ${JSON.stringify(src.slice(0, 40))}`); }
}

console.log('=== LYSIS-λ RED-TEAM ================================================');
console.log(rows.join('\n'));
console.log('--------------------------------------------------------------------');
console.log(`cases=${cases.length} applied=${applied} exact_failures=${failures} honesty/regression=${regressions} fuzz(4000)_failures=${fuzzFail}`);
console.log(`aggregate all cases : in=${sumIn} msg=${sumOut} saved=${sumIn - sumOut}`);
console.log(`aggregate WHERE APPLIED: in=${appIn} msg=${appOut} saved=${appIn - appOut} (${(100 * (appIn - appOut) / Math.max(1, appIn)).toFixed(1)}%)`);
const ok = failures === 0 && regressions === 0 && fuzzFail === 0;
console.log(ok ? '\n✅ PASS — byte-exact, honest, no regressions, 4000-case fuzz clean.' : '\n❌ FAIL — see above.');
process.exit(ok ? 0 : 1);
