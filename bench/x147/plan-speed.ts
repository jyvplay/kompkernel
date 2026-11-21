// Isolates new planner cost ONLY. Not an end-to-end speedup experiment.
import fs from 'node:fs';import {horionPlans} from '../../src/lib/omega/horion';
const paths=fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n').concat('bench/x147/heldout/geyser.csv');const results=[];
for(const path of paths){const source=fs.readFileSync(path,'utf8');horionPlans(source);const cpu=process.cpuUsage(),start=performance.now();for(let i=0;i<10;i++)horionPlans(source);const elapsed=performance.now()-start,used=process.cpuUsage(cpu);results.push({path,iterations:10,wallMs:elapsed,cpuMs:(used.user+used.system)/1000});}
fs.writeFileSync('bench/x147/receipts/plan-speed.json',JSON.stringify({note:'Shared machine; planner only. Does not prove stack acceleration.',results},null,2));
