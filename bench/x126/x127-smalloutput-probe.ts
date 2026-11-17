import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;
for (const p of ['bench/holdout-x42b/uptime-w.txt','bench/holdout-x42/lsblk.txt','bench/holdout-x42b/free-m.txt','bench/holdout-md/cue-sheet.md','bench/holdout-x42b/vmstat.txt']) {
  if(!fs.existsSync(p)) { console.log(`${p} MISSING`); continue; }
  const src=fs.readFileSync(p,'utf8');
  const r=tagstackEncode(src,enc);
  console.log(`\n=== ${p} raw=${countTokens(src,enc)} M=${countTokens(r.message,enc)} len=${src.length}`);
  console.log('   notes:', r.notes.slice(0,600).replace(/\n/g,' | '));
}
