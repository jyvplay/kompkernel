import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);const old=48;const crc='25b707b9';
const cands=[
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (f1=first); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (fields 1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. 1-based: f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}. 1-based\n`,
`Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. 1-based. crc=${crc}\n`,
`Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc} (1-based)\n`,
`Body first. f11=f9+text after ※ (1-based); λ=bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+sym. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}`,
];
for(const c of cands)console.log(T(c),old-T(c),JSON.stringify(c));
