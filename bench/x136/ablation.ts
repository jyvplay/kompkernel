/** Strong novelty attack: give the EXISTING single-width codec the same parent
 * and fused-contract advantage; do not attribute that advantage to new residuals. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {countTokens} from '../../src/lib/omega/bpe';
import {wrapEncode,wrapDecode} from '../../src/lib/omega/wrapcanon';
import {ptycheDefaultPlan,ptycheDefaultUndo,ptycheWidth} from '../../src/lib/omega/ptyche';
import {readParent} from '../x135/reader';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const path='bench/holdout-work/kb-article.txt',text=fs.readFileSync(path,'utf8'),w=ptycheWidth(text)!;
const base=JSON.parse(fs.readFileSync('bench/x136/receipts/frontier.jsonl','utf8').trim().split('\n').find(l=>JSON.parse(l).path===path)!);
const mixed=ptycheDefaultPlan(text,w)!;
const single=mixed.folded.split('\n\n').map(p=>/^~\d+\|/.test(p)?ptycheDefaultUndo(p,w):p).join('\n\n');
const old=wrapEncode(text,w,'~')!;
assert.ok(!old.includes('~')); // no KEEP clause needed in this concrete candidate
const cases=[
 {kind:'single-width-marked',folded:single,key:`¶ k=v; expand recursively. Replace ~|paragraph by its greedy ${w}-column wrap. Print only.\n`,undo:(s:string)=>ptycheDefaultUndo(s,w)},
 {kind:'existing-WRAPCANON',folded:old,key:`¶ k=v; expand recursively, then greedy-wrap single-line paragraphs to ${w} columns. Print only.\n`,undo:(s:string)=>wrapDecode(s,w,'~')},
];
for(const c of cases){
 assert.equal(c.undo(c.folded),text);
 const t=performance.now(),parent=tagstackEncode(c.folded,'o200k_base'),ms=performance.now()-t;
 const pre='¶ k=v. expand repeatedly; print only.\n';assert.ok(parent.message.startsWith(pre));
 const message=c.key+parent.message.slice(pre.length),B=countTokens(message,'o200k_base');
 assert.equal(c.undo(readParent(parent.message)),text);
 console.log(JSON.stringify({kind:c.kind,path,A:base.tokens,B,delta:B-base.tokens,ms,sourceExact:true,message}));
}
