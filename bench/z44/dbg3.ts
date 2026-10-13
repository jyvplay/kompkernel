import { tokenStrings, encodeIds, countTokens } from '@/lib/omega/bpe';
import { decodeIds } from '@/lib/omega/bpe';
const probes = ['⟦', '⟧', '…', '⟦abc…def⟧', 'nova-api.log.1 ⟦54fadb412c…9335e4c35a⟧ x'];
for (const p of probes) {
  const ts = tokenStrings(p, 'o200k_base');
  console.log(JSON.stringify(p), '->', JSON.stringify(ts.map(x => x.s)), 'empty?', ts.some(x => x.s === ''));
}
// which ids decode to ''?
let bad = 0; const examples: number[] = [];
for (let id = 0; id < 200006; id++) {
  let s = '';
  try { s = decodeIds([id], 'o200k_base'); } catch { s = '\uFFFD'; }
  if (s === '') { bad++; if (examples.length < 10) examples.push(id); }
}
console.log('ids decoding to empty string:', bad, examples.join(','));
