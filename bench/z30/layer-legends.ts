// Legend cost per layout layer: encode one sample that triggers each layer and count the layer's own header+legend tokens.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
import { phalanxA5Encode } from '@/lib/omega/phalanx-a5';
import { phalanxA7Encode } from '@/lib/omega/phalanx-a7';
const enc = 'o200k_base' as const;
const jsonF = 'bench/holdout/json-pkg.txt';
const wrapF = fs.readdirSync('bench/z28/wrapped-real').map((f) => 'bench/z28/wrapped-real/' + f)[0];
const colF = 'bench/z20/samples/ls-omega-full-iso.txt';
const show = (label: string, wire: string, header: string[]) => {
  const lines = wire.split('\n');
  const hdr = lines.slice(0, header.length).join('\n');
  console.log(label.padEnd(6), 'layer header+legend tokens =', countTokens(hdr + '\n', enc), '| first line =', JSON.stringify(lines[0]).slice(0, 60));
};
const a3 = phalanxA3Encode(fs.readFileSync(jsonF, 'utf8'), enc) as any;
console.log('A3 keys', Object.keys(a3).join(','), 'layer', a3.layer);
show('A3', a3.wire ?? '', ['x']);
const a5 = phalanxA5Encode(fs.readFileSync(wrapF, 'utf8'), enc);
console.log('A5 layer', a5.layer);
if (a5.layer === 'wrap') show('A5', a5.wire, ['x', 'y']);
const a7 = phalanxA7Encode(fs.readFileSync(colF, 'utf8'), enc);
console.log('A7 layer', a7.layer);
show('A7', a7.wire, ['x', 'y']);
console.log('A7 legend line tokens', countTokens(a7.wire.split('\n')[1] + '\n', enc));
