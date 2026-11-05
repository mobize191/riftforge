# RIFTFORGE — ASSETS : portraits générés par IA (style anime)

> 23 portraits générés par IA (Mistral) pour Riftforge, style anime cel-shadé cohérent,
> palettes par biome respectées (cf. `BIOME_PALETTES` dans `src/data/biomes.ts`).
> Licence : générés pour ce projet — utilisation libre dans Riftforge, tous droits réservés au projet.
> **Fichiers déposés dans `public/assets/portraits/`** (session R10-08, 24 portraits, 512x512, ~10 Mo).
> Tant qu'un fichier est absent, le fallback code-gen reste la règle (BRIEF-6-9 §2) — jamais d'écran vide.

## Convention de nommage (fichets attendus dans `public/assets/portraits/`)

| Fichier | Entité (id code) | Usage |
|---|---|---|
| heros.png | joueur (technomancien) | portrait + sprite carte |
| mousse.png | mousse / mousse-recrue (+ elite- par teinte) | monstre biome 1 + compagnon |
| sporeling.png | sporeling | monstre biome 1 |
| champignon-cuirasse.png | cuirasse | monstre biome 1 |
| amas-spores.png | amas | monstre biome 1 |
| racine-mere.png | boss racine-mere | boss biome 1 (R5-01) |
| fouineur.png | fouineur | monstre biome 2 (R6-01) |
| sapeur.png | sapeur | monstre biome 2 |
| arroseur.png | arroseur | monstre biome 2 |
| horloge-cassee.png | horloge-cassee | monstre biome 2 |
| grand-index.png | boss grand-index | boss biome 2 |
| brasero.png | brasero | monstre biome 3 (R6-02) |
| geyser.png | geyser | monstre biome 3 |
| spectre-cendre.png | cendre | monstre biome 3 |
| magmaton.png | magmaton | monstre biome 3 |
| coeur-fournaise.png | boss coeur-fournaise | boss biome 3 |
| wyrm.png | wyrm | monstre biome 4 (R6-03) |
| vampire-reseau.png | vampire-reseau | monstre biome 4 |
| drone-corrompu.png | drone-corrompu | monstre biome 4 |
| tisseuse.png | tisseuse | monstre biome 4 |
| noeud-final.png | boss noeud-final | boss biome 4 |
| marchand.png | PNJ Marchand | écran Forge (§SPEC-6.2) |
| constructeur.png | PNJ Constructeur | écran Forge |
| liaiseuse.png | PNJ Liaiseuse | écran Forge (R8-04) — déposé |

## Intégration attendue (quand les fichiers seront présents)

- **Portraits de combat** (§SPEC-5.1) : `CombatScreen` affiche le portrait de l'ennemi (idle),
  la télégraphie d'attaque superpose un effet (flash/teinte) sur le portrait — pas d'animation dédiée requise en V1.
- **Sprites de carte** : downscale des portraits en textures 32 px (ou recadrage du sujet),
  avec **fallback code-gen si fichier absent** (jamais d'écran vide).
- **Marqueurs de lien** (R8-02) : teinte/aura par palier appliquée par-dessus le portrait du compagnon.
- **Élite** : teinte surchargée du portrait de base (pas de fichier séparé).
- Chemins **relatifs** (`assets/portraits/...`), chargement client, aucune dépendance réseau.
- Aucune modification du core : c'est de la présentation UI uniquement.
