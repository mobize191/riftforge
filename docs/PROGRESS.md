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
