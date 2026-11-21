"""Independent unified-diff inverse; source bytes remain the oracle.
Parent reader reused from X152; no native model behavior is tested.
"""
import re,json,importlib.util,sys
from pathlib import Path
KEY='Decode first. @A@ marks a unified-diff hunk at old start A. Count its following body lines: space/minus for old, space/plus for new, excluding backslash notes. New start=A+prior net insertions in this file+(old count==0)-(new count==0). Restore @@ -A,old +newstart,new @@, omitting ,1 counts; keep suffix and all other bytes. Print only.\n'
def undo(s):
 if len(s.encode('utf-16-le'))//2>50000:raise ValueError('cap')
 s.encode('utf8');lines=s.split('\n');out=[];i=0;balance=0;active=False
 while i<len(lines):
  line=lines[i]
  if line.startswith('diff --git '):balance=0;active=True
  if not line.startswith('@'):out.append(line);i+=1;continue
  m=re.fullmatch(r'@(0|[1-9][0-9]{0,8})@(.*)',line)
  if not active or not m:raise ValueError('frame')
  a=int(m[1]);j=i+1;o=n=0
  while j<len(lines) and lines[j][:1] in (' ','+','-','\\'):
   c=lines[j][:1]
   if c in (' ','-'):o+=1
   if c in (' ','+'):n+=1
   if c=='\\' and lines[j] not in ('\\ No newline at end of file','\\ No newline at end of file\r'):raise ValueError('note')
   j+=1
  b=a+balance+(o==0)-(n==0)
  if not o+n or b<0 or b>999999999 or (o and not a) or (n and not b):raise ValueError('range')
  def span(a,n):return str(a)+('' if n==1 else ','+str(n))
  out.append('@@ -'+span(a,o)+' +'+span(b,n)+' @@'+m[2]);out.extend(lines[i+1:j]);balance+=n-o;i=j
 result='\n'.join(out)
 if len(result.encode('utf-16-le'))//2>50000:raise ValueError('output')
 return result.encode()
spec=importlib.util.spec_from_file_location('parent','bench/x157/parent-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent)
rows=[]
unitChecks=0
for item in json.loads(Path('bench/x157/receipts/unit-roundtrips.json').read_text()):
 assert undo(item['folded'])==item['source'].encode();unitChecks+=1
for r in json.loads(Path('bench/x157/receipts/screen.json').read_text()):
 if r.get('folded') is not None:assert undo(r['folded'])==Path(r['path']).read_bytes();rows.append({'path':r['path'],'kind':'unparented','passed':True})
for file in sys.argv[1:]:
 r=json.loads(Path(file).read_text());assert r['message'].startswith(KEY);folded=parent.parent_read(r['message'][len(KEY):]);assert undo(folded)==Path(r['path']).read_bytes();rows.append({'path':r['path'],'kind':'full message','passed':True})
Path('bench/x157/receipts/independent.json').write_text(json.dumps({'rows':rows,'checks':len(rows)+unitChecks,'unitChecks':unitChecks,'native':False},indent=2));print(len(rows)+unitChecks)
