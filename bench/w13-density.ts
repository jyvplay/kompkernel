/** Measure achievable characters-per-token for long runs over candidate glyph alphabets. */
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

function mk(start: number, n: number) { return Array.from({length:n},(_,i)=>String.fromCodePoint(start+i)).join(''); }

const alphabets: Record<string,string> = {
  'cyr-lower-32': 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
  'cyr-both-64': 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
  'greek-48': 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ',
  'hangul-syll-256': mk(0xAC00, 256),
  'hangul-syll-1024': mk(0xAC00, 1024),
  'hira-80': mk(0x3041, 80),
  'kata-90': mk(0x30A1, 90),
  'cjk-256': mk(0x4E00, 256),
  'cjk-2048': mk(0x4E00, 2048),
  'armenian-38': mk(0x0561, 38),
  'georgian-38': mk(0x10D0, 38),
  'hebrew-27': mk(0x05D0, 27),
  'arabic-36': mk(0x0627, 36),
  'devanagari-48': mk(0x0915, 48),
  'thai-44': mk(0x0E01, 44),
  'latin-52': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
};

function rnd(alpha: string, n: number, seed: number) {
  const a = [...alpha]; let s = seed; let out='';
  for (let i=0;i<n;i++){ s = (s*1103515245+12345)>>>0; out += a[s % a.length]; }
  return out;
}

console.log('alphabet'.padEnd(20), 'k'.padStart(5), 'chars/token'.padStart(12), 'bits/token'.padStart(11), 'tok/1000sym'.padStart(12));
for (const [name, alpha] of Object.entries(alphabets)) {
  const a = [...alpha];
  const s = rnd(alpha, 3000, 12345);
  const tk = T(s);
  const cpt = 3000/tk;
  console.log(name.padEnd(20), String(a.length).padStart(5), cpt.toFixed(3).padStart(12), (cpt*Math.log2(a.length)).toFixed(2).padStart(11), (tk/3).toFixed(1).padStart(12));
}

// English baseline for reference: bits/token of plain English word stream
console.log('\nReference: plain English costs ~1 token/word; a word drawn from a 5000-word');
console.log('vocabulary at Zipf carries ~9-10 bits -> ~9-10 bits/token.');

// Now: optimized subsets. For each script, greedily pick k chars maximizing pair-merge density.
console.log('\n=== greedy merge-dense subset search ===');
function greedySubset(pool: string[], want: number) {
  const chosen: string[] = [];
  const cand = pool.filter(c => T(c) === 1);
  // score: number of merges with already-chosen
  while (chosen.length < want && cand.length) {
    let best = -1, bestScore = -1;
    for (let i=0;i<cand.length;i++) {
      let sc = 0;
      for (const c of chosen) { if (T(c+cand[i])===1) sc++; if (T(cand[i]+c)===1) sc++; }
      if (chosen.length===0) sc = 0;
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    chosen.push(cand[best]); cand.splice(best,1);
    if (chosen.length>=want) break;
  }
  return chosen.join('');
}
for (const [name, pool] of [['cyr', 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'], ['hira', mk(0x3041,86)], ['cjk512', mk(0x4E00,512)]] as Array<[string,string]>) {
  for (const k of [16, 32]) {
    const sub = greedySubset([...pool], k);
    if ([...sub].length < k) continue;
    const s = rnd(sub, 3000, 999);
    const cpt = 3000/T(s);
    console.log(`${name} k=${k}: chars/token=${cpt.toFixed(3)} bits/token=${(cpt*Math.log2(k)).toFixed(2)}`);
  }
}
