/** X148 exact UTF16 LCP via native string comparisons, not a codec.
 * Inspect 16 units directly (cheap early mismatch); then compare disjoint
 * geometrically growing blocks using native string equality. Binary-search
 * the first unequal block. No hashing/collisions, normalization, or BPE changes.
 * Work O(n + log n) substring comparisons/compared units up to constant factors;
 * actual allocation/runtime is engine-dependent and must be measured.
 */
export function nativeLcp(a:string,b:string,limit=Math.min(a.length,b.length)):number {
 const n=Math.min(a.length,b.length,Math.max(0,Math.floor(limit)));let i=0;
 for(;i<Math.min(n,16);i++)if(a.charCodeAt(i)!==b.charCodeAt(i))return i;
 let block=64;
 while(i<n){const end=Math.min(n,i+block);
  if(a.slice(i,end)===b.slice(i,end)){i=end;block=Math.min(block*2,4096);continue;}
  let lo=i,hi=end-1;
  while(lo<hi){const mid=(lo+hi)>>>1;if(a.slice(i,mid+1)===b.slice(i,mid+1))lo=mid+1;else hi=mid;}
  return lo;
 }
 return i;
}
