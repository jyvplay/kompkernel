import { crasisHeader } from '../../src/lib/omega/crasis';
import { countTokens } from '../../src/lib/omega/bpe';
for (const rs of [['P'],['C'],['P','C'],['P','C','O'],['P','C','O','Q'],['O'],['Q']] as any[]) for (const f of [false,true]) { const h = crasisHeader(rs, f); console.log(countTokens(h+'\n','o200k_base'), countTokens(h+'\n','cl100k_base'), h); }
