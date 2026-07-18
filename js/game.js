/* =====================================================================
   XENOSCOPE · game.js
   State machine for the macro→micro flow + progression + Codex.
   Phases: menu → survey (whole organism) → zoom (a tissue's cells) → result
   Two objectives only: PRESERVE or NEUTRALIZE.
===================================================================== */
(function(XS){
"use strict";
const KEY='xenoscope.save.v2';

XS.app={ phase:'menu', tier:'field', time:0, daily:false, toasts:[],
  sc:null, spec:null, zoomRegion:null, zoomAt:0, zoomPathogen:null,
  hoverRegion:null, hoverPart:null, scan:null, result:null,
  lastXP:[], rankUp:null, missionWrong:0, demo:null };

function fresh(){ return { xp:0, organelles:[], organisms:[], subs:[], badges:[], archetypes:[],
  runs:0, wins:0, saves:0, kills:0, flawless:0, scans:0, dirWins:0 }; }
XS.progress=null;
XS.loadProgress=function(){
  try{ XS.progress=JSON.parse(localStorage.getItem(KEY)); }catch(e){ XS.progress=null; }
  if(!XS.progress) XS.progress=fresh();
  const d=fresh();
  for(const k in d){ if(Array.isArray(d[k])){ if(!Array.isArray(XS.progress[k])) XS.progress[k]=[]; }
    else if(typeof XS.progress[k]!=='number') XS.progress[k]=d[k]; }
};
XS.saveProgress=function(){ try{ localStorage.setItem(KEY,JSON.stringify(XS.progress)); }catch(e){} };
XS.resetProgress=function(){ XS.progress=fresh(); XS.saveProgress(); };

XS.rankFor=function(xp){ let r=XS.RANKS[0]; for(const R of XS.RANKS) if(xp>=R.xp) r=R; return r; };
XS.nextRank=function(xp){ for(const R of XS.RANKS) if(xp<R.xp) return R; return null; };
XS.award=function(n,reason){
  const before=XS.rankFor(XS.progress.xp);
  XS.progress.xp+=n; XS.app.lastXP.unshift({n,reason}); XS.app.lastXP=XS.app.lastXP.slice(0,6);
  const after=XS.rankFor(XS.progress.xp); if(after!==before) XS.app.rankUp=after;
  XS.saveProgress();
};

/* ---------------- mission lifecycle ---------------- */
XS.startMission=function(objective, tier){
  XS.app.tier=tier||XS.app.tier; XS.app.daily=false;
  const sc=XS.buildScenario(objective||(Math.random()<0.5?'preserve':'neutralize'), XS.app.tier);
  XS.app.sc=sc; XS.app.phase='survey'; XS.app.spec=null; XS.app.zoomRegion=null; XS.app.zoomPathogen=null;
  XS.app.hoverRegion=null; XS.app.hoverPart=null; XS.app.scan=null; XS.app.result=null; XS.app.rankUp=null; XS.app.missionWrong=0;
  if(!XS.progress.archetypes.includes(sc.archKey)){ XS.progress.archetypes.push(sc.archKey); XS.award(12,'New life-form: '+sc.A.label); }
  XS.checkAchievements();
};

XS.enterRegion=function(region){
  const sc=XS.app.sc; if(!sc) return;
  const isNew=!region.scanned; region.scanned=true;
  XS.app.zoomRegion=region;
  XS.app.zoomPathogen=(sc.objective==='preserve'&&region.id===sc.keyId)?sc.pathType:null;
  const spec=XS.regionCell(sc,region); if(!spec.inspected) spec.inspected=new Set();
  XS.app.spec=spec; XS.app.phase='zoom'; XS.app.zoomAt=XS.app.time; XS.app.scan=null; XS.app.hoverPart=null;
  const kk=region.cell;
  if(!XS.progress.organisms.includes(kk)){ XS.progress.organisms.push(kk); XS.award(8,'Cell type: '+(XS.KINGDOMS[kk]?XS.KINGDOMS[kk].label:kk)); }
  if(isNew){ XS.progress.scans=(XS.progress.scans||0)+1; XS.award(4,'Scanned '+region.name); XS.checkAchievements(); }
};
XS.exitRegion=function(){ XS.app.phase='survey'; XS.app.spec=null; XS.app.zoomRegion=null; XS.app.zoomPathogen=null; XS.app.scan=null; XS.app.hoverPart=null; };

/* diagnosis text for the current zoom region */
XS.diagnosis=function(){
  const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r) return null;
  if(r.id===sc.keyId){
    if(sc.objective==='preserve'){ const P=XS.PATHOGENS[sc.pathType];
      return {bad:true, title:'⚠ '+P.label.toUpperCase(), body:P.tell, why:P.why, agentLabel:agentName(sc.agent)}; }
    return {bad:true, title:'⚠ VULNERABLE TISSUE', body:'This is the organism’s weak point — its cells cannot withstand the right agent here.',
      why:XS.WEAKNESS_WHY[sc.agent], agentLabel:agentName(sc.agent)};
  }
  return {bad:false, title:'✓ TISSUE HEALTHY', body:'These cells look normal. The problem lies elsewhere — scan the other regions.'};
};
function agentName(id){ const t=XS.TREATMENTS.find(x=>x.id===id); return t?t.label:id; }
XS.agentName=agentName;

/* organelle inspection (reused, educational) */
XS.inspect=function(part){
  const spec=XS.app.spec; if(!spec) return null;
  const id=part.id, org=XS.ORG[id]; if(!org) return null;
  const isNew=!spec.inspected.has(id); spec.inspected.add(id);
  if(isNew && !XS.progress.organelles.includes(id)){ XS.progress.organelles.push(id); XS.award(5,'Learned: '+org.name); XS.checkAchievements(); }
  return {id, name:org.name, fn:org.fn, fact:org.fact, more:(XS.MORE||{})[id], wiki:(XS.WIKI||{})[id]};
};

/* apply a treatment to the current zoom region */
XS.treatRegion=function(agent){
  const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r||sc.done) return null;
  const res=XS.applyTreatment(sc, r.id, agent);
  if(res && !res.ok) XS.app.missionWrong++;
  if(!XS.progress.subs.includes(agent)){ XS.progress.subs.push(agent); XS.saveProgress(); }
  // neutralise resolves immediately when takedown completes
  if(sc.objective==='neutralize' && sc.P>=100){ sc.done=true; XS.finishMission({win:true}); }
  return res;
};

XS.finishMission=function(res){
  if(XS.app.result) return;
  const sc=XS.app.sc, win=res.win;
  XS.progress.runs++;
  if(win){ XS.progress.wins++;
    if(sc.objective==='preserve') XS.progress.saves++; else XS.progress.kills++;
    if(XS.app.missionWrong===0) XS.progress.flawless++;
    if(XS.app.tier==='director') XS.progress.dirWins++;
    XS.award(30, sc.objective==='preserve'?'Organism preserved':'Threat neutralised');
  }
  XS.app.result={win, why:res.why}; XS.app.phase='result'; XS.saveProgress(); XS.checkAchievements();
};

/* ---------------- achievements ---------------- */
XS.ACHIEVEMENTS=[
  {id:'first',      icon:'🔬', name:'First Contact',   desc:'Complete your first assignment', check:p=>p.wins>=1},
  {id:'healer',     icon:'💚', name:'Healer',          desc:'Preserve a sick organism', check:p=>p.saves>=1},
  {id:'exterminator',icon:'☠️',name:'Exterminator',    desc:'Neutralise a threat', check:p=>p.kills>=1},
  {id:'clean',      icon:'🎯', name:'Clean Diagnosis', desc:'Win with no wrong treatments', check:p=>p.flawless>=1},
  {id:'bookworm',   icon:'📖', name:'Bookworm',        desc:'Learn 10 organelles', check:p=>p.organelles.length>=10},
  {id:'explorer',   icon:'🧭', name:'Explorer',        desc:'Study all 3 organism forms', check:p=>p.archetypes.length>=3},
  {id:'surgeon',    icon:'🩺', name:'Field Surgeon',   desc:'Scan 15 tissues', check:p=>(p.scans||0)>=15},
  {id:'director',   icon:'⚡', name:'Top Brass',       desc:'Win a Director-difficulty run', check:p=>p.dirWins>=1},
  {id:'veteran',    icon:'🏅', name:'Veteran',         desc:'Complete 15 assignments', check:p=>p.wins>=15},
  {id:'scholar',    icon:'🎓', name:'Xeno-Scholar',    desc:'Learn every organelle', check:p=>p.organelles.length>=Object.keys(XS.ORG).length},
];
XS.checkAchievements=function(){
  const newly=[];
  for(const a of XS.ACHIEVEMENTS){ if(!XS.progress.badges.includes(a.id) && a.check(XS.progress)){ XS.progress.badges.push(a.id); newly.push(a); } }
  if(newly.length){ XS.saveProgress(); XS.app.toasts=(XS.app.toasts||[]).concat(newly.map(a=>({icon:a.icon,title:a.name,desc:a.desc}))); }
  return newly;
};

/* ---------------- daily (seeded) ---------------- */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
XS.dailyKey=function(){ const d=new Date();
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'); };
XS.startDaily=function(){
  const k=XS.dailyKey(); const seed=k.split('-').reduce((s,n)=>s*100+(+n),0);
  const orig=Math.random; Math.random=mulberry32(seed);
  try{ XS.startMission(null,'field'); }finally{ Math.random=orig; }
  XS.app.daily=true;
};

/* ---------------- codex ---------------- */
XS.codex=function(){
  return {
    organelles: XS.progress.organelles.map(id=>({id, ...XS.ORG[id]})).filter(o=>o.name),
    organisms: XS.progress.organisms.map(k=>({k, ...XS.KINGDOMS[k]})).filter(o=>o.label),
    totalOrganelles: Object.keys(XS.ORG).length,
    totalOrganisms: Object.keys(XS.KINGDOMS).length,
  };
};

})(window.XS);
