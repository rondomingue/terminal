"""Extend Atlas with twelve territories; run after prepare-data.py and prepare-facts.py."""
import json,pathlib,re,html,sys,concurrent.futures,urllib.request
root=pathlib.Path(__file__).resolve().parents[1];dist=root/'dist';raw={c['cca3']:c for c in json.load(open('/private/tmp/atlas-countries.json'))};fb=pathlib.Path('/private/tmp/atlas-factbook')
paths={'GRL':'north-america/gl.json','PRI':'central-america-n-caribbean/rq.json','BMU':'north-america/bd.json','ABW':'central-america-n-caribbean/aa.json','CUW':'central-america-n-caribbean/uc.json','CYM':'central-america-n-caribbean/cj.json','FLK':'south-america/fk.json','PYF':'australia-oceania/fp.json','NCL':'australia-oceania/nc.json','GIB':'europe/gi.json','FRO':'europe/fo.json','GUF':None}
def clean(x):
 if isinstance(x,dict):x=x.get('text','')
 return re.sub(r'\s+',' ',re.sub('<[^>]+>','',html.unescape(str(x or '')))).strip()
countries=[c for c in json.loads((dist/'countries.json').read_text()) if not c.get('territory')];facts=json.loads((dist/'facts.json').read_text());geo=json.loads((dist/'world.geojson').read_text())
# Natural Earth groups French Guiana with France. Split that territory for quiz selection.
if not any(f['properties']['code']=='GUF' for f in geo['features']):
 for f in list(geo['features']):
  if f['properties']['code']!='FRA':continue
  polys=f['geometry']['coordinates'];chosen=[p for p in polys if any(-55<x<-50 and 1<y<7 for x,y in p[0])]
  assert chosen
  f['geometry']['coordinates']=[p for p in polys if p not in chosen]
  geo['features'].append({'type':'Feature','id':max(f['id'] for f in geo['features'])+1,'properties':{'code':'GUF','name':'French Guiana','continent':'South America','territory':True},'geometry':{'type':'MultiPolygon','coordinates':chosen}})
for id,p in paths.items():
 c=raw[id];region=c['region'];region=('South America' if c['subregion']=='South America' else 'North America') if region=='Americas' else region
 countries.append(dict(id=id,code=c['cca2'].lower(),name=c['name']['common'],continent=region,center=list(reversed(c['latlng'])),capital=', '.join(c['capital']),area=c['area'],flag=c['flag'],territory=True))
 for f in geo['features']:
  if f['properties']['code']==id:f['properties'].update(continent=region,territory=True)
 if not p:continue
 x=json.loads((fb/p).read_text());people=x.get('People and Society',{});g=x.get('Geography',{});lang=people.get('Languages',{});gov=x.get('Government',{}).get('Government type',{});rel=people.get('Religions',{});exchange=x.get('Economy',{}).get('Exchange rates',{})
 facts['countries'][id]=dict(languages=clean(lang.get('Languages',lang)),languageNote=clean(lang.get('note','')),religions=clean(rel) or 'No religious-affiliation estimate is supplied in this reference profile.',religionNote=clean(rel.get('note','')),government=clean(gov) or 'See the territory’s linked administrative profile.',governmentNote=clean(gov.get('note','')),population=clean(people.get('Population',{}).get('total',people.get('Population',{}))),location=clean(g.get('Location')),climate=clean(g.get('Climate')),terrain=clean(g.get('Terrain')),currency=re.sub(r'\s+per US dollar.*$','',clean(exchange.get('Currency',exchange)),flags=re.I).rstrip(' -'),sources=[dict(label='World Factbook archived territory profile',url='https://github.com/factbook/factbook.json/blob/master/'+p)])
facts['countries']['GUF']=dict(languages='French is the official language. French Guianese Creole and several Indigenous and Maroon languages are also spoken.',languageNote='',religions='No territory-specific religious-affiliation estimate is supplied in the linked reference profile.',religionNote='Do not substitute France-wide percentages for a territory-specific estimate.',government='Single territorial collectivity of France, exercising departmental and regional responsibilities.',governmentNote='French Guiana is part of France, rather than an independent sovereign country.',population='See INSEE’s dated population table in the linked territory profile.',location='Northeastern South America, between Suriname and Brazil, on the Atlantic coast.',climate='Tropical, hot and humid; little seasonal variation in temperature.',terrain='Low coastal plains rising toward hills in the interior; extensive Amazonian rainforest.',currency='Euro (EUR)',sources=[dict(label='INSEE · French Guiana territory profile and population',url='https://www.insee.fr/fr/statistiques/1405599?geo=DEP-973'),dict(label='IEDOM · French Guiana economic overview',url='https://www.iedom.fr/French-Guiana-Economic-overview?lang=en'),dict(label='INSEE · Overseas departments and regions',url='https://www.insee.fr/en/metadonnees/definition/c2316')])
for id in paths:
 f=facts['countries'][id]
 for k in ['languages','government','population','location','climate','terrain','currency']:
  if not f.get(k):f[k]='Not specified in this archived reference.'
countries.sort(key=lambda c:c['name']);assert len(countries)==207
for p,data in [(dist/'countries.json',countries),(dist/'facts.json',facts),(dist/'world.geojson',geo)]:p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
def download(id):
 c=raw[id];p=dist/'flags'/(c['cca2'].lower()+'.png')
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://flagcdn.com/w320/'+c['cca2'].lower()+'.png',timeout=30).read())
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(download,paths))
print('Added twelve territories, including French Guiana, with boundaries, flags and profiles.')
