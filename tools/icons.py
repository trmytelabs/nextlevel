"""Generate the PWA / favicon / Open Graph images without Pillow (pure zlib PNG writer).
Run: python tools/icons.py  -> public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png, public/og.png
"""
import zlib,struct,os,math
OUT=os.path.join(os.path.dirname(__file__),'..','public')
# 16x16 pixel-art mark: an arcade cannon turning into a cyan cube (eras 1 -> 5)
ART=[
"................",
"........cc......",
"......cccccc....",
"......c.cc.c....",
"......cccccc....",
".......c..c.....",
"................",
".......y........",
"......yyy.......",
"....yyyyyyy.....",
"..yyyyyyyyyyy...",
"..yyyyyyyyyyy...",
"................",
"mmmmmmmmmmmmmmmm",
"mmmmmmmmmmmmmmmm",
"................"]
PAL={'c':(77,240,255),'y':(91,255,91),'m':(255,91,224)}
BG=(7,7,11)
def png(w,h,px):
    raw=b''.join(b'\x00'+bytes([v for p in row for v in p]) for row in px)
    def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
def icon(size,pad=0.12):
    px=[[BG]*size for _ in range(size)]
    inner=size*(1-2*pad);cell=inner/16;ox=oy=size*pad
    for y in range(size):
        for x in range(size):
            gx=int((x-ox)//cell);gy=int((y-oy)//cell)
            if 0<=gx<16 and 0<=gy<16:
                ch=ART[gy][gx]
                if ch in PAL:px[y][x]=PAL[ch]
    # scanlines
    for y in range(0,size,max(2,size//64)):
        px[y]=[(int(r*0.8),int(g*0.8),int(b*0.8)) for r,g,b in px[y]]
    return px
def og(w=1200,h=630):
    px=[[BG]*w for _ in range(h)]
    # perspective grid floor (magenta), horizon sun (gradient), title blocks as pixel text is too much work: use the mark big + bars
    for y in range(h//2,h):
        t=(y-h//2)/(h/2)
        for x in range(w):
            u=(x-w/2)/(w/2)
            gx=abs(((u/(0.08+t*1.6))*6)%1-0.5)<0.03
            gy=abs(((1/(t+0.05))*0.25)%1-0.5)<0.05
            if gx or gy:
                k=0.35+0.65*t;px[y][x]=(int(255*k),int(91*k),int(224*k))
    # sun
    cx,cy,r=w//2,h//2,170
    for y in range(cy-r,cy+1):
        for x in range(cx-r,cx+r):
            if (x-cx)**2+(y-cy)**2<=r*r and ((cy-y)//14)%2==0:
                t=(cy-y)/r;px[y][x]=(255,int(240-120*t),int(160-120*t))
    # the mark, centred above the horizon
    m=icon(192,0.0);mx,my=cx-96,cy-r-200
    for y in range(192):
        for x in range(192):
            if m[y][x]!=BG and 0<=my+y<h:px[my+y][mx+x]=m[y][x]
    return px
os.makedirs(OUT,exist_ok=True)
for name,size in[('icon-192.png',192),('icon-512.png',512),('apple-touch-icon.png',180),('favicon-32.png',32)]:
    open(os.path.join(OUT,name),'wb').write(png(size,size,icon(size)))
open(os.path.join(OUT,'og.png'),'wb').write(png(1200,630,og()))
print('icons written to',os.path.abspath(OUT))
