import { countTokens } from '../../src/lib/omega/bpe';
const enc:any='o200k_base';
const L=[
 '⁺ = the number at the same position in the line above, plus the change from the line two above.',
 '⁺ = the number at the same position above, plus its change from two lines above.',
 '⁺ = number at same position above, plus change from two lines above.',
 '⁺ = number at same position above + change from two lines above.',
 'spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.',
 'spec: v+k*r = v+(k*row#) printed like v; v@+ks = v+k sec; list* repeats; =v fixed; body=header then rows.',
 'spec: v+k*r=v+(k*row#) printed like v; v@+ks=v+k sec; list* repeats; =v fixed; body=header then rows.',
 'spec: v+k*r=v+(k*row#) like v; v@+ks=v+k sec; list* repeats; =v fixed; body=header then rows.',
];
for(const l of L) console.log(`${String(countTokens(l,enc)).padStart(3)}  ${JSON.stringify(l)}`);
