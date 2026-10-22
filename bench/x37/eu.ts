import { codecEntries } from '@/lib/omega/registry';
const e=codecEntries(); const k=e.map(x=>x.key);
console.log('euteleia registered:',k.includes('euteleia'),'idx',k.indexOf('euteleia'),
 '| ana',k.indexOf('anadiplosis'),'syncope',k.indexOf('syncope'));
