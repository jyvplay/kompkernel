import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeDecodeResult, apographeEncode } from '../../src/lib/omega/apographe';
import { kolumnContractFor, kolumnDecode, kolumnEncodeTransform } from '../../src/lib/omega/kolumn';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';

const enc: any = 'o200k_base';
const path = process.argv[2] ?? 'bench/holdout-x40/metrics.tsv';
const source = fs.readFileSync(path, 'utf8');
const plan = kolumnEncodeTransform(source, enc);
if (!plan) throw new Error('no KOLUMN plan');
const contract = kolumnContractFor(plan.delimiters, plan.modes);
const apg = apographeEncode(plan.wire, enc);
const apgMessage = `${contract}\n${apg.contract ? apg.contract + '\n' : ''}${apg.wire}`;
const apgDecoded = apographeDecodeResult(apg);
const tag = tagstackEncode(plan.wire, enc);
const tagMessage = `${contract}\n${tag.message}`;
const tagDecoded = tag.decoded;
const sibling = siblingTemplateEncode(plan.wire, enc, tag);
const siblingMessage = `${contract}\n${sibling.message}`;
const candidates = [
  { parent: 'direct', message: `${contract}\n${plan.wire}`, exact: kolumnDecode(plan.wire, plan.delimiters) === source },
  { parent: 'APOGRAPHE', message: apgMessage, exact: kolumnDecode(apgDecoded, plan.delimiters) === source,
    parentTokensReported: apg.messageTokens, parentExact: apgDecoded === plan.wire },
  { parent: 'TAGSTACK-on-transformed', message: tagMessage, exact: kolumnDecode(tagDecoded, plan.delimiters) === source,
    parentTokensReported: tag.messageTokens, parentExact: tagDecoded === plan.wire, parentCodec: tag.parentCodec,
    frontierCosts: tag.frontierCosts, frontierComplete: tag.frontierComplete },
  { parent: 'SIBLING-on-transformed', message: siblingMessage,
    exact: kolumnDecode(sibling.decoded, plan.delimiters) === source, parentTokensReported: sibling.messageTokens,
    parentExact: sibling.decoded === plan.wire },
].map(c => ({ ...c, tokens: countTokens(c.message, enc) }));
console.log(JSON.stringify({ path, chars: source.length, sourceTokens: countTokens(source, enc),
  planTokens: countTokens(plan.wire, enc), contractTokens: countTokens(contract, enc), modes: plan.modes,
  candidates: candidates.sort((a,b)=>a.tokens-b.tokens) }, null, 2));
