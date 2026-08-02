/* =====================================================================
   XENOSCOPE · game.js
   State machine for the macro→micro flow + progression + Codex.
   Phases: menu → survey (whole organism) → zoom (a tissue's cells) → result
   Two objectives only: PRESERVE or NEUTRALIZE.
===================================================================== */
(function(XS){
"use strict";
const KEY='xenoscope.save.v2';

XS.app={ phase:'menu', tier:'field', mode:'quick', time:0, daily:false, toasts:[],
  sc:null, spec:null, zoomRegion:null, zoomAt:0, zoomPathogen:null,
  hoverRegion:null, hoverPart:null, scan:null, result:null, craft:null, run:null,
  lastXP:[], rankUp:null, missionWrong:0, demo:null };

function fresh(){ return { xp:0, organelles:[], organisms:[], subs:[], badges:[], archetypes:[], species:[], custom:[],
  runs:0, wins:0, saves:0, kills:0, flawless:0, scans:0, dirWins:0, assays:0, sharpWins:0, hardWins:0, tutorialSeen:0 }; }
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
/* Choose PRESERVE vs NEUTRALIZE for a free-play mission. A flat coin makes
   neutralise streaks common; instead we make saving (rescue) the clear majority
   of the mix and, above all, break up runs of neutralise — so you always have
   more organisms to save. Settles at roughly two rescues per neutralise.
   (The seeded Daily passes an explicit objective and never calls this, so it
   stays deterministic.) */
XS.pickObjective=function(){
  let pPreserve=0.66;                          // rescues are the majority
  const last=XS.app&&XS.app.lastObjective;
  if(last==='neutralize') pPreserve+=0.14;      // just neutralised → almost always a rescue next
  else if(last==='preserve') pPreserve-=0.10;   // still let some neutralise through
  pPreserve=Math.max(0.45,Math.min(0.9,pPreserve));
  return Math.random()<pPreserve?'preserve':'neutralize';
};
XS.startMission=function(objective, tier){
  XS.app.tier=tier||XS.app.tier; XS.app.daily=false; XS.app.tutorial=null;
  const m=XS.app.mode;
  const obj=objective||(m==='contact'?'neutralize':(m==='ultra'||m==='alien')?'preserve':XS.pickObjective());
  XS.app.lastObjective=obj;
  const sc=XS.buildScenario(obj, XS.app.tier);
  XS.app.sc=sc; XS.app.phase='survey'; XS.app.spec=null; XS.app.zoomRegion=null; XS.app.zoomPathogen=null;
  XS.app.hoverRegion=null; XS.app.hoverPart=null; XS.app.scan=null; XS.app.result=null; XS.app.rankUp=null; XS.app.missionWrong=0;
  if(!XS.progress.archetypes.includes(sc.archKey)){ XS.progress.archetypes.push(sc.archKey); XS.award(12,'New kingdom: '+(XS.KINGDOMS[sc.archKey]?XS.KINGDOMS[sc.archKey].label:sc.archKey)); }
  if(!XS.progress.species.includes(sc.A.id)){ XS.progress.species.push(sc.A.id); XS.award(8,'Catalogued a new '+sc.A.kingdom); }
  XS.checkAchievements();
};

/* run a lab assay on the current region (records evidence, awards study XP) */
XS.doAssay=function(id){
  const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r) return null;
  const out=XS.runAssay(sc,r,id);
  if(out&&out.first){ XS.progress.assays=(XS.progress.assays||0)+1; XS.award(3,'Assay: '+out.label); XS.saveProgress(); XS.checkAchievements(); }
  return out;
};
/* commit a diagnosis for the current region */
XS.doDiagnose=function(choice){
  const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r) return null;
  const res=XS.submitDiagnosis(sc,r,choice);
  if(res){ if(res.ok){ if(r.dxWrong===0) sc.dxClean=(sc.dxClean!==false); XS.award(10,'Correct diagnosis'); }
    else { XS.app.missionWrong++; sc.dxClean=false; } }
  return res;
};

/* ---------------- guided tutorial: a full course over every type ----------------
   Neutralize lessons teach kingdom → weakness; Preserve lessons teach
   affliction → cure. Each lesson is a clean, complication-free case.
------------------------------------------------------------ */
XS.TUT_LESSONS=[
  {obj:'neutralize', cell:'Animalia', name:'Animal',    agent:'hypotonic',  assayHint:'Wall analysis + Nuclear stain show a wall-less cell with a nucleus.', why:'No cell wall — a hypotonic (low-salt) shock floods it until it bursts.'},
  {obj:'neutralize', cell:'Plantae',  name:'Plant',     agent:'hypertonic', assayHint:'Wall analysis + Pigment scan: a cellulose wall and chloroplasts.', why:'A rigid cellulose wall resists bursting — draw water OUT with a hypertonic shock (herbicide).'},
  {obj:'neutralize', cell:'Fungi',    name:'Fungus',    agent:'antifungal', assayHint:'Wall analysis shows the wall is chitin.', why:'An antifungal hits fungus-only targets the host lacks — the ergosterol membrane or the chitin wall.'},
  {obj:'neutralize', cell:'Monera',   name:'Bacterium', agent:'antibiotic', assayHint:'Gram stain + Nuclear stain: a prokaryote with a peptidoglycan wall.', why:'A peptidoglycan wall + 70S ribosomes are exactly what an antibiotic attacks.'},
  {obj:'neutralize', cell:'Archaea',  name:'Archaeon',  agent:'detergent',  assayHint:'Run the MEMBRANE-LIPID assay — it is the ONLY way to tell an archaeon from a bacterium.', why:'Antibiotics FAIL — no peptidoglycan wall to attack. With no wall to target, hit the membrane instead: a detergent breaks the lipid bilayer.'},
  {obj:'neutralize', cell:'Protista', name:'Protist',   agent:'hypotonic',  assayHint:'Wall analysis + Nuclear stain: a wall-less single-celled eukaryote.', why:'Like an animal, no wall — osmotic shock bursts it.'},
  {obj:'preserve', path:'virus',      name:'Virus',     agent:'antiviral',    assayHint:'Particle morphology + nucleic-acid: a bare capsid with no ribosomes.', why:'Only an antiviral halts viral replication; antibiotics do nothing.'},
  {obj:'preserve', path:'bacterium',  name:'Bacterium', agent:'antibiotic',   assayHint:'Particle morphology + coat: rod-shaped, peptidoglycan wall, own ribosomes.', why:'An antibiotic attacks the bacterial wall / 70S ribosome.'},
  {obj:'preserve', path:'fungus',     name:'Fungus',    agent:'antifungal',   assayHint:'Particle morphology: branching chitin threads (hyphae).', why:'An antifungal hits fungus-only targets — the ergosterol membrane or the chitin wall.'},
  {obj:'preserve', path:'parasite',   name:'Parasite',  agent:'antiparasitic',assayHint:'Particle morphology: a motile, nucleated eukaryotic cell.', why:'A eukaryotic parasite shrugs off antibiotics — it needs a targeted antiparasitic.'},
  {obj:'preserve', path:'prion',      name:'Prion',     agent:'denaturant',   assayHint:'Nucleic-acid assay: NONE at all — it is pure misfolded protein.', why:'A prion is not alive; only a protein denaturant destroys it.'},
  {obj:'preserve', path:'toxin_load', name:'Toxin',     agent:'antitoxin',    assayHint:'The assays find NO organism — just a diffusing poison.', why:'Nothing to kill — only an antitoxin neutralises the poison.'},
];
XS.loadLesson=function(i){ const L=XS.TUT_LESSONS[i]; if(!L) return false;
  XS.app.tier='field';
  const sc = L.obj==='neutralize' ? XS.buildScenario('neutralize','field',L.cell) : XS.buildScenario('preserve','field');
  sc.traits=[]; sc.shielded=false; sc.resistantStrain=false; sc.harsh=false; sc.mutating=false; sc.cures=null; sc.pathType2=null; sc.symbiontId=null; sc.assayBudget=null; sc.hostDrain=0;
  sc.regions.forEach(r=>{ r.symbiont=false; r.decoy=false; });
  if(L.obj==='preserve'){ sc.pathType=L.path; sc.agent=XS.PATHOGENS[L.path].cure; sc.dxAnswer=XS.PATHOGENS[L.path].dx; }
  else { sc.agent=XS.killAgentsFor(sc.A.cell)[0]; sc.dxAnswer=XS.KINGDOM_ANSWER[sc.A.cell]; }
  sc.tutPassed=false; sc.craft=false; sc.mode='quick';   // the tutorial always uses simple treatments
  XS.app.sc=sc; XS.app.phase='survey'; XS.app.spec=null; XS.app.zoomRegion=null; XS.app.zoomPathogen=null;
  XS.app.hoverRegion=null; XS.app.hoverPart=null; XS.app.scan=null; XS.app.result=null; XS.app.rankUp=null; XS.app.missionWrong=0; XS.app.daily=false;
  XS.app.tutorial={lesson:i, step:0};
  return true;
};
XS.startTutorial=function(){ XS.loadLesson(0); };
XS.tutorialStep=function(){ const app=XS.app, sc=app.sc; if(!sc) return 0;
  if(sc.tutPassed || app.result) return 4;
  if(app.phase==='survey') return 0;
  if(sc.diagnosed) return 3;
  const r=app.zoomRegion; if(r && r.evidence.length>=2) return 2;
  return 1;
};
XS.endTutorial=function(){ XS.app.tutorial=null; XS.progress.tutorialSeen=1; XS.saveProgress(); };

XS.enterRegion=function(region){
  const sc=XS.app.sc; if(!sc) return;
  if(XS.app.tutorial) sc.keyId=region.id;   // in the tutorial, whichever tissue you open is the target
  sc.started=true;                       // the fail-clock starts on the first tissue you open
  const isNew=!region.scanned; region.scanned=true;
  XS.app.zoomRegion=region;
  XS.app.zoomPathogen=(sc.objective==='preserve'&&region.id===sc.keyId)?sc.pathType:null;
  const spec=XS.regionCell(sc,region); if(!spec.inspected) spec.inspected=new Set();
  XS.app.spec=spec; XS.app.phase='zoom'; XS.app.zoomAt=XS.app.time; XS.app.scan=null; XS.app.hoverPart=null; XS.app.craft={items:[],step:null,made:null,tested:null};
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
  if(!XS.canTreat(sc,r)) return {ok:false, blocked:true, msg:'Diagnose the cause first — run assays, then identify it.'};
  const res=XS.applyTreatment(sc, r.id, agent);
  if(res && !res.ok) XS.app.missionWrong++;
  if(XS.app.tutorial && res && res.ok) sc.tutPassed=true;   // one correct treatment passes the lesson
  if(!XS.progress.subs.includes(agent)){ XS.progress.subs.push(agent); XS.saveProgress(); }
  // neutralise resolves immediately when takedown completes
  if(sc.objective==='neutralize' && sc.P>=100){ sc.done=true; XS.finishMission({win:true}); }
  return res;
};

XS.finishMission=function(res){
  if(XS.app.result) return;
  if(XS.app.tutorial){ XS.app.result={win:res.win}; return; }   // tutorial doesn't touch real stats
  const sc=XS.app.sc, win=res.win;
  XS.progress.runs++;
  if(win){ XS.progress.wins++;
    if(sc.objective==='preserve') XS.progress.saves++; else XS.progress.kills++;
    if(XS.app.missionWrong===0){ XS.progress.flawless++; XS.progress.sharpWins=(XS.progress.sharpWins||0)+1;
      XS.award(15,'Flawless — clean diagnosis'); }
    if(XS.app.tier==='director') XS.progress.dirWins++;
    if(sc.traits && sc.traits.length>=2){ XS.progress.hardWins=(XS.progress.hardWins||0)+1; XS.award(12,'Handled '+sc.traits.length+' complications'); }
    XS.award(30, sc.objective==='preserve'?'Organism preserved':'Threat neutralised');
  }
  // ---- OUTBREAK run scoring: grade the case, bank score, drive the colony ----
  if(XS.app.run && XS.app.run.active){
    const run=XS.app.run;
    const el=Math.max(0,(XS.app.time-(run.caseStartT||XS.app.time))/1000);
    let g = el<25?'S':el<45?'A':el<75?'B':'C';
    if(XS.app.missionWrong>0) g = g==='S'?'A':g==='A'?'B':(g==='B'?'C':'C');  // sloppy caps out
    const gm={S:3,A:2,B:1.4,C:1}[g]||1, tm={intern:1,field:1.35,director:1.8}[XS.app.tier]||1;
    let gained=0;
    if(win){ gained=Math.round(100*gm*tm*run.mult*(run.mod==='double'?2:1));
      run.score+=gained; run.cleared=(run.cleared||0)+1;
      run.streak++; run.mult=Math.min(5, +(1+run.streak*0.4).toFixed(2));
      run.colony=Math.min(100, run.colony + ({S:16,A:12,B:8,C:4}[g]||6));
      if(run.score>(XS.progress.outbreakBest||0)){ XS.progress.outbreakBest=run.score; run.newBest=true; }
    } else { run.streak=0; run.mult=1; run.colony=Math.max(0, run.colony-34); }
    run.lastGrade={g:win?g:'—', gained, el:Math.round(el), win, mult:run.mult};
    if(run.colony<=0) run.over=true;
  }
  if(win && sc.story) XS.completeStory(sc.storyIndex);
  XS.app.result={win, why:res.why}; XS.app.phase='result'; XS.saveProgress(); XS.checkAchievements();
};

/* ---------------- OUTBREAK · an escalating, scored survival run ----------------
   Chains cases back-to-back against a collapsing Colony Vitality bar. Speed +
   accuracy earn a per-case grade (S/A/B/C), a rising combo multiplier and score;
   every lost patient tears 34 off the colony. Cases ramp from Intern → Director
   with complications, plus the odd high-value (×2) or fast-spreading case. Runs
   until the colony hits zero — then you chase a new high score. */
XS.startOutbreak=function(){
  XS.app.mode='quick'; XS.app.tutorial=null; XS.app.daily=false;
  XS.app.run={active:true, colony:100, score:0, streak:0, mult:1, caseNum:0,
    cleared:0, mod:null, over:false, newBest:false, lastGrade:null,
    best:XS.progress.outbreakBest||0};
  XS.outbreakNextCase();
};
XS.outbreakNextCase=function(){ const run=XS.app.run; if(!run) return; run.caseNum++;
  const n=run.caseNum;
  const tier = n<=2?'intern' : n<=5?'field' : 'director';
  run.mod = (n>=4 && n%4===0)?'rush' : (n>=3 && n%3===0)?'double' : null;
  XS.startMission(null, tier);
  const sc=XS.app.sc; run.caseStartT=XS.app.time;
  if(run.mod==='rush'){ sc.hostDrain=(sc.hostDrain||0)*1.7; sc.mutating=true; }   // fast-spreading strain
};
XS.endOutbreak=function(){ XS.app.run=null; };

/* ---------------- achievements ---------------- */
XS.ACHIEVEMENTS=[
  {id:'first',      icon:'🔬', name:'First Contact',   desc:'Complete your first assignment', check:p=>p.wins>=1},
  {id:'healer',     icon:'💚', name:'Healer',          desc:'Preserve a sick organism', check:p=>p.saves>=1},
  {id:'exterminator',icon:'☠️',name:'Exterminator',    desc:'Neutralise a threat', check:p=>p.kills>=1},
  {id:'clean',      icon:'🎯', name:'Clean Diagnosis', desc:'Win with no wrong treatments', check:p=>p.flawless>=1},
  {id:'bookworm',   icon:'📖', name:'Bookworm',        desc:'Learn 10 organelles', check:p=>p.organelles.length>=10},
  {id:'explorer',   icon:'🧭', name:'Explorer',        desc:'Study 3 different kingdoms', check:p=>p.archetypes.length>=3},
  {id:'kingdoms',   icon:'🌍', name:'Six Kingdoms',    desc:'Encounter all six kingdoms', check:p=>p.archetypes.length>=6},
  {id:'taxonomist', icon:'🧬', name:'Taxonomist',      desc:'Catalogue 12 different species', check:p=>(p.species||[]).length>=12},
  {id:'analyst',    icon:'🔬', name:'Lab Analyst',     desc:'Run 20 lab assays', check:p=>(p.assays||0)>=20},
  {id:'sharp',      icon:'🎯', name:'Sharp Eye',       desc:'Win 5 assignments with no mistakes', check:p=>(p.sharpWins||0)>=5},
  {id:'trouble',    icon:'🧩', name:'Troubleshooter',  desc:'Win 3 runs with 2+ complications', check:p=>(p.hardWins||0)>=3},
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

/* ---------------- STORY · "The Long Survey" ----------------
   A campaign aboard a survey ship. Each chapter introduces exactly ONE new
   idea, so the game teaches itself instead of dropping every system on you at
   once — and the arc walks from familiar biology out to things that don't
   share our chemistry at all, ending on whether understanding obliges mercy.
------------------------------------------------------------ */
XS.STORY=[
  {id:'ch1', act:'I · Familiar Ground', title:'Signal', mode:'quick', tier:'intern',
   obj:'preserve', path:'bacterium', teaches:'survey → assay → diagnose → treat',
   log:'Forty-one days out from the relay. The <b>Verity</b> logs a distress bloom from a world we have never named — a biosphere dying in patches.\n\nYou are the only xenobiologist aboard. Your first case is almost reassuring: whatever is killing this thing, it is built the way <i>we</i> are built. Walls. Ribosomes. Chemistry you were trained on.\n\nFind out what it is. Then save it.',
   out:'It lives. You log the first entry in a catalogue that will get much stranger.'},

  {id:'ch2', act:'I · Familiar Ground', title:'The Wrong Weapon', mode:'quick', tier:'intern',
   obj:'neutralize', cell:'Archaea', teaches:'why the obvious cure can fail',
   log:'Second site. Something is spreading through the survey habitat and the crew want it gone before it reaches the water reclaimers.\n\nIt <i>looks</i> bacterial. The temptation is to reach for an antibiotic and be done.\n\nDon\'t. Run the membrane assay first. Some things wear a familiar shape and share none of the machinery underneath — and a confident wrong answer costs more than an honest slow one.',
   out:'No peptidoglycan. No antibiotic. You needed to look before you fired — a habit that will keep you alive later.'},

  {id:'ch3', act:'II · The Bench', title:'Nothing In The Kit', mode:'advanced', tier:'field',
   obj:'preserve', teaches:'making a cure instead of picking one',
   log:'The medical printer fails at 03:40, and with it every pre-made treatment aboard.\n\nWhat is left is a shelf of raw material — mould, bark, oil, ash, serum — and the knowledge of what to do with it. Every drug humanity ever had started here, on a bench like this one.\n\nSomething down there is dying while you read this. Go and <b>make</b> the cure.',
   out:'You made a drug out of mould and patience. The printer is still broken. It matters less than it did yesterday.'},

  {id:'ch4', act:'II · The Bench', title:'Degrees', mode:'advanced', tier:'field',
   obj:'preserve', path:'parasite', teaches:'exact temperature',
   log:'A note, scratched inside the lab cabinet by whoever had this post before you:\n\n<i>"Boiled the wormwood. Killed the very thing I was trying to extract. Two days lost. The temperature is not a detail — it IS the recipe."</i>\n\nThey were right. Heat too little and nothing forms. Heat too much and you destroy the fragile part that does the work.',
   out:'Fifty degrees. Not sixty. The difference between a cure and a cup of hot leaves.'},

  {id:'ch5', act:'II · The Bench', title:'Sour And Sweet', mode:'advanced', tier:'field',
   obj:'preserve', path:'bacterium', teaches:'exact pH',
   log:'The same cabinet, further down:\n\n<i>"Penicillin dies in alkali. I did not know that. I know it now."</i>\n\nAcid and base are not background conditions — they decide whether a reaction happens at all. Get the pH wrong and perfectly good ingredients simply refuse to become medicine.',
   out:'Right mould. Right heat. Wrong pH would have cost you the patient. It didn\'t.'},

  {id:'ch6', act:'III · Foreign', title:'Two Voices', mode:'advanced', tier:'field',
   obj:'preserve', trait:'coinfection', teaches:'more than one answer can be true',
   log:'The readings do not resolve. You keep assuming the assay is faulty, because the alternative is untidy.\n\nThe alternative is correct. There are <b>two</b> things in this tissue, and they are not the same thing, and curing one leaves the other to finish the job.\n\nYou have been trained to find <i>the</i> answer. Sometimes there is no such article.',
   out:'Two invaders. Two cures. The habit of assuming one cause nearly cost you everything.'},

  {id:'ch7', act:'III · Foreign', title:'It Isn\'t Carbon', mode:'contact', tier:'field',
   obj:'neutralize', cell:'Silicoid', teaches:'life that shares none of our chemistry',
   log:'We had a word for the edge of the map and we have crossed it.\n\nThe thing growing across the southern shelf has no membrane. No genome. No water. It grows the way a stalactite grows, and it repairs itself, and by every definition we brought with us it is <i>alive</i>.\n\nEverything in your kit was designed to attack carbon. This is not carbon. Start again — from what it is actually <b>made of</b>.',
   out:'Silicon and oxygen. Nothing we brought could touch it until you stopped assuming it was a variation on us.'},

  {id:'ch8a', act:'IV · Taking Root', title:'The Crop Won\u2019t Take', mode:'advanced', tier:'field',
   obj:'preserve', path:'fungus', teaches:'keeping Earth life alive on a world that isn\u2019t Earth',
   log:'The <b>Verity</b> is not a warship. It is a seed vault with engines.\n\nBelow us is Kepler-442 b and eleven hundred colonists who will run out of stored protein in about four hundred days. The first plots went in six weeks ago. Something in this soil is eating them.\n\nThis is the actual job, by the way. Not monsters. <i>Agriculture.</i> Work out what is in the crop and stop it, or those people go home hungry — and there is no home to go to.',
   out:'The plot holds. Eleven hundred people will eat next winter because you read a stain correctly.'},

  {id:'ch8b', act:'IV · Taking Root', title:'Native Ground', mode:'contact', tier:'field',
   obj:'neutralize', cell:'Metallophyte', teaches:'clearing a native organism out of your fields',
   log:'The eastern terrace keeps failing and it is not disease this time. Something native is already living there, and it is winning.\n\nIt does not eat light and it does not eat our crops. It eats the <i>rock</i> — and it plates everything it touches in oxide until nothing else can root.\n\nWe were here second. That does not make this easy, and the colonists have stopped asking whether it is fair.',
   out:'The terrace is clear. You note, in the log, that the organism was here first, and that you cleared it anyway.'},

  {id:'ch8c', act:'IV · Taking Root', title:'Don\u2019t Kill The Soil', mode:'advanced', tier:'director',
   obj:'preserve', trait:'symbiont', teaches:'that not everything in the field is an enemy',
   log:'Second failure on the north plots, and the instinct now is to sterilise everything and start again.\n\nDon\u2019t.\n\nSomething is living in the roots of this crop, and the assays will show you it is <b>feeding the plant</b>, not feeding on it. Kill it and you will have a clean, dead field. Six weeks of settlement agriculture has taught us what took Earth ten thousand years: the soil is not a substrate. It is an organism.',
   out:'You treated the disease and left the partner alone. That distinction is most of xenobiology.'},

  {id:'ch9', act:'V · Deep Field', title:'The Wrong Hand', mode:'alien', tier:'field',
   obj:'preserve', path:'chiral', teaches:'life built as our mirror image',
   log:'Something is wrong with the assays and it took us four days to see what.\n\nThe organism is <i>ordinary</i>. Cells, membranes, sugars, amino acids — all of it familiar, all of it correct. And all of it built the wrong way round, like a hand that will not fit any glove we own.\n\nOur drugs are shaped keys. This lock is mirrored. You will have to build the reflection.',
   out:'Every molecule we make has a handedness. It had never mattered before. It matters here.'},

  {id:'ch10', act:'V · Deep Field', title:'It Eats The Light', mode:'alien', tier:'field',
   obj:'preserve', path:'radiotroph', teaches:'an organism you cannot kill, only starve',
   log:'The containment protocol calls for irradiation. We ran it for six hours.\n\nIt grew.\n\nThis thing does not tolerate radiation, it <b>feeds</b> on it — and heat and poison are just more energy arriving. There is no dose. There is no agent. Everything in your kit is a way of giving something energy it cannot survive, and this organism survives all of it.\n\nStop trying to kill it. Take its food away.',
   out:'You starved it. It is the first time the answer has been to give something less, rather than more.'},

  {id:'ch11', act:'V · Deep Field', title:'Forty Below', mode:'alien', tier:'director',
   obj:'preserve', path:'ammono', teaches:'that water is not neutral',
   log:'Minus forty and thriving. Its solvent is liquid ammonia, and by its standards our biochemistry is the exotic one.\n\nHere is what the crew found hard: the cure is <b>water</b>. Warm, ordinary, harmless water — the substance we are mostly made of, the thing we ship across light-years because life needs it.\n\nTo this organism it is a violent reagent. Nothing is universally safe. There is only what a given chemistry can tolerate, and we are not the reference.',
   out:'Water. We call it the solvent of life because it is the solvent of OUR life. That distinction cost this organism everything.'},

  {id:'ch8', act:'VI · The Question', title:'The Question', mode:'contact', tier:'director',
   obj:'neutralize', cell:'Plasmoid', teaches:'whether understanding obliges mercy', choice:true,
   log:'It has been following the <b>Verity</b> for six days.\n\nA knot of ionised gas that holds its own shape. No cells. No chemistry. Nothing you could call a body. It should not be able to persist and it has persisted, and this morning the magnetometer logged its field oscillating in a pattern that repeats — and then changes when we transmit.\n\nCommand has classified it a hazard and ordered containment. You know how to do that now. You could collapse it inside a minute.\n\nThe order does not require you to be certain. It only requires you to be quick.',
   out:'Whatever it was, it is a decision you made rather than one you were handed.'},
];
XS.storyProgress=()=>((XS.progress&&XS.progress.story)|0);
XS.storyChapter=i=>XS.STORY[i]||null;
XS.startStory=function(i){
  const ch=XS.STORY[i]; if(!ch) return false;
  XS.app.mode=ch.mode||'quick'; XS.app.tier=ch.tier||'field';
  XS.app.daily=false; XS.app.tutorial=null; XS.app.run=null;
  const sc=XS.buildScenario(ch.obj, XS.app.tier, ch.cell||null);
  // a story beat is authored, not random — pin exactly what it means to teach
  sc.traits=[]; sc.shielded=false; sc.resistantStrain=false; sc.mutating=false;
  sc.harsh=false; sc.cures=null; sc.decoy=false;
  sc.regions.forEach(r=>{ r.symbiont=false; r.decoy=false; });
  if(ch.obj==='preserve' && ch.path){ sc.pathType=ch.path; sc.agent=XS.PATHOGENS[ch.path].cure; sc.dxAnswer=XS.PATHOGENS[ch.path].dx;
    const key=sc.regions.find(r=>r.id===sc.keyId); if(key) key.problem={kind:'pathogen', pathType:ch.path}; }
  if(ch.trait){ const T=(XS.TRAITS||[]).find(t=>t.id===ch.trait); if(T&&T.apply){ sc.traits=[T]; T.apply(sc); } }
  sc.story=ch; sc.storyIndex=i;
  XS.app.sc=sc; XS.app.phase='survey'; XS.app.spec=null; XS.app.zoomRegion=null; XS.app.zoomPathogen=null;
  XS.app.hoverRegion=null; XS.app.hoverPart=null; XS.app.scan=null; XS.app.result=null;
  XS.app.rankUp=null; XS.app.missionWrong=0; XS.app.storyChoice=null;
  return true;
};
XS.completeStory=function(i){
  if(!XS.progress.story || XS.progress.story<=i){ XS.progress.story=i+1; XS.award(40,'Chapter cleared: '+XS.STORY[i].title); XS.saveProgress(); }
};
/* chapter 8 · refuse the order — a real ending, not a forfeit */
XS.storyStandDown=function(){
  const sc=XS.app.sc; if(!sc||!sc.story||!sc.story.choice||sc.done) return null;
  sc.done=true; XS.app.storyChoice='spare';
  XS.completeStory(sc.storyIndex);
  XS.app.result={win:true, spared:true};
  XS.app.phase='result';
  return XS.app.result;
};

/* ---------------- daily (seeded) ---------------- */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
XS.dailyKey=function(){ const d=new Date();
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'); };
XS.startDaily=function(){
  const k=XS.dailyKey(); const seed=k.split('-').reduce((s,n)=>s*100+(+n),0);
  const orig=Math.random; Math.random=mulberry32(seed);
  // Explicit (seeded) objective so the Daily is identical for everyone and never
  // touches the free-play bias in pickObjective. First seeded draw = objective,
  // exactly as before, so buildScenario sees the same subsequent sequence.
  try{ XS.startMission(Math.random()<0.5?'preserve':'neutralize','field'); }finally{ Math.random=orig; }
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
