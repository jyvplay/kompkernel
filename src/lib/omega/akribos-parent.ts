/** X181 AKRIBOS: fail-closed bounded reader for declared parent envelopes.
 * No new codec operation and no production wiring. Unknown instruction-looking
 * messages refuse rather than silently returning their encoded bytes.
 */
import {antikleisParentRead} from './antikleis-parent';
import {KLIMAX_AP_KEY} from './klimax-parent';
import {steliUndo,steliParseMarker} from './steli';
import {isUtf8TransportStable} from './utf8-wire';
function bounded(s:string){if(s.length>50000||!isUtf8TransportStable(s))throw Error('AKRIBOS domain');return s;}
function layout(s:string){for(const line of s.split('\n')){const m=steliParseMarker(line.replace(/\r$/,''));if(m&&(!Number.isSafeInteger(m.rows)||m.rows<0||m.rows*Math.max(...m.offsets)+s.length>50000))throw Error('AKRIBOS layout expansion');}return bounded(steliUndo(s));}
export function akribosParentRead(message:string):string{bounded(message);
 const decimal=/^¶k=v expand repeatedly After ~, a number has \. before its last ([1-6]) digits\. print only\.\n/.exec(message);
 if(decimal){if(!message.slice(decimal[0].length).startsWith('§'))throw Error('AKRIBOS missing dictionary');const n=+decimal[1],body=antikleisParentRead('Before ¶ k=v. expand repeatedly; print only.\n'+message.slice(decimal[0].length));if(/~(?![0-9])/.test(body))throw Error('AKRIBOS bare decimal');return bounded(body.replace(/~([0-9]+)/g,(_,digits:string)=>{if(digits.length<=n)throw Error('AKRIBOS short decimal');return digits.slice(0,-n)+'.'+digits.slice(-n);}));}
 const out=antikleisParentRead(message);
 if(out!==message)return message.startsWith(KLIMAX_AP_KEY)?layout(out):bounded(out);
 if(/^(?:¶|§|Body first\.|spec:|Decode|Before |⁺)/.test(message))throw Error('AKRIBOS unsupported envelope');
 return message;
}
