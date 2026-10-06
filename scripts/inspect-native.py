"""Read existing executable menu resources without executing or modifying it."""
import struct, pathlib, json
file=pathlib.Path(__file__).resolve().parents[2]/'MyLogicSV51/Bin/Sched_Logic.exe'
b=file.read_bytes()
u16=lambda p:struct.unpack_from('<H',b,p)[0]
u32=lambda p:struct.unpack_from('<I',b,p)[0]
pe=u32(0x3c); n=u16(pe+6); optional=u16(pe+20); sec=pe+24+optional
sections=[]
for i in range(n):
 p=sec+i*40; name=b[p:p+8].rstrip(b'\0').decode(); size=u32(p+8);rva=u32(p+12); raw=u32(p+20);sections.append((name,rva,size,raw))
def offset(rva):
 for name,a,size,raw in sections:
  if a<=rva<a+size:return raw+rva-a
 raise ValueError(rva)
base=next(raw for name,a,size,raw in sections if name=='.rsrc')
def directory(rel,path=[]):
 p=base+rel; count=u16(p+12)+u16(p+14)
 for i in range(count):
  q=p+16+i*8;name=u32(q);target=u32(q+4)
  if target&0x80000000:yield from directory(target&0x7fffffff,path+[name])
  else:
   q=base+target;rva=u32(q);size=u32(q+4);yield path+[name],b[offset(rva):offset(rva)+size]
def menu(blob):
 if struct.unpack_from('<H',blob)[0]!=0:return []
 p=4+struct.unpack_from('<H',blob,2)[0]
 def string():
  nonlocal p
  start=p
  while blob[p:p+2]!=b'\0\0':p+=2
  text=blob[start:p].decode('utf-16-le');p+=2;return text
 def items():
  nonlocal p
  result=[]
  while p+2<=len(blob):
   flags=struct.unpack_from('<H',blob,p)[0];p+=2
   if not flags&0x10:p+=2
   text=string();children=items() if flags&0x10 else None
   if text:result.append({'text':text,'children':children} if children else text)
   if flags&0x80:break
  return result
 return items()
for resource,blob in directory(0):
 if resource==[4,111,1033]:
  try:print(json.dumps({'resource':resource,'menu':menu(blob)},ensure_ascii=False))
  except (IndexError,struct.error):pass
