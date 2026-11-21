/** HORION — X147: one exact decimal threshold predicts a two-valued CSV column.
 * Experimental, not wired into the default frontier. No native-reader claim.
 * Unlike a finite lookup, the rule transmits an ordered boundary, not keys.
 * Domain: unquoted rectangular LF CSV, 8..1000 rows, 2..16 columns, 40k chars.
 * Search enumerates source/target pairs, finds the only possible separating
 * boundary, and byte-checks reconstruction. It is not a globally optimal search.
 * Decimal comparisons use BigInt, not floating point. No clocks or randomness.
 */
import { countTokens, type EncodingName } from './bpe';
export const HORION_CONTRACT = 'Restore CSV: JSON [insert-column index,header,numeric-column index in reduced CSV,threshold,below,otherwise] uses zero-based indices and exact decimal comparison. Insert below if numeric value < threshold, otherwise otherwise. Preserve all other bytes and final LF. Print only.\n';
const MAX = 40_000;
type Spec = [number, string, number, string, string, string];
export interface HorionPlan { reduced: string; spec: Spec; message: string; tokens: number }
function decimal(s: string): [bigint, number] | null {
  if (!/^-?(?:0|[1-9][0-9]{0,29})(?:\.[0-9]{1,30})?$/.test(s)) return null;
  const [a,b=''] = s.split('.'); return [BigInt(a+b),b.length];
}
function cmp(a: string,b: string): number {
  const x=decimal(a),y=decimal(b); if(!x||!y) throw Error('decimal');
  const v=x[0]*10n**BigInt(y[1])-y[0]*10n**BigInt(x[1]);return v<0n?-1:v>0n?1:0;
}
function table(s: string): string[][] | null {
  if(s.length>MAX || /["\r\u0000-\u0009\u000b-\u001f\ud800-\udfff]/.test(s))return null;
  const lines=(s.endsWith('\n')?s.slice(0,-1):s).split('\n');
  if(lines.length<9||lines.length>1001)return null;
  const rows=lines.map(l=>l.split(',')),n=rows[0].length;
  if(n<1||n>16||rows.some(r=>r.length!==n))return null;
  return rows;
}
function validSpec(v: unknown): v is Spec {
  if(!Array.isArray(v)||v.length!==6)return false;
  return Number.isInteger(v[0])&&v[0]>=0&&v[0]<16&&Number.isInteger(v[2])&&v[2]>=0&&v[2]<16&&[1,3,4,5].every(i=>typeof v[i]==='string'&&v[i].length<=100&&!/[,\n\r"\u0000-\u001f\ud800-\udfff]/.test(v[i]))&&!!decimal(v[3])&&v[4]!==v[5];
}
export function horionRestore(reduced: string,spec: unknown): string {
  if(!validSpec(spec))throw Error('spec');const rows=table(reduced);if(!rows)throw Error('table');
  const [t,h,a,k,lo,hi]=spec;if(t>rows[0].length||a>=rows[0].length||rows[0].length>=16)throw Error('index');
  const out=rows.map((r,i)=>{const c=r.slice();c.splice(t,0,i?cmp(r[a],k)<0?lo:hi:h);return c.join(',');}).join('\n')+(reduced.endsWith('\n')?'\n':'');
  if(out.length>MAX)throw Error('size');return out;
}
export function horionRead(message: string): string {
  if(message.length>MAX+1000||!message.startsWith(HORION_CONTRACT))throw Error('contract');
  const rest=message.slice(HORION_CONTRACT.length),n=rest.indexOf('\n');if(n<0)throw Error('frame');
  return horionRestore(rest.slice(n+1),JSON.parse(rest.slice(0,n)));
}
export function horionPlans(text: string,enc: EncodingName='o200k_base'): HorionPlan[] {
  const rows=table(text);if(!rows||rows[0].length<2)return [];
  const body=rows.slice(1),plans:HorionPlan[]=[];
  for(let t=0;t<rows[0].length;t++) {
    const labels=[...new Set(body.map(r=>r[t]))];if(labels.length!==2)continue;
    for(let a=0;a<rows[0].length;a++) {
      if(a===t||body.some(r=>!decimal(r[a])))continue;
      const sorted=body.slice().sort((x,y)=>cmp(x[a],y[a]));
      const low=sorted[0][t],split=sorted.findIndex(r=>r[t]!==low);
      if(split<1||sorted.slice(split).some(r=>r[t]===low)||cmp(sorted[split-1][a],sorted[split][a])>=0)continue;
      const spec:Spec=[t,rows[0][t],a-(a>t?1:0),sorted[split][a],low,sorted[split][t]];
      if(!validSpec(spec))continue;
      const reduced=rows.map(r=>r.filter((_,i)=>i!==t).join(',')).join('\n')+(text.endsWith('\n')?'\n':'');
      const message=HORION_CONTRACT+JSON.stringify(spec)+'\n'+reduced;
      if(horionRead(message)!==text)throw Error('internal reconstruction');
      plans.push({reduced,spec,message,tokens:countTokens(message,enc)});
    }
  }
  return plans.sort((a,b)=>a.tokens-b.tokens);
}
/** Strict complete-message fallback, with caller-supplied incumbent. */
export function horionSelect(text: string,parentMessage: string,enc: EncodingName='o200k_base'): string {
  const best=horionPlans(text,enc)[0];return best&&best.tokens<countTokens(parentMessage,enc)?best.message:parentMessage;
}
