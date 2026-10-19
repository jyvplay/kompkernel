import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const CUR_HEAD = 'Letters before ¶ name the phrases after them. Then ';
const TAILS = ['expand repeatedly; print result only.','expand; print result only.',
  'expand repeatedly and 8 digits become YYYY-MM-DD; print result only.',
  'expand repeatedly and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, where ^ before digits marks them; drop it; print result only.'];
const NEW_TAIL = (t:string)=>t.replace(/result only\.$/,'only it.');
const heads = [
 CUR_HEAD,
 'Expand the glossary before ¶ into the text after § ',
 'Expand the letters before ¶ throughout the text after § ',
 'Expand each letter before ¶ into the phrase after it, throughout the text after § ',
 'Apply the definitions before ¶ to the text after § ',
 'Expand the glossary before ¶ into the text after §: ',
 'Expand the letters before ¶ throughout the text after §: ',
];
console.log('cost of [head + tail] for each real tail (current head = row 1)');
for (let i=0;i<TAILS.length;i++){
  console.log('-- tail', i, JSON.stringify(TAILS[i].slice(0,48)));
  for (const h of heads) {
    const a=T(h+TAILS[i]), b=T(h+NEW_TAIL(TAILS[i]));
    console.log('    ', String(a).padStart(3), '/', String(b).padStart(3), '  ', JSON.stringify(h.trim()));
  }
}
