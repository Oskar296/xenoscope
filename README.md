# 🔬 XENOSCOPE — Field Xenobiology

An **educational** biology game with a **macro → micro** loop. You're a field
xenobiologist studying a whole alien organism on its exoplanet — a **fauna**
(animal‑grade beast), **flora** (plant), or **fungal** body. You get **one of two
orders**:

- 💚 **Preserve** — the organism is sick. Find the afflicted tissue, diagnose the
  infection, and cure it before it dies.
- ☠️ **Neutralize** — the organism is an invasive threat. Find the tissue it can’t
  defend and take the whole thing down.

You **zoom into its tissues** to reach the cells, inspect their organelles (real
biology, with “Learn more ↗” links), read the diagnosis, then apply the right
treatment. The biology is honest — **antivirals only work on viruses, antibiotics
only on bacteria, osmotic shock only bursts wall‑less cells**, and so on — so the
wrong treatment does nothing. You genuinely learn cell biology as you rank up.

No build step, no dependencies. Works on **desktop and mobile**.

## ▶ Play

Serve the folder and open it (recommended, so progress saves):

```bash
cd xenoscope
python3 -m http.server 8000   # then open http://localhost:8000
```

Or just open `index.html` (some browsers disable saved progress on `file://`).

## The loop: **survey → zoom → treat**

1. **Survey.** See the whole creature on its exoplanet and read your orders
   (Preserve or Neutralize). Glowing **markers** sit on each anatomical region.
2. **Zoom in.** Click a marker to enter that tissue — you see its **cells**, can
   **inspect organelles** to learn their biology, and get a **diagnosis**. In an
   infected region you’ll literally see the **pathogen particles** (a virus,
   bacteria or fungal threads) crowding the cells.
3. **Treat.** Apply a treatment to the tissue you’re in:
   - **Preserve** → match the cure to the pathogen (antiviral / antibiotic /
     antifungal).
   - **Neutralize** → exploit the creature’s cell weakness (osmotic shock for a
     wall‑less animal, herbicide for a walled plant, antifungal for a fungus).

   The right tissue + the right agent wins. Wrong ones cost you host stress /
   let the organism adapt — so diagnose before you dose.

## Depth & replayability

- **Three organism forms** on **five exoplanets**, procedurally drawn.
- **Difficulty tiers** (Intern / Field / Director — Director hides the treatment
  recommendation, so you must reason from the biology).
- **XP & ranks**, a growing **Codex** of organelles and cell types, **10
  achievements** with unlock toasts, and a seeded **🗓 Daily** assignment with a
  shareable result.
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
