/** X157 message-only extension: literal acyclic CHIRON dictionaries129..256.
 * Existing reader stops at128; this is a bounded support extension, not a new
 * wire format or permission to trust encoder self-reports. Operators still refuse.
 */
import {readPlainParent} from './ekdysis-frontier';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape,chironOpsUsed,chironDecode} from './chiron';
import {steliUndo,steliParseMarker} from './steli';
import {isUtf8TransportStable} from './utf8-wire';
export function isostathmiaParentRead(message:string):string{
 if(message.length>50000||!isUtf8TransportStable(message))throw Error('ISOSTATHMIA parent transport');
 try{return readPlainParent(message);}catch{/* Only the explicitly bounded larger plain grammar below may recover. */}
 const headers=['Before ¶ k=v. expand; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n'];
 const header=headers.find(h=>message.startsWith(h+'§'));if(!header)throw Error('ISOSTATHMIA parent envelope');
 const wire=message.slice(header.length),end=wire.indexOf('¶');if(end<2)throw Error('ISOSTATHMIA parent tape');const tape=wire.slice(1,end),script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0))),ops=chironOpsUsed(wire);
 if(!script||ops.rep||ops.fill||ops.range||ops.split)throw Error('ISOSTATHMIA parent operators');
 const rules=chironParseTape(tape,script);if(!rules||rules.length<=128||rules.length>256)throw Error('ISOSTATHMIA parent rule cap');
 const values=new Map<string,string>();const expand=(s:string)=>{let out='';for(const c of s){if(chironInScript(script,c.codePointAt(0)!)&&!values.has(c))throw Error('ISOSTATHMIA parent forward ref');const v=values.get(c)??c;if(out.length+v.length>50000)throw Error('ISOSTATHMIA parent expansion cap');out+=v;}return out;};
 for(const r of rules)values.set(r.glyph,expand(r.raw));const text=expand(wire.slice(end+1));if(chironDecode(wire)!==text)throw Error('ISOSTATHMIA parent disagreement');
 if(header===headers[0])return text;
 for(const line of text.split('\n')){const m=steliParseMarker(line.replace(/\r$/,''));if(m&&(!Number.isSafeInteger(m.rows)||m.rows<0||text.length+m.rows*Math.max(...m.offsets)>50000))throw Error('ISOSTATHMIA parent layout cap');}
 const output=steliUndo(text);if(output.length>50000||!isUtf8TransportStable(output))throw Error('ISOSTATHMIA parent output cap');return output;
}
