import assert from 'node:assert/strict';
import {metabolePlans,metaboleUndo,metaboleEncode,metaboleDecode,METABOLE_KEY} from '../../src/lib/omega/metabole';
let checks=0;for(let i=0;i<1000;i++){const s=`prefix_long_common_${i} prefix_long_common_${i+1}\r\n🙂\u0000`;for(const p of metabolePlans(s)){assert.equal(metaboleUndo(p.folded),s);checks++;}const p=metaboleEncode(s);assert.equal(metaboleDecode(p.message),s);checks++;}
for(const s of ['^a,0:x;','abc ^a,4:x;','abc^a,0:x;','abc ^a,0:x;z','abc ^a,03:x;']){assert.throws(()=>metaboleUndo(s));checks++;}
assert.equal(metabolePlans('a^b').length,0);assert.throws(()=>metaboleEncode(METABOLE_KEY));console.log(JSON.stringify({checks:checks+2}));
assert.equal(metaboleUndo('alphabet ^a,3:ine; ^a,0:s;'),'alphabet alphaine alphaines');
for(let i=0;i<1000;i++){const first='a'+String(i)+'longword';const wire=first+' ^a,4:tail;';assert.equal(metaboleUndo(wire),first+' '+first.slice(0,-4)+'tail');}
console.log(JSON.stringify({patchTargetedChecks:1001}));
