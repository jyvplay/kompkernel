import fs from 'node:fs';
import { canonEntry, renderCanon } from '../../src/lib/omega/anagnorisis';
const [f, id, kindArg] = process.argv.slice(2);
const kind = (kindArg || 'text') as 'text' | 'header';
const t = fs.readFileSync(f, 'utf8');
const e = canonEntry(id, kind)!;
const tw = e.body.split(/\s+/).filter(Boolean);
const first = e.body.split('\n')[0].trimEnd().slice(0, 56);
const at = t.indexOf(first);
console.log('anchor at', at, 'crlf', t.includes('\r\n'), 'trailing-ws', /[ \t]+\n/.test(t));
const rest = t.slice(at);
const rw = rest.split(/\s+/).filter(Boolean).slice(0, tw.length);
let firstDiff = -1;
for (let i = 0; i < tw.length; i++) if (rw[i] !== tw[i]) { firstDiff = i; break; }
console.log('words', rw.length, '/', tw.length, 'firstDiff', firstDiff, firstDiff >= 0 ? JSON.stringify([rw.slice(firstDiff - 2, firstDiff + 3), tw.slice(firstDiff - 2, firstDiff + 3)]) : '');
if (firstDiff < 0) {
  const lines = rest.split('\n');
  const longest = Math.max(...lines.map(l => l.length));
  console.log('longest line', longest);
  for (const W of [longest, longest + 1, longest + 2, longest + 3, 80, 100]) {
    const r = renderCanon({ id, kind, slots: [], prefix: '', wrap: W, crlf: false })!;
    const n = rest.slice(0, r.length);
    let d = -1; for (let i = 0; i < r.length; i++) if (r[i] !== n[i]) { d = i; break; }
    console.log('W', W, d < 0 ? 'MATCH' : `diff@${d}: ${JSON.stringify(n.slice(Math.max(0, d - 30), d + 30))} vs ${JSON.stringify(r.slice(Math.max(0, d - 30), d + 30))}`);
    if (d < 0) break;
  }
}
