# RIFTFORGE — BACKLOG (idées hors périmètre, jamais codées en avance)

## Itérations 6-9 (post-V1, non codées pendant la nuit — contrat respecté)
- **It. 6 — Biomes 2-4** : Datacathédrales/données/gremlins, Hauts-Fourneaux/mercurium/élémentaires,
  Fibration/optifibre/vermine + boss final. Données squelettes déjà prêtes : `src/data/biomes.ts`
  (`BIOME_SKELETONS`). Chaîne matière complète (Purificateur, Nanolathe), ~10 bâtiments V1
  (`src/data/buildings.ts` `BUILDINGS_V1` + `NEIGHBOR_BONUSES`), Maison du héros, contrats étendus.
- **It. 7 — Modificateurs de Faille** : déblocage après 1er clear, jauge d'instabilité, élites,
  +niveaux, affinités brouillées, orbes plus rares ; défis à tours limités déjà en place (autel).
- **It. 8 — Lien** : paliers 1-5 (Étincelle→Fusion), marqueurs visuels, conditions d'évolution par
  type, Liaiseuse, compagnons nommables — données prêtes : `src/data/bond.ts`.
- **It. 9 — Polish** : équilibrage (simulations R1-07/R4-08/R5-07 à arbitrer), responsive final,
  audio (jsfxr), juice, export/import de save JSON.

## V1.x (compléments du premier jouable)
- 2e ressource par biome, plus de monstres/contrats/défis, PNJ Liaiseuse (dialogues minimum).
- Packs d'assets réels (Kenney CC0 / itch.io) pour monstres, portraits, décors (§SPEC-11).
- 2 slots d'équipe (Q0-9), plafond de niveau > 5 (Q0-8) si validé.

## Outillage
- Job CI e2e dédié (Playwright) quand un runner avec navigateur sera dispo (Q7-2).
- Fuzz à 1000+ sessions en CI (Q7-1).
