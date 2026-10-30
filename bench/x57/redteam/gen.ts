// X57 SYZYGIA red-team generator (seeded, deterministic).
// Writes adversarial cases + expected outcomes to bench/x57/redteam/cases/.
import * as fs from 'node:fs';
const DIR = 'bench/x57/redteam/cases';
fs.mkdirSync(DIR, { recursive: true });
let seed = 0x5757;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (n: number): number => Math.floor(rnd() * n);
const cases: { name: string; text: string; expect: 'apply' | 'refuse' | 'any' }[] = [];
const F1 = (v: number): string => { // round half away from zero, 1 decimal
  const r = Math.round(Math.abs(v) * 10) / 10;
  return (v < 0 && r !== 0 ? '-' : '') + r.toFixed(1);
};
const F2 = (v: number): string => {
  const r = Math.round(Math.abs(v) * 100) / 100;
  return (v < 0 && r !== 0 ? '-' : '') + r.toFixed(2);
};

// 1 exact affine C->F ints (computed once)
{
  const rows = ['city,c,f'];
  for (let i = 0; i < 140; i++) { const c = -40 + i; rows.push(`c${i},${c},${Math.round(c * 9 / 5 + 32)}`); }
  cases.push({ name: 'exact-cf-ints', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 2 twin-rounded C/F from hidden exact values
{
  const rows = ['city,temp_c,temp_f,hum'];
  for (let i = 0; i < 60; i++) {
    const exact = -5 + rnd() * 40;
    rows.push(`city${i},${F1(exact)},${F1(exact * 9 / 5 + 32)},${20 + ri(70)}`);
  }
  cases.push({ name: 'twin-rounded', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 3 intercept-only C->K twinrounded
{
  const rows = ['lab,c,k'];
  for (let i = 0; i < 40; i++) { const exact = rnd() * 100; rows.push(`l${i},${F2(exact)},${F2(exact + 273.15)}`); }
  cases.push({ name: 'intercept-only-kelvin', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 4 scale-only mph->kph exact-decimal factor twin-rounded
{
  const rows = ['seg,mph,kph'];
  for (let i = 0; i < 40; i++) { const exact = rnd() * 80; rows.push(`s${i},${F1(exact)},${F1(exact * 1.609344)}`); }
  cases.push({ name: 'scale-twin', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 5 one row with residual 2 -> must refuse that pair (some other pair may exist: 'any')
{
  const rows = ['x,y'];
  for (let i = 0; i < 30; i++) { const x = i; let y = F1(x * 1.8 + 32); if (i === 7) y = F1(x * 1.8 + 32 + 0.2); rows.push(`${x},${y}`); }
  cases.push({ name: 'residual-2-row', text: rows.join('\n') + '\n', expect: 'any' });
}
// 6 quadratic (not affine) -> refuse
{
  const rows = ['t,d'];
  for (let i = 0; i < 25; i++) rows.push(`${i},${F1(4.9 * i * i)}`);
  cases.push({ name: 'quadratic', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 7 empty cells -> refuse pair
{
  const rows = ['c,f'];
  for (let i = 0; i < 20; i++) rows.push(i === 5 ? `${i},` : `${i},${F1(i * 1.8 + 32)}`);
  cases.push({ name: 'empty-cells', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 8 duplicate column exactly -> refuse (APO owns)
{
  const rows = ['a,b,c'];
  for (let i = 0; i < 20; i++) { const v = (i * 7 % 13) + 1; rows.push(`${v},${v},${i}`); }
  cases.push({ name: 'duplicate-col', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 9 constant target -> refuse
{
  const rows = ['x,y'];
  for (let i = 0; i < 20; i++) rows.push(`${i},3.5`);
  cases.push({ name: 'constant-target', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 10 negative slope affine exact
{
  const rows = ['alt_ft,temp_c'];
  for (let i = 0; i < 25; i++) { const a = i * 100; rows.push(`${a},${F1(15 - a * 0.002)}`); }
  cases.push({ name: 'negative-slope', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 11 TSV + CRLF twin
{
  const rows = ['city\ttemp_c\ttemp_f'];
  for (let i = 0; i < 120; i++) { const ex = rnd() * 35; rows.push(`c${i}\t${F1(ex)}\t${F1(ex * 9 / 5 + 32)}`); }
  cases.push({ name: 'tsv-crlf', text: rows.join('\r\n') + '\r\n', expect: 'apply' });
}
// 12 no trailing newline
{
  const rows = ['c,f'];
  for (let i = 0; i < 20; i++) rows.push(`${i},${F1(i * 9 / 5 + 32)}`);
  cases.push({ name: 'no-trailing-nl', text: rows.join('\n'), expect: 'apply' });
}
// 13 mixed scales in target (1 and 2 dp) -> refuse
{
  const rows = ['c,f'];
  for (let i = 0; i < 20; i++) rows.push(`${i},${i % 2 ? F1(i * 1.8 + 32) : F2(i * 1.8 + 32)}`);
  cases.push({ name: 'mixed-scale', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 14 float dust
{
  const rows = ['c,k'];
  for (let i = 0; i < 20; i++) rows.push(`${F1(i)},${273.15 + i}999999999999`.slice(0, 18) + '');
  cases.push({ name: 'float-dust', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 15 multiple twin pairs, dual-unit full block
{
  const rows = ['id,tc,tf,mph,kph,mb,inhg'];
  for (let i = 0; i < 50; i++) {
    const t = rnd() * 40 - 5, w = rnd() * 30, p = 980 + rnd() * 40;
    rows.push(`${i},${F1(t)},${F1(t * 9 / 5 + 32)},${F1(w)},${F1(w * 1.609344)},${F1(p)},${F2(p * 0.02952998751)}`);
  }
  cases.push({ name: 'multi-pair-block', expect: 'apply', text: rows.join('\n') + '\n' });
}
// 16 fit exists but from different x domain, two distinct-x only -> degenerate
{
  const rows = ['x,y'];
  for (let i = 0; i < 12; i++) rows.push(`${i % 2},${i % 2 ? '41.0' : '32.0'}`);
  cases.push({ name: 'two-point-only', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 17 semicolon delim exact affine
{
  const rows = ['c;f'];
  for (let i = 0; i < 25; i++) rows.push(`${i};${F1(i * 1.8 + 32)}`);
  cases.push({ name: 'semicolon', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 18 quoted text column alongside twins
{
  const rows = ['name,c,f'];
  for (let i = 0; i < 120; i++) { const e = rnd() * 30; rows.push(`"town, ${i}",${F1(e)},${F1(e * 1.8 + 32)}`); }
  cases.push({ name: 'quoted-names', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 19 truncating generator: y = trunc(1.5x + 2, 1)
{
  const rows = ['x,y'];
  const T1 = (v: number): string => (Math.trunc(v * 10) / 10).toFixed(1);
  for (let i = 0; i < 30; i++) { const x = i * 0.7; rows.push(`${F1(x)},${T1(x * 1.5 + 2)}`); }
  cases.push({ name: 'trunc-generator', text: rows.join('\n') + '\n', expect: 'any' });
}
// 20 capped visibility look-alike (vis) -> refuse
{
  const rows = ['km,mi'];
  for (let i = 0; i < 30; i++) { const km = Math.min(10, 2 + rnd() * 20); const mi = Math.min(6, km * 0.621371); rows.push(`${F1(km)},${F1(mi)}`); }
  cases.push({ name: 'capped-vis', text: rows.join('\n') + '\n', expect: 'any' });
}
// 21 big slope exact
{
  const rows = ['usd_cents,usd'];
  for (let i = 0; i < 30; i++) { const c = 100 + i * 137; rows.push(`${c},${(c / 100).toFixed(2)}`); }
  cases.push({ name: 'cents-dollars', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 22 german de style with semicolon: c;f values 1-decimal comma
{
  const rows = ['c;f'];
  const de = (s: string): string => s.replace('.', ',');
  for (let i = 0; i < 25; i++) rows.push(`${de(F1(i))};${de(F1(i * 1.8 + 32))}`);
  cases.push({ name: 'german-de', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 23 section-line look-alike in source -> guard refuses
{
  const rows = ['c,f'];
  for (let i = 0; i < 15; i++) rows.push(`${i},${F1(i * 1.8 + 32)}`);
  rows.push('§2 ..++--..++--..+');
  cases.push({ name: 'section-lookalike', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 24 duplicated header names with affine twins among them
{
  const rows = ['aq,aq,aq'];
  for (let i = 0; i < 120; i++) { const v = i * 2; rows.push(`${v},${v + 5},${i}`); }
  cases.push({ name: 'dup-header-names', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 25 tiny table (below min rows)
{
  const rows = ['c,f'];
  for (let i = 0; i < 5; i++) rows.push(`${i},${F1(i * 1.8 + 32)}`);
  cases.push({ name: 'tiny', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 26 zero slope with noise ±1 around a centre (stochastic look-alike) -> refuse (non-varying target? varies ±1 ulp..)
{
  const rows = ['x,y'];
  for (let i = 0; i < 30; i++) rows.push(`${i},${(50 + (ri(3) - 1) * 0.1).toFixed(1)}`);
  cases.push({ name: 'noise-band', text: rows.join('\n') + '\n', expect: 'any' });
}
// 27 shuffled row order (statelessness)
{
  const rows = ['c,f'];
  const idx = Array.from({ length: 40 }, (_, i) => i).sort(() => rnd() - 0.5);
  for (const i of idx) rows.push(`${i},${F1(i * 1.8 + 32)}`);
  cases.push({ name: 'shuffled-rows', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 28 wider magnitudes (pressure Pa -> kPa scale, exact)
{
  const rows = ['pa,kpa'];
  for (let i = 0; i < 30; i++) { const pa = 100000 + i * 137; rows.push(`${pa},${(pa / 1000).toFixed(3)}`); }
  cases.push({ name: 'pa-kpa', text: rows.join('\n') + '\n', expect: 'apply' });
}
for (const c of cases) fs.writeFileSync(`${DIR}/${c.name}.csv`, c.text);
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify(cases.map((c) => ({ name: c.name, expect: c.expect })), null, 1));
console.log('cases', cases.length);
