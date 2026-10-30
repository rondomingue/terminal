import json,math,urllib.request,concurrent.futures,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
raw=json.load(open('/private/tmp/atlas-countries.json'))
countries=[]
for c in raw:
 if not(c.get('unMember') or c['cca3'] in ['VAT','PSE']):continue
 region='Asia' if c['cca3']=='CYP' else c['region']
 if region=='Americas':region='South America' if c['subregion']=='South America' else 'North America'
 countries.append(dict(id=c['cca3'],code=c['cca2'].lower(),name=c['name']['common'],continent=region,center=list(reversed(c['latlng'])),capital=', '.join(c['capital']),area=c['area'],flag=c['flag']))
countries.sort(key=lambda c:c['name'])
assert len(countries)==195,len(countries)
(root/'dist/countries.json').write_text(json.dumps(countries,ensure_ascii=False,separators=(',',':')))
def simplify(points,tol):
 if len(points)<5:return points
 a=points[0];b=points[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
 maxd=0;idx=0
 for i,p in enumerate(points[1:-1],1):
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2
  if d>maxd:maxd=d;idx=i
 if maxd>tol*tol:return simplify(points[:idx+1],tol)[:-1]+simplify(points[idx:],tol)
 return [a,b]
def ring(r,tol):
 half=len(r)//2;s=simplify(r[:half+1],tol)[:-1]+simplify(r[half:],tol)
 return [[round(x,4),round(y,4)] for x,y,*_ in (s if len(s)>=4 else r)]
geo=json.load(open('/private/tmp/atlas-geo.json'));known={c['id']:c for c in countries};out=[]
for i,f in enumerate(geo['features']):
 code=f['properties']['ISO3166-1-Alpha-3'];name=f['properties']['name'];g=f['geometry'];tol=.012 if known.get(code,{}).get('area',10000)>3000 else .0003
 if g['type']=='Polygon':g['coordinates']=[ring(r,tol) for r in g['coordinates']]
 elif g['type']=='MultiPolygon':g['coordinates']=[[ring(r,tol) for r in poly] for poly in g['coordinates']]
 out.append(dict(type='Feature',id=i,properties=dict(code=code,name=name,continent=known.get(code,{}).get('continent','Other')),geometry=g))
(root/'dist/world.geojson').write_text(json.dumps(dict(type='FeatureCollection',features=out),separators=(',',':')))
missing=set(known)-{f['properties']['code'] for f in out};print('Countries:',len(countries),'Boundary gaps:',sorted(missing),'(small-country targets cover all countries under 3,000 km²)')
def flag(c):
 p=root/'dist/flags'/f"{c['code']}.png"
 if not p.exists():
  req=urllib.request.Request(f"https://flagcdn.com/w320/{c['code']}.png",headers={'User-Agent':'Atlas quiz data preparation'})
  p.write_bytes(urllib.request.urlopen(req,timeout=30).read())
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(flag,countries))
print('Local flags:',len(list((root/'dist/flags').glob('*.png'))),'Geometry bytes:',(root/'dist/world.geojson').stat().st_size)
