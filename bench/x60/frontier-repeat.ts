import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';

const enc: any = 'o200k_base';
const lane = process.argv[2] ?? 'metrics.tsv';
const allowed: Record<string, string> = {
  'metrics.tsv': 'bench/holdout-x40/metrics.tsv',
};
const path = allowed[lane];
if (!path) throw new Error(`unsupported repeat lane: ${lane}`);
const text = fs.readFileSync(path, 'utf8');
const started = Date.now();
const tag = tagstackEncode(text, enc);
const sibling = siblingTemplateEncode(text, enc, tag);
const frontierTokens = Math.min(...Object.values(tag.frontierCosts));
const exact = Buffer.compare(Buffer.from(tag.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0
  && Buffer.compare(Buffer.from(sibling.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
const previousGatePath = 'bench/x48/receipts/kolumn-verify.json';
const prior = fs.existsSync(previousGatePath)
  ? JSON.parse(fs.readFileSync(previousGatePath, 'utf8')).rows?.find((row: any) => row.lane === lane)
  : null;
const receipt = {
  configuration: {
    lane, path, encoding: enc, OMEGA_DET: process.env.OMEGA_DET ?? null,
    node: process.version,
    cost: 'direct o200k_base count of each complete in-band parent message',
    scope: 'TAGSTACK runtime parents (SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, eligible METRON/HEMERA) plus SIBLING-TEMPLATE; not a registry-wide tournament',
  },
  source: {
    sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length, rawTokens: countTokens(text, enc),
  },
  result: {
    frontierComplete: tag.frontierComplete,
    exact,
    frontierTokens,
    winner: tag.parentCodec,
    frontierCosts: tag.frontierCosts,
    tagstack: { messageTokens: tag.messageTokens, applied: tag.applied, ms: tag.ms },
    sibling: { messageTokens: sibling.messageTokens, applied: sibling.applied, ms: sibling.ms },
    repeatMatchesPreviousGate: prior ? prior.frontier.M === frontierTokens : null,
    previousGateTokens: prior?.frontier.M ?? null,
    totalMs: Date.now() - started,
  },
};
fs.mkdirSync('bench/x60/receipts', { recursive: true });
fs.writeFileSync('bench/x60/receipts/frontier-repeat-x60.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!exact || !tag.frontierComplete || tag.parentTokens !== frontierTokens
  || sibling.messageTokens > frontierTokens) process.exitCode = 1;
