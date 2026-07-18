/* =====================================================================
   XENOSCOPE · game.js
   State machine + career progression (XP / ranks / unlocks) + Codex,
   persisted in localStorage. Pure logic; ui.js renders it.
   Phases: menu → investigate → classify → briefing → assignment → result
===================================================================== */
(function(XS){
"use strict";
const KEY='xenoscope.save.v1';

XS.app={ phase:'menu', tier:'field', spec:null, S:null, time:0, daily:false, toasts:[],
  hoverPart:null, scan:null, result:null, tests:{}, classifyTries:0, lastXP:[], rankUp:null };

function fresh(){ return { xp:0, organelles:[], organisms:[], subs:[], species:[], badges:[],
  runs:0, wins:0, streak:0, bestStreak:0, dirWins:0, virusKills:0 }; }
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
XS.startRun=function(tier, forcePool){
  XS.app.tier=tier||XS.app.tier;
  XS.app.daily=false;
  const T=XS.TIERS[XS.app.tier];
  const unlocked=Array.from(XS.unlockedKingdoms());
  const pool=forcePool||(unlocked.length?unlocked:['Animalia','Plantae','Monera']);
  // ~40% of runs present a real Earth reference specimen (great for study)
  const earthPool=(XS.EARTH||[]).filter(e=>pool.includes(e.kind));
  let spec;
  if(earthPool.length && Math.random()<0.4) spec=XS.genFromEarth(XS.pick(earthPool), XS.app.tier);
  else spec=XS.genSpecimen(XS.pick(pool), XS.app.tier);
  spec.task=XS.pickTask(spec);
  spec.inspected=new Set();
  // tier pre-scan: reveal a couple structures for beginners
  if(T.prescan>0){ const shuffled=spec.organelleIds.slice().sort(()=>Math.random()-0.5);
    shuffled.slice(0,T.prescan).forEach(id=>spec.inspected.add(id)); }
  XS.app.spec=spec; XS.app.S=null; XS.app.phase='investigate';
  XS.app.tests={}; XS.app.classifyTries=0; XS.app.result=null; XS.app.rankUp=null;
  XS.app.decoys = buildDecoys(spec, T.decoys);
  // record discoveries
  if(!XS.progress.organisms.includes(spec.kingdomKey)){ XS.progress.organisms.push(spec.kingdomKey); XS.award(15,'New organism type: '+spec.K.label); }
  if(spec.earth && !XS.progress.species.includes(spec.species)){ XS.progress.species.push(spec.species); XS.award(10,'Earth reference: '+spec.species); }
  XS.checkAchievements();
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
  if(isNew && !XS.progress.organelles.includes(id)){ XS.progress.organelles.push(id); XS.award(5,'Learned: '+org.name); XS.checkAchievements(); }
  return {id, name:org.name, fn:org.fn, fact:org.fact, more:(XS.MORE||{})[id], wiki:(XS.WIKI||{})[id]};
};

XS.runTest=function(id){
  const spec=XS.app.spec, sub=XS.SUBS[id]; if(!spec||!sub) return null;
  let result;
  const has=id2=>spec.organelleIds.includes(id2);
  if(id==='iodine') result = spec.hasStarch ? 'POSITIVE — blue-black. Starch present → a photosynthetic autotroph.' : 'Negative — no starch. Likely a heterotroph.';
  else if(id==='gram') result = spec.gram==null ? (spec.kingdomKey==='Archaea'?'Atypical/variable staining — no peptidoglycan. A hint it may be an archaeon.':'No result — Gram staining only classifies bacteria.') : (spec.gram==='+'?'Gram-POSITIVE — purple. Thick peptidoglycan wall.':'Gram-NEGATIVE — pink. Thin wall, outer membrane.');
  else if(id==='methylene') result = 'Nucleic acid stained. '+(spec.isVirus?'Genome visible; no cell machinery — consistent with a virus.':(spec.K.nucleus?'A defined nucleus is visible (eukaryote).':'DNA is spread through the cell — no nucleus (prokaryote).'));
  else if(id==='dna_rna') result = spec.isVirus ? ('Genome is '+(has('genome_dna')?'DNA':'RNA')+' — confirms a virus, and narrows down which one.') : 'Double-stranded DNA held in the cell — normal for a living cell.';
  else if(id==='motility'){ const m=[]; if(has('flagellum'))m.push('flagella'); if(has('cilia'))m.push('cilia'); if(has('pseudopod'))m.push('pseudopodia');
    result = spec.isVirus?'No result — viruses cannot move on their own.':(m.length?('Motile — moves using '+m.join(' & ')+'.'):'Non-motile — no locomotion structures seen.'); }
  else if(id==='pigment') result = spec.isVirus?'No result — no pigments in a virus.':((spec.autotroph&&!spec.chemo)?'Chlorophyll detected — a photosynthetic autotroph.':(spec.chemo?'No chlorophyll — yet it is autotrophic: a chemoautotroph.':'No photosynthetic pigments — a heterotroph.'));
  else if(id==='catalase'){ if(spec.isVirus) result='No result — a virus has no metabolism.';
    else if(has('mitochondrion')) result='Strong bubbling — aerobic respiration via mitochondria (catalase-positive).';
    else if(spec.kingdomKey==='Archaea') result='Little reaction — many archaea live without oxygen.';
    else result='Some bubbling — an aerobic prokaryote.'; }
  else if(id==='endospore') result = has('spore') ? 'Endospores present — it can go dormant to survive heat, drought or radiation.' : 'No endospores detected.';
  else if(id==='lipid') result = spec.kingdomKey==='Archaea' ? 'ETHER-linked membrane lipids — the definitive sign of an ARCHAEON, not a bacterium.' : (spec.isVirus?'No cell-membrane lipids of its own (any coat is a stolen host envelope).':'Ester-linked lipids — a bacterium or eukaryote, not an archaeon.');
  XS.app.tests[id]=result;
  if(!XS.progress.subs.includes(id)){ XS.progress.subs.push(id); XS.award(4,'Reagent used: '+sub.name); }
  return result;
};

XS.classify=function(answer){
  const spec=XS.app.spec; const correct=XS.KINGDOM_ANSWER[spec.kingdomKey];
  if(answer===correct){
    const firstTry = XS.app.classifyTries===0;
    XS.award(Math.max(4, 24 - XS.app.classifyTries*8),'Correct classification: '+correct);
    if(firstTry){
      XS.progress.streak=(XS.progress.streak||0)+1;
      if(XS.progress.streak>XS.progress.bestStreak) XS.progress.bestStreak=XS.progress.streak;
      if(XS.progress.streak>=2) XS.award(Math.min(XS.progress.streak*2,20),'Streak ×'+XS.progress.streak);
    } else XS.progress.streak=0;
    XS.saveProgress(); XS.checkAchievements();
    XS.app.phase='briefing';
    return {ok:true, correct, streak:XS.progress.streak, firstTry};
  }
  XS.app.classifyTries++; XS.progress.streak=0; XS.saveProgress();
  return {ok:false, correct, tries:XS.app.classifyTries};
};

XS.beginAssignment=function(){
  const spec=XS.app.spec;
  XS.app.S=XS.freshState(spec, spec.task);
  XS.app.phase='assignment';
};

const TREAT_KEYS=['glucose','light','minerals','host','antibiotic','antifungal','antiviral','lysozyme','hypotonic','hypertonic','toxin','detergent'];
XS.treat=function(id){
  const S=XS.app.S; if(!S) return;
  if(TREAT_KEYS.includes(id)) S[id]=XS.cl(S[id]+34,0,100);
  if(!XS.progress.subs.includes(id)){ XS.progress.subs.push(id); XS.award(3,'Reagent used: '+(XS.SUBS[id]?XS.SUBS[id].name:id)); XS.saveProgress(); }
};
XS.setEnv=function(ph,temp){ const S=XS.app.S; if(!S)return; if(ph!=null)S.ph=ph; if(temp!=null)S.temp=temp; };

XS.finishRun=function(win){
  if(XS.app.result) return;
  const spec=XS.app.spec;
  XS.progress.runs++;
  if(win){ XS.progress.wins++;
    if(XS.app.tier==='director') XS.progress.dirWins=(XS.progress.dirWins||0)+1;
    if(spec.isVirus && spec.task==='neutralize') XS.progress.virusKills=(XS.progress.virusKills||0)+1;
    XS.award(30,'Assignment complete');
  }
  XS.app.result={win}; XS.app.phase='result'; XS.saveProgress(); XS.checkAchievements();
};

/* ---------------- achievements ---------------- */
XS.ACHIEVEMENTS=[
  {id:'first',      icon:'🔬', name:'First Contact',   desc:'Complete your first assignment', check:p=>p.wins>=1},
  {id:'sharp',      icon:'🎯', name:'Sharp Eye',       desc:'Classify 5 specimens correctly in a row', check:p=>p.bestStreak>=5},
  {id:'bookworm',   icon:'📖', name:'Bookworm',        desc:'Learn 10 different organelles', check:p=>p.organelles.length>=10},
  {id:'taxonomist', icon:'🧬', name:'Taxonomist',      desc:'Encounter every organism type', check:p=>p.organisms.length>=Object.keys(XS.KINGDOMS).length},
  {id:'naturalist', icon:'🌍', name:'Field Naturalist',desc:'Meet 5 real Earth organisms', check:p=>p.species.length>=5},
  {id:'virologist', icon:'🦠', name:'Virologist',      desc:'Neutralise a virus', check:p=>p.virusKills>=1},
  {id:'seasoned',   icon:'🏅', name:'Seasoned',        desc:'Complete 10 assignments', check:p=>p.wins>=10},
  {id:'director',   icon:'⚡', name:'Top Brass',       desc:'Win a Director-difficulty run', check:p=>p.dirWins>=1},
  {id:'earthbound', icon:'🪐', name:'Earthbound',      desc:'Meet every Earth organism', check:p=>p.species.length>=(XS.EARTH||[]).length},
  {id:'scholar',    icon:'🎓', name:'Xeno-Scholar',    desc:'Learn every organelle', check:p=>p.organelles.length>=Object.keys(XS.ORG).length},
];
XS.checkAchievements=function(){
  const newly=[];
  for(const a of XS.ACHIEVEMENTS){ if(!XS.progress.badges.includes(a.id) && a.check(XS.progress)){ XS.progress.badges.push(a.id); newly.push(a); } }
  if(newly.length){ XS.saveProgress(); XS.app.toasts=(XS.app.toasts||[]).concat(newly.map(a=>({icon:a.icon,title:a.name,desc:a.desc}))); }
  return newly;
};

/* ---------------- daily specimen (seeded, same for everyone) ---------------- */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
XS.dailyKey=function(){ const d=new Date();
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'); };
XS.startDaily=function(){
  const k=XS.dailyKey(); const seed=k.split('-').reduce((s,n)=>s*100+ (+n),0);
  const orig=Math.random; Math.random=mulberry32(seed);
  try{ XS.startRun('field', XS.KLIST); }finally{ Math.random=orig; }
  XS.app.daily=true;
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
