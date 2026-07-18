/* =====================================================================
   XENOSCOPE · main.js — bootstrap + game loop
===================================================================== */
(function(XS){
"use strict";
let last=0;
function loop(ts){
  const app=XS.app; app.time=ts;
  if(!last)last=ts; let dt=Math.min(.05,(ts-last)/1000); last=ts;
  if(app.sc && !app.sc.done && (app.phase==='survey'||app.phase==='zoom')){
    const r=XS.worldTick(app.sc,dt);
    if(r){ XS.finishMission(r); XS.ui.showResult(); }
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
