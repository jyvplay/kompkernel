/** X141 measured optimization candidate, unwired.
 * For installed o200k_base/cl100k_base, ASCII digit runs split into groups of
 * at most3, and every1..3-digit ASCII string is one token (exhaustively tested).
 * Thus a NONEMPTY ASCII digit-only string costs ceil(length/3). Refuse all
 * other inputs. This is a counter shortcut, not a compression mechanism.
 */
export function decimalTokenCount(text:string):number|null{
 if(!text.length)return null;
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<48||c>57)return null;}
 return Math.ceil(text.length/3);
}
