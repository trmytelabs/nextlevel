"""Measure a song for the game: duration, tempo and the first beat, written into public/songs/<id>/map.json.

  python tools/song/analyze.py next-level            # reads public/songs/next-level/song.mp3

Needs ffmpeg (winget install Gyan.FFmpeg.Essentials, or FFMPEG=path). Pure Python otherwise: the audio is decoded to 8 kHz
mono, onset strength is the rise in 10 ms frame loudness, tempo is the autocorrelation peak between 90 and 180 BPM (scored at
1, 2 and 4 beats so it locks onto the bar), and the first beat is the grid phase with the most onset energy on it.

The lyric line times are not guessed here. Keep the ones already in map.json, or make them in the game: load the song,
press T at the start of each lyric line (and once more when the last line ends), then Y to save map.json.
"""
import os,sys,glob,json,struct,math,subprocess,tempfile
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
def ffmpeg():
    if os.environ.get('FFMPEG'):return os.environ['FFMPEG']
    for p in glob.glob(os.path.join(os.environ.get('LOCALAPPDATA',''),'Microsoft','WinGet','Packages','Gyan.FFmpeg*','*','bin','ffmpeg.exe')):return p
    return 'ffmpeg'
def analyze(path):
    with tempfile.TemporaryDirectory() as d:
        raw=os.path.join(d,'a.raw');subprocess.check_call([ffmpeg(),'-v','error','-y','-i',path,'-ac','1','-ar','8000','-f','s16le',raw])
        b=open(raw,'rb').read()
    n=len(b)//2;x=struct.unpack('<%dh'%n,b);SR=8000;H=80
    E=[math.log1p(sum(v*v for v in x[i:i+H])/H) for i in range(0,n-H,H)]
    on=[0]+[max(0,E[i]-E[i-1]) for i in range(1,len(E))];m=sum(on)/len(on);on=[v-m for v in on]
    def score(bpm):
        lag=6000/bpm;sc=0
        for k in (1,2,4):
            L=lag*k;Li=int(L);f=L-Li;s=0
            for i in range(0,len(on)-Li-1,2):s+=on[i]*((1-f)*on[i+Li]+f*on[i+Li+1])
            sc+=s/k
        return sc
    bpm=max((b/10 for b in range(900,1801)),key=score)
    lag=6000/bpm;ph=max(range(int(lag)),key=lambda p:sum(on[int(p+j*lag)] for j in range(int((len(on)-p)/lag))))
    return {'duration':round(n/SR,3),'bpm':bpm,'beat0':round(ph/100,3)}
if __name__=='__main__':
    sid=sys.argv[1] if len(sys.argv)>1 else 'next-level';d=os.path.join(ROOT,'public','songs',sid);mp=os.path.join(d,'map.json')
    m=json.load(open(mp,encoding='utf-8')) if os.path.exists(mp) else {'title':sid,'audio':'song.mp3','lines':None,'lastLyricEnd':None}
    r=analyze(os.path.join(d,m.get('audio','song.mp3')));m.update(r);json.dump(m,open(mp,'w',encoding='utf-8'),indent=1)
    print(json.dumps(r),'->',mp)
