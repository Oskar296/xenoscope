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
XS.KLIST = ['Animalia','Plantae','Monera','Protista','Fungi','Virus','PlantTissue'];

/* Kingdom you must pick in the quiz (PlantTissue folds into "Plant") */
XS.CLASSIFY = ['Animal','Plant','Bacterium','Protist','Fungus','Virus'];
XS.KINGDOM_ANSWER = {Animalia:'Animal',Plantae:'Plant',PlantTissue:'Plant',Monera:'Bacterium',Protista:'Protist',Fungi:'Fungus',Virus:'Virus'};

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
  {name:'Virologist',     xp:450, unlock:['Virus']},
  {name:'Xeno Director',  xp:680, unlock:[]},
];

})(window.XS);
