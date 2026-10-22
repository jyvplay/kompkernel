import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
const enc = 'o200k_base' as any;
const files = (process.env.F || '').split(',').filter(Boolean);
const outdir = 'bench/x28/receipts';
fs.mkdirSync(outdir, { recursive: true });
const cases: any[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r: any = syntomosEncode(t, enc);
  const name = f.split('/').pop()!.replace(/\.[^.]+$/, '');
  // The message is EXACTLY what a bare LLM receives in one chat box.
  const message = r.contract ? `${r.wire}\n${r.contract}` : r.wire;
  const mp = `${outdir}/${name}.message.txt`;
  fs.writeFileSync(mp, message, 'utf8');
  cases.push({ name, file: f, message: mp, syntomos: r.messageTokens, metathesis: r.metathesisMessageTokens,
    rung: r.rung, nested: r.nested, denested: r.denested, rules: r.rules });
  console.log(name.padEnd(24), 'metath', String(r.metathesisMessageTokens).padStart(5), '-> syntomos', String(r.messageTokens).padStart(5),
    '| rules', String(r.rules).padStart(4), 'nested', String(r.nested).padStart(3), 'denest', r.denested ? 'Y' : '.', 'rung', r.rung);
  console.log('   CONTRACT:', JSON.stringify(r.contract));
}
fs.writeFileSync('bench/x28/cases.json', JSON.stringify(cases, null, 2));
console.log('\nwrote', cases.length, 'cases');
