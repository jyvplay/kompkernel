import fs from 'node:fs';
import { canonEntry, renderCanon, recogniseCanon } from '../../src/lib/omega/anagnorisis';
const [f, id, prefix] = process.argv.slice(2);
const t = fs.readFileSync(f, 'utf8');
const e = canonEntry(id, 'header')!;
const first = e.body.split('\n')[0].trimEnd().slice(0, 56);
const at = t.indexOf(first);
const ls = t.lastIndexOf('\n', at - 1) + 1;
console.log('anchor at', at, 'prefixText', JSON.stringify(t.slice(ls, at)));
const r = renderCanon({ id, kind: 'header', slots: [], prefix: prefix ?? t.slice(ls, at), crlf: false })!;
const n = t.slice(ls, ls + r.length);
let d = -1; for (let i = 0; i < r.length; i++) if (r[i] !== n[i]) { d = i; break; }
console.log(d < 0 ? 'EXACT MATCH' : `diff@${d}: file=${JSON.stringify(n.slice(Math.max(0, d - 40), d + 40))}\n           render=${JSON.stringify(r.slice(Math.max(0, d - 40), d + 40))}`);
console.log('recognise:', recogniseCanon(t).map(x => JSON.stringify(x.ref)));
