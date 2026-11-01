"""Create reusable public-domain Natural Earth water labels. Inputs: marine polygons, lakes."""
import json,sys,math
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'dist'
def area(r):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(r,r[1:])))
def point(g):
 polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']];rings=max(polys,key=lambda p:area(p[0]));r=rings[0];low=min(c[1] for c in r);high=max(c[1] for c in r);best=None
 for frac in [.5,.4,.6,.3,.7]:
  y=low+(high-low)*frac;cross=[]
  for ring in rings:
   for a,b in zip(ring,ring[1:]):
    if (a[1]>y)!=(b[1]>y):cross.append(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))
  cross.sort()
  for a,b in zip(cross[::2],cross[1::2]):
   if best is None or b-a>best[0]:best=(b-a,[(a+b)/2,y])
 return [round(c,4) for c in (best[1] if best else r[0])]
features=[]
for kind,file in [('marine',sys.argv[1]),('lake',sys.argv[2])]:
 x=json.load(open(file))
 for f in x['features']:
  p=f['properties'];name=p.get('name_en') or p.get('name')
  if not name or p.get('featurecla')=='Reservoir':continue
  rank=p.get('scalerank') or 0;type=p.get('featurecla','lake');level=0 if type=='ocean' else 2 if kind=='marine' and rank<=4 else 4 if kind=='marine' else max(3,min(7,math.ceil(p.get('min_label') or 5)))
  features.append({'type':'Feature','properties':{'id':str(p.get('ne_id',name)),'name':name,'kind':'ocean' if type=='ocean' else 'lake' if kind=='lake' else 'sea','rank':rank,'minzoom':level},'geometry':{'type':'Point','coordinates':point(f['geometry'])}})
(out/'water-labels.geojson').write_text(json.dumps({'type':'FeatureCollection','attribution':'Natural Earth, public domain. Modern English geographic names.','source':'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/','features':features},ensure_ascii=False,separators=(',',':')))
print(len(features),'water labels')

lakes=json.load(open(sys.argv[2]));features=[]
def rounded(v):return [rounded(x) for x in v] if isinstance(v,list) else round(v,4) if isinstance(v,float) else v
for f in lakes['features']:
 if f['properties'].get('featurecla')=='Reservoir':continue
 features.append({'type':'Feature','properties':{},'geometry':{'type':f['geometry']['type'],'coordinates':rounded(f['geometry']['coordinates'])}})
(out/'water-lakes.geojson').write_text(json.dumps({'type':'FeatureCollection','attribution':'Natural Earth, public domain; present-day natural lake outlines.','features':features},separators=(',',':')))
