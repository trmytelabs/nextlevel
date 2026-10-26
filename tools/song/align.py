"""Time the lyric lines of a song for its map.json with faster-whisper (word timestamps) and a sequence alignment.

  <whisper venv>/python tools/song/align.py next-level [model]       # model: base.en (default), small.en, medium.en

1. faster-whisper transcribes public/songs/<id>/<audio> with word timestamps, primed with the lyrics (initial_prompt) so
   sung words come out spelled like the lyric sheet.
2. The transcript words are aligned to the lyric words (from src/core.ts) with a Needleman-Wunsch alignment scored by
   string similarity, so skipped, repeated or misheard words do not shift everything after them.
3. Each line starts at its first matched word (minus that word's offset into the line at the song's pace); lines with no
   matched word are interpolated between their neighbours. lastLyricEnd is the end of the last matched word.
Writes lines + lastLyricEnd into map.json (keeps bpm, duration, title) and prints a per-line report with match counts.
"""
import os,re,sys,json,difflib
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
def lyrics():
    s=open(os.path.join(ROOT,'src','core.ts'),encoding='utf-8').read()
    return [m for m in re.findall(r'^\[[\d.]+,"(.*)"\],?\]?;?\s*$',s,re.M)]
norm=lambda w:re.sub(r"[^a-z0-9']","",w.lower().replace('’',"'"))
def main():
    sid=sys.argv[1] if len(sys.argv)>1 else 'next-level';model=sys.argv[2] if len(sys.argv)>2 else 'base.en'
    d=os.path.join(ROOT,'public','songs',sid);mp=os.path.join(d,'map.json');m=json.load(open(mp,encoding='utf-8'))
    L=lyrics();assert len(L)==40,len(L)
    # PyAV (faster-whisper's own decoder) may be blocked by Windows application control: stand it in with an empty module and
    # decode with ffmpeg ourselves (16 kHz mono float32), which is all faster-whisper needs
    import types,subprocess,glob,numpy as np
    sys.modules.setdefault('av',types.ModuleType('av'))
    from faster_whisper import WhisperModel
    ff=os.environ.get('FFMPEG') or next(iter(glob.glob(os.path.join(os.environ.get('LOCALAPPDATA',''),'Microsoft','WinGet','Packages','Gyan.FFmpeg*','*','bin','ffmpeg.exe'))),'ffmpeg')
    pcm=subprocess.run([ff,'-v','error','-i',os.path.join(d,m.get('audio','song.mp3')),'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True,check=True).stdout
    audio=np.frombuffer(pcm,dtype=np.float32).copy()
    wm=WhisperModel(model,device='cpu',compute_type='int8')
    prompt=' '.join(L)
    segs,info=wm.transcribe(audio,language='en',word_timestamps=True,initial_prompt=prompt[:800],
                            condition_on_previous_text=False,vad_filter=False,beam_size=5)
    words=[]
    for s in segs:
        for w in (s.words or []):
            t=norm(w.word)
            if t:words.append((t,w.start,w.end))
    json.dump(words,open(os.path.join(ROOT,'tools','song','words-'+sid+'.json'),'w'),indent=0)  # the raw transcript, for checking
    lw=[];owner=[]
    for i,l in enumerate(L):
        for w in l.split():
            t=norm(w)
            if t:lw.append(t);owner.append(i)
    # Needleman-Wunsch: lyric words (rows) vs transcript words (cols)
    n,k=len(lw),len(words);G=-0.6
    sim=lambda a,b:1.0 if a==b else (difflib.SequenceMatcher(None,a,b).ratio()*1.6-0.8)
    S=[[0.0]*(k+1) for _ in range(n+1)];B=[[0]*(k+1) for _ in range(n+1)]
    for i in range(1,n+1):S[i][0]=S[i-1][0]+G;B[i][0]=1
    for j in range(1,k+1):S[0][j]=S[0][j-1]+G*0.3;B[0][j]=2   # unmatched transcript words (ad libs) are cheap
    for i in range(1,n+1):
        a=lw[i-1];Si=S[i];Sp=S[i-1]
        for j in range(1,k+1):
            d0=Sp[j-1]+sim(a,words[j-1][0]);d1=Sp[j]+G;d2=Si[j-1]+G*0.3
            if d0>=d1 and d0>=d2:Si[j]=d0;B[i][j]=0
            elif d1>=d2:Si[j]=d1;B[i][j]=1
            else:Si[j]=d2;B[i][j]=2
    i,j=n,k;match=[None]*n
    while i>0 or j>0:
        b=B[i][j]
        if i>0 and j>0 and b==0:
            if sim(lw[i-1],words[j-1][0])>0.2:match[i-1]=j-1
            i-=1;j-=1
        elif i>0 and (j==0 or b==1):i-=1
        else:j-=1
    first=[None]*40;cnt=[0]*40;tot=[0]*40;lastEnd=None
    for wi,o in enumerate(owner):
        tot[o]+=1
        if match[wi] is not None:
            cnt[o]+=1;_,st,en=words[match[wi]]
            if first[o] is None:
                # offset back to the line start by the words skipped before it (~0.35 s a word)
                k0=sum(1 for q in range(wi) if owner[q]==o);first[o]=st-0.35*k0
            if o==39:lastEnd=en
    # monotonic + interpolate gaps
    t=first[:]
    for i2 in range(40):
        if t[i2] is not None and i2>0 and t[i2-1] is not None and t[i2]<=t[i2-1]+0.5:t[i2]=None;cnt[i2]=0
    known=[i2 for i2 in range(40) if t[i2] is not None]
    for i2 in range(40):
        if t[i2] is None:
            lo=max([q for q in known if q<i2],default=None);hi=min([q for q in known if q>i2],default=None)
            if lo is not None and hi is not None:t[i2]=t[lo]+(t[hi]-t[lo])*(i2-lo)/(hi-lo)
            elif lo is not None:t[i2]=t[lo]+3.7*(i2-lo)
            else:t[i2]=t[hi]-3.7*(hi-i2)
    for i2,l in enumerate(L):print('%2d %7.2f  %d/%d  %s'%(i2,t[i2],cnt[i2],tot[i2],l))
    m['lines']=[round(x,3) for x in t];m['lastLyricEnd']=round(lastEnd if lastEnd else t[39]+3,3);m['aligned']={'model':model,'matched':sum(cnt),'words':sum(tot)}
    json.dump(m,open(mp,'w',encoding='utf-8'),indent=1);print('matched %d/%d lyric words; lastLyricEnd %.2f -> %s'%(sum(cnt),sum(tot),m['lastLyricEnd'],mp))
main()
