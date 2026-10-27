import * as fs from 'node:fs';
import { synkrisisEncode, synkrisisDecode } from '@/lib/omega/synkrisis';
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
const rows: any[] = [];
const t0 = Date.now();
for (const path of paths) {
  const text = fs.readFileSync(path, 'utf8');
  const result = synkrisisEncode(text, enc);
  const back = result.arm === 'identity' ? result.decoded : synkrisisDecode(result.message);
  const row = {
    path,
    raw: countTokens(text, enc),
    prior: result.parentTokens,
    M: result.messageTokens,
    delta: result.messageTokens - result.parentTokens,
    arm: result.arm,
    exact: result.decoded === text && back === text,
    ms: result.ms,
  };
  rows.push(row);
  console.log(`${row.exact && row.delta <= 0 ? 'PASS' : 'FAIL'} ${path.padEnd(66)} raw=${row.raw} prior=${row.prior} M=${row.M} Δ=${row.delta} arm=${row.arm} ms=${row.ms}`);
}
const summary = {
  cases: rows.length,
  exact: rows.filter(r => r.exact).length,
  noRegression: rows.filter(r => r.delta <= 0).length,
  strictWins: rows.filter(r => r.delta < 0).length,
  wordCanon: rows.filter(r => r.arm === 'word-canon').length,
  multiCopy: rows.filter(r => r.arm === 'multi-copy').length,
  identity: rows.filter(r => r.arm === 'identity').length,
  seconds: (Date.now() - t0) / 1000,
  rows,
};
fs.writeFileSync('bench/x45/receipts/x44-corpus.json', JSON.stringify(summary, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify({ ...summary, rows: undefined }));
if (summary.exact !== summary.cases || summary.noRegression !== summary.cases) process.exitCode = 1;
