import fs from 'node:fs';import {tagstackEncode} from '../../src/lib/omega/tagstack';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {kenomaPlan,kenomaCandidate,kenomaRead} from '../../src/lib/omega/kenoma';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const base=fs.readFileSync('bench/x152/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));const strong=JSON.parse(fs.readFileSync('bench/x152/receipts/wrapper.json','utf8')).rows;
const out='bench/x153/receipts/trials.jsonl';fs.writeFileSync(out,'');
for(const path of ['bench/holdout/json-pkg.txt','bench/x152/fixtures/chalk-package.json','bench/x152/fixtures/vscode-json-package.json']){
 const bytes=fs.readFileSync(path),source=bytes.toString('utf8'),inc=strong.find((r:any)=>r.path===path)??base.find((r:any)=>r.path===path);const p=kenomaPlan(source);if(!p)throw Error('no plan');
 const cpu=process.cpuUsage(),start=performance.now(),parent=tagstackEncode(p.folded),candidate=kenomaCandidate(source,parent.message,readPlainParent),c=process.cpuUsage(cpu);
 if(parent.decoded!==p.folded||!parent.exact||!parent.frontierComplete)throw Error('parent failed');if(candidate&&!Buffer.from(kenomaRead(candidate.message,readPlainParent)).equals(bytes))throw Error('source');
 const row={path,incumbent:inc.tokens,sites:p.sites,child:parent.messageTokens,candidate:candidate?.tokens??null,gain:candidate?inc.tokens-candidate.tokens:null,message:candidate?.message??null,folded:p.folded,parent:parent.message,ms:performance.now()-start,cpuMs:(c.user+c.system)/1000};fs.appendFileSync(out,JSON.stringify(row)+'\n');console.log(JSON.stringify({...row,message:undefined,folded:undefined,parent:undefined}));
}
