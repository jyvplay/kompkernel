// Z40 probe: slash-aligned front coding of sorted lines, then DAEDALUS on the front-coded text.
// Front coding: line i shares its leading path segments (up to a '/' boundary) with line i-1; emit "<k>" + the rest.
// Measures o200k tokens only; exactness of the layered codec is NOT claimed by this probe.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
function frontCode(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let prev = '';
  for (const l of lines) {
    let k = 0; // length of shared prefix cut at a '/' boundary
    const n = Math.min(prev.length, l.length);
    let i = 0;
    while (i < n && prev[i] === l[i]) i++;
    const cut = prev.lastIndexOf('/', i - 1);
    if (i > 0 && cut >= 0 && cut < n && l.slice(0, cut + 1) === prev.slice(0, cut + 1)) k = cut + 1;
    out.push(k > 0 ? `>${k}${l.slice(k)}` : l);
    prev = l;
  }
  return out.join('\n');
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const fc = frontCode(t);
  const raw = countTokens(t, 'o200k_base');
  const fcTok = countTokens(fc, 'o200k_base');
  const d0 = daedalusEncode(t);
  const d1 = daedalusEncode(fc);
  console.log(JSON.stringify({ f: f.split('/').slice(-2).join('/'), raw, dae: d0.messageTokens, daeArm: d0.winningArm, frontcodedRaw: fcTok, daeOnFront: d1.messageTokens, daeOnFrontArm: d1.winningArm, deltaVsDaePct: +(100 * (d1.messageTokens / d0.messageTokens - 1)).toFixed(2) }));
}
