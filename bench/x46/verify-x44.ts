import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { bifrontEncode } from '@/lib/omega/bifront';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const paths = [
  'bench/holdout/lic-mit.txt',
  'bench/holdout/license.txt',
  'bench/holdout/readme.txt',
  'bench/holdout/code-ts.txt',
  'bench/holdout/md-react.txt',
  'bench/z45/corpus/licenses/facebook_react.txt',
  'bench/z45/corpus/licenses/colinhacks_zod.txt',
  'bench/z45/corpus/licenses/ollama_ollama.txt',
  'bench/z45/corpus/licenses/tailwindlabs_tailwindcss.txt',
  'bench/z45/corpus/licenses/vitejs_vite.txt',
  'bench/z45/corpus/licenses/langchain-ai_langchain.txt',
  'bench/z45/corpus/licenses/ggerganov_llama.cpp.txt',
  'bench/z45/corpus/licenses/fastify_fastify.txt',
  'bench/z45/corpus/licenses/ytdl-org_youtube-dl.txt',
  'bench/train/lic-isc.txt',
  'bench/holdout-work/kb-article.txt',
  'bench/holdout-ops/find-listing.txt',
  'bench/holdout-lang/ru-kb.txt',
  'bench/x44/lanes/third-party-notices.txt',
];
const old = JSON.parse(fs.readFileSync('bench/x45/receipts/x44-corpus.json', 'utf8'));
const oldByPath = new Map<string, any>(old.rows.map((r: any) => [r.path, r]));
const rows: any[] = [];
const t0 = Date.now();
for (const path of paths) {
  const text = fs.readFileSync(path, 'utf8');
  const r = bifrontEncode(text, enc);
  const sourceSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const prior = oldByPath.get(path);
  const exact = r.decoded === text;
  const noRegression = r.messageTokens <= r.parentTokens;
  const parentSame = Boolean(prior && r.parentTokens === prior.M);
  const row = {
    path, sourceSha256, chars: text.length,
    raw: countTokens(text, enc),
    x45SynkrisisM: prior?.M ?? null,
    currentSynkrisisParentM: r.parentTokens,
    bifrontM: r.messageTokens,
    deltaToParent: r.messageTokens - r.parentTokens,
    deltaToX45: prior ? r.messageTokens - prior.M : null,
    arm: r.applied ? 'bifront' : 'synkrisis-fallback',
    applied: r.applied, suffix: r.suffix, pathCount: r.pathCount,
    exact, noRegression, parentSame,
    elapsedMs: r.ms, notes: r.notes,
  };
  rows.push(row);
  console.log(`${exact && noRegression ? 'PASS' : 'FAIL'} ${path.padEnd(70)} `
    + `parent=${r.parentTokens} M=${r.messageTokens} Δ=${row.deltaToParent} `
    + `parentSame=${parentSame} applied=${r.applied} ms=${r.ms}`);
}
const summary: any = {
  parent: 'SYNKRISIS X45', encoding: enc,
  cases: rows.length,
  exact: rows.filter(r => r.exact).length,
  noRegression: rows.filter(r => r.noRegression).length,
  parentSame: rows.filter(r => r.parentSame).length,
  strictWins: rows.filter(r => r.deltaToParent < 0).length,
  ties: rows.filter(r => r.deltaToParent === 0).length,
  rejectedCandidates: rows.filter(r => !r.applied && r.suffix !== null).length,
  failures: rows.filter(r => !r.exact || !r.noRegression || !r.parentSame).length,
  x45SynkrisisSum: rows.reduce((s, r) => s + (r.x45SynkrisisM ?? 0), 0),
  currentParentSum: rows.reduce((s, r) => s + r.currentSynkrisisParentM, 0),
  bifrontSum: rows.reduce((s, r) => s + r.bifrontM, 0),
  seconds: (Date.now() - t0) / 1000,
  rows,
};
fs.writeFileSync('bench/x46/receipts/x44-corpus.json', JSON.stringify(summary, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify({ ...summary, rows: undefined }));
if (summary.failures) process.exitCode = 1;
