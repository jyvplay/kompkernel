/**
 * X110 — IS THE INTER-COLUMN PADDING CONSTANT?
 * If yes, the padding is a function of the column WIDTHS (constant across the
 * file) and costs zero tokens per row once the widths are declared once.
 * Measure per lane: for the dominant `\s+`-arity run, how many distinct gap-width
 * vectors are there, and how many tokens the padding costs today.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                     rows  arity  gapVecs  distinctWidths  padTok  padTok/row  fieldsTok');
for(const p of lanes){
  const lines=fs.readFileSync(p,'utf8').split('\n');
  if(lines.length&&lines[lines.length-1]==='')lines.pop();
  // dominant arity under \s+ (runs of whitespace)
  const hist=new Map<number,string[]>();
  for(const l of lines){ const f=l.trim().split(/\s+/); if(f.length<3) continue; (hist.get(f.length)??hist.set(f.length,[]).get(f.length)!).push(l); }
  let bestN=0,bestRows:string[]=[];
  for(const [n,rs] of hist) if(rs.length>bestRows.length){bestN=n;bestRows=rs;}
  if(bestRows.length<6){ console.log(`${p.split('/').pop()!.padEnd(22)}   -`); continue; }
  const gapVecs=new Set<string>(); const padParts:string[]=[]; const fieldParts:string[]=[];
  const widths:number[][]=[];
  for(const l of bestRows){
    const re=/(\s+)/g; const parts=l.split(re).filter(s=>s!=='');
    const fields=parts.filter(s=>s.trim()!==''); const gaps=parts.filter(s=>s.trim()==='');
    const gv=gaps.map(g=>g.length); widths.push(gv);
    gapVecs.add(gv.join(','));
    padParts.push(gaps.join('')); fieldParts.push(fields.join(' '));
  }
  const padTok=countTokens(padParts.join('\n'),enc);
  const fieldsTok=countTokens(fieldParts.join('\n'),enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(bestRows.length).padStart(5)} ${String(bestN).padStart(6)} ${String(gapVecs.size).padStart(8)} ${String(new Set(widths.map(w=>w.join(','))).size).padStart(14)} ${String(padTok).padStart(7)} ${(padTok/bestRows.length).toFixed(2).padStart(10)} ${String(fieldsTok).padStart(10)}`);
}
