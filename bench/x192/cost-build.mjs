import fs from 'node:fs';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const p='bench/x192/receipts/portfolio-messages.json',x=JSON.parse(fs.readFileSync(p,'utf8'));for(const r of x.rows){r.tokens=encode(r.message).length;r.rawTokens=encode(fs.readFileSync(r.path,'utf8')).length;}
fs.writeFileSync('bench/x192/receipts/portfolio-costs.json',JSON.stringify({checks:x.checks,rows:x.rows.map(({message,...r})=>r)},null,2));
