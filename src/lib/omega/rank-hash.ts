/** X142 experimental rank-table placement. No tokenization semantics change:
 * collisions still compare the complete key and linearly probe to an empty
 * slot. Multiplicative mixing uses high bits instead of low-byte-biased slots.
 * Not wired into production. Classical multiplicative hashing, not novel.
 */
export function rankSlot3(k:number):number{return Math.imul(k,0x9e3779b1)>>>14;}
export function rankSlot4(hi:number,lo:number):number{
 let k=(hi<<16)|lo;k^=k>>>16;return Math.imul(k,0x9e3779b1)>>>14;
}
