"""Independent Python counter-stack inverse; source files are ground truth.
Reuse X157's separate Python parent interpreter, never encoder decoded fields.
"""
import re,json,sys,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('parent','bench/x157/parent-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent)
KEY='Decode first. Scan line prefixes after spaces and optional 1-6 hashes plus a space. Number prefixes have 1-12 positive decimal components, each 1-6 digits without leading zeros, dot-separated; they set state (initially empty). @D truncates state to D components and increments the last, or appends .1 if one deeper; emit the resulting number. Prefixes end before optional trailing dot then space/tab/end. Preserve everything else. Print only.\n'
def undo(s):
 state=[];out=[]
 for line in s.split('\n'):
  prefix=re.match(r' *(?:#{1,6} )?',line)[0];rest=line[len(prefix):]
  if rest.startswith('@'):
   m=re.match(r'@([1-9]|1[0-2])(?=\.?[ \t]|\.?\r?$)',rest)
   if not m:raise ValueError('marker')
   d=int(m[1]);assert d<=len(state)+1
   if d==len(state)+1:state=state+[1]
   else:state=state[:d];state[-1]+=1
   assert state[-1]<=999999
   line=prefix+'.'.join(map(str,state))+rest[len(m[0]):]
  else:
   m=re.match(r'([1-9][0-9]{0,5}(?:\.[1-9][0-9]{0,5}){0,11})(?=\.?[ \t]|\.?\r?$)',rest)
   if m:state=list(map(int,m[1].split('.')))
  out.append(line)
 result='\n'.join(out);assert len(result.encode('utf-16-le'))//2<=50000
 return result
APKEY='⁺ = number at same position above + change from two lines above.\n'
def parent_read(message):
 if not message.startswith(APKEY+'§'):return parent.parent_read(message)
 text=parent.parent_read('Before ¶ k=v. expand; print only.\n'+message[len(APKEY):]);suffix='\nEvery new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.'
 assert 0x400<=ord(message[len(APKEY)+1])<0x500 and text.endswith(suffix)
 text=text[:-len(suffix)];history=[];out=[]
 for line in text.split('\n'):
  nums=[]
  def replace(m):
   token=m[0]
   if token=='⁺':
    k=len(nums);assert len(history)>=2 and len(history[-1])>k and len(history[-2])>k
    value=2*history[-1][k]-history[-2][k]
   else:value=int(token)
   assert abs(value)<=9007199254740991
   nums.append(value);return str(value) if token=='⁺' else token
  out.append(re.sub(r'[0-9]+|⁺',replace,line));history.append(nums)
 result='\n'.join(out);assert len(result.encode('utf-16-le'))//2<=50000
 return result
checks=0;rows=[]
for r in json.loads(Path('bench/x159/receipts/unit-pairs.json').read_text()):assert undo(r['folded'])==r['source'];checks+=1
for r in json.loads(Path('bench/x159/receipts/screen.json').read_text()):
 if 'folded' in r:assert undo(r['folded']).encode()==Path(r['path']).read_bytes();checks+=1
for file in sys.argv[1:]:
 r=json.loads(Path(file).read_text());m=r['message'];decoded=undo(parent_read(m[len(KEY):])) if m.startswith(KEY) else parent_read(m)
 assert decoded.encode()==Path(r['path']).read_bytes();checks+=1;rows.append({'file':file,'path':r['path'],'tokens':r['tokens'],'sourceBytesEqual':True})
for s in ['@2 x','@0 x','@13 x','@01 x','999999 x\n@1 x']:
 try:undo(s)
 except (ValueError,AssertionError):checks+=1
 else:raise AssertionError(s)
suffix='\nEvery new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.'
packet=APKEY+'§аx¶1\n2\n⁺'+suffix
assert parent_read(packet)=='1\n2\n3';checks+=1
assert parent_read(packet+suffix)=='1\n2\n3'+suffix;checks+=1
for bad in [packet[:-1],APKEY+'§аx¶⁺'+suffix,APKEY+'§аx¶1\n\n⁺'+suffix,APKEY+'§аx¶9007199254740992'+suffix]:
 try:parent_read(bad)
 except (ValueError,AssertionError):checks+=1
 else:raise AssertionError('AP attack accepted')
Path('bench/x159/receipts/independent.json').write_text(json.dumps({'checks':checks,'fullMessages':rows,'native':False},indent=2));print(checks)
