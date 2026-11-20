import * as fs from 'node:fs';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const l of fs.readFileSync('bench/x143/receipts/parent.jsonl','utf8').trim().split('\n')){const a=JSON.parse(l);console.log(JSON.stringify({path:a.path,A:a.A,B:a.B,parentPayloadTokens:encode(a.parentMessage).length,paidHeaderMarginal:a.B-encode(a.parentMessage).length,exceptions:a.exceptions}));}
