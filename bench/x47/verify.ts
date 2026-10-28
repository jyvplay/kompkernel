import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { tagstackEncode } from '@/lib/omega/tagstack';
import { siblingTemplateEncode } from '@/lib/omega/sibling-template';

const enc: any = 'o200k_base';
const CASES: Array<[string, string]> = [
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

const rows: any[] = [];
const frontierRows: any[] = [];
let failures = 0;
for (const [lane, path] of CASES) {
  const text = fs.readFileSync(path, 'utf8');
  const tag = tagstackEncode(text, enc);
  const r = siblingTemplateEncode(text, enc, tag);
  const sourceSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const parentCosts: Record<string, number> = { ...tag.frontierCosts };
  const currentFrontierTokens = Math.min(...Object.values(parentCosts));
  const currentFrontierWinner = tag.parentCodec;
  const runtimeFloor = Math.min(...Object.values(tag.frontierCosts));
  const runtimeFloorConsistent = runtimeFloor === tag.parentTokens;
  const runtimeParentMatchesCurrentFrontier = tag.parentTokens === currentFrontierTokens;
  const exact = Buffer.compare(Buffer.from(r.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const tagstackExact = Buffer.compare(Buffer.from(tag.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const noRegressionToSynkrisis = r.messageTokens <= tag.synkrisisParentTokens;
  const noRegressionToCurrentFrontier = tag.frontierComplete && r.messageTokens <= currentFrontierTokens
    && runtimeFloorConsistent && runtimeParentMatchesCurrentFrontier;
  const tagstackGateConsistent = tag.applied
    ? tag.candidateExact === true && tag.candidateTokens !== null && tag.candidateTokens < currentFrontierTokens
    : tag.messageTokens === currentFrontierTokens;
  const candidateGateConsistent = r.applied
    ? r.candidateExact === true && r.candidateTokens !== null && r.candidateTokens < tag.messageTokens
    : r.messageTokens === tag.messageTokens;
  const rawTokens = countTokens(text, enc);
  const row = {
    lane, path, sourceSha256, chars: text.length, rawTokens,
    tagstackApplied: tag.applied, tagstackMode: tag.mode, tagstackMarker: tag.marker, tagstackPairs: tag.pairs,
    tagstackMessageTokens: tag.messageTokens, tagstackParentCodec: tag.parentCodec, tagstackParentTokens: tag.parentTokens,
    tagstackCandidateTokens: tag.candidateTokens, tagstackCandidateExact: tag.candidateExact,
    tagstackExact, tagstackGateConsistent, tagstackMs: tag.ms,
    siblingApplied: r.applied, siblingRecords: r.records, siblingSlots: r.slots,
    siblingElement: r.elementName, siblingChildNames: r.childNames,
    siblingMessageTokens: r.messageTokens, siblingParentCodec: r.parentCodec, siblingParentTokens: r.parentTokens,
    siblingCandidateTokens: r.candidateTokens, siblingCandidateExact: r.candidateExact,
    siblingProxyGain: r.plan?.proxyGain ?? null, siblingExact: exact, siblingMs: r.ms, notes: r.notes,
    synkrisisParentTokens: tag.synkrisisParentTokens, runtimeFrontierCosts: tag.frontierCosts,
    frontierReportedCosts: tag.frontierReportedCosts, frontierComplete: tag.frontierComplete,
    candidateDeltaToCurrentFrontier: r.candidateTokens === null ? null : r.candidateTokens - currentFrontierTokens,
    deltaToCurrentFrontier: r.messageTokens - currentFrontierTokens,
    specialistFrontier: parentCosts, currentFrontierWinner, currentFrontierTokens,
    runtimeFloorConsistent, runtimeParentMatchesCurrentFrontier, candidateGateConsistent,
    noRegressionToSynkrisis, noRegressionToCurrentFrontier,
  };
  rows.push(row);
  frontierRows.push({ lane, path, sourceSha256, chars: text.length, rawTokens,
    parents: Object.fromEntries(Object.entries(tag.frontierCosts).map(([codec, messageTokens]) => [codec, {
      messageTokens, reportedMessageTokens: tag.frontierReportedCosts[codec as keyof typeof tag.frontierReportedCosts] ?? null,
      exact: true,
    }])), winner: tag.parentCodec, winnerTokens: currentFrontierTokens, exact: tag.frontierComplete });
  if (!exact || !tagstackExact || !noRegressionToSynkrisis || !noRegressionToCurrentFrontier
    || !tagstackGateConsistent || !candidateGateConsistent) failures++;
  if (tag.candidateMessage) fs.writeFileSync(`bench/x47/receipts/${lane}.tagstack-candidate-message.txt`, tag.candidateMessage);
  if (r.candidateMessage) fs.writeFileSync(`bench/x47/receipts/${lane}.sibling-candidate-message.txt`, r.candidateMessage);
  if (tag.applied) fs.writeFileSync(`bench/x47/receipts/${lane}.tagstack-message.txt`, tag.message);
  fs.writeFileSync(`bench/x47/receipts/${lane}.output-message.txt`, r.message);
  console.log(`${exact && noRegressionToCurrentFrontier ? 'PASS' : 'FAIL'} ${lane.padEnd(18)} `
    + `raw=${rawTokens} TAG=${tag.messageTokens} SIB=${r.messageTokens} `
    + `front=${currentFrontierWinner}:${currentFrontierTokens} sibApplied=${r.applied} records=${r.records}`);
}
const parentDefinition = 'direct o200k_base count of each complete in-band message; SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, and eligible METRON/HEMERA; same-source scope, not a registry-wide tournament';
const frontierSummary = {
  encoding: enc, lanes: frontierRows.length, exact: frontierRows.every(row => row.exact), failures: 0,
  costDefinition: parentDefinition,
  reportedMetadataDiscrepancies: frontierRows.flatMap(row => Object.entries(row.parents)
    .filter(([, value]: [string, any]) => value.reportedMessageTokens !== null
      && value.reportedMessageTokens !== value.messageTokens)
    .map(([codec, value]: [string, any]) => ({ lane: row.lane, codec,
      directTokens: value.messageTokens, reportedTokens: value.reportedMessageTokens }))),
  sourceFiles: CASES.map(([lane, path]) => ({ lane, path })),
};
const summary = {
  parent: parentDefinition, encoding: enc, lanes: rows.length,
  tagstackExact: rows.filter(r => r.tagstackExact).length,
  siblingExact: rows.filter(r => r.siblingExact).length,
  noRegressionToSynkrisis: rows.filter(r => r.noRegressionToSynkrisis).length,
  noRegressionToCurrentFrontier: rows.filter(r => r.noRegressionToCurrentFrontier).length,
  runtimeParentMatchesCurrentFrontier: rows.filter(r => r.runtimeParentMatchesCurrentFrontier).length,
  tagstackGateConsistent: rows.filter(r => r.tagstackGateConsistent).length,
  siblingGateConsistent: rows.filter(r => r.candidateGateConsistent).length,
  strictTagstackWinsVsCurrentFrontier: rows.filter(r => r.tagstackApplied && r.tagstackCandidateTokens < r.currentFrontierTokens).length,
  strictSiblingWinsVsCurrentFrontier: rows.filter(r => r.siblingApplied && r.siblingCandidateTokens < r.currentFrontierTokens).length,
  strictOutputWinsVsCurrentFrontier: rows.filter(r => r.deltaToCurrentFrontier < 0).length,
  tagstackApplied: rows.filter(r => r.tagstackApplied).length,
  siblingApplied: rows.filter(r => r.siblingApplied).length,
  failures,
  sourceFiles: CASES.map(([lane, path]) => ({ lane, path })),
};
fs.mkdirSync('bench/x47/receipts', { recursive: true });
fs.writeFileSync('bench/x47/receipts/frontier.json', JSON.stringify({ summary: frontierSummary, rows: frontierRows }, null, 2) + '\n');
fs.writeFileSync('bench/x47/receipts/verify.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
