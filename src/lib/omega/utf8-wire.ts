/** X144 transport admission helper. A UTF-16 inverse is insufficient when
 * the wire splits a surrogate pair across grammar entries. UTF-8 replaces lone
 * halves, irreversibly changing the message. This is NOT a decoder correctness
 * or native-reading test. Experimental opt-in helper, not wired into TAGSTACK.
 */
export function isUtf8TransportStable(text:string):boolean {
 for(let i=0;i<text.length;i++){
  const c=text.charCodeAt(i);
  if(c>=0xd800&&c<=0xdbff){
   const d=text.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))return false;
  }else if(c>=0xdc00&&c<=0xdfff)return false;
 }
 return true;
}
/** Conservative repair: decline an unsafe message, retaining exact raw source.
 * Does not preserve the unsafe candidate's token cost; caller must reprice.
 */
export function utf8WireChoice(source:string,candidate:string){
 if(!isUtf8TransportStable(source))throw Error('source is not stable under UTF-8 transport');
 const fallback=!isUtf8TransportStable(candidate);
 return {message:fallback?source:candidate,fallback};
}
