import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';

const roots = ['bench/holdout', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-ops', 'bench/holdout-tab', 'bench/holdout-tbl', 'bench/holdout-work', 'bench/holdout-x40', 'bench/holdout-x41', 'bench/holdout-x42', 'bench/holdout-x42b'];
const files = roots.flatMap(root => fs.existsSync(root) ? fs.readdirSync(root).filter(f => fs.statSync(path.join(root, f)).isFile()).map(f => path.join(root, f)) : []);
const markers = ['⟪','⟫','§','¤','‡','°','µ','◆','⁞','␟','‖','¶','¦','※','~','^','@','!','%','+','='];
const rows = [] as any[];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let lower = '';
  const offsets: number[] = [];
  let pos = 0;
  for (const ch of text) {
    if (ch >= 'A' && ch <= 'Z') { offsets.push(pos); lower += ch.toLowerCase(); }
    else lower += ch;
    pos++;
  }
  const marker = markers.find(m => !text.includes(m) && countTokens(m, 'o200k_base') === 1);
  if (!marker || !offsets.length) continue;
  const deltas = offsets.map((x, i) => i ? String(x - offsets[i-1]) : String(x)).join(',');
  const wire = lower + marker + deltas;
  const contracts = [
    `After parent decode, final ${marker} starts 0-based uppercase-ASCII character-position deltas in the preceding lowercase text; comma-separated, first absolute.`,
    `The final ${marker} list gives comma-separated 0-based character offsets (first absolute, then positive deltas) to uppercase in the preceding lowercase text.`,
    `Lowercase ASCII; after ${marker}, cumulative comma-separated character-position deltas (first absolute) mark letters to uppercase.`,
  ];
  const bestContract = contracts.map(contract => ({ contract, M: countTokens(contract + '\n' + wire, 'o200k_base') })).sort((a,b) => a.M-b.M)[0];
  rows.push({ file, chars: text.length, raw: countTokens(text,'o200k_base'), lower: countTokens(lower,'o200k_base'), offsets: offsets.length, caseInfoTokens: countTokens(marker+deltas,'o200k_base'), directM: bestContract.M, delta: bestContract.M-countTokens(text,'o200k_base'), contract: bestContract.contract });
}
console.log(JSON.stringify({ count: rows.length, summary: { positive: rows.filter(r=>r.delta<0).length, totalRawDelta: rows.reduce((a,r)=>a+r.delta,0), byGroup: Object.fromEntries(roots.map(root=>[root,rows.filter(r=>r.file.startsWith(root+'/')).length])) }, rows }, null, 2));
