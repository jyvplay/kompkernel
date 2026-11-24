// Attach only to the explicitly enabled local diagnostic inspector.
import fs from 'node:fs';
const targets=await (await fetch('http://127.0.0.1:9229/json/list')).json();
if(targets.length!==1||!targets[0].title.includes('diagnostic'))throw Error('unexpected inspector target');
const ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
let id=0;const pending=new Map();ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p[1](r.error):p[0](r.result);}}};
function call(method,params={}){return new Promise((ok,no)=>{pending.set(++id,[ok,no]);ws.send(JSON.stringify({id,method,params}));});}
await call('HeapProfiler.startSampling',{samplingInterval:32768});await new Promise(r=>setTimeout(r,45000));const {profile}=await call('HeapProfiler.stopSampling');
fs.writeFileSync('bench/x166/receipts/memory-sample.json',JSON.stringify(profile));const rows=[];
function walk(n,stack=[]){const frame=n.callFrame;const next=[...stack,frame.functionName+':'+frame.lineNumber];if(n.selfSize)rows.push({bytes:n.selfSize,stack:next});for(const c of n.children)walk(c,next);}
walk(profile.head);rows.sort((a,b)=>b.bytes-a.bytes);fs.writeFileSync('bench/x166/receipts/memory-top.json',JSON.stringify({scope:'45s sampled live allocations, instrumented Requests parent; not exact retained-heap census',rows:rows.slice(0,40)},null,2));console.log(rows.slice(0,8));ws.close();
