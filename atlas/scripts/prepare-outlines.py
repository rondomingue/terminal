"""Generate country silhouette SVGs from the quiz's bundled Natural Earth geometry."""
import json,pathlib,math,html
root=pathlib.Path(__file__).resolve().parents[1];geo=json.loads((root/'dist/world.geojson').read_text());countries=json.loads((root/'dist/countries.json').read_text());out=root/'dist/outlines';out.mkdir(exist_ok=True)
def unwrap(ring):
 result=[]
 for x,y in ring:
  if result:
   while x-result[-1][0]>180:x-=360
   while x-result[-1][0]<-180:x+=360
  result.append([x,y])
 return result
def area(r):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(r,r[1:]+r[:1])))/2
for c in countries:
 polys=[]
 for f in geo['features']:
  if f['properties']['code']!=c['id']:continue
  g=f['geometry'];polys.extend(g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']])
 assert polys,c['id']
 polys=[[unwrap(r) for r in poly] for poly in polys]
 main=max(polys,key=lambda p:area(p[0]));mx=sum(x for x,y in main[0])/len(main[0]);xs=[x for x,y in main[0]];ys=[y for x,y in main[0]]
 aligned=[]
 for poly in polys:
  cx=sum(x for x,y in poly[0])/len(poly[0]);shift=round((mx-cx)/360)*360
  poly=[[[x+shift,y] for x,y in r] for r in poly]
  px=[x for x,y in poly[0]];py=[y for x,y in poly[0]]
  if c['area']<100000 or (max(px)>=min(xs)-20 and min(px)<=max(xs)+20 and max(py)>=min(ys)-15 and min(py)<=max(ys)+15):aligned.append(poly)
 points=[p for poly in aligned for r in poly for p in r];lat=sum(y for x,y in main[0])/len(main[0]);cos=max(.18,math.cos(math.radians(lat)));points=[[x*cos,-y] for x,y in points];xmin=min(x for x,y in points);xmax=max(x for x,y in points);ymin=min(y for x,y in points);ymax=max(y for x,y in points);scale=min(266/max(xmax-xmin,.0001),176/max(ymax-ymin,.0001));ox=(300-(xmax-xmin)*scale)/2;oy=(210-(ymax-ymin)*scale)/2
 commands=[]
 for poly in aligned:
  for r in poly:
   commands.append('M'+'L'.join(f'{(x*cos-xmin)*scale+ox:.2f},{(-y-ymin)*scale+oy:.2f}' for x,y in r)+'Z')
 name=html.escape(c['name']);svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 210" role="img"><title>{name} — simplified main outline</title><path d="{"".join(commands)}" fill="#a8d6b5" stroke="#d7f0df" stroke-width=".65" stroke-linejoin="round" fill-rule="evenodd"/></svg>'
 (out/(c['code']+'.svg')).write_text(svg)
print(f'Generated silhouettes for all {len(countries)} places.')
