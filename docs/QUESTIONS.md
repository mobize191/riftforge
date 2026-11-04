# RIFTFORGE — QUESTIONS (à répondre par l'humain le matin)

## Itération 0
- Q0-1 : L'adaptateur localStorage vit hors de `src/core/` (dans `src/ui/storage.ts`) pour respecter
  la règle « zéro DOM dans le core » — OK comme emplacement définitif ?

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
