import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { nestEncode } from '../../src/lib/omega/nest';

const enc: any = 'o200k_base';
const ALL_CASES: Array<[string, string]> = [
  ['page.html', 'bench/holdout-mk/page.html'],
  ['chart.svg', 'bench/holdout-mk/chart.svg'],
  ['pom.xml', 'bench/holdout-mk/pom.xml'],
  ['component.jsx', 'bench/holdout-mk/component.jsx'],
  ['dump.sql', 'bench/holdout-mk/dump.sql'],
  ['paper.tex', 'bench/holdout-mk/paper.tex'],
  ['agent-history.md', 'bench/holdout-mk/agent-history.md'],
  ['apache-maven.pom.xml', 'bench/x47/holdouts/apache-maven.pom.xml'],
  ['commons-lang.pom.xml', 'bench/x47/holdouts/commons-lang.pom.xml'],
];
const requested = process.argv[2];
const CASES = requested && requested !== 'all'
  ? ALL_CASES.filter(([lane]) => lane === requested)
  : ALL_CASES;
if (requested && requested !== 'all' && CASES.length === 0) throw new Error(`unknown verify lane: ${requested}`);

const rows: any[] = [];
let failures = 0;
for (const [lane, path] of CASES) {
  const start = Date.now();
  const text = fs.readFileSync(path, 'utf8');
  const sourceSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const rawTokens = countTokens(text, enc);
  const tag = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tag);
  const r = nestEncode(text, enc, tag, sibling);
  const frontierTokens = Math.min(...Object.values(tag.frontierCosts));
  const frontierComplete = tag.frontierComplete === true
    && tag.parentTokens === frontierTokens
    && sibling.messageTokens <= tag.messageTokens;
  const exact = Buffer.compare(Buffer.from(r.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const tagExact = Buffer.compare(Buffer.from(tag.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const siblingExact = Buffer.compare(Buffer.from(sibling.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const countConsistent = countTokens(r.message, enc) === r.messageTokens;
  const strictWin = r.applied && r.candidateExact === true && r.candidateTokens !== null
    && r.candidateTokens < frontierTokens;
  const gateConsistent = r.applied ? strictWin && r.messageTokens === r.candidateTokens
    : r.messageTokens === Math.min(tag.messageTokens, sibling.messageTokens);
  const noRegression = r.messageTokens <= Math.min(tag.messageTokens, sibling.messageTokens);
  const row = {
    lane, path, sourceSha256, chars: text.length, rawTokens,
    TAGSTACK: { M: tag.messageTokens, parent: tag.parentCodec, parentM: tag.parentTokens,
      exact: tagExact, frontierComplete: tag.frontierComplete, frontierCosts: tag.frontierCosts,
      candidateM: tag.candidateTokens, applied: tag.applied, ms: tag.ms },
    SIBLING_TEMPLATE: { M: sibling.messageTokens, parent: sibling.parentCodec, parentM: sibling.parentTokens,
      exact: siblingExact, candidateM: sibling.candidateTokens, applied: sibling.applied,
      records: sibling.records, slots: sibling.slots, ms: sibling.ms },
    NEST: { M: r.messageTokens, parent: r.parentCodec, parentM: r.parentTokens,
      exact, applied: r.applied, candidateM: r.candidateTokens, candidateExact: r.candidateExact,
      records: r.records, slots: r.slots, depth: r.depth, elementName: r.elementName,
      proxyGain: r.plan?.proxyGain ?? null, ms: r.ms, notes: r.notes },
    currentFrontier: { M: frontierTokens, winner: tag.parentCodec, costs: tag.frontierCosts },
    deltas: { nestToFrontier: r.messageTokens - frontierTokens,
      candidateToFrontier: r.candidateTokens === null ? null : r.candidateTokens - frontierTokens },
    checks: { frontierComplete, exact, tagExact, siblingExact, countConsistent,
      strictWin, gateConsistent, noRegression },
    totalMs: Date.now() - start,
  };
  rows.push(row);
  if (!frontierComplete || !exact || !tagExact || !siblingExact || !countConsistent || !gateConsistent || !noRegression) failures++;
  if (r.candidateMessage) fs.writeFileSync(`bench/x48/receipts/${lane}.nest-candidate-message.txt`, r.candidateMessage);
  fs.writeFileSync(`bench/x48/receipts/${lane}.output-message.txt`, r.message);
  console.log(`${frontierComplete && exact && gateConsistent && noRegression ? 'PASS' : 'FAIL'} ${lane.padEnd(22)} `
    + `raw=${rawTokens} front=${frontierTokens} NEST=${r.messageTokens} `
    + `applied=${r.applied} records=${r.records} slots=${r.slots} depth=${r.depth} `
    + `ms=${Date.now() - start}`);
}
const summary = {
  codec: 'NEST', encoding: enc, lanes: rows.length, failures,
  measuredFrontier: 'The runtime TAGSTACK same-source parent set (SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, eligible METRON/HEMERA) plus SIBLING-TEMPLATE; not a registry-wide tournament.',
  strictWins: rows.filter(r => r.NEST.applied && r.checks.strictWin).length,
  exact: rows.filter(r => r.checks.exact).length,
  noRegression: rows.filter(r => r.checks.noRegression).length,
  sourceFiles: CASES.map(([lane, path]) => ({ lane, path })),
};
fs.writeFileSync('bench/x48/receipts/verify.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
