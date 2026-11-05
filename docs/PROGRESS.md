# RIFTFORGE — PROGRESS (mis à jour après la session de nuit + playtests)

- **Dernier commit publié** : `c082808` sur `main` (poussé sur GitHub).
- **CI** : dernier run `completed success` — `build: success`, `deploy: success`.
- **Site en ligne** : https://mobize191.github.io/riftforge/ (repo public, Pages en GitHub Actions ;
  penser à repasser en privé après les playtests téléphone -> l'URL s'éteint).
- **Preuves** : `pnpm install && pnpm vitest run && pnpm build` -> exit 0 — **48 fichiers / 139 tests**.
- **Fuzz one-shot** : `FUZZ_SESSIONS=5000 pnpm vitest run tests/fuzz-bot.test.ts` -> 5000 sessions,
  9189 combats, **0 violation d'invariant**.
- **E2E navigateur** : `pnpm build && pnpm test:e2e` (Playwright, Chromium headless 390 px) — à lancer
  en local (non exécutable dans le bac à sable ni en CI).

## État par ticket

| Ticket | État | Notes |
|---|---|---|
| R0-01 | done | scaffold Next.js 15 + TS strict + pnpm + vitest |
| R0-02 | done | types du core |
| R0-03 | done | RNG seedé mulberry32 |
| R0-04 | done | machine à états boucle Forge/Run/Combat/Retour |
| R0-05 | done | sauvegarde versionnée + StoragePort injecté |
| R0-06 | done + corrigé en playtest | écran titre (titre d'onglet RIFTFORGE) |
| R0-07 | done + corrigé en playtest | carte Phaser : pavé tactile, plus de flashs, scène persistante |
| R0-08 | done + testé (e2e) | persistance : recharger -> position restaurée |
| R0-09 | done | Pages déployé et EN LIGNE (job deploy actif, repo public) |
| R1-01..R1-07 | done | boucle minimale complète ; simu R1-07 : 38.6 % de victoires au sol 3 |
| R2-01..R2-08 | done | économie + production ticks + caps + labo + craft ; simu R2-08 : caps tenus |
| R3-01..R3-07 | done | capture, compagnon, jalons, montée en orbes, écurie/workers |
| R4-01..R4-08 | done | fusions, 18 recettes, codex, affinités, grimoire ; simu R4-08 : 0.10 % (1/1000) |
| R5-01..R5-07 | done | biome 1 complet (4 sols + boss, spores, contrats, défis) ; simu R5-07 : 0.00 %, 3.9 tours |
| P6-A/B/C/D | done | squelettes biomes 2-4, ~10 bâtiments, paliers de lien en data ; docs à jour |

Tous les tickets du brief (R0-01 -> P6-D) sont **done**. Les itérations 6-9 restent non codées
(contrat de nuit) — voir docs/BACKLOG.md.

## Changements issus des réponses aux questions (04/11)
- **Initiative façon FF (Q0-7)** : ordre d'initiative seedé (joueur + compagnon + ennemis) ; chacun
  choisit son action à SON tour (« Au tour de : … »), le compagnon attaque/soigne à son tour.
  Tests : `tests/combat-initiative.test.ts`.
- **Fusion visible en combat (Q4-1/Q4-3)** : B25 — sélecteur d'orbes + bouton « ✦ Fusionner ».
- **CI renforcée (Q7-1/Q7-2)** : fuzz à 1000 sessions (`FUZZ_SESSIONS=1000`) + job e2e Playwright.
- Q0-4 (vrais assets), Q0-6, Q0-8, Q0-9, Q5-1 : décisions enregistrées dans QUESTIONS.md / BACKLOG.md.

## Corrections issues des playtests (toutes fixées, voir docs/BUGS.md B1-B25)
- Téléphone : pavé tactile fonctionnel (▲▼◀▶+E, hit-zones 56 px), flashs noirs supprimés.
- Carte : patrouille infinie, ramassage visible + messages, monstres retirés après combat,
  autels à usage unique, combat auto au contact adjacent.
- Combat : PV persistants entre combats, sélection de cible + auto-retarget, compagnon actif
  (menu Compagnons), modules créés/craftables visibles, jamais de combat bloqué.
- Forge : pas d'équipement en double, workers multiples, exclusivité équipe/worker, essence obtenable.
- Divers : pas de retour intempestif à l'accueil, « Quitter la Faille » = abandon propre.

## Simulations (résultats affichés dans les tests)
- **R1-07** : 1000 runs, victoire sol 3 (kit départ) = **38.6 %**, sol moyen 1.23.
- **R2-08** : 24 h (86400 ticks) -> minerai 100/100 (cap), essence 0/100, lingots 20/50, crédits 0.
- **R4-08** : 1000 runs, kit départ -> victoire sol 3 = **0.10 %** (bande cible §SPEC-2 : 0.1-0.2 %).
- **R5-07** : 1000 runs complètes biome 1 -> **0.00 %**, 3.9 tours moyens (bot naïf) -> équilibrage
  TODO-BALANCE à arbitrer à la main (Q5-2).

## Bots / tests auto
- `tests/ui-bot.test.ts` : bot déterministe qui rejoue les flux exacts de l'UI (BFS, combats,
  boss, compagnon, autel) — invariants à chaque étape. `[ui-bot] combats=22 victoire=true`.
- `tests/fuzz-bot.test.ts` : bot aléatoire seedé, 200 sessions en CI (5000 en one-shot OK).
- `tests/playtest-fixes*.test.ts` : régressions ciblées par bug.
- `e2e/smoke.spec.ts` : Playwright (IHM réelle, 390 px) — à lancer en local.

## Playtests en attente de validation humaine
Les tickets [playtest] du brief ont été implémentés et leurs preuves auto exécutées ; la validation
**humaine** (jouer réellement, 390 px et 2560 px, téléphone réel) reste à faire — liste dans
l'ancienne version de ce fichier ; tous les bugs remontés depuis ont été corrigés (B1-B24).

## Choix faits (documentés)
- Adaptateur localStorage hors du core (`src/ui/storage.ts`) — Q0-1.
- Phaser 4 : HiDPI natif ; scène Phaser persistante par sol (gameKey), levelRef pour le niveau.
- Recettes "à base de composites" dépliées en palier 3 — Q4-2.
- Compagnon : compétences déclenchées par le joueur (menu Compagnons) — Q3-1.
- 1 tick = 1 s côté UI ; core reçoit les ticks en paramètre (zéro Date.now dans le core).
- Niveau de run plafonné à ~5 volontairement (§SPEC) — Q0-8. 1 slot d'équipe en V1 — Q0-9.
- Tous les chiffres d'équilibrage en `src/data/` avec `TODO-BALANCE`.

## Questions ouvertes
Voir `docs/QUESTIONS.md` (Q0-1 … Q6-2, classées par itération). Aucune bloquante.

## Blocages
Aucun — `docs/BLOCKED.md` n'existe pas.

---

# Phase 6-9 (session autonome R6-00 → R9-06) — ARRÊT DE SESSION

- **Dernier commit publié** : `4dbd9b1` sur `main` (poussé sur GitHub).
- **Preuves** : `pnpm install && pnpm vitest run && pnpm build` -> exit 0 — **73 fichiers / 219 tests**.
- **Site en ligne** : https://mobize191.github.io/riftforge/ (Pages, repo public).

## État par ticket (phase 6-9)

| Ticket | État | Notes |
|---|---|---|
| R6-00 | done | bot compétent, biome 1 = **65.90 %** (> 20 %), aucun ajustement de balance nécessaire |
| R6-01 | done | biome 2 Datacathédrales : gremlins, données, circuits (connexité BFS 2^n états) |
| R6-02 | done | biome 3 Hauts-Fourneaux : élémentaires, mercurium, sol brûlant (dégâts exacts/tour) |
| R6-03 | done | biome 4 Fibration : vermine, optifibre, zones de vitesse (2 camps), runCompleted |
| R6-04 | done | une seule run traverse les 4 biomes, retour Forge à la mort avec 100 % du butin |
| R6-05 | done | Purificateur + Nanolathe jouables, voisinage réel (bonus retiré si bâtiment retiré) |
| R6-06 | done | 6 équipements Marchand, tiers 2+ (lingots/mercurium/optifibre), save v2→…→v5 + migrations |
| R6-07 | done | Maison du héros : rangements, repos, trophées dérivés de l'état |
| R6-08 | done | 8 contrats multi-biomes, primes une seule fois, ressources de biomes |
| R6-09 | **EN ATTENTE DE VALIDATION HUMAINE** [playtest] | assets code-gen (fallback Kenney, Q6-3), palettes par biome, portraits combat idle/télégraphie |
| R6-10 | done | simu 1000 runs complètes : **0.20 %** de victoires (après R9-01), 27.2 tours moyens |
| R7-01 | done | modificateurs débloqués si allBiomesCleared, activation par biome persistante |
| R7-02 | done | jauge d'instabilité monotone seedée, seuils danger/élite, purge sanctuaire |
| R7-03 | done | +niveaux, élites visibles, affinités brouillées seedées, orbes rares — combinables |
| R7-04 | done | bonus de fin de run si modificateurs actifs, élites capturables (compagnons x2) |
| R8-01 | done | sources de lien : victoires partagées, cadeaux, moments Forge — XP persistante |
| R8-02 | done | paliers 1-5 (seuils data), marqueurs, bonus en run si compagnon en équipe, signature palier 5 |
| R8-03 | done | évolution palier 4 (kills même race), irréversible |
| R8-04 | **EN ATTENTE DE VALIDATION HUMAINE** [playtest] | Liaiseuse : 3 quêtes, dialogues 2-3 lignes FR, états locked/available/done |
| R9-01 | done | équilibrage final : **0.200 %** de victoires première run complète (bande 0.1-0.2 % §SPEC-2) |
| R9-02 | done | audio WebAudio généré en code, 15 sons, mute persisté, zéro streaming |
| R9-03 | **EN ATTENTE DE VALIDATION HUMAINE** [playtest] | juice : flashs par élément, shake gros dégâts, fondus |
| R9-04 | **EN ATTENTE DE VALIDATION HUMAINE** [playtest] | e2e 390 px + 2560 px (CI) ; hit-zones >= 44 px |
| R9-05 | done | export/import de save (boutons titre, JSON versionné, refus propre) |
| R9-06 | done | cette passe : checklist §SPEC-9 V1.x, VERIFICATION.md re-exécuté |
| R9-07 | done | intégration UI des portraits IA (docs/ASSETS.md), fallback code-gen si PNG absent |

## Simulations (résultats affichés dans les tests)

- **R6-00** : 1000 runs biome 1, bot compétent -> **65.90 %**, 61.3 tours moyens.
- **R6-10** : 1000 runs 4 biomes -> **0.20 %** victoires, 27.2 tours, morts: biome1=445, biome2=400, biome3=148, biome4=5.
- **R9-01** : 1000 runs complètes, kit de départ -> **0.200 %** (bande §SPEC-2 0.1-0.2 % atteinte, ajustements uniquement en src/data/).

## Choix faits (documentés)

- R6-00 : simu mono-run sans compagnon (capture effective à la run suivante) — Q6-4.
- R6-09 : assets générés en code, substitution Kenney CC0 — Q6-3 (kenney.nl inaccessible depuis l'env de build).
- R7-04 : la « ressource spéciale exclusive » = optifibre (biome 4), pas de nouvelle ressource — Q7-1.
- R9-07 : portraits IA intégrés côté UI uniquement (mapping ASSETS.md), fallback code-gen si PNG absent ; liaiseuse.png à venir.
- Sauvegarde passée en v5 (migrations v1→v5 testées).

## Questions ouvertes

Voir docs/QUESTIONS.md — Q6-3 (substitution assets), Q6-4 (simu mono-run), Q7-1 (ressource exclusive). Aucune bloquante.

## Blocages

Aucun — `docs/BLOCKED.md` n'existe pas. Aucun échec répété 3x sur un ticket.

---

# Phase R10 (refonte combat V1.1, vague 1) — session locale, terminée

- **Dernier commit** : `6a3d5fd` sur `main` (8 commits R10-01 -> R10-08, ordre strict respecté, + 2 commits assets portraits).
- **Preuves** (exécutées EN LOCAL, sorties dans les corps de commit) :
  `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` -> exit 0 — **84 fichiers / 261 tests**, **15 tests e2e Playwright (3,7 min, 390 px headless local)**.
- **Vérification headed** : `pnpm dev` + parcours complet (scripts/headed-final.mjs) -> 0 pageerror après fix B36.

## État par ticket

| Ticket | État | Commit | Notes |
|---|---|---|---|
| R10-01 | done | f5b8084 | parcours compagnon complet (capture -> écurie -> équipe -> combat -> compétence) en unitaire + e2e local + 8 captures |
| R10-02 | done | f1e546a | énergie de combat D1 : jauge HUD, coûts 1/2/5/8, refus FR, invariant D1 testé, e2e jauge+coûts+refus réel |
| R10-03 | done | 31312dc | D2 : scaling ATK par palier (data), nerf armes (jamais de one-shot tier 1, testé), « Faiblesse ! »/« Résisté ! » dans le log réel (e2e) |
| R10-04 | done | bfbb323 | D3 : courbe continue en data, invariant PV(trash N+1) <= PV(boss N) testé sur toute la table |
| R10-05 | done | af0c5ac | D4 : économie ralentie en data ; simu 20 morts biome 1 = haut de gamme inaccessible, tier 1 OK |
| R10-06 | done | 121e8b7 | re-simu 1000 runs : 0,200 % (bande tenue), morts biome1=30,3 % / b2=57,1 % / b3=11,7 % / b4=0,7 %, 4 biomes visités |
| R10-07 | **EN ATTENTE DE VALIDATION HUMAINE** [playtest] | 35ca5e5 | lisibilité combat prouvée en auto (e2e + captures) ; playtest humain « un combat se comprend sans doc » à valider |
| R10-08 | done | afcb713 | suite IHM locale : save par vrai fichier, persistance reload, clavier+focus, touch 390 px, audio+mute, matrice 390/768/1440/2560, 30 captures commitées |

## Bugs trouvés/corrigés cette session (docs/BUGS.md)

- **B35** : serveur e2e cross-platform (scripts/serve-e2e.mjs) + timeouts WebGL ; fix hydratation React #418 (mute lu en useEffect).
- **B36** : crash `setPosition` à la 2e descente en headed -> garde `if (!this.player)` dans MapScene.tryMove.

## Décisions D1-D5

Reportées dans docs/SPEC.md (§5.2 D1/D2, §5.3 D3, §6.3 D4, §7 D5). Chiffres uniquement en src/data/ (TODO-BALANCE).

## Simulations (sorties des tests)

- `[R10-06] runs=1000 victoires=2 taux=0.200% tours moyens=1077.5 morts=998 par biome: biome1=303 biome2=571 biome3=117 biome4=7`
- `[R9-01] runs=1000 victoires=2 taux=0.200%` (bande §SPEC-2 0,1-0,2 % conservée)

## Blocages

Aucun — pas de coupe-circuit (3 échecs) déclenché. `docs/BLOCKED.md` n'existe toujours pas.

## Assets portraits (post-R10-08)

- `83277f1` : 24 portraits IA déposés dans `public/assets/portraits/` (512 px, ~10 Mo), Q10-1 résolu (0 404 en combat, capture 17-combat-portraits-ia.png).
- `6a3d5fd` : 24 variantes `-evo.png` branchées — affichées quand le compagnon est évolué (palier 4), en combat et à l'écurie. ~21 Mo au total.

## Vague 2 (R11) — session en cours

- **Dernier commit** : commit R11-05 sur `main` (R11-01 = `22fb820`, R11-02 = `b1f99f2`, R11-03 = `5378ec2`, R11-04 = `04f3dc1`).
- **Preuves R11-05** (exécutées EN LOCAL, sorties dans le corps du commit) :
  `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` -> exit 0 — **89 fichiers / 303 tests**, **23 tests e2e Playwright (390 px headless local)**.

| Ticket | État | Notes |
|---|---|---|
| R11-01 | done | `22fb820` — 13 `ModuleFusionDef` (data), `fuseModules`/`achievableFusions` (core pur), refus `fusion-only`, `FUSE_MODULES` hors combat (libre) + en combat (coûte le tour), panneau ⚗ + codex « réalisables avec vos modules et orbes actuels », 13 tests unitaires, e2e réel 2 specs, 4 captures `11..14-*.png`, SPEC §5.2 (E1). Bandes r9-01/r10-06 à **0,200 %** tenues. |
| R11-02 | done | commit « R11-02: compagnons 16 arbres (E2) + fin du null silencieux » — 16 defs `docs/COMPANIONS-R11.md` (1 compétence/palier 1→5, palier 5 = signature ⬔, `unlockTier` remplace `requires`), kinds nouveaux `stun`/`drain`/`debuff-atk`/`buff-energy`/`capture-bonus` (+`purify`) purs et seedés dans `USE_COMPANION_SKILL`, déblocage par palier de lien au départ en run, refus explicite `forge.notice` si compagnon d'équipe sans def (B40), écurie = arbre avec verrous par palier + marqueur combat/worker, menu Compagnons = compétences débloquées en FR, élites ×2. Tests `tests/r11-02-companions.test.ts` (invariants §4 + parcours 1 compagnon/famille), e2e `companions-r11.spec.ts` (gremlin en combat 390 px + refus de départ), captures `15..17-*.png`, SPEC §7.2 (E2). |
| R11-03 | done | commit « R11-03: niveaux 1→12 (E3) » — `LEVEL_XP_THRESHOLDS` ×12 `[0,6,14,26,42,62,86,114,146,182,222,266]` (monotone, max 12), gains `HP_PER_LEVEL: 6` / `ATK_PER_LEVEL: 2`, XP par biome `XP_PER_KILL_BY_BIOME [2,3,4,5]` + `XP_BOSS_BONUS_BY_BIOME [6,12,20,32]`, HUD run « Niv n/12 » + jauge XP (e2e `levels-r11.spec.ts`, capture `18-hud-xp.png`), bot sim extrait dans `tests/helpers/simbot.ts`. Sim : niveau max avant biome 4 = 6/7/8 (< 12 ✓). **Bande tenue : 0,100 %** (r9-01 + r10-06, SIM_RUNS_FINAL N=1000). SPEC §4.1 (E3). |
| R11-04 | done | commit « R11-04: scaling ATK visible (E4) » — ratios `MODULE_ATK_SCALING_BY_TIER {1:0.6, 2:1.0, 3:1.5}`, `predictedModuleDamage()` (core, même formule que CAST_MODULE) affiché sur les boutons solo/créés en combat (« — N PV » avec ATQ courante + faiblesse de la cible), tests `r11-04-atk-visible.test.ts` (prédit == infligé sur toute la table, corrélation ATQ stricte), e2e `module-damage-r11.spec.ts` (montant bouton == log, capture `19-combat-degats-predits.png`). `PLAYER_ATTACK` 4→2 en data pour tenir la bande : **0,100 %** (r9-01/r10-06). SPEC §5.2 (E4). |
| R11-05 | done | commit « R11-05: Labo permanent + save v7 » — `LAB_UPGRADES` (5 améliorations permanentes : -1 énergie / +10 % dégâts par palier, coûts mercurium/optifibre), 3 fusions exclusives (`fusion-nova/abime/singularite`, recettes inédites tier 3, refusées en run/combat tant que non débloquées à la Forge), écran Labo scindé **PERMANENT** vs **CETTE RUN**, save **v7** + migration v6→v7 testée, appliquées en combat (`labModifiersOf` -> énergie/dégâts, prédiction incluse). Tests `r11-05-lab.test.ts` (persistance, doublon refusé, refus exclusif, combat -1 é/+10 %, migration), e2e `lab-permanent-r11.spec.ts` (achat -> retour Forge -> coût réduit visible en combat, captures `20..21-*.png`). Bot : exclusives ignorées par défaut. Bande **0,200 %**, morts biome1 43,0 % (START_PLAYER_HP 21). SPEC §6.3. |
| R11-06..R11-07 | à faire | ordre strict, voir docs/BRIEF-R11.md §3 |

- **B39** : bot de bande brûlait ses orbes en craft direct (taux doublé 0,2 % → 0,4 %) ; fix = bot E1-conforme (`tests/helpers/modules.ts`), aucune valeur d'équilibrage changée, bande 0,200 % restaurée.
- **E2E sandbox** : recette Chromium vérifiée de bout en bout — `pnpm exec playwright install chromium` + `python3 scripts/setup-pw-libs.py` + `LD_LIBRARY_PATH`/`FONTCONFIG_FILE` + `PORT=4173 pnpm test:e2e` (jamais 3030) — voir docs/HANDOFF-R11.md.
- Idées R12 (atelier UX + ComfyUI) : docs/BACKLOG.md uniquement, hors périmètre.
