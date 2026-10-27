import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { atxReleaseEncode } from '../../src/lib/omega/atx-release';

const enc = 'o200k_base' as const;
const lane = process.argv[2] ?? 'prose-changelog';
const allowed: Record<string, string> = {
  'prose-changelog': 'bench/z57/lanes/prose-changelog.md',
};
const path = allowed[lane];
if (!path) throw new Error(`unsupported X50 lane: ${lane}`);
const text = fs.readFileSync(path, 'utf8');
const started = Date.now();
const result = atxReleaseEncode(text, enc);
const exactUtf8Bytes = Buffer.compare(Buffer.from(result.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
const receipt = {
  configuration: {
    lane, path, encoding: enc, OMEGA_DET: process.env.OMEGA_DET ?? null,
    node: process.version,
    cost: 'direct o200k_base count of each complete in-band message',
    scope: 'AKOLOUTHIA-2 necessary-condition precheck; full TAGSTACK runtime parents plus SIBLING-TEMPLATE are run only if the candidate beats AKOLOUTHIA-2; not registry-wide',
  },
  source: {
    sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length,
    rawTokens: countTokens(text, enc),
  },
  result: {
    exact: result.exact,
    exactUtf8Bytes,
    fullFrontierMeasured: result.fullFrontierMeasured,
    applied: result.applied,
    rows: result.rows,
    comparison: result.comparison,
    precheckParentTokens: result.precheckParentTokens,
    parentTokens: result.parentTokens,
    parentCodec: result.parentCodec,
    parentCosts: result.parentCosts,
    candidateTokens: result.candidateTokens,
    candidateMarginVsPrecheck: result.candidateTokens === null ? null : result.precheckParentTokens - result.candidateTokens,
    candidateExact: result.candidateExact,
    candidateParentTokens: result.candidateParentTokens,
    candidateParentCodec: result.candidateParentCodec,
    candidateParentCosts: result.candidateParentCosts,
    messageTokens: result.messageTokens,
    marginVsFallback: result.parentTokens - result.messageTokens,
    notes: result.notes,
    encodeMs: result.ms,
    totalMs: Date.now() - started,
  },
};
fs.mkdirSync('bench/x50/receipts', { recursive: true });
fs.writeFileSync('bench/x50/receipts/atx-release-changelog.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!result.exact || !exactUtf8Bytes || result.messageTokens > result.parentTokens
  || result.applied && !result.fullFrontierMeasured) process.exitCode = 1;
