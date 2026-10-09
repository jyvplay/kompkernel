import fs from 'node:fs';
import path from 'node:path';
import { countTokens, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { chironEncode, chironDecoderPrompt } from '../src/lib/omega/chiron';

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const lanes: Array<[string,string]> = [];
for (const f of fs.readdirSync('bench/holdout').sort()) lanes.push([f.replace(/\.txt$/,''), fs.readFileSync(path.join('bench/holdout',f),'utf8')]);

console.log('=== DAEDALUS contract anatomy ===');
console.log('lane'.padEnd(16),'in'.padStart(6),'wire'.padStart(6),'contract'.padStart(9),'msg'.padStart(6),'mode'.padStart(14));
for (const [n,t] of lanes) {
  const r = daedalusEncode(t, ENC, { budgetMs: 1200 });
  console.log(n.padEnd(16), String(r.inTokens).padStart(6), String(T(r.wire)).padStart(6), String(r.contractTokens).padStart(9), String(r.messageTokens).padStart(6), r.mode.padStart(14));
}
console.log('\n=== sample contract text (readme) ===');
const r2 = daedalusEncode(fs.readFileSync('bench/holdout/readme.txt','utf8'), ENC, { budgetMs: 1200 });
console.log(JSON.stringify(r2.decoderPrompt));
console.log('contract tokens =', r2.contractTokens);

console.log('\n=== token anatomy of natural prose (gh-prose) ===');
const prose = fs.readFileSync('bench/holdout/gh-prose.txt','utf8');
const toks = tokenStrings(prose, ENC);
console.log('chars', prose.length, 'tokens', toks.length, 'chars/token', (prose.length/toks.length).toFixed(2));
const words = prose.match(/[A-Za-z]+/g) ?? [];
console.log('words', words.length, 'tokens/word', (toks.length/words.length).toFixed(3));
// how many word-tokens are multi-token
const uniq = new Map<string,number>();
for (const w of words) uniq.set(w, (uniq.get(w)??0)+1);
let multi = 0, multiTok = 0, singleTok=0;
for (const [w,c] of uniq) { const k = T(' '+w); if (k>1) { multi+=c; multiTok += k*c; } else singleTok += c; }
console.log('word occurrences costing >1 token:', multi, 'their token cost:', multiTok, ' 1-token occurrences:', singleTok);
console.log('theoretical floor if every word were 1 token:', words.length);
// distribution of token lengths
const lens = new Map<number,number>();
for (const s of toks) lens.set(s.length, (lens.get(s.length)??0)+1);
console.log('token char-length histogram:', [...lens.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(' '));
