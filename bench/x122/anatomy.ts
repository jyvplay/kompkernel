/**
 * X122 — where do the shipped tokens actually go?
 *
 *   bash bench/x15/run.sh bench/x122/anatomy.ts bench/x122/lanes.txt
 *
 * Zero new codecs: this is a measuring instrument. For each lane it encodes with
 * the shipped `tagstackEncode`, then reports the token cost of every segment of
 * the finished wire (contract prefix, each ¶-delimited tape segment, body), the
 * glyph-vs-literal split of the body, and how much of the body is single-token
 * glyph characters. Reused structure from bench/x121/_calls.ts.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST } from '../../src/lib/omega/chiron';

Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1',
  OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' });
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const isGlyph = (c: string) => c.codePointAt(0)! > 0x2ff && c !== '※';

for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const out = tagstackEncode(text, enc);
  const m = out.message;
  const tok = countTokens(m, enc);
  const si = m.indexOf(CHIRON_START);
  const prefix = si < 0 ? m : m.slice(0, si);
  const rest = si < 0 ? '' : m.slice(si);
  // split the CHIRON section on its separators
  const segs: string[] = [];
  let cur = '';
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i]!;
    if (c === CHIRON_SEP) { segs.push(cur); cur = ''; } else cur += c;
  }
  segs.push(cur);
  const t = (s: string) => countTokens(s, enc);
  console.log(`\n=== ${p}  raw=${t(text)} shipped=${tok} parent=${out.parentCodec} arm=${out.arm} chars=${m.length}`);
  console.log(`  contract prefix: ${prefix.length} chars / ${t(prefix)} tokens`);
  segs.forEach((s, i) => console.log(`  seg${i}: ${String(s.length).padStart(6)} chars / ${String(t(s)).padStart(5)} tokens   head=${JSON.stringify(s.slice(0, 70))}`));
  const body = segs.length > 1 ? segs.slice(1).join(CHIRON_SEP) : rest;
  let glyph = 0, lit = 0, gTok = 0, lTok = 0;
  for (const c of body) { if (isGlyph(c)) { glyph++; gTok += t(c); } else { lit++; lTok += t(c); } }
  console.log(`  body: ${body.length} chars / ${t(body)} tokens; glyph chars ${glyph} -> ${gTok} tok (${(gTok / Math.max(1, glyph)).toFixed(3)}/char); literal chars ${lit} -> ${lTok} tok (${(lTok / Math.max(1, lit)).toFixed(3)}/char)`);
  // how many DISTINCT glyph characters, and their individual costs
  const gc = new Map<string, number>();
  for (const c of body) if (isGlyph(c)) gc.set(c, (gc.get(c) ?? 0) + 1);
  let multi = 0, multiTok = 0;
  for (const [c, n] of gc) { const ct = t(c); if (ct > 1) { multi += n; multiTok += n * (ct - 1); } }
  console.log(`  distinct glyph chars ${gc.size}; chars costing >1 token: ${multi} occurrences, ${multiTok} EXTRA tokens`);
}
