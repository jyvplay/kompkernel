// X51 SYNTHETIC lane generator (labelled synthetic everywhere it is cited).
// A realistic order-lines export shape with three computed columns.
import * as fs from 'node:fs';
let seed = 0x0DEC;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(xs: T[]): T => xs[ri(0, xs.length - 1)]!;
const regions = ['EU-DE','EU-FR','EU-IT','EU-ES','NA-US','NA-CA','AS-JP','OC-AU','EU-NL','EU-PL'];
const rows: string[] = ['order_id,region,country,qty,unit,total,ref'];
for (let i = 0; i < 160; i++) {
  const id = String(1042 + i * 3);
  const region = pick(regions);
  const qty = ri(1, 48);
  const cents = ri(199, 89999);
  const unit = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
  const totC = BigInt(qty) * BigInt(cents);
  const total = `${totC / 100n}.${String(totC % 100n).padStart(2, '0')}`;
  rows.push([id, region, region.split('-')[1]!, String(qty), unit, total, `INV-${id}-${region}`].join(','));
}
fs.writeFileSync('bench/x51/fixtures/orders-synthetic-160.csv', rows.join('\n') + '\n');
console.log('written 160 rows');
