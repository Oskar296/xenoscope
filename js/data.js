/* =====================================================================
   XENOSCOPE · data.js
   All game content: organelles (with real biology), organism kingdoms
   (incl. viruses & plant tissue), substances/reagents, tasks, ranks.
   Everything attaches to the global XS namespace so plain <script> tags
   work from file:// with no bundler.
===================================================================== */
window.XS = window.XS || {};
(function(XS){
"use strict";

/* ---------------- ORGANELLES & STRUCTURES ----------------
   Each entry teaches real biology. `fn` = function, `fact` = a hook.
   `col` drives its glow colour; `shape` picks a draw routine.
------------------------------------------------------------ */
XS.ORG = {
  membrane:      {name:'Cell membrane', col:'#8fe9ff', shape:'membrane',
    fn:'A partially-permeable barrier of phospholipids that controls what enters and leaves the cell.',
    fact:'Made of a phospholipid bilayer — “heads” love water, “tails” hide from it.'},
  wall_cellulose:{name:'Cell wall (cellulose)', col:'#7effc0', shape:'wall',
    fn:'A rigid cellulose box that supports the cell and stops it bursting when full of water.',
    fact:'Cellulose is the most abundant organic polymer on Earth.'},
  wall_chitin:   {name:'Cell wall (chitin)', col:'#ffd27a', shape:'wall',
    fn:'A tough chitin wall giving fungi their shape — the same material as insect shells.',
    fact:'Chitin makes fungi more chemically similar to insects than to plants.'},
  wall_pepti:    {name:'Cell wall (peptidoglycan)', col:'#9fd0ff', shape:'wall',
    fn:'A mesh of peptidoglycan around bacteria. Its thickness sets the Gram stain result.',
    fact:'Penicillin works by blocking peptidoglycan synthesis — so it hits bacteria, not you.'},
  wall_slayer:   {name:'S-layer wall', col:'#c8b0ff', shape:'wall',
    fn:'An archaeal surface layer of protein/glycoprotein — NO peptidoglycan, so wall-targeting antibiotics fail.',
    fact:'Because archaea lack peptidoglycan, penicillin does nothing to them.'},
  capsule:       {name:'Capsule', col:'#bfe0ff', shape:'halo',
    fn:'A slimy outer coat that protects some bacteria and helps them stick to surfaces.',
    fact:'Capsules help pathogens hide from the immune system.'},
  nucleus:       {name:'Nucleus', col:'#b79bff', shape:'nucleus',
    fn:'The control centre — it stores the DNA and directs the cell’s activities.',
    fact:'Only eukaryotes have a true, membrane-bound nucleus.'},
  nucleolus:     {name:'Nucleolus', col:'#d8c9ff', shape:'dot',
    fn:'A dense region inside the nucleus that builds ribosomes.',
    fact:'It vanishes during cell division and reforms afterwards.'},
  nucleoid:      {name:'Nucleoid', col:'#9fd0ff', shape:'nucleoid',
    fn:'The region of a prokaryote holding its single, circular chromosome — no membrane around it.',
    fact:'A bacterium’s DNA, unravelled, is ~1000× longer than the cell itself.'},
  plasmid:       {name:'Plasmid', col:'#7db8ff', shape:'ring',
    fn:'A small extra loop of DNA. Plasmids often carry antibiotic-resistance genes.',
    fact:'Bacteria swap plasmids like trading cards — spreading resistance fast.'},
  ribosome:      {name:'Ribosomes', col:'#dbeaff', shape:'speck',
    fn:'Tiny machines that read mRNA and build proteins.',
    fact:'Bacterial (70S) ribosomes differ from yours (80S) — many antibiotics exploit that gap.'},
  mitochondrion: {name:'Mitochondria', col:'#ffb26a', shape:'mito',
    fn:'The powerhouse — aerobic respiration here releases energy (ATP) from glucose.',
    fact:'Mitochondria have their own DNA and were once free-living bacteria.'},
  chloroplast:   {name:'Chloroplast', col:'#7effc0', shape:'chloroplast',
    fn:'Where photosynthesis happens — light + CO₂ + water → glucose. Contains green chlorophyll.',
    fact:'Stacks of discs (grana) are packed with light-absorbing pigment.'},
  thylakoid:     {name:'Thylakoids', col:'#8fffb0', shape:'thylakoid',
    fn:'Folded photosynthetic membranes in cyanobacteria — a chloroplast’s ancestor did this first.',
    fact:'Cyanobacteria invented oxygen photosynthesis ~2.4 billion years ago.'},
  vacuole_central:{name:'Central vacuole', col:'#9ec8ff', shape:'bigvac',
    fn:'A large sap-filled sac that pushes outward, keeping the plant cell firm (turgid).',
    fact:'A wilting plant is one whose vacuoles have lost water and turgor.'},
  vacuole:       {name:'Vacuole', col:'#bcd8ff', shape:'vac',
    fn:'A storage sac for water, food or waste.',
    fact:'Fungal vacuoles help recycle nutrients across the cell.'},
  contractile:   {name:'Contractile vacuole', col:'#78ebff', shape:'contractile',
    fn:'A pump that collects and expels excess water — osmoregulation in freshwater protists.',
    fact:'Without it, a freshwater protist would swell and burst.'},
  food_vacuole:  {name:'Food vacuole', col:'#ffd9a0', shape:'foodvac',
    fn:'A bubble where engulfed food is digested by enzymes.',
    fact:'Formed when the cell wraps its membrane around a meal (phagocytosis).'},
  lysosome:      {name:'Lysosomes', col:'#ff7d92', shape:'lyso',
    fn:'Enzyme-filled sacs that digest worn-out parts and invaders — the cell’s recycling crew.',
    fact:'Their enzymes work best in acid; the cell keeps them safely bagged.'},
  er_rough:      {name:'Rough ER', col:'#c7b0ff', shape:'er',
    fn:'Ribosome-studded membranes that fold and transport newly-made proteins.',
    fact:'“Rough” because ribosomes give it a bumpy look.'},
  golgi:         {name:'Golgi apparatus', col:'#ffc9e6', shape:'golgi',
    fn:'Stacks that modify, package and ship proteins in vesicles — the cell’s post office.',
    fact:'Named after Camillo Golgi, who first saw it in 1898.'},
  cytoskeleton:  {name:'Cytoskeleton', col:'#bfe8e0', shape:'none',
    fn:'A protein scaffold giving the cell shape and moving things around inside.',
    fact:'It constantly builds and dismantles itself like scaffolding.'},
  flagellum:     {name:'Flagellum', col:'#9fe8ff', shape:'flagellum',
    fn:'A whip-like tail spun like a propeller to swim.',
    fact:'The bacterial flagellum is one of biology’s few true rotary motors.'},
  cilia:         {name:'Cilia', col:'#a8f0e0', shape:'cilia',
    fn:'Rows of tiny hairs that beat to move the cell or sweep in food.',
    fact:'Your airways use cilia to sweep out dust and mucus.'},
  pseudopod:     {name:'Pseudopodia', col:'#b0e0d0', shape:'pseudo',
    fn:'“False feet” — the cell flows part of itself out to crawl and to engulf prey.',
    fact:'Amoebae hunt by surrounding food with pseudopodia.'},
  pili:          {name:'Pili', col:'#bcd0ff', shape:'pili',
    fn:'Short hair-like fibres for sticking to surfaces and swapping DNA between bacteria.',
    fact:'A “sex pilus” lets one bacterium pass a plasmid to another.'},
  eyespot:       {name:'Eyespot', col:'#ff9a5c', shape:'eyespot',
    fn:'A pigmented light detector that steers some algae toward light.',
    fact:'Not a true eye — just enough to sense brightness and direction.'},
  spore:         {name:'Spores', col:'#ffcf8a', shape:'spore',
    fn:'Tough dormant units that survive harsh conditions and grow when things improve.',
    fact:'Some bacterial endospores survive boiling — and even space.'},
  septa:         {name:'Septa', col:'#ffdca0', shape:'none',
    fn:'Cross-walls dividing fungal threads (hyphae) into compartments.',
    fact:'Pores in septa let cytoplasm — and nuclei — flow between compartments.'},
  plasmodesmata:{name:'Plasmodesmata', col:'#a0ffcf', shape:'none',
    fn:'Tiny channels through plant cell walls that link neighbouring cells.',
    fact:'They let plant cells share water, signals and food directly.'},
  centriole:     {name:'Centrioles', col:'#c8d8ff', shape:'centriole',
    fn:'Barrel-shaped organisers that pull chromosomes apart during animal cell division.',
    fact:'Plants divide just fine without them.'},
  /* ---- plant vascular tissue ---- */
  xylem:         {name:'Xylem', col:'#bfe6ff', shape:'xylem',
    fn:'Dead, hollow, lignin-reinforced tubes carrying water and minerals UP from the roots.',
    fact:'Xylem cells are dead — the plant plumbs water through empty pipes.'},
  phloem:        {name:'Phloem', col:'#c8ffd6', shape:'phloem',
    fn:'Living sieve tubes carrying dissolved sugars around the plant (translocation).',
    fact:'Sap can flow up OR down phloem, wherever sugar is needed.'},
  /* ---- virus parts ---- */
  capsid:        {name:'Capsid', col:'#ff8fd0', shape:'capsid',
    fn:'A geometric protein shell that protects the viral genome.',
    fact:'Many capsids are icosahedra — 20 triangular faces.'},
  genome_dna:    {name:'Viral genome (DNA)', col:'#ff6ec7', shape:'coil',
    fn:'The virus’s genetic instructions, hijacking a host cell to copy them.',
    fact:'A virus carries genes but none of the machinery to run them.'},
  genome_rna:    {name:'Viral genome (RNA)', col:'#ff6ec7', shape:'coil',
    fn:'Single-stranded RNA instructions — fast-mutating, as in influenza and coronaviruses.',
    fact:'RNA viruses mutate quickly, which is why flu vaccines change yearly.'},
  envelope:      {name:'Viral envelope', col:'#ffb0e0', shape:'halo',
    fn:'An outer membrane stolen from a previous host cell; makes some viruses fragile to soap.',
    fact:'Soap dissolves the envelope — which is why hand-washing works.'},
  spike:         {name:'Glycoprotein spikes', col:'#ff9ad8', shape:'spike',
    fn:'Surface proteins that latch onto specific host-cell receptors — the key to the lock.',
    fact:'Spikes decide which cells a virus can infect.'},
  tail_fiber:    {name:'Tail fibres', col:'#ff9ad8', shape:'tail',
    fn:'Leg-like fibres a bacteriophage uses to land on and grip a bacterium.',
    fact:'A phage injects its DNA like a microscopic syringe.'},
};

/* ---------------- ORGANISM TYPES (six) ----------------
   `parts`: [organelleId, count]. `wall`, `wobble`, `aspect` drive looks.
   `autotroph`: null = random, true/false forces it.
------------------------------------------------------------ */
XS.KINGDOMS = {
  Animalia:{label:'Animal', col:[255,143,163], wall:'none', wobble:.10, aspect:1.1, nucleus:true, virus:false,
    gen:['Xeno','Vermi','Predo','Cnido','Necro'], epi:['zoon','pod','vermis','cnidos','fera'],
    autotroph:false,
    parts:[['membrane',1],['nucleus',1],['nucleolus',1],['mitochondrion',5],['er_rough',1],['golgi',1],['lysosome',4],['centriole',1],['ribosome',12]],
    blurb:'No cell wall, no chloroplasts — a heterotroph that eats other organisms for energy.'},
  Plantae:{label:'Plant', col:[126,255,192], wall:'cellulose', wobble:.03, aspect:1.05, nucleus:true, virus:false,
    gen:['Chloro','Photo','Sylvo','Viridi','Helio'], epi:['phyta','phyllum','viris','florus'],
    autotroph:true,
    parts:[['wall_cellulose',1],['membrane',1],['vacuole_central',1],['chloroplast',6],['nucleus',1],['nucleolus',1],['mitochondrion',2],['golgi',1],['plasmodesmata',1],['ribosome',7]],
    blurb:'Cellulose wall, big central vacuole and chloroplasts — an autotroph that makes its own food by photosynthesis.'},
  PlantTissue:{label:'Plant tissue', col:[150,230,200], wall:'cellulose', wobble:.0, aspect:1.0, nucleus:false, virus:false, tissue:true,
    gen:['Vasculo','Xylo','Phloe'], epi:['fasciculus','venae','stipes'],
    autotroph:true,
    parts:[['xylem',3],['phloem',3],['wall_cellulose',1]],
    blurb:'A vascular bundle: xylem carries water up, phloem carries sugars around. Tissue, not a single cell.'},
  Monera:{label:'Bacterium', col:[125,184,255], wall:'pepti', wobble:.045, aspect:1.7, nucleus:false, virus:false,
    gen:['Cyano','Halo','Ferro','Litho','Noct'], epi:['coccus','bacter','spira','thrix'],
    autotroph:null,
    parts:[['wall_pepti',1],['capsule',1],['membrane',1],['nucleoid',1],['plasmid',2],['flagellum',1],['pili',1],['ribosome',16]],
    blurb:'A prokaryote — no nucleus, DNA loose as a nucleoid, extra genes on plasmids, a peptidoglycan wall.'},
  Archaea:{label:'Archaeon', col:[178,150,255], wall:'slayer', wobble:.05, aspect:1.5, nucleus:false, virus:false, extremophile:true,
    gen:['Thermo','Halo','Metano','Sulfo','Pyro','Cryo'], epi:['coccus','pyrum','archaeum','thermus','halium'],
    autotroph:null,
    parts:[['wall_slayer',1],['membrane',1],['nucleoid',1],['plasmid',1],['flagellum',1],['ribosome',14]],
    blurb:'A prokaryote like a bacterium, but its own domain of life — no peptidoglycan wall, ether-linked membrane lipids, and usually an extremophile thriving in boiling, briny or acidic places.'},
  Protista:{label:'Protist', col:[94,242,214], wall:'none', wobble:.11, aspect:1.15, nucleus:true, virus:false,
    gen:['Vibrio','Umbra','Amoebo','Cilio','Eugleno'], epi:['amoeba','flagellum','cilia','plasm'],
    autotroph:null,
    parts:[['membrane',1],['nucleus',1],['mitochondrion',3],['contractile',1],['food_vacuole',2],['cilia',1],['ribosome',9]],
    blurb:'A single-celled eukaryote — the “odds and ends” kingdom. Some swim, some crawl, some photosynthesise.'},
  Fungi:{name:'Fungus', label:'Fungus', col:[255,196,107], wall:'chitin', wobble:.055, aspect:1.1, nucleus:true, virus:false,
    gen:['Myco','Necro','Sporo','Ergo'], epi:['myces','spora','hypha','thrix'],
    autotroph:false,
    parts:[['wall_chitin',1],['membrane',1],['nucleus',2],['vacuole',1],['mitochondrion',3],['spore',3],['septa',1],['ribosome',9]],
    blurb:'A chitin-walled heterotroph that absorbs nutrients from its surroundings. Often multinucleate.'},
  Virus:{label:'Virus', col:[255,110,199], wall:'none', wobble:.0, aspect:1.0, nucleus:false, virus:true,
    gen:['Phago','Retro','Corona','Adeno','Baculo'], epi:['virion','phage','viridae'],
    autotroph:false,
    parts:[['capsid',1],['genome_rna',1],['spike',6]],
    blurb:'Not a cell at all — just a protein capsid around genetic material. It can only replicate by hijacking a living host.'},
};
XS.KLIST = ['Animalia','Plantae','Monera','Archaea','Protista','Fungi','Virus','PlantTissue'];

/* Kingdom/domain you must pick in the quiz (PlantTissue folds into "Plant") */
XS.CLASSIFY = ['Animal','Plant','Bacterium','Archaeon','Protist','Fungus','Virus'];
XS.KINGDOM_ANSWER = {Animalia:'Animal',Plantae:'Plant',PlantTissue:'Plant',Monera:'Bacterium',Archaea:'Archaeon',Protista:'Protist',Fungi:'Fungus',Virus:'Virus'};

/* ---------------- SUBSTANCES ----------------
   type 'test'  = investigation reagent (reveals info, no harm)
   type 'treat' = intervention used to complete an assignment
------------------------------------------------------------ */
XS.SUBS = {
  // investigation
  iodine:   {name:'Iodine test', type:'test', short:'starch → blue-black',
    reveals:'starch', info:'Iodine turns blue-black if starch is present — a sign of a photosynthetic (autotroph) organism storing sugar.'},
  gram:     {name:'Gram stain', type:'test', short:'purple / pink wall',
    reveals:'gram', info:'Gram-positive walls stain purple (thick peptidoglycan); Gram-negative stain pink. Only meaningful for bacteria.'},
  methylene:{name:'Methylene blue', type:'test', short:'live/dead + DNA',
    reveals:'viability', info:'Stains nucleic acids; living cells pump the dye out, so pale = alive, deep blue = dead.'},
  dna_rna:  {name:'Nucleic-acid assay', type:'test', short:'DNA or RNA?',
    info:'Determines whether the genetic material is DNA or RNA — essential for classifying a virus.'},
  motility: {name:'Motility assay', type:'test', short:'how it moves',
    info:'Watches under the scope for movement — flagella, cilia or crawling pseudopodia — or confirms it is non-motile.'},
  pigment:  {name:'Pigment spectroscopy', type:'test', short:'chlorophyll?',
    info:'Scans for photosynthetic pigments such as chlorophyll — present in autotrophs, absent in heterotrophs.'},
  catalase: {name:'Catalase test', type:'test', short:'O₂ bubbles',
    info:'Adds hydrogen peroxide; bubbling means the cell makes catalase and respires with oxygen (an aerobe).'},
  endospore:{name:'Endospore stain', type:'test', short:'dormant spores',
    info:'Reveals heat-resistant endospores — a survival trick of certain bacteria and fungi.'},
  lipid:    {name:'Membrane-lipid assay', type:'test', short:'ester vs ether',
    info:'Bacteria & eukaryotes build membranes from ester-linked lipids; archaea use ether-linked lipids — the definitive way to tell an archaeon from a bacterium.'},
  // treatments (assignment)
  glucose:  {name:'Glucose feed', type:'treat', short:'organic food',
    info:'Organic sugar. Feeds heterotrophs (animals, fungi, most protists/bacteria). Useless to a strict autotroph.'},
  light:    {name:'Grow light', type:'treat', short:'photons for photosynthesis',
    info:'Drives photosynthesis in autotrophs with chloroplasts/thylakoids. Does nothing for heterotrophs.'},
  minerals: {name:'Mineral medium', type:'treat', short:'ions & nitrate',
    info:'Salts and nitrate. Supports autotrophs and chemotrophic bacteria; not an energy source for animals.'},
  antibiotic:{name:'Antibiotic', type:'treat', short:'targets bacteria',
    info:'Attacks peptidoglycan walls or 70S ribosomes — lethal to bacteria, harmless to your own cells and to viruses.'},
  antifungal:{name:'Antifungal', type:'treat', short:'targets fungi',
    info:'Disrupts chitin walls / fungal membranes. Hits fungi; spares bacteria and animal cells.'},
  antiviral:{name:'Antiviral', type:'treat', short:'blocks replication',
    info:'Blocks viral replication or entry. Works only on viruses — antibiotics never do.'},
  lysozyme: {name:'Lysozyme', type:'treat', short:'digests wall',
    info:'An enzyme that cracks peptidoglycan — bursts many bacteria; found in your tears and saliva.'},
  hypotonic:{name:'Hypotonic shock', type:'treat', short:'water floods in',
    info:'Pure water rushes in by osmosis. Wall-less cells swell and burst; walled cells resist.'},
  hypertonic:{name:'Hypertonic shock', type:'treat', short:'water drawn out',
    info:'Salty solution pulls water out. Cells shrink; plant cells plasmolyse (membrane peels from wall).'},
  toxin:    {name:'Cytotoxin', type:'treat', short:'broad poison',
    info:'A blunt, broad-spectrum poison. Damages almost anything — but it’s indiscriminate.'},
  host:     {name:'Host cell culture', type:'treat', short:'cells for a virus',
    info:'A dish of living host cells. A virus can only multiply inside them — nutrients alone won’t do.'},
  detergent:{name:'Detergent', type:'treat', short:'dissolves membranes',
    info:'Soap-like molecules dissolve lipid membranes — bursting enveloped viruses and archaea (ether-lipid membranes). Non-enveloped viruses shrug it off.'},
};

/* ---------------- DIFFICULTY TIERS ---------------- */
XS.TIERS = {
  intern:  {label:'Intern', hint:true, prescan:2, margin:1.35, decoys:0, drift:0.7,
    blurb:'Generous tolerances, on-screen hints, two structures pre-scanned. Learn the ropes.'},
  field:   {label:'Field Xenobiologist', hint:true, prescan:0, margin:1.0, decoys:1, drift:1.0,
    blurb:'The standard run. Hints on, nothing pre-scanned.'},
  director:{label:'Director', hint:false, prescan:0, margin:0.7, decoys:2, drift:1.25,
    blurb:'No hints, tight tolerances, decoy substances. For seasoned xenobiologists.'},
};

/* ---------------- RANKS (career progression) ----------------
   xp thresholds; each rank unlocks tougher content.
------------------------------------------------------------ */
XS.RANKS = [
  {name:'Trainee',        xp:0,   unlock:['Animalia','Plantae','Monera']},
  {name:'Lab Technician', xp:60,  unlock:['Protista']},
  {name:'Field Xenobiologist', xp:150, unlock:['Fungi']},
  {name:'Senior Xenobiologist', xp:280, unlock:['PlantTissue']},
  {name:'Microbiologist', xp:430, unlock:['Archaea']},
  {name:'Virologist',     xp:600, unlock:['Virus']},
  {name:'Xeno Director',  xp:820, unlock:[]},
];

/* ---------------- LEARN MORE: Wikipedia links + deeper notes ----------------
   Shown as a “Learn more ↗” link in the readout and Codex.
------------------------------------------------------------ */
const W='https://en.wikipedia.org/wiki/';
XS.WIKI = {
  membrane:W+'Cell_membrane', wall_cellulose:W+'Cell_wall', wall_chitin:W+'Cell_wall',
  wall_pepti:W+'Peptidoglycan', wall_slayer:W+'S-layer', capsule:W+'Bacterial_capsule',
  nucleus:W+'Cell_nucleus', nucleolus:W+'Nucleolus', nucleoid:W+'Nucleoid', plasmid:W+'Plasmid',
  ribosome:W+'Ribosome', mitochondrion:W+'Mitochondrion', chloroplast:W+'Chloroplast',
  thylakoid:W+'Thylakoid', vacuole_central:W+'Vacuole', vacuole:W+'Vacuole', contractile:W+'Contractile_vacuole',
  food_vacuole:W+'Vacuole', lysosome:W+'Lysosome', er_rough:W+'Endoplasmic_reticulum', golgi:W+'Golgi_apparatus',
  cytoskeleton:W+'Cytoskeleton', flagellum:W+'Flagellum', cilia:W+'Cilium', pseudopod:W+'Pseudopodia',
  pili:W+'Pilus', eyespot:W+'Eyespot_apparatus', spore:W+'Spore', septa:W+'Hypha', plasmodesmata:W+'Plasmodesma',
  centriole:W+'Centriole', xylem:W+'Xylem', phloem:W+'Phloem', capsid:W+'Capsid',
  genome_dna:W+'DNA_virus', genome_rna:W+'RNA_virus', envelope:W+'Viral_envelope', spike:W+'Spike_protein', tail_fiber:W+'Bacteriophage',
};
XS.KWIKI = {
  Animalia:W+'Animal', Plantae:W+'Plant_cell', PlantTissue:W+'Vascular_tissue', Monera:W+'Bacteria',
  Archaea:W+'Archaea', Protista:W+'Protist', Fungi:W+'Fungus', Virus:W+'Virus',
};
/* Optional deeper notes for headline structures */
XS.MORE = {
  mitochondrion:'Respiration happens across the folded inner membrane (cristae): glucose + oxygen → carbon dioxide + water + ~30 ATP. The more energy a cell needs, the more mitochondria it packs.',
  chloroplast:'Two stages: light reactions in the thylakoid stacks split water and capture light energy; the Calvin cycle in the stroma fixes CO₂ into sugar.',
  nucleus:'DNA never leaves the nucleus; instead, messenger RNA copies are exported through nuclear pores to the ribosomes.',
  ribosome:'The 30-nucleotide difference between bacterial 70S and human 80S ribosomes is exactly what antibiotics like tetracycline exploit.',
  wall_pepti:'Gram-positive bacteria have a thick peptidoglycan layer (stains purple); Gram-negative bacteria have a thin layer plus an outer membrane (stains pink).',
  wall_slayer:'Archaeal membranes use ether bonds and branched lipids — far more heat- and acid-stable than the ester lipids in every other living thing.',
  xylem:'Water is pulled up in an unbroken column by transpiration from the leaves — cohesion between water molecules holds the thread together to the treetop.',
  phloem:'Sugar is actively loaded at “sources” (leaves) and unloaded at “sinks” (roots, fruit); the pressure difference pushes sap through the sieve tubes.',
  capsid:'Capsids self-assemble from many identical protein subunits — an efficient way to package a genome with very few genes.',
  envelope:'Enveloped viruses steal a patch of the host’s membrane on the way out — which is also their weakness: soap or detergent dissolves it.',
};

/* ---------------- EARTH REFERENCE SPECIMENS ----------------
   Real organisms with accurate structures & biology. Mixed into the
   specimen pool for study; each maps to a kingdom you can classify.
   kind = kingdomKey. kill = agents it is actually vulnerable to.
------------------------------------------------------------ */
XS.EARTH = [
  {species:'Escherichia coli', kind:'Monera', gram:'-', autotroph:false, optPH:7, optT:37, kill:['antibiotic'],
    parts:[['wall_pepti',1],['capsule',1],['membrane',1],['nucleoid',1],['plasmid',2],['flagellum',1],['pili',1],['ribosome',16]],
    blurb:'The workhorse of biology labs — a rod-shaped gut bacterium and the most-studied organism on Earth.',
    fact:'One E. coli dividing every 20 minutes becomes billions overnight.', wiki:'Escherichia_coli'},
  {species:'Streptococcus pyogenes', kind:'Monera', gram:'+', autotroph:false, optPH:7, optT:37, kill:['antibiotic'],
    parts:[['wall_pepti',1],['capsule',1],['membrane',1],['nucleoid',1],['ribosome',16]],
    blurb:'Chains of round, Gram-positive bacteria — this species causes strep throat.',
    fact:'Its thick peptidoglycan wall stains deep purple in a Gram test.', wiki:'Streptococcus_pyogenes'},
  {species:'Methanocaldococcus jannaschii', kind:'Archaea', autotroph:true, chemo:true, optPH:6, optT:85, kill:['detergent'],
    parts:[['wall_slayer',1],['membrane',1],['nucleoid',1],['flagellum',1],['ribosome',14]],
    blurb:'A methane-making archaeon from a scalding deep-sea vent — no oxygen and no peptidoglycan.',
    fact:'Methanogens like this belch out most of the methane in swamps and cattle.', wiki:'Methanocaldococcus_jannaschii'},
  {species:'Halobacterium salinarum', kind:'Archaea', autotroph:false, optPH:7, optT:40, kill:['hypotonic'],
    parts:[['wall_slayer',1],['membrane',1],['nucleoid',1],['flagellum',1],['ribosome',14]],
    blurb:'A salt-loving archaeon from brine lakes — it needs saturated salt and bursts in fresh water.',
    fact:'It harvests light with a purple pigment, no chlorophyll required.', wiki:'Halobacterium_salinarum'},
  {species:'Amoeba proteus', kind:'Protista', autotroph:false, optPH:7, optT:24, kill:['hypotonic'],
    parts:[['membrane',1],['nucleus',1],['mitochondrion',3],['contractile',1],['food_vacuole',2],['pseudopod',1],['ribosome',9]],
    blurb:'A shape-shifting protist that crawls and engulfs prey with pseudopodia.',
    fact:'It has no fixed shape — it flows wherever it “decides” to go.', wiki:'Amoeba_proteus'},
  {species:'Paramecium caudatum', kind:'Protista', autotroph:false, optPH:7, optT:24, kill:['hypotonic'],
    parts:[['membrane',1],['nucleus',1],['mitochondrion',3],['contractile',1],['food_vacuole',2],['cilia',1],['ribosome',9]],
    blurb:'A slipper-shaped protist covered in beating cilia that sweep in food.',
    fact:'It has two nuclei — a big one for daily life and a small one for reproduction.', wiki:'Paramecium'},
  {species:'Chlamydomonas reinhardtii', kind:'Protista', autotroph:true, optPH:7, optT:24, kill:['hypotonic'],
    parts:[['membrane',1],['nucleus',1],['chloroplast',2],['eyespot',1],['flagellum',1],['contractile',1],['ribosome',9]],
    blurb:'A green single-celled alga that swims toward light with two whip-like flagella.',
    fact:'Its single cup-shaped chloroplast makes it a favourite model for photosynthesis.', wiki:'Chlamydomonas_reinhardtii'},
  {species:'Saccharomyces cerevisiae', kind:'Fungi', autotroph:false, optPH:5, optT:30, kill:['antifungal'],
    parts:[['wall_chitin',1],['membrane',1],['nucleus',1],['vacuole',1],['mitochondrion',3],['ribosome',9]],
    blurb:'Baker’s and brewer’s yeast — a single-celled fungus that ferments sugar into CO₂ and alcohol.',
    fact:'The very same yeast raises your bread and brews your beer.', wiki:'Saccharomyces_cerevisiae'},
  {species:'Human red blood cell', kind:'Animalia', autotroph:false, optPH:7.4, optT:37, kill:['hypotonic'], anucleate:true,
    parts:[['membrane',1],['cytoskeleton',1]],
    blurb:'A mature red blood cell — it ejects its nucleus and mitochondria to cram in oxygen-carrying haemoglobin.',
    fact:'It is the only human cell with no nucleus at all.', wiki:'Red_blood_cell'},
  {species:'Human motor neuron', kind:'Animalia', autotroph:false, optPH:7.4, optT:37, kill:['hypotonic'],
    parts:[['membrane',1],['nucleus',1],['nucleolus',1],['mitochondrion',5],['er_rough',1],['golgi',1],['lysosome',3],['ribosome',12]],
    blurb:'A nerve cell whose long fibre carries electrical signals from spinal cord to muscle.',
    fact:'A single motor neuron can be over a metre long.', wiki:'Motor_neuron'},
  {species:'Palisade mesophyll cell', kind:'Plantae', autotroph:true, optPH:7, optT:24, kill:['hypertonic'],
    parts:[['wall_cellulose',1],['membrane',1],['vacuole_central',1],['chloroplast',8],['nucleus',1],['mitochondrion',2],['ribosome',7]],
    blurb:'A leaf cell packed with chloroplasts near the upper surface — the plant’s main sugar factory.',
    fact:'Its chloroplasts even shuffle around inside the cell to catch the most light.', wiki:'Palisade_cell'},
  {species:'Influenza A virus', kind:'Virus', isVirus:true, autotroph:false, optPH:7, optT:37, kill:['antiviral','detergent'],
    parts:[['capsid',1],['genome_rna',1],['envelope',1],['spike',8]],
    blurb:'The flu — an enveloped RNA virus whose surface spikes (H and N) mutate every year.',
    fact:'Because its spikes keep changing, you need a fresh flu shot annually.', wiki:'Influenza_A_virus'},
  {species:'Bacteriophage T4', kind:'Virus', isVirus:true, autotroph:false, optPH:7, optT:37, kill:['antiviral'],
    parts:[['capsid',1],['genome_dna',1],['tail_fiber',1]],
    blurb:'A virus that preys on bacteria, injecting its DNA through a syringe-like tail.',
    fact:'Phages are the most abundant biological entities on Earth — ~10³¹ of them.', wiki:'Escherichia_virus_T4'},
  {species:'Tobacco mosaic virus', kind:'Virus', isVirus:true, autotroph:false, optPH:7, optT:24, kill:['antiviral'],
    parts:[['capsid',1],['genome_rna',1]],
    blurb:'The first virus ever discovered (1892) — a rod-shaped, non-enveloped plant virus.',
    fact:'It’s so tough it can survive for years in dried tobacco leaves.', wiki:'Tobacco_mosaic_virus'},
];

})(window.XS);
