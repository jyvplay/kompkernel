import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

// cryptographically random symbol stream -> no PRNG artifacts
function rnd(alpha: string[], n: number) {
  const buf = crypto.randomBytes(n*2); let o='';
  for (let i=0;i<n;i++) o += alpha[buf.readUInt16LE(i*2) % alpha.length];
  return o;
}
const sets: Record<string,string[]> = {
  'hex-lower(16)': [...'0123456789abcdef'],
  'hex-upper(16)': [...'0123456789ABCDEF'],
  'digits(10)': [...'0123456789'],
  'base32rfc(32)': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'],
  'base64(64)': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'],
  'alnum62': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'],
  'lower26': [...'abcdefghijklmnopqrstuvwxyz'],
  'upper26': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  'cyr-lower32': [...'абвгдежзийклмнопрстуфхцчшщъыьэюя'],
  'cyr-lower16': [...'абвгдежзийклмноп'],
  'greek24': [...'αβγδεζηθικλμνξοπρστυφχψω'],
  'hira46': [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'],
  'han-common256': Array.from({length:256},(_,i)=>String.fromCodePoint(0x4E00+i)),
  'dna(4)': [...'ACGT'],
};
console.log('alphabet'.padEnd(18),'chars/token'.padStart(12),'bits/token'.padStart(11));
for (const [n,a] of Object.entries(sets)) {
  let tot=0, N=0;
  for (let r=0;r<3;r++){ const s=rnd(a,4096); tot+=T(s); N+=4096; }
  const cpt=N/tot;
  console.log(n.padEnd(18), cpt.toFixed(3).padStart(12), (cpt*Math.log2(a.length)).toFixed(2).padStart(11));
}

console.log('\n=== REAL hex digests from the corpus ===');
const corpus = ['bench/holdout','bench/train'].flatMap(d=>fs.readdirSync(d).map(f=>fs.readFileSync(path.join(d,f),'utf8'))).join('\n');
const hexes = (corpus.match(/\b[0-9a-f]{32,}\b/g) ?? []);
console.log('count of >=32-char lowercase hex runs:', hexes.length);
if (hexes.length) {
  let chars=0, toks=0;
  for (const h of hexes) { chars+=h.length; toks+=T(h); }
  console.log(`total ${chars} chars costing ${toks} tokens -> ${(chars/toks).toFixed(3)} chars/token, ${(chars/toks*4).toFixed(2)} bits/token`);
  const sample = hexes[0];
  console.log('sample:', sample, '=>', T(sample), 'tokens');
  // transliterate hex digits 0-9a-f to cyrillic letters and measure
  const tests: Array<[string,string]> = [
    ['cyr16', 'абвгдежзийклмноп'],
    ['cyr16b','еаонитсрвлкмдпуя'],
    ['greek16','αβγδεζηθικλμνξοπ'],
    ['hira16','あいうえおかきくけこさしすせそた'],
    ['latin16','abcdefghijklmnop'],
    ['han16', 'the一二三四五六七八九十百千万上下'.slice(3)],
  ];
  for (const [nm, alpha] of tests) {
    const A=[...alpha]; if (A.length<16) continue;
    let tk=0; for (const h of hexes) { let o=''; for (const c of h) o += A[parseInt(c,16)]; tk += T(o); }
    console.log(`${nm}: ${tk} tokens (${(chars/tk).toFixed(3)} chars/token) vs raw ${toks}  -> saving ${toks-tk} (${((toks-tk)/toks*100).toFixed(1)}%)`);
  }
}

console.log('\n=== real base64 / npm integrity strings ===');
const b64 = (corpus.match(/\b[A-Za-z0-9+/]{40,}={0,2}/g) ?? []);
console.log('count:', b64.length);
if (b64.length) { let c=0,t=0; for (const s of b64){c+=s.length;t+=T(s);} console.log(`${c} chars, ${t} tokens, ${(c/t).toFixed(3)} chars/token, ${(c/t*6).toFixed(2)} bits/token`); }
