# 🔬 XENOSCOPE — Field Xenobiology

An **educational** biology game with a **macro → micro** loop. You're a field
xenobiologist studying a whole alien organism on its exoplanet — drawn from a
catalogue of **55 species across ten kingdoms** (animals, plants,
fungi, protists, bacteria and archaea) — and **every individual is unique**: its
colour, size, proportions, limb/spine counts and skin pattern are rolled fresh,
so no two look alike. You get **one of two orders**:

- 💚 **Preserve** — the organism is sick. Work out *what* is attacking it, find the
  afflicted tissue, and apply the one correct cure before it dies.
- ☠️ **Neutralize** — the organism is an invasive threat. Work out *what kind of
  organism* it is, find the tissue it can’t defend, and hit its one true weakness.

The cause is **hidden**. You **zoom into its tissues**, run **lab assays** (Gram
stain, membrane‑lipid, pigment, motility, nuclear stain…), inspect organelles
(real biology, with “Learn more ↗” links), and read the **evidence** you gather.
Only when you can **commit a correct diagnosis** do treatments unlock — and the
biology is honest: **antivirals only work on viruses, antibiotics only on bacteria
(never archaea — they have no peptidoglycan), osmotic shock only bursts wall‑less
cells**, and so on. Wrong calls are punished, harder on higher tiers, so you can’t
win by guessing — you have to actually reason it out.

No build step, no dependencies. Works on **desktop and mobile**.

## ▶ Play

Serve the folder and open it (recommended, so progress saves):

```bash
cd xenoscope
python3 -m http.server 8000   # then open http://localhost:8000
```

Or just open `index.html` (some browsers disable saved progress on `file://`).

**Play in your browser now** (no install):
[raw.githack.com/Oskar296/xenoscope/main/index.html](https://raw.githack.com/Oskar296/xenoscope/main/index.html)

### 📋 Field Formulary (cure cheat‑sheet)

A companion reference — which **raw material + preparation step** makes the right
cure for every affliction and every organism. It's built into the game (the
**📋 Formulary** button on the menu, and **📖 Formulary** on the synthesis bench,
which highlights the recipe for your current case), and also hosted as a
standalone page:
[`formulary.html`](https://raw.githack.com/Oskar296/xenoscope/main/formulary.html).

## The loop: **survey → analyse → diagnose → treat**

1. **Survey.** See the whole creature on its exoplanet and read your orders
   (Preserve or Neutralize). Glowing **markers** sit on each anatomical region.
2. **Analyse.** Click a marker to zoom into a tissue and meet its **cells**. Run
   **lab assays** and **inspect organelles** — each result is a real clue that lands
   in your **Evidence** log. A structural assay reveals whether *this* tissue is the
   soft target; an infected region literally shows the **invader particles**.
3. **Diagnose.** Hit **⌖ Identify** and commit a call — the pathogen (Virus /
   Bacterium / Fungus / Parasite) for Preserve, or the organism’s kingdom for
   Neutralize. A wrong call raises the fail meter; a right one **unlocks the
   treatments**.
4. **Treat.** Pick from the full agent slate. The one that matches the biology wins;
   everything else is punished — e.g. an **archaeon shrugs off antibiotics** (no
   peptidoglycan) and only falls to **detergent**, which you can only know by
   running the membrane‑lipid assay.

## Depth & replayability

- **55 species across ten kingdoms** on **six exoplanets** — 37 distinct body‑plans
  (medusa, arthropod, cephalopod, worm, anemone, crinoid, urchin, diatom,
  radiolarian, coral & bracket fungus, puffball, biofilm, stromatolite, archaeal
  vent colony…) × **per‑individual procedural morphology** (and the zoomed-in cells are varied per individual too — colour, shape, size, organelle counts), so the bestiary is
  effectively unlimited.
- **A real deduction loop** — the answer is hidden; you gather evidence with **10
  lab assays** + organelle inspection, then commit a diagnosis before you can treat.
- **6 kinds of affliction** — virus, bacterium, fungus, parasite, **prion** (only a
  denaturant works) and **chemical toxin** (no organism at all — needs an antitoxin).
- **8 complications** that recombine onto any specimen — drug‑resistant, biofilm
  shield, mutualistic symbiont, virulent, extreme habitat, **co‑infection** (two
  cures), **necrotic decoy** (a false target) and **rapidly‑mutating**.
- **Three very different modes.** ⚡ **Quick** — pick a ready-made treatment; fast, punchy runs. ⚗ **Advanced** — much more time, and a hands-on **synthesis bench** where you *make* the cure the way real medicine is made: take a **raw natural material** (Penicillium mould, cinchona bark, sweet wormwood, egg white, sea salt, plant oil + lye, immune serum, activated charcoal…) and work it through a real **preparation step** — **ferment, extract, heat/react, filter**. Watch the flask fill, bubble and glow as it resolves into a real drug (penicillin from mould, quinine from bark, soap from oil + lye by saponification, antivenom from serum), then **test it on a cultured sample** — see the invader cells rupture and clear, or shrug it off — before you administer.
- 🌡 **Precision synthesis.** "Heat" is never just heat — **every process has an exact
  temperature** you dial in, and it has to be right or nothing usable forms: Penicillium
  cultures at **24 °C**, artemisinin extracts warm at **50 °C** (boil it and you destroy the
  peroxide bridge that kills the parasite), saponification needs a **100 °C** rolling boil,
  antibody serum must be purified cold at **4 °C** or it denatures, and prions need a real
  **134 °C** autoclave because they survive ordinary boiling. The flask glows and boils
  harder as you turn up the dial.
- ⚗️ **Reagents you build from precursors.** Some things aren't on the shelf at all. Need a
  nucleoside analogue? You **synthesise the nucleoside stock first** — **ribose sugar + a
  modified purine base, coupled at 60 °C** (too cold and it won't couple; too hot and the
  sugar caramelises) — *then* use it to make the antiviral.
- 🛸 **First Contact — alien *species*, not alien diseases.** Six organisms from **four
  kingdoms with no Earth ancestry**, each with its own body plan, anatomy, cell structure
  and weakness: a **Silicoid** crystal spire that grows by mineral accretion and has no
  membrane, no genome and no water (only a **fluoride flux** touches it); a **Plasmoid** —
  ionised gas held in shape by its own magnetic loops, with nothing chemical to poison at
  all, so you **cryogenically quench** it until the field collapses; an **Ammonoid**
  cryophile, a real nucleated cell running on liquid ammonia at −40 °C, undone by ordinary
  **warm water**; and a **Metallophyte** rock-eater armoured in the iron oxide it excretes,
  which needs a **chelator** to strip the metal ions it respires. Their assays read back
  alien too — "no lipids: no membrane exists to sample", "reads thousands of degrees, but
  that is ion temperature, not a habitat" — and they have alien anatomy (growth apex,
  confinement loops, ammonia reservoir, redox vents) instead of Earth tissues.
- 👽 **Xeno mode — biology that breaks Earth's rules.** The name finally earns itself:
  afflictions that are *not* carbon-and-water life, where your whole normal shelf fails
  and you need chemistry aimed at the new rule. A **silicate lattice** built from
  silicon–oxygen, not carbon — every Earth drug is shaped for carbon life and slides off,
  so you make a **fluoride flux** (fluorspar + acid at 120 °C — the real chemistry that
  etches glass). **Mirror-life**, whose every sugar and amino acid is the mirror image of
  ours, so our drugs are the wrong hand and can't bind — you invert one with a **chiral
  catalyst** into its **enantiomer**. A **radiotroph** that *eats* radiation, so poisons and
  heat only feed it — you have to starve it behind a **boron neutron shield**. And
  **ammono-life** at −40 °C whose solvent is liquid ammonia — to which ordinary **warm
  water** is a violently destructive solvent. Each one teaches that our "universal" rules
  are just the assumptions of one biochemistry.
- 🧬 **Ultra mode — named real diseases.** The bench, but against **15 famous real pathogens** with case‑file dossiers: **COVID‑19, influenza, HIV, herpes, tuberculosis, strep, MRSA, cholera, ringworm, thrush, malaria, river blindness, CJD, botulism, snakebite**. Each names its **actual front‑line drug** and points at the exact recipe that represents it — synthesise the *precise* textbook drug (remdesivir for COVID, artemisinin‑from‑wormwood for malaria, griseofulvin for ringworm, antivenom serum for a bite) and earn a **“textbook drug of choice”** bonus. It teaches where medicine really comes from, not just drug *classes*.
- 🌊 **Outbreak — a scored survival run.** The arcade heart of the game: cases come
  back‑to‑back against a collapsing **Colony Vitality** bar. Solve fast *and* clean
  to earn a per‑case grade (**S / A / B / C**), a rising **combo multiplier** and
  score; every lost patient tears 34 off the colony. Cases **escalate** from Intern →
  Field → Director with stacking complications, and the odd **⭐ high‑value (×2)** or
  **⚠ fast‑spreading** case shakes up the rhythm. It runs until the colony collapses —
  then you chase a **persistent high score**. A live HUD tracks case, colony, score,
  combo and a ticking clock, so there's always a "one more case" reason to keep going.
- **Difficulty tiers** (Intern / Field / Director). Field & Director require a correct
  diagnosis and punish wrong calls; **Director adds up to two complications and a
  limited assay budget**, so you must choose which tests to spend.
- **XP & ranks**, a growing **Codex**, **15 achievements** with unlock toasts, and a
  seeded **🗓 Daily** assignment with a shareable result.
- **Sound**: synth SFX, volume slider, ambient toggle. Honours reduced‑motion.

## Project layout

```
xenoscope/
  index.html         · shell
  css/styles.css     · all styling
  js/
    data.js          · organelles, cell kingdoms, reagents, ranks, wiki links
    sfx.js           · Web-Audio sound engine
    sim.js           · cell generation (used for the zoomed-in views)
    world.js         · macro organisms, planets, regions, scenario + treat logic
    draw.js          · canvas renderer — planets, creatures, cells, organelles
    game.js          · phases, progression (XP/ranks), Codex, achievements, daily
    ui.js            · panels, overlays, input
    main.js          · bootstrap + game loop
```

Plain `<script>` tags, one global `XS` namespace — no bundler, runs anywhere.

*Every organism, planet and affliction is generated fresh; the biology it teaches
is real.*
