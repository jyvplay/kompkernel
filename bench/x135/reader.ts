/** Message-only experimental parent reader, with explicit supported scope. */
import {chironDecode} from '../../src/lib/omega/chiron';
import {steliUndo} from '../../src/lib/omega/steli';
export function readParent(m:string):string {
 for(const pre of ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']){
  if(m.startsWith(pre+'§'))return steliUndo(chironDecode(m.slice(pre.length)));
 }
 return m; // other composed contracts remain unsupported, not guessed
}
