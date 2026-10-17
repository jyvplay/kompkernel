// Wire-level probe: does a candidate rule survive the grammar?  Raw-token saving is not
// the question (find-listing proved that); the question is whether the LAKONIKOS /
// LAKONIKOS-D / AKOLOUTHIA-2 wire of the transformed text is actually smaller.
import fs from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { akolouthia2Encode } from '@/lib/omega/akolouthia2';

const enc: EncodingName = 'o200k_base';

function bestArm(text: string) {
  const arms: { tag: string; M: number; wires: number }[] = [];
  const a = lakonikosEncode(text, enc);
  if (a.mode === 'daedalus' && a.wire !== text && a.decoded === text)
    arms.push({ tag: 'lakonikos', M: a.messageTokens as unknown as number, wires: a.wire.length });
  const b = lakonikosDualEncode(text, enc);
  if (b.mode === 'daedalus' && b.wire !== text && b.decoded === text)
    arms.push({ tag: 'lakonikos-d', M: b.messageTokens[enc], wires: b.wire.length });
  const c = akolouthia2Encode(text, enc);
  if (c.exact && c.wire !== text && c.decoded === text)
    arms.push({ tag: 'akolouthia2', M: c.messageTokens, wires: c.wire.length });
  if (!arms.length) return { tag: 'raw', M: countTokens(text, enc), wires: text.length };
  arms.sort((x, y) => x.M - y.M);
  return arms[0];
}

type Rule = { name: string; clause: string; apply: (s: string) => string; check: (s: string) => boolean };

// --- candidate rules ---------------------------------------------------------
// D = the number of decimals; the clause names D, so the reader re-pads exactly.
function decimalsOf(s: string): Set<number> {
  const d = new Set<number>();
  for (const m of s.matchAll(/\d+\.(\d+)/g)) d.add(m[1].length);
  return d;
}
const numPad = (D: number): Rule => ({
  name: `numPad${D}`,
  clause: `Every number has exactly ${D} decimals; add zeros on the right to reach ${D}.`,
  apply: s => s.replace(/(\d+\.\d*?)0+(?=\D|$)/g, (m, a) => a === m.slice(0, -1) + '.' ? a : a),
  check: s => { const d = decimalsOf(s); return d.size === 1 && d.has(D); },
});
const RULES: ((s: string) => Rule | null)[] = [
  s => { const d = decimalsOf(s); const D = d.size === 1 ? [...d][0] : 0; return D >= 2 ? numPad(D) : null; },
  s => (/\d{2}:\d{2}:\d{2}/.test(s) ? {
    name: 'clock', clause: 'A 6-digit run after a date or at a field start is HH:MM:SS.',
    apply: t => t.replace(/\b(\d{2}):(\d{2}):(\d{2})\b/g, '$1$2$3'),
    check: () => true } : null),
  s => (/(?<=\d),(?=\d{3}\b)/.test(s) ? {
    name: 'thousands', clause: 'Integers are grouped by threes from the right with commas.',
    apply: t => t.replace(/(?<=\d),(?=\d{3}\b)/g, ''),
    check: () => true } : null),
  s => (/https?:\/\//.test(s) ? {
    name: 'urlScheme', clause: '§ is https:// and ¶ is http://.',
    apply: t => t.replace(/https:\/\//g, '§').replace(/http:\/\//g, '¶'),
    check: () => true } : null),
  s => (/<\/[A-Za-z][\w.:-]*\s*>/.test(s) ? {
    name: 'xmlClose', clause: 'Each </> closes the innermost open tag; restore its name.',
    apply: t => t.replace(/<\/([A-Za-z][\w.:-]*)\s*>/g, '</>'),
    check: () => true } : null),
  s => (/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-/.test(s) ? {
    name: 'uuidDash', clause: 'A 32-hex run is a UUID; group it 8-4-4-4-12 with dashes.',
    apply: t => t.replace(/\b([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{12})\b/g, '$1$2$3$4$5'),
    check: () => true } : null),
];

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const base = bestArm(text);
  const out: string[] = [];
  for (const mk of RULES) {
    const r = mk(text);
    if (!r) continue;
    let t;
    try { t = r.apply(text); } catch { continue; }
    if (t === text) continue;
    if (!r.check(text)) { out.push(`${r.name}:PRECOND-FAIL`); continue; }
    const arm = bestArm(t);
    const cl = countTokens(r.clause, enc);
    const M = arm.M + cl;
    out.push(`${r.name}: wire ${base.M}->${arm.M} clause ${cl} M ${M} net ${M - base.M} [${arm.tag}]`);
  }
  console.log(`\n${f.split('/').pop()}  baseline M=${base.M} (${base.tag}) raw=${countTokens(text, enc)}`);
  for (const o of out) console.log('   ' + o);
}
