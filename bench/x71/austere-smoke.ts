import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { austereEncode } from '../../src/lib/omega/austere';
import { brachysEncode } from '../../src/lib/omega/brachys';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = austereEncode(text, enc);
  const b: any = brachysEncode(text, enc);
  console.error(`${p}\n  raw ${countTokens(text, enc)} | frontier ${a.frontierTokens} | brachys ${b.messageTokens} | austere ${a.messageTokens} (contract ${a.contractTokens}, band ${a.band}) applied=${a.applied} exact=${a.decoded === text}\n  contract: ${a.contract}\n  ${a.tried.join(' ')}`);
}
