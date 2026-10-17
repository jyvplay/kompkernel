import { countTokens } from '@/lib/omega/bpe';
const N = (x: string) => countTokens(x, 'o200k_base');
console.log('## space runs  (in context: "a" + run + "b")');
for (let k = 1; k <= 12; k++) {
  const sp = ' '.repeat(k);
  console.log(`  k=${String(k).padStart(2)}  spaces ${N('a' + sp + 'b')}   »k ${N('a»' + k + 'b')}   ~k ${N('a~' + k + 'b')}   tab^k ${N('a' + '\t'.repeat(k) + 'b')}`);
}
console.log('\n## run-length encodings for k spaces (standalone, mid-line)');
for (const k of [2,3,4,6,8,12,16,24]) {
  const sp=' '.repeat(k);
  console.log(`  k=${String(k).padStart(2)}  raw ${N(sp)}   »${k} ${N('»'+k)}   ~${k} ${N('~'+k)}   ${'«'+k} ${N('«'+k)}   s${k} ${N('s'+k)}`);
}
console.log('\n## clause phrasings for numPad');
for (const c of [
  'Every number has exactly 6 decimals; add zeros on the right to reach 6.',
  'Numbers have 6 decimals; pad with zeros on the right.',
  'Right-pad every number with zeros to 6 decimals.',
  'Pad numbers to 6 decimals with zeros.',
  '6 decimals; zero-padded.',
  'Each number: 6 decimals, zero-padded.',
]) console.log('  ' + String(N(c)).padStart(3) + '  ' + c);
console.log('\n## timezone suffix');
for (const x of ['+00:00','Z','.000000000','.000Z']) console.log(`  ${N(x)}  ${JSON.stringify(x)}`);
console.log('\n## misc');
for (const x of ['&amp;','&','&lt;','&#39;','\\"','"','&quot;']) console.log(`  ${N(x)}  ${JSON.stringify(x)}`);
