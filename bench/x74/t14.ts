/** ceiling: replace the shared prefix of each cell with a keep-count marker */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  let lastCell = '';
  const out: string[] = [];
  let refs = 0, savedChars = 0;
  for (const l of lines) {
    const m = /^(.*?)(\t|  +)(\S+)$/.exec(l);
    if (!m) { out.push(l); continue; }
    const cell = m[3];
    let k = 0;
    while (k < cell.length && k < lastCell.length && cell[k] === lastCell[k]) k++;
    // only worth it when the marker is shorter than the prefix it replaces
    const marker = '^' + k;
    if (k >= 5 && marker.length < k) { out.push(m[1] + m[2] + marker + cell.slice(k)); refs++; savedChars += k - marker.length; }
    else out.push(l);
    lastCell = cell;
  }
  const wire = out.join('\n');
  const fr = tagstackEncode(t, enc);
  const fw = tagstackEncode(wire, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(5)} frontier ${String(fr.messageTokens).padStart(5)} | prefix-wire raw ${String(T(wire,enc)).padStart(5)} -> frontier ${String(fw.messageTokens).padStart(5)} refs ${refs} savedChars ${savedChars} | prior ${F.get(p)}`);
}
