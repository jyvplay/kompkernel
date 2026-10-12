// Compliant comparison: every wire carries its VX decode legend, and each is decoded from the wire alone
// (the decoders are the codec's own chain, with the VX step replaced by the legend-aware VX decoder).
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx3Encode } from '@/lib/omega/phalanx3';
import { phalanx4Encode, phalanx4Decode } from '@/lib/omega/phalanx4';
import { veritasEncodeMulti, withVxLegend, veritasDecodeL } from '@/lib/omega/veritas-w';
import { uuidfoldDecode } from '@/lib/omega/uuidfold';
import { dirfoldADecode } from '@/lib/omega/dirfold-a';
import { dittoDecode } from '@/lib/omega/ditto';
import { koineDecode } from '@/lib/omega/koine';
import { recallDecode } from '@/lib/omega/recall';

const lanes: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
};
// P3 chain with the legend-aware VX decoder (identical to phalanx3Decode except the first step)
const p3Decode = (w: string) => { if (w.startsWith('PHALANX-P3: identity\n')) return w.slice(21); let t = veritasDecodeL(w); t = recallDecode(t); t = koineDecode(t); t = dittoDecode(t); t = dirfoldADecode(t); t = uuidfoldDecode(t); return t; };
let bad = 0;
const tot: Record<string, Record<string, number>> = {};
for (const [lane, files] of Object.entries(lanes)) {
  tot[lane] = { id: 0, P3L: 0, P4L: 0, VXML: 0, VXM3L: 0 };
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const id = countTokens(t, 'o200k_base');
    // P3 legend-carrying
    const p3 = phalanx3Encode(t); const p3w = withVxLegend(p3.wire);
    if (p3.mode === 'phalanx3' ? p3Decode(p3w) !== t : false) bad++;
    if (p3.mode !== 'phalanx3' && p3w !== t) { /* identity: no legend */ }
    const p3tok = p3.mode === 'phalanx3' ? countTokens(p3w, 'o200k_base') : p3.outTokens;
    // P4 legend-carrying (registered codec; decoder is its own)
    const p4 = phalanx4Encode(t); if (phalanx4Decode(p4.wire) !== t) bad++;
    // VX-M alone, with legend
    const vm = veritasEncodeMulti(t, 'o200k_base', [3, 2]); const vmw = withVxLegend(vm.wire);
    if (veritasDecodeL(vmw) !== t) bad++;
    const vm3 = veritasEncodeMulti(t, 'o200k_base', [3]); const vm3w = withVxLegend(vm3.wire);
    if (veritasDecodeL(vm3w) !== t) bad++;
    const T = tot[lane];
    T.id += id; T.P3L += p3tok; T.P4L += p4.outTokens; T.VXML += countTokens(vmw, 'o200k_base'); T.VXM3L += countTokens(vm3w, 'o200k_base');
  }
  const T = tot[lane];
  console.log(`${lane}: identity=${T.id} P3-legend=${T.P3L} P4-legend=${T.P4L} (P4-P3=${T.P4L - T.P3L}) VX-M[3,2]-legend=${T.VXML} VX-M[3]-legend=${T.VXM3L}`);
}
const all = Object.values(tot).reduce((s, T) => { for (const k of Object.keys(T)) s[k] = (s[k] ?? 0) + T[k]; return s; }, {} as Record<string, number>);
console.log(`ALL: identity=${all.id} P3-legend=${all.P3L} P4-legend=${all.P4L} VX-M[3,2]-legend=${all.VXML} VX-M[3]-legend=${all.VXM3L}`);
console.log(`decode failures (P3-legend, P4-legend, VX-M legend): ${bad}`);
