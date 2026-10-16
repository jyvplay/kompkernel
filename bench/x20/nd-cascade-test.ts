/**
 * X20 / ANADESMOS gate 1: the cascade itself — exactness, edge cases, fuzz.
 * Fast: no wire codec, no DAEDALUS. Every check is a byte comparison.
 * usage: bench/x20/run.sh bench/x20/nd-cascade-test.ts
 */
import fs from 'node:fs';
import {
  ndForward, ndProbe, ndInverse, ndSerializeParams, ndParseParams, ndClause, ndPickMark, greedyWrap,
  type NdParams,
  ANADESMOS_MARKS,
} from '@/lib/omega/anadesmos';
import { countTokens } from '@/lib/omega/bpe';

let pass = 0, fail = 0;
const fails: string[] = [];
function ck(name: string, cond: boolean, detail = '') {
  if (cond) pass++;
  else { fail++; fails.push(`${name} ${detail}`); }
}

/** the property: for any input, either no selection, or inverse(forward) == input byte for byte */
function property(label: string, text: string): { applied: string; saved: number } {
  const sel = ndForward(text);
  if (!sel) return { applied: '-', saved: 0 };
  const body = sel.text.slice(sel.text.indexOf('\n') + 1);
  const back = ndInverse(body, sel.p);
  ck(label + ':roundtrip', back === text, `applied=${sel.applied.join('+')} len ${text.length}->${back.length}`);
  // descriptor must round-trip through its own text form
  const p2 = ndParseParams(ndSerializeParams(sel.p));
  ck(label + ':params', !!p2 && ndSerializeParams(p2) === ndSerializeParams(sel.p), `${ndSerializeParams(sel.p)} vs ${p2 ? ndSerializeParams(p2) : 'null'}`);
  if (p2) {
    const back2 = ndInverse(body, p2);
    ck(label + ':params-decode', back2 === text, 'parsed params do not reproduce');
  }
  const saved = countTokens(text, 'o200k_base') - countTokens(sel.text, 'o200k_base');
  return { applied: sel.applied.join('+'), saved };
}

/* ---------- 1. synthetic edge cases ---------------------------------------- */
const cases: Array<[string, string]> = [
  ['empty', ''],
  ['one-char', 'a'],
  ['no-newline', 'hello world'],
  ['uniform-lines', 'abcd\nefgh\nijkl'],
  ['ragged-lines', 'abcd\nefghij\nxy'],
  ['trailing-nl', 'abcd\nefgh\n'],
  ['crlf-uniform', 'abcd\r\nefgh\r\n'],
  ['lone-cr', 'ab\rcd\n'],
  ['csv-scale', 'a,b\r\n1.240000,3\r\n5.600000,7\r\n'],
  ['csv-scale-nochange', 'a,b\n1.24,3\n5.60,7\n'],
  ['csv-leadzero', 'id,name\n007,bon\n008,far\n'],
  ['pipe-table', 'a | b\n1 | 2\n3 | 4\n'],
  ['aligned-2col', 'NAME   SIZE\nfoo      1\nbarbaz   22\n'],
  ['aligned-right', 'NAME   SIZE\nfoo      1\nbarbaz  22\n'],
  ['wrapped-prose', 'The quick brown fox jumps over\nthe lazy dog again and again.\n\nSecond para is short here\nbut padded to the same width.\n'],
  ['wrapped-bad', 'short line\nthis other line is much longer than the first one by a lot yes\n'],
  ['marker-present-all', 'abc\u00a0def\n\u00a0\n'],
  ['tabs', 'a\tb\nc\td\n'],
  ['unicode', 'naïve — café “quoted” …\nnext line here\n'],
  ['digits-prose', 'Revenue was 1,234,567 in 2024 and 1,200,000 in 2023.\nTotal 2,000 people, 45 sites, 100 items.\n'],
  ['blank-lines', 'a\n\nb\n\nc\n\n'],
  ['long-words-wrap', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa bbb\nccccccccccccccccccccccccccc ddddddddddddddddd\n'],
  ['single-long-line', 'x'.repeat(400)],
  ['crlf-only', 'a\r\nb\r\n'],
  ['huge-W', 'a'.repeat(250) + '\n' + 'b'.repeat(250)],
];
for (const [name, text] of cases) {
  const r = property('case:' + name, text);
  const pr = ndProbe(text).filter((x) => x.applies).map((x) => `${x.name}(${x.saved - x.cost >= 0 ? '+' : ''}${x.saved - x.cost}${x.exact === false ? '!' : ''})`);
  console.log(`${name.padEnd(20)} applied=${(r.applied || '-').padEnd(12)} saved=${String(r.saved).padStart(4)}  families: ${pr.join(' ') || 'none apply'}`);
}

/* ---------- 2. clause and marker sanity ------------------------------------- */
{
  const p: NdParams = {
    crlf: true, sep: '|', dp: [0, 6], iw: [0, 4], range: { from: 2, len: 9 }, ral: { al: 'lrr', start: 1, gap: 2 },
    nl: { W: 40 }, cols: { A: [0, 5], al: 'lr', mk: '◆' },
  };
  const s = ndSerializeParams(p);
  const q = ndParseParams(s);
  ck('params:parse-of-serialize', !!q && ndSerializeParams(q) === s, s + ' | ' + (q ? ndSerializeParams(q) : 'null'));
  ck('clause:nonempty', ndClause(p).length > 40);
  ck('clause:is-the-preamble', ndClause(p).includes('first line'), ndClause(p));
  ck('note:mentions-each-family', ['lines are 40 chars', 'each line holds 2 columns', 'col 2 = 6 decimals',
    'col 2 = 4 digits zero-padded', 'lines 3-11 only', 'fields aligned lrr, 2 spaces apart, first at 2',
    'split on |', 'line ends are CRLF'].every((k) => s.includes(k)), s);
  ck('mark:absent', ndPickMark('abc') !== null && !'abc'.includes(ndPickMark('abc')!), String(ndPickMark('abc')));
  ck('mark:null-when-all-present', ndPickMark(ANADESMOS_MARKS.join('x')) === null, 'all marks present');
  ck('wrap:greedy', greedyWrap(['aa', 'bb', 'cc'], 5).join('|') === 'aa bb|cc', greedyWrap(['aa', 'bb', 'cc'], 5).join('|'));
}

/* ---------- 3. fuzz: random line soups from generators + real-lane slices --- */
function ANA_rand(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const LANES = [
  'bench/holdout-lang/de-kb.txt', 'bench/holdout-mk/chart.svg', 'bench/holdout-mk/dump.sql',
  'bench/holdout-ops/find-listing.txt', 'bench/holdout-ops/git-numstat.txt',
  'bench/holdout-ops/node-stacktraces.txt', 'bench/holdout-ops/openstack-loghub-26.log',
  'bench/holdout-tab/aapl-2014.csv', 'bench/holdout-tab/vix-daily-1990.csv',
  'bench/holdout-tbl/df-h.txt', 'bench/holdout-tbl/kubectl-get-pods.txt', 'bench/holdout-tbl/psql-output.txt',
  'bench/holdout-work/bibliography.txt', 'bench/holdout-work/email-thread.txt', 'bench/holdout-work/kb-article.txt',
  'bench/holdout-work/llm-answer.md', 'bench/holdout-work/meeting-transcript.txt', 'bench/holdout/readme.txt',
  'bench/z11/fresh/csv-8.csv', 'bench/z48/corpus/sp500-200.csv', 'bench/holdout-ops/ls-full-iso.txt',
  'bench/z20/samples/git-log-iso.txt', 'bench/z11/fresh/ops-git-log-stat.txt',
  'bench/z46/corpus/traces/spring-projects_spring-framework_35118.md',
  'bench/z47/corpus/changelog/svenstaro_miniserve.md', 'bench/holdout-ops/git-log-fuller.txt',
];
const laneText = new Map<string, string>();
for (const l of LANES) { try { laneText.set(l, fs.readFileSync(l, 'utf8')); } catch { /* missing lane */ } }
console.log(`\nlane screening (${laneText.size} lanes):`);
for (const [l, txt] of laneText) {
  const r = property('lane:' + l, txt);
  const pr = ndProbe(txt).filter((x) => x.applies).map((x) => `${x.name}(${x.saved - x.cost >= 0 ? '+' : ''}${x.saved - x.cost})`);
  console.log(`  ${l.replace('bench/', '').padEnd(52)} applied=${r.applied.padEnd(14)} saved=${String(r.saved).padStart(4)}  families: ${pr.join(' ') || 'none apply'}`);
}

{
  const rnd = ANA_rand(20261016);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length) % a.length];
  const words = 'the quick brown fox jumps over lazy dogs while revenue grew and systems failed quietly today'.split(' ');
  let transformed = 0;
  for (let it = 0; it < 400; it++) {
    const kind = it % 4;
    let s = '';
    if (kind === 0) {
      // random wrapped prose
      const W = 20 + Math.floor(rnd() * 60);
      const paras: string[] = [];
      for (let p = 0; p < 1 + Math.floor(rnd() * 3); p++) {
        const flow = Array.from({ length: 5 + Math.floor(rnd() * 40) }, () => pick(words)).join(' ');
        paras.push(greedyWrap(flow.split(' '), W).join('\n'));
      }
      s = paras.join('\n\n') + (rnd() < 0.5 ? '\n' : '');
    } else if (kind === 1) {
      // random fixed-width CSV with mixed scales
      const nrow = 2 + Math.floor(rnd() * 12);
      const rows = ['a,b,c'];
      for (let r0 = 0; r0 < nrow; r0++) {
        const D = Math.floor(rnd() * 7);
        rows.push(`${(rnd() * 1000).toFixed(0)},${(rnd() * 10).toFixed(D)}${D ? '' : ''},${(rnd() * 100).toFixed(Math.floor(rnd() * 4))}`);
      }
      s = rows.join(rnd() < 0.5 ? '\n' : '\r\n') + '\n';
    } else if (kind === 2) {
      // random aligned table
      const ncol = 2 + Math.floor(rnd() * 3);
      const rows: string[] = [];
      const width = 3 + Math.floor(rnd() * 8);
      for (let r0 = 0; r0 < 2 + Math.floor(rnd() * 10); r0++) {
        const fs = Array.from({ length: ncol }, (_, c) => (c === ncol - 1 ? pick(words) : (rnd() * 1000).toFixed(0)));
        rows.push(fs.map((f) => f.padEnd(width)).join(' ').replace(/\s+$/, ''));
      }
      s = rows.join('\n') + '\n';
    } else {
      // random slice of a real lane
      const t = pick([...laneText.values()]);
      const a = Math.floor(rnd() * Math.max(1, t.length - 200));
      s = t.slice(a, a + 200 + Math.floor(rnd() * 800));
    }
    const before = s;
    const sel = ndForward(s);
    if (sel) {
      transformed++;
      const body = sel.text.slice(sel.text.indexOf('\n') + 1);
      ck(`fuzz#${it}:roundtrip`, ndInverse(body, sel.p) === before, `applied=${sel.applied.join('+')}`);
      const p2 = ndParseParams(ndSerializeParams(sel.p));
      if (p2) ck(`fuzz#${it}:params`, ndInverse(body, p2) === before, 'parsed');
    }
    if (s.startsWith('@nd ') || s.startsWith('@raw\n')) ck(`fuzz#${it}:escape`, sel === null, 'must refuse escaped input');
  }
  console.log(`fuzz: 400 cases, ${transformed} used the cascade`);
}

console.log(`\nPASS ${pass}  FAIL ${fail}`);
if (fail) { console.log('failures:'); for (const f of fails.slice(0, 25)) console.log('  ' + f); process.exit(1); }
