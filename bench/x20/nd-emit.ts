/**
 * X20 (2): dump ANADESMOS wires for the external CPython reader check.
 * Usage: bench/x20/run.sh bench/x20/nd-emit.ts <lanesFile> > wires.json
 */
import fs from 'node:fs';
import { anadesmosEncode } from '@/lib/omega/anadesmos';

const lanes = fs.readFileSync(process.argv[2], 'utf8').split('\n').map((x) => x.trim()).filter((x) => x !== '');
const out: { name: string; bytes: number; applied: string; input: string; wire: string }[] = [];
for (const f of lanes) {
  const t = fs.readFileSync(f, 'utf8');
  const r = anadesmosEncode(t);
  out.push({ name: f, bytes: Buffer.byteLength(t), applied: r.applied, input: t, wire: r.output });
}
process.stdout.write(JSON.stringify(out));
console.error(`nd-emit: ${out.length} lanes`);
