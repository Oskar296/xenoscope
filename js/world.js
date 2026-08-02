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
/* ---- XENO anatomies: alien organisms don't have Earth tissues ---- */
const R_CRYSTAL=[
  {id:'apex',   name:'Growth apex',     tissue:'accreting crystal face', x:0.01, y:-0.46},
  {id:'lattice',name:'Lattice body',    tissue:'silicate framework',     x:-0.14,y:0.06},
  {id:'base',   name:'Anchor foot',     tissue:'mineral substrate bond', x:0.06, y:0.50},
];
const R_PLASMA=[
  {id:'core',   name:'Plasma core',     tissue:'ionised core',           x:0.0,  y:-0.06},
  {id:'loops',  name:'Confinement loops',tissue:'magnetic field lines',  x:0.34, y:-0.34},
  {id:'halo',   name:'Discharge halo',  tissue:'outer discharge shell',  x:-0.34,y:0.30},
];
const R_CRYO=[
  {id:'bell',   name:'Rimed envelope',  tissue:'frost-sheathed membrane',x:0.0,  y:-0.40},
  {id:'vac',    name:'Ammonia reservoir',tissue:'solvent vacuole',       x:0.06, y:0.10},
  {id:'fringe', name:'Spicule fringe',  tissue:'frost spicules',         x:-0.30,y:0.34},
];
const R_METAL=[
  {id:'crust',  name:'Oxide crust',     tissue:'metal-oxide armour',     x:0.0,  y:-0.30},
  {id:'vent',   name:'Redox vents',     tissue:'ion-respiring pores',    x:0.24, y:0.14},
  {id:'seam',   name:'Mineral seam',    tissue:'metal-depositing seam',  x:-0.26,y:0.42},
];
const R_BY_PLAN={
  beast:R_ANIMAL, medusa:R_ANIMAL, arthropod:R_ANIMAL, tentacled:R_ANIMAL, worm:R_ANIMAL,
  anemone:R_ANIMAL, crinoid:R_ANIMAL, sponge:R_ANIMAL, starfish:R_ANIMAL, combjelly:R_ANIMAL, winged:R_ANIMAL, snail:R_ANIMAL,
  tree:R_PLANT, fern:R_PLANT, vine:R_PLANT, bulb:R_PLANT, reed:R_PLANT, canopy:R_PLANT, pitcher:R_PLANT, cactus:R_PLANT,
  mushroom:R_FUNGI, bracket:R_FUNGI, coral:R_FUNGI, puffball:R_FUNGI, mold:R_FUNGI, lichen:R_FUNGI,
  amoeba:R_PROTIST, ciliate:R_PROTIST, diatom:R_PROTIST, radiolarian:R_PROTIST, urchin:R_PROTIST, slimemold:R_PROTIST, dino:R_PROTIST, foram:R_PROTIST,
  colony:R_MICROBE,
  crystalspire:R_CRYSTAL, geodecluster:R_CRYSTAL, plasmawisp:R_PLASMA,
  cryodrifter:R_CRYO, rustbloom:R_METAL, ferrovein:R_METAL,
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
  combjelly:{hide:[0.0,-0.1],gut:[0.0,0.28],core:[-0.25,-0.05],nerve:[0.25,-0.2]},
  winged:{hide:[0.0,-0.12],gut:[0.0,0.18],core:[-0.4,-0.1],nerve:[0.4,-0.1]},
  snail:{hide:[-0.06,-0.05],gut:[0.2,0.42],core:[-0.22,-0.05],nerve:[0.5,0.28]},
  cactus:{leaf:[0.3,-0.05],stem:[0.0,0.35],root:[0.0,0.7]},
  dino:{cortex:[0.0,-0.3],endo:[0.0,0.0],organ:[-0.22,0.15]},
  foram:{cortex:[0.1,-0.15],endo:[0.0,0.05],organ:[-0.2,0.1]},
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

  // — extra distinct body-plans, batch 3 —
  {id:'combjelly', name:['Cteno','Beroe','Lumi'], epi:[' comb',' drift',' glow'], kingdom:'Animal', body:'a comb-jelly animal', plan:'combjelly', cell:'Animalia', col:[150,220,255], size:1.0, form:{}, minXP:40,
    blurb:'A translucent drifting animal that swims on eight iridescent rows of fused cilia (comb rows).'},
  {id:'winged', name:['Ptero','Alato','Vola'], epi:[' flyer',' wing',' moth'], kingdom:'Animal', body:'a winged flying animal', plan:'winged', cell:'Animalia', col:[255,170,120], size:1.0, form:{}, minXP:60,
    blurb:'A winged animal that beats membranous wings to fly — soft, wall-less tissue throughout.'},
  {id:'snail', name:['Gastro','Helico','Coch'], epi:[' shell',' spiral',' crawler'], kingdom:'Animal', body:'a shelled gastropod animal', plan:'snail', cell:'Animalia', col:[255,190,150], size:1.0, form:{}, minXP:60,
    blurb:'A soft-bodied animal that hauls a coiled mineral shell and glides on a muscular foot.'},
  {id:'cactus', name:['Cacto','Ferox','Sereus'], epi:[' column',' spire',' succulent'], kingdom:'Plant', body:'a ribbed succulent plant', plan:'cactus', cell:'Plantae', col:[120,220,150], size:1.0, form:{}, minXP:60,
    blurb:'A drought-proof autotroph — a ribbed, spine-armoured column of water-storing cellulose-walled cells.'},
  {id:'dino', name:['Dino','Perido','Ceratia'], epi:[' whirl',' plate',' spinner'], kingdom:'Protist', body:'an armoured dinoflagellate protist', plan:'dino', cell:'Protista', col:[200,180,120], size:0.95, form:{}, minXP:150,
    blurb:'A single-celled protist in cellulose armour plates, spun through the water by two flagella.'},
  {id:'foram', name:['Fora','Globi','Nummu'], epi:[' chamber',' coil',' test'], kingdom:'Protist', body:'a chambered foraminiferan protist', plan:'foram', cell:'Protista', col:[230,215,180], size:1.0, form:{}, minXP:150,
    blurb:'A single-celled protist that builds a many-chambered mineral shell and feeds through a net of fine threads.'},

  /* ---- XENO SPECIES — first-contact organisms with no Earth ancestry ---- */
  {id:'crystalspire', alien:true, name:['Crysta','Silico','Quartzo'], epi:[' spire',' prism',' geode'], kingdom:'Silicoid', body:'a self-assembling silicate crystal organism', plan:'crystalspire', cell:'Silicoid', col:[159,240,234], size:1.1, form:{}, minXP:0,
    blurb:'A tower of interlocking silicon–oxygen prisms that grows by laying down dissolved mineral. It never divides, never eats, and has no genome — yet it repairs damage and reproduces by fracture.'},
  {id:'geodeling', alien:true, name:['Litho','Druse','Vitrea'], epi:[' nodule',' druse',' cluster'], kingdom:'Silicoid', body:'a nodular silicate accretion colony', plan:'geodecluster', cell:'Silicoid', col:[186,246,240], size:1.0, form:{}, minXP:80,
    blurb:'A hollow mineral nodule lined with inward-facing crystal teeth, thickening ring by ring like a stalactite.'},
  {id:'plasmawisp', alien:true, name:['Aurora','Ioni','Corona'], epi:[' wisp',' veil',' flare'], kingdom:'Plasmoid', body:'a magnetically bound plasma organism', plan:'plasmawisp', cell:'Plasmoid', col:[255,154,213], size:1.15, form:{}, minXP:0,
    blurb:'A living knot of ionised gas that holds its own shape with self-generated magnetic loops. There is no matter to poison here — only a field to collapse.'},
  {id:'cryodrifter', alien:true, name:['Cryo','Glacio','Boreal'], epi:[' drifter',' bloom',' frond'], kingdom:'Ammonoid', body:'an ammonia-solvent cryophile', plan:'cryodrifter', cell:'Ammonoid', col:[169,221,255], size:1.05, form:{}, minXP:0,
    blurb:'A genuine cell — nucleus, membrane, ribosomes — but built around liquid ammonia at −40 °C. Familiar architecture, alien solvent.'},
  {id:'rustbloom', alien:true, name:['Ferro','Oxido','Mangano'], epi:[' bloom',' crust',' vein'], kingdom:'Metallophyte', body:'a metal-respiring lithotroph', plan:'rustbloom', cell:'Metallophyte', col:[185,163,122], size:1.0, form:{}, minXP:0,
    blurb:'A rock-eater that oxidises dissolved iron for energy and armours itself in the rust it excretes. It needs neither sunlight nor prey.'},
  {id:'ferrovein', alien:true, name:['Cupro','Magneto','Siderite'], epi:[' vein',' seam',' lattice'], kingdom:'Metallophyte', body:'a branching metallic vein colony', plan:'ferrovein', cell:'Metallophyte', col:[205,180,130], size:1.05, form:{}, minXP:80,
    blurb:'A branching metallic seam that creeps through rock along redox gradients, plating every surface it crosses in oxide.'},
];

/* ---------------- neutralise weakness by cell kingdom (real biology) ---------------- */
XS.killAgentsFor=function(cellKey){
  switch(cellKey){
    case 'Monera': return ['antibiotic','lysozyme'];
    case 'Archaea': return ['detergent'];            // no peptidoglycan → antibiotics fail
    case 'Fungi': return ['antifungal'];
    case 'Plantae': case 'PlantTissue': return ['hypertonic'];
    // — xeno kingdoms: no Earth weakness applies —
    case 'Silicoid': return ['fluoride'];             // silicon–oxygen lattice, no carbon to attack
    case 'Plasmoid': return ['quench'];               // no chemistry at all — collapse the magnetic field
    case 'Ammonoid': return ['solvent_shock'];        // water is the poison here
    case 'Metallophyte': return ['chelation'];        // strip the metal ions it respires
    default: return ['hypotonic'];                    // Animalia, Protista (no wall)
  }
};
XS.WEAKNESS_WHY={
  fluoride:'It has no carbon chemistry to poison and no membrane to breach — it is a silicon–oxygen crystal. Only fluoride attacks Si–O bonds directly (the same reaction that etches glass).',
  quench:'There is nothing to poison — no wall, no membrane, no molecules. It is plasma held together by its own magnetic field, so you strip its energy out and the field collapses.',
  chelation:'Its metal-oxide armour ignores every wall-targeting agent, and it respires metal ions rather than food or light. A chelator locks those ions away and dissolves the crust with them.',
  solvent_shock:'Its solvent is liquid ammonia, not water. Warm water — harmless to everything we know — is a violently reactive reagent to ammonia biochemistry.',
  hypotonic:'Its cells have no wall — a hypotonic (low-salt) shock floods them until they swell and burst.',
  hypertonic:'Rigid cellulose walls resist bursting, so a hypertonic (high-salt) shock draws water OUT and collapses them (plasmolysis).',
  antifungal:'Its cells fall to an antifungal — a drug aimed at targets only fungi have, like the ergosterol in their membrane or the chitin in their wall.',
  antibiotic:'Its bacterial peptidoglycan wall and 70S ribosomes are exactly what an antibiotic attacks.',
  detergent:'Antibiotics fail — an archaeon has no peptidoglycan wall to attack. With no wall to target, you go after its membrane instead: a detergent breaks open the lipid bilayer.',
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
    why:'An antifungal hits fungus-only targets — the ergosterol membrane or the chitin wall.'},
  parasite: {label:'parasitic infection', dx:'Parasite', cure:'antiparasitic', particle:'parasite',
    tell:'Motile, nucleated eukaryotic cells burrowing between the host cells.',
    why:'A eukaryotic parasite shrugs off antibiotics; it needs a targeted antiparasitic.'},
  prion:    {label:'prion disease', dx:'Prion', cure:'denaturant', particle:'prion',
    tell:'No cells, no nucleic acid — just angular clumps of MISFOLDED PROTEIN forcing the host’s own proteins to misfold.',
    why:'A prion is not alive — antibiotics and antivirals do nothing. Only a protein DENATURANT can break it down.'},
  toxin_load:{label:'chemical intoxication', dx:'Toxin', cure:'antitoxin', particle:'toxin',
    tell:'No invading organism at all — the cells are dying of an accumulated TOXIN diffusing through the tissue.',
    why:'There is nothing to kill. Only an ANTITOXIN that binds and neutralises the poison will help.'},

  /* ---- XENO (alien) afflictions — biology that breaks Earth's rules ----
     Each one invalidates an assumption every Earth cure is built on, so the
     whole normal shelf fails and you need chemistry aimed at the new rule. */
  silicate:{alien:true, label:'silicate lattice bloom', dx:'Silicate lattice', cure:'fluoride', particle:'silicate',
    tell:'Angular, glassy crystals growing THROUGH the tissue. The wall assay reads silicon–oxygen, not carbon; there is no membrane and no nucleic acid anywhere.',
    why:'Its body is a silicon lattice, not carbon chemistry — every Earth drug is shaped to attack carbon-based life and simply slides off. Only FLUORIDE breaks Si–O bonds (it is what etches glass).'},
  chiral:{alien:true, label:'mirror-life infection', dx:'Mirror-life', cure:'enantiomer', particle:'chiral',
    tell:'Cells that look utterly ordinary — until the polarimeter shows every sugar and amino acid is the MIRROR IMAGE of ours (D-amino acids, L-sugars).',
    why:'A drug is a shaped key. Mirror-life has mirror-image locks, so our cures physically cannot bind — they are the wrong hand. Only the ENANTIOMER, the mirrored drug, fits.'},
  radiotroph:{alien:true, label:'radiotrophic bloom', dx:'Radiotroph', cure:'shielding', particle:'radiotroph',
    tell:'Densely melanised cells that GROW FASTER the more you irradiate them. Heat and chemical agents barely dent them.',
    why:'It eats ionising radiation. Poisons and heat are just more energy — they feed it. You cannot kill it, you must STARVE it: neutron-absorbing shielding cuts off its food.'},
  ammono:{alien:true, label:'ammonia-solvent cell', dx:'Ammono-life', cure:'solvent_shock', particle:'ammono',
    tell:'Cells thriving at −40 °C whose internal solvent is liquid AMMONIA, not water. The environment probe reads far below anything Earth life tolerates.',
    why:'Water is not neutral to it — it is a violently reactive solvent that tears ammonia-based biochemistry apart. Our universal solvent is its poison.'},
};
XS.isAlienPath=k=>!!(XS.PATHOGENS[k]&&XS.PATHOGENS[k].alien);
XS.EARTH_PATHS=()=>Object.keys(XS.PATHOGENS).filter(k=>!XS.PATHOGENS[k].alien);
XS.ALIEN_PATHS =()=>Object.keys(XS.PATHOGENS).filter(k=> XS.PATHOGENS[k].alien);

/* ---------------- treatment palette (dock) ---------------- */
XS.TREATMENTS=[
  {id:'antibiotic', label:'Antibiotic',   desc:'Attacks peptidoglycan walls / 70S ribosomes. Kills bacteria only.'},
  {id:'antifungal', label:'Antifungal',   desc:'Hits fungus-only targets — the ergosterol membrane or the chitin/glucan wall. Fungi only.'},
  {id:'antiviral',  label:'Antiviral',    desc:'Blocks viral replication. Works only on viruses.'},
  {id:'antiparasitic',label:'Antiparasitic',desc:'Targets eukaryotic parasites; spares the host.'},
  {id:'lysozyme',   label:'Lysozyme',     desc:'An enzyme that cracks peptidoglycan — bursts many bacteria.'},
  {id:'hypotonic',  label:'Osmotic shock',desc:'Floods cells with water. Bursts wall-less cells; walled cells resist.'},
  {id:'hypertonic', label:'Herbicide',    desc:'Draws water out. Plasmolyses walled plant cells.'},
  {id:'detergent',  label:'Detergent',    desc:'Dissolves any lipid membrane or viral envelope — the way to hit an archaeon, which has no peptidoglycan for an antibiotic to attack.'},
  {id:'denaturant', label:'Protein denaturant',desc:'Unfolds and breaks down misfolded proteins — the only thing that destroys a prion.'},
  {id:'antitoxin',  label:'Antitoxin',    desc:'Binds and neutralises a chemical toxin. Useless against any living pathogen.'},
  {id:'toxin',      label:'Broad cytotoxin',desc:'A blunt poison that harms almost anything — indiscriminate and reckless.'},
  // — xeno agents: for biology Earth chemistry can't touch —
  {id:'fluoride',   label:'Fluoride flux', desc:'Breaks silicon–oxygen bonds. The only thing that dissolves a silicate lattice.'},
  {id:'enantiomer', label:'Mirror-image drug',desc:'The enantiomer — a drug rebuilt as its own mirror image, so it fits mirror-life’s reversed chemistry.'},
  {id:'shielding',  label:'Neutron shield', desc:'Boron shielding that starves a radiotroph of the radiation it feeds on.'},
  {id:'solvent_shock',label:'Aqueous shock',desc:'Warm water — harmless to us, a violently reactive solvent to ammonia-based life.'},
  {id:'quench',     label:'Cryogenic quench',desc:'Strips the energy out of a plasma so its confining magnetic field collapses. Nothing chemical to attack — you switch it off.'},
  {id:'chelation',  label:'Chelating agent',desc:'Locks up the metal ions a rock-eater respires, and strips the metal-oxide crust it hides behind.'},
];
XS.agentName=function(id){ const t=XS.TREATMENTS.find(x=>x.id===id); return t?t.label:id; };

/* ---------------- ASSAYS (evidence-gathering, real results) ----------------
   Each returns a finding string computed from the actual zoomed cell / pathogen,
   plus a `clue` bucket used to fill the Analysis panel.
------------------------------------------------------------ */
const WALLNAME={cellulose:'cellulose',chitin:'chitin',pepti:'peptidoglycan',slayer:'protein S-layer',none:'none (bare membrane)',
  silica:'a SILICON–OXYGEN lattice — mineral, not organic',metal:'a precipitated METAL-OXIDE crust'};
XS.ASSAYS=[
  {id:'wall', label:'Wall analysis', short:'wall material', group:'host',
    run:(sp)=>{ const w=sp.K.wall;
      if(sp.kingdomKey==='Plasmoid') return {clue:'wall', text:'No wall AND no membrane — the boundary is a magnetic field, not matter.'};
      return {clue:'wall', text:'Cell wall: '+(WALLNAME[w]||w)+'.'}; }},
  {id:'nuclear', label:'Nuclear stain', short:'nucleus?', group:'host',
    run:(sp)=>{ if(sp.kingdomKey==='Silicoid') return {clue:'nucleus', text:'The stain finds NO nucleic acid of any kind — there is no genome here to stain.'};
      if(sp.kingdomKey==='Plasmoid') return {clue:'nucleus', text:'Nothing to stain — no nucleus, no DNA, no molecules at all. This is ionised gas.'};
      return {clue:'nucleus', text: sp.K.nucleus?'A true membrane-bound NUCLEUS is present → a eukaryote.':'No nucleus — DNA lies loose as a nucleoid → a prokaryote.'}; }},
  {id:'lipid', label:'Membrane-lipid assay', short:'ester / ether', group:'host',
    run:(sp)=>{ if(sp.kingdomKey==='Silicoid') return {clue:'lipid', text:'No lipids whatsoever — no membrane exists to sample.'};
      if(sp.kingdomKey==='Plasmoid') return {clue:'lipid', text:'No lipids — nothing here is made of molecules.'};
      if(sp.kingdomKey==='Ammonoid') return {clue:'lipid', text:'Lipids present, but they stay FLUID far below freezing — this membrane is tuned for a solvent that is not water.'};
      return {clue:'lipid', text: sp.kingdomKey==='Archaea'?'Membrane lipids are ETHER-linked → this is an ARCHAEON (not a bacterium).':'Membrane lipids are ester-linked (bacteria & eukaryotes).'}; }},
  {id:'gram', label:'Gram stain', short:'purple / pink', group:'host',
    run:(sp)=>{ if(sp.kingdomKey==='Monera') return {clue:'gram', text:'Gram '+(sp.gram==='+'?'POSITIVE (purple) — thick peptidoglycan.':'NEGATIVE (pink) — thin peptidoglycan + outer membrane.')};
      if(sp.kingdomKey==='Archaea') return {clue:'gram', text:'Gram stain fails to hold — the wall is NOT peptidoglycan. Suspect an archaeon.'};
      return {clue:'gram', text:'Gram stain is inconclusive — no peptidoglycan wall here (rules out bacteria).'}; }},
  {id:'pigment', label:'Pigment scan', short:'chlorophyll?', group:'host',
    run:(sp)=>{ if(sp.kingdomKey==='Metallophyte') return {clue:'metabolism', text:'No chlorophyll — but dissolved IRON and MANGANESE are being oxidised for energy. It respires rock.'};
      if(sp.kingdomKey==='Plasmoid') return {clue:'metabolism', text:'No pigment — it draws energy straight from the ambient magnetic field.'};
      if(sp.kingdomKey==='Silicoid') return {clue:'metabolism', text:'No pigment and no food intake — it grows by mineral ACCRETION, like a stalactite.'};
      return {clue:'metabolism', text: (sp.autotroph&&!sp.chemo)?'Photosynthetic pigment (chlorophyll) detected → an autotroph.': sp.chemo?'No chlorophyll, but chemosynthetic machinery → a chemoautotroph.':'No photosynthetic pigment → a heterotroph.'}; }},
  {id:'motility', label:'Motility assay', short:'how it moves', group:'host',
    run:(sp)=>{ const has=id=>sp.parts.some(p=>p.id===id);
      const m= has('flagellum')?'Swims with a whip-like flagellum.': has('cilia')?'Rows along on beating cilia.': has('pseudopod')?'Crawls on pseudopodia (false feet).':'Non-motile.';
      return {clue:'motility', text:m}; }},
  {id:'extremo', label:'Environment probe', short:'temp / pH', group:'host',
    run:(sp)=>{ if(sp.kingdomKey==='Ammonoid') return {clue:'extremo', text:'Optimum −40°C — it is ACTIVE far below the freezing point of water. Its solvent cannot be water.'};
      if(sp.kingdomKey==='Plasmoid') return {clue:'extremo', text:'Reads thousands of degrees — but that is the plasma’s ion temperature, not a habitat. Cold is what threatens it.'};
      const hot=sp.optT>=60, ac=sp.optPH<=3.5, al=sp.optPH>=9.5;
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
      toxin_load:'no pathogen nucleic acid at all — no organism here',
      silicate:'NO nucleic acid and no carbon at all — the signal is silicon and oxygen',
      chiral:'nucleic acid built from MIRRORED sugars — the helix twists the wrong way',
      radiotroph:'ordinary nucleic acid, but packed in melanin that converts radiation into growth',
      ammono:'nucleic-acid-like polymers dissolved in AMMONIA, not water'};
      const f=k=>m[k]||m.parasite;
      const text=(sc&&sc.cures&&sc.pathType2)?('Two invaders: ① '+f(pt)+'; ② '+f(sc.pathType2)+'.'):('The invader '+f(pt)+'.');
      return {clue:'pna', text}; }},
  {id:'penvelope', label:'Invader coat assay', short:'wall / envelope', group:'path',
    run:(sp,pt,sc)=>{ const m={virus:'some particles wear a lipid envelope (soap-sensitive)',
      bacterium:'a peptidoglycan wall — a classic antibiotic target',
      fungus:'a tough chitin wall sheaths every thread',
      parasite:'a flexible pellicle, no wall — a naked eukaryotic membrane',
      prion:'no membrane or wall — only aggregated misfolded protein',
      toxin_load:'nothing to sheath — only diffusing toxin molecules',
      silicate:'a rigid glassy shell of silica — not a membrane at all',
      chiral:'an ordinary-looking membrane built from MIRRORED lipids',
      radiotroph:'a thick melanin coat that harvests radiation instead of blocking it',
      ammono:'a membrane that stays fluid in liquid ammonia and would freeze solid in water'};
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

/* ---------------- ULTRA MODE · named real-world intruders ----------------
   A roster of famous real pathogens. Each maps onto one of the six affliction
   KINDS (so the existing assays / visuals / win-logic all still apply), names
   its real front-line drug, and points at the exact in-game recipe that
   represents it — synthesising that precise recipe is the "textbook drug of
   choice" and earns a bonus. Everything here is real medicine. */
XS.INTRUDERS=[
  // — viruses (cure class: antiviral · nucleoside analogue) —
  {id:'sarscov2', name:'SARS-CoV-2', aka:'COVID-19', kind:'virus', drug:'Remdesivir — a nucleoside analogue',
   recipe:{items:['nucleoside'],step:'boil'},
   dossier:'An enveloped RNA virus crowned with spike proteins, spread in respiratory droplets. Front-line drug: <b>remdesivir</b>, a nucleoside analogue that stalls its RNA copying.'},
  {id:'influenza', name:'Influenza', aka:'the flu', kind:'virus', drug:'an antiviral (oseltamivir / Tamiflu)',
   recipe:{items:['nucleoside'],step:'boil'},
   dossier:'A fast-mutating RNA virus that reshapes its coat every season. Treated with an antiviral such as <b>oseltamivir</b> (Tamiflu), first made from star-anise.'},
  {id:'hiv', name:'HIV', aka:'human immunodeficiency virus', kind:'virus', drug:'AZT — a nucleoside reverse-transcriptase inhibitor',
   recipe:{items:['nucleoside'],step:'boil'},
   dossier:'A retrovirus that writes its RNA into the host genome. Held in check by antiretrovirals — <b>AZT</b> is a nucleoside analogue that jams that copying.'},
  {id:'herpes', name:'Herpes simplex', aka:'HSV', kind:'virus', drug:'Acyclovir — a nucleoside analogue',
   recipe:{items:['nucleoside'],step:'boil'},
   dossier:'A DNA virus that hides in nerves and flares up. <b>Acyclovir</b>, a nucleoside analogue, shuts down its replication.'},
  // — bacteria (cure class: antibiotic) —
  {id:'tb', name:'Tuberculosis', aka:'Mycobacterium tuberculosis', kind:'bacterium', drug:'Rifampicin — a soil-actinomycete antibiotic',
   recipe:{items:['soil_microbe','broth'],step:'ferment'},
   dossier:'A slow, waxy-walled lung bacterium. Cured over months with <b>rifampicin</b> — an antibiotic fermented from a soil actinomycete.'},
  {id:'strep', name:'Strep throat', aka:'Streptococcus', kind:'bacterium', drug:'Penicillin — from Penicillium mould',
   recipe:{items:['pen_mould','broth'],step:'ferment'},
   dossier:'A chain-forming bacterium with a peptidoglycan wall. Classic cure: <b>penicillin</b>, grown from Penicillium mould.'},
  {id:'mrsa', name:'MRSA', aka:'methicillin-resistant Staph', kind:'bacterium', drug:'Vancomycin — a soil-actinomycete glycopeptide',
   recipe:{items:['soil_microbe','broth'],step:'ferment'},
   dossier:'A drug-resistant Staph that shrugs off penicillin. Held in reserve: <b>vancomycin</b>, a glycopeptide from a soil actinomycete.'},
  {id:'cholera', name:'Cholera', aka:'Vibrio cholerae', kind:'bacterium', drug:'a tetracycline antibiotic (from Streptomyces)',
   recipe:{items:['soil_microbe','broth'],step:'ferment'},
   dossier:'A comma-shaped waterborne bacterium whose toxin drains the gut. Treated with a <b>tetracycline</b> antibiotic from soil Streptomyces (plus rehydration).'},
  // — fungi (cure class: antifungal) —
  {id:'ringworm', name:'Ringworm', aka:'dermatophyte', kind:'fungus', drug:'Griseofulvin — a mould antifungal',
   recipe:{items:['griseo_mould','broth'],step:'ferment'},
   dossier:'A skin fungus that eats keratin, spreading in itchy rings. The classic cure is <b>griseofulvin</b> — an antifungal grown from a mould.'},
  {id:'candida', name:'Candidiasis', aka:'Candida / thrush', kind:'fungus', drug:'an antifungal (an azole or amphotericin)',
   recipe:{items:['griseo_mould','broth'],step:'ferment'},
   dossier:'A yeast that overgrows warm, moist tissue. Cleared with an <b>antifungal</b> that hits the fungal membrane or wall.'},
  // — parasites (cure class: antiparasitic) —
  {id:'malaria', name:'Malaria', aka:'Plasmodium', kind:'parasite', drug:'Artemisinin — from sweet wormwood',
   recipe:{items:['wormwood'],step:'extract'},
   dossier:'A protozoan injected by mosquitoes; it multiplies inside red blood cells. Front-line cure: <b>artemisinin</b>, extracted from sweet wormwood.'},
  {id:'riverblind', name:'River blindness', aka:'Onchocerca', kind:'parasite', drug:'Ivermectin — from a soil actinomycete',
   recipe:{items:['soil_microbe'],step:'extract'},
   dossier:'A parasitic worm spread by blackflies. <b>Ivermectin</b> — purified from a soil actinomycete — clears the larvae.'},
  // — prion (cure class: denaturant) —
  {id:'cjd', name:'Creutzfeldt-Jakob', aka:'CJD prion', kind:'prion', drug:'a protein denaturant (nothing living to kill)',
   recipe:{items:['urea'],step:'boil'},
   dossier:'Not a living thing — a misfolded protein that forces its neighbours to misfold. It has no genome; only a <b>denaturant</b> that unfolds protein can destroy it.'},
  // — toxins (cure class: antitoxin) —
  {id:'botulism', name:'Botulism', aka:'botulinum toxin', kind:'toxin_load', drug:'Antitoxin serum',
   recipe:{items:['serum','toxoid'],step:'filter'},
   dossier:'The most lethal toxin known, made by Clostridium — it paralyses nerves. There is no microbe to kill in the blood; only <b>antitoxin serum</b> neutralises the poison.'},
  {id:'snakebite', name:'Snake envenomation', aka:'venom', kind:'toxin_load', drug:'Antivenom serum',
   recipe:{items:['serum','toxoid'],step:'filter'},
   dossier:'A cocktail of venom proteins injected by a bite. Countered by <b>antivenom</b> — antibodies purified from an inoculated host’s serum.'},
];
XS.intruderRecipeMatches=function(sc,items,step){ const tr=sc&&sc.textbookRecipe; if(!tr||!items||!step) return false;
  return step===tr.step && items.slice().sort().join('+')===tr.items.slice().sort().join('+'); };

/* ---------------- scenario generation ---------------- */
XS.buildScenario=function(objective, tier, forceCell){
  const T=(XS.TIERS&&XS.TIERS[tier])||{margin:1};
  const xp=(XS.progress&&XS.progress.xp)||0;
  const fc = ((XS.app&&XS.app.mode)||'quick')==='contact';       // 🛸 First Contact = alien species only
  const pool = forceCell ? XS.SPECIES.filter(s=>s.cell===forceCell)
    : XS.SPECIES.filter(s=> (fc? !!s.alien : !s.alien) && xp>=(s.minXP||0));
  const base = pick(pool.length?pool:XS.SPECIES);
  const morph=XS.genMorph(base);
  // a player-designed species keeps the exact shape it was sculpted with;
  // only procedurally-generated ones get random morphology
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
  const mode=(XS.app&&XS.app.mode)||'quick', ultra=mode==='ultra', alien=mode==='alien', contact=mode==='contact';
  if(ultra||alien) objective='preserve';          // both are "synthesise the cure" modes
  if(contact) objective='neutralize';             // First Contact = classify and contain the organism
  const craft=mode==='advanced'||ultra||alien||contact;
  const sc={ objective, archKey:base.cell, A, morph, planet, name:nm,
    regions, keyId:key.id,
    P:0, host:100, resist:0, cured:false, done:false,
    tier, mode, craft, sway:Math.random()*Math.PI*2 };
  if(objective==='preserve'){
    const ptype=pick(alien?XS.ALIEN_PATHS():XS.EARTH_PATHS());
    sc.alien=alien;
    sc.pathType=ptype; sc.agent=XS.PATHOGENS[ptype].cure; sc.dxAnswer=XS.PATHOGENS[ptype].dx;
    key.problem={kind:'pathogen', pathType:ptype};
    sc.brief=`${nm} is failing — something is spreading inside it. Zoom into its tissues, run assays to identify the invader, then ${craft?'synthesise the right cure':'apply the one correct cure'} before the organism dies.`;
    if(alien){ const P=XS.PATHOGENS[ptype];
      sc.brief=`👽 <b>XENO CASE</b> — whatever is killing ${nm} does not obey Earth biology. ${P.tell} <b>Your entire normal shelf may be useless here.</b> Run the assays, work out which rule it breaks, and synthesise chemistry that answers <em>that</em>.`; }
    if(ultra){ const poolI=XS.INTRUDERS.filter(i=>i.kind===ptype);
      if(poolI.length){ const it=pick(poolI); sc.intruder=it; sc.textbookRecipe=it.recipe;
        sc.brief=`🧬 <b>CASE FILE</b> — the invader in ${nm} matches <b>${it.name}</b> <span class="dim">(${it.aka})</span>. ${it.dossier} Run assays to confirm the kind, then synthesise its real cure at the bench.`; } }
    sc.hostDrain=(2.2/(T.margin||1))*(craft?0.3:1);   // Advanced/Ultra: much more time to think & craft
  } else {
    sc.agent=XS.killAgentsFor(A.cell)[0]; sc.dxAnswer=XS.KINGDOM_ANSWER[A.cell];
    key.problem={kind:'vital'};
    sc.firstContact=contact;
    sc.brief=contact
      ? `🛸 <b>FIRST CONTACT</b> — ${nm} is ${A.body}, and it belongs to <b>no kingdom of Earth life</b>. Nothing you know about walls, membranes or metabolism is guaranteed to apply. Run the assays, work out what it is actually <em>made of</em>, then synthesise something its chemistry cannot survive.`
      : `${nm} is an invasive threat. Identify what kind of organism it is, find the tissue it can’t defend, and hit it with the one agent its biology can’t withstand.`;
    sc.hostDrain=0;
  }
  sc.assayBudget = (tier==='director' && !craft)?6:null;   // Director quick-mode: limited reagents
  rollTraits(sc, tier);
  return sc;
};

/* ---------------- ADVANCED MODE · the synthesis bench ----------------
   You don't pick a finished drug — you MAKE one, the way real cures are made:
   from a raw natural material (mould, bark, serum, salt…) worked through a
   real preparation step (ferment, extract, heat/react, filter). The right
   material + the right method yields a real drug — penicillin from mould,
   quinine from bark, soap from oil + lye. So you learn where medicine actually
   comes from, not just its name.
------------------------------------------------------------ */
/* RAW MATERIALS — tangible things on the shelf, each a real drug source.
   `made` marks an INTERMEDIATE: not on the shelf at the start, you have to
   synthesise it from its own precursors first (see XS.PRECURSORS). */
XS.INGREDIENTS=[
  {id:'pen_mould',  label:'Penicillium mould',   glyph:'🧫', col:'#7fce8e', note:'A blue-green mould — the original source of penicillin.'},
  {id:'soil_microbe',label:'Soil Streptomyces',  glyph:'🟤', col:'#b5824a', note:'Soil bacteria that secrete a huge share of our antibiotics.'},
  {id:'griseo_mould',label:'Griseofulvin mould', glyph:'🍄', col:'#d8c164', note:'A mould whose secretion poisons fungal cells.'},
  {id:'wormwood',   label:'Sweet wormwood',      glyph:'🌿', col:'#7cc257', note:'The leaf that gives artemisinin, a frontline antimalarial.'},
  {id:'cinchona',   label:'Cinchona bark',       glyph:'🪵', col:'#c48a54', note:'Bark that yields quinine — the first antimalarial.'},
  {id:'egg_white',  label:'Egg white',           glyph:'🥚', col:'#eee2b6', note:'Rich in lysozyme, an enzyme that cracks bacterial walls.'},
  {id:'plant_oil',  label:'Plant oil',           glyph:'🫒', col:'#cfa93a', note:'A triglyceride fat — one half of the recipe for soap.'},
  {id:'lye',        label:'Lye (wood ash)',      glyph:'🪨', col:'#c3c8ce', note:'Sodium hydroxide from leached ash — the alkali that saponifies fat.'},
  {id:'sea_salt',   label:'Sea salt',            glyph:'🧂', col:'#e9eef2', note:'Concentrate it and it pulls water out of cells.'},
  {id:'pure_water', label:'Distilled water',     glyph:'💧', col:'#a9ddff', note:'Purest solvent — floods a wall-less cell until it bursts.'},
  {id:'urea',       label:'Urea / acid',         glyph:'⚗️', col:'#bfa2f2', note:'A chaotrope that unfolds protein structure.'},
  {id:'serum',      label:'Immune serum',        glyph:'🩸', col:'#dc5d5d', note:'Antibodies raised in an inoculated host — the basis of antivenom.'},
  {id:'charcoal',   label:'Activated charcoal',  glyph:'⬛', col:'#41474e', note:'A porous solid that adsorbs and traps a poison.'},
  // --- precursor chemicals (shelf stock you build intermediates from) ---
  {id:'ribose',     label:'Ribose sugar',        glyph:'🍬', col:'#ffd9a0', note:'The 5-carbon sugar that forms the backbone of every nucleoside.'},
  {id:'purine',     label:'Modified purine base',glyph:'🔷', col:'#8fbcff', note:'An altered A/G base — the counterfeit letter of the genetic code.'},
  {id:'phosphoryl', label:'Phosphoryl donor',    glyph:'🟣', col:'#c58cff', note:'Adds the phosphate group a nucleoside needs to be incorporated.'},
  // --- xeno reagents (for biology that isn't carbon-and-water) ---
  {id:'fluorspar',  label:'Fluorspar ore',       glyph:'🔶', col:'#8fe6e0', note:'Calcium fluoride — react it with acid and it gives up fluoride, the one thing that dissolves silicon–oxygen bonds.'},
  {id:'chiral_cat', label:'Chiral catalyst',     glyph:'🔁', col:'#ff9ad5', note:'Flips a molecule into its mirror image — turns an ordinary drug into its enantiomer.'},
  {id:'boron',      label:'Boron mineral',       glyph:'⬜', col:'#b9c6d6', note:'Borax — an exceptional neutron absorber, used for real reactor shielding.'},
  {id:'cryogen',    label:'Liquid nitrogen',     glyph:'❄️', col:'#cfefff', note:'Boils at −196 °C — the fastest way to pull energy out of anything. Prepared at the very bottom of the dial.'},
  {id:'citrate',    label:'Citrate / EDTA',      glyph:'🧪', col:'#c8e08a', note:'A chelator: its claw-shaped molecule wraps a metal ion and holds it out of reach.'},
  {id:'agar',       label:'Agar / nutrient salts',glyph:'🥣', col:'#ddd2a8', note:'Seaweed gel and salts — the food a cultured microbe grows on. Useless alone; it must be made into sterile broth first.'},
  {id:'venom_raw',  label:'Raw venom sample',    glyph:'🐍', col:'#a86b7d', note:'Active toxin milked from the source. Far too dangerous to inject — it has to be inactivated first.'},
  {id:'formalin',   label:'Formaldehyde',        glyph:'⚗', col:'#9fd8c4', note:'Cross-links a protein so it keeps its shape but loses its bite — the classic way to make a toxoid.'},
  // --- intermediates you SYNTHESISE (see XS.PRECURSORS) ---
  {id:'broth',      label:'Sterile broth',       glyph:'🧴', col:'#e8dcae', made:true,
   note:'Sterilised growth medium. Every fermentation needs it — you cannot culture a mould in nothing.'},
  {id:'toxoid',     label:'Toxoid',              glyph:'💉', col:'#d69ab0', made:true,
   note:'Venom that has been chemically disarmed. Inoculating a host with this is how real antivenom is raised.'},
  // --- intermediates you SYNTHESISE, not pick up ---
  {id:'nucleoside', label:'Nucleoside stock',    glyph:'🧬', col:'#61c3ff', made:true,
   note:'A counterfeit genome letter. You must build it: ribose sugar + a modified purine base, coupled at 60 °C.'},
];
/* PRECURSOR SYNTHESIS — build an intermediate from real chemical precursors.
   Same bench, same dial: exact inputs AND an exact temperature. */
XS.PRECURSORS=[
  {items:['ribose','purine'], step:'boil', temp:60, tol:8, ph:7, phTol:1.5, makes:'nucleoside', name:'Nucleoside stock',
   how:'Glycosylation — the purine base is coupled to the ribose sugar at a gentle <b>60 °C</b>, held neutral at <b>pH 7</b>. Too cold and it won’t couple; too hot and the sugar caramelises; too acidic and the bond hydrolyses straight back off.'},
  {items:['agar','pure_water'], step:'boil', temp:121, tol:6, ph:7, phTol:1.0, makes:'broth', name:'Sterile broth',
   how:'Autoclaving — nutrient salts in water held at <b>121 °C</b>, the real sterilisation standard, at <b>pH 7</b>. Anything cooler leaves contaminants alive and your culture is ruined.'},
  {items:['venom_raw','formalin'], step:'filter', temp:37, tol:5, ph:7.4, phTol:0.6, makes:'toxoid', name:'Toxoid',
   how:'Formaldehyde cross-links the venom at body temperature <b>37 °C</b> and blood <b>pH 7.4</b>, so it keeps its shape but loses its toxicity. This is genuinely how antivenom production begins.'},
];
/* Does the flask satisfy an exact condition? temp AND pH must both be in window. */
function condOK(r,temp,ph){
  if(temp==null || Math.abs(temp-r.temp)>(r.tol||8)) return false;
  if(r.ph!=null && (ph==null || Math.abs(ph-r.ph)>(r.phTol||1.5))) return false;
  return true;
}
XS.condOK=condOK;
XS.precursorResult=function(items,step,temp,ph){
  if(!items||!items.length||!step) return null;
  const key=items.slice().sort().join('+');
  const p=XS.PRECURSORS.find(x=>x.step===step && x.items.slice().sort().join('+')===key);
  if(!p) return null;
  return {p, ok:condOK(p,temp,ph), temp:p.temp, tol:p.tol, ph:p.ph, phTol:p.phTol};
};
/* PREPARATION STEPS — how you work the material (the method matters). */
XS.LAB_STEPS=[
  {id:'ferment', label:'Ferment', glyph:'🧫', verb:'Culturing…', desc:'Grow a microbe so it secretes its drug.'},
  {id:'extract', label:'Extract', glyph:'🌿', verb:'Steeping…',   desc:'Steep the raw material in solvent and draw the compound out.'},
  {id:'boil',    label:'Heat / react', glyph:'🔥', verb:'Reacting…', desc:'Drive a reaction — saponify, concentrate or denature.'},
  {id:'filter',  label:'Filter / purify', glyph:'⚗️', verb:'Purifying…', desc:'Strain out the solids and isolate the pure agent.'},
];
/* FORMULATIONS — material(s) + the correct step → a real drug.
   Several natural sources make the same class of cure (variety), and one
   material can make different drugs by a different method (soil microbe →
   antibiotic if fermented, antiparasitic if extracted).
   Each carries an EXACT temperature (°C) with a tolerance — the real
   condition the process runs at, so "heat" is never just "heat". */
XS.FORMULATIONS=[
  {items:['pen_mould','broth'],step:'ferment', temp:24, tol:4, ph:6.0, phTol:0.8, agent:'antibiotic', name:'Penicillin', source:'Penicillium mould cultured on sterile broth — the first true antibiotic.',
   why:'Cultured cool at <b>24 °C</b> and slightly acidic, <b>pH 6</b>. Penicillin is famously unstable in alkali — swing the pH up and your yield destroys itself.'},
  {items:['soil_microbe','broth'],step:'ferment', temp:28, tol:4, ph:7.2, phTol:0.8, agent:'antibiotic', name:'Streptomycin', source:'Soil Streptomyces fermented on sterile broth.',
   why:'Soil actinomycetes ferment at <b>28 °C</b> and just alkaline of neutral, <b>pH 7.2</b> — soil-warm, not blood-warm.'},
  {items:['soil_microbe'],     step:'extract', temp:40, tol:8, ph:8.0, phTol:1.0, agent:'antiparasitic',name:'Ivermectin', source:'The same soil microbe, purified another way, yields an antiparasitic.',
   why:'A warm <b>40 °C</b> extraction, run alkaline at <b>pH 8</b> so the avermectins stay in the solvent rather than the water.'},
  {items:['griseo_mould','broth'],step:'ferment', temp:25, tol:4, ph:6.5, phTol:0.8, agent:'antifungal', name:'Griseofulvin', source:'A mould secretion (griseofulvin) that jams a fungus’s cell-division machinery.',
   why:'Another cool mould culture on sterile broth — <b>25 °C</b>, mildly acidic <b>pH 6.5</b>.'},
  {items:['wormwood'],         step:'extract', temp:50, tol:8, ph:7, phTol:1.2, agent:'antiparasitic',name:'Artemisinin',  source:'Steeped out of sweet wormwood leaves.',
   why:'Artemisinin is heat-fragile AND acid-fragile — extract warm at <b>50 °C</b> and neutral <b>pH 7</b>, or you destroy the peroxide bridge that kills the parasite.'},
  {items:['cinchona'],         step:'extract', temp:80, tol:10, ph:10.0, phTol:1.0, agent:'antiparasitic',name:'Quinine',   source:'Extracted from cinchona bark — the original antimalarial.',
   why:'A hot <b>80 °C</b> steep run strongly alkaline at <b>pH 10</b>: the base frees quinine from its salt so it will leave the bark. This is real alkaloid extraction.'},
  {items:['nucleoside'],       step:'boil',    temp:95, tol:8, ph:7.5, phTol:1.0, agent:'antiviral',   name:'Nucleoside analogue', source:'A fake building block that chain-terminates the viral genome.',
   why:'Phosphorylating and activating the analogue needs a hard <b>95 °C</b> reaction near neutral <b>pH 7.5</b>.'},
  {items:['egg_white'],        step:'extract', temp:20, tol:6, ph:9.5, phTol:1.0, agent:'lysozyme',    name:'Lysozyme',     source:'The wall-cracking enzyme, drawn from egg white.',
   why:'Keep it at room temperature <b>20 °C</b> — heat denatures the enzyme. Egg white is naturally alkaline, so the extraction runs at <b>pH 9.5</b>.'},
  {items:['lye','plant_oil'],  step:'boil',    temp:100, tol:10, ph:13.0, phTol:1.0, agent:'detergent', name:'Soap', source:'Oil + lye, boiled — saponification makes a membrane-dissolving surfactant.',
   why:'A full rolling boil at <b>100 °C</b> and strongly caustic <b>pH 13</b> — lye IS the alkali, so saponification only runs at the top of the scale.'},
  {items:['sea_salt'],         step:'boil',    temp:105, tol:10, ph:7, phTol:2.0, agent:'hypertonic', name:'Concentrated brine', source:'Boiled down to a hypertonic solution that draws water out of walled cells.',
   why:'Boil past <b>105 °C</b> — saturated brine boils above pure water — to drive the water off and concentrate it.'},
  {items:['pure_water'],       step:'filter',  temp:100, tol:12, ph:7, phTol:1.0, agent:'hypotonic', name:'Sterile pure water', source:'A hypotonic solvent that floods wall-less cells until they burst.',
   why:'Distil at <b>100 °C</b>, neutral <b>pH 7</b>: steam leaves the salts behind, giving pure, sterile, hypotonic water.'},
  {items:['urea'],             step:'boil',    temp:134, tol:10, ph:7, phTol:2.0, agent:'denaturant', name:'Hot chaotrope', source:'A heated chaotrope that unfolds protein — the only thing that destroys a prion.',
   why:'Prions survive ordinary boiling. Real prion decontamination is an autoclave at <b>134 °C</b> — that is why this one runs so hot.'},
  {items:['serum','toxoid'],   step:'filter',  temp:4, tol:6, ph:7.4, phTol:0.6, agent:'antitoxin', name:'Antitoxin serum', source:'A host inoculated with toxoid raises antibodies; you purify them out of its serum.',
   why:'Antibodies are proteins — purify them cold at <b>4 °C</b> and blood <b>pH 7.4</b>, or they denature and stop binding. You cannot skip the toxoid: raw venom would kill the donor.'},
  {items:['charcoal'],         step:'filter',  temp:25, tol:10, ph:7, phTol:2.5, agent:'antitoxin', name:'Charcoal binder', source:'Activated charcoal that adsorbs and traps the toxin.',
   why:'Adsorption onto charcoal is crude but forgiving — room temperature <b>25 °C</b> and almost any pH. The fast, dirty alternative to raising a serum.'},
  // — xeno formulations —
  {items:['fluorspar','urea'], step:'boil',    temp:120, tol:10, ph:1.0, phTol:1.0, agent:'fluoride', name:'Fluoride flux', source:'Fluorspar reacted with acid gives hydrogen fluoride — the one chemistry that dissolves a silicon–oxygen lattice.',
   why:'A hot <b>120 °C</b> reaction at savagely acidic <b>pH 1</b> — it takes strong acid to drive fluoride off the ore. This is the real process behind glass etching.'},
  {items:['chiral_cat','ribose'], step:'boil', temp:70, tol:8, ph:7, phTol:1.0, agent:'enantiomer', name:'Mirror-image drug', source:'The catalyst inverts the sugar backbone, building the drug as its own mirror image.',
   why:'Inversion runs at <b>70 °C</b>, neutral <b>pH 7</b> — hot enough to flip the centre, mild enough not to scramble it back into a useless mixture.'},
  {items:['boron'],            step:'filter',  temp:25, tol:12, ph:7, phTol:2.5, agent:'shielding', name:'Boron shield', source:'Milled boron packed around the tissue soaks up the neutrons a radiotroph feeds on.',
   why:'Purely physical shielding — no reaction needed, so it is forgiving: room temperature <b>25 °C</b>, almost any pH.'},
  {items:['pure_water'],       step:'boil',    temp:70, tol:10, ph:7, phTol:1.0, agent:'solvent_shock', name:'Aqueous shock', source:'Warm water — an ordinary solvent to us, a violently reactive one to ammonia-based biochemistry.',
   why:'Served warm at <b>70 °C</b> and neutral: far above liquid ammonia’s range, so the alien solvent chemistry is destroyed on contact.'},
  {items:['cryogen'],          step:'filter',  temp:0, tol:6, ph:7, phTol:2.5, agent:'quench', name:'Cryogenic quench', source:'Liquid nitrogen decanted cold — it strips energy fast enough that a plasma’s confining field collapses.',
   why:'The one recipe at the very bottom of the dial: hold it at <b>0 °C</b> or below. Any warmth and it boils off before it can quench anything.'},
  {items:['citrate'],          step:'extract', temp:60, tol:10, ph:5.0, phTol:0.8, agent:'chelation', name:'Chelating agent', source:'Citrate/EDTA drawn into solution — its claw-shaped molecule captures metal ions and holds them.',
   why:'Extracted warm at <b>60 °C</b> and mildly acidic <b>pH 5</b>, where the chelator grips iron most tightly.'},
];
/* Resolve the current flask (materials + step [+ temperature]) to a formulation.
   Pass a temp to enforce the exact condition; omit it to just match the recipe. */
XS.benchResult=function(items,step,temp,ph){
  if(!items||!items.length||!step) return null;
  const key=items.slice().sort().join('+');
  const f=XS.FORMULATIONS.find(f=>f.step===step && f.items.slice().sort().join('+')===key)||null;
  if(!f) return null;
  if(temp!=null && !condOK(f,temp,ph)) return null;   // wrong temperature or pH → no product
  return f;
};
/* All recipes that make a given agent (for the field guide). */
XS.recipesFor=function(agent){ return XS.FORMULATIONS.filter(f=>f.agent===agent); };

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
  if(sc.objective!=='preserve') return {kind:'class', prompt:'What kind of organism is this?',
    options:(sc.firstContact||XS.isAlienCell(sc.A&&sc.A.cell))?XS.XENO_CLASSIFY.slice():XS.CLASSIFY.slice()};
  // XENO cases add the alien afflictions alongside familiar ones — you have to
  // recognise that Earth categories don't apply here.
  const alien=sc.alien||XS.isAlienPath(sc.pathType);
  return {kind:'pathogen', prompt:'What is the cause?',
    options: alien
      ? ['Virus','Bacterium','Toxin','Silicate lattice','Mirror-life','Radiotroph','Ammono-life']
      : ['Virus','Bacterium','Fungus','Parasite','Prion','Toxin']};
};
/* the give-away feature of each option — you match this to the evidence you gathered
   (structure from the assays), NOT the particle colour. */
XS.DX_HALLMARK={
  Virus:'Not a cell — a protein capsid around nucleic acid; no ribosomes of its own.',
  Bacterium:'Walled rod/sphere; peptidoglycan wall + its own 70S ribosomes; no nucleus.',
  Fungus:'Chitin cell wall, growing as branching threads (hyphae); eukaryotic nucleus.',
  Parasite:'A nucleated, motile eukaryotic cell — no wall, and not one of the host’s.',
  Prion:'Misfolded-protein clumps — NO nucleic acid at all. Not alive.',
  Toxin:'No invading organism — a chemical poison diffusing through the tissue.',
  Animal:'No cell wall; a true nucleus and mitochondria.',
  Plant:'Rigid cellulose wall + chloroplasts (photosynthetic).',
  Archaeon:'Prokaryote with NO peptidoglycan; ether-linked membrane; often an extremophile.',
  Protist:'A single wall-less eukaryotic cell (nucleus present).',
  'Silicate lattice':'Glassy angular crystal — silicon–oxygen, no carbon, no membrane, no nucleic acid.',
  'Mirror-life':'Looks like a normal cell, but every sugar and amino acid is the MIRROR image of ours.',
  Radiotroph:'Heavily melanised cells that grow FASTER under radiation instead of dying.',
  'Ammono-life':'Thrives at −40 °C — its internal solvent is liquid ammonia, not water.',
  Silicoid:'A silicon–oxygen crystal. No membrane, no nucleic acid, no water — it grows by accretion, not division.',
  Plasmoid:'Ionised gas bounded by its own magnetic field. No wall, no membrane, no molecules to stain at all.',
  Ammonoid:'A true cell with a nucleus — but active at −40 °C, with liquid ammonia as its solvent instead of water.',
  Metallophyte:'Sheathed in a metal-oxide crust it excretes; respires iron and manganese instead of light or food.',
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
  if(sc.started && sc.mutating){ const m=(XS.TIERS[sc.tier]||{}).margin||1; sc.resist=Math.min(100, sc.resist + (sc.craft?0.4:0.8)*dt/m); }
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
