import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeDecodeResult, apographeEncode } from '../../src/lib/omega/apographe';
import { kolumnContractFor, kolumnDecode, kolumnEncodeTransform } from '../../src/lib/omega/kolumn';
const enc: any = 'o200k_base';
const path = process.argv[2] ?? 'bench/holdout-tab/vix-daily-1990.csv';
const text = fs.readFileSync(path, 'utf8');
const plan = kolumnEncodeTransform(text, enc);
if (!plan) throw new Error('no KOLUMN transform');
const contract = kolumnContractFor(plan.delimiters, plan.modes);
const direct = `${contract}\n${plan.wire}`;
const apg = apographeEncode(plan.wire, enc);
const apgDecoded = apographeDecodeResult(apg);
const parentMessage = `${apg.contract ? apg.contract + '\n' : ''}${apg.wire}`;
const composed = `${contract}\n${parentMessage}`;
const result = { path, sourceTokens: countTokens(text, enc), transformTokens: countTokens(plan.wire, enc),
  proxyTokens: plan.proxyTokens, rows: plan.rows, cols: plan.cols, modes: plan.modes,
  contractTokens: countTokens(contract, enc), directMessageTokens: countTokens(direct, enc),
  apographeMessageTokens: countTokens(parentMessage, enc), composedMessageTokens: countTokens(composed, enc),
  apographeExact: apgDecoded === plan.wire, exact: kolumnDecode(apgDecoded, plan.delimiters) === text,
  parentNotes: apg.notes };
console.log(JSON.stringify(result, null, 2));
