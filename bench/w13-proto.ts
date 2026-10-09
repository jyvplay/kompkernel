import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

// ---- prototype: sigil-based boundary collapse ----
type Fam = { sig: string; re: RegExp; fwd: (m: RegExpMatchArray)=>string; rev: RegExp; back: (m: RegExpMatchArray)=>string };
const F: Fam[] = [
  { sig:'§', re:/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})[.,](\d{3})Z?/g,
    fwd:(m)=>`§${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}${m[7]}`,
    rev:/§(\d{17})/g, back:(m)=>{const d=m[1];return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}:${d.slice(12,14)}.${d.slice(14,17)}Z`;} },
  { sig:'¶', re:/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z/g,
    fwd:(m)=>`¶${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}`,
    rev:/¶(\d{14})/g, back:(m)=>{const d=m[1];return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}:${d.slice(12,14)}Z`;} },
  { sig:'†', re:/(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/g, fwd:(m)=>`†${m[1]}${m[2]}${m[3]}`,
    rev:/†(\d{8})/g, back:(m)=>`${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}` },
  { sig:'‡', re:/(?<![\d:.])(\d{2}):(\d{2}):(\d{2})(?![\d:.])/g, fwd:(m)=>`‡${m[1]}${m[2]}${m[3]}`,
    rev:/‡(\d{6})/g, back:(m)=>`${m[1].slice(0,2)}:${m[1].slice(2,4)}:${m[1].slice(4,6)}` },
  { sig:'★', re:/(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g,
    fwd:(m)=>`★${m.slice(1,5).map(x=>x.padStart(3,'0')).join('')}`,
    rev:/★(\d{12})/g, back:(m)=>[0,3,6,9].map(i=>String(+m[1].slice(i,i+3))).join('.') },
  { sig:'♦', re:/(?<![0-9a-fA-F-])([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})(?![0-9a-fA-F-])/g,
    fwd:(m)=>`♦${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`,
    rev:/♦([0-9a-f]{32})/g, back:(m)=>`${m[1].slice(0,8)}-${m[1].slice(8,12)}-${m[1].slice(12,16)}-${m[1].slice(16,20)}-${m[1].slice(20,32)}` },
];
const HEXD='ghijklmnop';
function fwdAll(s: string) {
  let r = s;
  for (const f of F) r = r.replace(f.re, (...a)=>f.fwd(a as any as RegExpMatchArray));
  // hex digests
  r = r.replace(/(?<![0-9a-zA-Z])([0-9a-f]{20,})(?![0-9a-zA-Z])/g, (m)=> '►'+m.replace(/[0-9]/g,d=>HEXD[+d]));
  return r;
}
function revAll(s: string) {
  let r = s.replace(/►([a-p]{20,})/g, (_,b)=> b.replace(/[g-p]/g,(c:string)=>String(HEXD.indexOf(c))));
  for (let i=F.length-1;i>=0;i--) { const f=F[i]; r = r.replace(f.rev, (...a)=>f.back(a as any as RegExpMatchArray)); }
  return r;
}

const LOG = Array.from({length:40},(_,i)=>
  `2026-09-${String(10+(i%20)).padStart(2,'0')}T${String(8+(i%12)).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*13)%60).padStart(2,'0')}.${String((i*137)%1000).padStart(3,'0')}Z INFO  [scheduler-${i%4}] tenant=t-${1000+i} req=${(i*7919).toString(16).padStart(12,'0')} latency=${(12+i*3)}ms status=200`).join('\n');
const NGINX = Array.from({length:35},(_,i)=>
  `10.${i%12}.${(i*7)%255}.${(i*13)%255} - - [${String(1+(i%28)).padStart(2,'0')}/Sep/2026:${String(i%24).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*3)%60).padStart(2,'0')} +0000] "GET /api/v2/orders/${20000+i} HTTP/1.1" 200 ${1200+i*37} "-" "Mozilla/5.0"`).join('\n');
const JSONLOG = Array.from({length:30},(_,i)=>
  JSON.stringify({ts:`2026-09-${String(1+(i%28)).padStart(2,'0')}T${String(i%24).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*11)%60).padStart(2,'0')}.${String((i*137)%1000).padStart(3,'0')}Z`,level:'info',trace:`550e8400-e29b-41d4-a716-${String(446655440000+i)}`,svc:'orders',msg:'request completed',dur_ms:12+i})).join('\n');
const CSVDATA = 'id,date,time,amount,ref\n' + Array.from({length:30},(_,i)=>
  `${10000+i},2026-0${1+(i%9)}-${String(1+(i%28)).padStart(2,'0')},${String(i%24).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*3)%60).padStart(2,'0')},${(1000+i*37).toFixed(2)},REF-2026-${String(i).padStart(6,'0')}`).join('\n');
const LOCK = Array.from({length:20},(_,i)=>
  `    "resolved": "https://registry.npmjs.org/pkg-${i}/-/pkg-${i}-1.${i}.3.tgz",\n    "integrity": "${(i*987654321).toString(16).padStart(16,'0')}${(i*123456789).toString(16).padStart(16,'0')}${(i*7).toString(16).padStart(16,'0')}${(i*11).toString(16).padStart(16,'0')}",`).join('\n');

const fixtures: Array<[string,string]> = [
  ['iso-log-40', LOG], ['nginx-35', NGINX], ['jsonlog-30', JSONLOG], ['csv-txn-30', CSVDATA], ['lock-hex-20', LOCK],
];
for (const f of fs.readdirSync('bench/holdout').sort()) fixtures.push(['ho/'+f.replace(/\.txt$/,''), fs.readFileSync(path.join('bench/holdout',f),'utf8')]);

console.log('fixture'.padEnd(18),'raw'.padStart(6),'syn'.padStart(6),'syn%'.padStart(6),'DAED'.padStart(6),'D∘syn'.padStart(7),'delta'.padStart(6),'ok');
let R=0,D=0,DS=0;
for (const [n,t] of fixtures) {
  const s = fwdAll(t);
  const ok = revAll(s) === t;
  const raw = T(t), syn = T(s);
  const d = daedalusEncode(t, ENC, { budgetMs: 1200 });
  const ds = daedalusEncode(s, ENC, { budgetMs: 1200 });
  const dOk = d.decoded === t, dsOk = revAll(ds.decoded) === t;
  const dTok = dOk ? d.messageTokens : raw;
  const dsTok = dsOk ? ds.messageTokens : raw;
  R+=raw; D+=dTok; DS+=Math.min(dTok,dsTok);
  console.log(n.padEnd(18), String(raw).padStart(6), String(syn).padStart(6), (((raw-syn)/raw)*100).toFixed(1).padStart(6), String(dTok).padStart(6), String(dsTok).padStart(7), String(dTok-dsTok).padStart(6), ok?'✓':'✗');
}
console.log('TOTAL'.padEnd(18), String(R).padStart(6), ''.padStart(6), ''.padStart(6), String(D).padStart(6), String(DS).padStart(7), String(D-DS).padStart(6));
console.log(`DAEDALUS ${((R-D)/R*100).toFixed(2)}%  vs  DAEDALUS∘SYNIZESIS ${((R-DS)/R*100).toFixed(2)}%`);
