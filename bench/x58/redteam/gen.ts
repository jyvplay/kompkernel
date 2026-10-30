// X58 ZYGON red-team generator (seeded, deterministic).
import * as fs from 'node:fs';
const DIR = 'bench/x58/redteam/cases';
fs.mkdirSync(DIR, { recursive: true });
let seed = 0x5858;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (n: number): number => Math.floor(rnd() * n);
const cases: { name: string; text: string; expect: 'apply' | 'refuse' | 'any' }[] = [];
const F1 = (v: number): string => { const r = Math.round(Math.abs(v) * 10) / 10; return (v < 0 && r !== 0 ? '-' : '') + r.toFixed(1); };
const F2 = (v: number): string => { const r = Math.round(Math.abs(v) * 100) / 100; return (v < 0 && r !== 0 ? '-' : '') + r.toFixed(2); };

// 1 league points 3W+D (200 rows)
{
  const rows = ['team,wins,draws,losses,points'];
  for (let i = 0; i < 200; i++) { const w = ri(30), d = ri(15), l = ri(20); rows.push(`T${i},${w},${d},${l},${3 * w + d}`); }
  cases.push({ name: 'league-points', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 2 weighted grade (0.3/0.7)
{
  const rows = ['student,midterm,final,grade'];
  for (let i = 0; i < 150; i++) { const m = Number(F1(40 + rnd() * 60)), f = Number(F1(40 + rnd() * 60)); rows.push(`S${i},${F1(m)},${F1(f)},${F1(0.3 * m + 0.7 * f)}`); }
  cases.push({ name: 'weighted-grade', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 3 plain average of 4 (weights 1/4)
{
  const rows = ['id,a,b,c,d,avg'];
  for (let i = 0; i < 150; i++) { const v = [0, 0, 0, 0].map(() => ri(100)); rows.push(`${i},${v.join(',')},${F2(v.reduce((x, y) => x + y, 0) / 4)}`); }
  cases.push({ name: 'average4', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 4 with intercept: fee total = 2.5*x + 1.75*y + 10
{
  const rows = ['id,x,y,total'];
  for (let i = 0; i < 120; i++) { const x = ri(50), y = ri(40); rows.push(`${i},${x},${y},${F2(2.5 * x + 1.75 * y + 10)}`); }
  cases.push({ name: 'intercept-law', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 5 unweighted sum -> refuse (KEPHALAION owns)
{
  const rows = ['id,a,b,c,total'];
  for (let i = 0; i < 120; i++) { const v = [ri(50), ri(50), ri(50)]; rows.push(`${i},${v.join(',')},${v[0]! + v[1]! + v[2]!}`); }
  cases.push({ name: 'unweighted-sum', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 6 single-term scale -> refuse (scaleK owns)
{
  const rows = ['id,km,mi'];
  for (let i = 0; i < 120; i++) { const k = rnd() * 200; rows.push(`${i},${F1(k)},${F1(k * 0.621371)}`); }
  cases.push({ name: 'single-scale', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 7 product (nonlinear) -> refuse
{
  const rows = ['id,x,y,p'];
  for (let i = 0; i < 120; i++) { const x = ri(20) + 1, y = ri(20) + 1; rows.push(`${i},${x},${y},${x * y}`); }
  cases.push({ name: 'product', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 8 collinear sources (played=w+d+l, gd) like ewf
{
  const rows = ['team,played,w,d,l,gf,ga,gd,pts'];
  for (let i = 0; i < 180; i++) { const w = ri(28), d = ri(12), l = ri(18), gf = ri(80), ga = ri(70); rows.push(`T${i},${w + d + l},${w},${d},${l},${gf},${ga},${gf - ga},${3 * w + d}`); }
  cases.push({ name: 'collinear', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 9 weights row above header (GWU shape)
{
  const rows = [',0.2,0.3,0.5,', 'id,hw,quiz,exam,final'];
  for (let i = 0; i < 150; i++) { const a = ri(101), b = ri(101), c = ri(101); rows.push(`${i},${a},${b},${c},${F1(0.2 * a + 0.3 * b + 0.5 * c)}`); }
  cases.push({ name: 'weights-lead-row', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 10 portfolio (shares const cols + prices)
{
  const rows = ['date,pa,sa,pb,sb,value'];
  for (let i = 0; i < 150; i++) { const pa = Number(F2(90 + rnd() * 40)), pb = Number(F2(200 + rnd() * 80)); rows.push(`2026-01-${String(i % 28 + 1).padStart(2, '0')},${F2(pa)},150,${F2(pb)},40,${F2(150 * pa + 40 * pb)}`); }
  cases.push({ name: 'portfolio', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 11 two exception rows (manual adjustments)
{
  const rows = ['id,a,b,total'];
  for (let i = 0; i < 150; i++) { const a = ri(90), b = ri(90); let t = F1(0.4 * a + 0.6 * b); if (i === 7) t = '99.9'; if (i === 99) t = '0.1'; rows.push(`${i},${a},${b},${t}`); }
  cases.push({ name: 'two-exceptions', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 12 five exception rows -> refuse target
{
  const rows = ['id,a,b,total'];
  for (let i = 0; i < 150; i++) { const a = ri(90), b = ri(90); let t = F1(0.4 * a + 0.6 * b); if ([7, 33, 58, 99, 140].includes(i)) t = '55.5'; rows.push(`${i},${a},${b},${t}`); }
  cases.push({ name: 'five-exceptions', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 13 TSV + CRLF
{
  const rows = ['id\ta\tb\ttotal'];
  for (let i = 0; i < 130; i++) { const a = ri(60), b = ri(60); rows.push(`${i}\t${a}\t${b}\t${F2(1.5 * a + 2.25 * b)}`); }
  cases.push({ name: 'tsv-crlf', text: rows.join('\r\n') + '\r\n', expect: 'apply' });
}
// 14 no trailing newline
{
  const rows = ['id,a,b,total'];
  for (let i = 0; i < 130; i++) { const a = ri(60), b = ri(60); rows.push(`${i},${a},${b},${3 * a + b}`); }
  cases.push({ name: 'no-trailing-nl', text: rows.join('\n'), expect: 'apply' });
}
// 15 max-blend (0.6 max + 0.4 min) -> not linear, refuse
{
  const rows = ['id,mt,fin,fav'];
  for (let i = 0; i < 130; i++) { const a = ri(101), b = ri(101); rows.push(`${i},${a},${b},${F2(0.6 * Math.max(a, b) + 0.4 * Math.min(a, b))}`); }
  cases.push({ name: 'max-blend', text: rows.join('\n') + '\n', expect: 'any' });
}
// 16 constant target
{
  const rows = ['id,a,b,t'];
  for (let i = 0; i < 60; i++) rows.push(`${i},${ri(50)},${ri(50)},7`);
  cases.push({ name: 'constant-target', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 17 negative weights (net = gross - 0.22*deductions + 2*bonus)
{
  const rows = ['id,gross,deductions,bonus,net'];
  for (let i = 0; i < 140; i++) { const g = 1000 + ri(3000), d = ri(400), b = ri(150); rows.push(`${i},${g},${d},${b},${F2(g - 0.22 * d + 2 * b)}`); }
  cases.push({ name: 'negative-weights', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 18 german de semicolon
{
  const rows = ['id;a;b;summe'];
  const de = (s: string): string => s.replace('.', ',');
  for (let i = 0; i < 130; i++) { const a = Number(F1(rnd() * 50)), b = Number(F1(rnd() * 50)); rows.push(`${i};${de(F1(a))};${de(F1(b))};${de(F1(0.5 * a + 0.5 * b))}`); }
  cases.push({ name: 'german-de', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 19 rows too few (rank-starved for 3 unknowns? 12 rows ok) make 8 rows -> below min
{
  const rows = ['id,a,b,t'];
  for (let i = 0; i < 8; i++) { const a = ri(50), b = ri(50); rows.push(`${i},${a},${b},${2 * a + b}`); }
  cases.push({ name: 'tiny', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 20 shuffled rows
{
  const rows = ['id,a,b,t'];
  const idxs = Array.from({ length: 140 }, (_, i) => i).sort(() => rnd() - 0.5);
  for (const i of idxs) { const a = ri(80), b = ri(80); rows.push(`${i},${a},${b},${F1(0.35 * a + 0.65 * b)}`); }
  cases.push({ name: 'shuffled', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 21 many terms (10 assignments, mixed small weights)
{
  const ws = [0.02, 0.03, 0.05, 0.05, 0.1, 0.1, 0.15, 0.15, 0.15, 0.2];
  const rows = ['id,' + ws.map((_, i) => 'c' + i).join(',') + ',final'];
  for (let i = 0; i < 160; i++) { const v = ws.map(() => ri(101)); rows.push(`${i},${v.join(',')},${F2(v.reduce((s, x, j) => s + ws[j]! * x, 0))}`); }
  cases.push({ name: 'ten-terms', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 22 truncating generator
{
  const rows = ['id,a,b,t'];
  const T1 = (v: number): string => (Math.trunc(v * 10) / 10).toFixed(1);
  for (let i = 0; i < 140; i++) { const a = ri(90), b = ri(90); rows.push(`${i},${a},${b},${T1(0.45 * a + 0.55 * b)}`); }
  cases.push({ name: 'trunc-gen', text: rows.join('\n') + '\n', expect: 'any' });
}
// 23 twin-rounded weighted (computed from unrounded inputs) -> refuse
{
  const rows = ['student,midterm,final,grade'];
  for (let i = 0; i < 150; i++) { const m = 40 + rnd() * 60, f = 40 + rnd() * 60; rows.push(`S${i},${F1(m)},${F1(f)},${F1(0.3 * m + 0.7 * f)}`); }
  cases.push({ name: 'twin-rounded-weighted', text: rows.join('\n') + '\n', expect: 'refuse' });
}
for (const c of cases) fs.writeFileSync(`${DIR}/${c.name}.csv`, c.text);
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify(cases.map((c) => ({ name: c.name, expect: c.expect })), null, 1));
console.log('cases', cases.length);
