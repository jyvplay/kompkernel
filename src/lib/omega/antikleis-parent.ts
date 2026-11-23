/** X164 bounded reader support for one existing fused date8 parent envelope.
 * This adds no wire operation: the header already explicitly declares date8.
 */
import {tagstackContractFor,tagstackRestore} from './tagstack';
import {klimaxParentRead} from './klimax-parent';
import {isUtf8TransportStable} from './utf8-wire';
export const ANTIKLEIS_DATE_PARENT_KEY='¶k=v expand repeatedly and 8 digits become YYYY-MM-DD; print only.\n';
export function antikleisParentRead(message:string):string{
 if(message.length>50000||!isUtf8TransportStable(message))throw Error('ANTIKLEIS parent domain');
 for(const marker of ['~','+']){const stackKey=tagstackContractFor('xml',marker)+'\n';
 if(message.startsWith(stackKey)){const inner=klimaxParentRead(message.slice(stackKey.length));const restored=tagstackRestore(inner,'xml',marker);if(restored===null||restored.length>50000)throw Error('ANTIKLEIS existing TAGSTACK parent');return restored;}}
 if(!message.startsWith(ANTIKLEIS_DATE_PARENT_KEY+'§'))return klimaxParentRead(message);
 const literal=klimaxParentRead('Before ¶ k=v. expand repeatedly; print only.\n'+message.slice(ANTIKLEIS_DATE_PARENT_KEY.length));
 const out=literal.replace(/[0-9]+/g,d=>d.length===8?d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6):d);
 if(out.length>50000)throw Error('ANTIKLEIS parent expansion');return out;
}
