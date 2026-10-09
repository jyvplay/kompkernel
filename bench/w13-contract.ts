import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { chironEncode, chironDecode, chironDecoderPrompt } from '../src/lib/omega/chiron';
import { ariadneEncode } from '../src/lib/omega/ariadne';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const cands = [
  'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.',
  'Before ¶ each new Cyrillic letter names the text after it; after ¶ expand all and print.',
  'Each new letter before ¶ names the text following it. After ¶, expand and print.',
  'Expand the ¶ macros and print the text.',
  'Expand macros, print text.',
  'Decode and print.',
  'expand+print',
];
for (const c of cands) console.log(String(T(c)).padStart(3), JSON.stringify(c));

console.log('\n=== wire-only vs contract on every lane ===');
const lanes: Array<[string,string]> = [];
for (const f of fs.readdirSync('bench/holdout').sort()) lanes.push(['ho/'+f.replace(/\.txt$/,''), fs.readFileSync(path.join('bench/holdout',f),'utf8')]);
for (const f of ['doc2.txt','doc3.txt','doc5.txt','lic-isc.txt','lic-bsd-2-clause.txt','lic-bsd-3-clause.txt','js0.txt','pkg1.txt']) lanes.push(['tr/'+f.replace(/\.txt$/,''), fs.readFileSync(path.join('bench/train',f),'utf8')]);
console.log('lane'.padEnd(20),'in'.padStart(6),'wire'.padStart(6),'gain'.padStart(6),'contract'.padStart(9),'msg'.padStart(6),'ops');
for (const [n,t] of lanes) {
  const r = ariadneEncode(t, ENC, { budgetMs: 1500 } as any);
  const w = T(r.wire);
  console.log(n.padEnd(20), String(r.inTokens).padStart(6), String(w).padStart(6), String(r.inTokens-w).padStart(6), String(r.messageTokens-w).padStart(9), String(r.messageTokens).padStart(6), (r as any).ops?.join(',') ?? '');
}
