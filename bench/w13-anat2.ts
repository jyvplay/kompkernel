import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const texts: Array<[string,string]> = [
  ['gh-prose', fs.readFileSync('bench/holdout/gh-prose.txt','utf8')],
  ['license', fs.readFileSync('bench/holdout/license.txt','utf8')],
  ['md-vite', fs.readFileSync('bench/holdout/md-vite.txt','utf8')],
  ['lic-mit', fs.readFileSync('bench/holdout/lic-mit.txt','utf8')],
];
for (const [n, text] of texts) {
  const ts = tokenStrings(text, ENC).map(x=>x.s);
  const cat: Record<string, number> = {};
  for (const s of ts) {
    let k: string;
    if (/^\s+$/.test(s)) k = 'whitespace';
    else if (/^ ?[A-Za-z]+$/.test(s)) k = 'word/frag';
    else if (/^ ?[0-9]+$/.test(s)) k = 'number';
    else if (/^[^\w\s]+$/.test(s)) k = 'punct';
    else k = 'mixed';
    cat[k] = (cat[k]??0)+1;
  }
  console.log(`\n### ${n}: ${ts.length} tokens, ${text.length} chars`);
  console.log(Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}(${(v/ts.length*100).toFixed(1)}%)`).join('  '));
  // top repeated token bigrams
  const bg = new Map<string,number>();
  for (let i=0;i+1<ts.length;i++){ const k = ts[i]+'\u0000'+ts[i+1]; bg.set(k,(bg.get(k)??0)+1); }
  const top = [...bg.entries()].filter(e=>e[1]>=3).sort((a,b)=>b[1]-a[1]).slice(0,12);
  console.log('top bigrams:', top.map(([k,v])=>`${JSON.stringify(k.replace('\u0000',''))}x${v}`).join(' '));
  // savings if all >=2-count bigrams became 1 token
  let bgSave=0; for (const [,v] of bg) if (v>=2) bgSave += 0; // placeholder
  // measure: single-token-word fraction
  const seen = new Set<string>();
  let dupTok=0;
  for (const s of ts) { if (seen.has(s)) dupTok++; else seen.add(s); }
  console.log(`distinct tokens=${seen.size} repeat-occurrences=${dupTok} (${(dupTok/ts.length*100).toFixed(1)}%)`);
  // zeroth-order entropy of token stream
  const freq = new Map<string,number>(); for (const s of ts) freq.set(s,(freq.get(s)??0)+1);
  let H=0; for (const [,c] of freq){ const p=c/ts.length; H -= p*Math.log2(p); }
  console.log(`H0(token stream)=${H.toFixed(2)} bits/token -> ideal ${(ts.length*H/8/1024).toFixed(2)} KiB; raw utf8 ${(Buffer.byteLength(text)/1024).toFixed(2)} KiB`);
}
