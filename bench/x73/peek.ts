import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { codecEntries } from '../../src/lib/omega/registry';
const enc: any = 'o200k_base';
const t = fs.readFileSync(process.argv[2], 'utf8');
console.log('SOURCE tokens', countTokens(t, enc), JSON.stringify(t.slice(0, 120)));
for (const key of process.argv.slice(3)) {
  const e = codecEntries().find(x => x.key === key)!;
  const r: any = await e.run(t, enc);
  console.log(`--- ${key} tokens=${r.oneChat} exact=${r.decoded === t}`);
  console.log(JSON.stringify(r.output));
  console.log('note:', String(r.note).slice(0, 200));
}
