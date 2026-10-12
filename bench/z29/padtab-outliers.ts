// Diagnostic: data rows of a real table whose token start for a given column differs from the most common start.
import fs from 'node:fs';
const [file, kS, cS] = process.argv.slice(2);
const k = Number(kS), c = Number(cS);
const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.length > 0);
const toks = (l: string) => { const o: { t: string; s: number; e: number }[] = []; const re = /\S+/g; let m; while ((m = re.exec(l))) o.push({ t: m[0], s: m.index, e: m.index + m[0].length }); return o; };
const rows = lines.filter((l) => toks(l).length === k).slice(1);
const cnt = new Map<number, number>(); rows.forEach((l) => { const s = toks(l)[c].s; cnt.set(s, (cnt.get(s) ?? 0) + 1); });
const common = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
console.log('most common start', common, 'distribution', JSON.stringify([...cnt.entries()]));
rows.forEach((l) => { const t = toks(l)[c]; if (t.s !== common) console.log(JSON.stringify(l.slice(0, 90)), 'start', t.s, 'token', t.t); });
