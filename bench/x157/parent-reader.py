"""Independent message-only literal CHIRON reader, including polyglot/Hangul.
No TypeScript imports. Refuses operations and layout markers, caps each expansion.
"""
import re
HEADS=['Before ¶ k=v. expand; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n']
POLY=[(0x370,0x400),(0x530,0x600),(0x900,0xb00),(0xb80,0xe80),(0x10a0,0x1100)]
SCRIPTS=[[(0x400,0x500)],[(0x600,0x700)],[(0xac00,0xd7a4)],[(0x30a0,0x3100)],[(0x1000,0x10a0)],[(0x1780,0x1800)],[(0x4e00,0xa000)],POLY]
def parent_read(message):
 message.encode('utf8')
 if len(message.encode('utf-16-le'))//2>50000:raise ValueError('wire cap')
 head=next((h for h in HEADS if message.startswith(h+'§')),None)
 if head is None:return message
 tape,body=message[len(head)+1:].split('¶',1)
 if not tape or any(c in tape+body for c in ('॥','×','…','⁂')):raise ValueError('unsupported operator')
 ranges=next((rs for rs in SCRIPTS if any(a<=ord(tape[0])<b for a,b in rs)),None)
 if ranges is None:raise ValueError('script')
 def symbol(c):return any(a<=ord(c)<b for a,b in ranges)
 seen=set();values={};pos=0
 def expand(s):
  out=[];units=0
  for c in s:
   if symbol(c) and c not in values:raise ValueError('undefined/self reference')
   v=values.get(c,c);units+=len(v.encode('utf-16-le'))//2
   if units>50000:raise ValueError('expansion cap')
   out.append(v)
  return ''.join(out)
 while pos<len(tape):
  g=tape[pos]
  if not symbol(g) or g in seen or len(seen)>=256:raise ValueError('rule cap/tape')
  seen.add(g);end=pos+1
  while end<len(tape) and not(symbol(tape[end]) and tape[end] not in seen):end+=1
  values[g]=expand(tape[pos+1:end]);pos=end
 text=expand(body)
 # No STELI layout syntax is supported by this independent extension.
 if any(re.fullmatch(r'.[0-9]+(?:,[0-9]+)+:[0-9]+ rows single-spaced, (?:pad field k to width k|field k at offset k)(?:, split from the right)?\.\r?',line) for line in text.split('\n')):raise ValueError('unsupported layout')
 return text
