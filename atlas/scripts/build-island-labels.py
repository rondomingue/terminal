from pathlib import Path
import json,math,unicodedata,sys
out=Path(__file__).resolve().parents[1]/'dist'
if len(sys.argv)!=3:raise SystemExit('Usage: build-island-labels.py REST_COUNTRIES_JSON NATURAL_EARTH_REGIONS_GEOJSON')
countries=json.loads((out/'countries.json').read_text())
normalize=lambda s:unicodedata.normalize('NFKD',s).casefold().replace(' islands','').replace(' island','').replace(' is.','').strip()
seen={normalize(c['name']) for c in countries};features=[]
def add(name,center,kind,rank=6):
 if not name or normalize(name) in seen:return
 seen.add(normalize(name));features.append({'type':'Feature','properties':{'name':name,'kind':kind,'rank':rank},'geometry':{'type':'Point','coordinates':[round(center[0],5),round(center[1],5)]}})
for c in json.load(open(sys.argv[1])):
 if c['cca3'] not in {x['id'] for x in countries} and c.get('independent') is not True and c['cca3']!='ATA':
  lat,lon=c.get('latlng',c.get('capitalInfo',{}).get('latlng',[0,0]));add(c['name']['common'],[lon,lat],'territory',1)
def center(geometry):
 polys=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
 best=None
 for poly in polys:
  ring=poly[0];ref=ring[0][0];pts=[(ref+((x-ref+180)%360-180),y) for x,y,*_ in ring];area=0;cx=0;cy=0
  for (x,y),(xx,yy) in zip(pts,pts[1:]+pts[:1]):
   a=x*yy-xx*y;area+=a;cx+=(x+xx)*a;cy+=(y+yy)*a
  if abs(area)<1e-12:continue
  candidate=(abs(area),[((cx/(3*area)+180)%360)-180,cy/(3*area)])
  if best is None or candidate[0]>best[0]:best=candidate
 return best[1] if best else ring[0][:2]
for f in json.load(open(sys.argv[2]))['features']:
 p=f['properties']
 if p['FEATURECLA'] not in ['Island','Island group']:continue
 name=p.get('NAME_EN') or p['NAME'];name=name.title() if name.isupper() else name
 add(name,center(f['geometry']),'island' if p['FEATURECLA']=='Island' else 'island group',p.get('SCALERANK',6))
result={'type':'FeatureCollection','name':'Island and territory reference labels','source':'Natural Earth 1:10m geographic regions and REST Countries territory reference','features':features}
(out/'island-labels.geojson').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
for name in ['British Virgin Islands','United States Virgin Islands','Montserrat','Guadeloupe','Martinique','Tahiti','Hawaiʻi']:
 print(name,any(normalize(f['properties']['name'])==normalize(name) for f in features))
print('Reference labels:',len(features))
