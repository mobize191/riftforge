# HANDOFF — session R11 (reprise)

Dernière mise à jour : fin de session R11 (R11-01 en cours, non commitée avant ce point).

## État au moment du handoff

### R11-01 (fusion module + module, décision E1) — ~95 % fait

**Fait et vert :**
- `src/data/moduleFusions.ts` : 13 `ModuleFusionDef` (tier 2 = 2 tier 1 distincts, tier 3 = tier 2 + tier 1 ± orbes).
- `src/core/combat/fuseModules.ts` : cœur pur sans RNG — `fuseModules()` (consomme sources + orbes, refus `unknown-fusion`/`missing-modules`/`missing-orbs`/`duplicate`) et `achievableFusions()` (codex « réalisables avec vos modules et orbes actuels »).
- `src/core/combat/createModule.ts` : refus `'fusion-only'` pour tout résultat de fusion (palier ≥ 2 jamais créé depuis les orbes) ; `craftableRecipes` filtre tier ≥ 2.
- `src/core/run/state.ts` : case `FUSE_MODULES` hors combat ; `src/core/combat/combat.ts` : `FUSE_MODULES` en combat (coûte le tour, refus propre avec message).
- `src/ui/App.tsx` : panneau `⚗ Fusion de modules` (chips `aria-pressed`, max 2 sources, préview + bouton `⚗ Fusionner → …`), codex « Fusions réalisables avec vos modules et orbes actuels : ».
- `tests/helpers/modules.ts` : `craftAndFuseAll` / `craftOrFuseOnce` / `newRunState` (bots de bande E1-conformes).
- `tests/r11-01-fusion-modules.test.ts` : 13 tests verts.
- Tests adaptés à la voie fusion : r4-02, r4-03, r4-07, r4-08, r5-06, r5-07, r6-00, r6-04, r6-10, ui-bot, fuzz-bot.
- Bandes r9-01 et r10-06 restaurées à **0,200 %** (2/1000, cible §SPEC-2 0,1–0,2 %).
- B39 consigné dans `docs/BUGS.md` (bot brûlait ses orbes en craft direct → bande doublée 0,2 % → 0,4 % ; fix = bot E1, aucune valeur d'équilibrage changée).
- Dernière suite complète : **vitest 85 fichiers / 277 tests verts**, `pnpm build` vert.

**Reste à faire pour clore R11-01 :**
1. `pnpm test:e2e` vert (voir « Environnement e2e » ci-dessous — le spec n'a encore jamais tourné) ; corriger au besoin les sélecteurs de `e2e/fusion-modules.spec.ts` (`/Modules \(\d+ cr/`, chips `Jet sous pression`/`Écran de gravats`, `⚗ Fusionner → Boue \(palier 2\)`).
2. Vérifier les 4 captures dans `docs/SCREENSHOTS-R11/` (11-fusion-selection, 12-fusion-boue, 13-combat-avant-fusion, 14-combat-apres-fusion).
3. Amender `docs/SPEC.md` §5.2 avec la décision E1 (fusion module + module, refus `fusion-only`).
4. Mettre à jour `docs/PROGRESS.md` (ligne R11-01 + preuves).
5. Commit `R11-01: fusion module + module (E1)` avec les sorties des 4 commandes dans le corps.

### R11-02 → R11-07 — non commencés

Dans l'ordre strict (cf. `docs/BRIEF-R11.md`, chaque ticket liste ses « Skills à consulter » dans `docs/skills/`) :
- **R11-02** : 16 arbres de compagnons de `docs/COMPANIONS-R11.md` font foi (`unlockTier` remplace `requires`, 1 compétence par palier de lien 1→5, palier 5 = signature) + fin du null silencieux (refus explicite, jamais `?? null` sans message).
- **R11-03** : niveaux/XP (`LEVEL_XP_THRESHOLDS` ×12, ~3 niveaux/biome).
- **R11-04** : ratios ~0.6/1.0/1.5 + dégâts prédits sur les boutons de modules.
- **R11-05** : Labo permanent + save v7.
- **R11-06** : bot E1 + bande `SIM_RUNS_FINAL`.
- **R11-07** : playtest headed + captures (jamais validé par l'agent).
- Idées R12 (atelier UX + ComfyUI) → `docs/BACKLOG.md` uniquement, hors périmètre.

## Environnement e2e (IMPORTANT — pièges du sandbox)

1. **`PORT=3030` est défini dans l'environnement du sandbox** et le port 3030 est détenu par PID 1 (`sandbox-executor`, non tuable). `scripts/serve-e2e.mjs` lit `process.env.PORT ?? 4173` → il faut **toujours** lancer : `PORT=4173 pnpm test:e2e`.
2. **Navigateur Playwright** : `pnpm exec playwright install chromium` (déjà fait — cache `/home/appuser/.cache/ms-playwright/`, shell 156.0.8078.4 v1248).
3. **Bibliothèques système manquantes** (sandbox Debian 13 sans root, pas de libglib etc.) : dépendances extraites localement dans `/home/appuser/pw-libs/root` via `python3 /tmp/resolve.py` (télécharge les .deb trixie et `dpkg -x`). Lancer le navigateur avec :
   ```
   LD_LIBRARY_PATH=/home/appuser/pw-libs/root/usr/lib/x86_64-linux-gnu:/home/appuser/pw-libs/root/lib/x86_64-linux-gnu
   FONTCONFIG_PATH=/home/appuser/pw-libs/root/etc/fonts
   ```
   Pour Playwright, exporter ces deux variables avant `pnpm test:e2e` (Playwright hérite de l'environnement). Test manuel OK : `--dump-dom about:blank` rend `<html>`.
   ⚠️ `/tmp` peut être vidé entre sessions : si `resolve.py`/le pickle disparaissent, régénérer l'index (`Packages.gz` trixie main amd64 sur deb.debian.org) et relancer le résolveur (seeds t64 : libasound2t64, libatk1.0-0t64, libatk-bridge2.0-0t64, libatspi2.0-0t64, libglib2.0-0t64, libdbus-1-3, libgbm1, libnspr4, libnss3, libx11-6, libxcb1, libxcomposite1, libxdamage1, libxext6, libxfixes3, libxkbcommon0, libxrandr2, fontconfig, fonts-liberation).
4. **Corruption de session** : lors de cette session, des payloads d'outils longs ont été corrompus (insertions de sauts de ligne) et `fuseModules.ts` a dû être réécrit. Si un fichier semble altéré sans raison : vérifier `git diff` avant tout commit.

## Commandes de reprise

```bash
cd /workspace/github__mobize191__riftforge
pnpm vitest run                       # suite complète (85 fichiers / 277 tests)
pnpm build                            # build statique -> out/
export LD_LIBRARY_PATH=/home/appuser/pw-libs/root/usr/lib/x86_64-linux-gnu:/home/appuser/pw-libs/root/lib/x86_64-linux-gnu
export FONTCONFIG_PATH=/home/appuser/pw-libs/root/etc/fonts
PORT=4173 pnpm test:e2e               # e2e complet (webServer sur 4173, JAMAIS 3030)
```

## Règles rappelées (à ne pas perdre)

- Un ticket = un commit `R11-xx: …` avec les sorties `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` dans le corps du commit.
- `SIM_RUNS_FINAL` (B37) uniquement pour les asserts de bande — jamais `SIM_RUNS`.
- Core headless pur (`src/core/` sans React/Phaser/DOM), data ≠ logique (`src/data/`), RNG seedé, TODO-BALANCE en data, code EN/textes FR, responsive 390 → 2560 px.
- Toute régression = entrée `docs/BUGS.md` (à partir de B40) + test de régression.
- Coupe-circuit 3 échecs → `docs/BLOCKED.md` + ticket suivant ; manques → `docs/QUESTIONS.md` ; `docs/PROGRESS.md` final obligatoire.
