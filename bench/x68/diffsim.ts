import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
export function contract(): string {
  return 'PATCHFOLD-1: expand the parent to get TEXT. Then, per file: after a "diff --git a/P b/P" line, emit "--- a/P" and "+++ b/P". For "@@ oA nO nN" emit "@@ -oA,oN +"+oA+","+nN+" @@" using the next hunk numbers.';
}
// simpler: implement candidate transforms and print token costs
function strip(s: string) { return s.replace(/\r\n/g, '\n'); }
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const lines = t.split('\n');
const out: string[] = [];
let groupStats: any[] = [];
let i = 0, hunkCount = 0, prefixLines = 0;
while (i < lines.length) {
  const l = lines[i];
  if (l.startsWith('diff --git ')) {
    const m = /^diff --git a\/(.+) b\/(.+)$/.exec(l);
    out.push(l);
    i++;
    // keep index line
    if (lines[i]?.startsWith('index ')) { out.push(lines[i]); i++; }
    // drop --- and +++ (derivable from the diff --git line)
    if (lines[i]?.startsWith('--- a/')) i++;
    if (lines[i]?.startsWith('+++ b/')) i++;
    continue;
  }
  const hm = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(l);
  if (hm) {
    hunkCount++;
    const oA = +hm[1], nA = +hm[3], ctxTail = hm[5] ?? '';
    // gather body
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && /^[ +\-\\]/.test(lines[j])) { body.push(lines[j]); j++; }
    const ctx = body.filter(x => x.startsWith(' '));
    const del = body.filter(x => x.startsWith('-'));
    const add = body.filter(x => x.startsWith('+'));
    const other = body.filter(x => !/^[ +\-]/.test(x[0]));
    const oN = ctx.length + del.length, nN = ctx.length + add.length;
    if (other.length || ctx.length + del.length + add.length !== body.length) { out.push(l); out.push(...body); i = j; continue; }
    groupStats.push({ ctx: ctx.length, del: del.length, add: add.length });
    prefixLines += body.length;
    out.push(`@@ ${oA} ${nA} ${oN} ${nN} @@${ctxTail}`);
    // grouped body without prefixes; escape lines starting with special chars? keep raw
    out.push(...ctx.map(x => x.slice(1)), ...del.map(x => x.slice(1)), ...add.map(x => x.slice(1)));
    i = j;
    continue;
  }
  out.push(l); i++;
}
const tr = out.join('\n');
console.log(JSON.stringify({ f, raw: countTokens(t, enc), transformed: countTokens(tr, enc), hunks: hunkCount, bodyLines: prefixLines, groupStats, contractTokens: countTokens(contract(), enc), chars: t.length }));
console.log('---- transformed head ----');
console.log(tr.split('\n').slice(0, 24).join('\n'));
