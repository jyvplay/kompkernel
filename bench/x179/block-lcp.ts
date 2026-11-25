/** Exact fixed-block UTF16 prefix scan; a benchmark, not a codec. */
export function blockLcp(a:string,b:string,limit:number){const n=Math.min(a.length,b.length,limit);let i=0;for(;i<Math.min(n,8);i++)if(a.charCodeAt(i)!==b.charCodeAt(i))return i;while(i+128<=n&&a.slice(i,i+128)===b.slice(i,i+128))i+=128;while(i<n&&a.charCodeAt(i)===b.charCodeAt(i))i++;return i;}
