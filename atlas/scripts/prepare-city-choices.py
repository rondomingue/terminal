import sys,json,zipfile,unicodedata,collections,math
from pathlib import Path
root=Path(__file__).resolve().parents[1];cs=json.loads((root/'dist/countries.json').read_text());rows=collections.defaultdict(list)
def norm(s):return ''.join(x for x in unicodedata.normalize('NFKD',s).lower() if x.isalnum() and not unicodedata.combining(x))
with zipfile.ZipFile(sys.argv[1]) as z:
 for row in z.read('cities500.txt').decode().splitlines():
  f=row.split('\t')
  if f[6]=='P' and f[7] in ['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5']:
   rows[f[8].lower()].append((int(f[14]),f[1],f[2],f[3].split(','),float(f[4]),float(f[5]),f[0]))
for c in cs:
 capitals={norm(c['capital']),*[norm(x['name']) for x in c['capitalLocations']]};seen=set(capitals);choices=[]
 for pop,name,ascii_,aliases,lat,lon,geoid in sorted(rows[c['code']],reverse=True):
  if any(norm(x) in capitals for x in [name,ascii_,*aliases]) or norm(name) in seen:continue
  if any(math.hypot(lat-p['center'][1],(lon-p['center'][0])*math.cos(math.radians(lat)))<.035 for p in c['capitalLocations']):continue
  choices.append({'name':ascii_ or name,'geonameId':geoid});seen.add(norm(name));seen.add(norm(ascii_))
  if len(choices)==8:break
 c['cityChoices']=choices
(root/'dist/countries.json').write_text(json.dumps(cs,separators=(',',':'),ensure_ascii=False))
print('Fewer than 3 alternatives:',[(c['name'],[p['name'] for p in c['cityChoices']]) for c in cs if len(c['cityChoices'])<3])
