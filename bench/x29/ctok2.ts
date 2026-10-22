import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const full = [
 // current (flat, no shape clause)
 'Letters before ¶ name the phrases after them. Then After § expand and 8 digits become YYYY-MM-DD. Print only the result.',
 'Letters before ¶ name the phrases after them. Then After § expand. Print only the result.',
 // combined variants (flat, no shapes) - target to beat:
 'Letters before ¶ name the phrases after them; expand them after §. Print only the result.',
 'The letters before ¶ name phrases; expand them in the text after §. Print only it.',
 'Expand the letters defined before ¶ throughout the text after §. Print only it.',
 'Substitute the letter definitions before ¶ into the text after §. Print only it.',
 'Expand the ¶-glossary into the text after §. Print only the result.',
 'Expand the glossary before ¶ into the text after §. Print only it.',
 'Expand the letters before ¶ throughout the text after §. Print only it.',
 'Expand ¶-glossary letters throughout the text after §. Print only it.',
 'The part before ¶ defines letters; expand them after §. Print only the result.',
 'Letters before ¶ are defined by the phrases after them; expand them in the text after §. Print only it.',
 'Expand every letter defined before ¶ in the text after §. Print only it.',
 'Apply the definitions before ¶ to the text after §. Print only it.',
 'Apply the ¶-glossary to the text after §. Print only it.',
 'Use the ¶-glossary to expand the text after §. Print only it.',
 'Expand the text after § using the glossary before ¶. Print only it.',
 'Expand the text after § by the letter glossary before ¶. Print only it.',
 'Decode the text after § with the letter glossary before ¶. Print only it.',
 'Decode the text after § via the glossary before ¶. Print only it.',
];
console.log('FULL CONTRACTS (no shape clause):');
const scored = full.map(s=>[s,T(s)] as [string,number]).sort((a,b)=>a[1]-b[1]);
scored.forEach(([s,n])=>console.log('  ',String(n).padStart(3),JSON.stringify(s)));
console.log('\nWITH one shape clause (append " and 8 digits become YYYY-MM-DD" before the period):');
const base = scored[0][0].replace(/\. Print only it\.$/,'');
for (const mid of [' and 8 digits become YYYY-MM-DD', ', 8 digits become YYYY-MM-DD', '; 8 digits become YYYY-MM-DD']) {
  const s = base + mid + '. Print only it.';
  console.log('  ', String(T(s)).padStart(3), JSON.stringify(s));
}
const curFlat = 'Letters before ¶ name the phrases after them. Then After § expand. Print only the result.';
console.log('\ncurrent flat contract =', T(curFlat), '| best found =', scored[0][1], '| saving per lane =', T(curFlat)-scored[0][1]);
