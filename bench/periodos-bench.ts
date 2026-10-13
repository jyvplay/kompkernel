/**
 * bench/periodos-bench.ts — PERIODOS measured against the existing frontier on
 * real documents, with the incumbent defined as min(raw, CHIRON alone, STICHOS-family).
 *
 *   usage: node periodos-bench.mjs <file-or-dir> [...]
 *
 * Every non-raw winner is decode-verified by the encoder's own gate; this script
 * re-checks it independently (exact === false would be printed as FAIL).
 * SUBSET=wrapped restricts to documents where PERIODOS wraps >= 3 paragraphs (deterministic selection).
 * NOTE: CHIRON is wall-clock budgeted; under CPU contention its output varies (measured: ±1-2%). Run on a quiet machine for final numbers.
 * Corpus provenance: bench/periodos-corpus-manifest.json (URLs + sha256 + sizes).
 * Corpus bytes are NOT committed; bench/periodos-fetch.py regenerates them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { chironEncode, chironDecode } from '../src/lib/omega/chiron';
import { stichosEncode, stichosStackDecode } from '../src/lib/omega/stichos';
import { periodosEncode, periodosStackDecode, periodosBuild, PERIODOS_CONTRACT } from '../src/lib/omega/periodos';

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const files: string[] = [];
const MAXBYTES = Number(process.env.MAXBYTES ?? 60000); // wall-time cap: CHIRON arms are O(size) per file; restated in the report.
const walk = (p: string) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const e of fs.readdirSync(p).sort()) walk(path.join(p, e));
  else files.push(p);
};
for (const a of process.argv.slice(2)) walk(a);
// Optional shard: SHARD=i/n keeps files with index % n === i (lets long runs use several cores).
const SHARD = process.env.SHARD ? process.env.SHARD.split('/').map(Number) : null;
if (SHARD) files.splice(0, files.length, ...files.filter((_, idx) => idx % SHARD[1] === SHARD[0]));

let n = 0, exactFail = 0, sumRaw = 0, sumChiron = 0, sumStichos = 0, sumPeriodos = 0, sumIncumbent = 0;
let periodosWins = 0, periodosWinsVsStichos = 0, periodosApplied = 0, stichosApplied = 0;
const rows: string[] = [];
for (const f of files) {
  let text: string;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (text.length === 0 || text.length > MAXBYTES || text.includes('\u0000')) continue;
  // SUBSET=wrapped: only documents where the PERIODOS layout applies to >= 3 paragraphs.
  // The selection is a pure function of the text (no timing), so it is reproducible.
  if (process.env.SUBSET === 'wrapped') { const b = periodosBuild(text); if (!b || b.wrapped < 3) continue; }
  n++;
  const raw = T(text);
  let ch = raw;
  try { const c = chironEncode(text, ENC, { budgetMs: 4000 }) as any; if (c.decoded === text && chironDecode(c.wire) === text) ch = Math.min(raw, c.messageTokens); } catch { /* keep raw */ }
  const s = stichosEncode(text, ENC);
  const sOK = s.winner === 'raw' || stichosStackDecode(s.wire) === text;
  const sM = sOK ? s.messageTokens : raw;
  const p = periodosEncode(text, ENC);
  const pOK = p.winner === 'raw' || periodosStackDecode(p.wire) === text;
  if (!sOK || !pOK) exactFail++;
  const pM = pOK ? p.messageTokens : raw;
  const incumbent = Math.min(raw, ch, sM);
  sumRaw += raw; sumChiron += ch; sumStichos += sM; sumPeriodos += Math.min(pM, raw); sumIncumbent += incumbent;
  if (s.winner !== 'raw') stichosApplied++;
  if (p.winner !== 'raw') periodosApplied++;
  if (pM + 3 < incumbent) { periodosWins++; }
  if (pM + 3 < sM) periodosWinsVsStichos++;
  const row = `${path.relative(process.cwd(), f).padEnd(62)} raw=${String(raw).padStart(6)} chiron=${String(ch).padStart(6)} stichos=${String(sM).padStart(6)} periodos=${String(Math.min(pM, raw)).padStart(6)} ${p.winner.padEnd(16)} wrapped=${p.wrapped} Δvs-incumbent=${Math.min(pM, raw) - incumbent} ${pOK ? '' : 'DECODE-FAIL'}`;
  rows.push(row);
  process.stdout.write(row + '\n'); // stream rows so partial runs keep their data
  if (n % 20 === 0) console.error(`progress ${n}/${files.length}`);
}
console.log(`\nfiles=${n} exact-failures=${exactFail} contract=${T(PERIODOS_CONTRACT)} tokens`);
console.log(`totals: raw=${sumRaw} chiron=${sumChiron} stichos(min raw/chiron/stichos)=${sumStichos} incumbent(min raw,chiron,stichos)=${sumIncumbent} periodos(min incl. raw)=${sumPeriodos}`);
console.log(`PERIODOS Δ vs incumbent = ${sumPeriodos - sumIncumbent} tokens (${(((sumIncumbent - sumPeriodos) / sumIncumbent) * 100).toFixed(2)}% smaller); strict wins vs incumbent=${periodosWins}; strict wins vs STICHOS-family=${periodosWinsVsStichos}; periodos applied=${periodosApplied}; stichos applied=${stichosApplied}`);
