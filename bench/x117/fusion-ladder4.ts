import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);const old=48;const crc='25b707b9';
// Semantically complete variants: keep `text after`, `(1-based)`, and `T+chmod`.
const cands=[
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=${crc}\n`,
`Body first. λ=#bytes after ->; ^Tnnnn␠→T+chmod; f11=f9+text after ※ (1-based). crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based), λ=#bytes after ->, ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod; crc=${crc}\n`,
`Body first: f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`After body: f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}\n`,
`Body first. f11=f9+text after ※ (1-based); λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc}`,
// 1-based stated once at end
`Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod (1-based). crc=${crc}\n`,
`Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=${crc} (1-based)\n`,
];
for(const c of cands)console.log(T(c),old-T(c),JSON.stringify(c));
