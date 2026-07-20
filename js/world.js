/* =====================================================================
   XENOSCOPE · world.js
   The MACRO layer: a catalogue of whole alien organisms across SIX
   kingdoms, each with its own body-plan (drawn in draw.js), the tissues
   you zoom into, and the scenario logic.

   Two objectives: PRESERVE or NEUTRALIZE.
   The game is now a DEDUCTION: the cause is hidden. You must run lab
   assays and inspect cell structures to gather EVIDENCE, commit a
   diagnosis, then choose the one correct treatment. Wrong moves are
   punished — harder on higher tiers.
===================================================================== */
(function(XS){
"use strict";
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------------- exoplanets (backdrops) ---------------- */
XS.PLANETS=[
  {name:'Kepler-442 b', sky:['#241536','#12102a'], ground:'#241338', accent:[183,155,255], sun:'#d9c2ff', terrain:'dunes'},
  {name:'Proxima d',    sky:['#0a2230','#0a1622'], ground:'#0c2a30', accent:[94,242,214], sun:'#bffff0', terrain:'sea'},
  {name:'Gliese 581 g', sky:['#361d10','#241206'], ground:'#3a2312', accent:[255,180,120], sun:'#ffdca6', terrain:'crags'},
  {name:'TRAPPIST-1 e', sky:['#101838','#0a1024'], ground:'#141d40', accent:[125,184,255], sun:'#cfe0ff', terrain:'ice'},
  {name:'Teegarden c',  sky:['#2a1030','#180a20'], ground:'#2c1236', accent:[255,110,199], sun:'#ffc4ec', terrain:'fungal'},
  {name:'LHS 1140 b',   sky:['#08221c','#04140f'], ground:'#08281f', accent:[120,255,180], sun:'#c6ffe6', terrain:'moss'},
];

/* ---------------- region (tissue) templates by body group ----------------
   coords are unit offsets from the creature centre; cell = kingdomKey met on zoom.
------------------------------------------------------------ */
const R_ANIMAL=[
  {id:'hide', name:'Hide / epidermis', tissue:'protective skin',  x:0.0,  y:-0.08},
  {id:'gut',  name:'Digestive sac',    tissue:'gut lining',       x:0.06, y:0.30},
  {id:'core', name:'Body cavity',      tissue:'soft interior',    x:-0.40,y:0.04},
  {id:'nerve',name:'Neural ganglion',  tissue:'nerve cluster',    x:0.52, y:-0.30},
];
const R_PLANT=[
  {id:'leaf', name:'Photosynthetic frond', tissue:'palisade leaf', x:0.30, y:-0.48},
  {id:'stem', name:'Vascular stem',        tissue:'xylem & phloem',x:0.0,  y:0.06, cell:'PlantTissue'},
  {id:'root', name:'Root network',         tissue:'root cells',    x:-0.12,y:0.52},
];
const R_FUNGI=[
  {id:'cap',   name:'Fruiting cap',  tissue:'cap tissue',     x:0.0,  y:-0.42},
  {id:'gills', name:'Spore surface', tissue:'spore-bearing',  x:0.0,  y:-0.04},
  {id:'myc',   name:'Mycelial mat',  tissue:'feeding hyphae', x:-0.06,y:0.48},
];
const R_PROTIST=[
  {id:'cortex',name:'Outer cortex',   tissue:'pellicle / membrane', x:0.02, y:-0.40},
  {id:'endo',  name:'Endoplasm',      tissue:'inner cytoplasm',     x:0.10, y:0.04},
  {id:'organ', name:'Organelle field',tissue:'organelle cluster',   x:-0.34,y:0.24},
];
const R_MICROBE=[
  {id:'crown', name:'Colony crown',  tissue:'growth front',   x:0.0,  y:-0.34},
  {id:'matrix',name:'Matrix layer',  tissue:'shared matrix',  x:0.06, y:0.06},
  {id:'base',  name:'Basal film',    tissue:'anchoring film', x:-0.06,y:0.46},
];
const R_BY_PLAN={
  beast:R_ANIMAL, medusa:R_ANIMAL, arthropod:R_ANIMAL, tentacled:R_ANIMAL, worm:R_ANIMAL,
  anemone:R_ANIMAL, crinoid:R_ANIMAL, sponge:R_ANIMAL, starfish:R_ANIMAL,
  tree:R_PLANT, fern:R_PLANT, vine:R_PLANT, bulb:R_PLANT, reed:R_PLANT, canopy:R_PLANT, pitcher:R_PLANT,
  mushroom:R_FUNGI, bracket:R_FUNGI, coral:R_FUNGI, puffball:R_FUNGI, mold:R_FUNGI, lichen:R_FUNGI,
  amoeba:R_PROTIST, ciliate:R_PROTIST, diatom:R_PROTIST, radiolarian:R_PROTIST, urchin:R_PROTIST, slimemold:R_PROTIST,
  colony:R_MICROBE,
};

/* per-plan hotspot positions — each body-plan is drawn differently, so the
   tissue markers need coordinates that actually sit on THAT silhouette.
   Only plans that differ from their group default are listed. */
const PLAN_POS={
  // animals
  arthropod:{hide:[-0.05,-0.05],gut:[0.05,0.12],core:[-0.5,0.0],nerve:[0.55,-0.05]},
  worm:{hide:[-0.45,0.0],gut:[0.15,0.05],core:[-0.8,0.0],nerve:[0.75,0.0]},
  tentacled:{hide:[0.0,-0.32],gut:[0.0,0.15],core:[-0.3,-0.15],nerve:[0.28,-0.4]},
  medusa:{hide:[0.0,-0.28],gut:[0.0,0.28],core:[-0.3,-0.18],nerve:[0.3,-0.28]},
  anemone:{hide:[0.0,0.18],gut:[0.0,-0.05],core:[-0.18,0.05],nerve:[0.0,-0.32]},
  crinoid:{hide:[0.0,-0.05],gut:[0.22,-0.28],core:[0.0,0.4],nerve:[-0.22,-0.3]},
  sponge:{hide:[0.0,-0.3],gut:[0.0,0.2],core:[-0.32,0.0],nerve:[0.28,-0.28]},
  starfish:{hide:[0.0,-0.42],gut:[0.34,0.22],core:[0.0,0.0],nerve:[-0.34,0.22]},
  // plants
  fern:{leaf:[0.25,-0.05],stem:[0.0,0.45],root:[0.0,0.62]},
  vine:{leaf:[0.35,-0.05],stem:[0.0,0.2],root:[0.0,0.5]},
  bulb:{leaf:[0.0,0.05],stem:[0.22,0.35],root:[0.0,0.55]},
  reed:{leaf:[0.12,-0.2],stem:[0.0,0.4],root:[0.0,0.6]},
  canopy:{leaf:[0.2,-0.3],stem:[0.0,0.25],root:[0.0,0.7]},
  pitcher:{leaf:[0.3,0.1],stem:[0.0,-0.1],root:[0.0,0.7]},
  // fungi
  bracket:{cap:[0.15,-0.35],gills:[0.2,0.0],myc:[-0.3,0.4]},
  coral:{cap:[0.0,-0.4],gills:[0.25,-0.1],myc:[0.0,0.55]},
  puffball:{cap:[0.0,-0.2],gills:[0.0,0.05],myc:[0.0,0.5]},
  mold:{cap:[0.0,0.05],gills:[0.3,0.2],myc:[-0.35,0.3]},
  lichen:{cap:[0.0,-0.15],gills:[0.28,0.1],myc:[-0.25,0.22]},
  // protists
  ciliate:{cortex:[0.0,-0.28],endo:[0.12,0.05],organ:[-0.3,0.18]},
  diatom:{cortex:[0.0,-0.28],endo:[0.1,0.0],organ:[-0.35,0.05]},
  radiolarian:{cortex:[0.0,-0.28],endo:[0.1,0.05],organ:[-0.28,0.15]},
  urchin:{cortex:[0.0,-0.25],endo:[0.08,0.05],organ:[-0.25,0.12]},
  slimemold:{cortex:[0.2,-0.05],endo:[0.0,0.28],organ:[-0.25,0.08]},
};
const COLONY_POS={
  filament:{crown:[0.0,-0.35],matrix:[0.06,0.06],base:[-0.06,0.5]},
  crystal:{crown:[0.0,0.1],matrix:[0.0,0.35],base:[0.0,0.55]},
  vent:{crown:[0.0,-0.4],matrix:[0.0,0.1],base:[0.0,0.55]},
  dome:{crown:[0.0,0.15],matrix:[0.05,0.35],base:[0.0,0.55]},
  strom:{crown:[0.0,-0.1],matrix:[0.0,0.25],base:[0.0,0.55]},
  crust:{crown:[0.0,0.5],matrix:[0.25,0.62],base:[-0.25,0.62]},
};

/* ---------------- SPECIES CATALOGUE (27 across 6 kingdoms) ----------------
   plan  = body-plan renderer (draw.js)  ·  cell = kingdomKey you meet on zoom
   col   = base flesh colour             ·  size = scale multiplier
   form  = per-plan drawing parameters   ·  minXP = rank gate
   Neutralise weakness is derived from the cell kingdom (honest biology).
------------------------------------------------------------ */
XS.SPECIES=[
  // — ANIMALIA (wall-less → hypotonic) —
  {id:'thornback', name:['Thornback','Vorn','Rax'], epi:[' grazer',' lurker',' strider'], kingdom:'Animal', body:'a wall-less animal-grade beast', plan:'beast', cell:'Animalia', col:[255,143,163], size:1.0, form:{legs:4,tail:1}, minXP:0,
    blurb:'A wall-less animal-grade beast — it moves, hunts, and its soft tissues can harbour infections.'},
  {id:'medusa', name:['Drift','Lumen','Vela'], epi:[' medusa',' bell',' float'], kingdom:'Animal', body:'a drifting medusoid animal', plan:'medusa', cell:'Animalia', col:[173,150,255], size:1.05, form:{arms:7}, minXP:0,
    blurb:'A gelatinous medusoid — a pulsing bell trailing stinging tentacles through the water column.'},
  {id:'skitterer', name:['Chityr','Segmo','Karr'], epi:[' skitterer',' scuttler',' marcher'], kingdom:'Animal', body:'a segmented arthropod-grade animal', plan:'arthropod', cell:'Animalia', col:[255,180,120], size:1.0, form:{segs:5,legs:4}, minXP:40,
    blurb:'A segmented, jointed-limbed animal armoured in plates — but its cells still have no wall.'},
  {id:'maw', name:['Tendril','Umbra','Nyx'], epi:[' maw',' grasper',' crown'], kingdom:'Animal', body:'a tentacled cephalopod-grade animal', plan:'tentacled', cell:'Animalia', col:[255,110,170], size:1.0, form:{arms:6}, minXP:60,
    blurb:'A soft-bodied hunter that hauls prey in with a crown of curling tentacles.'},
  {id:'borer', name:['Deep','Anno','Verm'], epi:[' borer',' burrower',' coil'], kingdom:'Animal', body:'a segmented worm-grade animal', plan:'worm', cell:'Animalia', col:[255,150,140], size:1.0, form:{segs:9}, minXP:0,
    blurb:'A segmented burrowing worm — a muscular tube of soft, wall-less tissue.'},

  // — PROTISTA (single-celled eukaryote, wall-less → hypotonic) —
  {id:'ooze', name:['Shifting','Amoebo','Pseudo'], epi:[' ooze',' crawler',' blob'], kingdom:'Protist', body:'a giant amoeboid protist', plan:'amoeba', cell:'Protista', col:[94,242,214], size:0.95, form:{lobes:5}, minXP:60,
    blurb:'A giant single-celled amoeboid — it flows on false feet (pseudopodia) and engulfs its prey whole.'},
  {id:'slipper', name:['Cilio','Slipper','Paramé'], epi:[' drifter',' rower',' sweep'], kingdom:'Protist', body:'a ciliated protist', plan:'ciliate', cell:'Protista', col:[120,235,255], size:1.0, form:{}, minXP:60,
    blurb:'A slipper-shaped single cell clothed in beating cilia that row it along and sweep in food.'},
  {id:'prism', name:['Glass','Silica','Diato'], epi:[' prism',' frustule',' pane'], kingdom:'Protist', body:'a glass-shelled diatom', plan:'diatom', cell:'Protista', col:[150,220,255], size:1.0, form:{shape:'centric'}, minXP:150,
    blurb:'A photosynthetic protist inside a two-part shell of glassy silica, etched with fine pores.'},
  {id:'spinesphere', name:['Radio','Spine','Astra'], epi:[' sphere',' star',' halo'], kingdom:'Protist', body:'a mineral-skeletoned protist', plan:'radiolarian', cell:'Protista', col:[190,200,255], size:1.0, form:{spikes:14}, minXP:150,
    blurb:'A floating protist that grows an intricate mineral skeleton bristling with needle-fine spines.'},

  // — PLANTAE (cellulose wall → hypertonic) —
  {id:'spire', name:['Chloro','Sylvo','Helio'], epi:[' spire',' canopy',' crown'], kingdom:'Plant', body:'a rooted photosynthetic tree-form', plan:'tree', cell:'Plantae', col:[126,255,192], size:1.0, form:{fronds:5}, minXP:0,
    blurb:'A rooted autotroph with rigid cellulose-walled cells — it feeds on light and pumps sap through vascular tissue.'},
  {id:'fern', name:['Frond','Filica','Pinna'], epi:[' rosette',' fan',' plume'], kingdom:'Plant', body:'a frond-rosette plant', plan:'fern', cell:'Plantae', col:[120,240,170], size:1.05, form:{fronds:6}, minXP:0,
    blurb:'A low rosette of arcing fronds unrolling from a central crown — all cellulose-walled.'},
  {id:'vine', name:['Viridi','Creepa','Volu'], epi:[' vine',' tendril',' creeper'], kingdom:'Plant', body:'a sprawling vine-form plant', plan:'vine', cell:'Plantae', col:[150,255,150], size:1.05, form:{}, minXP:40,
    blurb:'A sprawling autotroph that climbs on coiling tendrils, leaves fanning to catch the light.'},
  {id:'succulent', name:['Bulbo','Turgo','Aqua'], epi:[' pod',' bulb',' bloom'], kingdom:'Plant', body:'a water-storing succulent plant', plan:'bulb', cell:'Plantae', col:[130,240,200], size:0.95, form:{lobes:5}, minXP:40,
    blurb:'A swollen, water-hoarding autotroph — its turgid cells bulge against thick cellulose walls.'},
  {id:'reed', name:['Calamo','Stipa','Junco'], epi:[' reed',' rush',' stalk'], kingdom:'Plant', body:'a slender reed-form plant', plan:'reed', cell:'Plantae', col:[160,255,180], size:1.05, form:{blades:5}, minXP:0,
    blurb:'A tall, slim autotroph — blade-leaves rising off a vascular stem stiffened by cellulose.'},

  // — FUNGI (chitin wall → antifungal) —
  {id:'shroud', name:['Myco','Ergo','Veli'], epi:[' shroud',' veil',' cap'], kingdom:'Fungus', body:'a spore-bearing cap fungus', plan:'mushroom', cell:'Fungi', col:[255,196,107], size:1.0, form:{}, minXP:0,
    blurb:'A chitin-walled decomposer — a fruiting cap above a hidden web of feeding threads (mycelium).'},
  {id:'conk', name:['Bracko','Shelfa','Poly'], epi:[' conk',' shelf',' bracket'], kingdom:'Fungus', body:'a shelf-bracket fungus', plan:'bracket', cell:'Fungi', col:[230,170,90], size:1.05, form:{shelves:4}, minXP:40,
    blurb:'A woody bracket fungus that juts from its host in stacked, chitin-walled shelves.'},
  {id:'antler', name:['Clavo','Coralla','Ramo'], epi:[' antler',' branch',' fan'], kingdom:'Fungus', body:'a branching coral fungus', plan:'coral', cell:'Fungi', col:[255,210,150], size:1.0, form:{}, minXP:60,
    blurb:'A coral-like fungus that forks upward into slender antlers, spores dusting from the tips.'},
  {id:'puffball', name:['Sporo','Bovi','Puffa'], epi:[' sphere',' puff',' globe'], kingdom:'Fungus', body:'a puffball fungus', plan:'puffball', cell:'Fungi', col:[240,220,170], size:1.0, form:{}, minXP:0,
    blurb:'A round chitin-walled fungus that ripens into a bag of spores, puffing them out when struck.'},
  {id:'mold', name:['Necro','Mucora','Fila'], epi:[' mold',' bloom',' rot'], kingdom:'Fungus', body:'a spreading mold', plan:'mold', cell:'Fungi', col:[210,255,150], size:1.05, form:{}, minXP:150,
    blurb:'A creeping mold — a low fuzz of hyphae studded with dark fruiting heads on tiny stalks.'},

  // — MONERA / BACTERIA (peptidoglycan wall → antibiotic) —
  {id:'filament', name:['Cyano','Filo','Nostoc'], epi:[' mat',' strand',' braid'], kingdom:'Bacterial colony', body:'a filamentous bacterial colony', plan:'colony', cell:'Monera', col:[125,184,255], size:1.0, form:{style:'filament'}, minXP:0,
    blurb:'A colony of filamentous bacteria — chains of prokaryotic cells, each with a peptidoglycan wall.'},
  {id:'biofilm', name:['Slimo','Muco','Bio'], epi:[' dome',' film',' slick'], kingdom:'Bacterial colony', body:'a bacterial biofilm', plan:'colony', cell:'Monera', col:[110,200,220], size:1.05, form:{style:'dome'}, minXP:60,
    blurb:'A biofilm — bacteria sheltering under a shared slime dome that shrugs off many attacks.'},
  {id:'stromatolite', name:['Strom','Layro','Petra'], epi:[' mound',' reef',' column'], kingdom:'Bacterial colony', body:'a stromatolite-building colony', plan:'colony', cell:'Monera', col:[150,190,230], size:1.05, form:{style:'strom'}, minXP:40,
    blurb:'A layered mound built up over ages by mats of bacteria — the oldest kind of life we know.'},

  // — ARCHAEA (no peptidoglycan; ether-lipid membrane → detergent) —
  {id:'saltcrystal', name:['Halo','Brino','Salis'], epi:[' colony',' crust',' facet'], kingdom:'Archaeal colony', body:'a halophilic archaeal colony', plan:'colony', cell:'Archaea', col:[178,150,255], size:1.0, form:{style:'crystal'}, minXP:280,
    blurb:'A salt-loving archaeal colony crusting a brine flat — looks bacterial, but has NO peptidoglycan.'},
  {id:'ventchimney', name:['Thermo','Pyro','Fumo'], epi:[' chimney',' spire',' vent'], kingdom:'Archaeal colony', body:'a thermophilic archaeal colony', plan:'colony', cell:'Archaea', col:[200,140,220], size:1.05, form:{style:'vent'}, minXP:280,
    blurb:'A heat-loving archaeal colony encrusting a scalding vent — an extremophile from its own domain of life.'},
  {id:'brinecrust', name:['Acido','Sulfo','Cryo'], epi:[' crust',' patch',' bloom'], kingdom:'Archaeal colony', body:'an acidophilic archaeal colony', plan:'colony', cell:'Archaea', col:[160,160,255], size:1.0, form:{style:'crust'}, minXP:280,
    blurb:'An acid-loving archaeal crust — ether-linked membranes let it thrive where nothing else can.'},

  // — PROTIST (extra: colonial flagellate) —
  {id:'flagcolony', name:['Volvo','Eugleno','Phyto'], epi:[' sphere',' colony',' orb'], kingdom:'Protist', body:'a colonial flagellate protist', plan:'radiolarian', cell:'Protista', col:[120,255,200], size:1.0, form:{spikes:0,cells:true}, minXP:150,
    blurb:'A hollow ball of green flagellated protist cells that spin together toward the light.'},

  // — extra distinct body-plans —
  {id:'anemone', name:['Antho','Actino','Coralla'], epi:[' bloom',' crown',' polyp'], kingdom:'Animal', body:'a sessile tentacled animal', plan:'anemone', cell:'Animalia', col:[255,128,180], size:1.0, form:{arms:9}, minXP:40,
    blurb:'A sessile animal anchored to the substrate, a crown of stinging tentacles fishing the current — wall-less cells throughout.'},
  {id:'crinoid', name:['Crino','Pluma','Lili'], epi:[' star',' feather',' lily'], kingdom:'Animal', body:'a stalked feather-star animal', plan:'crinoid', cell:'Animalia', col:[255,170,140], size:1.0, form:{arms:7}, minXP:150,
    blurb:'A filter-feeding animal on a slender stalk, feathery arms fanning the water to trap food.'},
  {id:'seaurchin', name:['Echino','Helio','Astro'], epi:[' burr',' orb',' pincushion'], kingdom:'Protist', body:'a spiny mineral-skeletoned protist', plan:'urchin', cell:'Protista', col:[190,150,255], size:0.95, form:{spikes:16}, minXP:150,
    blurb:'A single-celled protist that props itself on a bristling ball of mineral spines to catch drifting prey.'},
  {id:'canopy', name:['Canopo','Umbra','Palma'], epi:[' parasol',' canopy',' crown'], kingdom:'Plant', body:'a broad-canopy tree-form plant', plan:'canopy', cell:'Plantae', col:[128,232,160], size:1.05, form:{fronds:6}, minXP:40,
    blurb:'A rooted autotroph that spreads a wide umbrella of leaf-blades to soak up a dim red sun.'},

  // — extra distinct body-plans, batch 2 —
  {id:'sponge', name:['Spongi','Poro','Cala'], epi:[' barrel',' vase',' cup'], kingdom:'Animal', body:'a sessile filter-feeding animal', plan:'sponge', cell:'Animalia', col:[255,160,140], size:1.0, form:{}, minXP:60,
    blurb:'A sessile animal that pumps water through a porous body to strain out food — no true tissues, but its cells are wall-less.'},
  {id:'starfish', name:['Astro','Stella','Pento'], epi:[' star',' radial',' fivearm'], kingdom:'Animal', body:'a five-armed radial animal', plan:'starfish', cell:'Animalia', col:[255,138,120], size:1.0, form:{}, minXP:60,
    blurb:'A five-rayed animal that walks on hundreds of tiny water-powered tube feet.'},
  {id:'pitcher', name:['Nepen','Sarra','Utri'], epi:[' pitcher',' trap',' urn'], kingdom:'Plant', body:'a carnivorous pitcher plant', plan:'pitcher', cell:'Plantae', col:[150,220,120], size:1.0, form:{}, minXP:60,
    blurb:'A rooted autotroph that also traps prey — cellulose-walled cells line pitfall pitchers full of digestive fluid.'},
  {id:'slimemold', name:['Physar','Myxo','Plasmo'], epi:[' web',' net',' creep'], kingdom:'Protist', body:'a plasmodial slime mould', plan:'slimemold', cell:'Protista', col:[255,214,120], size:1.0, form:{}, minXP:150,
    blurb:'A single giant multinucleate protist cell that creeps as a living network, solving mazes without a brain.'},
  {id:'lichen', name:['Licha','Crusto','Foli'], epi:[' crust',' rosette',' patch'], kingdom:'Fungus', body:'a lichenised fungus', plan:'lichen', cell:'Fungi', col:[180,220,180], size:1.0, form:{}, minXP:60,
    blurb:'A fungus living in partnership with an alga — a tough, chitin-walled crust that colonises bare rock.'},
];

/* ---------------- neutralise weakness by cell kingdom (real biology) ---------------- */
XS.killAgentsFor=function(cellKey){
  switch(cellKey){
    case 'Monera': return ['antibiotic','lysozyme'];
    case 'Archaea': return ['detergent'];            // no peptidoglycan → antibiotics fail
    case 'Fungi': return ['antifungal'];
    case 'Plantae': case 'PlantTissue': return ['hypertonic'];
    default: return ['hypotonic'];                    // Animalia, Protista (no wall)
  }
};
XS.WEAKNESS_WHY={
  hypotonic:'Its cells have no wall — a hypotonic (low-salt) shock floods them until they swell and burst.',
  hypertonic:'Rigid cellulose walls resist bursting, so a hypertonic (high-salt) shock draws water OUT and collapses them (plasmolysis).',
  antifungal:'Its chitin-walled cells fall to an antifungal that dissolves the fungal wall / membrane.',
  antibiotic:'Its bacterial peptidoglycan wall and 70S ribosomes are exactly what an antibiotic attacks.',
  detergent:'Antibiotics fail — it has no peptidoglycan. But its ether-lipid membrane dissolves in detergent.',
};

/* ---------------- pathogens (PRESERVE) ---------------- */
XS.PATHOGENS={
  virus:    {label:'viral infection', dx:'Virus', cure:'antiviral', particle:'virus',
    tell:'Geometric protein capsids, far smaller than the host cell, packed with foreign nucleic acid.',
    why:'Only an antiviral halts viral replication; antibiotics do nothing to a virus.'},
  bacterium:{label:'bacterial infection', dx:'Bacterium', cure:'antibiotic', particle:'bacterium',
    tell:'Rod-shaped invaders with their own peptidoglycan walls dividing between the host cells.',
    why:'An antibiotic attacks the bacterial wall / 70S ribosome, sparing the host.'},
  fungus:   {label:'fungal infection', dx:'Fungus', cure:'antifungal', particle:'fungus',
    tell:'Branching chitin-walled threads (hyphae) creeping through the tissue.',
    why:'An antifungal disrupts the chitin wall / fungal membrane.'},
  parasite: {label:'parasitic infection', dx:'Parasite', cure:'antiparasitic', particle:'parasite',
    tell:'Motile, nucleated eukaryotic cells burrowing between the host cells.',
    why:'A eukaryotic parasite shrugs off antibiotics; it needs a targeted antiparasitic.'},
  prion:    {label:'prion disease', dx:'Prion', cure:'denaturant', particle:'prion',
    tell:'No cells, no nucleic acid — just angular clumps of MISFOLDED PROTEIN forcing the host’s own proteins to misfold.',
    why:'A prion is not alive — antibiotics and antivirals do nothing. Only a protein DENATURANT can break it down.'},
  toxin_load:{label:'chemical intoxication', dx:'Toxin', cure:'antitoxin', particle:'toxin',
    tell:'No invading organism at all — the cells are dying of an accumulated TOXIN diffusing through the tissue.',
    why:'There is nothing to kill. Only an ANTITOXIN that binds and neutralises the poison will help.'},
};

/* ---------------- treatment palette (dock) ---------------- */
XS.TREATMENTS=[
  {id:'antibiotic', label:'Antibiotic',   desc:'Attacks peptidoglycan walls / 70S ribosomes. Kills bacteria only.'},
  {id:'antifungal', label:'Antifungal',   desc:'Disrupts the chitin wall / fungal membrane. Hits fungi only.'},
  {id:'antiviral',  label:'Antiviral',    desc:'Blocks viral replication. Works only on viruses.'},
  {id:'antiparasitic',label:'Antiparasitic',desc:'Targets eukaryotic parasites; spares the host.'},
  {id:'lysozyme',   label:'Lysozyme',     desc:'An enzyme that cracks peptidoglycan — bursts many bacteria.'},
  {id:'hypotonic',  label:'Osmotic shock',desc:'Floods cells with water. Bursts wall-less cells; walled cells resist.'},
  {id:'hypertonic', label:'Herbicide',    desc:'Draws water out. Plasmolyses walled plant cells.'},
  {id:'detergent',  label:'Detergent',    desc:'Dissolves lipid membranes — enveloped viruses and archaeal ether-membranes.'},
  {id:'denaturant', label:'Protein denaturant',desc:'Unfolds and breaks down misfolded proteins — the only thing that destroys a prion.'},
  {id:'antitoxin',  label:'Antitoxin',    desc:'Binds and neutralises a chemical toxin. Useless against any living pathogen.'},
  {id:'toxin',      label:'Broad cytotoxin',desc:'A blunt poison that harms almost anything — indiscriminate and reckless.'},
];
XS.agentName=function(id){ const t=XS.TREATMENTS.find(x=>x.id===id); return t?t.label:id; };

/* ---------------- ASSAYS (evidence-gathering, real results) ----------------
   Each returns a finding string computed from the actual zoomed cell / pathogen,
   plus a `clue` bucket used to fill the Analysis panel.
------------------------------------------------------------ */
const WALLNAME={cellulose:'cellulose',chitin:'chitin',pepti:'peptidoglycan',slayer:'protein S-layer',none:'none (bare membrane)'};
XS.ASSAYS=[
  {id:'wall', label:'Wall analysis', short:'wall material', group:'host',
    run:(sp)=>{ const w=sp.K.wall; return {clue:'wall', text:'Cell wall: '+(WALLNAME[w]||w)+'.'}; }},
  {id:'nuclear', label:'Nuclear stain', short:'nucleus?', group:'host',
    run:(sp)=>({clue:'nucleus', text: sp.K.nucleus?'A true membrane-bound NUCLEUS is present → a eukaryote.':'No nucleus — DNA lies loose as a nucleoid → a prokaryote.'})},
  {id:'lipid', label:'Membrane-lipid assay', short:'ester / ether', group:'host',
    run:(sp)=>({clue:'lipid', text: sp.kingdomKey==='Archaea'?'Membrane lipids are ETHER-linked → this is an ARCHAEON (not a bacterium).':'Membrane lipids are ester-linked (bacteria & eukaryotes).'})},
  {id:'gram', label:'Gram stain', short:'purple / pink', group:'host',
    run:(sp)=>{ if(sp.kingdomKey==='Monera') return {clue:'gram', text:'Gram '+(sp.gram==='+'?'POSITIVE (purple) — thick peptidoglycan.':'NEGATIVE (pink) — thin peptidoglycan + outer membrane.')};
      if(sp.kingdomKey==='Archaea') return {clue:'gram', text:'Gram stain fails to hold — the wall is NOT peptidoglycan. Suspect an archaeon.'};
      return {clue:'gram', text:'Gram stain is inconclusive — no peptidoglycan wall here (rules out bacteria).'}; }},
  {id:'pigment', label:'Pigment scan', short:'chlorophyll?', group:'host',
    run:(sp)=>({clue:'metabolism', text: (sp.autotroph&&!sp.chemo)?'Photosynthetic pigment (chlorophyll) detected → an autotroph.': sp.chemo?'No chlorophyll, but chemosynthetic machinery → a chemoautotroph.':'No photosynthetic pigment → a heterotroph.'})},
  {id:'motility', label:'Motility assay', short:'how it moves', group:'host',
    run:(sp)=>{ const has=id=>sp.parts.some(p=>p.id===id);
      const m= has('flagellum')?'Swims with a whip-like flagellum.': has('cilia')?'Rows along on beating cilia.': has('pseudopod')?'Crawls on pseudopodia (false feet).':'Non-motile.';
      return {clue:'motility', text:m}; }},
  {id:'extremo', label:'Environment probe', short:'temp / pH', group:'host',
    run:(sp)=>{ const hot=sp.optT>=60, ac=sp.optPH<=3.5, al=sp.optPH>=9.5;
      return {clue:'extremo', text: (hot||ac||al)?('Thrives at '+sp.optT+'°C / pH '+sp.optPH+' — an EXTREMOPHILE (a hallmark of archaea).'):('Comfortable near '+sp.optT+'°C / pH '+sp.optPH+' — a mesophile.')}; }},
  // pathogen assays (PRESERVE key region only) — reveal BOTH invaders on a co-infection
  {id:'morph', label:'Particle morphology', short:'invader shape', group:'path',
    run:(sp,pt,sc)=>{ const f=k=>XS.PATHOGENS[k].tell;
      const text=(sc&&sc.cures&&sc.pathType2)?('TWO invaders here — ① '+f(pt)+'  ② '+f(sc.pathType2)):f(pt);
      return {clue:'pmorph', text}; }},
  {id:'pnucleic', label:'Invader nucleic-acid', short:'DNA / RNA / none', group:'path',
    run:(sp,pt,sc)=>{ const m={virus:'little more than nucleic acid in a shell — no ribosomes of its own',
      bacterium:'carries its own 70S ribosomes and a circular chromosome',
      fungus:'has chitin walls and eukaryotic nuclei',
      parasite:'a nucleated, motile eukaryote',
      prion:'NO nucleic acid whatsoever — pure protein, not an organism',
      toxin_load:'no pathogen nucleic acid at all — no organism here'};
      const f=k=>m[k]||m.parasite;
      const text=(sc&&sc.cures&&sc.pathType2)?('Two invaders: ① '+f(pt)+'; ② '+f(sc.pathType2)+'.'):('The invader '+f(pt)+'.');
      return {clue:'pna', text}; }},
  {id:'penvelope', label:'Invader coat assay', short:'wall / envelope', group:'path',
    run:(sp,pt,sc)=>{ const m={virus:'some particles wear a lipid envelope (soap-sensitive)',
      bacterium:'a peptidoglycan wall — a classic antibiotic target',
      fungus:'a tough chitin wall sheaths every thread',
      parasite:'a flexible pellicle, no wall — a naked eukaryotic membrane',
      prion:'no membrane or wall — only aggregated misfolded protein',
      toxin_load:'nothing to sheath — only diffusing toxin molecules'};
      const f=k=>m[k]||m.parasite;
      const text=(sc&&sc.cures&&sc.pathType2)?('Two coats: ① '+f(pt)+'; ② '+f(sc.pathType2)+'.'):('The invader shows '+f(pt)+'.');
      return {clue:'pcoat', text}; }},
];
XS.assayById=id=>XS.ASSAYS.find(a=>a.id===id);

/* ---------------- procedural morphology ----------------
   Every individual is unique: a species is only a *template*. We roll a fresh
   colour, size, proportions, appendage counts and skin pattern for each one, so
   two of the same body-plan look like different creatures — effectively an
   unlimited bestiary from a finite set of plans. Biology (cell, weakness) is
   never changed by looks.
------------------------------------------------------------ */
function rgb2hsl(c){ let r=c[0]/255,g=c[1]/255,b=c[2]/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;} else { const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    h = mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; h/=6; } return [h,s,l]; }
function hsl2rgb(a){ const H=a[0],S=a[1],L=a[2]; const f=(p,q,t)=>{ if(t<0)t+=1; if(t>1)t-=1;
  if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
  let r,g,b; if(S===0){r=g=b=L;} else { const q=L<0.5?L*(1+S):L+S-L*S, p=2*L-q; r=f(p,q,H+1/3); g=f(p,q,H); b=f(p,q,H-1/3); }
  return [Math.round(r*255),Math.round(g*255),Math.round(b*255)]; }
XS.genMorph=function(base){ const R=Math.random, cl=XS.cl||((v,a,b)=>v<a?a:v>b?b:v);
  const h=rgb2hsl(base.col);
  const col=hsl2rgb([ (h[0]+(R()*0.2-0.1)+1)%1, cl(h[1]*(0.75+R()*0.6),0.25,0.98), cl(h[2]*(0.8+R()*0.45),0.32,0.84) ]);
  const j=(lo,hi)=>Math.round(lo+R()*(hi-lo)), bf=base.form||{};
  const form=Object.assign({}, bf, { legs:j(3,6), arms:j(5,9), segs:j(4,8), lobes:j(4,7),
    spikes:(bf.spikes===0)?0:j(10,20), fronds:j(4,7), blades:j(4,7), shelves:j(3,6), shape:R()<0.5?'centric':'pennate' });
  return { col, size:0.85+R()*0.32, form, pattern:['spots','stripes','bands','none','none'][Math.floor(R()*5)], glow:0.8+R()*0.5, seed:R()*6.28 };
};

/* ---------------- scenario generation ---------------- */
XS.buildScenario=function(objective, tier, forceCell){
  const T=(XS.TIERS&&XS.TIERS[tier])||{margin:1};
  const xp=(XS.progress&&XS.progress.xp)||0;
  const pool = forceCell ? XS.SPECIES.filter(s=>s.cell===forceCell) : XS.SPECIES.filter(s=>xp>=(s.minXP||0));
  const base=pick(pool.length?pool:XS.SPECIES);
  const morph=XS.genMorph(base);
  const A=Object.assign({}, base, {label:base.kingdom, col:morph.col, form:morph.form, size:(base.size||1)*morph.size});
  const planet=pick(XS.PLANETS);
  const tmpl=R_BY_PLAN[base.plan]||R_ANIMAL;
  const pos = base.plan==='colony' ? (COLONY_POS[(base.form&&base.form.style)]||null) : (PLAN_POS[base.plan]||null);
  const regions=tmpl.map(r=>{ const o=pos&&pos[r.id]; return Object.assign({}, r, {
    x:o?o[0]:r.x, y:o?o[1]:r.y,
    cell:r.cell||A.cell, scanned:false, cellSpec:null,
    evidence:[], clues:{}, tests:{}, diagnosed:false, dxWrong:0, assaysSince:0, recon:false }); });
  const key=pick(regions);
  const nm=pick(A.name)+pick(A.epi);
  const sc={ objective, archKey:base.cell, A, morph, planet, name:nm,
    regions, keyId:key.id,
    P:0, host:100, resist:0, cured:false, done:false,
    tier, sway:Math.random()*Math.PI*2 };
  if(objective==='preserve'){
    const ptype=pick(Object.keys(XS.PATHOGENS));
    sc.pathType=ptype; sc.agent=XS.PATHOGENS[ptype].cure; sc.dxAnswer=XS.PATHOGENS[ptype].dx;
    key.problem={kind:'pathogen', pathType:ptype};
    sc.brief=`${nm} is failing — something is spreading inside it. Zoom into its tissues, run assays to identify the invader, then apply the one correct cure before the organism dies.`;
    sc.hostDrain=2.2/(T.margin||1);
  } else {
    sc.agent=XS.killAgentsFor(A.cell)[0]; sc.dxAnswer=XS.KINGDOM_ANSWER[A.cell];
    key.problem={kind:'vital'};
    sc.brief=`${nm} is an invasive threat. Identify what kind of organism it is, find the tissue it can’t defend, and hit it with the one agent its biology can’t withstand.`;
    sc.hostDrain=0;
  }
  sc.assayBudget = (tier==='director')?6:null;   // Director: limited reagents — choose your assays
  rollTraits(sc, tier);
  return sc;
};

/* ---------------- TRAITS / COMPLICATIONS ----------------
   The solution to "running out of content": a small library of biology-driven
   modifiers that recombine with every species × objective, so no two runs play
   the same. Each teaches a real concept and changes how you must play.
------------------------------------------------------------ */
XS.TRAITS=[
  {id:'virulent', label:'Virulent strain', tag:'⏱ fast', when:sc=>sc.objective==='preserve',
    hint:'Aggressive and fast-spreading — the host is failing quicker than usual, so diagnose fast.',
    apply:sc=>{ sc.hostDrain*=1.4; }},
  {id:'resistant', label:'Drug-resistant', tag:'🧬 resistant', when:sc=>true,
    hint:'It carries resistance genes (plasmids) — the correct agent still works, but you must hit it harder.',
    apply:sc=>{ sc.resistantStrain=true; }},
  {id:'biofilm', label:'Biofilm shield', tag:'🛡 shielded', when:sc=>sc.agent!=='detergent',
    hint:'The target cells shelter under a slime biofilm — strip it with DETERGENT first, then apply the real agent.',
    apply:sc=>{ sc.shielded=true; }},
  {id:'symbiont', label:'Mutualistic symbiont', tag:'🤝 symbiont', when:sc=>sc.regions.length>=2,
    hint:'A beneficial symbiont lives in one of its tissues — treating THAT tissue harms the host. Find it and leave it alone.',
    apply:sc=>{ const others=sc.regions.filter(r=>r.id!==sc.keyId && !r.decoy); const s=others[Math.floor(Math.random()*others.length)];
      if(s){ s.symbiont=true; sc.symbiontId=s.id; } }},
  {id:'extremophile', label:'Extreme habitat', tag:'☢ unstable', when:sc=>true,
    hint:'Reagents are unstable in this environment — a wrong move costs more than usual. Be certain before you act.',
    apply:sc=>{ sc.harsh=true; }},
  {id:'coinfection', label:'Co-infection', tag:'✚ mixed', when:sc=>sc.objective==='preserve',
    hint:'TWO different invaders are present — you must apply BOTH matching cures to clear the tissue.',
    apply:sc=>{ const others=Object.keys(XS.PATHOGENS).filter(k=>k!==sc.pathType && XS.PATHOGENS[k].cure!==sc.agent);
      const p2=others[Math.floor(Math.random()*others.length)]; sc.pathType2=p2; sc.cures=[sc.agent, XS.PATHOGENS[p2].cure]; }},
  {id:'decoy', label:'Necrotic decoy', tag:'✖ decoy', when:sc=>sc.regions.length>=2,
    hint:'One tissue is already dead and only LOOKS infected — analyse carefully so you don’t treat the wrong one.',
    apply:sc=>{ const others=sc.regions.filter(r=>r.id!==sc.keyId && !r.symbiont); const d=others[Math.floor(Math.random()*others.length)];
      if(d){ d.decoy=true; sc.decoyId=d.id; } }},
  {id:'mutating', label:'Rapidly mutating', tag:'🧬 mutating', when:sc=>true,
    hint:'It adapts in real time — its adaptation meter climbs on its own, so work fast and don’t waste moves.',
    apply:sc=>{ sc.mutating=true; }},
];
function rollTraits(sc, tier){
  sc.traits=[];
  const budget = tier==='director'?2 : tier==='field'?1 : 0;   // intern: gentle, no complications
  if(budget<=0) return;
  const xp=(XS.progress&&XS.progress.xp)||0; if(xp<40) return;   // ease newcomers in
  let avail=XS.TRAITS.filter(tr=>tr.when(sc));
  const want = tier==='director' ? (Math.random()<0.6?2:1) : (Math.random()<0.55?1:0);
  for(let i=0;i<want && avail.length;i++){ const idx=Math.floor(Math.random()*avail.length), tr=avail[idx]; avail.splice(idx,1);
    tr.apply(sc); sc.traits.push({id:tr.id,label:tr.label,tag:tr.tag,hint:tr.hint}); }
}

/* lazily build the cell you meet in a region */
XS.regionCell=function(sc, region){
  if(region.cellSpec) return region.cellSpec;
  const spec=XS.genSpecimen(region.cell, sc.tier||'field');
  spec.task=null; spec.inspected=new Set();
  region.cellSpec=spec;
  return spec;
};

/* which assays are offered in a region */
XS.zoomAssays=function(sc, region){
  const isKey=region.id===sc.keyId, preserve=sc.objective==='preserve';
  return XS.ASSAYS.filter(a=> a.group==='host' || (a.group==='path' && preserve && isKey));
};

/* run an assay → record evidence */
XS.runAssay=function(sc, region, id){
  const a=XS.assayById(id); if(!a) return null;
  const spec=XS.regionCell(sc,region);
  const first=!region.tests[id];
  if(first && sc.assayBudget!=null && sc.assayBudget<=0)
    return {blocked:true, text:'Out of reagents — no assay charges left. Diagnose from the evidence you have.', label:a.label};
  const out=a.run(spec, sc.pathType, sc);
  region.tests[id]=true; region.clues[out.clue]=out.text;
  if(first){ region.evidence.push(out.text); region.assaysSince++; region.recon=true; if(sc.assayBudget!=null) sc.assayBudget--; }
  return {text:out.text, first, label:a.label};
};

/* the classification / diagnosis options for the key threat */
XS.identifyOptions=function(sc){
  return sc.objective==='preserve'
    ? {kind:'pathogen', prompt:'What is the cause?', options:['Virus','Bacterium','Fungus','Parasite','Prion','Toxin']}
    : {kind:'class',    prompt:'What kind of organism is this?', options:XS.CLASSIFY.slice()};
};

/* submit a diagnosis for the current region */
XS.submitDiagnosis=function(sc, region, choice){
  if(sc.done) return null;
  // on a co-infection, naming EITHER invader is a valid diagnosis
  const correct = choice===sc.dxAnswer || (sc.cures && sc.pathType2 && choice===XS.PATHOGENS[sc.pathType2].dx);
  const T=XS.TIERS[sc.tier]||XS.TIERS.field;
  if(correct){ region.diagnosed=true; sc.diagnosed=true;
    return {ok:true, msg:'Diagnosis confirmed: '+choice+'. Treatment options unlocked.'};
  }
  region.dxWrong++; region.assaysSince=0;
  sc.resist=Math.min(100, sc.resist + Math.round(10/(T.margin||1)) + 6);
  return {ok:false, msg:'“'+choice+'” doesn’t fit the evidence. Gather more before trying again.'};
};

/* has the player earned the right to treat? (diagnosis is scenario-wide) */
XS.canTreat=function(sc, region){
  if(sc.tier==='intern') return true;   // intern: treat freely, with guidance
  return !!sc.diagnosed;
};

/* the treatments offered (full palette, stable order) */
XS.treatmentOptions=function(sc){ return XS.TREATMENTS.map(t=>t.id); };

/* apply a treatment to a region → {ok, msg, sev} */
XS.applyTreatment=function(sc, regionId, agent){
  if(sc.done) return null;
  const region=sc.regions.find(r=>r.id===regionId);
  const T=XS.TIERS[sc.tier]||XS.TIERS.field, margin=T.margin||1;
  const correctRegion = regionId===sc.keyId;
  let correctAgent;
  if(sc.objective==='preserve') correctAgent = sc.cures ? sc.cures.includes(agent) : agent===sc.agent;
  else correctAgent = XS.killAgentsFor(region.cell).includes(agent);

  // TRAIT · symbiont — treating the protected tissue is a serious mistake
  if(region && region.symbiont){
    const pen=Math.round(24/margin); sc.resist=Math.min(100,sc.resist+pen);
    if(sc.objective==='preserve') sc.host=Math.max(0,sc.host-Math.round(20/margin));
    return {ok:false, sev:pen, msg:'You harmed the mutualistic symbiont living here — never treat this tissue.'};
  }
  // TRAIT · biofilm — strip the shield with detergent before anything lands
  if(sc.shielded && correctRegion){
    if(agent==='detergent'){ sc.shielded=false; return {ok:true, sev:0, strip:true, msg:'Biofilm dissolved — the cells are exposed. Now apply the real agent.'}; }
    const pen=Math.round(9/margin); sc.resist=Math.min(100,sc.resist+pen);
    return {ok:false, sev:pen, msg:'A biofilm shields these cells — strip it with detergent first.'};
  }

  if(correctRegion && correctAgent){
    if(sc.cures){                                        // TRAIT · co-infection — every invader needs its own cure
      sc.curesApplied=sc.curesApplied||{}; const already=sc.curesApplied[agent]; sc.curesApplied[agent]=true;
      const done=sc.cures.filter(c=>sc.curesApplied[c]).length;
      sc.P=Math.round(done/sc.cures.length*100);
      if(sc.P>=100) sc.cured=true;
      const msg = sc.P>=100 ? 'Both invaders cleared — the tissue is recovering.'
        : already ? 'That invader is already handled — the OTHER one needs a DIFFERENT cure (check the morphology assay).'
        : 'One invader cleared — a second invader remains. Apply ITS cure too.';
      return {ok:true, sev:0, msg};
    }
    let gain = sc.objective==='preserve'?26:100;
    if(sc.resistantStrain) gain = sc.objective==='preserve'?18:50;   // resistant strain needs extra hits
    sc.P=Math.min(100, sc.P+gain);
    if(sc.objective==='preserve' && sc.P>=100) sc.cured=true;
    const clinging = sc.resistantStrain && sc.P<100;
    return {ok:true, sev:0, msg: clinging?'It’s working, but this resistant strain is clinging on — hit it again.'
      : (sc.objective==='preserve'?'Correct cure — the tissue is responding.':'Direct hit on the vulnerable tissue.')};
  }
  // wrong — punish, harder on higher tiers, for reckless moves and in harsh habitats
  const base = !correctRegion?14:22;                 // wrong agent on the right tissue is the worst mistake
  const recklessness = !sc.diagnosed?1.5:1;
  const toxinPenalty = agent==='toxin'? (sc.objective==='preserve'?40:0):0;
  let pen=(base*recklessness + toxinPenalty); if(sc.harsh) pen*=1.25;
  pen=Math.round(pen/margin);
  sc.resist=Math.min(100, sc.resist + pen);
  if(sc.objective==='preserve') sc.host=Math.max(0, sc.host - Math.round(pen*0.6));
  const msg = !correctRegion ? 'Wrong tissue — the cause isn’t here.'
    : agent==='toxin' ? 'Reckless — a broad poison is savaging the host.'
    : 'Wrong agent — the biology shrugs it off. Match the treatment to the evidence.';
  return {ok:false, sev:pen, msg};
};

/* per-frame macro tick */
XS.worldTick=function(sc, dt){
  if(sc.done) return null;
  // the clock only runs once the player actually starts investigating a tissue
  if(sc.started && sc.mutating){ const m=(XS.TIERS[sc.tier]||{}).margin||1; sc.resist=Math.min(100, sc.resist + 0.8*dt/m); }
  if(sc.objective==='preserve'){
    if(sc.cured) sc.host=Math.min(100, sc.host + 18*dt);
    else if(sc.started) sc.host=Math.max(0, sc.host - sc.hostDrain*(1-sc.P/100)*dt);
    if(sc.cured && sc.host>=90){ sc.done=true; return {win:true}; }
    if(sc.host<=0){ sc.done=true; return {win:false, why:'The organism succumbed before you cured it.'}; }
    if(sc.resist>=100){ sc.done=true; return {win:false, why:'Repeated wrong calls overwhelmed the host.'}; }
  } else {
    if(sc.P>=100){ sc.done=true; return {win:true}; }
    if(sc.resist>=100){ sc.done=true; return {win:false, why:'The organism adapted to your mistakes and escaped containment.'}; }
  }
  return null;
};

XS.OBJECTIVE_INFO={
  preserve:{label:'PRESERVE', tone:'good', verb:'Preserve', winT:'ORGANISM SAVED',
    goal:'Diagnose the affliction from the evidence and cure the right tissue — keep it alive.'},
  neutralize:{label:'NEUTRALIZE', tone:'bad', verb:'Neutralize', winT:'ORGANISM NEUTRALIZED',
    goal:'Identify the organism, find the tissue it can’t defend, and hit its one true weakness.'},
};

})(window.XS);
