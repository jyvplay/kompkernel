"""CPython codecs/str.translate inverse; full messages compared to original bytes."""
import codecs,re,json,string
from pathlib import Path
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'prior-parent','exec'),prior)
def rotate(s,k):
 assert 1<=k<=25
 if k==13:return codecs.decode(s,'rot_13')
 table={}
 for alphabet in [string.ascii_uppercase,string.ascii_lowercase]:table.update(str.maketrans(alphabet,alphabet[k:]+alphabet[:k]))
 return s.translate(table)
HEAD=re.compile(r'^Decode first, then rotate ASCII letters forward ([1-9]|1[0-9]|2[0-5]) places in their A-Z or a-z alphabet, wrapping around\. Preserve everything else; print only\.\n')
def read(m):
 h=HEAD.match(m)
 if not h:return prior['parent_read'](m)
 return rotate(prior['parent_read'](m[h.end():]),int(h[1]))
checks=0
for r in json.loads(Path('bench/x164/receipts/kryptolysis-unit-pairs.json').read_text()):assert rotate(r['folded'],r['k']).encode()==r['source'].encode();checks+=1
rows=[]
for path in sorted(Path('bench/x164/receipts').glob('kryptolysis-20*.json')):
 r=json.loads(path.read_text());source=Path(r['path']).read_bytes();assert read(r['base']['message']).encode()==source;assert read(r['result']['message']).encode()==source;checks+=2
 for p in r['parents']:assert prior['parent_read'](p['message'])==p['folded'];checks+=1
 rows.append({'file':r['path'],'sourceBytes':len(source),'base':r['base']['tokens'],'selected':r['result']['tokens'],'saved':r['base']['tokens']-r['result']['tokens'],'inverse':r['result']['inverse'],'sourceBytesEqual':True})
result={'checks':checks,'rows':rows,'passed':True,'native':'NOT_RUN','verifier':'CPython codecs.rot_13 for rotation13; str.translate otherwise; independent Python parent reader'}
Path('bench/x164/receipts/kryptolysis-independent.json').write_text(json.dumps(result,indent=2));print(result)
