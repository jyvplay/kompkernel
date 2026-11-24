/** Bench-only manual UTF-8 encoder. Caller supplies at least 3*text.length bytes. */
export function x174Utf8(text:string,out:Uint8Array){let at=0;for(let i=0;i<text.length;i++){let c=text.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const low=text.charCodeAt(i+1);if(low>=0xdc00&&low<=0xdfff){c=0x10000+((c-0xd800)<<10)+(low-0xdc00);i++;}else c=0xfffd;}else if(c>=0xdc00&&c<=0xdfff)c=0xfffd;
 if(c<128)out[at++]=c;else if(c<2048){out[at++]=192|(c>>6);out[at++]=128|(c&63);}else if(c<65536){out[at++]=224|(c>>12);out[at++]=128|((c>>6)&63);out[at++]=128|(c&63);}else {out[at++]=240|(c>>18);out[at++]=128|((c>>12)&63);out[at++]=128|((c>>6)&63);out[at++]=128|(c&63);}}
 return at;}
