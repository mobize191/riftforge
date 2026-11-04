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
