import {writeFileSync} from 'node:fs';
import {diorthosiPlan} from '../../src/lib/omega/diorthosi';
const prefix='A😀'+ 'long shared prefix '.repeat(8), suffix=' long shared suffix'.repeat(8);
const docs=[prefix+'alpha'+suffix+'\nkeep\nlast',prefix+'beta'+suffix+'\nkeep\nlast',prefix+'gamma'+suffix+'\nkeep\nlast'];
const source=docs.join('\n---\n'); const message=diorthosiPlan(source); if(!message) throw Error('no plan');
const data=JSON.parse(message.slice(message.indexOf('\n')+1)); if(data[2][0][0].length!==4) throw Error('substring patch not exercised');
writeFileSync('bench/x69/crosscheck-case.json',JSON.stringify({source,message}));
