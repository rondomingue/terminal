"""Create compact, gently enveloped PCM reward chimes; no external audio assets."""
import math,wave,struct,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'dist/audio';root.mkdir(exist_ok=True)
for name,notes in {'reward':[(523.25,0),(659.25,.12),(783.99,.24)],'rank':[(523.25,0),(659.25,.10),(783.99,.20),(1046.5,.34)],'complete':[(523.25,0),(659.25,.12),(783.99,.24),(1046.5,.38),(1318.51,.54)]}.items():
 rate=44100;duration=notes[-1][1]+.65;samples=[]
 for i in range(int(rate*duration)):
  t=i/rate;v=0
  for freq,start in notes:
   d=t-start
   if 0<=d<.65:
    envelope=(1-math.exp(-d/.009))*math.exp(-d/.15)*max(0,1-d/.65)
    v+=envelope*(math.sin(2*math.pi*freq*d)+.16*math.sin(2*math.pi*freq*2*d))
  samples.append(v)
 peak=max(abs(v) for v in samples) or 1
 with wave.open(str(root/(name+'.wav')),'wb') as f:
  f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(b''.join(struct.pack('<h',round(v/peak*.6*32767)) for v in samples))
print('Generated reward, rank-up and completion chimes.')
