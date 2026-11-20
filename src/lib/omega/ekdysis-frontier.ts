/** Optional EKDYSIS parent composition. No production frontier admission.
 * Costs both baseline and one transformed-parent search. A token gain is NOT
 * a runtime Pareto claim. Unsupported emitted parent contracts fail closed.
 */
import {tagstackEncode} from './tagstack';
import {chironDecode,CHIRON_SCRIPTS,chironInScript,chironParseTape,chironOpsUsed} from './chiron';
import {steliUndo,steliParseMarker} from './steli';
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
import {ekdysisPlans,ekdysisUndo,ekdysisKey,EKDYSIS_CAP} from './ekdysis';
function readPlainParent(message:string):string{
 for(const header of ['Before ¶ k=v. expand; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n']){
  if(!message.startsWith(header+'§'))continue;
  const wire=message.slice(header.length),end=wire.indexOf('¶'),tape=wire.slice(1,end);
  const script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)));
  const rules=script?chironParseTape(tape,script):null,ops=chironOpsUsed(wire);
  if(end<2||!script||!rules||rules.length>128||ops.rep||ops.fill||ops.range||ops.split)throw Error('EKDYSIS unsupported grammar');
  const expanded=new Map<string,string>();
  const bounded=(s:string)=>{let out='';for(const c of s){if(chironInScript(script,c.codePointAt(0)!)&&!expanded.has(c))throw Error('EKDYSIS forward reference');const v=expanded.get(c)??c;if(out.length+v.length>EKDYSIS_CAP)throw Error('EKDYSIS grammar expansion cap');out+=v;}return out;};
  for(const r of rules)expanded.set(r.glyph,bounded(r.raw));
  const decoded=bounded(wire.slice(end+1));
  if(chironDecode(wire)!==decoded)throw Error('EKDYSIS reader disagreement');
  if(header==='Before ¶ k=v. expand; print only.\n')return decoded;
  for(const line of decoded.split('\n')){const marker=steliParseMarker(line.replace(/\r$/,''));if(marker&&(!Number.isSafeInteger(marker.rows)||marker.rows<0||decoded.length+marker.rows*Math.max(...marker.offsets)>EKDYSIS_CAP))throw Error('EKDYSIS layout expansion cap');}
  const out=steliUndo(decoded);if(out.length>EKDYSIS_CAP)throw Error('EKDYSIS layout output cap');return out;
 }
 return message;
}
/** Decoder for an applied composite only; fallback messages retain their parent decoder. */
export function ekdysisFrontierDecode(message:string):string{
 if(message.length>EKDYSIS_CAP+512||!isUtf8TransportStable(message))throw Error('EKDYSIS composite domain');
 for(let depth=1;depth<=4;depth++)for(const whole of [false,true]){
  const key=ekdysisKey(depth,whole);
  if(message.startsWith(key))return ekdysisUndo(readPlainParent(message.slice(key.length)),depth,whole);
 }
 throw Error('EKDYSIS composite envelope');
}
export function ekdysisFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const started=Date.now();
 if(!isUtf8TransportStable(source))throw Error('EKDYSIS source UTF-8');
 if([1,2,3,4].some(d=>[false,true].some(w=>source.startsWith(ekdysisKey(d,w)))))throw Error('EKDYSIS reserved envelope');
 const base=tagstackEncode(source,enc);
 const fallback=(reason:string)=>({message:base.message,tokens:base.messageTokens,decoded:base.decoded,applied:false,baseTokens:base.messageTokens,ms:Date.now()-started,reason});
 const p=ekdysisPlans(source,enc)[0];if(!p)return fallback('no eligible quoting layer');
 const child=tagstackEncode(p.folded,enc),message=p.contract+child.message;
 let decoded:string;try{decoded=ekdysisFrontierDecode(message);}catch{return fallback('unsupported parent reader or invalid inverse');}
 if(decoded!==source)return fallback('source mismatch or unsupported parent');
 if(!isUtf8TransportStable(message))return fallback('unstable transport');
 const tokens=countTokens(message,enc);if(tokens>=base.messageTokens)return fallback('no strict whole-message gain');
 return {message,tokens,decoded,applied:true,baseTokens:base.messageTokens,ms:Date.now()-started,reason:`${p.whole?'whole':'framed'} JSON quoting depth ${p.depth}, ${p.sites} sites`};
}
