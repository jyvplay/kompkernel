import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);
function rnd(alpha: string[], n: number, seed: number) { let s=seed, o=''; for(let i=0;i<n;i++){ s=(s*1103515245+12345)>>>0; o+=alpha[s%alpha.length]; } return o; }

console.log('=== density of common ASCII payload alphabets (o200k_base) ===');
const sets: Record<string,string[]> = {
  'hex-lower(16)': [...'0123456789abcdef'],
  'hex-upper(16)': [...'0123456789ABCDEF'],
  'digits(10)': [...'0123456789'],
  'base32rfc(32)': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'],
  'base64(64)': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'],
  'base58(58)': [...'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'],
  'alnum62': [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'],
  'lower26': [...'abcdefghijklmnopqrstuvwxyz'],
  'dna(4)': [...'ACGT'],
  'binary(2)': [...'01'],
};
for (const [n,a] of Object.entries(sets)) {
  const s = rnd(a, 4096, 7);
  const cpt = 4096/T(s);
  console.log(n.padEnd(16), 'chars/token='+cpt.toFixed(3).padStart(7), 'bits/token='+(cpt*Math.log2(a.length)).toFixed(2).padStart(7));
}

console.log('\n=== searching for max-density 16-symbol single-codepoint alphabets ===');
// candidate scripts, one code point each, must be pure-letter so a run is ONE pretoken chunk
const scripts: Record<string, number[]> = {
  cyr: [0x0430,0x044F], cyrU: [0x0410,0x042F], greek: [0x03B1,0x03C9], greekU:[0x0391,0x03A9],
  hira:[0x3041,0x3096], kata:[0x30A1,0x30FA], hangulJ:[0xAC00,0xAC00+300],
  arm:[0x0561,0x0586], geo:[0x10D0,0x10F0], heb:[0x05D0,0x05EA], arab:[0x0627,0x064A],
  deva:[0x0915,0x0939], thai:[0x0E01,0x0E2E], han:[0x4E00,0x4E00+400], kor:[0xAC00,0xAC00+400],
  latin:[0x61,0x7A], latinU:[0x41,0x5A],
};
type Best = { alpha: string[]; cpt: number };
function densityOf(a: string[]) { return 4096/T(rnd(a,4096,7)); }
for (const [name,[lo,hi]] of Object.entries(scripts)) {
  const pool: string[] = [];
  for (let c=lo;c<=hi;c++){ const ch=String.fromCodePoint(c); if (T(ch)===1) pool.push(ch); }
  if (pool.length<16) { console.log(name.padEnd(9),'pool too small', pool.length); continue; }
  // greedy: start from full pool density, then hill-climb a 16-subset by swapping
  let cur = pool.slice(0,16);
  let curD = densityOf(cur);
  for (let iter=0; iter<6; iter++) {
    let improved=false;
    for (let i=0;i<16;i++) {
      for (const c of pool) {
        if (cur.includes(c)) continue;
        const trial = cur.slice(); trial[i]=c;
        const d = densityOf(trial);
        if (d > curD + 1e-9) { cur = trial; curD = d; improved=true; }
      }
    }
    if (!improved) break;
  }
  console.log(name.padEnd(9), 'pool='+String(pool.length).padStart(4), 'best16 chars/token='+curD.toFixed(3), 'bits/tok='+(curD*4).toFixed(2), ' alpha=', cur.join(''));
}
