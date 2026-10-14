import fs from 'node:fs';
import { canonEntry, renderCanon } from '../../src/lib/omega/anagnorisis';
const [f, id, prefix] = process.argv.slice(2);
const t = fs.readFileSync(f, 'utf8');
const e = canonEntry(id, 'text')!;
const first = e.body.split('\n')[0].trimEnd().slice(0, 56);
const at = t.indexOf(first);
const r = renderCanon({ id, kind: 'text', slots: [], prefix: prefix ?? '', crlf: false })!;
const n = t.slice(at, at + r.length);
let d = -1; for (let i = 0; i < r.length; i++) if (r[i] !== n[i]) { d = i; break; }
console.log('anchor at', at, d < 0 ? 'EXACT MATCH' : `diff@${d}: file=${JSON.stringify(n.slice(Math.max(0, d - 60), d + 40))}\n           render=${JSON.stringify(r.slice(Math.max(0, d - 60), d + 40))}`);
