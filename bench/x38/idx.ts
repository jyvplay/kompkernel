import { codecEntries } from '@/lib/omega/registry';
const k=codecEntries().map(x=>x.key);
console.log('oura idx',k.indexOf('oura'),'| euteleia',k.indexOf('euteleia'),'| anadiplosis',k.indexOf('anadiplosis'));
