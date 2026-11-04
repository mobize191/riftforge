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

---

# Re-exécution fraîche — fin de session phase 6-9 (R9-06)

Date : session autonome R6-00 → R9-06. Dernier commit : `4dbd9b1` (main).

## Commandes de preuve (exit 0 partout)

```
$ pnpm install   -> exit 0
$ pnpm vitest run -> Test Files 73 passed (73), Tests 219 passed (219) — exit 0
$ pnpm build     -> exit 0 (static prerender OK)
```

## Simulations (sorties des tests)

- `[R6-00] runs=1000 victoires=659 taux=65.90% tours moyens=61.3` (bot compétent, biome 1, cible > 20 %)
- `[R6-10] runs=1000 victoires=2 taux=0.20% tours moyens=27.2` (4 biomes, après équilibrage R9-01)
- `[R9-01] runs=1000 victoires=2 taux=0.200%` (bande §SPEC-2 0.1–0.2 % atteinte)

## Checklist §SPEC-9 V1.x — état ligne par ligne

- Biomes 2-4 + bosses + ressources spécifiques + tiers de Forge : **OK** (R6-01..R6-04, R6-06)
- ~10 bâtiments, chaîne matière complète, voisinage, contrats, Maison : **OK** (R6-05, R6-07, R6-08 ; 10 bâtiments en data BUILDINGS_V1 + 5 jouables)
- 6-8 compagnons génériques nommables, paliers de lien 1-5, évolutions par condition, marqueurs visuels : **OK** (R8-01..R8-03, RENAME_COMPANION existant ; 1 compagnon générique + élite en V1 — écart noté)
- Modificateurs de Faille (instabilité, élites, +niveaux, affinités brouillées, orbes rares) : **OK** (R7-01..R7-04)
- Défis à tours limités : **OK** (R5-05, itération 5)
- Simulation « première run gagnable » en tests : **OK** (R9-01, 0.200 %)
- Responsive mobile/QuadHD : **OK preuves auto** (e2e 390 px + 2560 px en CI) — **playtest humain en attente**
- Audio (généré en code, coupable) : **OK** (R9-02)
- Juice : **OK preuves auto** (R9-03) — **playtest humain en attente**
- Export de save : **OK** (R9-05, round-trip + refus propre + e2e boutons)

## Écarts V1.x restants (tickets manquants)

- Compagnons : 1 type générique (+ élite) en V1 au lieu de 6-8 — le système (nommage, paliers, évolution) est en place ; ajouter des définitions en data suffit (→ BACKLOG).
- Assets : portraits IA intégrés côté UI avec fallback code-gen tant que les PNG ne sont pas déposés (Q6-3) ; remplacer par les packs Kenney CC0 à la première session réseau.
- 5e biome, NG+, Chronoforge : post-V1 (§SPEC-9), volontairement hors périmètre.

## Playtests en attente de validation humaine

R6-09 (cohérence visuelle 4 biomes, 390/2560 px), R8-04 (rôle de la Liaiseuse), R9-03 (feel du combat), R9-04 (téléphone réel + écran large). Jamais validés par l'agent.

---

# Phase R10 (refonte combat V1.1, vague 1) — re-exécutée fraîchement

Date : session locale R10, dernier commit `121e8b7`. Commandes rejouées pour ce rapport.

## Commandes de preuve (sorties constatées, session locale)

- `pnpm install` -> `Done` (exit 0)
- `pnpm vitest run` -> **Test Files 84 passed (84), Tests 261 passed (261)** (exit 0)
- `pnpm test:e2e` -> **10 passed** (Playwright Chromium headless, 390 px, exécuté EN LOCAL — plus délégué à la CI) (exit 0)
- `pnpm build` -> `○ (Static) prerendered as static content` (exit 0)

## Simulations (sorties des tests)

- `[R10-06] runs=1000 victoires=2 taux=0.200% tours moyens=1077.5 morts=998 par biome: biome1=303 biome2=571 biome3=117 biome4=7` — bande §SPEC-2 tenue (0,1-0,2 %), morts étalées (30,3 % au biome 1 ≤ 50 %), 4 biomes visités.
- `[R9-01] runs=1000 victoires=2 taux=0.200%` — bande conservée après D1-D4.

## Lisibilité combat (R10-07, preuves auto exécutées en local)

- Jauge d'énergie + coûts sur chaque bouton + refus FR « Pas assez d'énergie — +X/tour » : `e2e/energy.spec.ts` (2 tests, 390 px) + capture `docs/SCREENSHOTS-R10/09-refus-energie.png`.
- Retours « Faiblesse ! » / « Résisté ! » dans le log réel : `e2e/affinity.spec.ts` + capture `docs/SCREENSHOTS-R10/10-affinites-log.png`.
- Bannière de tour + compagnon en combat : `e2e/companion-journey.spec.ts` + captures `docs/SCREENSHOTS-R10/01..08`.
- HUD lisible à 390 px et 2560 px : `e2e/smoke.spec.ts`, `e2e/responsive.spec.ts` (2560 px).

## Playtest humain en attente (R10-07)

Un combat se comprend sans doc (énergie, coûts, affinités) : **EN ATTENTE DE VALIDATION HUMAINE** — jamais validé par l'agent.
