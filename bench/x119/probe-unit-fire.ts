import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { diglossiaEncode } from '../../src/lib/omega/diglossia';
const enc='o200k_base' as const; const T=(s:string)=>countTokens(s,enc);
const wire=(t:string,b:string)=>'¶k=v expand repeatedly print only.\n'+CHIRON_START+t+CHIRON_SEP+b;
for(const [t,b] of [['αinternationalization','internationalization internationalization α'],['αxβy','αβ αβ αβ'],['αconfiguration','configuration configuration α configuration'],['αabab','abababab α']]){
 const m=wire(t,b);const r=diglossiaEncode('x',enc,{message:m,messageTokens:T(m),decoded:chironDecode(m.slice(m.indexOf(CHIRON_START)))});
 console.log(JSON.stringify({t,b,base:T(m),after:r.messageTokens,applied:r.applied,adopt:r.adopt,bypass:r.bypass,notes:r.notes}));
}
