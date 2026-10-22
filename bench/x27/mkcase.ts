import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
const enc = 'o200k_base' as any;
const files = (process.env.F || '').split(',').filter(Boolean);
const outdir = 'bench/x27/receipts';
fs.mkdirSync(outdir, { recursive: true });
const cases: any[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = metathesisEncode(t, enc);
  const name = f.split('/').pop()!.replace(/\.[^.]+$/, '');
  // The message is EXACTLY what a bare LLM receives in one chat box.
  const message = r.contract ? `${r.wire}\n${r.contract}` : r.wire;
  const mp = `${outdir}/${name}.message.txt`;
  fs.writeFileSync(mp, message, 'utf8');
  cases.push({ name, file: f, message: mp, metathesis: r.messageTokens, symploke: undefined,
    inTokens: r.inTokens, parent: r.parent, order: r.order, shapes: r.shapes, rules: r.rules });
  console.log(name.padEnd(24), 'in', String(r.inTokens).padStart(5), '-> msg', String(r.messageTokens).padStart(5),
    '| rules', String(r.rules).padStart(4), '| wire', r.parentWireTokens, '->', r.wireTokens, '|', r.parent + '/' + r.order);
  console.log('   CONTRACT:', JSON.stringify(r.contract));
}
fs.writeFileSync('bench/x27/cases.json', JSON.stringify(cases, null, 2));
console.log('\nwrote', cases.length, 'cases');
