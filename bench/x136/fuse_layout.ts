import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const line of fs.readFileSync('bench/x136/receipts/layout.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),at=a.message.indexOf('§'),wire=a.message.slice(at);
 // Wording trials only; not a new mechanism or model-reading certificate.
 for(const key of [
 '¶ k=v; expand repeatedly, then greedy-wrap ↵W| paragraphs to W columns (drop prefix); print only.\n',
 '¶k=v expand fully; ↵W|: greedy-wrap paragraphs to W columns; print only.\n',
 'Expand ¶ k=v; replace ↵W|paragraph by its greedy W-column wrap.\n',
 '¶k=v expand recursively; ↵W|paragraph → greedy W-column wrap. Print only.\n',
 ])console.log(JSON.stringify({path:a.path,A:a.A,B:ct(key+wire),delta:ct(key+wire)-a.A,key,message:key+wire,ambiguousNativeReadingUntested:true}));
}
