/* =====================================================================
   XENOSCOPE · game.js
   State machine + career progression (XP / ranks / unlocks) + Codex,
   persisted in localStorage. Pure logic; ui.js renders it.
   Phases: menu → investigate → classify → briefing → assignment → result
===================================================================== */
(function(XS){
"use strict";
const KEY='xenoscope.save.v1';

XS.app={ phase:'menu', tier:'field', spec:null, S:null, time:0,
  hoverPart:null, scan:null, result:null, tests:{}, classifyTries:0, lastXP:[], rankUp:null };

XS.progress=null;
XS.loadProgress=function(){
  try{ XS.progress=JSON.parse(localStorage.getItem(KEY)); }catch(e){ XS.progress=null; }
  if(!XS.progress) XS.progress={ xp:0, organelles:[], organisms:[], subs:[], runs:0, wins:0 };
  ['organelles','organisms','subs'].forEach(k=>{ if(!Array.isArray(XS.progress[k])) XS.progress[k]=[]; });
};
XS.saveProgress=function(){ try{ localStorage.setItem(KEY,JSON.stringify(XS.progress)); }catch(e){} };
XS.resetProgress=function(){ XS.progress={ xp:0, organelles:[], organisms:[], subs:[], runs:0, wins:0 }; XS.saveProgress(); };

XS.rankFor=function(xp){ let r=XS.RANKS[0]; for(const R of XS.RANKS) if(xp>=R.xp) r=R; return r; };
XS.nextRank=function(xp){ for(const R of XS.RANKS) if(xp<R.xp) return R; return null; };
XS.unlockedKingdoms=function(){
  const xp=XS.progress.xp, set=new Set();
  for(const R of XS.RANKS){ if(xp>=R.xp) R.unlock.forEach(k=>set.add(k)); }
  return set;
};
XS.award=function(n,reason){
  const before=XS.rankFor(XS.progress.xp);
  XS.progress.xp+=n;
  XS.app.lastXP.unshift({n,reason}); XS.app.lastXP=XS.app.lastXP.slice(0,6);
  const after=XS.rankFor(XS.progress.xp);
  if(after!==before){ XS.app.rankUp=after; }
  XS.saveProgress();
};

/* ---------------- run lifecycle ---------------- */
XS.startRun=function(tier){
  XS.app.tier=tier||XS.app.tier;
  const T=XS.TIERS[XS.app.tier];
  const unlocked=Array.from(XS.unlockedKingdoms());
  const pool=unlocked.length?unlocked:['Animalia','Plantae','Monera'];
  const kingdomKey=XS.pick(pool);
  const spec=XS.genSpecimen(kingdomKey, XS.app.tier);
  spec.task=XS.pickTask(spec);
  spec.inspected=new Set();
  // tier pre-scan: reveal a couple structures for beginners
  if(T.prescan>0){ const shuffled=spec.organelleIds.slice().sort(()=>Math.random()-0.5);
    shuffled.slice(0,T.prescan).forEach(id=>spec.inspected.add(id)); }
  XS.app.spec=spec; XS.app.S=null; XS.app.phase='investigate';
  XS.app.tests={}; XS.app.classifyTries=0; XS.app.result=null; XS.app.rankUp=null;
  XS.app.decoys = buildDecoys(spec, T.decoys);
  // record organism discovery
  if(!XS.progress.organisms.includes(kingdomKey)){ XS.progress.organisms.push(kingdomKey); XS.award(15,'New organism: '+spec.K.label); }
};
function buildDecoys(spec, n){
  if(!n) return [];
  const useless=['glucose','light','minerals','host','antibiotic','antifungal','antiviral','lysozyme','hypotonic','hypertonic']
    .filter(id=>id!==spec.food && !spec.kill.includes(id));
  return useless.sort(()=>Math.random()-0.5).slice(0,n);
}

XS.inspect=function(part){
  const spec=XS.app.spec; if(!spec) return null;
  const id=part.id, org=XS.ORG[id]; if(!org) return null;
  const isNew=!spec.inspected.has(id);
  spec.inspected.add(id);
  if(isNew && !XS.progress.organelles.includes(id)){ XS.progress.organelles.push(id); XS.award(5,'Learned: '+org.name); }
  return {id, name:org.name, fn:org.fn, fact:org.fact};
};

XS.runTest=function(id){
  const spec=XS.app.spec, sub=XS.SUBS[id]; if(!spec||!sub) return null;
  let result;
  if(id==='iodine') result = spec.hasStarch ? 'POSITIVE — blue-black. Starch present → a photosynthetic autotroph.' : 'Negative — no starch. Likely a heterotroph.';
  else if(id==='gram') result = spec.gram==null ? 'No result — Gram staining only classifies bacteria.' : (spec.gram==='+'?'Gram-POSITIVE — purple. Thick peptidoglycan wall.':'Gram-NEGATIVE — pink. Thin wall, outer membrane.');
  else if(id==='methylene') result = 'Nucleic acid stained. '+(spec.isVirus?'Genome visible; no cell machinery — consistent with a virus.':(spec.K.nucleus?'A defined nucleus is visible (eukaryote).':'DNA is spread through the cell — no nucleus (prokaryote).'));
  XS.app.tests[id]=result;
  if(!XS.progress.subs.includes(id)){ XS.progress.subs.push(id); XS.award(4,'Reagent used: '+sub.name); }
  return result;
};

XS.classify=function(answer){
  const spec=XS.app.spec; const correct=XS.KINGDOM_ANSWER[spec.kingdomKey];
  if(answer===correct){
    const bonus=Math.max(4, 24 - XS.app.classifyTries*8);
    XS.award(bonus,'Correct classification: '+correct);
    XS.app.phase='briefing';
    return {ok:true, correct};
  }
  XS.app.classifyTries++;
  return {ok:false, correct, tries:XS.app.classifyTries};
};

XS.beginAssignment=function(){
  const spec=XS.app.spec;
  XS.app.S=XS.freshState(spec, spec.task);
  XS.app.phase='assignment';
};

const TREAT_KEYS=['glucose','light','minerals','host','antibiotic','antifungal','antiviral','lysozyme','hypotonic','hypertonic','toxin'];
XS.treat=function(id){
  const S=XS.app.S; if(!S) return;
  if(TREAT_KEYS.includes(id)) S[id]=XS.cl(S[id]+34,0,100);
  if(!XS.progress.subs.includes(id)){ XS.progress.subs.push(id); XS.award(3,'Reagent used: '+(XS.SUBS[id]?XS.SUBS[id].name:id)); XS.saveProgress(); }
};
XS.setEnv=function(ph,temp){ const S=XS.app.S; if(!S)return; if(ph!=null)S.ph=ph; if(temp!=null)S.temp=temp; };

XS.finishRun=function(win){
  if(XS.app.result) return;
  XS.progress.runs++; if(win)XS.progress.wins++;
  if(win) XS.award(30,'Assignment complete');
  XS.app.result={win}; XS.app.phase='result'; XS.saveProgress();
};

/* codex helpers for UI */
XS.codex=function(){
  return {
    organelles: XS.progress.organelles.map(id=>({id, ...XS.ORG[id]})).filter(o=>o.name),
    organisms: XS.progress.organisms.map(k=>({k, ...XS.KINGDOMS[k]})),
    subs: XS.progress.subs.map(id=>({id, ...XS.SUBS[id]})).filter(s=>s.name),
    totalOrganelles: Object.keys(XS.ORG).length,
    totalOrganisms: Object.keys(XS.KINGDOMS).length,
    totalSubs: Object.keys(XS.SUBS).length,
  };
};

})(window.XS);
