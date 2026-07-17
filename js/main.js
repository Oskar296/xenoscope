/* =====================================================================
   XENOSCOPE · main.js — bootstrap + game loop
===================================================================== */
(function(XS){
"use strict";
let last=0, acc=0; const TICK=1/30;
function loop(ts){
  const app=XS.app; app.time=ts;
  if(!last)last=ts; let dt=Math.min(.05,(ts-last)/1000); last=ts;
  if(app.phase==='assignment' && app.S && !app.result){
    acc+=dt;
    while(acc>=TICK){ acc-=TICK;
      const r=XS.simStep(app.spec,app.S,TICK,app.tier);
      if(r&&r.done){ XS.finishRun(r.win); XS.ui.showResult(); break; }
    }
  }
  XS.render(app);
  XS.ui.tick(dt);
  requestAnimationFrame(loop);
}
function boot(){
  XS.loadProgress();
  XS.initCanvas(document.getElementById('c'));
  XS.ui.init();
  requestAnimationFrame(loop);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})(window.XS);
