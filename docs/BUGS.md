# RIFTFORGE — Suivi des bugs (remontés en playtest + fuzz)

Légende : ✅ corrigé (commit) · 🔄 à re-vérifier en playtest humain · ❌ ouvert

| ID | Source | Bug | Statut | Fix |
|---|---|---|---|---|
| B1 | playtest tél | Pas de contrôles tactiles | ✅ | pavé ▲▼◀▶+E 56 px, `e0641f6` |
| B2 | playtest tél | Flashs noirs réguliers | ✅ | scène Phaser persistante par sol, `e0641f6` |
| B3 | playtest tél | Boutons tactiles sans effet | ✅ | le pavé pilote la scène (API impérative), `8b63179` |
| B4 | playtest | Monstres arrêtés après N pas | ✅ | patrouille ping-pong déterministe, `64ef038` |
| B5 | playtest | Ramassage sans message / objet reste affiché | ✅ | syncSprites + lastEvent HUD, `64ef038` |
| B6 | playtest | Orbes possédées invisibles | ✅ | pastilles d'inventaire, `64ef038` |
| B7 | playtest | Monstre re-affrontable à l'infini | ✅ | retiré à ENTER_COMBAT (même adjacent, fromMap), `b6b6b24` + `e367df7` |
| B8 | playtest | Aucun sprite/image | ✅ | textures générées en code détaillées, `64ef038` |
| B9 | playtest | Capturés invisibles pendant la run | ✅ | HUD « Capturés : … », `64ef038` |
| B10 | playtest | Ciblage manuel, attaque dans le vide | ✅ | auto-retarget 1re cible vivante (attaque + sorts), `0a62681` |
| B11 | playtest | Peu de choix de sorts en combat | ✅ | menu Modules (N) + panneau création hors combat, `27a8428` |
| B12 | playtest | PV remis à fond à chaque combat | ✅ | PV persistants (soin seulement au level-up), `0a62681` |
| B13 | playtest | « Cibler » attaquait directement | ✅ | « Sélectionner » (highlight) puis attaquer, `0a62681` |
| B14 | playtest | Équipement en double | ✅ | refus achat/craft si possédé, `0a62681` |
| B15 | playtest | E sur autel/sortie -> retour accueil, partie bloquée | ✅ | filet de sécurité : ENTER_COMBAT crée l'état combat UI, `0a62681` |
| B16 | playtest | Combat pas auto au contact | ✅ | déclenchement case adjacente, `0a62681` |
| B17 | playtest | Compagnon inactif en combat | ✅ | menu Compagnons, compétences déclenchables, `0a62681` |
| B18 | playtest | Essence toujours à 0 | ✅ | coffres donnent 1-3 essence + HUD butin, `0a62681` |
| B19 | playtest | Boutons Modules invisibles en combat | ✅ | boutons « Attaquer » / « Modules (N) » séparés, `27a8428` |
| B20 | playtest | Combat bloqué avec sorts combinés | ✅ | garde anti-blocage + checkVictory DoT, `e367df7` + `3adc80d` |
| B21 | playtest | Compagnon à la fois équipe et worker | ✅ | exclusivité double sens (échange auto), `3adc80d` |
| B22 | playtest | Défis infinis | ✅ | cause racine : challengeId non remis à null -> tous les combats chronométrés ; autel usage unique + sprite sync, `3adc80d` |
| B23 | playtest | « Quitter la Faille » en run = clic mort | ✅ | abandon propre DIE->RETURN_FORGE, `b6b6b24` |
| B25 | playtest | La fusion d'orbes n'avait aucun bouton en combat (visible seulement hors combat) | ✅ | sélecteur d'orbes + « ✦ Fusionner (coûte le tour) » dans le menu Modules, ce commit |
| B24 | fuzz bot | EXEC_GRIMOIRE recréait un module déjà créé (doublon, orbes perdues) | ✅ | dedupe, `c70f642` |

## Processus
1. Chaque bug remonté est ajouté ici avec un ID, puis un test de régression est ajouté au bot
   (`tests/ui-bot.test.ts` / `tests/fuzz-bot.test.ts` / `tests/playtest-fixes*.test.ts`).
2. `pnpm vitest run` rejoue tous les cas automatiquement (déterministe, seedé).
3. Fix -> commit -> push -> CI verte -> BUGS.md marqué ✅ avec le hash du commit.

## Bots de test (vérification automatique)
- `tests/ui-bot.test.ts` : bot déterministe rejouant les flux exacts de l'UI (BFS, contact adjacent,
  tous les types de sorts, autel, boss, compagnon, doublons, blocage combat).
- `tests/fuzz-bot.test.ts` : bot aléatoire seedé — 200 sessions en CI, 5000 testées en one-shot
  (9189 combats, 0 violation). `FUZZ_SESSIONS=N` pour pousser.
- `e2e/smoke.spec.ts` : Playwright (IHM réelle, Chromium headless 390 px) — à lancer en local :
  `pnpm build && pnpm test:e2e` (voir PROGRESS.md).

## B26 — Menu « Compagnons » cliquable au mauvais tour (fix session R6-9)
- **Vu** : au tour du joueur, les boutons de compétences du compagnon semblaient actifs
  mais le core refuse `USE_COMPANION_SKILL` hors du tour du compagnon (initiative FF,
  Q0-7) -> clic sans effet, sans explication. C'est probablement pourquoi un joueur
  « n'arrive pas à jouer avec son compagnon ».
- **Fix** : boutons désactivés + mention « tour du compagnon requis » quand ce n'est pas
  son tour (CombatScreen).
- **Tests** : `tests/companion-play.test.ts` (8 tests : capture -> écurie -> équipe ->
  présence en combat, compétence au bon tour, refus au mauvais tour, attaque du
  compagnon à son tour, K.O. persistant dans la run + réveil à la Forge, jalon sol 3,
  XP de lien, robustesse 200 seeds). Fuzz 5000 sessions / 9466 combats / 0 violation.
