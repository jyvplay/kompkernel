"""Independent external numeral renderer; original file bytes are ground truth."""
import sys,json,re,importlib.metadata
from pathlib import Path
sys.path.insert(0,str(Path('.cache/x163/verify').resolve()))
from num2words import num2words
KEY='Decode first. Expand ~N (a tilde followed by digits) into lowercase British English cardinal words: hyphenate tens-units, use "and" after hundreds with a remainder and after thousands only when the remainder is below 100; no commas. Preserve everything else; print only.\n'
def undo(s):
 def expand(m):
  d=m[1];assert re.fullmatch(r'0|[1-9][0-9]{0,5}',d)
  return num2words(int(d),lang='en').replace(',','')
 out=re.sub(r'~([0-9]+)',expand,s);assert len(out.encode('utf-16-le'))//2<=50000;return out.encode()
MEMORY_KEY=KEY.replace('Expand ~N (a tilde followed by digits)', 'Expand ^N').replace('Preserve everything else;', 'A bare ^ uses the last literal digit run; ^d spells its digits individually with comma-space separators. Operands do not update literal memory. Preserve everything else;')
CARDINAL_KEY=MEMORY_KEY.replace('; ^d spells its digits individually with comma-space separators','')
def memory_undo(text,digits_allowed=True):
 if not digits_allowed:assert '^d' not in text
 last=None
 def expand(m):
  nonlocal last
  if not m[0].startswith('^'):last=m[0];return m[0]
  operand=m[0][1:]
  if operand=='d':
   assert last is not None and len(last)<=100
   return ', '.join(num2words(int(d),lang='en') for d in last)
  digits=operand or last;assert digits is not None and re.fullmatch(r'0|[1-9][0-9]{0,5}',digits)
  return num2words(int(digits),lang='en').replace(',','')
 out=re.sub(r'\^(?:d|[0-9]*)|[0-9]+',expand,text);assert len(out.encode('utf-16-le'))//2<=50000;return out.encode()
checks=0
for r in json.loads(Path('bench/x163/receipts/number-words.json').read_text()):assert num2words(r['n'],lang='en').replace(',','')==r['w'];checks+=1
for r in json.loads(Path('bench/x163/receipts/number-pairs.json').read_text()):assert undo(r['folded'])==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x163/receipts/memory-pairs.json').read_text()):assert memory_undo(r['folded'])==r['source'].encode();checks+=1
rejected=False
try:memory_undo('100 ^d',False)
except AssertionError:rejected=True
assert rejected;checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'bench/x159/independent.py','exec'),prior)
rows=[]
for name in ['inflect','num-en','num-ng','ruby','code-ts','cache-inflect']:
 for arm in ['base','candidate','memory']:
  path=Path(f'bench/x163/receipts/{name}-{arm}.json')
  if not path.exists():continue
  r=json.loads(path.read_text());m=r['message'];decoded=memory_undo(prior['parent_read'](m[len(CARDINAL_KEY):]),False) if m.startswith(CARDINAL_KEY) else memory_undo(prior['parent_read'](m[len(MEMORY_KEY):])) if m.startswith(MEMORY_KEY) else undo(prior['parent_read'](m[len(KEY):])) if m.startswith(KEY) else prior['parent_read'](m).encode()
  assert decoded==Path(r['path']).read_bytes();checks+=1;rows.append({'name':name,'arm':arm,'sourceBytesEqual':True,'tokens':r['tokens']})
Path('bench/x163/receipts/number-independent.json').write_text(json.dumps({'checks':checks,'rows':rows,'passed':True,'native':False,'externalVerifier':'num2words '+importlib.metadata.version('num2words'),'method':'independent package number grammar with commas removed; reused independent Python CHIRON/AP reader'},indent=2));print(checks,rows)
