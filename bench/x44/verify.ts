/**
 * X44 ARCHETYPON — end-to-end verification, real encodes, one process, one clock.
 *
 * For every lane: encode with the shipped frontier (apographeEncode), with the
 * nearest prior codec (anagnorisisEncode), and with ARCHETYPON. Decode every
 * winner back to the source in the same process. Emit JSONL receipts and the
 * real one-chat messages for the independent CPython reader.
 *
 *   npx esbuild bench/x44/verify.ts --bundle --platform=node --format=esm \
 *     --outfile=bench/tmp/x44-verify.mjs && OMEGA_DET=1 node bench/tmp/x44-verify.mjs
 */
import * as fs from 'node:fs';
import { archetyponEncode } from '@/lib/omega/archetypon';
import { anagnorisisEncode } from '@/lib/omega/anagnorisis';
import { apographeEncode } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const LANES: string[] = [
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

const outDir = 'bench/x44/receipts';
fs.mkdirSync(outDir, { recursive: true });
const rows: any[] = [];
const messages: any[] = [];

for (const p of LANES) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); continue; }
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  const front: any = apographeEncode(text, enc);
  let anag: any = null;
  try { anag = anagnorisisEncode(text, enc); } catch (e: any) { anag = { error: e.message }; }
  const a: any = archetyponEncode(text, enc);
  const lane = p.split('/').pop()!;
  const row: any = {
    lane, path: p, chars: text.length, raw,
    frontier: front.messageTokens,
    anagnorisis: anag && anag.messageTokens !== undefined ? anag.messageTokens : null,
    archetypon: a.messageTokens,
    arm: a.arm,
    exact: a.decoded === text,
    frontierExact: (front.decoded ?? text) === text,
    deltaVsFrontier: a.messageTokens - front.messageTokens,
    deltaVsAnagnorisis: anag && anag.messageTokens !== undefined ? a.messageTokens - anag.messageTokens : null,
    notes: a.notes,
    ms: Date.now() - t0,
  };
  rows.push(row);
  if (a.archetypon) messages.push({ lane, message: a.message, contract: a.contract, wire: a.wire, M: a.messageTokens });
  console.log(
    lane.padEnd(34),
    `raw=${String(raw).padStart(5)}`,
    `front=${String(row.frontier).padStart(5)}`,
    `anag=${String(row.anagnorisis ?? '-').padStart(5)}`,
    `ARCH=${String(row.archetypon).padStart(5)}`,
    `Δfront=${String(row.deltaVsFrontier).padStart(6)}`,
    `Δanag=${String(row.deltaVsAnagnorisis ?? '-').padStart(6)}`,
    `arm=${row.arm.padEnd(10)}`,
    `exact=${row.exact}`,
    `${row.ms}ms`,
  );
}
fs.writeFileSync(`${outDir}/verify.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${outDir}/messages.json`, JSON.stringify(messages, null, 2));
const wins = rows.filter(r => r.deltaVsFrontier < -3 && r.exact);
const strict = rows.filter(r => r.deltaVsAnagnorisis !== null && r.deltaVsAnagnorisis < 0 && r.exact);
console.log(`\nVERDICT: ${rows.length} lanes, ${wins.length} strict wins vs frontier, ${strict.length} strict wins vs ANAGNORISIS, ` +
  `${rows.filter(r => !r.exact).length} inexact, ${rows.filter(r => r.deltaVsFrontier > 0).length} regressions.`);
console.log('identity arms:', rows.filter(r => r.arm === 'identity').length, 'parametric:', rows.filter(r => r.arm === 'parametric').length,
  'selfcanon:', rows.filter(r => r.arm === 'selfcanon').length);
