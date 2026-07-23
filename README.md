# 🔬 XENOSCOPE — Field Xenobiology

An **educational** biology game with a **macro → micro** loop. You're a field
xenobiologist studying a whole alien organism on its exoplanet — drawn from a
catalogue of **42 species across the six kingdoms of life** (animals, plants,
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

- **42 species across six kingdoms** on **six exoplanets** — 37 distinct body‑plans
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
