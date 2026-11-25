/** X182 bounded message-only integer/clock column-program reader.
 * Supports a declared subset of existing STICHOMYTHIA, not a new wire codec.
 */
import {STICHOMYTHIA_KEY} from './stichomythia';import {akribosParentRead} from './akribos-parent';import {isUtf8TransportStable} from './utf8-wire';
export function grammikosParentRead(message:string):string{
 if(message.length>50000||!isUtf8TransportStable(message))throw Error('GRAMMIKOS domain');
 if(!message.startsWith(STICHOMYTHIA_KEY+'\n'))return akribosParentRead(message);
 const tail=message.endsWith('\n')?'\n':'',lines=(tail?message.slice(0,-1):message).split('\n');if(lines.length!==3)throw Error('GRAMMIKOS lines');
 const m=/^S([1-9][0-9]{0,3}) sep "([^\r\n]*)" r=0\.\.([0-9]+) body:(.*)$/.exec(lines[1]);if(!m||+m[1]>1000||+m[3]!==+m[1]-1)throw Error('GRAMMIKOS range');const n=+m[1],specs=lines[2].split(' ; ');if(specs.length>64)throw Error('GRAMMIKOS columns');
 const models=specs.map(s=>{if(s.startsWith('='))return (_:number)=>s.slice(1);if(s.endsWith('*')){const a=s.slice(0,-1).split('|');return (r:number)=>a[r%a.length];}
 const t=/^(\d{2}):(\d{2}):(\d{2})@([+-])(\d{1,9})s$/.exec(s);if(t){const start=+t[1]*3600+ +t[2]*60+ +t[3],step=(t[4]==='-'?-1:1)*+t[5];if(+t[1]>23||+t[2]>59||+t[3]>59||Math.min(start,start+step*(n-1))<0||Math.max(start,start+step*(n-1))>=86400)throw Error('GRAMMIKOS clock range');return (r:number)=>{const v=start+step*r;return [Math.floor(v/3600),Math.floor(v/60)%60,v%60].map(x=>String(x).padStart(2,'0')).join(':');};}
 const a=/^([^0-9]*?)(-?\d{1,9})([+-])(\d{1,9})\*r([^0-9]*)$/.exec(s);if(a){const base=BigInt(a[2]),step=BigInt(a[4])*(a[3]==='-'?-1n:1n),width=a[2].replace('-','').length;return (r:number)=>{const v=base+step*BigInt(r);return a[1]+(v<0?'-':'')+String(v<0?-v:v).padStart(width,'0')+a[5];};}
 if(s.includes('*r')||s.includes('@'))throw Error('GRAMMIKOS unsupported program');const a2=s.split('|');if(a2.length!==n)throw Error('GRAMMIKOS literal arity');return (r:number)=>a2[r];});
 const out:string[]=[];let units=tail.length;const add=(s:string)=>{units+=s.length+(out.length?1:0);if(units>50000)throw Error('GRAMMIKOS expansion');out.push(s);};if(m[4]!=='-')add(m[4]);for(let r=0;r<n;r++)add(models.map(f=>f(r)).join(m[2]));return out.join('\n')+tail;
}
