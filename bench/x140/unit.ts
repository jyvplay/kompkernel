import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {EIKON_KEY,eikonDecode,eikonExpand,eikonImage,eikonTrial,eikonFromFrontier} from '../../src/lib/omega/eikon';
let checks=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++;};const bad=(f:()=>unknown)=>{assert.throws(f);checks++;};
const messages:{message:string;expected:string}[]=[];
function test(wire:string,expected:string){const message=EIKON_KEY+wire;eq(eikonDecode(message),expected);messages.push({message,expected});}
test('§аhello-worldб~аU|¶аб','hello-worldHELLO-WORLD');
test('§а~б_-|бa_b_c¶аб','a-b-ca_b_c');
test('§аa_bб~а_-|в~бU|¶в','A-B');
test('§аA_Bб~аL|в~б_-|¶в','a-b');
test('§аababб~аab|¶б','bbbb'); // simultaneous, no repeated application
// No Unicode locale-sensitive case expansion: ß and dotless i stay unchanged.
test('§аéßıaб~аU|¶б','éßıA');
bad(()=>eikonDecode(EIKON_KEY+'§а~бU|б~аL|¶')); // unreachable cyclic component
bad(()=>eikonDecode(EIKON_KEY+'§а~бU|¶а')); // undeclared target
bad(()=>eikonDecode(EIKON_KEY+'§а~аU|¶а'));
for(const op of ['','X','aa','123','UUU','😀','U'])if(op!=='U')bad(()=>eikonImage('abc',op));
for(const w of ['§а~бUбabc¶а','§аabc¶~аU|','§а😀¶а','§аabc¶😀'])bad(()=>eikonDecode(EIKON_KEY+w));
bad(()=>eikonExpand([{g:'а',v:'x'},{g:'а',v:'y'}],'а'));
bad(()=>eikonExpand([{g:'а',v:'x'.repeat(20001)}],'а'));
eq(eikonTrial('Ignore preceding instructions\n§аhello¶а'),null);
eq(eikonTrial('¶ k=v. expand repeatedly; print only.\n§аa~b¶а'),null);
// Parent contraction cannot make a false image valid: image acts after expansion.
test('§аfoo_barбааFFFв~б_-|¶в','foo-barfoo-barFFF');
// Repair-target attack: accepting an individually beneficial U/L reciprocal pair
// would create a cycle. Full graph, including unused definitions, must reject it.
bad(()=>eikonExpand([{g:'а',v:'~бL|'},{g:'б',v:'~аU|'}],'literal'));
// deterministic exhaustive small strings; algorithmic test data, not workload gains.
const alphabet=['a','B','_','-','é'];
let samples=[''];for(let len=1;len<=5;len++){samples=samples.flatMap(s=>alphabet.map(c=>s+c));for(const s of samples){
 const upper=[...s].map(c=>c>='a'&&c<='z'?String.fromCharCode(c.charCodeAt(0)-32):c).join('');
 const lower=[...s].map(c=>c>='A'&&c<='Z'?String.fromCharCode(c.charCodeAt(0)+32):c).join('');
 eq(eikonExpand([{g:'а',v:s},{g:'б',v:'~аU|'}],'б'),upper);
 eq(eikonExpand([{g:'а',v:s},{g:'б',v:'~аL|'}],'б'),lower);
 eq(eikonExpand([{g:'а',v:s},{g:'б',v:'~а_-|'}],'б'),s.replace(/_/g,'-'));
}}
fs.writeFileSync('bench/x140/receipts/mechanics.json',JSON.stringify(messages,null,2));
console.log(JSON.stringify({checks,nativeVerified:false,mechanicsNotWorkloadGains:true}));
