import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);
const keys=[
'Body first. ^Tnnnn␠→T+chmod.',
'λ=#bytes after ->.',
'Body first. ^Tnnnn␠→T+chmod; λ=#bytes after ->.',
'Body first. λ=#bytes after ->; ^Tnnnn␠→T+chmod.',
'Body first. ^Tnnnn␠→T+chmod, λ=#bytes after ->.',
'Decode body. ^Tnnnn␠→T+chmod; λ=#bytes after ->.',
'Body first. ^Tnnnn␠=T+chmod; λ=#bytes after ->.',
'Body first. ^Tnnnn␠→chmod; λ=#bytes after ->.',
'Body first. Tnnnn␠→T+chmod; λ=#bytes after ->.',
'After body: ^Tnnnn␠→T+chmod; λ=#bytes after ->.',
'Body first. ^Tnnnn␠→T+chmod. λ=#bytes after ->.',
'λ=#bytes after ->. Body first. ^Tnnnn␠→T+chmod.',
];
for(const k of keys)console.log(T(k),JSON.stringify(k));
console.log('separate',T(keys[0]!)+T(keys[1]!)+2);
