import * as fs from 'node:fs';
import { syllogismosPlan } from '../../src/lib/omega/syllogismos';
let seed = 0xC123;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(xs: T[]): T => xs[ri(0, xs.length - 1)]!;
const lang: Record<string, string> = { Lyon: 'fr', Dijon: 'fr', Turin: 'it', Milan: 'it', Porto: 'pt', Faro: 'pt', Malmo: 'sv', Uppsala: 'sv' };
const rows: string[][] = [];
for (let i = 0; i < 14; i++) {
  const city = pick(Object.keys(lang));
  const code = `TRK-${ri(100, 899)}`;
  const gross = ri(120, 960); const net = gross - ri(5, 90);
  rows.push([code, city, lang[city]!, `${code.toLowerCase()}@${lang[city]}`, String(gross), String(net), String(gross - net)]);
}
const text = ['code,city,lang,handle,gross,net,loss', ...rows.map(r => r.join(','))].join('\n') + '\n';
const plan = syllogismosPlan(text); if (!plan) throw new Error('C no plan');
fs.writeFileSync('bench/x51/blind/hidden/C.orig', text);
fs.writeFileSync('bench/x51/blind/visible/C.message', plan.contract + '\n' + plan.reducedText);
console.log('C drops', plan.spec.drops.map(d => `${d.name}:${d.kind}`).join(' '));
