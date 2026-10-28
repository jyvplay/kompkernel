import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { kolumnEncode } from '../../src/lib/omega/kolumn';

const enc: any = 'o200k_base';
const ALL_CASES: Array<[string, string]> = [
  ['vix-daily-1990.csv', 'bench/holdout-tab/vix-daily-1990.csv'],
  ['aapl-2014.csv', 'bench/holdout-tab/aapl-2014.csv'],
  ['markdown-table.md', 'bench/holdout-tbl/markdown-table.md'],
  ['psql-output.txt', 'bench/holdout-tbl/psql-output.txt'],
  ['kubectl-get-pods.txt', 'bench/holdout-tbl/kubectl-get-pods.txt'],
  ['metrics.tsv', 'bench/holdout-x40/metrics.tsv'],
  ['prices.csv', 'bench/holdout-x40/prices.csv'],
];
const requested = process.argv[2];
const CASES = requested && requested !== 'all' ? ALL_CASES.filter(([lane]) => lane === requested) : ALL_CASES;
if (requested && requested !== 'all' && CASES.length === 0) throw new Error(`unknown lane: ${requested}`);
const rows: any[] = [];
let failures = 0;
for (const [lane, path] of CASES) {
  const started = Date.now();
  const text = fs.readFileSync(path, 'utf8');
  const sourceSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const rawTokens = countTokens(text, enc);
  const tag = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tag);
  const r = kolumnEncode(text, enc, tag, sibling);
  const frontierTokens = Math.min(...Object.values(tag.frontierCosts));
  const frontierComplete = tag.frontierComplete === true && tag.parentTokens === frontierTokens;
  const exact = Buffer.compare(Buffer.from(r.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const countConsistent = countTokens(r.message, enc) === r.messageTokens;
  const strictWin = r.applied && r.candidateExact === true && r.candidateTokens !== null && r.candidateTokens < frontierTokens;
  const gateConsistent = r.applied ? strictWin && r.messageTokens === r.candidateTokens
    : r.messageTokens === Math.min(tag.messageTokens, sibling.messageTokens);
  const noRegression = r.messageTokens <= Math.min(tag.messageTokens, sibling.messageTokens);
  const row = { lane, path, sourceSha256, chars: text.length, rawTokens,
    frontier: { M: frontierTokens, winner: tag.parentCodec, complete: tag.frontierComplete,
      costs: tag.frontierCosts },
    tagstack: { M: tag.messageTokens, applied: tag.applied, exact: tag.decoded === text, ms: tag.ms },
    sibling: { M: sibling.messageTokens, applied: sibling.applied, exact: sibling.decoded === text, ms: sibling.ms },
    KOLUMN: { M: r.messageTokens, candidateM: r.candidateTokens, candidateExact: r.candidateExact,
      applied: r.applied, exact, parent: r.parentCodec, parentM: r.parentTokens,
      rows: r.rows, cols: r.cols, modes: r.modes, ms: r.ms, notes: r.notes },
    checks: { frontierComplete, exact, countConsistent, strictWin, gateConsistent, noRegression },
    deltaToFrontier: r.messageTokens - frontierTokens, candidateDeltaToFrontier: r.candidateTokens === null ? null : r.candidateTokens - frontierTokens,
    totalMs: Date.now() - started };
  rows.push(row);
  if (!frontierComplete || !exact || !countConsistent || !gateConsistent || !noRegression) failures++;
  if (r.candidateMessage) fs.writeFileSync(`bench/x48/receipts/${lane}.kolumn-candidate-message.txt`, r.candidateMessage);
  fs.writeFileSync(`bench/x48/receipts/${lane}.kolumn-output-message.txt`, r.message);
  console.log(`${frontierComplete && exact && gateConsistent && noRegression ? 'PASS' : 'FAIL'} ${lane.padEnd(22)} `
    + `raw=${rawTokens} front=${frontierTokens} KOLUMN=${r.messageTokens} candidate=${r.candidateTokens ?? '-'} `
    + `applied=${r.applied} modes=${r.modes.join(',')} ms=${Date.now() - started}`);
}
const summary = { codec: 'KOLUMN', encoding: enc, lanes: rows.length, failures,
  measuredFrontier: 'Runtime TAGSTACK parents (SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, eligible METRON/HEMERA) plus SIBLING-TEMPLATE; not a registry-wide tournament.',
  strictWins: rows.filter(r => r.KOLUMN.applied && r.checks.strictWin).length,
  exact: rows.filter(r => r.checks.exact).length, noRegression: rows.filter(r => r.checks.noRegression).length,
  sourceFiles: CASES.map(([lane, path]) => ({ lane, path })) };
fs.writeFileSync('bench/x48/receipts/kolumn-verify.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
