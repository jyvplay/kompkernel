/** X117 ΣΥΝΘΕΣΙΣ cheap domain screen. NO frontier calls. Reports whether the
 * three-rewrite conjunction reaches the single empty-prefix tail shape, the fused
 * key, raw token price, and own inverse. Used to bracket the raw floor and to
 * confirm the shipped ls-l-real rule/marker/CRC without re-encoding the parent. */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { crc32 } from '../../src/lib/omega/aither';
import { enallageRewrite, enallageExpand, ENALLAGE_KEY } from '../../src/lib/omega/enallage';
import { mekosRewrite, mekosExpand, MEKOS_KEY } from '../../src/lib/omega/mekos';
import { symphyiaFit, symphyiaRewrite, symphyiaContract, symphyiaDecodeWire, type SymphyiaRule } from '../../src/lib/omega/symphyia';
import { synthesisKey, synthesisParseKey, synthesisDecodeBody } from '../../src/lib/omega/synthesis';

const enc = 'o200k_base' as const;
const MARKERS = '\u0482\u10fb\u16dd\u2e19\u203b\u2042\u2051\u2e0e\u169b\u169c\u10fb\u2e19'.split('').concat(['\u06de', '\u0fca', '\u0fc9', '\u1aa5', '\ua66e']);
const MAX_RULES = 6;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const rows: any[] = [];
const artifacts: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const row: any = { path: p, raw, fires: false };
  const mode = enallageRewrite(text);
  if (!mode) { row.refusal = 'no mode'; rows.push(row); continue; }
  const measure = mekosRewrite(mode.wire);
  if (!measure) { row.refusal = 'no measure'; rows.push(row); continue; }
  const pre = measure.wire;
  row.preRaw = countTokens(pre, enc);
  row.modeHits = mode.hits; row.measureHits = measure.hits;
  const fit = symphyiaFit(pre);
  if (!fit.rules.length) { row.refusal = 'no template support'; rows.push(row); continue; }
  const marker = MARKERS.find(g => !pre.includes(g) && countTokens(g, enc) === 1);
  if (!marker) { row.refusal = 'no marker'; rows.push(row); continue; }
  const chosen: SymphyiaRule[] = [];
  const targets = new Set<number>();
  let bestRaw = countTokens(pre, enc);
  for (const r of fit.rules) {
    if (chosen.length >= MAX_RULES) break;
    if (targets.has(r.j) || targets.has(r.i)) continue;
    const trial = chosen.concat([r]);
    const w = symphyiaRewrite(pre, trial, marker);
    if (w.rewritten === 0) continue;
    const contract = symphyiaContract(trial, marker, '00000000');
    const rawTrial = countTokens(contract + '\n' + w.wire, enc);
    if (rawTrial >= bestRaw) continue;
    bestRaw = rawTrial; chosen.push(r); targets.add(r.j); targets.add(r.i);
  }
  row.chosen = chosen.map(r => ({ j: r.j, i: r.i, form: r.form, A: r.A, rows: r.rows, eligible: r.eligible, distinctSource: r.distinctSource }));
  if (chosen.length !== 1 || chosen[0]!.form !== 'tail' || chosen[0]!.A !== '') { row.refusal = 'not single empty-prefix tail'; rows.push(row); continue; }
  const rule = chosen[0]!;
  const rw = symphyiaRewrite(pre, chosen, marker);
  const crc = crc32(new TextEncoder().encode(pre)).toString(16).padStart(8, '0');
  const parts = { j: rule.j, i: rule.i, marker, crc };
  const key = synthesisKey(parts);
  row.fires = true;
  row.key = key;
  row.keyTokens = countTokens(key, enc);
  row.keyLFTokens = countTokens(key + '\n', enc);
  row.crc = crc;
  row.marker = marker;
  row.templateHits = rw.rewritten;
  row.rewriteRaw = countTokens(rw.wire, enc);
  row.rawSaved = raw - row.rewriteRaw;
  row.keyParse = synthesisParseKey(key) !== null;
  let own: string | null = null;
  try { own = synthesisDecodeBody(rw.wire, parts); } catch (e) { row.ownError = String(e); }
  row.ownInverse = own === text;
  row.symInverse = symphyiaDecodeWire(rw.wire, chosen, marker, crc) === pre;
  row.commute = (() => {
    const m2 = mekosRewrite(text); if (!m2) return false;
    const e2 = enallageRewrite(m2.wire); if (!e2) return false;
    return e2.wire === pre;
  })();
  const nestedKey = MEKOS_KEY + '\n' + ENALLAGE_KEY + '\n' + symphyiaContract(chosen, marker, crc) + '\n';
  row.nestedKey = nestedKey;
  row.nestedKeyTokens = countTokens(nestedKey, enc);
  row.keyDelta = row.keyLFTokens - row.nestedKeyTokens;
  // Cold-read artifact: fused key over the PRE-FRONTIER rewritten body. The
  // shipped message additionally carries the parent frontier's own encoding.
  const name = p.split('/').pop()!.replace(/\.txt$/, '');
  fs.mkdirSync('bench/x117/receipts/wires', { recursive: true });
  fs.writeFileSync(`bench/x117/receipts/wires/${name}.syn.txt`, key + '\n' + rw.wire);
  artifacts.push({ artifact: `bench/x117/receipts/wires/${name}.syn.txt`, source: p,
    sourceSha256: sha256(text), preSha256: sha256(pre), crc, marker, rule: { j: rule.j, i: rule.i, form: rule.form } });
  rows.push(row);
}
fs.mkdirSync('bench/x117/receipts', { recursive: true });
fs.writeFileSync('bench/x117/receipts/wires/manifest.json', JSON.stringify({ schema: 'kompkernel-x117-synthesis-wires-v1', artifacts }, null, 2) + '\n');
fs.writeFileSync('bench/x117/receipts/synthesis-screen.json', JSON.stringify({ schema: 'kompkernel-x117-synthesis-screen-v1', date: '2026-11-15', rows }, null, 2) + '\n');
for (const r of rows) {
  const name = r.path.split('/').pop();
  if (r.fires) console.log(`${name.padEnd(24)} raw=${r.raw} pre=${r.preRaw} rewrite=${r.rewriteRaw} saved=${r.rawSaved} key=${r.keyTokens}+LF=${r.keyLFTokens} nested=${r.nestedKeyTokens} Δkey=${r.keyDelta} hits=${r.modeHits}/${r.measureHits}/${r.templateHits} crc=${r.crc} own=${r.ownInverse} commute=${r.commute} parse=${r.keyParse}`);
  else console.log(`${name.padEnd(24)} raw=${r.raw} REFUSE ${r.refusal}${r.chosen ? ' chosen=' + JSON.stringify(r.chosen) : ''}`);
}
