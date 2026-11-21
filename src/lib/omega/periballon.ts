/** PERIBALLON — X148 opt-in synchronous Node environment-read acceleration.
 * Not a codec or memoized answer. Copy OS-backed process.env to a JS lookup
 * object for ONE synchronous call; writes/deletes are forwarded immediately.
 * No snapshots/values are logged or persisted. Defaults remain unchanged.
 * Scope: non-Windows Node, no async callback, no native/external environment
 * mutation, no process.env replacement. End-of-scope audit rejects observed
 * out-of-band changes. It cannot detect a transient out-of-band change reverted
 * before the audit, so this is an explicit caller precondition, not isolation.
 */
let active=false;
export function periballonScope<T>(fn:()=>T):T {
 if(typeof process==='undefined'||process.platform==='win32')return fn();
 if(active)return fn();
 const original=process.env,target=Object.create(Object.getPrototypeOf(original)) as NodeJS.ProcessEnv;
 const put=(k:string,v:string)=>Object.defineProperty(target,k,{value:v,writable:true,enumerable:true,configurable:true});
 for(const k of Object.keys(original))put(k,original[k]!);
 const proxy=new Proxy(target,{
  set(_t,k,v){if(typeof k!=='string'||typeof v==='symbol')throw Error('environment key/value');original[k]=v;put(k,original[k]!);return true;},
  deleteProperty(_t,k){if(typeof k!=='string')throw Error('environment key');delete original[k];delete target[k];return true;},
  defineProperty(_t,k,d){if(typeof k!=='string'||d.get||d.set||!d.configurable||!d.enumerable||!d.writable||!('value'in d))throw Error('environment descriptor');original[k]=d.value;put(k,original[k]!);return true;},
 });
 active=true;process.env=proxy;
 try {
  const value=fn();
  if(value&&typeof (value as any).then==='function')throw Error('synchronous callback required; async work is not cancelled');
  if(process.env!==proxy)throw Error('process.env replaced');
  const keys=Object.keys(original);
  if(keys.length!==Object.keys(target).length||keys.some(k=>original[k]!==target[k]))throw Error('out-of-band environment mutation');
  return value;
 } finally {process.env=original;active=false;}
}
