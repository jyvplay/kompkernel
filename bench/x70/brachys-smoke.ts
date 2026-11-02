import * as fs from 'node:fs';
import { brachysEncode, brachysDecodeMessage } from '../../src/lib/omega/brachys';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = brachysEncode(text, enc);
  const dec = r.brachys ? brachysDecodeMessage(r.message) : null;
  console.log(JSON.stringify({
    p, raw: countTokens(text, enc), frontier: r.frontierFloor, m: r.messageTokens,
    delta: r.messageTokens - r.frontierFloor, winner: r.brachysWinner, arm: r.brachysArm,
    contract: r.contractTokens, wire: r.wireTokens, dirs: r.dirs,
    readerExact: dec === text, exact: r.decoded === text, ms: r.ms,
  }));
  console.log('NOTES:', r.notes);
  if (r.brachys) {
    console.log('--- contract ---');
    console.log(r.contract);
    console.log('--- wire head ---');
    console.log(r.wire.slice(0, 500));
  }
}
