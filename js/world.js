/* =====================================================================
   XENOSCOPE · world.js
   The MACRO layer: whole alien organisms on their exoplanets, the
   anatomical regions you can zoom into, and scenario generation.
   Only two objectives exist now: PRESERVE or NEUTRALIZE.
   Rendering lives in draw.js (reuses its canvas helpers); this file is
   data + logic only.
===================================================================== */
(function(XS){
"use strict";
const pick=a=>a[Math.floor(Math.random()*a.length)];
const ri=(a,b)=>Math.floor(a+Math.random()*(b-a+1));

/* ---------------- exoplanets (backdrops) ---------------- */
XS.PLANETS=[
  {name:'Kepler-442 b', sky:['#241536','#12102a'], ground:'#241338', accent:[183,155,255], sun:'#d9c2ff', terrain:'dunes'},
  {name:'Proxima d',    sky:['#0a2230','#0a1622'], ground:'#0c2a30', accent:[94,242,214], sun:'#bffff0', terrain:'sea'},
  {name:'Gliese 581 g', sky:['#361d10','#241206'], ground:'#3a2312', accent:[255,180,120], sun:'#ffdca6', terrain:'crags'},
  {name:'TRAPPIST-1 e', sky:['#101838','#0a1024'], ground:'#141d40', accent:[125,184,255], sun:'#cfe0ff', terrain:'ice'},
  {name:'Teegarden c',  sky:['#2a1030','#180a20'], ground:'#2c1236', accent:[255,110,199], sun:'#ffc4ec', terrain:'fungal'},
];

/* ---------------- macro creature archetypes ----------------
   regions: unit coords (x right, y down) relative to the creature centre.
   `cell` = which cell kingdom you meet when you zoom into that region.
------------------------------------------------------------ */
XS.CREATURES={
  fauna:{ label:'Fauna', body:'a mobile animal-grade creature', col:[255,143,163],
    gen:['Vorn','Cryssa','Umbra','Thorn','Glide','Rax'], epi:[' ambler',' maw',' strider',' lurker',' grazer'],
    blurb:'A wall-less animal-grade organism — it moves, it hunts, and its soft tissues can harbour infections.',
    regions:[
      {id:'hide',    name:'Hide / epidermis', tissue:'protective skin', cell:'Animalia', x:0.0,  y:-0.05, r:0.55, rim:true},
      {id:'gut',     name:'Digestive sac',    tissue:'gut lining',      cell:'Animalia', x:0.05, y:0.34},
      {id:'hemo',    name:'Hemolymph',        tissue:'circulatory fluid',cell:'Animalia', x:-0.42,y:0.05},
      {id:'ganglion',name:'Neural ganglion',  tissue:'nerve cluster',   cell:'Animalia', x:0.52, y:-0.32},
    ],
    weakness:'hypotonic' },
  flora:{ label:'Flora', body:'a rooted photosynthetic organism', col:[126,255,192],
    gen:['Chloro','Sylvo','Viridi','Helio','Frond','Thal'], epi:['bloom',' spire',' canopy',' vine',' reed'],
    blurb:'A rooted autotroph with rigid cellulose-walled cells — it feeds on light and pumps sap through vascular tissue.',
    regions:[
      {id:'leaf',   name:'Photosynthetic frond', tissue:'palisade leaf',   cell:'Plantae',     x:0.28, y:-0.5},
      {id:'stem',   name:'Vascular stem',        tissue:'xylem & phloem',  cell:'PlantTissue', x:0.0,  y:0.05},
      {id:'root',   name:'Root network',         tissue:'root cells',      cell:'Plantae',     x:-0.1, y:0.55},
    ],
    weakness:'hypertonic' },
  fungal:{ label:'Fungal', body:'a spore-bearing fungal body', col:[255,196,107],
    gen:['Myco','Necro','Sporo','Ergo','Cap','Hypha'], epi:['crown',' veil',' bloom',' shroud',' stalk'],
    blurb:'A chitin-walled decomposer — a fruiting cap above a hidden web of feeding threads (mycelium).',
    regions:[
      {id:'cap',     name:'Fruiting cap',   tissue:'cap tissue',    cell:'Fungi', x:0.0,  y:-0.45, r:0.6, rim:true},
      {id:'gills',   name:'Spore gills',    tissue:'spore-bearing', cell:'Fungi', x:0.0,  y:-0.05},
      {id:'mycelium',name:'Mycelial mat',   tissue:'feeding hyphae',cell:'Fungi', x:-0.05,y:0.5},
    ],
    weakness:'antifungal' },
};
XS.CREATURE_KEYS=Object.keys(XS.CREATURES);

/* ---------------- pathogens (for PRESERVE scenarios) ---------------- */
XS.PATHOGENS={
  virus:    {label:'viral infection', cure:'antiviral', particle:'virus',
    tell:'Foreign RNA/protein particles crowd the cells — a virus has invaded this tissue.',
    why:'Only an antiviral halts viral replication; antibiotics do nothing to a virus.'},
  bacterium:{label:'bacterial infection', cure:'antibiotic', particle:'bacterium',
    tell:'Rod-shaped invaders with their own walls swarm between the cells — a bacterial infection.',
    why:'An antibiotic attacks the bacterial wall / 70S ribosome, sparing the host.'},
  fungus:   {label:'fungal infection', cure:'antifungal', particle:'fungus',
    tell:'Creeping chitin-walled threads have colonised the tissue — a fungal infection.',
    why:'An antifungal disrupts the chitin wall / fungal membrane.'},
};

/* ---------------- treatment palette (shown in the treat dock) ---------------- */
XS.TREATMENTS=[
  {id:'antiviral', label:'Antiviral',    desc:'Blocks viral replication. Cures a viral infection; useless on bacteria, fungi or host cells.'},
  {id:'antibiotic',label:'Antibiotic',   desc:'Kills bacteria. Cures a bacterial infection; no effect on viruses or fungi.'},
  {id:'antifungal',label:'Antifungal',   desc:'Attacks the chitin wall / fungal membrane. Cures fungal rot — and destroys a fungal organism.'},
  {id:'hypotonic', label:'Osmotic shock',desc:'Floods cells with water. Bursts wall-less animal cells; walled cells resist.'},
  {id:'hypertonic',label:'Herbicide',    desc:'Draws water out. Plasmolyses walled plant cells, collapsing the plant.'},
  {id:'detergent', label:'Detergent',    desc:'Dissolves lipid membranes and enveloped viruses.'},
];

/* ---------------- neutralise weakness by cell kind ---------------- */
XS.WEAKNESS_WHY={
  hypotonic:'This creature’s cells have no wall — flooding them with a hypotonic shock makes them swell and burst.',
  hypertonic:'Rigid cellulose walls resist bursting, so draw water OUT with a hypertonic shock to collapse them (plasmolysis).',
  antifungal:'Its chitin-walled cells fall to an antifungal that dissolves the fungal wall/membrane.',
};

/* ---------------- scenario generation ---------------- */
XS.buildScenario=function(objective, tier){
  const T=(XS.TIERS&&XS.TIERS[tier])||{margin:1};
  const archKey=pick(XS.CREATURE_KEYS), A=XS.CREATURES[archKey];
  const planet=pick(XS.PLANETS);
  const regions=A.regions.map(r=>Object.assign({}, r, {scanned:false, cellSpec:null, status:null}));
  const key=pick(regions);
  const sc={ objective, archKey, A, planet,
    name:`${pick(A.gen)}${pick(A.epi)}`,
    regions, keyId:key.id,
    P:0, host:100, resist:0, cured:false, done:false,
    tier,
  };
  if(objective==='preserve'){
    const ptype=pick(Object.keys(XS.PATHOGENS));
    sc.pathType=ptype; sc.agent=XS.PATHOGENS[ptype].cure;
    key.problem={kind:'pathogen', pathType:ptype};
    sc.brief=`${sc.name} is failing. A ${XS.PATHOGENS[ptype].label} is spreading somewhere in its body. Find the afflicted tissue and cure it — keep the organism alive.`;
    sc.hostDrain=(objective==='preserve')?4.2/(T.margin||1):0;
  } else {
    sc.agent=A.weakness;
    key.problem={kind:'vital'};
    sc.brief=`${sc.name} is an invasive threat to this biome. Find the tissue it can’t defend and neutralise the whole organism.`;
    sc.hostDrain=0;
  }
  // label region statuses (revealed on scan)
  regions.forEach(r=>{ r.status = (r.id===sc.keyId)
    ? (objective==='preserve'?'afflicted':'vulnerable')
    : (objective==='preserve'?'healthy':'robust'); });
  return sc;
};

/* lazily build the cell you see when zoomed into a region */
XS.regionCell=function(sc, region){
  if(region.cellSpec) return region.cellSpec;
  const spec=XS.genSpecimen(region.cell, sc.tier||'field');
  spec.task=null; spec.inspected=new Set();
  region.cellSpec=spec;
  return spec;
};

/* the treatments offered in the treat dock (correct one is always present) */
XS.treatmentOptions=function(sc){
  const base=['antiviral','antibiotic','antifungal','hypotonic','hypertonic','detergent'];
  if(!base.includes(sc.agent)) base.push(sc.agent);
  // keep a stable, learnable order
  return base;
};

/* apply a treatment to a target region; returns {ok, msg} */
XS.applyTreatment=function(sc, regionId, agent){
  if(sc.done) return null;
  const correctRegion = regionId===sc.keyId;
  const correctAgent = agent===sc.agent;
  if(correctRegion && correctAgent){
    sc.P=Math.min(100, sc.P+22);
    if(sc.objective==='preserve' && sc.P>=100){ sc.cured=true; }
    return {ok:true, msg:sc.objective==='preserve'?'Correct treatment — the tissue is responding.':'Direct hit on the vulnerable tissue.'};
  }
  // wrong: raises the fail meter a little
  sc.resist=Math.min(100, sc.resist + (correctRegion?9:14));
  const msg = !correctRegion ? 'Wrong tissue — this region isn’t the problem.'
            : 'Wrong agent — barely any effect. Match the treatment to the biology.';
  return {ok:false, msg};
};

/* per-frame macro tick (called during survey & treat phases) */
XS.worldTick=function(sc, dt){
  if(sc.done) return null;
  if(sc.objective==='preserve'){
    // host declines while the affliction persists; recovers once cured
    if(!sc.cured) sc.host=Math.max(0, sc.host - sc.hostDrain*(1-sc.P/100)*dt);
    else sc.host=Math.min(100, sc.host + 14*dt);
    if(sc.cured && sc.host>=90){ sc.done=true; return {win:true}; }
    if(sc.host<=0){ sc.done=true; return {win:false, why:'The organism succumbed to the infection.'}; }
    if(sc.resist>=100){ sc.done=true; return {win:false, why:'Repeated wrong treatments overwhelmed the host.'}; }
  } else {
    // neutralise: P is the takedown progress; resist = it adapting/escaping
    if(sc.P>=100){ sc.done=true; return {win:true}; }
    if(sc.resist>=100){ sc.done=true; return {win:false, why:'The organism adapted to your mistakes and escaped containment.'}; }
  }
  return null;
};

XS.OBJECTIVE_INFO={
  preserve:{label:'PRESERVE', tone:'good', verb:'Preserve', winT:'ORGANISM SAVED',
    goal:'Diagnose the affliction and cure the right tissue — keep it alive.'},
  neutralize:{label:'NEUTRALIZE', tone:'bad', verb:'Neutralize', winT:'ORGANISM NEUTRALIZED',
    goal:'Find the tissue it can’t defend and take the whole organism down.'},
};

})(window.XS);
