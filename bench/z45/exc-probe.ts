import fs from 'node:fs';
const files = process.argv.slice(2);
const pats: Record<string, RegExp> = {
  T1: /.{0,12}[.!?]\p{Lu}.{0,12}/gu,
  T2: /.{0,12},\p{L}.{0,12}/gu,
  T3: /.{0,12}\S\(\p{L}.{0,12}/gu,
  T4: /.{0,12}\S"\p{L}.{0,12}/gu,
};
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const [k, re] of Object.entries(pats)) {
    const m = t.match(re) ?? [];
    if (m.length) console.log(`${f.split('/').pop()} ${k} x${m.length}: ${m.slice(0, 6).map(x => JSON.stringify(x)).join(' ')}`);
  }
}
