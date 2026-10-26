// ---------- boot: load the song map first, then the game ----------
// The stages compute their timings when their modules load, so the song's map (public/songs/<id>/map.json) has to be applied
// to core before main.ts and the stages are imported. ?song=<id> picks a song; ?song=none runs the canonical 128 BPM layout
// with the generated score. The default song is used unless the page is driven by automation (the test harness), which
// keeps the canonical layout its cases are written against unless it asks for a song.
import {applySongMap} from './core';
// English, and not for translation: Chrome otherwise guesses a language from the pixel-font words and offers to translate
// (the artifact build strips the <html lang> tag, so set it here too)
document.documentElement.lang='en';document.documentElement.setAttribute('translate','no');document.documentElement.classList.add('notranslate');
export const DEFAULT_SONG='press-start';
const q=new URLSearchParams(location.search);
const id=q.get('song')??((navigator as any).webdriver?'none':DEFAULT_SONG);
(async()=>{
 if(id&&id!=='none'){try{const r=await fetch(import.meta.env.BASE_URL+'songs/'+encodeURIComponent(id)+'/map.json',{cache:'no-cache'});
  if(r.ok){const m=await r.json();m.id=id;
   // a map without line times only loads when asked for by name (?song=<id>), to tap them in; otherwise the lyrics would not line up
   if(Array.isArray(m.lines)||q.has('song'))applySongMap(m);else console.info('song "'+id+'" has no line times yet: open ?song='+id+' to tap them in')}else console.info('no song map for "'+id+'": canonical layout, generated score')}
  catch(e){console.warn('song map "'+id+'" not applied:',e)}}
 await import('./main')})();
