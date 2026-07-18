/* =====================================================================
   XENOSCOPE · sfx.js
   Tiny self-contained sound engine (Web Audio, no files). Synth blips
   for inspecting, classifying, applying reagents, winning, etc.
===================================================================== */
(function(XS){
"use strict";
let ctx=null, master=null, enabled=true, vol=0.7, ambOn=false, ambNodes=null;
try{ enabled = localStorage.getItem('xenoscope.mute')!=='1'; }catch(e){}
try{ const v=parseFloat(localStorage.getItem('xenoscope.vol')); if(!isNaN(v)) vol=v; }catch(e){}
try{ ambOn = localStorage.getItem('xenoscope.amb')==='1'; }catch(e){}

function ensure(){ if(ctx) return;
  try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain();
    master.gain.value=0.22*vol; master.connect(ctx.destination); }catch(e){ ctx=null; } }
function setMaster(){ if(master) master.gain.value=0.22*vol; }
function tone(f,dur,type,g,f2){ if(!ctx)return; const t=ctx.currentTime;
  const o=ctx.createOscillator(), gn=ctx.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  gn.gain.setValueAtTime(0.0001,t); gn.gain.exponentialRampToValueAtTime(g||0.3,t+0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(gn); gn.connect(master); o.start(t); o.stop(t+dur+0.03); }
function seq(list){ list.forEach(([f,d,ty,g,f2],i)=>setTimeout(()=>tone(f,d,ty,g,f2), i*(90))); }

const SND={
  click:()=>tone(300,0.07,'triangle',0.22,380),
  hover:()=>tone(520,0.04,'sine',0.10),
  blip:()=>tone(680,0.09,'sine',0.28,900),          // inspect a structure
  scan:()=>tone(420,0.16,'sine',0.18,760),          // scan sweep
  drop:()=>{ tone(240,0.10,'sine',0.28,150); tone(120,0.14,'sine',0.18); }, // reagent
  ok:()=>seq([[523,0.10,'triangle',0.3],[784,0.14,'triangle',0.3]]),
  err:()=>tone(190,0.20,'sawtooth',0.22,140),
  win:()=>seq([[523,0.15,'triangle',0.3],[659,0.15,'triangle',0.3],[784,0.15,'triangle',0.3],[1047,0.24,'triangle',0.32]]),
  lose:()=>seq([[400,0.2,'sawtooth',0.24],[300,0.2,'sawtooth',0.24],[210,0.28,'sawtooth',0.24]]),
  rank:()=>seq([[659,0.16,'sine',0.3],[880,0.16,'sine',0.3],[1175,0.26,'sine',0.34]]),
};

function ambientStart(){ if(!ctx||ambNodes) return; const t=ctx.currentTime;
  const g=ctx.createGain(); g.gain.value=0.0; g.connect(master); g.gain.linearRampToValueAtTime(0.05, t+1.5);
  const o1=ctx.createOscillator(); o1.type='sine'; o1.frequency.value=55;
  const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=82.4;
  const lfo=ctx.createOscillator(); lfo.frequency.value=0.07; const lg=ctx.createGain(); lg.gain.value=0.02;
  lfo.connect(lg); lg.connect(g.gain); o1.connect(g); o2.connect(g);
  o1.start(); o2.start(); lfo.start(); ambNodes={g,o1,o2,lfo}; }
function ambientStop(){ if(!ambNodes) return; const {g,o1,o2,lfo}=ambNodes; const t=ctx.currentTime;
  g.gain.linearRampToValueAtTime(0.0001,t+0.5); [o1,o2,lfo].forEach(o=>{try{o.stop(t+0.6);}catch(e){}}); ambNodes=null; }

XS.sfx={
  play(n){ if(!enabled)return; ensure(); if(ctx&&ctx.state==='suspended')ctx.resume(); (SND[n]||SND.click)(); },
  unlock(){ ensure(); if(ctx&&ctx.state==='suspended')ctx.resume(); if(ambOn&&enabled) ambientStart(); },
  toggle(){ enabled=!enabled; try{ localStorage.setItem('xenoscope.mute', enabled?'0':'1'); }catch(e){}
    if(enabled){ ensure(); if(ctx&&ctx.state==='suspended')ctx.resume(); SND.blip(); if(ambOn)ambientStart(); }
    else ambientStop(); return enabled; },
  setVolume(v){ vol=Math.max(0,Math.min(1,v)); try{ localStorage.setItem('xenoscope.vol', String(vol)); }catch(e){} ensure(); setMaster(); },
  get volume(){ return vol; },
  toggleAmbient(){ ambOn=!ambOn; try{ localStorage.setItem('xenoscope.amb', ambOn?'1':'0'); }catch(e){}
    ensure(); if(ctx&&ctx.state==='suspended')ctx.resume(); if(ambOn&&enabled)ambientStart(); else ambientStop(); return ambOn; },
  get ambient(){ return ambOn; },
  get enabled(){ return enabled; }
};
window.addEventListener('pointerdown',()=>XS.sfx.unlock(),{once:true});
})(window.XS);
