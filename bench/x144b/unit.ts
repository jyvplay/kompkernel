import assert from 'node:assert/strict';import {colexPlans,colexUndo,colexEncode,colexDecode,colexKey,COLEX_SEPARATORS} from '../../src/lib/omega/colex';import {isUtf8TransportStable} from '../../src/lib/omega/utf8-wire';
let checks=0;
for(let cp=0;cp<65536;cp++){const s=String.fromCharCode(cp);assert.equal(isUtf8TransportStable(s),Buffer.from(s).toString('utf8')===s);checks++;}
for(const s of ['🙂','\ud800x','\ud800\ud800\udc00','x\udc00','\ud800\udc00\udc00']){assert.equal(isUtf8TransportStable(s),Buffer.from(s).toString('utf8')===s);checks++;}
let seed=144;const rnd=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const fixtures=['','/usr/lib//','a-b--c','...a.b.','foo_bar_baz','x/日本語/y','🙂a/b\r\n\0c/d','12.50 -001.20','+a/-b',' / '];
for(let n=0;n<500;n++){let s='';for(let i=0;i<60;i++)s+='abcXYZ0123 /._+-\n\t'[rnd()%18];fixtures.push(s);}
for(const s of fixtures){for(const sep of COLEX_SEPARATORS){const f=colexUndo(s,sep);assert.equal(colexUndo(f,sep),s);assert.equal(f.length,s.length);assert.ok(isUtf8TransportStable(f));checks+=3;}
 for(const p of colexPlans(s)){assert.equal(colexUndo(p.folded,p.sep),s);checks++;}
 const e=colexEncode(s);assert.equal(colexDecode(e.message),s);checks++;
}
for(const sep of COLEX_SEPARATORS){assert.throws(()=>colexEncode(colexKey(sep)));checks++;}
assert.throws(()=>colexEncode('\ud800'));assert.throws(()=>colexUndo('x','!' as any));assert.throws(()=>colexUndo('x'.repeat(50001),'/'));checks+=3;
// Harness repair: undo without the declared separator must fail, never infer it.
assert.throws(()=>colexUndo('a/b',undefined as any));checks++;
console.log(JSON.stringify({checks,fixtures:fixtures.length}));
