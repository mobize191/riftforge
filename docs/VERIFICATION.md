# RIFTFORGE — Vérification avant complétion (skill `verification-before-completion`)

Date : 04/11, après le dernier commit `705c053`. Toutes les commandes ci-dessous ont été
**re-exécutées fraîchement** pour ce rapport (preuve avant affirmation).

## Commandes de preuve (sorties constatées)
- `pnpm install` -> `Done` (exit 0)
- `pnpm vitest run` -> **Test Files 49 passed (49), Tests 142 passed (142)** (exit 0)
- `pnpm build` -> `○ (Static) prerendered as static content` (exit 0)
- CI GitHub (dernier run) : `build: success`, `e2e: success`, `deploy: success`
- Fuzz one-shot : `FUZZ_SESSIONS=5000 pnpm vitest run tests/fuzz-bot.test.ts` -> 5000 sessions,
  9189 combats, 0 violation (exit 0)

## Checklist de conformité BRIEF §2 (règles transverses) — vérifiée ligne par ligne
| Règle | Preuve | Statut |
|---|---|---|
| Jeu 100 % client, aucun appel réseau | `grep fetch/axios/WebSocket src/ app/` -> aucun résultat | ✅ |
| Tout est `"use client"` | tous les composants `src/ui/*.tsx` ont la directive | ✅ |
| Core headless pur : zéro import React/Phaser/DOM/localStorage/fetch/Math.random/Date.now | `grep` dans `src/core/` -> aucune occurrence (hors commentaire) | ✅ |
| Hasard via RNG seedé injecté | `src/core/rng.ts` (mulberry32), tests de déterminisme R0-03 | ✅ |
| localStorage via StoragePort injecté | `src/core/save/storage.ts` (interface) + adaptateur `src/ui/storage.ts` | ✅ |
| Données ≠ logique, tout en `src/data/` | 17 tables TS typées, 157 marqueurs `TODO-BALANCE`, aucune logique | ✅ |
| Scaling téléphone -> Quad HD dès it. 0 | résolution logique fixe 1024x768 + Phaser FIT, HiDPI natif Phaser 4, `clamp()` pour les tailles de texte, aucune largeur fixe en dur hors hit-zones | ✅ (voir note Phaser 4) |
| Hit-zones tactiles >= 44 px | 28 occurrences `minHeight: 44/56px` dans `src/ui/` ; pavé tactile 56 px | ✅ |
| Stack verrouillée Next+TS strict+Phaser 4+Vitest+pnpm | `package.json` : next 15, phaser 4.2.1, vitest ; TS `strict` | ✅ (+ `@playwright/test` en dev, accord explicite Q7-2) |
| Assets : placeholders gratuits uniquement, aucun téléchargement externe | sprites = formes générées en code (Phaser Graphics) ; aucun asset téléchargé. Décision Q0-4 : vrais assets Kenney CC0 prévus en V1.x (BACKLOG) | ✅ |
| Code/identifiants anglais, textes visibles français | ids anglais (`boss:racine-mere`, `autel-garde`), noms affichés FR (« Racine-Mère », « Frappe lourde ») | ✅ |

## Checklist SPEC §8 (architecture) et §10 (roadmap it. 0-5)
- Structure `src/core` (run/combat/forge/save/rng), `src/data`, `src/ui` (scenes Phaser + screens React), `app/`, `tests/` : ✅ conforme.
- Phaser 4 embarqué dans un composant React (`GameCanvas`, import dynamique, pas de SSR) : ✅.
- Note : SPEC mentionne Phaser `resolution`/`autoDensity` — ces clés n'existent plus en Phaser 4
  (le rendu HiDPI est natif) ; la mise à l'échelle nette passe par `Scale.FIT` + résolution logique
  fixe. Documenté dans le commit R0-07.
- Sauvegarde localStorage + versionnée (SAVE_VERSION=1, migration no-op, refus version inconnue) : ✅.
- Itérations 0-5 livrées et jouables de bout en bout ; itérations 6-9 non codées (contrat) : ✅.
- Graphismes : sprites générés en code (joueur/monstres/orbes/coffres/spores/autel/sortie/racines),
  caméra follow, grille 32x24 — placeholders conformes à la règle « formes/couleurs générées en code » ;
  vrais assets = décision enregistrée (Q0-4 ✅) pour la V1.x.
- Interactions : clavier (flèches/ZQSD/WASD/E) + pavé tactile 56 px, sélection de cible puis action,
  menus (Attaque/Modules/Objets/Compagnons/Capturer/Fuir), ordre d'initiative façon FF (Q0-7 ✅),
  auto-combat au contact adjacent (Q0-6 ✅), messages d'événements (lastEvent), HUD complet.

## Suivi des écarts connus
- Aucun écart bloquant. Équilibrage = valeurs `TODO-BALANCE` à arbitrer par l'humain (Q5-2).
- E2E Playwright exécuté en CI (`e2e: success`) ; non exécutable dans le bac à sable (pas de libs
  Chromium) — documenté.

## Références
- Skill `verification-before-completion` (lu via `mistral_mcp_read_skill`) : preuve avant affirmation,
  checklist ligne par ligne pour les exigences — appliqué ici.
- Bugs : `docs/BUGS.md` (B1-B25) · Questions : `docs/QUESTIONS.md` · Avancement : `docs/PROGRESS.md`.
