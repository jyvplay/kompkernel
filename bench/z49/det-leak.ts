// Z49: regression probe for the gpt-tokenizer decoder-state leak (see src/lib/omega/bpe.ts "DECODER STATE LEAK").
// Run: OMEGA_DET=1 bench/tmp/run.sh bench/z49/det-leak.ts  -> three identical M values and PASS.
import fs from 'node:fs';
import { encodeIds, tokenStrings, decodeIds, chunkCacheStats } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { induce, PARADEIGMA_MARK, clauseOf } from '@/lib/omega/paradeigma';
const t = '≡ objects having';
console.log('encode("≡ objects having") =', JSON.stringify(encodeIds(t, 'o200k_base')));
for (let i = 0; i < 2; i++) { const segs = tokenStrings(t, 'o200k_base').map(s => s.s); console.log(`tokenStrings #${i}`, JSON.stringify(segs), 'rejoins:', segs.join('') === t); }
// a vocabulary-style scan of single ids (what ariadne.vocabByScript does) must not poison the next decode
for (let id = 0; id < 5000; id++) { try { decodeIds([id], 'o200k_base'); } catch { /* ignore */ } }
console.log('after a 5000-id scan, decode(" objects") =', JSON.stringify(decodeIds(encodeIds(' objects', 'o200k_base'), 'o200k_base')));
const text = fs.readFileSync('bench/z49/corpus/gh-tags-20.json', 'utf8');
const ind = induce(text, 2)!;
const composed = PARADEIGMA_MARK + clauseOf(ind.blocks) + '\n' + ind.reduced;
const Ms: number[] = [];
for (let i = 0; i < 3; i++) {
  const s0 = chunkCacheStats();
  const r = daedalusEncode(composed, 'o200k_base');
  const s1 = chunkCacheStats();
  Ms.push(r.messageTokens);
  console.log(`daedalus run ${i}: M ${r.messageTokens} wire ${r.outTokens} winner ${/winner "([^"]+)"/.exec(r.notes)?.[1]} chunk-cache ${s0.size}->${s1.size}`);
}
console.log(Ms.every(m => m === Ms[0]) ? 'PASS: deterministic across calls' : 'FAIL: M depends on call order');
