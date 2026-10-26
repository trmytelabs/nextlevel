// ---------- SECRETS: one easter egg per stage, found by the player (never by the autopilot) ----------
// 0 ARCADE: shoot the golden word "coin" away completely     1 32-BIT: press down on the flashing pipe (underground room)
// 2 3D: drive over the rainbow pad                            3 MOBILE: fly through the gold star
// 4 VR: cut the golden block
// Found flags last for one play-through: they reset when the song restarts from the top. Finding all five changes the end card.
import {blip,tone} from './core';
export const EGG={found:[false,false,false,false,false],last:-1,lastT:-1e9};
export const EGG_NAMES=['THE GOLDEN COIN','THE SECRET PIPE','THE RAINBOW PAD','THE GOLD STAR','THE GOLDEN BLOCK'];
export const eggCount=()=>EGG.found.filter(Boolean).length;
export function eggReset(){EGG.found.fill(false);EGG.last=-1;EGG.lastT=-1e9}
// returns true the first time a secret is found by a player; the autopilot never counts
export function eggFind(i:number,auto:boolean){if(auto||EGG.found[i])return false;EGG.found[i]=true;EGG.last=i;EGG.lastT=performance.now();
 const n=[523,659,784,1047,1319];n.forEach((f,k)=>setTimeout(()=>blip(f,0.09,0.1),k*70));if(eggCount()===5)setTimeout(()=>tone(1568,0.5,'square',0.12),420);return true}
export function eggToast(){const n=eggCount();return n===5?'ALL 5 SECRETS FOUND!':`SECRET FOUND · ${EGG_NAMES[EGG.last]} · ${n} / 5`}
export function eggEndLine(){const n=eggCount();return n===5?'ALL 5 SECRETS FOUND!  ·  CURIOSITY IS THE REAL CHEAT CODE':n>0?`SECRETS FOUND: ${n} / 5`:'THERE ARE 5 SECRETS HIDDEN IN THIS VIDEO'}
