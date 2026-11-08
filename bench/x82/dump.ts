import * as fs from 'node:fs';
import { schemaEncode, schemaDecode } from '../../src/lib/omega/schema';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const r = schemaEncode(S, enc);
  console.log(`\n########## ${p} applied=${r.applied} F=${r.frontierTokens} M=${r.messageTokens}`);
  if (r.applied) {
    console.log('--- MESSAGE (first 40 lines) ---');
    console.log(r.message.split('\n').slice(0, 40).join('\n'));
    console.log('--- DECODE MATCHES SOURCE:', schemaDecode(r.message) === S);
  }
}
