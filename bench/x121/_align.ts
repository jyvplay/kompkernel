import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const lanes = fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const seen = new Set<string>();
let G=0, T=0;
for (const p of lanes) {
  if (seen.has(p)) continue; seen.add(p);
  if (!fs.existsSync(p)) continue;
  const txt = fs.readFileSync(p,'utf8');
  const lines = txt.split('\n');
  // candidate column W: rows "indent cell PAD(>=2) tail" where tail starts at W
  const cand = new Map<number, number[]>();
  for (let i=0;i<lines.length;i++){
    const m = /^(\s*)(\S.*?)(\s{2,})(\S.*)$/.exec(lines[i]!);
    if (!m) continue;
    const W = m[1]!.length + m[2]!.length + m[3]!.length;
    (cand.get(W) ?? cand.set(W,[]).get(W)!).push(i);
  }
  // maximal consecutive runs of >=3
  let rows: Array<{W:number; idx:number; cell:string; pad:string; tail:string}> = [];
  for (const [W, idxs] of cand) {
    let run: number[] = [idxs[0]!];
    const flush = () => { if (run.length>=3) for (const i of run) { const m=/^(\s*)(\S.*?)(\s{2,})(\S.*)$/.exec(lines[i]!)!; rows.push({W, idx:i, cell:m[1]!+m[2]!, pad:m[3]!, tail:m[4]!}); } };
    for (const i of idxs.slice(1)) { if (i===run[run.length-1]!+1) run.push(i); else { flush(); run=[i]; } }
    flush();
  }
  rows.sort((a,b)=>a.idx-b.idx);
  if (!rows.length) continue;
  const outLines = lines.slice();
  for (const r of rows) outLines[r.idx] = r.cell + ' ' + r.tail;
  const before = countTokens(txt,'o200k_base'), after = countTokens(outLines.join('\n'),'o200k_base');
  const padChars = rows.reduce((s,r)=>s+r.pad.length,0);
  G += before-after; T += before;
  console.log(`${p.split('/').slice(-1)[0].padEnd(24)} srcTok=${String(before).padStart(5)} rows=${String(rows.length).padStart(4)} padChars=${String(padChars).padStart(5)} grossSave=${String(before-after).padStart(4)}`);
}
console.log('TOTAL gross saving (raw source, before compression):', G, 'of', T);
