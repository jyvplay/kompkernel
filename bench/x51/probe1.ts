// X51 probe phase 1: mechanism portfolio scan over the real corpus (o200k only; no codec run).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

const dirs = ['bench/holdout','bench/holdout-lang','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab','bench/holdout-tbl','bench/holdout-work','bench/holdout-x40','bench/holdout-x41','bench/holdout-x42','bench/holdout-x42b','bench/z57/lanes','bench/train'];
const files: string[] = [];
for (const d of dirs) { if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d)) { const p = path.join(d,f); if (fs.statSync(p).isFile()) files.push(p); } }
const texts = new Map<string,string>();
for (const f of files) { try { texts.set(f, fs.readFileSync(f,'utf8')); } catch {} }
console.log(`corpus files=${texts.size}`);

// ---------- micro token economics ----------
const micro: [string,string][] = [
 ['192.168.0.1','c0a80001'], ['192.168.0.1','3232235521'], ['10.0.0.255','0a0000ff'], ['172.16.254.3','ac10fe03'],
 ['aa:bb:cc:dd:ee:ff','aabbccddeeff'], ['1.2.3','1002003'], ['10.20.30','10020030'], ['2.11.4','2011004'], ['0.9.17','9017'],
 ['26th','26'], ['October 26th','October 26'], ['3rd','3'], ['$1,234.56','123456'], ['$12.50','1250'],
 ['#ff0000','red'], ['#ffffff','white'], ['#000000','black'], ['#008000','green'], ['#0000ff','blue'], ['#808080','gray'],
 ['Mon, 26 Oct 2026','26 Oct 2026'], ['Mon Oct 26 13:53:08 2026','Oct 26 13:53:08 2026'],
 ['compression','cmprssn'], [' internationalization',' intrntnlztn'], [' the',''], [' of',''], ['1,234,567','1234567'],
 ['00:02:05','125'], ['90 minutes','1h30m'], ['1.23e+05','123000'], ['50%','0.5'], ['three','3'], ['colour','color'],
 ['do not',"don't"], ['file1 file2 file3 file4 file5','file1-5'], ['+00:00','Z'], ['05:56:50','055650'],
];
console.log('\n== MICRO (orig -> alt tokens) ==');
for (const [a,b] of micro) console.log(`${JSON.stringify(a)} ${T(a)} -> ${JSON.stringify(b)} ${T(b)}  d=${T(b)-T(a)}`);

// ---------- decimal FD machinery ----------
interface Dec { neg: boolean; mag: bigint; scale: number; raw: string }
function parseDec(s: string): Dec | null {
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s.trim()); if (!m) return null;
  const frac = m[3] ?? '';
  return { neg: m[1]==='-', mag: BigInt(m[2]+frac), scale: frac.length, raw: s };
}
function renderScaled(valScaled: bigint, neg: boolean, scale: number): string {
  let digits = valScaled.toString();
  if (scale>0) { digits = digits.padStart(scale+1,'0'); digits = digits.slice(0,-scale)+'.'+digits.slice(-scale); }
  return (neg && valScaled!==0n ? '-' : '') + digits;
}
// rational num/den (den>0) rendered at scale with mode; returns string
function renderRat(num: bigint, den: bigint, scale: number, mode: string): string {
  const neg = num < 0n; const a = neg ? -num : num;
  const scaledNum = a * (10n ** BigInt(scale));
  let q = scaledNum / den; const r = scaledNum % den;
  if (mode==='half-up' && r*2n >= den) q += 1n;
  else if (mode==='half-away' && r*2n >= den) q += 1n;
  else if (mode==='ceil' && r>0n && !neg) q += 1n;
  else if (mode==='floor' && r>0n && neg) q += 1n;
  // trunc = default
  return renderScaled(q, neg, scale);
}
function decToRat(d: Dec): [bigint,bigint] { return [ (d.neg?-d.mag:d.mag), 10n**BigInt(d.scale) ]; }

interface TableTry { delim: string; rows: string[][]; header: string[] | null }
function tryTables(text: string): TableTry[] {
  const out: TableTry[] = [];
  const linesRaw = text.split(/\r?\n/).filter(l=>l.length>0);
  if (linesRaw.length < 6) return out;
  for (const delim of [',','\t','|',';']) {
    const rows = linesRaw.map(l=>l.split(delim));
    const cols = rows[0]!.length;
    if (cols<2 || cols>24 || rows.some(r=>r.length!==cols) || rows.some(r=>r.some(c=>c.includes('"')))) continue;
    out.push({ delim, rows: rows.slice(1), header: rows[0]! });
  }
  // whitespace columns (>=2 spaces split), only if perfectly rectangular
  const wrows = linesRaw.map(l=>l.trim().split(/\s+/));
  const wcols = wrows[0]!.length;
  if (wcols>=3 && wcols<=16 && wrows.every(r=>r.length===wcols)) out.push({ delim:'(ws)', rows: wrows.slice(1), header: wrows[0]! });
  return out;
}

console.log('\n== ARITHMETIC FD SCAN (same-row exact for ALL rows) ==');
const fdHits: any[] = [];
for (const [file, text] of texts) {
  for (const tb of tryTables(text)) {
    const R = tb.rows; if (R.length<6) continue;
    const C = R[0]!.length;
    const dec: (Dec|null)[][] = R.map(r=>r.map(parseDec));
    const numeric = Array.from({length:C},(_,c)=>dec.every(r=>r[c]!==null));
    const colTok = Array.from({length:C},(_,c)=>R.reduce((a,r)=>a+T(r[c]!)+T(tb.delim==='\t'?'\t':tb.delim==='(ws)'?' ':tb.delim),0));
    const test = (c:number,label:string,f:(i:number)=>string|null) => {
      for (let i=0;i<R.length;i++){ const v=f(i); if (v===null || v!==R[i]![c]) return; }
      fdHits.push({file:file.split('/').pop(), delim:tb.delim==='\t'?'TAB':tb.delim, rows:R.length, target:tb.header?.[c]??('col'+c), rel:label, colTokens:colTok[c]});
    };
    for (let c=0;c<C;c++){ if(!numeric[c]) continue;
      for (let a=0;a<C;a++){ if(a===c||!numeric[a]) continue;
        // duplicates (sanity; APOGRAPHE colM already owns)
        // C = k - A with k from row0 (rendered at C scale)
        { const [an,ad]=decToRat(dec[0]![a]!); const [cn,cd]=decToRat(dec[0]![c]!); const kn = cn*ad+an*cd, kd = cd*ad;
          test(c, `C = K - ${tb.header?.[a]}`, i=>{ const [xn,xd]=decToRat(dec[i]![a]!); return renderRat(kn*xd-xn*kd, kd*xd, dec[i]![c]!.scale, 'half-up'); }); }
        // C = A * k rational from first nonzero row
        { let ki=-1; for(let i=0;i<R.length;i++) if(dec[i]![a]!.mag!==0n){ki=i;break;}
          if (ki>=0){ const [an,ad]=decToRat(dec[ki]![a]!); const [cn,cd]=decToRat(dec[ki]![c]!); const kn=cn*ad, kd=cd*an; if(kd!==0n){ const kN=kd<0n?-kn:kn, kD=kd<0n?-kd:kd;
            test(c, `C = ${tb.header?.[a]} * ${kN}/${kD}`, i=>{ const [xn,xd]=decToRat(dec[i]![a]!); return renderRat(xn*kN, xd*kD, dec[i]![c]!.scale, 'half-up'); }); } } }
        for (let b=0;b<C;b++){ if(b===c||b===a||!numeric[b]) continue;
          const hn = tb.header;
          test(c, `${hn?.[a]}+${hn?.[b]}`, i=>{ const [an,ad]=decToRat(dec[i]![a]!); const [bn,bd]=decToRat(dec[i]![b]!); return renderRat(an*bd+bn*ad, ad*bd, dec[i]![c]!.scale,'half-up'); });
          test(c, `${hn?.[a]}-${hn?.[b]}`, i=>{ const [an,ad]=decToRat(dec[i]![a]!); const [bn,bd]=decToRat(dec[i]![b]!); return renderRat(an*bd-bn*ad, ad*bd, dec[i]![c]!.scale,'half-up'); });
          test(c, `${hn?.[a]}*${hn?.[b]}`, i=>{ const [an,ad]=decToRat(dec[i]![a]!); const [bn,bd]=decToRat(dec[i]![b]!); return renderRat(an*bn, ad*bd, dec[i]![c]!.scale,'half-up'); });
          for (const mode of ['half-up','trunc','ceil']) for (const pct of [false,true]) {
            test(c, `${pct?'100*':''}${hn?.[a]}/${hn?.[b]} [${mode}]`, i=>{ const [an,ad]=decToRat(dec[i]![a]!); const [bn,bd]=decToRat(dec[i]![b]!); if(bn===0n) return null; let nn=an*bd, dd=ad*bn; if(pct) nn*=100n; if(dd<0n){nn=-nn;dd=-dd;} return renderRat(nn, dd, dec[i]![c]!.scale, mode); });
          }
          for (let d2=0;d2<C;d2++){ if(d2===c||d2===a||d2===b||!numeric[d2]) continue;
            test(c, `${hn?.[a]}+${hn?.[b]}+${hn?.[d2]}`, i=>{ let n=0n,dn=1n; for(const x of [a,b,d2]){ const [xn,xd]=decToRat(dec[i]![x]!); n=n*xd+xn*dn; dn=dn*xd; } return renderRat(n,dn,dec[i]![c]!.scale,'half-up'); });
          }
        }
      }
      // cumulative: C_i = C_{i-1} + A_i
      for (let a=0;a<C;a++){ if(a===c||!numeric[a]) continue;
        test(c, `cumsum(${tb.header?.[a]})`, i=>{ if(i===0) return R[0]![a]===R[0]![c]?R[i]![c]!:renderRat(...(()=>{const [an,ad]=decToRat(dec[0]![a]!); return [an,ad] as [bigint,bigint];})(), dec[i]![c]!.scale,'half-up');
          let n=0n,dn=1n; for(let j=0;j<=i;j++){ const [xn,xd]=decToRat(dec[j]![a]!); n=n*xd+xn*dn; dn=dn*xd; } return renderRat(n,dn,dec[i]![c]!.scale,'half-up'); });
      }
    }
    // string FD: C = A + sep + B ; C = A + const ; upper/lower
    for (let c=0;c<C;c++){
      for (let a=0;a<C;a++){ if(a===c) continue;
        test(c, `upper(${tb.header?.[a]})`, i=>R[i]![a]!.toUpperCase());
        test(c, `lower(${tb.header?.[a]})`, i=>R[i]![a]!.toLowerCase());
        { const v0=R[0]![a]!, t0=R[0]![c]!; if (t0.startsWith(v0)) { const suf=t0.slice(v0.length); test(c, `${tb.header?.[a]}+${JSON.stringify(suf)}`, i=>R[i]![a]!+suf); }
          if (t0.endsWith(v0)) { const pre=t0.slice(0,t0.length-v0.length); test(c, `${JSON.stringify(pre)}+${tb.header?.[a]}`, i=>pre+R[i]![a]!); } }
        for (let b=0;b<C;b++){ if(b===c||b===a) continue;
          const a0=R[0]![a]!, b0=R[0]![b]!, t0=R[0]![c]!;
          if (t0.startsWith(a0)&&t0.endsWith(b0)&&t0.length>=a0.length+b0.length){ const sep=t0.slice(a0.length, t0.length-b0.length); if (sep.length<=8) test(c, `${tb.header?.[a]}+${JSON.stringify(sep)}+${tb.header?.[b]}`, i=>R[i]![a]!+sep+R[i]![b]!); }
        }
      }
    }
    // aggregate: last row = column sums?
    if (R.length>=6){ const last=R.length-1;
      for (let c=0;c<C;c++){ if(!dec.slice(0,last).every(r=>r[c]!==null)||!dec[last]![c]) continue;
        let n=0n,dn=1n; for(let i=0;i<last;i++){ const [xn,xd]=decToRat(dec[i]![c]!); n=n*xd+xn*dn; dn=dn*xd; }
        if (renderRat(n,dn,dec[last]![c]!.scale,'half-up')===R[last]![c]) fdHits.push({file:file.split('/').pop(), delim:tb.delim, rows:R.length, target:tb.header?.[c], rel:'LAST ROW = column SUM', colTokens:T(R[last]![c]!)});
      }
    }
  }
}
for (const h of fdHits) console.log(JSON.stringify(h));
console.log(`FD hits total=${fdHits.length}`);

// ---------- shape density ----------
console.log('\n== SHAPE DENSITY (occurrences, files with >=5) ==');
const shapes: [string, RegExp][] = [
 ['semver3', /\b\d+\.\d+\.\d+\b/g], ['ver4', /\b\d+\.\d+\.\d+\.\d+\b/g], ['ipv4', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
 ['mac', /\b(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}\b/g], ['ordinal', /\b\d+(?:st|nd|rd|th)\b/g],
 ['weekdayRFC', /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/g],
 ['ctime', /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} \d{2}:\d{2}:\d{2} \d{4}/g],
 ['money$', /\$\d[\d,]*(?:\.\d{2})?/g], ['epoch10', /\b1[5-9]\d{8}\b/g], ['epoch13', /\b1[5-9]\d{11}\b/g],
 ['hexcolor', /#[0-9a-fA-F]{6}\b/g], ['sha40', /\b[0-9a-f]{40}\b/g], ['isbn', /\b97[89][-\d]{10,}\b/g],
 ['percent', /\d+(?:\.\d+)?%/g], ['sciNot', /\b\d+(?:\.\d+)?[eE][+-]?\d+\b/g], ['fraction', /\b\d+\/\d+\b/g],
];
for (const [name, re] of shapes){ const rows: any[]=[];
  for (const [f,t] of texts){ const n=[...t.matchAll(re)].length; if(n>=5) rows.push({f:f.split('/').pop(),n}); }
  rows.sort((x,y)=>y.n-x.n); if(rows.length) console.log(name, JSON.stringify(rows.slice(0,10)));
}

// ---------- duplicate lines ----------
console.log('\n== DUPLICATE LINES (consecutive-run excess tokens raw, top) ==');
const dupRows: any[]=[];
for (const [f,t] of texts){ const lines=t.split('\n'); let consecExcessTok=0, consecLines=0;
  for(let i=1;i<lines.length;i++) if(lines[i]!.length>0&&lines[i]===lines[i-1]){ consecExcessTok+=T(lines[i]!+'\n'); consecLines++; }
  const cnt=new Map<string,number>(); for(const l of lines) if(l.length>0) cnt.set(l,(cnt.get(l)??0)+1);
  let anyExcess=0; for(const [l,n] of cnt) if(n>1) anyExcess+=(n-1)*T(l+'\n');
  if (consecExcessTok>=20||anyExcess>=100) dupRows.push({f:f.split('/').pop(), consecExcessTok, consecLines, anyDupExcessTok:anyExcess, rawTok:T(t)});
}
dupRows.sort((a,b)=>b.anyDupExcessTok-a.anyDupExcessTok); for (const r of dupRows.slice(0,15)) console.log(JSON.stringify(r));

// ---------- markdown ordered lists / heading numbers / biblio brackets ----------
console.log('\n== LIST NUMBERING ==');
for (const [f,t] of texts){ const markers=[...t.matchAll(/^(\s*)(\d+)([.)]) /gm)]; const heads=[...t.matchAll(/^#{1,6} (\d+(?:\.\d+)*)[.)]? /gm)]; const bib=[...t.matchAll(/^\[(\d+)\]/gm)];
  if (markers.length>=5||heads.length>=5||bib.length>=5) console.log(JSON.stringify({f:f.split('/').pop(), listMarkers:markers.length, markerTok:markers.reduce((a,m)=>a+T(m[2]+m[3]!),0), headingNums:heads.length, biblioNums:bib.length}));
}

// ---------- prose deletion ceilings ----------
console.log('\n== PROSE DELETION RAW DELTAS (negative = saves raw tokens; exactness NOT claimed) ==');
const proseFiles=[...texts.keys()].filter(f=>/kb-article|readme|changelog|email-thread|meeting-transcript|llm-answer|bibliography|de-kb|license/i.test(f)).slice(0,14);
const disemvowel=(s:string)=>s.replace(/([A-Za-z])[aeiou]/g,'$1').replace(/\b([bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ])[aeiou]/g,'$1');
const dropFuncs=(s:string)=>s.replace(/ (the|a|an|of|to|in|is|and|for|on|with|as|by|at|it)\b/gi,'');
const dropSpaces=(s:string)=>s.replace(/ /g,'');
const dropCommas=(s:string)=>s.replace(/,/g,'');
for (const f of proseFiles){ const t=texts.get(f)!; console.log(JSON.stringify({f:f.split('/').pop(), raw:T(t), disemvowel:T(disemvowel(t))-T(t), dropFunc:T(dropFuncs(t))-T(t), dropSpaces:T(dropSpaces(t))-T(t), dropCommas:T(dropCommas(t))-T(t)})); }

// ---------- GCD lattice ----------
console.log('\n== GCD LATTICE (numeric cols whose scaled ints share gcd>1) ==');
const bgcd=(a:bigint,b:bigint):bigint=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const r=a%b;a=b;b=r;}return a;};
for (const [file,text] of texts){ for (const tb of tryTables(text)){ const R=tb.rows; if(R.length<10) continue; const C=R[0]!.length;
  for(let c=0;c<C;c++){ const ds=R.map(r=>parseDec(r[c]!)); if(ds.some(d=>!d)) continue; const sc=Math.max(...ds.map(d=>d!.scale)); if(ds.some(d=>d!.scale!==sc)) continue;
    let g=0n; for(const d of ds) g=bgcd(g,d!.mag); if(g>1n){ const before=R.reduce((a,r)=>a+T(r[c]!),0); const after=ds.reduce((a,d)=>a+T(renderScaled(d!.mag/g,d!.neg,0)),0);
      if(before-after>=15) console.log(JSON.stringify({f:file.split('/').pop(), col:tb.header?.[c], gcd:g.toString(), scale:sc, rows:R.length, before, after, delta:after-before})); } }
} }

// ---------- diff hunk headers ----------
console.log('\n== DIFF HUNKS ==');
for (const [f,t] of texts){ if(!t.includes('@@ -')) continue; const hunks=[...t.matchAll(/@@ -\d+,\d+ \+\d+,\d+ @@/g)];
  if(hunks.length) console.log(JSON.stringify({f:f.split('/').pop(), hunks:hunks.length, headerTok:hunks.reduce((a,h)=>a+T(h[0]),0), countsTok:hunks.reduce((a,h)=>a+T(h[0])-T(h[0].replace(/,\d+/g,'')),0), rawTok:T(t)}));
}

// ---------- numeric range sequences in listing words ----------
console.log('\n== EMBEDDED NUMBER SEQUENCES (same prefix+suffix, contiguous range len>=8) ==');
for (const [f,t] of texts){ const groups=new Map<string,Set<number>>();
  for (const m of t.matchAll(/[^\s,;|]*/g)) { const w=m[0]; const mm=/^(.*?)(\d+)(\D*)$/.exec(w); if(!mm||mm[2]!.length>9) continue; const k=mm[1]+'\u0000'+mm[3]; if(!groups.has(k)) groups.set(k,new Set()); groups.get(k)!.add(Number(mm[2])); }
  const hits:any[]=[]; for(const [k,s] of groups){ if(s.size>=8){ const arr=[...s].sort((a,b)=>a-b); const contig = arr[arr.length-1]!-arr[0]!+1===arr.length; hits.push({pat:k.replace('\u0000','#'), n:s.size, contig}); } }
  if(hits.length) console.log(JSON.stringify({f:f.split('/').pop(), hits:hits.slice(0,6)}));
}

// ---------- sortedness ----------
console.log('\n== LINE SORTEDNESS (files whose nonempty lines are fully sorted) ==');
for (const [f,t] of texts){ const L=t.split('\n').filter(x=>x.length>0); if(L.length<10) continue;
  const asc=L.every((x,i)=>i===0||L[i-1]!<=x), desc=L.every((x,i)=>i===0||L[i-1]!>=x);
  if(asc||desc) console.log(JSON.stringify({f:f.split('/').pop(), lines:L.length, dir:asc?'asc':'desc', rawTok:T(t)}));
}
console.log('\nDONE');
