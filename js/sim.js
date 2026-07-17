/* =====================================================================
   XENOSCOPE · sim.js
   Specimen generation + the assignment-phase biology model + tasks.
   The model rewards correct identification: the right agent for the
   organism works, the wrong one does little (selective toxicity).
===================================================================== */
(function(XS){
"use strict";
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1));
const cl=(v,a,b)=>v<a?a:v>b?b:v, pick=a=>a[Math.floor(Math.random()*a.length)];
XS.rnd=rnd; XS.ri=ri; XS.cl=cl; XS.pick=pick;

/* which treatments actually work on which organism (educational core) */
function killAgents(k, spec){
  switch(k){
    case 'Monera': return ['antibiotic','lysozyme'];
    case 'Archaea': return ['detergent'];               // no peptidoglycan → antibiotics fail
    case 'Fungi': return ['antifungal'];
    case 'Virus': return ['antiviral'];
    case 'Plantae': case 'PlantTissue': return ['hypertonic'];
    default: return ['hypotonic']; // Animalia, Protista (no wall)
  }
}
XS.killAgents=killAgents;

/* organelle ids that only ever appear once per specimen */
const SINGLE=['membrane','wall_cellulose','wall_chitin','wall_pepti','wall_slayer','capsule',
  'vacuole_central','nucleoid','cytoskeleton','septa','plasmodesmata','envelope','capsid',
  'genome_rna','genome_dna','tail_fiber'];

/* ---------------- specimen generation (random alien) ---------------- */
XS.genSpecimen=function(kingdomKey, tier){
  const K=XS.KINGDOMS[kingdomKey];
  const T=XS.TIERS[tier]||XS.TIERS.field;
  let autotroph = K.autotroph;
  if(autotroph===null) autotroph = (kingdomKey==='Monera'||kingdomKey==='Archaea')? Math.random()<0.4 : Math.random()<0.45;
  const chemo = (kingdomKey==='Archaea') && autotroph;    // archaeal autotrophs are chemoautotrophs

  // clone parts; add photosynthetic gear for photo-autotrophs; envelope for some viruses
  const parts = K.parts.map(p=>p.slice());
  if(autotroph && !chemo){
    if(kingdomKey==='Monera') parts.push(['thylakoid',ri(2,3)]);
    else if(kingdomKey==='Protista'){ parts.push(['chloroplast',ri(3,4)]); parts.push(['eyespot',1]); }
  }
  let enveloped=false;
  if(K.virus){ enveloped=Math.random()<0.5; if(enveloped) parts.push(['envelope',1]); }

  const gram = kingdomKey==='Monera' ? pick(['+','-']) : null;
  const spec={
    id:'SPX-'+ri(1000,9999), kingdomKey, K,
    label:K.label, isVirus:!!K.virus, tissue:!!K.tissue,
    name:`${pick(K.gen)}${pick(K.epi)} ${pick(['borealis','abyssi','ignis','pallida','vorax','nocturna','silex','profundi'])}`,
    blurb:K.blurb, autotroph, chemo, gram, enveloped,
    hasStarch: autotroph && !chemo,
    optPH:+rnd(4,9).toFixed(1), phBand:rnd(2.0,2.6)*T.margin,
    optT:Math.round(rnd(12,46)), tBand:rnd(12,17)*T.margin,
  };
  // archaea are extremophiles — an important classification clue
  if(kingdomKey==='Archaea'){
    const r=Math.random();
    if(r<0.55) spec.optT=Math.round(rnd(66,92));
    else if(r<0.78) spec.optPH=+rnd(1,3).toFixed(1);
    else spec.optPH=+rnd(9.5,12).toFixed(1);
  }
  spec.kill = killAgents(kingdomKey, spec);
  if(spec.isVirus) spec.kill = enveloped ? ['antiviral','detergent'] : ['antiviral'];
  spec.food = spec.isVirus ? 'host' : (chemo ? 'minerals' : (autotroph ? 'light' : 'glucose'));

  buildInstances(spec, parts);
  return spec;
};

/* ---------------- build a specimen from a real Earth reference ---------------- */
XS.genFromEarth=function(entry, tier){
  const K=XS.KINGDOMS[entry.kind], T=XS.TIERS[tier]||XS.TIERS.field;
  const parts=entry.parts.map(p=>p.slice());
  const spec={
    id:'REF-'+ri(100,999), kingdomKey:entry.kind, K, earth:true, species:entry.species,
    label:K.label, isVirus:!!entry.isVirus||!!K.virus, tissue:!!K.tissue,
    name:entry.species, blurb:entry.blurb, fact:entry.fact, wiki:entry.wiki,
    autotroph:!!entry.autotroph, chemo:!!entry.chemo, gram:entry.gram||null,
    hasStarch:!!entry.autotroph && !entry.chemo, anucleate:!!entry.anucleate,
    enveloped:parts.some(p=>p[0]==='envelope'),
    optPH:entry.optPH, phBand:2.3*T.margin, optT:entry.optT, tBand:14*T.margin,
    kill:entry.kill.slice(),
  };
  spec.food = spec.isVirus ? 'host' : (spec.chemo ? 'minerals' : (spec.autotroph ? 'light' : 'glucose'));
  buildInstances(spec, parts);
  return spec;
};

function buildInstances(spec, parts){
  const inst=[], ids=[];
  for(const [id,n] of parts){
    if(!ids.includes(id)) ids.push(id);
    const single=SINGLE.includes(id);
    for(let i=0;i<n;i++){ inst.push(makeInst(id,i,n)); if(single) break; }
  }
  spec.parts=inst; spec.organelleIds=ids;
}
function makeInst(id,i,n){
  let rad,sz;
  switch(id){
    case 'nucleus': rad=rnd(0,.12); sz=rnd(.24,.30); break;
    case 'nucleolus': rad=0; sz=.08; break;
    case 'nucleoid': rad=0; sz=.34; break;
    case 'vacuole_central': rad=0; sz=.6; break;
    case 'vacuole': rad=rnd(.15,.35); sz=rnd(.24,.32); break;
    case 'chloroplast': rad=rnd(.42,.82); sz=rnd(.11,.14); break;
    case 'thylakoid': rad=rnd(.3,.7); sz=rnd(.12,.17); break;
    case 'mitochondrion': rad=rnd(.42,.82); sz=rnd(.09,.12); break;
    case 'contractile': rad=rnd(.45,.62); sz=rnd(.13,.16); break;
    case 'food_vacuole': rad=rnd(.4,.7); sz=rnd(.07,.10); break;
    case 'lysosome': rad=rnd(.4,.82); sz=rnd(.05,.07); break;
    case 'er_rough': rad=rnd(.3,.5); sz=rnd(.2,.26); break;
    case 'golgi': rad=rnd(.45,.7); sz=rnd(.1,.13); break;
    case 'centriole': rad=rnd(.28,.4); sz=rnd(.07,.09); break;
    case 'plasmid': rad=rnd(.3,.55); sz=rnd(.05,.07); break;
    case 'spore': rad=rnd(.4,.68); sz=rnd(.07,.10); break;
    case 'eyespot': rad=rnd(.6,.8); sz=.06; break;
    case 'capsid': rad=0; sz=.62; break;
    case 'genome_rna': case 'genome_dna': rad=0; sz=.3; break;
    case 'spike': rad=1.0; sz=.12; break;
    case 'xylem': rad=rnd(.2,.6); sz=rnd(.16,.22); break;
    case 'phloem': rad=rnd(.2,.6); sz=rnd(.14,.2); break;
    default: rad=rnd(.2,.86); sz=rnd(.010,.016); // ribosome & specks
  }
  const spikeAng = id==='spike' ? (i/Math.max(1,n))*6.283 : rnd(0,6.283);
  return {id, ang:spikeAng, rad, sz, sp:rnd(.04,.13)*(Math.random()<.5?-1:1), ph:rnd(0,6),
          shape:XS.ORG[id]?XS.ORG[id].shape:'speck', col:XS.ORG[id]?XS.ORG[id].col:'#dbeaff'};
}

/* ---------------- fresh dynamic state for the assignment ---------------- */
XS.freshState=function(spec, task){
  const S={ ph:spec.optPH, temp:spec.optT, light:0, glucose:0, minerals:0, host:0,
    antibiotic:0, antifungal:0, antiviral:0, lysozyme:0, hypotonic:0, hypertonic:0, toxin:0, detergent:0,
    vitality:60, integrity:100, hold:0, comfort:0, pulse:0 };
  XS.TASKS[task].init(spec,S);
  return S;
};

/* ---------------- comfort / energy ---------------- */
function envFit(spec,S){
  const p=cl(1-Math.abs(S.ph-spec.optPH)/spec.phBand,-1.4,1);
  const t=cl(1-Math.abs(S.temp-spec.optT)/spec.tBand,-1.4,1);
  return (p+t)/2;
}
function energyScore(spec,S){
  if(spec.isVirus) return cl(S.host/50,0,1) - 0.15;           // needs a host to replicate
  if(spec.chemo) return cl(S.minerals/50,0,1) - 0.15;         // chemoautotroph: energy from chemicals/minerals
  if(spec.autotroph){
    const lit=cl(S.light/50,0,1), min=0.4+0.6*cl(S.minerals/50,0,1);
    return lit*min - 0.15 - cl(S.glucose>10?0.1:0,0,1);        // light-limited; glucose doesn't help
  }
  return cl(S.glucose/50,0,1) - 0.15;                           // heterotroph needs organic food
}
function threat(spec,S){
  // effective (selective) damage + broad damage
  let v=0, integ=0;
  const eff=spec.kill;
  if(eff.includes('antibiotic')) v+=cl(S.antibiotic/50,0,1)*2.4, integ+=cl(S.antibiotic/50,0,1)*1.0;
  if(eff.includes('antifungal')) v+=cl(S.antifungal/50,0,1)*2.4;
  if(eff.includes('antiviral')) v+=cl(S.antiviral/50,0,1)*2.5;
  if(eff.includes('lysozyme')) integ+=cl(S.lysozyme/50,0,1)*2.2;
  if(eff.includes('hypotonic')) integ+=cl(S.hypotonic/50,0,1)*2.4;   // burst wall-less
  if(eff.includes('hypertonic')) v+=cl(S.hypertonic/50,0,1)*2.4;     // plasmolyse walled
  if(eff.includes('detergent')) v+=cl(S.detergent/50,0,1)*2.4;       // dissolve membrane / envelope
  // broad toxin hits everything; wrong-agent still tiny effect so it's not totally inert
  v += cl(S.toxin/50,0,1)*1.0;
  const wrongAg=(S.antibiotic+S.antifungal+S.antiviral+S.lysozyme+S.hypotonic+S.hypertonic+S.detergent);
  v += cl(wrongAg/50,0,1)*0.06;
  return {v, integ};
}
XS.comfortOf=function(spec,S){ return envFit(spec,S)*0.6 + energyScore(spec,S)*0.5; };

/* ---------------- step ---------------- */
XS.simStep=function(spec,S,dt,tier){
  const drift=(XS.TIERS[tier]||XS.TIERS.field).drift;
  // decay applied substances
  for(const k of ['light','glucose','minerals','host','antibiotic','antifungal','antiviral','lysozyme','hypotonic','hypertonic','toxin','detergent'])
    S[k]=Math.max(0,S[k]-2.2*dt);

  const env=envFit(spec,S), en=energyScore(spec,S), th=threat(spec,S);
  S.comfort=env*0.6+en*0.5;

  // integrity (structural)
  let dInt=(S.comfort>0?1.6:0) - th.integ*3.2*drift;
  S.integrity=cl(S.integrity+dInt*dt,0,100);

  // vitality drifts to a target set by environment, energy & threats
  let target=50 + env*36 + en*30 - th.v*45;
  let dVit=(target-S.vitality)*0.10*drift;
  if(S.integrity<=0) dVit-=50;
  S.vitality=cl(S.vitality+dVit*dt,0,100);
  S.pulse+=dt;

  return XS.TASKS[spec.task]? XS.evalTask(spec,S,dt):null;
};

/* ---------------- TASKS ---------------- */
XS.TASKS={
  cultivate:{name:'CULTIVATE',tone:'good',winT:'SPECIMEN CULTIVATED',need:0,
    obj:s=> s.isVirus?'Culture the virus to 100% titre':'Raise Vitality to 100%',
    hint:s=> s.isVirus?'A virus needs a HOST CELL CULTURE to replicate — nutrients alone do nothing.'
            : s.chemo?'A chemoautotroph — it draws energy from MINERALS/chemicals, not light or sugar.'
            : s.autotroph?'This autotroph feeds by photosynthesis — give it LIGHT (and minerals), not sugar.'
            : 'A heterotroph — feed it GLUCOSE. Keep pH & temperature in its comfort band.',
    win:(s,S)=>S.vitality>=100, lose:(s,S)=>S.vitality<=0||S.integrity<=0,
    init:(s,S)=>{ S.vitality=38; S.ph=badPH(s); S.temp=Math.round(s.optT - s.tBand*1.4); }},
  neutralize:{name:'NEUTRALIZE',tone:'bad',winT:'SPECIMEN NEUTRALIZED',need:0,
    obj:s=> s.isVirus?'Inactivate the virus (titre → 0)':'Reduce Vitality to 0%',
    hint:s=> 'Use the agent this organism is vulnerable to — the wrong drug barely works. '+killHint(s),
    win:(s,S)=>S.vitality<=0||S.integrity<=0, lose:(s,S)=>S.vitality>=100,
    init:(s,S)=>{ S.vitality=78; feed(s,S,45); }},
  stabilize:{name:'STABILIZE',tone:'neutral',winT:'HOMEOSTASIS HELD',need:6,
    obj:s=>'Hold Vitality 40–70% for 6s',
    hint:s=>'Keep it comfortable but not thriving — nudge conditions until Vitality settles mid-range.',
    hold:(s,S)=>S.vitality>=40&&S.vitality<=70, lose:(s,S)=>S.vitality<=0||S.vitality>=100,
    init:(s,S)=>{ S.vitality=42; S.ph=badPH(s,0.9); }},
  bloom:{name:'FORCE BLOOM',tone:'good',winT:'CULTURE BLOOMED',need:5,
    obj:s=>'Reach & hold Vitality ≥90% for 5s',
    hint:s=>'Perfect its world and feed it correctly, then keep it there. '+foodHint(s),
    hold:(s,S)=>S.vitality>=90, lose:(s,S)=>S.vitality<=0||S.integrity<=0,
    init:(s,S)=>{ S.vitality=45; S.ph=badPH(s,0.8); }},
  quarantine:{name:'QUARANTINE',tone:'neutral',winT:'SPECIMEN CONTAINED',need:6,
    obj:s=>'Hold Vitality below 35% for 6s — keep it alive',
    hint:s=>'Stress it toward dormancy without killing it. Starve it or nudge conditions off-optimum.',
    hold:(s,S)=>S.vitality<35&&S.vitality>0, lose:(s,S)=>S.vitality<=0||S.vitality>=100,
    init:(s,S)=>{ S.vitality=72; feed(s,S,40); }},
};
function badPH(s,f){ f=f||1.6; return XS.cl(s.optPH+(s.optPH>6.5?-1:1)*s.phBand*f,0.2,13.8); }
function feed(s,S,amt){ if(s.isVirus)S.host=amt; else if(s.chemo)S.minerals=amt; else if(s.autotroph){S.light=amt;S.minerals=amt;} else S.glucose=amt; }
function foodHint(s){ return s.isVirus?'(Provide host cells.)':s.chemo?'(Mineral / chemical medium.)':s.autotroph?'(Light + minerals.)':'(Glucose.)'; }
function killHint(s){
  const map={antibiotic:'Antibiotic works on bacteria.',antifungal:'Antifungal for fungi.',antiviral:'Antiviral for viruses.',
    hypotonic:'No wall → a hypotonic shock bursts it.',hypertonic:'Walled → a hypertonic shock plasmolyses it.',
    lysozyme:'Lysozyme cracks its wall.',detergent:'Detergent dissolves its membrane/envelope.'};
  return map[s.kill[0]]||'';
}
XS.foodHint=foodHint;

XS.evalTask=function(spec,S,dt){
  const T=XS.TASKS[spec.task];
  if(T.need>0){
    if(T.lose(spec,S)) return {done:true,win:false};
    if(T.hold(spec,S)){ S.hold+=dt; if(S.hold>=T.need) return {done:true,win:true}; } else S.hold=0;
  } else {
    if(T.win(spec,S)) return {done:true,win:true};
    if(T.lose(spec,S)) return {done:true,win:false};
  }
  return null;
};

/* pick a task valid for the specimen (viruses can't stabilize/bloom the same way but still ok) */
XS.pickTask=function(spec){
  const all=['cultivate','neutralize','stabilize','bloom','quarantine'];
  return XS.pick(all);
};

})(window.XS);
