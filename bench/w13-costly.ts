import fs from 'node:fs';
import path from 'node:path';
import { countTokens, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const corpus: string[] = [];
for (const d of ['bench/holdout','bench/train']) for (const f of fs.readdirSync(d)) corpus.push(fs.readFileSync(path.join(d,f),'utf8'));
const all = corpus.join('\n');

// 1. Which *words* cost >1 token, grouped by shape
const words = all.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? [];
const freq = new Map<string,number>(); for (const w of words) freq.set(w,(freq.get(w)??0)+1);
type Row = { w: string; c: number; tSpace: number; tBare: number };
const rows: Row[] = [];
for (const [w,c] of freq) rows.push({ w, c, tSpace: T(' '+w), tBare: T(w) });
const costly = rows.filter(r=>r.tSpace>1).sort((a,b)=>(b.c*(b.tSpace-1))-(a.c*(a.tSpace-1)));
const totalWaste = costly.reduce((s,r)=>s+r.c*(r.tSpace-1),0);
console.log(`words=${words.length} distinct=${freq.size} costly(>1tok w/ space)=${costly.length}`);
console.log(`total excess tokens over 1/word: ${totalWaste}  (corpus tokens=${T(all)})`);
console.log('top waste:', costly.slice(0,25).map(r=>`${r.w}x${r.c}(${r.tSpace})`).join(' '));

// shape breakdown
const shape = (w:string) => /^[a-z]+$/.test(w)?'lower': /^[A-Z][a-z]+$/.test(w)?'Title': /^[A-Z]+$/.test(w)?'UPPER': /_/.test(w)?'snake': /^[a-z]+([A-Z][a-z0-9]*)+$/.test(w)?'camel': /^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(w)?'Pascal':'other';
const byShape = new Map<string,{n:number;waste:number}>();
for (const r of costly) { const s = shape(r.w); const e = byShape.get(s) ?? {n:0,waste:0}; e.n+=r.c; e.waste += r.c*(r.tSpace-1); byShape.set(s,e); }
console.log('waste by shape:', [...byShape.entries()].sort((a,b)=>b[1].waste-a[1].waste).map(([k,v])=>`${k}:${v.waste}`).join(' '));

// 2. case-transform arbitrage on identifiers
console.log('\n=== identifier case arbitrage (camel vs snake vs lower) ===');
let camelSave=0, n=0;
for (const r of rows) {
  if (!/^[a-z]+([A-Z][a-z0-9]*)+$/.test(r.w)) continue;
  const snake = r.w.replace(/([A-Z])/g,(m)=>'_'+m.toLowerCase());
  const lower = r.w.toLowerCase();
  const best = Math.min(T(' '+snake), T(' '+lower));
  if (best < r.tSpace) { camelSave += r.c*(r.tSpace-best); n++; }
}
console.log(`camelCase identifiers where snake/lower is cheaper: ${n} types, total token gain if rewritten: ${camelSave}`);

// 3. UPPERCASE arbitrage
let upSave=0, un=0;
for (const r of rows) { if (!/^[A-Z]{2,}$/.test(r.w)) continue; const lo=T(' '+r.w.toLowerCase()); if (lo<r.tSpace){ upSave += r.c*(r.tSpace-lo); un++; } }
console.log(`ALLCAPS words cheaper lowercased: ${un} types, gain ${upSave}`);

// 4. Title-case arbitrage
let tSave=0, tn=0;
for (const r of rows) { if (!/^[A-Z][a-z]{2,}$/.test(r.w)) continue; const lo=T(' '+r.w.toLowerCase()); if (lo<r.tSpace){ tSave += r.c*(r.tSpace-lo); tn++; } }
console.log(`Title-case words cheaper lowercased: ${tn} types, gain ${tSave}`);

// 5. hyphen / dot / slash compound arbitrage
console.log('\n=== punctuation-adjacency arbitrage ===');
const comps = all.match(/[A-Za-z0-9]+(?:[-._/][A-Za-z0-9]+)+/g) ?? [];
const cf = new Map<string,number>(); for (const c of comps) cf.set(c,(cf.get(c)??0)+1);
let compTok=0, compParts=0;
for (const [c,k] of cf) { compTok += k*T(' '+c); compParts += k; }
console.log(`compound tokens: ${compParts} occurrences costing ${compTok} tokens (avg ${(compTok/compParts).toFixed(2)})`);
