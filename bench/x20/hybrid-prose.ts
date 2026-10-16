/**
 * X20 ask 8: does the STATHMOS/TYPOS concept generalize from bench tables to
 * RANDOM and HYBRID prose? Builds fixtures by splicing real table rows from real
 * corpora into real prose files from the repo, then reports for each fixture
 * whether TYPOS transforms it and by how much against the STATHMOS chain floor.
 * usage: bench/x20/run.sh bench/x20/hybrid-prose.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { typosEncode, typosDecode, typosPlans } from '@/lib/omega/typos';

const enc = 'o200k_base' as const;
const OUT = 'bench/tmp/hybrid';
fs.mkdirSync(OUT, { recursive: true });
const read = (f: string) => fs.readFileSync(f, 'utf8');

/** take k real data lines from a corpus */
const rows = (f: string, k: number, skip = 1) =>
  read(f).split('\n').slice(skip, skip + k).filter((l) => l.trim().length > 0);

const prose1 = read('bench/holdout/readme.txt');
const prose2 = read('bench/holdout-work/meeting-transcript.txt');
const prose3 = read('bench/z57/lanes/prose-changelog.md');
const prose4 = read('bench/holdout-work/kb-article.txt');

interface Fix { name: string; text: string; note: string }
const fixes: Fix[] = [
  {
    name: 'hybrid-report-prices',
    note: 'prose + a 40-row price table (vix rows) in the middle',
    text: prose1.split('\n\n').slice(0, 3).join('\n\n') + '\n\nDaily closes:\n\n' +
      rows('bench/holdout-tab/vix-daily-1990.csv', 40).join('\n') + '\n\n' +
      prose1.split('\n\n').slice(3).join('\n\n'),
  },
  {
    name: 'hybrid-transcript-times',
    note: 'prose + 30 ISO timestamps inline (git-log-iso dates)',
    text: (() => {
      const dates = (read('bench/z20/samples/git-log-iso.txt').match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/g) ?? []);
      return prose2.split('\n').map((l, i) =>
        (l.trim() && i % 3 === 0 && dates.length ? `${dates[i % dates.length]} ${l}` : l)).join('\n');
    })(),
  },
  {
    name: 'hybrid-changelog-versions',
    note: 'prose + 40 sp500 rows (date,open,high,low,close,volume)',
    text: prose3 + '\n\n## Release metrics\n\n' +
      rows('bench/z48/corpus/sp500-200.csv', 40).join('\n') + '\n',
  },
  {
    name: 'hybrid-kb-psql',
    note: 'prose + a 24-row psql result block (timestamps + fixed decimals)',
    text: prose4 + '\n\n```\n' + read('bench/holdout-tbl/psql-output.txt') + '\n```\n',
  },
  {
    name: 'hybrid-random-spliced',
    note: 'RANDOM: prose paragraphs interleaved with random single numbers from 4 corpora',
    text: (() => {
      const pool: string[] = [];
      for (const [f, re] of [['bench/holdout-tab/vix-daily-1990.csv', /\d+\.\d+/g],
        ['bench/z48/corpus/sp500-200.csv', /\d{4}-\d\d-\d\d/g],
        ['bench/holdout-tbl/psql-output.txt', /\d\d:\d\d:\d\d\.\d+/g],
        ['bench/z20/samples/git-log-iso.txt', /\d{4}-\d\d-\d\d/g]] as const)
        pool.push(...(read(f).match(re) ?? []));
      let s = 12345;
      const rnd = (n: number) => { s = (s * 1103515245 + 12345) % 2147483648; return s % n; };
      return prose1.split('\n').map((l) =>
        (l.trim() && rnd(2) === 0 ? `${l} (${pool[rnd(pool.length)]})` : l)).join('\n');
    })(),
  },
];

const out: unknown[] = [];
for (const fx of fixes) {
  const p = path.join(OUT, `${fx.name}.txt`);
  fs.writeFileSync(p, fx.text);
  const r = typosEncode(fx.text, enc);
  const dec = typosDecode(r.wire, r.shapes, r.rule, r.marks, r.chained);
  const row = {
    fixture: fx.name, note: fx.note, bytes: fx.text.length,
    raw: countTokens(fx.text, enc), base: r.baseTokens[enc], M: r.messageTokens[enc],
    delta: r.messageTokens[enc] - r.baseTokens[enc],
    rule: r.rule, chained: r.chained, shapes: r.shapes, marks: r.marks,
    occurrences: r.occurrences, contractTokens: r.contractTokens, transformed: r.transformed, ms: r.ms,
    exact: dec === fx.text,
  };
  const plans = typosPlans(fx.text, { enc });
  (row as Record<string, unknown>).plans = plans.length;
  (row as Record<string, unknown>).planDetail = plans.map(pl => ({
    mode: pl.mode, shapes: pl.shapes, counts: pl.counts, occurrences: pl.occurrences, est: pl.est,
  }));
  out.push(row);
  console.log(JSON.stringify(row));
}
fs.writeFileSync('bench/x20/receipts/hybrid-prose.jsonl', out.map((o) => JSON.stringify(o)).join('\n') + '\n');
