/** X80 — broad screen of representation transforms, measured THROUGH the frontier.
 *  Each transform is deterministic, invertible and stated in a one-line contract. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';

type Tx = { name: string; run: (s: string) => { out: string; c: string } | null };
const lines = (s: string) => s.split('\n');

const TX: Tx[] = [
  { name: 'notrailws', run: (S) => {
      const o = S.replace(/[ \t]+$/gm, '');
      return o === S ? null : { out: o, c: '§X80 each line had its trailing spaces and tabs removed; restore them is unnecessary (they are not restored)' };
  }},
  { name: 'blankstrip', run: (S) => {
      const o = S.replace(/\n[ \t]*(?=\n)/g, '\n');
      return o === S ? null : { out: o, c: '§X80 blank lines were emptied of spaces' };
  }},
  { name: 'tab2pipe', run: (S) => !S.includes('\t') ? null : { out: S.replace(/\t/g, '|'), c: '§X80 every tab is shown as |' } },
  { name: 'pipe2tab', run: (S) => !S.includes('|') ? null : { out: S.replace(/\|/g, '\t'), c: '§X80 every | is a tab' } },
  { name: 'rotR1', run: (S) => {
      const L = lines(S); if (L.length < 4) return null;
      const o = L.map((l) => { const m = l.match(/^(\s*)(.*?)(\s*)$/s); const b = m![2];
        const i = b.lastIndexOf(' '); if (i < 0) return l; return m![1] + b.slice(i + 1) + ' ' + b.slice(0, i) + m![3]; }).join('\n');
      return o === S ? null : { out: o, c: '§X80 on every line the last space-separated field was moved to the front' };
  }},
  { name: 'revfields', run: (S) => {
      const L = lines(S); if (L.length < 4) return null;
      const o = L.map((l) => { const m = l.match(/^(\s*)(.*?)(\s*)$/s); const b = m![2].split(' ');
        return m![1] + b.reverse().join(' ') + m![3]; }).join('\n');
      return o === S ? null : { out: o, c: '§X80 the space-separated fields of every line are in reverse order' };
  }},
  { name: 'zeropad', run: (S) => {
      const L = lines(S); if (L.length < 4) return null;
      const cols: string[][] = L.map((l) => l.split('\t'));
      const n = cols[0].length; if (n < 2 || cols.some((c) => c.length !== n)) return null;
      const w: number[] = []; for (let j = 0; j < n; j++) w[j] = Math.max(...cols.map((c) => c[j].length));
      const o = cols.map((c) => c.map((v, j) => /^[0-9]+$/.test(v) ? v.padStart(w[j], '0') : v).join('\t')).join('\n');
      return o === S ? null : { out: o, c: '§X80 numeric fields are zero-padded to the widest in their column' };
  }},
  { name: 'rightalign', run: (S) => {
      const L = lines(S); if (L.length < 4) return null;
      const w = Math.max(...L.map((l) => l.length));
      if (w > 200) return null;
      let cost = 0; for (const l of L) cost += (w - l.length);
      if (cost > L.length * 12) return null;   // do not pad absurdly
      const o = L.map((l) => ' '.repeat(w - l.length) + l).join('\n');
      return o === S ? null : { out: o, c: '§X80 lines are right-aligned to width ' + w + ' by leading spaces (strip them)' };
  }},
  { name: 'dedupeAdj', run: (S) => {
      const L = lines(S); if (L.length < 4) return null;
      const o: string[] = []; let n = 1;
      for (let i = 0; i < L.length; i++) { if (i > 0 && L[i] === L[i - 1]) { n++; continue; }
        if (i > 0) o[o.length - 1] += n > 1 ? ` ×${n}` : ''; o.push(L[i]); n = 1; }
      if (L.length - 1 >= 0) o[o.length - 1] += n > 1 ? ` ×${n}` : '';
      const out = o.join('\n');
      return out === S ? null : { out, c: '§X80 " ×N" means the line is repeated N times in total' };
  }},
  { name: 'stripCR', run: (S) => !S.includes('\r') ? null : { out: S.replace(/\r/g, ''), c: '§X80 carriage returns removed' } },
  { name: 'squeeze2sp', run: (S) => {
      const o = S.replace(/(?<= ) +(?=\S)/g, '');
      return o === S ? null : { out: o, c: '§X80 runs of spaces before a non-space collapse to one' };
  }},
];

const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const base: any = tagstackFrontier(S, enc);
  const parts: string[] = [];
  for (const t of TX) {
    let r: any;
    try { r = t.run(S); } catch { parts.push(`${t.name} ERR`); continue; }
    if (!r) { parts.push(`${t.name} n/a`); continue; }
    const f: any = tagstackFrontier(r.c + '\n' + r.out, enc);
    const d = f.messageTokens - base.messageTokens;
    parts.push(`${t.name} ${d >= 0 ? '+' : ''}${d}`);
    rows.push({ lane: p.split('/').pop(), tx: t.name, base: base.messageTokens, after: f.messageTokens, d, exact: f.decoded === r.c + '\n' + r.out });
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} F ${String(base.messageTokens).padStart(4)} | ${parts.join(' ')}`);
  fs.writeFileSync('bench/x80/receipts/screen.json', JSON.stringify(rows, null, 1) + '\n');
}
