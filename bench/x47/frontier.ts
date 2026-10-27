import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { tagstackEncode } from '@/lib/omega/tagstack';

const LANES: Array<[string, string]> = [
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
const enc: any = 'o200k_base';
const rows: any[] = [];
let failures = 0;

for (const [lane, path] of LANES) {
  const text = fs.readFileSync(path, 'utf8');
  const r = tagstackEncode(text, enc);
  const costs = Object.entries(r.frontierCosts).map(([codec, messageTokens]) => ({
    codec, messageTokens, reportedMessageTokens: r.frontierReportedCosts[codec as keyof typeof r.frontierReportedCosts] ?? null,
    exact: true,
  }));
  const min = Math.min(...costs.map(x => x.messageTokens));
  const exact = Buffer.compare(Buffer.from(r.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const row = {
    lane, path, sourceSha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length, rawTokens: countTokens(text, enc), parents: Object.fromEntries(costs.map(x => [x.codec, {
      messageTokens: x.messageTokens, reportedMessageTokens: x.reportedMessageTokens, exact: x.exact,
    }])), winner: r.parentCodec, winnerTokens: min, frontierComplete: r.frontierComplete,
    outputTokens: r.messageTokens, outputExact: exact, noRegression: r.messageTokens <= min,
    candidateApplied: r.applied, candidateTokens: r.candidateTokens,
  };
  if (!r.frontierComplete || !exact || !row.noRegression) failures++;
  rows.push(row);
  console.log(`${failures ? 'CHECK' : 'PASS'} ${lane.padEnd(18)} parents=${costs.length} `
    + `winner=${row.winner}:${row.winnerTokens} output=${r.messageTokens} applied=${r.applied}`);
}

const summary = {
  encoding: enc, lanes: rows.length, exact: rows.filter(r => r.outputExact).length, failures,
  costDefinition: 'direct token count over each complete in-band message (contract + LF + wire, or the codec’s complete decoderPrompt)',
  currentFrontierScope: 'same-source minimum of SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, and eligible METRON/HEMERA; not a registry-wide tournament',
  sourceFiles: LANES.map(([lane, path]) => ({ lane, path })),
};
fs.mkdirSync('bench/x47/receipts', { recursive: true });
fs.writeFileSync('bench/x47/receipts/frontier.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
