/**
 * X20 (3): model-readability probe.
 *   bench/x20/run.sh bench/x20/blind-prep.ts <lane> <name> <fromLine> <toLine>
 * writes bench/x20/blind/<name>.wire (what a reader sees: the @nd note plus the body - no contract, no
 * skills file) and bench/x20/blind/<name>.want (the original, which the reader must not look at).
 * A reader writes <name>.got next to them; `python3 bench/x20/blind-check.py <name>` diffs the two after
 * trailing newlines, so the comparison is about content and not about one file's final byte.
 * The decode recorded in REPORT.md for `vix` was produced by the author model in one turn, by hand, from
 * .wire alone; that is disclosed as a smoke test, not an independent study.
 */
import fs from 'node:fs';
import { ndForward, ndSerializeParams } from '@/lib/omega/anadesmos';
const [lane, name, from, to] = [process.argv[2], process.argv[3], Number(process.argv[4]), Number(process.argv[5])];
const all = fs.readFileSync(lane, 'utf8').replace(/\r\n/g, '\n').split('\n').slice(from, to).join('\n');
fs.mkdirSync('bench/x20/blind', { recursive: true });
const sel = ndForward(all);
if (!sel) { console.log('no note fired on that slice'); process.exit(1); }
fs.writeFileSync('bench/x20/blind/' + name + '.wire', sel.text);
fs.writeFileSync('bench/x20/blind/' + name + '.want', all);
console.error(name + ': note = ' + ndSerializeParams(sel.p) + '  applied=' + sel.applied.join('+'));
