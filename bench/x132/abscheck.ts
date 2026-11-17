/** Does expanding the frontier's tape+body reproduce the SOURCE exactly?
 *  If yes, byte-exactness can be verified ABSOLUTELY (against ground truth)
 *  rather than relatively (before vs after). */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const inPool=(cp:number)=>
  (cp>=0x0400&&cp<=0x04FF)||(cp>=0x0370&&cp<=0x03FF)||(cp>=0x0600&&cp<=0x06FF)||
  (cp>=0x0590&&cp<=0x05FF)||[0x2020,0x2021,0x2022,0x00B7,0x00B1,0x00D7,0x00F7,
    0x2260,0x221E,0x2248,0x2264,0x2265].includes(cp);
function gs(src:string,msg:string){const s0=new Set<string>();for(let i=0;i<src.length;i++)s0.add(src[i]!);
  const g=new Set<string>();for(let i=0;i<msg.length;i++){const c=msg[i]!;if(!s0.has(c)&&inPool(c.codePointAt(0)!))g.add(c);}return g;}
function parse(t:string,G:Set<string>){const rs:{g:string;v:string}[]=[];const seen=new Set<string>();let cur:any=null;
  for(const ch of t){if(G.has(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rs.push(cur);}else if(cur)cur.v+=ch;}return rs;}
function exp(rs:any[]){const n=new Set(rs.map(r=>r.g));const m=new Map<string,string>();
  for(const r of rs){let o='';for(const ch of r.v)o+=(n.has(ch)&&m.has(ch))?m.get(ch)!:ch;m.set(r.g,o);}return m;}
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const G=gs(text,M); if(!G.size){console.log(`${p.split('/').pop()!.padEnd(20)} NO GLYPHS`);continue;}
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const tape=M.slice(i1,i2<0?undefined:i2);
  const bodyRaw=i2<0?'':M.slice(i2);
  const body = bodyRaw.startsWith('\u00b6') ? bodyRaw.slice(1) : bodyRaw;   // drop the ¶ marker
  const rs=parse(tape,G); const m=exp(rs);
  let o=''; for(const ch of body) o+=(m.has(ch)&&rs.some(r=>r.g===ch))?m.get(ch)!:ch;
  console.log(`${p.split('/').pop()!.padEnd(20)} expand==source? ${o===text}   (expLen ${o.length} vs srcLen ${text.length})`);
}
