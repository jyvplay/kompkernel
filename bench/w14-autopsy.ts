import fs from 'node:fs'; import path from 'node:path';
import { countTokens, encodeIds, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
const ENC: EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);

const files: Array<[string,string]> = [];
for (const d of ['bench/holdout','bench/holdout-ops','bench/holdout-tab'])
  if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) files.push([d.split('/')[1]+'/'+f, fs.readFileSync(path.join(d,f),'utf8')]);

console.log('=== A. GLYPH MARGINAL COST AUTOPSY (what does one dictionary reference really cost?) ===');
console.log('lane'.padEnd(26),'wireTok'.padStart(7),'glyphOcc'.padStart(8),'margTok'.padStart(8),'tok/glyph'.padStart(9),'waste'.padStart(6));
let totOcc=0, totMarg=0;
for (const [n,t] of files) {
  if (t.length > 60000) continue;
  let d; try { d = daedalusEncode(t, ENC, { budgetMs: 1500 }); } catch { continue; }
  if (d.decoded !== t || d.mode !== 'daedalus') continue;
  const w = d.wire;
  // body = after the last ¶ (CHIRON tape terminator)
  const bi = w.lastIndexOf('¶');
  const body = bi >= 0 ? w.slice(bi+1) : w;
  // glyph = any char with code point >= 0x370 that is not ascii/punct frame
  const glyphs = new Set<string>();
  for (const ch of body) { const c = ch.codePointAt(0)!; if (c >= 0x370 && c !== 0xb6 && c !== 0xa7) glyphs.add(ch); }
  if (glyphs.size === 0) continue;
  const base = T(body);
  // marginal cost: delete every occurrence of glyph g, measure delta, sum over g
  let occ=0, marg=0;
  for (const g of glyphs) {
    const k = body.split(g).length - 1;
    if (!k) continue;
    const without = body.split(g).join('');
    occ += k; marg += base - T(without);
  }
  totOcc+=occ; totMarg+=marg;
  console.log(n.padEnd(26), String(T(w)).padStart(7), String(occ).padStart(8), String(marg).padStart(8), (marg/occ).toFixed(3).padStart(9), String(marg-occ).padStart(6));
}
console.log(`TOTAL occ=${totOcc} marginal=${totMarg} -> ${(totMarg/totOcc).toFixed(3)} tok/glyph; recoverable if glyphs were free-at-boundary: ${totMarg-totOcc}`);

console.log('\n=== B. LINE-AFFIX UNIVERSALITY (marker-free positional binding) ===');
function lcp(a:string,b:string){let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;return a.slice(0,i);}
function lcsuf(a:string,b:string){let i=0;while(i<a.length&&i<b.length&&a[a.length-1-i]===b[b.length-1-i])i++;return i?a.slice(a.length-i):'';}
console.log('lane'.padEnd(26),'lines'.padStart(6),'allPfx'.padStart(7),'blkGain'.padStart(8),'blocks'.padStart(7),'rawTok'.padStart(7));
for (const [n,t] of files) {
  const lines = t.split('\n');
  if (lines.length < 4) continue;
  const all = lines.filter(l=>l.length>0).reduce((a,b)=>lcp(a,b));
  // maximal contiguous blocks with a common prefix of >=2 tokens
  let gain=0, blocks=0;
  let i=0;
  while (i < lines.length) {
    let p = lines[i]; let j=i+1;
    while (j<lines.length) { const q = lcp(p, lines[j]); if (T(q) < 2) break; p=q; j++; }
    const k=j-i;
    if (k>=3 && T(p)>=2) { gain += k*T(p) - T(p) - 2; blocks++; }   // k*prefix saved, pay prefix once + ~2 tok rule frame
    i = j>i? j : i+1;
  }
  console.log(n.padEnd(26), String(lines.length).padStart(6), (all.length?JSON.stringify(all.slice(0,14)):'-').padStart(7), String(gain).padStart(8), String(blocks).padStart(7), String(T(t)).padStart(7));
}
