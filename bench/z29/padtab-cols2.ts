// Diagnostic: counts of (start,end) positions for one column across data rows of a real table.
import fs from 'node:fs';
const [file, colS] = process.argv.slice(2);
const col = Number(colS);
const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.length > 0);
const toks = (l: string) => { const o: { t: string; s: number; e: number }[] = []; const re = /\S+/g; let m; while ((m = re.exec(l))) o.push({ t: m[0], s: m.index, e: m.index + m[0].length }); return o; };
const rows = lines.map(toks).filter((r) => r.length === 10).slice(1);
const count: Record<string, number> = {};
for (const r of rows) { const k = `${r[col].s}-${r[col].e}:${r[col].t}`; count[k] = (count[k] || 0) + 1; }
console.log(JSON.stringify(count));
