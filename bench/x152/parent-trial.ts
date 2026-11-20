import fs from 'node:fs';import {tagstackEncode} from '../../src/lib/omega/tagstack';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {homosemaPlans,homosemaCandidate,homosemaRead} from '../../src/lib/omega/homosema';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const path=process.argv[2]||'bench/holdout/json-pkg.txt',out=process.argv[3]||'bench/x152/receipts/parent.jsonl',sourceBytes=fs.readFileSync(path),source=sourceBytes.toString('utf8');if(!Buffer.from(source).equals(sourceBytes))throw Error('UTF8 source');
const old=fs.readFileSync('bench/x151/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)).find(r=>r.path===path);let incumbent=old;
if(old&&old.text!==source)throw Error('baseline source changed');
if(!incumbent){const b=tagstackEncode(source);incumbent={tokens:b.messageTokens,message:b.message,text:source};fs.writeFileSync(out+'.baseline.json',JSON.stringify(incumbent));}
fs.writeFileSync(out,'');
for(const p of homosemaPlans(source).filter(p=>process.argv[4]!=='close'||p.mode.separator===null)){
 const cpu=process.cpuUsage(),start=performance.now(),parent=tagstackEncode(p.folded),candidate=homosemaCandidate(source,p.mode,parent.message,readPlainParent);
 if(parent.decoded!==p.folded||!parent.exact||!parent.frontierComplete)throw Error('folded parent invalid');
 const c=process.cpuUsage(cpu);if(candidate&&!Buffer.from(homosemaRead(candidate.message,readPlainParent)).equals(sourceBytes))throw Error('source mismatch');
 const row={path,mode:p.mode,incumbent:incumbent.tokens,child:parent.messageTokens,candidate:candidate?.tokens??null,gain:candidate?incumbent.tokens-candidate.tokens:null,sourceRead:!!candidate,message:candidate?.message??null,folded:p.folded,parentMessage:parent.message,ms:performance.now()-start,cpuMs:(c.user+c.system)/1000};fs.appendFileSync(out,JSON.stringify(row)+'\n');console.log(JSON.stringify({...row,message:undefined,folded:undefined,parentMessage:undefined}));
}
