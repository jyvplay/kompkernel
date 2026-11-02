/**
 * Z44 expansion-aware rule audit.
 * For an emitted CHIRON/DAEDALUS wire, compute for every rule:
 *   writes_i   = occurrences of its name in the body AND in later rule texts
 *   L_i        = token cost of its FULLY EXPANDED text
 *   def_i      = token cost of its text as written + 1 name token
 *   gain_i     = writes_i * (L_i - 1) - def_i          (tokens saved by keeping it)
 * Rules are defined in order; references only point backwards.
 * Run: ./bench/z44/build.sh bench/z44/audit2.ts <file>... [--enc=]
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const args = process.argv.slice(2);
const enc = (args.find((a) => a.startsWith('--enc='))?.slice(6) ?? 'o200k_base') as EncodingName;
const files = args.filter((a) => !a.startsWith('--'));
const nonAscii = (ch: string) => ch.charCodeAt(0) > 127;

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const I = countTokens(text, enc);
  const r = daedalusEncode(text, enc, { maxArms: 2 });
  if (r.mode !== 'daedalus') { console.log(`${f}: identity (I=${I})`); continue; }
  const wire = r.wire;
  const sep = wire.indexOf(CHIRON_SEP);
  const tape = wire.slice(CHIRON_START.length, sep);
  const body = wire.slice(sep + 1);
  // parse rules
  const names: string[] = [];
  const texts: string[] = [];
  let cur = -1;
  for (const ch of tape) {
    if (nonAscii(ch) && !names.includes(ch)) { names.push(ch); texts.push(''); cur = names.length - 1; }
    else if (cur >= 0) texts[cur] += ch;
  }
  const nameIdx = new Map(names.map((n, i) => [n, i]));
  // direct writes
  const bodyWrites = new Array(names.length).fill(0);
  for (const ch of body) { const i = nameIdx.get(ch); if (i !== undefined) bodyWrites[i]++; }
  const tapeWrites = new Array(names.length).fill(0);
  texts.forEach((t) => { for (const ch of t) { const i = nameIdx.get(ch); if (i !== undefined) tapeWrites[i]++; } });
  // expansions: process rules in reverse definition order (name_i can only appear in texts_j, j>i)
  const expandCount = new Array(names.length).fill(0);
  for (let i = names.length - 1; i >= 0; i--) {
    let c = bodyWrites[i];
    for (let j = i + 1; j < names.length; j++) if (texts[j].includes(names[i])) c += (countOf(texts[j], names[i]) * expandCount[j]);
    expandCount[i] = c;
  }
  function countOf(s: string, ch: string) { let c = 0; for (const x of s) if (x === ch) c++; return c; }
  // fully expanded text per rule (memoised, reverse order)
  const expanded: string[] = new Array(names.length).fill('');
  for (let i = 0; i < names.length; i++) {
    let out = '';
    for (const ch of texts[i]) { const j = nameIdx.get(ch); out += j !== undefined ? expanded[j] : ch; }
    expanded[i] = out;
  }
  let tapeCost = 1 + 1; // § and ¶
  let totalGain = 0, deadGain = 0, deadTok = 0, negGain = 0, negTok = 0, deadN = 0, negN = 0, unusedExpN = 0, unusedExpTok = 0;
  const rows: Array<{ i: number; name: string; w: number; L: number; def: number; g: number; ex: number }> = [];
  for (let i = 0; i < names.length; i++) {
    const t = countTokens(texts[i], enc);
    const L = countTokens(expanded[i], enc);
    const writes = bodyWrites[i] + tapeWrites[i];
    const def = t + 1;
    tapeCost += def;
    const g = writes * (L - 1) - def;
    totalGain += g;
    rows.push({ i, name: names[i], w: writes, L, def, g, ex: expandCount[i] });
  }
  for (const x of rows) {
    if (x.ex === 0) { unusedExpN++; unusedExpTok += x.def; }
    if (x.g < 0) { negN++; negTok += x.def; negGain += x.g; }
  }
  const worst = rows.filter((x) => x.g < 0).sort((a, b) => a.g - b.g);
  console.log(`\n=== ${f.split('/').slice(-2).join('/')} I=${I} M=${r.messageTokens} W=${r.outTokens} rules=${names.length} tapeCost=${tapeCost}`);
  console.log(`   Σgain=${totalGain}  rules never expanded (ex=0): ${unusedExpN}, def cost ${unusedExpTok} tok`);
  console.log(`   rules with gain<0: ${negN}, def cost ${negTok} tok, Σgain ${negGain}`);
  console.log(`   worst 6:`);
  for (const x of worst.slice(0, 6)) console.log(`     g=${String(x.g).padStart(5)} writes=${String(x.w).padStart(4)} ex=${String(x.ex).padStart(5)} L=${String(x.L).padStart(4)} def=${x.def} ${JSON.stringify(expanded[x.i].slice(0, 40))}`);
  const best = rows.slice().sort((a, b) => b.g - a.g).slice(0, 4);
  console.log(`   best 4:`);
  for (const x of best) console.log(`     g=${String(x.g).padStart(5)} writes=${String(x.w).padStart(4)} ex=${String(x.ex).padStart(5)} L=${String(x.L).padStart(4)} def=${x.def} ${JSON.stringify(expanded[x.i].slice(0, 40))}`);
}
