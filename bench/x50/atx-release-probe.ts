import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { ATX_RELEASE_CONTRACT, atxReleaseTransform } from '../../src/lib/omega/atx-release';

const path = process.argv[2] ?? 'bench/z57/lanes/prose-changelog.md';
const encoding = 'o200k_base' as const;
const source = fs.readFileSync(path, 'utf8');
const plan = atxReleaseTransform(source);
if (!plan) throw new Error(`ATX-RELEASE did not plan for ${path}`);
const rawSource = countTokens(source, encoding);
const rawTransformed = countTokens(plan.text, encoding);
const plain = daedalusEncode(source, encoding);
const transformed = daedalusEncode(plan.text, encoding);
const akolouthia2 = akolouthia2Encode(source, encoding);
const daedalusPlusRule = countTokens(`${ATX_RELEASE_CONTRACT}\n${transformed.decoderPrompt}`, encoding);
const result = {
  scope: 'exploratory raw/DAEDALUS candidate-cost probe plus AKOLOUTHIA-2 parent check; not the complete TAGSTACK/SIBLING-TEMPLATE frontier tournament',
  lane: path,
  sourceSha256: crypto.createHash('sha256').update(source, 'utf8').digest('hex'),
  sourceChars: source.length,
  encoding,
  runtime: { node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null },
  rows: plan.rows,
  transformExact: plan.text !== source && plan.rows > 0,
  rawTokens: { source: rawSource, transformed: rawTransformed, delta: rawTransformed - rawSource },
  daedalus: {
    sourceMessageTokens: plain.messageTokens,
    transformedMessageTokens: transformed.messageTokens,
    withAtxContract: daedalusPlusRule,
    deltaVsSource: daedalusPlusRule - plain.messageTokens,
  },
  measuredFrontierMember: {
    codec: 'akolouthia2',
    arm: akolouthia2.arm,
    messageTokens: countTokens(akolouthia2.decoderPrompt, encoding),
    equalsDaedalus: countTokens(akolouthia2.decoderPrompt, encoding) === plain.messageTokens,
    exact: akolouthia2.exact && akolouthia2.decoded === source,
    notes: akolouthia2.notes,
  },
};
fs.mkdirSync('bench/x50/receipts', { recursive: true });
fs.writeFileSync('bench/x50/receipts/atx-release-probe.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
