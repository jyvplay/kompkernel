/** Zero-encoder: final frontier replay must equal the X119 A/B ON arm. */
import * as fs from 'node:fs';
const now=JSON.parse(fs.readFileSync(process.argv[2]??'bench/x119/receipts/final-frontier.json','utf8'));
const ab=JSON.parse(fs.readFileSync('bench/x119/receipts/ab.json','utf8'));
const byPath=new Map<string,any>(ab.rows.map((r:any)=>[r.path,r.on]));
const rows=now.rows.map((r:any)=>{const p=byPath.get(r.path);const identical=!!p&&p.tokens===r.tokens&&p.messageSHA256===r.messageSHA256&&p.tokenIdsSHA256===r.tokenIdsSHA256;return{path:r.path,tokens:r.tokens,expected:p?.tokens??null,identical,exact:r.exact};});
const identical=rows.filter((r:any)=>r.identical).length;
const out={schema:'kompkernel-x119-final-verification-v1',reference:'bench/x119/receipts/ab.json ON',sourceCommit:now.sourceCommit,lanes:rows.length,identical,total:now.total,expectedTotal:ab.totals.on,allIdentical:rows.length===29&&identical===29&&now.total===ab.totals.on&&rows.every((r:any)=>r.exact),rows};
fs.writeFileSync('bench/x119/receipts/final-verification.json',JSON.stringify(out,null,2)+'\n');
console.log(`X119 ON reproduced ${identical}/${rows.length}; total ${now.total} expected ${ab.totals.on}; exact ${rows.filter((r:any)=>r.exact).length}/${rows.length}`);
if(!out.allIdentical)process.exitCode=1;
