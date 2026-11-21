import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('p','bench/x157/parent-reader.py');p=importlib.util.module_from_spec(s);s.loader.exec_module(p)
checks=0
for n in [128,129,256]:
 keys=[chr(0xac00+i) for i in range(n)];wire=p.HEADS[0]+'§'+''.join(g+'v'+str(i) for i,g in enumerate(keys))+'¶'+''.join(keys);assert p.parent_read(wire)==''.join('v'+str(i) for i in range(n));checks+=1
keys=[chr(0xac00+i) for i in range(257)]
for wire in [p.HEADS[0]+'§'+''.join(g+'v' for g in keys)+'¶'+keys[0],p.HEADS[0]+'§가가¶가',p.HEADS[0]+'§가x¶각',p.HEADS[0]+'§가×¶가','\ud800',p.HEADS[0]+'§가x¶'+'가'*50001]:
 try:p.parent_read(wire)
 except (ValueError,UnicodeError):checks+=1
 else:raise AssertionError('accepted attack')
r=json.loads(Path('bench/x157/receipts/io0-base.json').read_text());assert p.parent_read(r['message']).encode()==Path(r['path']).read_bytes();checks+=1
Path('bench/x157/receipts/parent-independent-attacks.json').write_text(json.dumps({'checks':checks,'passed':True,'native':False},indent=2));print(checks)
