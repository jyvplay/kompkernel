import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { synkrisisDecode, synkrisisEncode } from '@/lib/omega/synkrisis';
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

const receipts = 'bench/x45/receipts';
fs.mkdirSync(`${receipts}/messages`, { recursive: true });
const rows: any[] = [];
let failures = 0;
for (const [lane, path] of CASES) {
  const text = fs.readFileSync(path, 'utf8');
  const r = synkrisisEncode(text, enc);
  const back = r.arm === 'identity' ? r.decoded : synkrisisDecode(r.message);
  const exact = back === text && r.decoded === text;
  const gated = r.messageTokens <= r.parentTokens;
  const row = {
    lane,
    path,
    chars: text.length,
    sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    inputTokens: countTokens(text, enc),
    priorBestTokens: r.parentTokens,
    synkrisisTokens: r.messageTokens,
    delta: r.messageTokens - r.parentTokens,
    arm: r.arm,
    applied: r.applied,
    exact,
    gatePass: gated,
    ms: r.ms,
    notes: r.notes,
  };
  rows.push(row);
  if (!exact || !gated) failures++;
  if (r.applied) fs.writeFileSync(`${receipts}/messages/${lane}.txt`, r.message);
  console.log(`${exact && gated ? 'PASS' : 'FAIL'} ${lane.padEnd(25)} raw=${row.inputTokens} prior=${row.priorBestTokens} `
    + `M=${row.synkrisisTokens} Δ=${row.delta} arm=${row.arm} ms=${row.ms}`);
}
fs.writeFileSync(`${receipts}/metrics.jsonl`, rows.map(x => JSON.stringify(x)).join('\n') + '\n');
const summary = {
  cases: rows.length,
  exact: rows.filter(r => r.exact).length,
  gatePass: rows.filter(r => r.gatePass).length,
  wordCanon: rows.filter(r => r.arm === 'word-canon').length,
  multiCopy: rows.filter(r => r.arm === 'multi-copy').length,
  strictWins: rows.filter(r => r.delta < 0).length,
  noGainOrIdentity: rows.filter(r => r.delta === 0).length,
  failures,
  sumPrior: rows.reduce((s, r) => s + r.priorBestTokens, 0),
  sumSynkrisis: rows.reduce((s, r) => s + r.synkrisisTokens, 0),
};
fs.writeFileSync(`${receipts}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log('\nSUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
