import * as fs from 'node:fs';
import { syllogismosPlan } from '../../src/lib/omega/syllogismos';
let seed = 0xB11D;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(xs: T[]): T => xs[ri(0, xs.length - 1)]!;
fs.mkdirSync('bench/x51/blind/hidden', { recursive: true });
fs.mkdirSync('bench/x51/blind/visible', { recursive: true });

// Sample A: product + split + case
{
  const rows: string[][] = [];
  const mul = (x: string, y: string) => {
    const p = (s: string) => { const m = /^(\d+)(?:\.(\d+))?$/.exec(s)!; return { mag: BigInt(m[1] + (m[2] ?? '')), sc: (m[2] ?? '').length }; };
    const a = p(x); const b = p(y); const mag = a.mag * b.mag; const sc = a.sc + b.sc;
    let d = mag.toString().padStart(sc + 1, '0'); if (sc) d = d.slice(0, -sc) + '.' + d.slice(-sc);
    if (d.includes('.')) d = d.replace(/0+$/, '').replace(/\.$/, ''); return d;
  };
  for (let i = 0; i < 16; i++) {
    const qty = String(ri(2, 60));
    const unit = `${ri(3, 240)}${pick(['', '.5', '.25', '.75'])}`;
    const region = pick(['EU-DE', 'EU-FR', 'NA-US', 'EU-IT', 'AS-JP', 'NA-CA', 'EU-ES', 'OC-AU']);
    const sku = `WD-${ri(100, 999)}`;
    rows.push([`item-${i}`, qty, unit, mul(qty, unit), region, region.split('-')[0]!, sku, sku.toLowerCase()]);
  }
  const text = ['item,qty,unit,amount,region,bloc,sku,sku_low', ...rows.map(r => r.join(','))].join('\n') + '\n';
  const plan = syllogismosPlan(text); if (!plan) throw new Error('A no plan');
  fs.writeFileSync('bench/x51/blind/hidden/A.orig', text);
  fs.writeFileSync('bench/x51/blind/visible/A.message', plan.contract + '\n' + plan.reducedText);
  console.log('A drops', plan.spec.drops.map(d => `${d.name}:${d.kind}`).join(' '));
}
// Sample B: shiftdiff + lookup + concat
{
  const rows: string[][] = [];
  const cc: Record<string, string> = { Porto: 'PT', Braga: 'PT', Lyon: 'FR', Nice: 'FR', Gent: 'BE', Bruges: 'BE' };
  const cities = Object.keys(cc);
  let level = ri(400, 600);
  for (let i = 0; i < 18; i++) {
    const prev = level; level += ri(-35, 48);
    const city = pick(cities); const day = `D${(i + 1).toString().padStart(2, '0')}`;
    rows.push([day, String(level), i === 0 ? '0' : String(level - prev), city, cc[city]!, `INV-${day}-${cc[city]}`]);
  }
  const text = ['day,level,delta,city,cc,ref', ...rows.map(r => r.join(','))].join('\n') + '\n';
  const plan = syllogismosPlan(text); if (!plan) throw new Error('B no plan');
  fs.writeFileSync('bench/x51/blind/hidden/B.orig', text);
  fs.writeFileSync('bench/x51/blind/visible/B.message', plan.contract + '\n' + plan.reducedText);
  console.log('B drops', plan.spec.drops.map(d => `${d.name}:${d.kind}`).join(' '));
}
