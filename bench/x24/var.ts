import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const groups:{label:string;orig:string;vars:string[]}[]=[
 {label:'date YYYY-MM-DD',orig:'2026-08-14',vars:['20260814','2026-0814','202608-14','2026 08 14','2026.08.14','2026/08/14','2026_08_14']},
 {label:'date 2014-01-02',orig:'2014-01-02',vars:['20140102','2014-0102','201401-02','2014 01 02']},
 {label:'time HH:MM:SS',orig:'00:02:05',vars:['000205','00-0205','0002-05','00 02 05','00.02.05']},
 {label:'time 12:34:56',orig:'12:34:56',vars:['123456','12-3456','1234-56','12 34 56']},
 {label:'quad 192.168.1.1',orig:'192.168.1.1',vars:['19216811','192-168-1-1','192 168 1 1','192.168.11']},
 {label:'semver 1.2.3',orig:'1.2.3',vars:['123','1-2-3','1.23','12.3','1 2 3']},
 {label:'semver 10.20.30',orig:'10.20.30',vars:['102030','10-2030','10.2030','10 20 30']},
 {label:'thou 18,442.17',orig:'18,442.17',vars:['18442.17']},
];
for(const g of groups){
  const o=T(g.orig);
  console.log(g.label.padEnd(20),'orig',String(o).padStart(3),'|',g.vars.map(v=>`${JSON.stringify(v)}=${T(v)}${T(v)<o?`(-${o-T(v)})`:T(v)>o?`(+${T(v)-o})`:''}`).join('  '));
}
