"""Five independent representation probes, each starts from original bytes.
Classical mechanisms, not claimed as new inventions or native-readable winners.
Together with MARTYS these provide six mechanism-distinct experiments.
"""
import json,re,math
from pathlib import Path
R=Path('bench/x192/receipts')
KEYS={
'rank':'JSON blocks [sorted fields,permutation rank]. For each block unrank the zero-based lexicographic permutation of indices 0..n-1 using factorials, permute its sorted fields accordingly, concatenate blocks and join fields with ASCII spaces. Print only.\n',
'checksum':'JSON blocks [prefix,sum]. Append to each prefix the Unicode scalar whose value is sum minus the sum of Unicode scalar values in prefix. Concatenate blocks; print only.\n',
'delta':'JSON [body,widths,differences]. Each ~ replaces the next number: cumulatively sum differences from zero and render decimal left-padded with zeros to the matching width. Print only.\n',
'distance':'JSON field array. Strings are literal; an integer d copies the field d positions before the current output position. Join output fields with ASCII spaces preserving empties and all other characters; print only.\n',
'parity':'JSON [even,odd]. Interleave Unicode scalars from even then odd until both exhausted; preserve all characters; print only.\n'}
def pack(s,kind):
 if kind=='rank':
  result=[];fields=s.split(' ')
  for i in range(0,len(fields),8):
   block=fields[i:i+8];order=sorted(range(len(block)),key=lambda j:(block[j],j));inverse={j:k for k,j in enumerate(order)};pool=list(range(len(block)));rank=0
   for j in range(len(block)):
    k=pool.index(inverse[j]);rank+=k*math.factorial(len(pool)-1);pool.pop(k)
   result.append([[block[j] for j in order],rank])
  return result
 if kind=='checksum':return [[s[i:i+16][:-1],sum(map(ord,s[i:i+16]))] for i in range(0,len(s),16)]
 if kind=='parity':return [s[::2],s[1::2]]
 if kind=='distance':
  out=[];last={}
  for i,w in enumerate(s.split(' ')):
   out.append(i-last[w] if w in last else w);last[w]=i
  return out
 if '~' in s:return None
 widths=[];deltas=[];previous=0
 def f(m):
  nonlocal previous
  w=m[0]
  if len(w)>64:return w
  n=int(w);widths.append(len(w));deltas.append(n-previous);previous=n;return '~'
 return [re.sub('[0-9]+',f,s),widths,deltas]
def undo(v,k):
 if k=='rank':
  out=[]
  for words,rank in v:
   pool=list(range(len(words)));assert 0<=rank<math.factorial(len(words))
   while pool:
    d,rank=divmod(rank,math.factorial(len(pool)-1));out.append(words[pool.pop(d)])
  return ' '.join(out)
 if k=='checksum':return ''.join(prefix+chr(total-sum(map(ord,prefix))) for prefix,total in v)
 if k=='parity':return ''.join(v[j][i] for i in range(len(v[0])) for j in range(2) if i<len(v[j]))
 if k=='distance':
  out=[]
  for x in v:
   if type(x)is int:assert 1<=x<=len(out);out.append(out[-x])
   else:assert isinstance(x,str);out.append(x)
  return ' '.join(out)
 body,widths,deltas=v;assert body.count('~')==len(widths)==len(deltas);n=0;i=0
 def f(m):
  nonlocal n,i
  n+=deltas[i];w=str(n).zfill(widths[i]);assert n>=0 and len(w)==widths[i];i+=1;return w
 return re.sub('~',f,body)
files=[x['path'] for x in json.loads((R/'screen.json').read_text())['rows']]
rows=[];checks=0
for kind in KEYS:
 for source in ['', '  a\r\nb\t😀\0', 'a b a b', '000 999 001', '🙂é中']:
  v=pack(source,kind)
  if v is not None:assert undo(v,kind).encode()==source.encode();checks+=1
 for path in files:
  source=Path(path).read_bytes().decode();v=pack(source,kind)
  if v is None:continue
  assert undo(v,kind).encode()==source.encode();message=KEYS[kind]+json.dumps(v,ensure_ascii=False,separators=(',',':'));rows.append(dict(family=kind,path=path,message=message));checks+=1
# Attacks on substitutes: sorting without rank and using a modal normalization collide.
assert sorted('a b'.split())==sorted('b a'.split()) and 'a b'!='b a';checks+=1
assert ' '.join('a  b\r\n'.split())==' '.join('a b\n'.split());checks+=1
# A sum is not an inverse if two fields are erased: same sum, different strings.
assert sum(map(ord,'ab'))==sum(map(ord,'ba')) and 'ab'!='ba';checks+=1
try:undo([1],'distance')
except AssertionError:checks+=1
else:raise AssertionError('forward reference accepted')
try:undo([[['a','b'],2]],'rank')
except AssertionError:checks+=1
else:raise AssertionError('out-of-range rank accepted')
(R/'portfolio-messages.json').write_text(json.dumps(dict(checks=checks,rows=rows),ensure_ascii=False));print(checks,len(rows))
