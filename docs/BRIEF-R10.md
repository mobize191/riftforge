
# RIFTFORGE — Brief d'implémentation R10 : refonte combat V1.1 (vague 1)

> Troisième brief, **session courte** (une vague). Les itérations 0-9 sont **TERMINÉES** (voir `docs/PROGRESS.md`) : ne rien refaire ni refactoriser au-delà des tickets ci-dessous. Ce brief répond aux constats du **premier playtest humain complet** (§1). La vague 2 (R11) est planifiée en §6 mais **NE DOIT PAS ÊTRE CODÉE** pendant cette session.
>
> ⚠️ **La session s'exécute EN LOCAL** (machine avec navigateur, Node, et `pnpm dev`) : tout ce que le bac à sable web ne pouvait pas faire devient **OBLIGATOIRE** — e2e Playwright réellement exécutés, vérification headed, captures d'écran commitées (ticket R10-08 et règle §4.9).
>
> Références : `docs/SPEC.md`, `docs/BRIEF.md` §2 (règles transverses, en vigueur), `docs/BRIEF-6-9.md`, `docs/BUGS.md`, `docs/QUESTIONS.md`.

---

## 1. Constats du playtest humain (le pourquoi de ce brief)

1. **Compagnon inutilisable** : jamais réussi à jouer avec un compagnon ni à lancer une de ses compétences, malgré les tickets « done » — régression probable côté UI ou flux équipe.
2. **Spam illimité** : une fois créés, 2 modules (Déflagration + Sève synthétique) sont lancés en boucle et balayent tout — aucune limite au lancement.
3. **Armes trop fortes / modules inutiles** : le meilleur équipement one-shot presque tout (demi-vie du boss 1 en un coup) ; les dégâts des modules ne se sentent pas indexés sur l'attaque → plus d'intérêt à lancer des modules.
4. **Courbe de PV incohérente** : trashs du biome 1 = 6-12 PV, boss 1 = 30 PV… et trashs du biome 2 = 40-50 PV, plus forts que le boss du biome 1.
5. **Économie gonflée** : en 2 morts, tout le meilleur équipement est achetable → plus rien à poursuivre ; le jeu est « fini » en 5 minutes.
6. Les simulations le confirmaient : sur 1000 runs, 845 morts dans les biomes 1-2, seulement 5 au biome 4.

## 2. Décisions de conception tranchées (amendent la SPEC — à intégrer sans re-poser)

- **D1 — Énergie de combat** (amende §SPEC-5.2 « pas de mana ») : le lancement d'un module n'est plus gratuit. Chaque tour, le joueur régénère **+E énergie** (data, ~3), l'énergie se conserve **au sein d'un combat** (plafond data, ~8) et revient au niveau de départ **à chaque nouveau combat**. L'identité est conservée : **les orbes restent sacrifiées à la création**, aucun consommable de mana, rien ne se grind entre les combats. Coûts par action (data) : attaque de base 1 ; module tier 1 = 2 ; tier 2 = 4 ; tier 3 = 7. Compagnon : compétences **gratuites** (coût déjà payé en orbes). **Invariant de design : aucun module tier ≥ 2 ne peut être lancé à chaque tour.**
- **D2 — Modules indexés sur l'attaque** (amende §SPEC-5.2) : dégâts/effets de modules = base (data) + **ATK du joueur × ratio par palier** (data). L'arme est nerfée en contrepartie : le meilleur équipement tier 1 tue un trash du biome 1 en **2-3 coups**, jamais en un seul.
- **D3 — Courbe ennemie continue** : PV et dégâts des monstres monotones sur les 4 biomes, boss = pics nets. **Invariant : aucun trash du biome N+1 n'a plus de PV que le boss du biome N.**
- **D4 — Économie ralentie** : production ralentie, caps plus stricts, coûts multipliés ; le haut de gamme exige des quantités de mercurium/optifibre **inaccessibles sans avoir atteint les biomes 3-4**. Cible : équipement complet ≈ 15-20 runs.
- **D5 — Compagnon = bug, pas redesign** : le système prévu est bon, c'est l'exécution qui casse. Diagnostiquer et réparer, ne pas reconcevoir.
- Chaque ticket amende la section correspondante de `docs/SPEC.md` dans son commit (le rapporter dans le corps du commit).

## 3. Tickets (ordre strict)

### R10-01 — Compagnon : diagnostic et réparation du parcours complet *(priorité absolue)*
- **Constat** : le joueur n'a jamais réussi à jouer avec un compagnon. Les tests existants passent — le bug est donc probablement dans le flux UI (états non branchés, condition d'équipe jamais remplie, régression de l'exclusivité équipe/worker B21, compagnon K.O. jamais réveillé…).
- **Contenu** : écrire d'abord un **parcours complet automatisé** qui doit réussir : capturer un monstre (proba seedée forcée) → retour Forge → **visible à l'écurie** → ASSIGN_TO_TEAM → le slot équipe est occupé → lancer une run → **le compagnon apparaît dans le premier combat** → sa bannière de tour s'affiche → USE_COMPANION_SKILL au tour du compagnon fonctionne → il attaque/soigne à son tour. Jouer ce parcours aussi en e2e (`e2e/companion.spec.ts`, 390 px). Toute étape qui échoue = bug documenté (`docs/BUGS.md` B35+) et corrigé à la racine. **Puis rejouer le parcours À LA MAIN en local** (`pnpm dev`, navigateur headed) en capturant chaque étape dans `docs/SCREENSHOTS-R10/` — c'est la preuve que la CI ne peut pas produire, et l'humain n'a jamais vu ce flux marcher.
- **Critères** : parcours complet vert en unitaire **et** e2e **exécutés en local** ; captures d'écran du parcours manuel commitées ; `pnpm vitest run` → exit 0 ; le parcours rejoué par le bot de fuzz ne viole aucun invariant.

### R10-02 — Énergie de combat *(dépend de rien, peut suivre R10-01 en parallèle logique)*
- **Contenu** : implémenter D1 dans le core (state + action, tout chiffré en `src/data/balance.ts` `TODO-BALANCE`) : régénération par tour, plafond, conservation intra-combat, reset au combat suivant, coûts par action et par palier. UI : **jauge d'énergie visible** dans le HUD de combat, **coût affiché sur chaque bouton**, refus propre avec message FR (« Pas assez d'énergie — +X/tour »). La fusion d'orbes en combat reste au coût du tour, sans coût d'énergie. Le compagnon n'est pas soumis à l'énergie. Sauvegarde versionnée + migration si le schema change.
- **Critères** : tests : rotation forcée (Déflagration impossible 2 tours de suite), invariant D1 testé sur toute la table des recettes, conservation/reset par combat, refus propre, compagnon non soumis ; **e2e local : jauge visible, coût affiché sur chaque bouton, message de refus réel** ; `pnpm vitest run` → exit 0.

### R10-03 — Modules indexés sur l'attaque + nerf armes + lisibilité des affinités *(dépend de R10-02 pour les coûts affichés)*
- **Contenu** : implémenter D2 (base + ATK × ratio par palier, tout en data). Ré-arbitrer armes vs PV ennemis en data pour D2 (2-3 coups par trash du biome 1 avec le meilleur tier 1). Afficher sur **chaque** attaque/module (joueur et compagnon) le retour d'affinité dans le log : « Résisté ! » (rendu atténué) / « Faiblesse ! » (rendu accentué) — avec les couleurs du palier d'affinité.
- **Critères** : tests : un module lancé avec ATK 5 inflige strictement plus qu'avec ATK 1 ; aucun one-shot d'un trash par une arme tier 1 ; retours Résisté/Faiblesse corrects selon la table d'affinités ; **e2e local : « Résisté ! »/« Faiblesse ! » visibles dans le log de combat réel** ; `pnpm vitest run` → exit 0.

### R10-04 — Courbe ennemie continue *(data uniquement, dépend de rien)*
- **Contenu** : implémenter D3 **uniquement en `src/data/`** : réécrire la table PV/dégâts des monstres des 4 biomes pour une montée continue (boss = pics nets), dégâts ennemis progressifs (le kit de départ encaisse plusieurs coups au biome 1).
- **Critères** : test d'invariant balayant toute la table : PV(trash N+1) ≤ PV(boss N) pour tout N, dégâts monotones par biome ; `pnpm vitest run` → exit 0.

### R10-05 — Économie ralentie *(data uniquement, dépend de rien)*
- **Contenu** : implémenter D4 **uniquement en `src/data/`** : taux de production ÷, caps plus bas, coûts des bâtiments/équipements ×, et le meilleur équipement exige des montants de mercurium/optifibre qu'on ne peut pas accumuler sans atteindre les biomes 3-4. Garder la règle §SPEC-6.3 : le tier 1 reste accessible aux seuls communs.
- **Critères** : test simu : un bot qui meurt au biome 1 pendant 20 runs **ne peut pas** acheter tout le meilleur équipement (assertion sur l'état de la save simulée) ; tier 1 toujours achetable aux communs ; `pnpm vitest run` → exit 0.

### R10-06 — Re-simulation et re-équilibrage V1.1 *(dépend de R10-02..R10-05)*
- **Contenu** : mettre à jour le bot compétent pour qu'il joue avec l'énergie (alterne attaque/modules, tienne compte des coûts). 1000 runs : taux de victoire, distribution des morts **par biome** affichée. Ajuster **uniquement `src/data/`** pour : distribution des morts plus étalée (cible indicative ≤ 50 % au biome 1, les 4 biomes doivent être visités par le bot), et bande première-run **0,1-0,2 %** conservée (§SPEC-2).
- **Critères** : stats visibles dans la sortie du test ; bande 0,1-0,2 % tenue ; `pnpm vitest run` → exit 0.

### R10-07 — Passe de lisibilité combat **[playtest]** *(dépend de tout)*
- **Contenu** : vérifier l'ensemble en conditions réelles : jauge d'énergie + coûts sur les boutons, retours Résisté/Faiblesse partout (joueur, modules, compagnon), bannière de tour, HUD lisible à 390 px. Mettre à jour `docs/SPEC.md` avec les amendements D1-D4, puis `docs/VERIFICATION.md` re-exécuté (format existant, phase R10).
- **Critères** : e2e vert 390 px + 2560 px ; `pnpm install && pnpm vitest run && pnpm build` → exit 0 ; CI verte ; **playtest humain** : un combat se comprend sans doc (énergie, coûts, affinités).

### R10-08 — Suite IHM locale exhaustive *(dépend de tout — la grande preuve que la version web ne pouvait pas produire)*
- **Contexte** : en session web, les specs e2e ont été écrites mais jamais exécutées par l'agent (pas de navigateur) — seule la CI les jouait, et aucun screenshot n'a jamais été produit. En local, tout devient possible : ce ticket en profite au maximum.
- **Contenu** :
  1. **Exécuter localement** la suite e2e existante (smoke, forge, combat, responsive 390/2560) : `pnpm test:e2e` → exit 0. Toute spec qui échoue = bug (`docs/BUGS.md`) à corriger avant la suite.
  2. **Étendre la suite e2e** avec des parcours IHM réels : parcours compagnon complet (R10-01) ; jauge d'énergie + coûts + refus propre (R10-02) ; « Résisté !/Faiblesse ! » dans le log (R10-03) ; **export/import de save via vrai fichier** (événement download + `setInputFiles`) ; **persistance localStorage à travers `page.reload()`** ; navigation clavier des menus de combat + focus visible ; **touch** (contexte Playwright `hasTouch: true` à 390 px, hit-zones ≥ 44 px) ; **audio** (les déclencheurs ne lèvent pas d'exception avec un `AudioContext` actif, mute persisté) ; **matrice de viewports 390 / 768 / 1440 / 2560** sur les écrans clés (titre, Forge, carte, combat).
  3. **Captures d'écran de preuve** commitées dans `docs/SCREENSHOTS-R10/` : écran titre, Forge complète (plan, Maison, Labo, écurie), carte du biome 1 avec compagnon en équipe, combat avec jauge d'énergie + menu modules (coûts visibles) + log « Faiblesse ! », et le parcours compagnon étape par étape (R10-01). Ce sont ces images que l'humain relit sans lancer le jeu — jamais d'écran vide ou de placeholder.
  4. **Vérification headed finale** : `pnpm dev` + parcours manuel complet de l'agent (descente → combat → capture → retour Forge → ré-équipement → nouvelle descente) sans erreur console ; consigner toute erreur/warning dans `docs/QUESTIONS.md`.
- **Critères** : `pnpm test:e2e` → exit 0 en local ; screenshots commités et lisibles ; zéro erreur console pendant le parcours headed ; `pnpm vitest run` → exit 0 ; `pnpm build` → exit 0.

## 4. Règles d'exécution de session

1. **Ordre strict** R10-01 → R10-08 ; R10-01 passe avant tout.
2. **Un ticket = un commit** (`R10-xx: …`) avec les sorties des commandes de preuve dans le corps du commit ; amendement SPEC dans le ticket concerné.
3. **Coupe-circuit** : 3 échecs consécutifs → `docs/BLOCKED.md` + ticket non dépendant suivant ; jamais affaiblir un test pour passer.
4. Toute régression d'un test existant = bug (test de régression + entrée `docs/BUGS.md`).
5. Manque d'info : option la plus simple, commit documenté, `docs/QUESTIONS.md`.
6. Tickets **[playtest]** : implémentés, preuves auto exécutées, marqués « EN ATTENTE DE VALIDATION HUMAINE » dans `docs/PROGRESS.md`.
7. **Périmètre strict** : les changements de chiffres vont dans `src/data/` (`TODO-BALANCE`) ; aucune nouveauté de conception au-delà de D1-D5 ; les idées vont dans `docs/BACKLOG.md`.
8. Fin de session : `docs/PROGRESS.md` complété pour la phase R10 (état par ticket, simulations R10-06, dernier commit).
9. **Session LOCALE** : tu disposes d'un vrai navigateur — `pnpm test:e2e` doit être **réellement exécuté et vert** à chaque ticket avec une facette UI (R10-01, R10-02, R10-03, R10-07, R10-08) ; ce n'est **plus délégué à la CI**. Les captures d'écran demandées sont commitées (pas de binaire hors assets).

## 5. Commandes de preuve (après chaque ticket)

```
pnpm install
pnpm vitest run        # exit 0
pnpm test:e2e          # exit 0 — exécuté EN LOCAL, plus seulement en CI
pnpm build             # exit 0
```

Tickets **[playtest]** : en plus `pnpm test:e2e` et l'URL Pages sur téléphone réel (390 px + 2560 px).

## 6. Vague 2 (R11) — NE PAS CODER PENDANT CETTE SESSION

Plan indicatif, brief complet (`docs/BRIEF-R11.md`) à rédiger après validation humaine de la vague 1 :
- **Fusion module + module** : les paliers supérieurs se construisent en fusionnant des **modules** entre eux (pas seulement des orbes) ; codex refondu (« réalisables avec vos modules actuels ») ; c'est le cœur du jeu : chaque run propose d'autres combinaisons.
- **Labo refondu** : **améliorations permanentes** des modules (-1 coût d'énergie, +dégâts, +portée) **+ recettes exclusives au Labo**, UI séparant clairement permanent vs run (suppression du doublon « débloquer des sorts déjà débloqués »).
- **Compagnons manquants** (6-8 types nommables) + contenu (monstres, contrats, défis).

## 7. Prompt de lancement (à donner à l'agent, en local)

> Tu continues le jeu Riftforge, **session autonome courte exécutée EN LOCAL** dans ce repo (tu as Node, un navigateur, et `pnpm dev`/`pnpm test:e2e` disponibles — contrairement aux sessions précédentes en bac à sable). Les itérations 0-9 sont TERMINÉES et validées — ne les refais pas, ne les refactorise pas au-delà des tickets. Lis d'abord `docs/BRIEF-R10.md` (ton contrat de travail), `docs/SPEC.md`, `docs/BUGS.md` et `docs/PROGRESS.md` (état actuel). Puis exécute les tickets dans l'ordre strict R10-01 → R10-08, un ticket = un commit au format « R10-xx: … » avec la sortie de `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` dans le corps du commit. R10-01 (compagnon cassé : parcours complet capture → écurie → équipe → combat → compétence, en unitaire, en e2e exécuté localement ET à la main en headed avec captures d'écran) passe avant tout. La suite e2e Playwright doit être réellement exécutée et verte en local à chaque ticket UI — ce n'est plus délégué à la CI ; le ticket R10-08 l'étend (export/import de save par vrai fichier, persistance après reload, clavier + focus, touch à 390 px, audio, matrice 390/768/1440/2560) et committe des captures d'écran de preuve dans `docs/SCREENSHOTS-R10/`. Règles absolues : toutes les règles transverses de `docs/BRIEF.md` §2 restent en vigueur (core headless pur, RNG seedé, data ≠ logique, TODO-BALANCE en data, 100 % client, responsive 390 px → 2560 px, code EN/textes FR). Les décisions D1-D5 du brief §2 amendent la SPEC — intègre-les sans les re-poser et reporte-les dans `docs/SPEC.md`. Chiffres : uniquement dans `src/data/`, jamais en dur dans le core. Coupe-circuit à 3 échecs (`docs/BLOCKED.md` + ticket suivant), ticket [playtest] jamais validé par toi, `docs/QUESTIONS.md` pour tout manque, `docs/PROGRESS.md` final obligatoire. Ne code PAS la vague 2 (§6 du brief) : périmètre strict, les idées vont dans `docs/BACKLOG.md`. Toute régression d'un test existant = bug (test de régression + `docs/BUGS.md`). Commence maintenant.