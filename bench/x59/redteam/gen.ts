// X59 BATHMOS red-team generator (seeded, deterministic).
import * as fs from 'node:fs';
const DIR = 'bench/x59/redteam/cases';
fs.mkdirSync(DIR, { recursive: true });
let seed = 0x5959;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (n: number): number => Math.floor(rnd() * n);
const cases: { name: string; text: string; expect: 'apply' | 'refuse' | 'any' }[] = [];
const F2 = (v: number): string => (Math.round(v * 100) / 100).toFixed(2);
const F4 = (v: number): string => (Math.round(v * 10000) / 10000).toFixed(4);

// helper: competition/dense/ordinal ranks of vals desc (stable original order)
function ranks(vals: number[], kind: 'comp' | 'dense' | 'ord'): number[] {
  const order = vals.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const out = new Array(vals.length);
  let comp = 0, dense = 0;
  order.forEach(([v, i], pos) => {
    if (pos === 0 || v !== order[pos - 1]![0]) { comp = pos + 1; dense++; }
    out[i] = kind === 'comp' ? comp : kind === 'dense' ? dense : pos + 1;
  });
  return out;
}

// 1 grouped ordinal rank by score (unsorted rows)
{
  const rows = ['group,id,score,pos'];
  for (let g = 0; g < 6; g++) {
    const scores = Array.from({ length: 30 }, () => ri(400));
    const pos = ranks(scores, 'ord');
    scores.forEach((s, i) => rows.push(`G${g},x${g}-${i},${s},${pos[i]}`));
  }
  cases.push({ name: 'grouped-ordinal', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 2 competition rank with ties, whole table
{
  const scores = Array.from({ length: 180 }, () => ri(40) * 5);
  const pos = ranks(scores, 'comp');
  const rows = ['id,score,rank', ...scores.map((s, i) => `${i},${s},${pos[i]}`)];
  cases.push({ name: 'competition-ties', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 3 dense rank
{
  const scores = Array.from({ length: 180 }, () => ri(40) * 5);
  const pos = ranks(scores, 'dense');
  const rows = ['id,score,rank', ...scores.map((s, i) => `${i},${s},${pos[i]}`)];
  cases.push({ name: 'dense-ties', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 4 percent_rank x100 2dp grouped
{
  const rows = ['dept,id,salary,pct'];
  for (let g = 0; g < 5; g++) {
    const sal = Array.from({ length: 36 }, () => 30000 + ri(90000));
    const comp = ranks(sal.map((v) => -v), 'comp'); // ascending comp rank via negated desc
    sal.forEach((s, i) => rows.push(`D${g},e${g}-${i},${s},${F2(100 * (comp[i]! - 1) / (sal.length - 1))}`));
  }
  cases.push({ name: 'percent-rank', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 5 cume_dist 4dp
{
  const vals = Array.from({ length: 200 }, () => ri(1000));
  const rows = ['id,v,cume'];
  vals.forEach((v, i) => rows.push(`${i},${v},${F4(vals.filter((x) => x <= v).length / vals.length)}`));
  cases.push({ name: 'cume-dist', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 6 share of group sum x100
{
  const rows = ['region,product,sales,share'];
  for (let g = 0; g < 6; g++) {
    const sales = Array.from({ length: 25 }, () => 100 + ri(5000));
    const tot = sales.reduce((a, b) => a + b, 0);
    sales.forEach((s, i) => rows.push(`R${g},P${i},${s},${F2(100 * s / tot)}`));
  }
  cases.push({ name: 'share-of-sum', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 7 index to max (share of max x100, integer)
{
  const vals = Array.from({ length: 160 }, () => 10 + ri(990));
  const mx = Math.max(...vals);
  const rows = ['id,v,idx', ...vals.map((v, i) => `${i},${v},${Math.round(100 * v / mx)}`)];
  cases.push({ name: 'index-to-max', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 8 ntile quartiles numeric (SQL buckets)
{
  const vals = Array.from({ length: 200 }, () => ri(5000));
  const ord = ranks(vals, 'ord');
  const rows = ['id,v,q'];
  const n = vals.length, k = 4, base = Math.floor(n / k), rem = n % k;
  vals.forEach((v, i) => {
    const pos = ord[i]! - 1;
    const big = rem * (base + 1);
    const b = pos < big ? Math.floor(pos / (base + 1)) + 1 : rem + Math.floor((pos - big) / base) + 1;
    rows.push(`${i},${v},${b}`);
  });
  cases.push({ name: 'ntile4', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 9 ntile text labels
{
  const vals = Array.from({ length: 180 }, () => ri(5000));
  const ord = ranks(vals, 'ord');
  const labels = ['top', 'upper', 'lower', 'bottom'];
  const n = vals.length, k = 4, base = Math.floor(n / k), rem = n % k;
  const rows = ['id,v,band'];
  vals.forEach((v, i) => {
    const pos = ord[i]! - 1;
    const big = rem * (base + 1);
    const b = pos < big ? Math.floor(pos / (base + 1)) + 1 : rem + Math.floor((pos - big) / base) + 1;
    rows.push(`${i},${v},${labels[b - 1]}`);
  });
  cases.push({ name: 'ntile-labels', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 10 ratio key: rank by points per game
{
  const rows = ['season,team,played,points,pos'];
  for (let sIdx = 0; sIdx < 8; sIdx++) {
    const teams = Array.from({ length: 14 }, (_, i) => {
      const played = 20 + ri(8); const points = ri(3 * played);
      return { t: `T${i}`, played, points };
    });
    const order = [...teams].sort((a, b) => b.points / b.played - a.points / a.played);
    const posOf = new Map(order.map((t, i) => [t.t, i + 1]));
    teams.forEach((t) => rows.push(`S${sIdx},${t.t},${t.played},${t.points},${posOf.get(t.t)}`));
  }
  cases.push({ name: 'ratio-ppg-rank', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 11 two exceptions in a rank column
{
  const scores = Array.from({ length: 150 }, () => ri(900));
  const pos = ranks(scores, 'ord');
  const rows = ['id,score,pos', ...scores.map((s, i) => `${i},${s},${i === 10 || i === 77 ? 999 : pos[i]}`)];
  cases.push({ name: 'rank-two-exceptions', text: rows.join('\n') + '\n', expect: 'any' });
}
// 12 rank by a column NOT in the file (random pos) -> refuse
{
  const rows = ['id,score,pos', ...Array.from({ length: 150 }, (_, i) => `${i},${ri(900)},${1 + ri(150)}`)];
  cases.push({ name: 'random-pos', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 13 file-order counter with constant key (degenerate) -> refuse ordinal disguise
{
  const rows = ['group,id,const,pos'];
  for (let g = 0; g < 6; g++) for (let i = 0; i < 25; i++) rows.push(`G${g},x${g}-${i},7,${i + 1}`);
  cases.push({ name: 'degenerate-counter', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 14 share computed from a DIFFERENT (absent) total -> refuse
{
  const rows = ['region,sales,share'];
  for (let g = 0; g < 5; g++) {
    const sales = Array.from({ length: 20 }, () => 100 + ri(1000));
    sales.forEach((s) => rows.push(`R${g},${s},${F2(100 * s / 123456)}`));
  }
  cases.push({ name: 'foreign-total', text: rows.join('\n') + '\n', expect: 'any' });
}
// 15 TSV + CRLF grouped rank ascending
{
  const rows = ['g\tid\ttime\tpos'];
  for (let g = 0; g < 5; g++) {
    const times = Array.from({ length: 24 }, () => 100 + ri(900));
    const pos = ranks(times.map((v) => -v), 'ord');
    times.forEach((t, i) => rows.push(`G${g}\tr${i}\t${t}\t${pos[i]}`));
  }
  cases.push({ name: 'tsv-crlf-asc', text: rows.join('\r\n') + '\r\n', expect: 'apply' });
}
// 16 shuffled rows of a grouped rank (order must not matter)
{
  const all: string[] = [];
  for (let g = 0; g < 5; g++) {
    const scores = Array.from({ length: 28 }, () => ri(700));
    const pos = ranks(scores, 'comp');
    scores.forEach((s, i) => all.push(`G${g},x${g}-${i},${s},${pos[i]}`));
  }
  for (let i = all.length - 1; i > 0; i--) { const j = ri(i + 1); [all[i], all[j]] = [all[j]!, all[i]!]; }
  cases.push({ name: 'shuffled', text: 'group,id,score,pos\n' + all.join('\n') + '\n', expect: 'apply' });
}
// 17 tiny table -> refuse
{
  cases.push({ name: 'tiny', text: 'id,v,r\n1,5,1\n2,3,2\n3,9,3\n', expect: 'refuse' });
}
// 18 no trailing newline, whole-table dense rank
{
  const scores = Array.from({ length: 120 }, () => ri(30));
  const pos = ranks(scores, 'dense');
  const rows = ['id,score,rank', ...scores.map((s, i) => `${i},${s},${pos[i]}`)];
  cases.push({ name: 'no-trailing-nl', text: rows.join('\n'), expect: 'apply' });
}
// 19 percentile from ROUNDED source but rank from unrounded (twin) -> any
{
  const rows = ['id,score,pos'];
  const raw = Array.from({ length: 150 }, () => rnd() * 100);
  const pos = ranks(raw, 'ord');
  raw.forEach((v, i) => rows.push(`${i},${Math.round(v)},${pos[i]}`));
  cases.push({ name: 'twin-rounded-rank', text: rows.join('\n') + '\n', expect: 'any' });
}
// 20 German semicolon shares
{
  const rows = ['region;wert;anteil'];
  const de = (x: string): string => x.replace('.', ',');
  for (let g = 0; g < 5; g++) {
    const vals = Array.from({ length: 24 }, () => 50 + ri(2000));
    const tot = vals.reduce((a, b) => a + b, 0);
    vals.forEach((v) => rows.push(`R${g};${v};${de(F2(100 * v / tot))}`));
  }
  cases.push({ name: 'german-share', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 21 two swapped positions (in-range exceptions) -> apply with exceptions
{
  const scores = Array.from({ length: 150 }, () => ri(900));
  const pos = ranks(scores, 'ord');
  const tmp = pos[10]!; pos[10] = pos[77]!; pos[77] = tmp;
  const rows = ['id,score,pos', ...scores.map((s, i) => `${i},${s},${pos[i]}`)];
  cases.push({ name: 'rank-swapped-exceptions', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 22 ntile with k == group size on a constant key in disguise (few distinct keys) -> refuse
{
  const rows = ['group,id,key,pos'];
  for (let g = 0; g < 6; g++) for (let i = 0; i < 20; i++) rows.push(`G${g},x${g}-${i},${1 + (i % 2)},${i + 1}`);
  cases.push({ name: 'ntile-identity-disguise', text: rows.join('\n') + '\n', expect: 'refuse' });
}
for (const c of cases) fs.writeFileSync(`${DIR}/${c.name}.csv`, c.text);
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify(cases.map((c) => ({ name: c.name, expect: c.expect })), null, 1));
console.log('cases', cases.length);
