"""Prepare dist/ for publishing as a claude.ai artifact.
1) run `npx vite build --base ./` first (or pass --build to run it here)
2) strips the html skeleton from dist/index.html -> dist/artifact.html (the artifact host wraps the page itself)
3) base64-encodes dist/models/*.glb -> dist/models/*.glb.txt (artifacts cannot serve .glb) and prints the files map
Usage: python tools/artifact_prep.py [--build]
"""
import os,re,sys,base64,json,subprocess
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));DIST=os.path.join(ROOT,'dist')
if '--build' in sys.argv:
    subprocess.check_call('npx vite build --base ./',shell=True,cwd=ROOT)
html=open(os.path.join(DIST,'index.html'),encoding='utf-8').read()
body=re.sub(r'(?is)<!doctype[^>]*>|</?html[^>]*>|</?head[^>]*>|</?body[^>]*>|<meta[^>]*>','',html)
body=body.replace(':root{',':root{color-scheme:dark;',1)
open(os.path.join(DIST,'artifact.html'),'w',encoding='utf-8').write(body.strip()+'\n')
files={}
assets=os.path.join(DIST,'assets')
for f in sorted(os.listdir(assets)):files['assets/'+f]='assets/'+f
for sub in ['models','models/finale','models/racer']:
    mdir=os.path.join(DIST,sub)
    if not os.path.isdir(mdir):continue
    for f in sorted(os.listdir(mdir)):
        if f.endswith('.glb'):
            b=open(os.path.join(mdir,f),'rb').read();open(os.path.join(mdir,f+'.txt'),'w').write(base64.b64encode(b).decode())
            files[sub+'/'+f+'.txt']={'from':sub+'/'+f+'.txt','contentType':'text/plain'}
# era3gl.ts loads textures/*.jpg via BASE_URL; without them the racer silently falls back to procedural textures
tdir=os.path.join(DIST,'textures')
if os.path.isdir(tdir):
    for f in sorted(os.listdir(tdir)):
        if f.lower().endswith(('.jpg','.jpeg','.png','.webp')):files['textures/'+f]='textures/'+f
# songs: each public/songs/<id>/ holds map.json and the audio file
sdir=os.path.join(DIST,'songs')
if os.path.isdir(sdir):
    for sid in sorted(os.listdir(sdir)):
        for f in sorted(os.listdir(os.path.join(sdir,sid))):
            if f.lower().endswith(('.json','.mp3','.m4a','.ogg')):files['songs/'+sid+'/'+f]='songs/'+sid+'/'+f
for f in ['manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','og.png','favicon-32.png']:
    if os.path.exists(os.path.join(DIST,f)):files[f]=f
print('artifact.html written;',len(files),'files. Publish with root=dist, file_path=dist/artifact.html and files=')
print(json.dumps(files,indent=0))
