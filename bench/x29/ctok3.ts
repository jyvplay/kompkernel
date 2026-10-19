import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const HEADS: Record<string,string> = {
  cur_safe:   'Letters before ¶ name the phrases after them. Then After § ',
  new_a:      'Expand the glossary before ¶ into the text after §',
  new_b:      'Expand the letters before ¶ throughout the text after §',
  new_c:      'Expand the letters defined before ¶ throughout the text after §',
  new_d:      'Apply the definitions before ¶ to the text after §',
  new_e:      'Decode the text after § with the letter glossary before ¶',
};
const SHAPE = ' and 8 digits become YYYY-MM-DD';
const SHAPE2 = ' and 8 digits become YYYY-MM-DD, 6 digits become HH:MM:SS';
for (const [hn,h] of Object.entries(HEADS)) {
  const isCur = hn==='cur_safe';
  for (const [sn,sh] of [['none',''],['1shape',SHAPE],['2shape',SHAPE2]] as const) {
    for (const rep of (isCur?[0]:[0,1])) {
      let s: string;
      if (isCur) s = h + 'expand' + sh + '. Print only the result.';
      else       s = h + (rep?', repeatedly':'') + sh + '. Print only it.';
      console.log(String(T(s)).padStart(3), (hn+'/'+sn+'/rep'+rep).padEnd(24), JSON.stringify(s));
    }
  }
}
console.log('\n--- sanity: nested variants only, best head ---');
for (const h of [HEADS.new_a, HEADS.new_b, HEADS.new_c, HEADS.new_d, HEADS.new_e]) {
  console.log(String(T(h+', repeatedly. Print only it.')).padStart(3), JSON.stringify(h+', repeatedly. Print only it.'));
}
