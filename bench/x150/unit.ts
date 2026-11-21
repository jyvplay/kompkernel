import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
import {chrismataPlan,chrismataRestore,chrismataRead} from '../../src/lib/omega/chrismata';
import {polysteliTransform,polysteliUndo,polysteliEncode} from '../../src/lib/omega/polysteli';
let n=0; function check(x:unknown, label:string){n++;assert.ok(x,label)}
const paths=['bench/x150/fixtures/git-polysteli-color.diff','bench/x150/fixtures/git-tagstack-color.diff','bench/x150/fixtures/git-tagstack-heldout-color.diff','bench/x150/fixtures/git-epitypos-color.diff'];
const rows=[];
for(const path of paths){
 const bytes=fs.readFileSync(path), s=bytes.toString('utf8'), p=chrismataPlan(s);
 check(Buffer.from(s).equals(bytes),'source utf8 '+path);check(p,'plan '+path);
 check(Buffer.from(chrismataRestore(p!.folded,p!.plus,p!.minus)).equals(bytes),'buffer equality '+path);
 const raw=countTokens(s,'o200k_base'),coded=countTokens(p!.key+p!.folded,'o200k_base');
 rows.push({path,bytes:bytes.length,sites:p!.sites,raw,coded,grossSaved:raw-coded,folded:p!.folded,key:p!.key});
}
const e='\x1b', green=(x:string)=>`${e}[32m+${e}[m`+(x?`${e}[32m${x}${e}[m`:''),red=(x:string)=>`${e}[31m-${e}[m`+(x?`${e}[31m${x}${e}[m`:'');
for(const input of [green(''),green('abc'),red('ζ🚀'),`${green('z')}\n${red('x')}\n`,`${green('z')}\nplain\n${green('w')}`]){
 const p=chrismataPlan(input);check(p,'plan grammar');check(chrismataRestore(p!.folded,p!.plus,p!.minus)===input,'inverse');
}
check(chrismataPlan(`${green('a')}\n+ambiguous literal`)===null,'literal sign collision');
const doubleEmpty=`${e}[32m+${e}[m${e}[32m${e}[m`, doubleInput=`${green('a')}\n${doubleEmpty}`;
const doublePlan=chrismataPlan(doubleInput);
check(!!doublePlan && doublePlan.folded.endsWith(doubleEmpty) && chrismataRestore(doublePlan.folded,doublePlan.plus,doublePlan.minus)===doubleInput,'double wrapper empty stays literal');
check(chrismataPlan(`${green('a')}\r\n`)===null,'CRLF refused');
check(chrismataPlan(`${green('a')}\n\ud800`)===null,'surrogate refused');
const nested=`${e}[32m+${e}[m${e}[32ma${e}[31mb${e}[m`;
const mixed=chrismataPlan(`${green('valid')}\n${nested}`);check(mixed!==null && chrismataRestore(mixed.folded,mixed.plus,mixed.minus)===`${green('valid')}\n${nested}`,'nested SGR is literal');
let rejected=false;try{chrismataRead('random');}catch{rejected=true;}check(rejected,'unknown envelope throws');
// Patch-targeted: old POLYSTELI emitted the original padded row after its marker.
const grid='aa   bb   cc   dd tail\n'.repeat(8), t=polysteliTransform(grid);
check(t,'POLYSTELI grid fits');check(t!.text.split('\n')[1]==='aa bb cc dd tail','POLYSTELI emits compact row');
check(polysteliUndo(t!.text)===grid,'POLYSTELI inverse');
const tail='aa   bb   cc   dd    🚀  inner  spaces\n'.repeat(8),u=polysteliTransform(tail);
check(!!u && polysteliUndo(u.text)===tail,'POLYSTELI verbatim tail with leading spaces');
check(polysteliTransform('aa\t bb   cc   dd tail\n'.repeat(8))===null,'POLYSTELI tabs rejected');
check(polysteliTransform('॥ existing\n'+grid)===null,'POLYSTELI reserved marker rejected');
// Patch-targeted boundary: adding a marker can push a source at the input cap
// above the inverse cap even when the source itself is in range. The public
// encoder must refuse, not throw or invoke the expensive parent on that arm.
const nearCap=grid+'\n'+'x'.repeat(400000-grid.length-1), priorOpt=process.env.OMEGA_POLYSTELI;
process.env.OMEGA_POLYSTELI='1';
let capResult:ReturnType<typeof polysteliEncode>|undefined, capThrew=false;
try{capResult=polysteliEncode(nearCap,'o200k_base',{incumbent:1,inner:()=>{throw Error('unexpected parent')}})}catch{capThrew=true}
if(priorOpt===undefined)delete process.env.OMEGA_POLYSTELI;else process.env.OMEGA_POLYSTELI=priorOpt;
check(!capThrew && capResult?.applied===false,'POLYSTELI near-cap inverse refusal is fail-closed');
for (const bad of [
 '॥9999999999999999,1:1 rows single-spaced, pad field k to width k, rest verbatim.\na b\n',
 '॥400001,1:1 rows single-spaced, pad field k to width k, rest verbatim.\na b\n',
 '॥400000,1:2 rows single-spaced, pad field k to width k, rest verbatim.\na b\na b\n',
 '॥malformed\na b\n',
 '॥200000,1:3 rows single-spaced, pad field k to width k, rest verbatim.\na b\na b\na b\n',
]) { let throws=false; try {polysteliUndo(bad)} catch {throws=true} check(throws,'POLYSTELI adversarial marker bounded'); }
const receipt=rows.map(({folded,key,...r})=>({...r,keyTokens:countTokens(key,'o200k_base')}));
for(const [i,r] of rows.entries()){
 fs.writeFileSync(`bench/x150/receipts/folded-${i}.txt`,r.folded);
 fs.writeFileSync(`bench/x150/receipts/key-${i}.txt`,r.key);
 check(Buffer.from(chrismataRead(r.key+r.folded)).equals(fs.readFileSync(r.path)), 'message-only direct reader '+r.path);
}
fs.writeFileSync('bench/x150/receipts/unit.json',JSON.stringify({checks:n,rows:receipt},null,2));
console.log(JSON.stringify({checks:n,rows:receipt},null,2));
