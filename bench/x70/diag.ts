import * as fs from 'node:fs';
import { hyleEncode } from '../../src/lib/omega/hyle';
import { brachysContractFor, brachysFacts } from '../../src/lib/omega/brachys';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const h: any = hyleEncode(text, enc, { fast: true });
  const nl = h.wire.indexOf('\n');
  const dirs = h.wire.startsWith('¦') && nl > 0 ? h.wire.slice(1, nl).split(';') : [];
  const nonB = dirs.filter((d: string) => d[0] !== 'B');
  const contract = brachysContractFor(nonB);
  console.log(JSON.stringify({
    p, raw: countTokens(text, enc), hyleM: h.messageTokens, sentinel: h.wire.startsWith('¦'),
    dirs: nonB, folds: h.folds, arm: h.arm, exact: h.decoded === text,
    contractTok: contract ? countTokens(contract, enc) : 0,
    wireTok: h.wire.startsWith('¦') ? countTokens(h.wire.slice(nl + 1), enc) : null,
    hasI: nonB.some((d: string) => d[0] === 'I'),
  }));
}
