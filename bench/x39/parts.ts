import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc:any='o200k_base';
const d = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for (const c of d) {
  const msg = c.message;
  const nl = msg.indexOf('\n');
  const contract = nl >= 0 ? msg.slice(0, nl) : '';
  const body = nl >= 0 ? msg.slice(nl+1) : msg;
  const p = body.indexOf('\u00b6');
  const tape = p >= 0 ? body.slice(1, p) : body;
  const payload = p >= 0 ? body.slice(p+1) : '';
  console.log(c.lane.split('/').pop().padEnd(24),
    'M='+String(c.oneChat).padStart(5),
    'contract='+String(countTokens(contract+'\n',enc)).padStart(4),
    'tape='+String(countTokens('\u00a7'+tape+'\u00b6',enc)).padStart(5),
    'payload='+String(countTokens(payload,enc)).padStart(5),
    'rules≈'+(tape.match(/[\p{L}]/gu)||[]).length,
    'hdr='+c.header);
}
