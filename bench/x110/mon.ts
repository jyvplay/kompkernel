/**
 * X110 — HOW BIG IS THE month/clock PREDICTOR OPPORTUNITY?
 * APOGRAPHE §5: "dates are Gregorian YYYY-MM-DD only. Times, timestamps,
 * locales and month names are not in v1."  For each lane: how many lines carry
 * a `Mon DD HH:MM` stamp, how many distinct months/days/times, and what the
 * stamp fields cost in tokens today.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc:any='o200k_base';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const re=/^(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(.*)$/;
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                   lsLines  months  days  times   stampTok  tok/line  distinctTriples');
for(const p of lanes){
  const lines=fs.readFileSync(p,'utf8').split('\n');
  const stamps:string[]=[]; const months=new Set<string>(),days=new Set<string>(),times=new Set<string>();
  for(const l of lines){ const m=re.exec(l); if(!m) continue;
    stamps.push(m[5]!+' '+m[6]!+' '+m[7]!); months.add(m[5]!); days.add(m[6]!); times.add(m[7]!); }
  if(!stamps.length){ console.log(`${p.split('/').pop()!.padEnd(22)}      -`); continue; }
  const tok=countTokens(stamps.join('\n'),enc);
  const trip=new Set(stamps).size;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(stamps.length).padStart(8)} ${String(months.size).padStart(8)} ${String(days.size).padStart(6)} ${String(times.size).padStart(6)} ${String(tok).padStart(10)} ${(tok/stamps.length).toFixed(2).padStart(9)} ${String(trip).padStart(16)}`);
}
// also: pure HH:MM or MM:SS columns in non-ls lanes
console.log('\n--- any HH:MM[:SS] or MM:SS token anywhere (all lanes) ---');
const tre=/^(.*?)(\b\d{1,2}:\d{2}(?::\d{2})?\b)(.*)$/;
for(const p of lanes){
  const txt=fs.readFileSync(p,'utf8');
  const hits=txt.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g)??[];
  const months=(txt.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g)??[]).length;
  if(hits.length||months) console.log(`${p.split('/').pop()!.padEnd(22)} times ${String(hits.length).padStart(5)}  monthNames ${String(months).padStart(5)}`);
}
