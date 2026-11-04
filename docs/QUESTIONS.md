# RIFTFORGE — QUESTIONS (à répondre par l'humain)

Classées par itération / thème. Les questions de playtest résolues par des fixes sont dans
`docs/BUGS.md` (B1-B25). ✅ = répondu par l'humain (réponses enregistrées le 04/11).

## Résolues ✅
- Q0-4 ✅ : de vrais assets (Kenney CC0 / générés) seront intégrés en V1.x — voir BACKLOG.
- Q0-6 ✅ : confirmé — combat auto quand un monstre est sur une case adjacente (décision validée).
- Q0-7 ✅ : le design « Sélectionner » puis attaquer est validé ; PLUS : ordre d'initiative façon FF
  implémenté (chaque personnage choisit son action à son tour) — `tests/combat-initiative.test.ts`.
- Q0-8 ✅ : plafond de niveau ~5 conservé pour la V1.
- Q0-9 ✅ : 1 seul compagnon d'équipe en V1 (conservé).
- Q4-1/Q4-3 ✅ : la fusion est bien disponible en combat (coûte le tour) — le bouton était caché,
  corrigé (B25 : sélecteur d'orbes + « ✦ Fusionner » dans le menu Modules en combat).
- Q5-1 ✅ : avec le biome 1 seul, une run fait ~5 min max — OK pour la V1 (cible 10-15 min avec
  les 4 biomes).
- Q7-1 ✅ : fuzz poussé à 1000 sessions en CI (FUZZ_SESSIONS=1000 dans le workflow).
- Q7-2 ✅ : job e2e Playwright ajouté au workflow CI (`npx playwright test` après build).

## Itération 0 / socle
- Q0-1 : L'adaptateur localStorage vit hors de `src/core/` (`src/ui/storage.ts`) pour respecter
  « zéro DOM dans le core » — OK comme emplacement définitif ?
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
- Q4-2 : Les recettes « à base de composites » (Vapeur+Terre, Magma+Eau, Combustion+Terre) sont
  dépliées en 3 primordiales (palier 3) — OK pour la V1 ?

## Itération 5
- Q5-2 : Le bot de simulation meurt vite (R5-07 : 0.00 %, 3.9 tours) — équilibrage TODO-BALANCE à
  arbitrer à la main d'après ces chiffres.

## Préparation 6-9 (P6)
- Q6-1 : Quels assets (Kenney CC0 / générés) pour les portraits de monstres et boss (§SPEC-11) ?
- Q6-2 : La Liaiseuse (PNJ lien, it. 8) — introduite en V1.x avec quels dialogues minimum ?

## Tests / outillage
(Q7-1/Q7-2 résolues ✅ — voir en-tête)

## Itération 6 (session R6-00 → R9-06)
- Q6-3 (substitution R6-09) : kenney.nl n'est PAS téléchargeable depuis l'environnement de
  build -> assets générés en code (`scripts/generate-assets.mjs`, SVG dans `public/assets/`,
  licence dans `public/assets/LICENSE.md`). À remplacer par les vrais packs Kenney CC0 +
  licence lors d'une session avec accès réseau. Aucun asset externe au runtime.
- Q6-4 (choix R6-00) : la simulation du bot compétent est mono-run sans compagnon (la
  capture n'a d'effet que sur la run suivante via la Forge) — le taux 65.90 % est mesuré
  sur le biome 1 seul, kit de départ.
