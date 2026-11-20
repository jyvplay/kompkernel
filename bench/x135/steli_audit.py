"""Independent UTF-16-offset STELI inverse after the existing Python CHIRON reader.
Only audited source bytes determine success. Does not infer widths from source.
"""
import json,re,pathlib,importlib.util,sys
root=pathlib.Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('cd',root/'bench/chiron_decode.py');cd=importlib.util.module_from_spec(sp);sp.loader.exec_module(cd)
pattern=re.compile(r'^(.)(\d+(?:,\d+)+):(\d+) rows single-spaced, (pad field k to width k|field k at offset k)(, split from the right)?\.$')
def width(s):return sum(2 if ord(c)>65535 else 1 for c in s)
def undo(s):
 eol='\r\n' if '\r\n' in s else '\n';lines=s.split(eol)
 for i,line in enumerate(lines):
  m=pattern.fullmatch(line)
  if not m:continue
  offsets=list(map(int,m[2].split(',')));n=int(m[3])
  if m[4].startswith('pad'):
   widths=offsets;offsets=[0]
   for w in widths:offsets.append(offsets[-1]+w)
  if i+n>=len(lines):raise ValueError('truncated STELI block')
  rebuilt=[];k=len(offsets)
  for row in lines[i+1:i+1+n]:
   fields=row.rsplit(' ',k-1) if m[5] else row.split(' ',k-1)
   if len(fields)!=k:raise ValueError('field count')
   out=''
   for at,f in zip(offsets,fields):
    pad=at-width(out)
    if pad<0:raise ValueError('overlapping fields')
    out+=' '*pad+f
   rebuilt.append(out)
  return eol.join(lines[:i]+rebuilt+lines[i+1+n:])
 return s
# Targeted attacks on this added reader, no manufactured corpus gains.
assert undo('‡2,5:1 rows single-spaced, field k at offset k.\nx y\n')=='  x  y\n'
assert undo('‡0,4:1 rows single-spaced, field k at offset k.\n🙂 z\n')=='🙂  z\n'
try:undo('‡0,1:1 rows single-spaced, field k at offset k.\nlong x\n');raise AssertionError('overlap accepted')
except ValueError:pass
rows=[]
frontier=root/(sys.argv[1] if len(sys.argv)>1 else 'bench/x135/receipts/frontier.jsonl')
for line in frontier.read_text().splitlines():
 a=json.loads(line);m=a['message'];i=m.find('§');layer=cd.decode(m[i:]) if i>=0 else m
 try:expanded=undo(layer);exact=expanded.encode('utf8')==(root/a['path']).read_bytes()
 except ValueError:exact=False
 rows.append({'path':a['path'],'chironOnly':layer.encode('utf8')==(root/a['path']).read_bytes(),'withSteli':exact})
rotations=[]
for line in (root/'bench/x135/receipts/rotation.jsonl').read_text().splitlines():
 a=json.loads(line);head,inner=a['message'].split('\n',1)
 try:
  at=inner.find('§');expanded=undo(cd.decode(inner[at:]) if at>=0 else inner)
  if head=='Decode; move final line (including newline) to front.':
   if not expanded.endswith('\n'):raise ValueError('incomplete line')
   cut=expanded.rfind('\n',0,len(expanded)-1)+1;result=expanded[cut:]+expanded[:cut]
  else:
   match=re.fullmatch(r'After decoding, swap the parts at (↶|⤴|◊|⟲); omit \1\.',head)
   if not match:raise ValueError('inverse not declared')
   pieces=expanded.split(match[1])
   if len(pieces)!=2:raise ValueError('marker multiplicity')
   result=pieces[1]+pieces[0]
  exact=result.encode('utf8')==(root/a['path']).read_bytes()
 except ValueError:exact=False
 rotations.append({'path':a['path'],'cut':a['cut'],'sourceExact':exact})
print(json.dumps({'reader':'independent Python CHIRON + new STELI offset inverse','lanes':len(rows),'chironOnly':sum(r['chironOnly'] for r in rows),'withSteli':sum(r['withSteli'] for r in rows),'rows':rows,'rotationTrials':rotations,'rotationSourceExact':sum(r['sourceExact']for r in rotations)},indent=2))
