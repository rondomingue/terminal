"""Create Atlas's 1200×630 social preview using Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
root=Path(__file__).resolve().parents[1]
im=Image.new('RGB',(1200,630),'#0b171d');d=ImageDraw.Draw(im)
for x in range(1200):
 t=x/1199;d.line((x,0,x,630),fill=(int(11+6*t),int(23+14*t),int(29+10*t)))
ink='#e5e9dc';mint='#a4d5b3';muted='#a5b9b0'
serif='/System/Library/Fonts/Supplemental/Georgia.ttf';sans='/System/Library/Fonts/Supplemental/Arial.ttf'
font=lambda n,kind=sans:ImageFont.truetype(kind,n)
d.text((72,56),'THE WORLD, AT YOUR FINGERTIPS',font=font(18),fill=mint)
d.text((65,123),'atlas.',font=font(142,serif),fill=ink)
d.text((76,316),'A world worth knowing.',font=font(34,serif),fill=ink)
d.text((76,383),'Countries. Capitals. Flags.',font=font(23),fill=muted)
d.line((76,464,626,464),fill='#365249',width=1)
d.text((76,490),'Created out of love for world geography.',font=font(19),fill=muted)
d.text((76,533),'Ron Domingue  ·  rondomingue.com',font=font(19),fill=mint)
cx,cy,r=955,308,224
for i in range(7):
 rr=r+i*5;d.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),outline=(26-i*2,50-i*3,48-i*3),width=3)
d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#1e3c3b',outline=mint,width=2)
for ratio in [.32,.67]:
 rx=r*ratio;d.ellipse((cx-rx,cy-r,cx+rx,cy+r),outline='#6d9e8e',width=1)
for ratio in [-.65,-.33,0,.33,.65]:
 yy=cy+r*ratio;half=r*math.sqrt(1-ratio*ratio);d.line((cx-half,yy,cx+half,yy),fill='#6d9e8e',width=1)
for dx,dy in [(-110,-65),(40,58),(110,-70),(-40,125)]:
 x,y=cx+dx,cy+dy;d.ellipse((x-5,y-5,x+5,y+5),fill='#f4c875',outline='#0b171d',width=1)
im.save(root/'dist/og-atlas.png',optimize=True)
print('Created Atlas social preview: 1200×630')
