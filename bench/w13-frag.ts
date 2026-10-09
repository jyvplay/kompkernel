import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const LOG = Array.from({length:40},(_,i)=>
  `2026-09-${String(10+(i%20)).padStart(2,'0')}T${String(8+(i%12)).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*13)%60).padStart(2,'0')}.${String((i*137)%1000).padStart(3,'0')}Z INFO  [scheduler-${i%4}] tenant=t-${1000+i} req=${['a1f','b2e','c3d','d4c'][i%4]}${(i*7919).toString(16).padStart(9,'0')} latency=${(12+i*3)}ms status=200`
).join('\n');

const K8S = Array.from({length:25},(_,i)=>
  `pod/api-server-${(i*7919).toString(16).slice(0,10)}-${'abcde'[i%5]}${(i*31).toString(36)}   1/1     Running   ${i%3}          ${i+2}d${i%24}h   10.244.${i%8}.${(i*11)%255}   node-${i%5}.cluster.internal`
).join('\n');

const GITLOG = Array.from({length:20},(_,i)=>
  `commit ${(i*987654321).toString(16).padStart(8,'0')}${(i*123456789).toString(16).padStart(8,'0')}${(i*555).toString(16).padStart(8,'0')}${(i*777).toString(16).padStart(8,'0')}${(i*999).toString(16).padStart(8,'0')}\nAuthor: Dev ${i} <dev${i}@example.com>\nDate:   Mon Sep ${10+(i%18)} 1${i%10}:0${i%10}:2${i%10} 2026 +0000\n\n    fix(core): handle retry budget for shard-${i}\n`
).join('\n');

const ACADEMIC = `In the 2019 cohort study (Smith et al., 2019, pp. 45-67), 1,284 of 3,912 participants (32.8%) reported symptom onset between 14:30 and 18:45 on 2019-03-14. The adjusted odds ratio was 1.47 (95% CI: 1.12-1.93, p=0.006). Follow-up at 6.5 months showed a 12.4% reduction (95% CI: 8.1-16.7). Costs fell from $1,245,600 to $982,300 per annum, a 21.1% decrease. See RFC 8446 §4.1.2 and ISO 8601:2019(E) clause 5.4.2.1. Measurements were 25.4 mm x 12.7 mm x 3.175 mm at 23.0 °C and 101.325 kPa. Sample IDs: SP-2019-00147, SP-2019-00148, SP-2019-00231.`;

const CSVDATA = 'id,date,time,amount,ref\n' + Array.from({length:30},(_,i)=>
  `${10000+i},2026-0${1+(i%9)}-${String(1+(i%28)).padStart(2,'0')},${String(i%24).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*3)%60).padStart(2,'0')},${(1000+i*37).toFixed(2)},REF-2026-${String(i).padStart(6,'0')}`
).join('\n');

const STACK = Array.from({length:18},(_,i)=>
  `    at Object.<anonymous> (/home/user/app/packages/core/src/runtime/scheduler.ts:${120+i*7}:${3+i%20})`
).join('\n') + '\n' + Array.from({length:8},(_,i)=>`0x00007f${(i*123457).toString(16).padStart(8,'0')} in handler_${i} () from /usr/lib/x86_64-linux-gnu/libc.so.6`).join('\n');

const fixtures: Array<[string,string]> = [
  ['iso-log-40', LOG], ['k8s-get-pods', K8S], ['git-log-20', GITLOG],
  ['academic-prose', ACADEMIC], ['csv-txn-30', CSVDATA], ['stacktrace', STACK],
];

// measure "fragmentation tax": tokens spent on spans that alternate char classes
function chunks(s: string) {
  // o200k pretokenizer approximation: letters | 1-3 digits | punct runs | whitespace
  return s.match(/[\p{L}\p{M}]+|\p{N}{1,3}|[^\s\p{L}\p{N}]+|\s+/gu) ?? [];
}
console.log('fixture'.padEnd(16),'chars'.padStart(6),'tok'.padStart(6),'c/t'.padStart(6));
for (const [n,t] of fixtures) {
  console.log(n.padEnd(16), String(t.length).padStart(6), String(T(t)).padStart(6), (t.length/T(t)).toFixed(2).padStart(6));
}

// ---- the defragmentation transforms ----
function defragISO(s: string) {
  return s.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z/g, (_,...g)=>`⟦${g.slice(0,7).join('')}⟧`);
}
function defragDate(s: string) { return s.replace(/(\d{4})-(\d{2})-(\d{2})(?!\d)/g, (_,a,b,c)=>`⟨${a}${b}${c}⟩`); }
function defragTime(s: string) { return s.replace(/(?<!\d)(\d{2}):(\d{2}):(\d{2})(?!\d)/g, (_,a,b,c)=>`⌈${a}${b}${c}⌉`); }
function defragIP(s: string) { return s.replace(/(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g, (_,a,b,c,d)=>`⌊${[a,b,c,d].map((x:string)=>x.padStart(3,'0')).join('')}⌋`); }
function defragNum(s: string) { return s.replace(/(?<![\d,])(\d{1,3}(?:,\d{3})+)(?!\d)/g, (m)=>`«${m.replace(/,/g,'')}»`); }
function hexLetters(s: string) { const D='ghijklmnop'; return s.replace(/(?<![0-9a-zA-Z])[0-9a-f]{16,}(?![0-9a-zA-Z])/g, (m)=>`⟪${m.replace(/[0-9]/g,d=>D[+d])}⟫`); }
const all = (s:string)=>hexLetters(defragNum(defragIP(defragTime(defragDate(defragISO(s))))));

console.log('\nfixture'.padEnd(17),'raw'.padStart(6),'iso'.padStart(6),'date'.padStart(6),'time'.padStart(6),'ip'.padStart(6),'num'.padStart(6),'hex'.padStart(6),'ALL'.padStart(6),'gain%'.padStart(7));
let R=0,A=0;
for (const [n,t] of fixtures) {
  const r=T(t); const a=T(all(t)); R+=r; A+=a;
  console.log(n.padEnd(16), String(r).padStart(6), String(T(defragISO(t))).padStart(6), String(T(defragDate(t))).padStart(6), String(T(defragTime(t))).padStart(6), String(T(defragIP(t))).padStart(6), String(T(defragNum(t))).padStart(6), String(T(hexLetters(t))).padStart(6), String(a).padStart(6), (((r-a)/r)*100).toFixed(1).padStart(7));
}
console.log('TOTAL'.padEnd(16), String(R).padStart(6), ''.padStart(6), ''.padStart(6), ''.padStart(6), ''.padStart(6), ''.padStart(6), ''.padStart(6), String(A).padStart(6), (((R-A)/R)*100).toFixed(1).padStart(7));
