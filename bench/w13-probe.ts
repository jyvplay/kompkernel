/** bench/w13-probe.ts — broad mechanism probe: measure raw token delta of many
 *  candidate invertible transforms on real corpora. Pure measurement, no claims. */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

function lanes(): Array<[string,string]> {
  const out: Array<[string,string]> = [];
  for (const f of fs.readdirSync('bench/holdout').sort()) out.push(['ho/'+f.replace(/\.txt$/,''), fs.readFileSync(path.join('bench/holdout',f),'utf8')]);
  for (const f of fs.readdirSync('bench/train').sort()) out.push(['tr/'+f.replace(/\.txt$/,''), fs.readFileSync(path.join('bench/train',f),'utf8')]);
  return out;
}

// ---- P1: CRLF -> LF -------------------------------------------------------
function p1(t: string) { return t.includes('\r\n') ? t.split('\r\n').join('\n') : t; }
// ---- P2: trailing whitespace strip ---------------------------------------
function p2(t: string) { return t.replace(/[ \t]+\n/g, '\n'); }
// ---- P3: tabs<->spaces ----------------------------------------------------
function p3(t: string) { return t.replace(/^(  )+/gm, (m)=> '\t'.repeat(m.length/2)); }
// ---- P4: 4-space indent -> tab -------------------------------------------
function p4(t: string) { return t.replace(/^(    )+/gm, (m)=> '\t'.repeat(m.length/4)); }
// ---- P5: strip one leading space after newline ---------------------------
// ---- P6: markdown link shortening (measure only potential) ----------------

console.log('lane'.padEnd(18),'in'.padStart(7),'crlf→lf'.padStart(9),'trailWS'.padStart(9),'2sp→tab'.padStart(9),'4sp→tab'.padStart(9));
let s1=0,s2=0,s3=0,s4=0,si=0;
for (const [n,t] of lanes()) {
  const i = T(t); si+=i;
  const a = i-T(p1(t)), b = i-T(p2(t)), c = i-T(p3(t)), d = i-T(p4(t));
  s1+=a;s2+=b;s3+=c;s4+=d;
  console.log(n.padEnd(18), String(i).padStart(7), String(a).padStart(9), String(b).padStart(9), String(c).padStart(9), String(d).padStart(9));
}
console.log('TOTAL'.padEnd(18), String(si).padStart(7), String(s1).padStart(9), String(s2).padStart(9), String(s3).padStart(9), String(s4).padStart(9));

// ---------------------------------------------------------------------------
// P7: GLYPH-MERGE ARBITRAGE — do multi-char single-token glyph sequences exist?
// ---------------------------------------------------------------------------
console.log('\n=== P7: multi-glyph single-token arbitrage in o200k_base ===');
const pools: Record<string,string> = {
  cyr: 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩ',
  hangul: 'ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ',
  hira: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  kata: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
  greek: 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ',
  cjk: '的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样五第些现山爱进立点儿总什被明其力果把回什'
};
for (const [name, chars] of Object.entries(pools)) {
  const arr = [...chars];
  let single = 0; for (const c of arr) if (T(c)===1) single++;
  // pair merges: how many ordered pairs cost 1 token?
  let pairs = 0, tested = 0;
  const one = arr.filter(c=>T(c)===1);
  for (let i=0;i<Math.min(one.length,30);i++) for (let j=0;j<Math.min(one.length,30);j++){ tested++; if (T(one[i]+one[j])===1) pairs++; }
  console.log(`${name}: ${arr.length} chars, ${single} are 1-token; of ${tested} ordered pairs, ${pairs} cost 1 token`);
}
