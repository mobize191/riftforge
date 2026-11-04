# RIFTFORGE — QUESTIONS (à répondre par l'humain)

Classées par itération / thème. Les questions de playtest résolues par des fixes sont dans
`docs/BUGS.md` (B1-B24).

## Itération 0 / socle
- Q0-1 : L'adaptateur localStorage vit hors de `src/core/` (`src/ui/storage.ts`) pour respecter
  « zéro DOM dans le core » — OK comme emplacement définitif ?
- Q0-4 : Les sprites sont des formes générées en code (aucun asset externe autorisé la nuit) —
  style « pictogrammes » OK, ou prioriser des packs Kenney CC0 pour monstres/portraits (§SPEC-11) ?
- Q0-6 : Le combat se déclenche aussi sur case **adjacente** — pas trop fréquent/inescapable en jeu réel ?
- Q0-7 : Vocabulaire « Sélectionner » puis « Attaquer » (au lieu de « Cibler ») — mieux ?
- Q0-8 : Niveau de run plafonné à ~5 volontairement (§SPEC R1-05) — OK, ou monter le plafond en V1.x ?
- Q0-9 : 1 seul compagnon en équipe en V1 (§SPEC-7.2 « V1 : 1 »), workers multiples OK — passer à
  2 slots d'équipe en V1.x ?
- Q0-10 : « Tout maxé » = périmètre V1 (1 biome) atteint — la suite (itérations 6-9) est listée
  dans docs/BACKLOG.md, avec données déjà prêtes (biomes 2-4, bâtiments V1, paliers de lien).

## Itération 1
- Q1-1 : Le marchand ne vend que 3 équipements achetables — liste à étoffer en V1.x ?

## Itération 2
- Q2-1 : 1 tick de production = 1 s côté UI — cadence ressentie OK en playtest ?
- Q2-2 : La Forge Arcane produit des « lingots » (intermédiaire) — nom/usage à confirmer en it. 6.

## Itération 3
- Q3-1 : Le compagnon agit via menu « Compagnons » (compétences déclenchées, gratuites, 1 fois/tour)
  — OK pour la V1 ?
- Q3-2 : 30 % des attaques ennemies visent le compagnon (TODO-BALANCE) — à calibrer.

## Itération 4
- Q4-1 [playtest R4-07] : La fusion en combat (coûte 1 tour) ralentit-elle le rythme ? Le grimoire
  (3 compositions) suffit-il comme soupape ?
- Q4-2 : Les recettes « à base de composites » (Vapeur+Terre, Magma+Eau, Combustion+Terre) sont
  dépliées en 3 primordiales (palier 3) — OK pour la V1 ?
- Q4-3 [playtest] : Le menu Modules liste maintenant solo + créés + recettes découvertes réalisables
  — le rythme reste OK avec beaucoup d'orbes ?

## Itération 5
- Q5-1 [playtest R5-06] : Une run complète du biome 1 (4 sols + boss) dure combien de temps en
  jouant vraiment, quelles frictions ? (cible : ~10-15 min)
- Q5-2 : Le bot de simulation meurt vite (R5-07 : 0.00 %, 3.9 tours) — équilibrage TODO-BALANCE à
  arbitrer à la main d'après ces chiffres.

## Préparation 6-9 (P6)
- Q6-1 : Quels assets (Kenney CC0 / générés) pour les portraits de monstres et boss (§SPEC-11) ?
- Q6-2 : La Liaiseuse (PNJ lien, it. 8) — introduite en V1.x avec quels dialogues minimum ?

## Tests / outillage
- Q7-1 : Le fuzz tourne à 200 sessions en CI ; pousser à 1000+ en CI (durée ~55 s pour 5000 en
  one-shot) ? `FUZZ_SESSIONS=5000 pnpm vitest run tests/fuzz-bot.test.ts`.
- Q7-2 : Lancer `pnpm build && pnpm test:e2e` (Playwright) en local/CI avec navigateur — le
  bac à sable ne peut pas exécuter Chromium (pas de libs système). Ajouter un job e2e dédié ?
