import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);
const old='λ=#bytes after ->.\nBody first. ^Tnnnn␠→T+chmod.\nX90. Body first. f11 = f9 + text after ※ (1-based). crc=25b707b9\n';
const cands=[
'Body first. f11=f9+text after ※ (1-based); ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=25b707b9\n',
'Body first. f11=f9+text after ※; ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=25b707b9\n',
'Body first. f11=f9+※tail; ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=25b707b9\n',
'Body first. ※: f11=f9+tail. ^Tnnnn␠→T+chmod. λ=#bytes after ->. crc=25b707b9\n',
'Body first. f11=f9+text after ※ (1-based), then λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=25b707b9\n',
'Body first. f11=f9+text after ※; then λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=25b707b9\n',
'Decode body. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=25b707b9\n',
'Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→chmod. crc=25b707b9\n',
];
console.log('old',T(old),JSON.stringify(old));for(const c of cands)console.log(T(c),T(old)-T(c),JSON.stringify(c));
