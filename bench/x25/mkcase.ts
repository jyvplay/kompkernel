import fs from 'node:fs';
import { aetosEncode } from '@/lib/omega/aetos';
const enc = 'o200k_base' as any;
const files = (process.env.F || '').split(',').filter(Boolean);
const outdir = 'bench/x25/receipts';
fs.mkdirSync(outdir, { recursive: true });
const cases: any[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = aetosEncode(t, enc);
  const name = f.split('/').pop()!.replace(/\.[^.]+$/, '');
  // The message is EXACTLY what a bare LLM receives in one chat box:
  //   wire, newline, contract.  Nothing else.
  const message = r.contract ? `${r.wire}\n${r.contract}` : r.wire;
  const mp = `${outdir}/${name}.message.txt`;
  fs.writeFileSync(mp, message, 'utf8');
  cases.push({ name, file: f, message: mp, aetos: r.messageTokens, inTokens: r.inTokens, parent: r.parent, order: r.order, shapes: r.shapes });
  console.log(name.padEnd(30), 'in', String(r.inTokens).padStart(5), '-> msg', String(r.messageTokens).padStart(5), '|', r.parent + '/' + r.order, '|', r.shapes.join(' '));
  console.log('   CONTRACT:', JSON.stringify(r.contract));
}
fs.writeFileSync('bench/x25/cases.json', JSON.stringify(cases, null, 2));
console.log('\nwrote', cases.length, 'cases');
