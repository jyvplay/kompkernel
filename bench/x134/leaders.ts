/** Reuses X133's body-token classification, but names come from the wire parser. */
import * as fs from 'node:fs';
import {tokenStrings,countTokens} from '../../src/lib/omega/bpe';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape} from '../../src/lib/omega/chiron';
const old=JSON.parse(fs.readFileSync('bench/x133/receipts/x133-leaders.json','utf8'));
const groups:any={},rows:any[]=[];
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),m=a.message as string,at=m.indexOf('§'),end=m.indexOf('¶',at),name=a.path.split('/').pop();
 const category=old[name]?.[0]??'OTHER';
 const tape=at>=0&&end>=0?m.slice(at+1,end):'',script=CHIRON_SCRIPTS.find(s=>tape.length&&chironInScript(s,tape.codePointAt(0)!));
 const rules=script?chironParseTape(tape,script):null,G=new Set(rules?.map(r=>r.glyph)??[]);
 const classes:any={glyph:0,word:0,num:0,other:0};
 if(rules)for(const {s} of tokenStrings(m.slice(end+1),'o200k_base')){
  const k=[...s].some(c=>G.has(c))?'glyph':/^[\s]*[0-9][0-9.,:%\/]*$/.test(s)?'num':/[A-Za-zÀ-ɏ]/.test(s)?'word':'other';classes[k]++;
 }
 const leader=Object.keys(classes).sort((x,y)=>classes[y]-classes[x])[0];
 rows.push({path:a.path,category,raw:countTokens(a.text,'o200k_base'),tokens:a.tokens,hasTape:!!rules,classes,leader:rules?leader:null});
 groups[category]??={lanes:0,tapeLanes:0,raw:0,tokens:0,glyph:0,word:0,num:0,other:0};
 const g=groups[category];g.lanes++;g.tapeLanes+=!!rules?1:0;g.raw+=rows.at(-1).raw;g.tokens+=a.tokens;for(const k of Object.keys(classes))g[k]+=classes[k];
}
for(const g of Object.values(groups) as any[])g.leader=g.tapeLanes?['glyph','word','num','other'].sort((a,b)=>g[b]-g[a])[0]:null;
console.log(JSON.stringify({note:'body BPE token classes, not word counts or compression lower bounds; tape-free lanes excluded from class totals',groups,rows},null,2));
