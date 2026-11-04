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

## B27 — HUD « Au tour de » peu visible pour le compagnon (fix)
- **Vu** : la ligne « Au tour de : … » était noyée dans le titre de combat ; au tour du
  compagnon, rien ne le signalait clairement.
- **Fix** : bannière dédiée colorée (vert = tour du compagnon, bleu = joueur) via
  `actorLabel()` (core, testé). Les effets des modules sont aussi affichés en FR
  (`moduleEffectLabel`) et scalent avec l'attaque du joueur (BALANCE.MODULE_ATK_SCALING).
- **Tests** : `tests/r9-08-combat-hud.test.ts` (3 tests).

## B28 — Doublons d'équipement et aucune limite par emplacement (fix)
- **Vu** : on pouvait acheter/crafter plusieurs armes/armures identiques ou redondantes.
- **Fix** : chaque équipement a un `slot` (arme/bouclier/armure/accessoire), limites en
  data (EQUIPMENT_SLOT_LIMITS), refus si possédé (même rangé à la Maison) ou slot plein ;
  boutons grisés avec mention « possédé » / « arme plein (1/1) » côté UI. Le Labo affiche
  désormais toutes les recettes par palier avec leur coût + l'explication que les modules
  palier 1 sont gratuits avec l'orbe.
- **Tests** : `tests/r9-09-equipment-slots.test.ts` (3 tests).

## B29 — Aucun plan pour placer les bâtiments (voisinage opaque) (fix)
- **Vu** : le voisinage (« à côté ») n'avait aucune représentation visuelle.
- **Fix** : grille de la Forge 4x3 (FORGE_GRID), action PLACE_BUILDING, section
  « Plan de la Forge » dans l'écran Forge ; le bonus de voisinage s'applique si les
  deux bâtiments du binôme sont construits ET adjacents (Manhattan = 1) quand placés,
  sinon « les deux construits » (rétrocompatible). Save v6 + migration.
- **Tests** : `tests/r9-10-forge-ui-core.test.ts` (2 tests) + `e2e/forge.spec.ts` (CI).

## B30 — Maison et PNJ inaccessibles depuis l'UI (fix)
- **Vu** : la Maison du héros et la Liaiseuse existaient en core mais sans écran ; les
  workers n'étaient pas visibles par bâtiment.
- **Fix** : sections « Maison du héros » (équiper/ranger, repos, trophées), « Liaiseuse —
  quêtes de lien » (dialogues + bouton terminer), « Travailleurs par bâtiment », palier
  de lien + cadeau + évolution dans l'écurie. Handlers App.tsx.
- **Tests** : e2e/forge.spec.ts (sections visibles en CI).

## B31 — Peu de tests IHM (renforcement)
- **Vu** : seuls les parcours titre/carte/sauvegarde étaient couverts en e2e.
- **Fix** : e2e/forge.spec.ts (sections Forge : Maison, Liaiseuse, Travailleurs, Plan,
  Labo, slots d'équipement) + e2e/combat.spec.ts (bannière « Au tour de », effets de
  modules en FR) + e2e/responsive.spec.ts (2560 px). Tournent en CI (job e2e Playwright).

## B32 — Fusion d'orbes impossible hors combat dans l'UI (fix)
- **Vu** : le core permet FUSE_ORBS en mode RUN (gratuit, illimité, testé) mais aucun
  bouton n'existait sur l'écran carte.
- **Fix** : orbes cliquables (sélection de 2) + bouton « ✦ Fusionner 2 orbes (gratuit,
  hors combat) » dans la vue run (App.tsx).
- **Tests** : tests/r9-11-fixes.test.ts (FUSE_ORBS hors combat + opposition refusée +
  présence du panneau UI).

## B33 — Log de soin trompeur quand le soin dépasse les PV manquants (fix)
- **Vu** : « Sève synthétique : +12 PV » s'affichait même quand les PV étaient presque
  pleins (soin capé au max) -> on croit que le sort ne soigne pas.
- **Fix** : le log affiche le montant EFFECTIF soigné (capé), « PV déjà au maximum »
  sinon — pour les modules, les objets et les compétences de compagnon.
- **Tests** : tests/r9-11-fixes.test.ts (3 tests de cap + log effectif).

## B34 — e2e « boutons save » échouait en CI (goBack recharge la page) (fix)
- **Vu** : run CI e2e en failure sur smoke.spec.ts (page.goBack() = rechargement complet,
  état null, boutons absents).
- **Fix** : page.reload() à la place (la save localStorage est rechargée, état non null).

## B35 — e2e exécutés en local (session R10) : serveur statique cross-platform + hydratation

- **Vu** : la config Playwright lançait `mkdir -p /tmp/... && ln -sfn ... && python3` (Git Bash
  uniquement, échoue sur Windows) ; boot WebGL headless > 5 s -> attentes `expect` trop courtes.
  Fix : `scripts/serve-e2e.mjs` (node, cross-platform) + `expect.timeout: 15000`.
- **Vu** : rechargement avec `muted=true` en localStorage -> erreur d'hydratation React #418
  (label « Son : » rendu au SSR ≠ client). Fix : lecture du mute dans `useEffect` (TitleScreen).
- **Tests** : `e2e/ihm.spec.ts` (export/import save par vrai fichier, persistance reload,
  clavier + focus, touch 390 px + hit-zones, audio sans exception + mute persisté,
  matrice 390/768/1440/2560).

## B36 — headed (R10-08) : crash « setPosition of undefined » à la 2e descente (fix)

- **Vu** : parcours headed `pnpm dev` — après « Redescendre », un clic pavé précoce tombait
  avant la fin du `create()` de la nouvelle scène : `this.player` encore undefined ->
  `pageerror: Cannot read properties of undefined (reading 'setPosition')` (5x), et la 2e
  carte ne répondait plus.
- **Fix** : garde `if (!this.player) return;` dans `MapScene.tryMove` (le pas est ignoré
  tant que la scène n'est pas prête). Les 404 restants sont les portraits PNG absents
  (fallback code-gen prévu R9-07) — consignés dans docs/QUESTIONS.md.
- **Test** : parcours headed rejoué (`scripts/headed-final.mjs`) -> 0 pageerror.
