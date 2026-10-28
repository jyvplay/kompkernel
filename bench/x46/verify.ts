import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { bifrontEncode } from '@/lib/omega/bifront';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const CASES: [string, string][] = [
  ['third-party-notices', 'bench/x44/lanes/third-party-notices.txt'],
  ['flask-bsd3-double-space', 'bench/z45/corpus/licenses/pallets_flask.txt'],
  ['django-bsd3', 'bench/z45/corpus/licenses/django_django.txt'],
  ['numpy-bsd3', 'bench/z45/corpus/licenses/numpy_numpy.txt'],
  ['golang-bsd3', 'bench/z45/corpus/licenses/golang_go.txt'],
  ['pandas-bsd3', 'bench/z45/corpus/licenses/pandas-dev_pandas.txt'],
  ['pytorch-bsd3-bundle', 'bench/z45/corpus/licenses/pytorch_pytorch.txt'],
  ['postgres-custom', 'bench/z45/corpus/licenses/postgres_postgres.txt'],
  ['httpie-bsd2', 'bench/z45/corpus/licenses/httpie_cli.txt'],
  ['kb-article', 'bench/holdout-work/kb-article.txt'],
  ['llm-answer', 'bench/holdout-work/llm-answer.md'],
  ['email-thread', 'bench/holdout-work/email-thread.txt'],
  ['meeting-transcript', 'bench/holdout-work/meeting-transcript.txt'],
  ['bibliography', 'bench/holdout-work/bibliography.txt'],
  ['find-listing', 'bench/holdout-ops/find-listing.txt'],
  ['git-log-fuller', 'bench/holdout-ops/git-log-fuller.txt'],
];
const oldRows = new Map<string, any>();
for (const line of fs.readFileSync('bench/x45/receipts/metrics.jsonl', 'utf8').trim().split('\n')) {
  const row = JSON.parse(line); oldRows.set(row.lane, row);
}
const outDir = 'bench/x46/receipts';
fs.mkdirSync(outDir, { recursive: true });
const rows: any[] = [];
let failures = 0;
for (const [lane, path] of CASES) {
  const text = fs.readFileSync(path, 'utf8');
  const r = bifrontEncode(text, enc);
  const sourceSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const prior = oldRows.get(lane);
  const exact = r.decoded === text;
  const noRegression = r.messageTokens <= r.parentTokens;
  const parentSame = Boolean(prior && prior.sha256 === sourceSha256 && prior.synkrisisTokens === r.parentTokens);
  const row = {
    lane, path, chars: text.length, sourceSha256,
    inputTokens: countTokens(text, enc),
    x45SynkrisisTokens: prior?.synkrisisTokens ?? null,
    currentSynkrisisParentTokens: r.parentTokens,
    bifrontMessageTokens: r.messageTokens,
    deltaToParent: r.messageTokens - r.parentTokens,
    deltaToX45: prior ? r.messageTokens - prior.synkrisisTokens : null,
    arm: r.applied ? 'bifront' : 'synkrisis-fallback',
    applied: r.applied, suffix: r.suffix, pathCount: r.pathCount,
    exact, noRegression, parentSame, elapsedMs: r.ms, notes: r.notes,
  };
  rows.push(row);
  if (!exact || !noRegression || (prior && prior.sha256 === sourceSha256 && !parentSame)) failures++;
  if (r.applied) fs.writeFileSync(`${outDir}/${lane}.message.txt`, r.message);
  console.log(`${exact && noRegression ? 'PASS' : 'FAIL'} ${lane.padEnd(25)} `
    + `X45=${row.x45SynkrisisTokens ?? '?'} currentParent=${r.parentTokens} `
    + `BIFRONT=${r.messageTokens} Δ=${row.deltaToParent} applied=${r.applied} ms=${r.ms}`);
}
fs.writeFileSync(`${outDir}/metrics.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const summary = {
  parent: 'SYNKRISIS X45', encoding: enc,
  cases: rows.length,
  exact: rows.filter(r => r.exact).length,
  noRegression: rows.filter(r => r.noRegression).length,
  parentSameAndSourceSame: rows.filter(r => r.parentSame).length,
  strictWins: rows.filter(r => r.deltaToParent < 0).length,
  ties: rows.filter(r => r.deltaToParent === 0).length,
  rejectedCandidateInputs: rows.filter(r => !r.applied && r.suffix !== null).length,
  changedSources: rows.filter(r => !oldRows.has(r.lane) || oldRows.get(r.lane).sha256 !== r.sourceSha256).map(r => r.lane),
  parentDiscrepancies: rows.filter(r => oldRows.has(r.lane) && oldRows.get(r.lane).sha256 === r.sourceSha256 && !r.parentSame).map(r => ({ lane: r.lane, old: oldRows.get(r.lane).synkrisisTokens, current: r.parentTokens })),
  failures,
  x45Sum: rows.reduce((s,r) => s + (r.x45SynkrisisTokens ?? 0),0),
  currentParentSum: rows.reduce((s,r) => s + r.currentSynkrisisParentTokens,0),
  bifrontSum: rows.reduce((s,r) => s + r.bifrontMessageTokens,0),
};
fs.writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
