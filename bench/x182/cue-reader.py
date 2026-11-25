"""Independent bounded integer/clock STICHOMYTHIA reader; old parents reused."""
import re,importlib.util
spec=importlib.util.spec_from_file_location('old','bench/x170/bounded-parent.py');old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
KEY='spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.'
def parent_read(message):
 message.encode('utf8')
 if len(message.encode('utf-16-le'))//2>50000:raise ValueError('unsupported layout')
 if not message.startswith(KEY+'\n'):return old.parent_read(message)
 tail='\n' if message.endswith('\n') else '';lines=(message[:-1] if tail else message).split('\n')
 if len(lines)!=3:raise ValueError('unsupported layout')
 m=re.fullmatch(r'S([1-9][0-9]{0,3}) sep "([^\r\n]*)" r=0\.\.([0-9]+) body:(.*)',lines[1])
 if not m:raise ValueError('unsupported layout')
 n=int(m[1]);sep=m[2];header=m[4]
 if n>1000 or int(m[3])!=n-1:raise ValueError('unsupported layout')
 def cell(s,r):
  if s.startswith('='):return s[1:]
  if s.endswith('*'):a=s[:-1].split('|');return a[r%len(a)]
  t=re.fullmatch(r'(\d{2}):(\d{2}):(\d{2})@([+-])(\d{1,9})s',s)
  if t:
   h,mi,se=map(int,t.group(1,2,3));step=int(t[5])*(1 if t[4]=='+' else -1);v=h*3600+mi*60+se+step*r
   if h>23 or mi>59 or se>59 or not 0<=v<86400:raise ValueError('unsupported layout')
   return f'{v//3600:02}:{v//60%60:02}:{v%60:02}'
  a=re.fullmatch(r'([^0-9]*?)(-?\d{1,9})([+-])(\d{1,9})\*r([^0-9]*)',s)
  if a:
   v=int(a[2])+int(a[4])*(1 if a[3]=='+' else -1)*r
   return a[1]+('-' if v<0 else '')+str(abs(v)).zfill(len(a[2].lstrip('-')))+a[5]
  if '*r' in s or '@' in s:raise ValueError('unsupported layout')
  a=s.split('|')
  if len(a)!=n:raise ValueError('unsupported layout')
  return a[r]
 specs=lines[2].split(' ; ')
 if len(specs)>64:raise ValueError('unsupported layout')
 out=[] if header=='-' else [header]
 for r in range(n):
  out.append(sep.join(cell(s,r) for s in specs))
  if sum(len(s.encode('utf-16-le'))//2 for s in out)+len(out)-1+len(tail)>50000:raise ValueError('unsupported layout')
 return '\n'.join(out)+tail
