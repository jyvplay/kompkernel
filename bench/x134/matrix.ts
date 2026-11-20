import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape} from '../../src/lib/omega/chiron';
const ct=(s:string)=>countTokens(s,'o200k_base');
const totals:any={}; const rows:any[]=[];
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),m=a.message as string,at=m.indexOf('§'),end=m.indexOf('¶',at);
 if(at<0||end<0)continue;
 const tape=m.slice(at+1,end),script=CHIRON_SCRIPTS.find(s=>tape.length&&chironInScript(s,tape.codePointAt(0)!));
 const rs=script?chironParseTape(tape,script):null;if(!rs)continue;
 const gs=new Set(rs.map(r=>r.glyph)),body=[...m.slice(end+1)]; const matrix:any={};
 const cls=(c:string)=>!c?'edge':gs.has(c)?'glyph':/[\r\n]/.test(c)?'newline':/[0-9]/.test(c)?'digit':/[A-Za-z]/.test(c)?'Latin':/\s/.test(c)?'space':'punctuation';
 for(let i=0;i<body.length;i++){const g=body[i];if(!gs.has(g))continue;const l=body[i-1]??'',r=body[i+1]??'',key=cls(l)+'/'+cls(r),d=ct(l+g+r)-ct(l+r);
  for(const dst of [matrix,totals]){dst[key]??={sites:0,marginalSum:0,nonpositive:0};dst[key].sites++;dst[key].marginalSum+=d;if(d<=0)dst[key].nonpositive++;}
 }
 rows.push({path:a.path,matrix});
}
console.log(JSON.stringify({metric:'3-character marginal, NOT an exact whole-message deletion cost',totals,rows},null,2));
