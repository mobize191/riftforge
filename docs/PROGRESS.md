# RIFTFORGE — PROGRESS (session de nuit, ARRÊT APRÈS P6-D)

- **Dernier commit publié** : `f89a5f6` (P6-C) — branche `main`, poussée sur GitHub.
- **URL Pages** : `https://mobize191.github.io/riftforge/` — inaccessible tant que le repo est privé
  (attendu) ; le job `deploy` du workflow reste **skipped** (neutre) tant que `private == true`.
- **Workflow CI** : vert (`build` OK, `deploy` skipped) sur les derniers commits poussés.
- Preuves : `pnpm install && pnpm vitest run && pnpm build` → exit 0 (42 fichiers de tests, 118 tests).

## État par ticket

| Ticket | État | Notes |
|---|---|---|
| R0-01 | done | scaffold Next.js 15 + TS strict + pnpm + vitest |
| R0-02 | done | types du core |
| R0-03 | done | RNG seedé mulberry32 |
| R0-04 | done | machine à états boucle Forge/Run/Combat/Retour |
| R0-05 | done | sauvegarde versionnée + StoragePort injecté |
| R0-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : boutons Nouvelle descente / Continuer, 390/2560 px |
| R0-07 | EN ATTENTE DE VALIDATION HUMAINE | playtest : déplacement clavier + rendu net 390/2560 px |
| R0-08 | EN ATTENTE DE VALIDATION HUMAINE | playtest : recharger la page → position restaurée |
| R0-09 | done | workflow Pages, job deploy conditionnel skipped (repo privé), CI vert vérifié |
| R1-01 | done | génération de niveau seedée, connexité garantie |
| R1-02 | EN ATTENTE DE VALIDATION HUMAINE | playtest : contact → combat |
| R1-03 | done | combat à menus complet, butin 100 % conservé à la mort |
| R1-04 | done | 3-4 orbes de départ + 4 modules solo gratuits |
| R1-05 | done | récolte orbes/coffres/spores, sortie → sol suivant, niveaux de run |
| R1-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : boucle run → achat → run |
| R1-07 | done | simu 1000 runs : victoire sol 3 = 38.6 % (possible, pas garanti) |
| R2-01 | done | portefeuille persistant crédits/essence/minerai/spores |
| R2-02 | done | production par ticks purs Extracteur → Forge Arcane (lingots) |
| R2-03 | done | caps de stockage + Entrepôts améliorable |
| R2-04 | done | Labo dès le départ : recettes tier 1 en communs, slots 3+, fusions -10 %/niv |
| R2-05 | done | craft d'équipement à la Forge Arcane |
| R2-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : écran Forge sans friction à 390/2560 px |
| R2-07 | done | production pendant la run, créditée au retour − entretien |
| R2-08 | done | simu 24 h : caps tenus, aucun enrichissement infini |
| R3-01 | done | capture (proba monotone seedée selon PV restants) |
| R3-02 | done | compagnon générique support soin, 5 compétences, agit à son initiative |
| R3-03 | done | compétence initiale aléatoire seedée + K.O. sans mort permanente |
| R3-04 | done | jalon à 3 choix après le 2e niveau, prérequis respectés |
| R3-05 | done | montée de niveau des compétences en orbes (3/5/10, plafond 5) |
| R3-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : capture → nommage → équipe compréhensible sans doc |
| R3-07 | done | rejeu complet déterministe depuis un seul seed |
| R4-01 | done | moteur de fusion (opposition Feu↔Eau, doublage, paliers) |
| R4-02 | done | 18 recettes complètes, création consomme les orbes |
| R4-03 | done | codex permanent + liste des réalisables en run |
| R4-04 | done | fusion gratuite hors combat, 1 tour en combat |
| R4-05 | done | composites conservées à la mort, primordiales perdues |
| R4-06 | done | affinités ×1.5/×0.5 appliquées en combat |
| R4-07 | EN ATTENTE DE VALIDATION HUMAINE | playtest : la fusion en combat ralentit-elle le rythme ? (Q4-1) |
| R4-08 | done | simu 1000 runs kit départ : victoire sol 3 = 0.10 % (dans la bande cible) |
| R5-01 | done | boss Racine-Mère, pattern télégraphié 3 phases, 200/200 avec kit de départ |
| R5-02 | done | 4 sols + boss, twist des racines, difficulté en data |
| R5-03 | done | spores : nœuds visibles, récolte attire les monstres, transfert Forge |
| R5-04 | done | 3 contrats à conditions vérifiés depuis le journal de run |
| R5-05 | done | autel de garde : défi 15 tours, échec = pas de mort ni de récompense |
| R5-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : run complète de bout en bout (~10-15 min), durée/frictions (Q5-1) |
| R5-07 | done | simu 1000 runs biome 1 : 0.00 % de victoires, 3.9 tours moyens, équilibrage à arbitrer |
| P6-A | done | squelettes biomes 2-4 en données |
| P6-B | done | ~10 bâtiments V1 en données (TODO-BALANCE) |
| P6-C | done | paliers de lien 1-5 + conditions d'évolution en données |
| P6-D | done | docs/QUESTIONS.md final + ce PROGRESS.md — **ARRÊT, itérations 6-9 non codées** |

## Résultats des simulations
- **R1-07** : 1000 runs, taux de victoire sol 3 (kit départ) = **38.6 %**, sol moyen clearé 1.23.
- **R2-08** : 24 h simulées (86400 ticks) → minerai 100/100 (cap), essence 0/100, lingots 20/50,
  crédits 0 — aucun enrichissement infini.
- **R4-08** : 1000 runs, kit de départ seul → victoire sol 3 = **0.10 %** (1/1000), dans la bande
  cible §SPEC-2 (0.1 %-0.2 %) ; cibles en `src/data/balance.ts` (TODO-BALANCE).
- **R5-07** : 1000 runs complètes du biome 1 → taux de victoire **0.00 %**, durée moyenne **3.9 tours**,
  modules les plus utilisés : trait-incandescent (118166), jet-pression (49561). Le bot naïf meurt
  vite : équilibrage à affiner à la main (Q5-2).

## Choix faits (documentés dans les commits)
- Adaptateur localStorage hors du core (`src/ui/storage.ts`) pour respecter « zéro DOM dans le core » (Q0-1).
- Phaser 4 : rendu HiDPI natif (plus de clés `scale.resolution`/`autoDensity`) ; `make.graphics(config, addToScene)`.
- Recettes « à base de composites » dépliées en 3 primordiales (palier 3) faute d'orbes composites nommées (Q4-2).
- Le compagnon agit automatiquement à son initiative (meilleure compétence de soin) ; 30 % des attaques ennemies le visent (Q3-1/Q3-2).
- 1 tick de production = 1 s côté UI ; le core reçoit les ticks en paramètre (aucun `Date.now` dans le core).
- Machine à l'arrêt sans intrants = pas de backlog de ticks.
- Cibles de simu et tous les chiffres d'équilibrage en `src/data/` avec marqueur `TODO-BALANCE`.

## Questions posées
Voir `docs/QUESTIONS.md` (Q0-1, Q1-1, Q2-1/2, Q3-1/2, Q4-1/2, Q5-1/2, Q6-1/2), classées par itération.

## Playtests en attente de validation humaine
R0-06, R0-07, R0-08, R1-02, R1-06, R2-06, R3-06, R4-07, R5-06 — **aucun playtest n'a été validé par le modèle**.

## Blocages
Aucun — `docs/BLOCKED.md` n'existe pas (aucun coupe-circuit déclenché).
