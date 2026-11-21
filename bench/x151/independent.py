"""Independent Python decoder for the tested Cyrillic, operator-free envelope.
This narrow reader deliberately refuses other scripts, layout markers and
CHIRON operators. It does not import any repo codec. Not a model test.
"""
import hashlib, json, math, re, sys
from pathlib import Path
m=Path(sys.argv[1] if len(sys.argv)>1 else 'bench/x151/receipts/unit-envelope.txt').read_bytes().decode('utf-8')
source=Path(sys.argv[2] if len(sys.argv)>2 else 'bench/x151/receipts/unit-source.txt').read_bytes()
contract=(r'^After decoding, replace the sole ~ with ([4-8]) lowercase hexadecimal digits, including leading zeroes: '
          r'use the zero-based lexicographic permutation rank of the (\d+) consecutive § rule keys starting at rule (\d+) '
          r'\(rules count from 1\), reduced modulo 16\^\1\. Sort keys by Unicode code point for ranking\. Preserve everything else\.\n')
h=re.match(contract,m)
if not h: raise ValueError('contract')
w,n,start=map(int,h.groups());parent=m[h.end():];head='¶ k=v. expand repeatedly; print only.\n'
if not parent.startswith(head+'§'):raise ValueError('unsupported parent')
tape,body=parent[len(head)+1:].split('¶',1)
if any(x in tape+body for x in ('॥','×','…','⁂')):raise ValueError('unsupported parent operator')
def inscript(c):return 0x400<=ord(c)<0x500
seen=set();rules=[];pos=0
while pos<len(tape):
    glyph=tape[pos]
    if not inscript(glyph) or glyph in seen:raise ValueError('bad tape')
    seen.add(glyph);end=pos+1
    while end<len(tape) and not (inscript(tape[end]) and tape[end] not in seen):end+=1
    rules.append((glyph,tape[pos+1:end]));pos=end
window=rules[start-1:start-1+n]
if len(window)!=n or math.factorial(n)<16**w:raise ValueError('window')
keys=set(k for k,_ in window)
if any(any(c in keys for c in v) for _,v in window):raise ValueError('dependencies')
rank=0;pool=sorted(keys)
for k,_ in window:
    i=pool.index(k);rank+=i*math.factorial(len(pool)-1);pool.pop(i)
values={}
def expand(s):
    out=[]
    for c in s:
        if inscript(c) and c not in values:raise ValueError('forward ref')
        out.append(values.get(c,c))
    return ''.join(out)
for k,v in rules:values[k]=expand(v)
folded=expand(body)
if folded.count('~')!=1:raise ValueError('arity')
result=folded.replace('~',format(rank%(16**w),f'0{w}x')).encode('utf-8')
if result!=source:raise AssertionError('bytes differ')
print(json.dumps({'bytes':len(source),'sha256':hashlib.sha256(source).hexdigest(),'byteExact':True,'scope':'narrow Python reader; not a model test'}))
