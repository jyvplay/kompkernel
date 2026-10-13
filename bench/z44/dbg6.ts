import { countTokens } from '@/lib/omega/bpe';
import { chironDecode } from '@/lib/omega/chiron';
for (const c of ['·','¦','¬','†','‡','|','~','^','_','=']) console.log(JSON.stringify(c), countTokens(c,'o200k_base'), countTokens(c,'cl100k_base'));
// does a marker char survive a CHIRON body round trip?
for (const c of ['·','«','»']) {
  const w = '§丁abc¶x' + c + 'y' + c + 'z';
  console.log(JSON.stringify(c), 'roundtrip:', JSON.stringify(chironDecode(w)));
}
console.log('ellipsis in body:', JSON.stringify(chironDecode('§丁abc¶x…yz')));
