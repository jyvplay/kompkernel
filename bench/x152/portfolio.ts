import fs from 'node:fs';import assert from 'node:assert/strict';import {countTokens} from '../../src/lib/omega/bpe';
const cost=(s:string)=>countTokens(s,'o200k_base');const rows=fs.readFileSync('bench/x151/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
function wrap(s:string,w:number){const words=s.split(' ');let line=words[0]!,out='';for(const word of words.slice(1)){if(line.length+1+word.length>w){out+=line+'\n';line=word;}else line+=' '+word;}return out+line;}
const numbers='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const numberKey='Replace each ~N with the lowercase English name of integer N from zero to nineteen. Preserve all other text.\n';
const anchorKey='For each ~marked paragraph, remove ~; keep the first line and greedily wrap its remaining text to the first line\'s character count. Preserve other text.\n';
const result=rows.map(r=>{
 const source=r.text as string;let numberSites=0,anchorSites=0;
 const nf=source.includes('~')?source:source.replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/g,m=>{numberSites++;return '~'+numbers.indexOf(m)});
 if(numberSites)assert.equal(nf.replace(/~(\d+)/g,(_,n)=>numbers[+n]!),source);
 const final=source.endsWith('\n')?'\n':'';const body=final?source.slice(0,-1):source;
 const af=source.includes('~')?source:body.split('\n\n').map(p=>{const ls=p.split('\n');if(ls.length<3||ls.some(l=>!l||!/^[!-~]+(?: [!-~]+)*$/.test(l)))return p;const tail=ls.slice(1).join(' ');if(wrap(tail,ls[0]!.length)!==ls.slice(1).join('\n'))return p;anchorSites++;return '~'+ls[0]+'\n'+tail}).join('\n\n')+final;
 if(anchorSites){const restored=(final?af.slice(0,-1):af).split('\n\n').map(p=>{if(!p.startsWith('~'))return p;const at=p.indexOf('\n'),first=p.slice(1,at);return first+'\n'+wrap(p.slice(at+1),first.length)}).join('\n\n')+final;assert.equal(restored,source);}
 return {path:r.path,raw:cost(source),incumbent:r.tokens,numberSites,numberComplete:numberSites?cost(numberKey+nf):null,anchorSites,anchorComplete:anchorSites?cost(anchorKey+af):null};
});
const strings=['internationalization','hello world','aaaaaaaaaaaaaaaaaaaaaaaa','xqzjkvp','authentication','1234567890','cat'];let metricWitness:any=null;for(const a of strings)for(const b of strings)if(a.length<b.length&&cost(a)>cost(b))metricWitness={shorter:a,shorterChars:a.length,shorterTokens:cost(a),longer:b,longerChars:b.length,longerTokens:cost(b)};assert.ok(metricWitness);
const rankContracts=['Restore ~ from the lexicographic permutation rank of the twelve rule keys.','Replace ~ by seven hex digits from the lexicographic rank of the twelve rule keys modulo 16^7.'];
fs.writeFileSync('bench/x152/receipts/portfolio.json',JSON.stringify({rows:result,metricWitness,rankContracts:rankContracts.map(key=>({key,tokens:cost(key),adequateContract:false,missing:'window location, Unicode order, zero-based rank, leading-zero and case rules'})),scope:'constructed reversible raw screens and metric counterexample, not complete-parent or model tests'},null,2));console.log(JSON.stringify({metricWitness,numberLanes:result.filter(r=>r.numberSites).length,anchorLanes:result.filter(r=>r.anchorSites).length}));
