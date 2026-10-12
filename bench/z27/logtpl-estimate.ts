// Estimate: Drain-style log template folding over A3. Byte-exact by construction (checked below).
// Each line -> whitespace-preserving tokens; tokens containing a digit are variables (replaced by PH in the template).
// Output: "T<i>\t<template>" once per distinct template, then "<i>\t<v1>\t<v2>..." per line. Lines that contain
// TAB or PH are emitted raw as "R\t<line>" (never transformed), so the inverse is exact.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA3Encode, phalanxA3Decode } from '@/lib/omega/phalanx-a3';
const PH = '\u0001';
export function tplFold(text: string): string {
  const lines = text.split('\n');
  const tpls = new Map<string, number>();
  const tplOrder: string[] = [];
  const body: string[] = [];
  for (const line of lines) {
    if (line.includes('\t') || line.includes(PH)) { body.push('R\t' + line); continue; }
    const toks = line.split(/(\s+)/);
    const vals: string[] = [];
    const tpl = toks.map((t) => (/\d/.test(t) && !/\s/.test(t) && t.length > 0 ? (vals.push(t), PH) : t)).join('');
    let id = tpls.get(tpl);
    if (id === undefined) { id = tplOrder.length; tpls.set(tpl, id); tplOrder.push(tpl); }
    body.push([String(id), ...vals].join('\t'));
  }
  return tplOrder.map((t, i) => 'T' + i + '\t' + t).join('\n') + '\n@\n' + body.join('\n');
}
export function tplUnfold(s: string): string {
  const at = s.indexOf('\n@\n');
  const tpls = s.slice(0, at).split('\n').map((l) => l.slice(l.indexOf('\t') + 1));
  const body = s.slice(at + 3).split('\n');
  return body.map((l) => {
    if (l.startsWith('R\t')) return l.slice(2);
    const cells = l.split('\t');
    const tpl = tpls[Number(cells[0])];
    let k = 1;
    return tpl.split(PH).map((seg, i) => (i === 0 ? seg : cells[k++] + seg)).join('');
  }).join('\n');
}
if (process.argv[2] === 'check' || process.argv.length > 2) {
  let idT = 0, a3 = 0, tplT = 0, fail = 0;
  for (const f of process.argv.slice(2)) {
    const t = fs.readFileSync(f, 'utf8');
    const folded = tplFold(t);
    if (tplUnfold(folded) !== t) fail++;
    const i = countTokens(t, 'o200k_base'), a = phalanxA3Encode(t, 'o200k_base').outTokens;
    const fo = phalanxA3Encode(folded, 'o200k_base').outTokens;
    idT += i; a3 += a; tplT += fo;
    console.log(`${f}: identity=${i} A3=${a} A3(fold)=${fo} (${(((fo - a) / a) * 100).toFixed(2)}%)`);
  }
  console.log(`ALL identity=${idT} A3=${a3} A3(fold)=${tplT} (${(((tplT - a3) / a3) * 100).toFixed(2)}%) fold roundtrip failures=${fail}`);
}
