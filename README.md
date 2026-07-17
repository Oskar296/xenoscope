# 🔬 XENOSCOPE — Cell Biology Lab

An **educational** alien-biology game. You investigate one specimen at a time —
it could be an **animal, plant, bacterium, protist, fungus, virus,** or a piece of
**plant vascular tissue** — identify its organelles and biology, then carry out an
assignment. You genuinely learn real cell biology as you rank up.

Built to be **rich but approachable**: ~60% knowledge, 40% action. No build step,
no dependencies — plain HTML/CSS/JS split across several files.

## ▶ Play

Serve the folder and open it (recommended, so progress saves):

```bash
cd xenoscope
python3 -m http.server 8000   # then open http://localhost:8000
```

You can also open `index.html` directly, though some browsers disable saved
progress on `file://`.

## The loop: **investigate → classify → decide**

1. **Investigate (untimed).** Click every structure on the specimen to identify it —
   each reveals its **name, function, and a fact**, and unlocks a Codex entry. Run
   **reagent tests** (iodine for starch, Gram stain, methylene blue) for more clues.
2. **Classify.** Name the specimen's kingdom. Correct answers earn more XP; wrong
   guesses cost you a little.
3. **Assignment.** Carry out the order (cultivate, neutralise, stabilise, bloom,
   quarantine) using the medium and reagents.

## Selective toxicity — why identification matters

The biology is honest, so the **right tool for the organism works and the wrong one
barely does**:

- **Antibiotics** kill bacteria (peptidoglycan wall / 70S ribosome) — useless on
  viruses and your own cells.
- **Antivirals** work only on viruses; **antifungals** only on fungi.
- **Osmotic shock** bursts wall-less cells (animal, protist) but walled cells resist.
- **Autotrophs** need **light + minerals** (photosynthesis); feeding them sugar does
  nothing. **Heterotrophs** need **glucose**. A **virus** needs a **host cell culture**.

Use the wrong agent and you'll waste the assignment — so read the specimen first.

## Every organelle, named

No more generic "organelles" — you inspect and learn each one individually:
**nucleus, nucleolus, nucleoid, mitochondria, chloroplasts, thylakoids, ribosomes,
rough ER, Golgi apparatus, lysosomes, vacuoles, contractile & food vacuoles, cell
walls (cellulose / chitin / peptidoglycan), capsule, flagella, cilia, pili,
pseudopodia, plasmids, spores, centrioles, eyespot**, the plant tissues **xylem &
phloem**, and viral parts **capsid, genome, envelope, spikes, tail fibres** — each
with its real function and a memorable fact.

## Difficulty: tiers **and** career progression

- **Tiers** — *Intern* (generous tolerances, hints, pre-scanned structures),
  *Field Xenobiologist* (standard), *Director* (no hints, tight margins, decoy
  reagents).
- **Career** — earn XP for inspecting structures, classifying correctly and
  completing assignments. Ranking up **unlocks tougher organisms** (protists →
  fungi → plant tissue → viruses) and grows your **Codex**. Progress is saved
  locally.

## Project layout

```
xenoscope/
  index.html         · shell
  css/styles.css     · all styling
  js/
    data.js          · organelles, organisms, substances, tasks, ranks (content)
    sim.js           · specimen generation + assignment biology model
    draw.js          · canvas renderer (cells, viruses, tissue, every organelle)
    game.js          · phases, XP/rank progression, Codex (localStorage)
    ui.js            · panels, overlays, input
    main.js          · bootstrap + game loop
```

Plain `<script>` tags, one global `XS` namespace — no bundler, runs anywhere.

*Every specimen is generated fresh and is original to this project; the biology it
teaches is real.*
