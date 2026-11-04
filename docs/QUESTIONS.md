# RIFTFORGE — QUESTIONS (à répondre par l'humain le matin)

## Retours playtest (matin 2)
- Q0-4 : les sprites sont des formes générées en code (pas d'assets externes autorisés) — est-ce que
  ce style « pictogrammes » convient, ou faut-il prioriser des packs Kenney CC0 pour les monstres ?
- Q0-5 : le menu combat liste désormais les modules créés + les recettes découvertes réalisables
  (bouton « Créer ») — le rythme reste-t-il OK avec beaucoup d'orbes ?

## Itération 0 (retour playtest téléphone)
- Q0-2 [fix R0-07] : flashs noirs à intervalle régulier -> cause = recréation du jeu Phaser à chaque
  déplacement (deps du useEffect). Corrigé : création unique par sol. À re-vérifier sur téléphone.
- Q0-3 [fix R0-07] : contrôles tactiles ajoutés (pavé ▲▼◀▶ + E, hit-zones 56 px). Le clavier reste
  disponible. Confort du pavé à valider en jouant.

## Itération 0
- Q0-1 : L'adaptateur localStorage vit hors de `src/core/` (dans `src/ui/storage.ts`) pour respecter
  la règle « zéro DOM dans le core » — OK comme emplacement définitif ?

## Itération 1
- Q1-1 : le marchand ne vend que 3 équipements achetables (R1-06) — liste à étoffer en V1.x ?

## Itération 2
- Q2-1 : 1 tick de production = 1 s côté UI — cadence ressentie à vérifier en playtest (R2-06).
- Q2-2 : la Forge Arcane produit des « lingots » (intermédiaire) — nom/usage à confirmer en it. 6.

## Itération 3
- Q3-1 : le compagnon agit automatiquement à son initiative (meilleure compétence de soin) plutôt
  que via un menu dédié — OK pour la V1, ou menu « Compagnons » à rendre actif ?
- Q3-2 : 30 % des attaques ennemies visent le compagnon (TODO-BALANCE) — à calibrer.

## Itération 4
- Q4-1 [playtest R4-07] : la fusion en combat (coûte 1 tour) ralentit-elle le rythme ressenti ?
  Le grimoire pré-enregistré (3 compositions) suffit-il comme soupape ? À mesurer en jouant.
- Q4-2 : les recettes "à base de composites" (Vapeur+Terre, Magma+Eau, Combustion+Terre) sont
  dépliées en 3 primordiales (palier 3) faute de vraies orbes composites nommées — OK pour la V1 ?

## Itération 5
- Q5-1 [playtest R5-06] : une run complète du biome 1 (4 sols + boss) dure combien de temps en
  jouant vraiment, et quelles frictions apparaissent ? (cible : ~10-15 min)
- Q5-2 : le bot de simulation meurt vite (2 combats sur le seed 4242) — l'équilibrage TODO-BALANCE
  est à arbitrer à la main d'après R5-07.

## Préparation 6-9 (P6)
- Q6-1 : quels assets Kenney CC0 / générés en code pour les portraits de monstres et boss (étude §SPEC-11) ?
- Q6-2 : la Liaiseuse (PNJ lien, it. 8) — introduce en V1.x avec quels dialogues minimum ?
