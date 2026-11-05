
# RIFTFORGE — Brief d'implémentation R11 : refonte V1.2 (vague 2)

> Quatrième brief, **session courte en LOCAL** (navigateur + Node + `pnpm dev`/`pnpm test:e2e` disponibles, comme R10). Les itérations 0-9 **et la vague R10** sont TERMINÉES — ne rien refaire au-delà des tickets ci-dessous. Ce brief répond aux constats du playtest post-R10 (§1). **R12 (atelier UX globale + branchement ComfyUI pour images/vidéos) est planifié en §6 mais NE DOIT PAS ÊTRE CODÉ pendant cette session.**
>
> Références : `docs/SPEC.md`, `docs/BRIEF.md` §2 (règles transverses, en vigueur), `docs/BRIEF-R10.md` (décisions D1-D5, intégrées), `docs/BUGS.md` (B37, B38), `docs/PROGRESS.md`.

---

## 1. Constats du playtest post-R10 (le pourquoi de ce brief)

1. **Énergie ✅ validée** : les combats font réfléchir — on garde tel quel.
2. **Compagnon toujours muet en combat** — cause racine trouvée : `COMPANION_BY_MONSTER` ne contient que la Mousse (et son élite) ; capturer n'importe quel autre monstre → `?? null` **silencieux** dans `startCombat` (App.tsx). Les tests R10-01 passaient car ils utilisent la Mousse.
3. **Toujours les 2 mêmes modules**, orbes trop abondantes : le catalogue figé rend les 2 optima dominants dès le biome 1.
4. **Scaling ATK non ressenti** : `MODULE_ATK_SCALING_BY_TIER {1: 0.2, 2: 0.5, 3: 0.9}` + `ATK_PER_LEVEL: 1` → invisible en jeu. Aucun retour visuel du lien ATK ↔ dégâts de modules.
5. **Niveau 5 atteint à mi-biome 1** : `LEVEL_XP_THRESHOLDS: [0, 2, 5, 9, 14]` — 14 XP cumulée au total, cap 5, puis progression stoppée sur 3 biomes entiers.

## 2. Décisions de conception tranchées (amendent la SPEC — à intégrer sans re-poser)

- **E1 — Fusion module + module = le cœur du jeu (priorité n°1)** : les paliers supérieurs se construisent en **fusionnant des modules entre eux**. Tier 1 = créé depuis des orbes (inchangé) ; tier 2 = fusion de 2 modules tier 1 ; tier 3 = fusion incluant un module tier 2 (+ orbes). La fusion **consomme** les modules sources. Hors combat : libre ; en combat : coûte le tour (comme la fusion d'orbes). Le codex liste les modules réalisables **avec les modules et orbes actuels** — la « bonne combinaison » change à chaque run.
- **E2 — Tous les monstres capturables sont jouables** : chaque monstre des 4 familles a une définition de compagnon (support, arbre de 5 compétences, textes FR), détaillée dans **`docs/COMPANIONS-R11.md`** (design autoritatif). **Une compétence par palier de lien** : la compétence N se débloque au palier de lien N (1→5), palier 5 = capacité signature ; les orbes renforcent ensuite les compétences débloquées (coûts existants). **Plus jamais de null silencieux** : si un compagnon d'équipe n'a pas de def, message visible à l'écurie et refus au départ en run.
- **E3 — Niveau max 12** (~3 par biome) : courbe d'XP croissante étalée sur les 4 biomes ; gains par niveau relevés (`HP_PER_LEVEL`, `ATK_PER_LEVEL` ×2) pour rendre chaque niveau perceptible.
- **E4 — Scaling ATK visible** : ratios par palier multipliés (~0,6 / 1,0 / 1,5, TODO-BALANCE) et **dégâts prévus affichés sur les boutons** (calculés avec l'ATK courante, la faiblesse de la cible si sélectionnée) — le lien équipement ↔ modules doit se VOIR.
- **E5 — Rareté des orbes** : drops de combats/coffres/nœuds réduits en data ; cible : à la fin du biome 1, ~3-4 modules construits au total. La création redevient un choix, pas un débloquage de catalogue.
- Chaque ticket amende la section correspondante de `docs/SPEC.md` dans son commit (le rapporter dans le corps du commit).
- **Skills importés disponibles** (`docs/skills/`, voir son README) : consulter le skill pertinent selon le ticket — `engine-phaser` et `phaser-verification` pour toute preuve e2e/scène Phaser (fuites au restart de scène, tests déterministes, assertions pixel), `phaser-input` pour tactile/clavier, `phaser-pixel-ui` pour les menus de combat, `game-ui-ux` pour les écrans de la Forge, `save-systems` pour la migration de save (R11-05), `roguelike` pour l'économie d'orbes (R11-01/06), `rpg` pour les courbes de niveau et formules (R11-03/04). **Chaque ticket du §3 désigne les siens** (« Skills à consulter »). Ils complètent les règles transverses, ne les remplacent jamais.

## 3. Tickets (ordre strict)

### R11-01 — Fusion module + module *(priorité absolue — le cœur du jeu)*
- **Contenu** : implémenter E1 dans le core (`FUSE_MODULES` : nouvelle action pure, modules sources consommés, résultat par table en data) + restructurer les recettes en data : tier 2 = 2 modules t1 ; tier 3 = 1 module t2 + 1 module t1 (+ orbes, data). UI : le panneau de fusion sur la carte accepte **2 modules** en plus des 2 orbes (mode « Modules »), résultat prévisualisé depuis le codex. Codex refondu : « réalisables avec vos modules et orbes actuels », plus jamais la liste figée. **Invariant D1 conservé** : aucun module tier ≥ 2 lançable à chaque tour (coûts d'énergie inchangés).
- **Critères** : tests : fusion consomme les sources, refus propre si sources absentes, table complète balayée (tout tier 2/3 joignable depuis les tier 1), RNG seedé inchangé ; **e2e local** : fusion réelle de 2 modules depuis la carte, résultat visible en combat ; `pnpm vitest run` → exit 0.
- **Skills à consulter** : `roguelike` (économie de la run : la fusion comme ressource rare, coût des ingrédients — avant de choisir les coûts en data) ; `game-ui-ux` (panneau de fusion + codex : layout responsive, mises à jour pilotées par événements depuis le core, jamais de polling) ; `phaser-pixel-ui` (overlay du panneau sur la carte, navigation clavier/focus).

### R11-02 — Compagnons : tous les monstres capturables jouables + fin du null silencieux
- **Contenu** : implémenter E2 : définitions de compagnon pour **chaque** monstre capturable des 4 familles (16 monstres, élites mappées automatiquement comme aujourd'hui), en suivant à la lettre **`docs/COMPANIONS-R11.md`** : une compétence par palier de lien (1→5, palier 5 = signature), kinds nouveaux (`stun`, `drain`, `debuff-atk`, `buff-energy`, `capture-bonus`), invariants §4 à tester. UI : l'écurie affiche l'arbre par compagnon (verrous par palier, montée par orbes) ; le menu Compagnons en combat ne liste que les compétences débloquées. Garde-fous : l'écurie marque clairement « compagnon de combat » vs « worker uniquement » ; au départ en run, un compagnon d'équipe sans def = **refus explicite** (message FR) au lieu du null silencieux d'App.tsx.
- **Critères** : tests : **chaque** `monsterId` capturable a une def (assertion sur toute la table des monstres) ; invariants §4 de `docs/COMPANIONS-R11.md` (5 compétences, une par palier, verrous testés par palier, kinds nouveaux purs et seedés, élites ×2) ; parcours capture → écurie → équipe → combat → compétence rejoué pour **au moins un compagnon par famille** ; refus explicite testé ; **e2e local** paramétré (au moins la Mousse ET un compagnon d'une autre famille, 390 px) ; captures d'écran du parcours commitées dans `docs/SCREENSHOTS-R11/` ; `pnpm vitest run` → exit 0.
- **Skills à consulter** : `rpg` (arbres de compétences, déblocage par palier, progression — structure des arbres de `docs/COMPANIONS-R11.md`) ; `game-ui-ux` (écran écurie avec l'arbre et ses verrous, états débloqué/verrouillé/montable) ; `phaser-verification` (parcours e2e déterministe, test de fuite au restart de scène, captures de preuve) ; `engine-phaser` (si la bannière/portrait du compagnon en combat touche la scène : pièges du cycle de vie, cf. B36).

### R11-03 — Niveaux 1 → 12 sur les 4 biomes *(data + core minime)*
- **Contenu** : implémenter E3 : `LEVEL_XP_THRESHOLDS` étirés à 12 niveaux (courbe croissante, ~3 niveaux par biome, XP des monstres/boss croissante en profondeur — data). `HP_PER_LEVEL` ×1,5-2, `ATK_PER_LEVEL` ×2 (data, TODO-BALANCE). HUD : niveau et jauge d'XP visibles en run.
- **Critères** : tests : niveau 12 inatteignable avant le biome 4 en simulation bot (assertion), courbe monotone, gains par niveau exacts ; `pnpm vitest run` → exit 0.
- **Skills à consulter** : `rpg` (courbe de niveau : palier de progression par biome, gains de stats, « growth feel ») ; `game-ui-ux` (HUD niveau/XP piloté par événements, jamais de re-render par frame).

### R11-04 — Scaling ATK rendu visible
- **Contenu** : implémenter E4 : ratios relevés en data (~0,6 / 1,0 / 1,5) ; **dégâts prévus affichés sur les boutons de modules** en combat (« Déflagration — 24 PV », calculés avec l'ATK courante + faiblesse de la cible sélectionnée, mis à jour à chaque changement d'équipement/niveau) ; retours « Faiblesse !/Résisté ! » conservés et renforcés (couleur + montant). Tests d'invariant R10-03 repris avec les nouveaux ratios.
- **Critères** : tests : dégâts calculés affichés = dégâts infligés (même formule, testée), corrélation ATK → dégâts de modules stricte sur toute la table ; **e2e local** : le montant affiché sur le bouton correspond au log après lancement ; `pnpm vitest run` → exit 0.
- **Skills à consulter** : `rpg` (formule de dégâts : base + scaling d'ATQ, lisibilité du lien stats ↔ sortie) ; `game-ui-ux` (affichage des montants sur les boutons, mise à jour à chaque changement d'état) ; `phaser-pixel-ui` (texte des montants lisible en pixel-exact à 390 px comme à 2560 px).

### R11-05 — Labo refondu : améliorations permanentes + recettes exclusives
- **Contenu** : implémenter la décision vague 2 : le Labo vend **uniquement** (a) des **améliorations permanentes** des modules (ex. -1 coût d'énergie, +10 % dégâts — data, achetables avec ressources de biomes profonds, persistées en save) et (b) des **recettes exclusives** (2-3 modules tier 2/3 inédits, uniquement déblocables au Labo). Écran séparant visuellement « PERMANENT » vs « CETTE RUN » ; le Labo ne redébloque jamais ce qui est déjà acquis en run. Save versionnée + migration.
- **Critères** : tests : améliorations persistées entre runs, appliquées en combat, coûts exacts ; recettes exclusives inaccessibles sans déblocage Labo ; doublon unlock/run supprimé ; **e2e local** : achat d'une amélioration visible en combat après retour à la Forge ; `pnpm vitest run` → exit 0.
- **Skills à consulter** : `save-systems` (versionnage du schéma + migration de la save, écriture atomique, refus propre des versions inconnues) ; `game-ui-ux` (écran Labo : séparation visuelle PERMANENT vs CETTE RUN, pile d'écrans de la Forge).

### R11-06 — Re-simulation et re-équilibrage V1.2 *(dépend de tout)*
- **Contenu** : bot compétent mis à jour — il **fusionne des modules** en respectant E1, joue les compagnons (R11-02) et monte de niveau (E3). 1000 runs : bande première-run 0,1-0,2 % **tenue** (`SIM_RUNS_FINAL`, N=1000 — ne jamais lire `SIM_RUNS`, cf. B37), morts étalées (≤ 50 % au biome 1, 4 biomes visités), niveau moyen atteint par biome affiché (~3/biome). Ajuster **uniquement `src/data/`**.
- **Critères** : stats visibles dans la sortie du test ; bande et distribution tenues ; `pnpm vitest run` → exit 0.
- **Skills à consulter** : `roguelike` (économie de run, tables de butin, rareté — calibrage de l'abondance d'orbes et de la bande de victoire) ; `rpg` (courbes XP/niveaux et formules — cohérence des cibles ~3 niveaux par biome). Pas de skill Phaser : la simulation est headless core.

### R11-07 — Passe finale **[playtest]** *(dépend de tout)*
- **Contenu** : captures d'écran des écrans clés avec les nouveautés (fusion de modules, compagnons de chaque famille en combat, jauge d'XP/niveau 12, dégâts affichés, Labo permanent) dans `docs/SCREENSHOTS-R11/` ; parcours headed complet sans erreur console ; `docs/SPEC.md` à jour avec E1-E5 ; `docs/VERIFICATION.md` re-exécuté (phase R11) ; `docs/PROGRESS.md` complété.
- **Critères** : `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` → exit 0 ; CI verte ; **playtest humain** : le compagnon apparaît en combat quel que soit le monstre capturé, la fusion module+module se découvre sans doc, la montée de niveau continue sur le biome 2.
- **Skills à consulter** : `phaser-verification` (preuves finales : Playwright real-GPU, assertions visuelles/pixel, profilage de frames, captures de preuve) ; `engine-phaser` (vérification responsive 390 → 2560 px, chargement des portraits) ; `phaser-input` (tactile 390 px, hit-zones, navigation clavier de bout en bout).

## 4. Règles d'exécution de session

1. **Ordre strict** R11-01 → R11-07 ; R11-01 passe avant tout.
2. **Un ticket = un commit** (`R11-xx: …`) avec les sorties de `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` dans le corps du commit ; amendement SPEC dans le ticket concerné.
3. **Session LOCALE** : `pnpm test:e2e` exécuté réellement et vert à chaque ticket UI ; captures d'écran commitées ; jamais délégué à la CI seule.
4. **Coupe-circuit** : 3 échecs consécutifs → `docs/BLOCKED.md` + ticket non dépendant suivant ; jamais affaiblir un test pour passer.
5. Toute régression d'un test existant = bug (test de régression + entrée `docs/BUGS.md`, à partir de B39).
6. Manque d'info : option la plus simple, commit documenté, `docs/QUESTIONS.md`.
7. Tickets **[playtest]** : implémentés, preuves auto exécutées, marqués « EN ATTENTE DE VALIDATION HUMAINE » dans `docs/PROGRESS.md`.
8. Chiffres uniquement dans `src/data/` (`TODO-BALANCE`) ; aucune nouveauté de conception au-delà de E1-E5 ; les idées vont dans `docs/BACKLOG.md`.

## 5. Commandes de preuve (après chaque ticket)

```
pnpm install
pnpm vitest run        # exit 0
pnpm test:e2e          # exit 0 — exécuté EN LOCAL
pnpm build             # exit 0
```

## 6. Vague suivante (R12) — NE PAS CODER PENDANT CETTE SESSION

Plan indicatif, brief complet à rédiger après validation humaine de R11 :
- **Atelier UX globale** : design des écrans clés (titre, Forge, carte, combat, Labo) — puis application dans le même brief.
- **Branchement ComfyUI en local** : génération d'images (et de vidéos) pour les assets du jeu via le ComfyUI de l'utilisateur, avec conventions d'intégration et fallback (jamais d'écran vide).

## 7. Prompt de lancement (à donner à l'agent, en local)

> Tu continues le jeu Riftforge, **session autonome courte exécutée EN LOCAL** dans ce repo (Node, navigateur, `pnpm dev` et `pnpm test:e2e` disponibles). Les itérations 0-9 et la vague R10 sont TERMINÉES et validées — ne les refais pas. Lis d'abord `docs/BRIEF-R11.md` (ton contrat de travail), `docs/SPEC.md`, `docs/BUGS.md` et `docs/PROGRESS.md`. Puis exécute les tickets dans l'ordre strict R11-01 → R11-07, un ticket = un commit « R11-xx: … » avec la sortie de `pnpm install && pnpm vitest run && pnpm test:e2e && pnpm build` dans le corps du commit. R11-01 (fusion module + module : les paliers supérieurs se construisent en fusionnant des modules entre eux, codex « réalisables avec vos modules actuels ») passe avant tout. R11-02 : les 16 arbres de compagnons font foi dans docs/COMPANIONS-R11.md (une compétence par palier de lien 1→5, palier 5 = signature) + fin du null silencieux (refus explicite, jamais `?? null` sans message). Consulte les skills importés dans docs/skills/ : chaque ticket du brief indique les siens (« Skills à consulter ») — lis le SKILL.md du skill puis sa référence la plus proche du travail en cours, avant de coder le ticket. Les simulations de bande lisent `SIM_RUNS_FINAL` (B37) — ne jamais lire `SIM_RUNS` pour un assert de bande. Règles absolues : règles transverses de `docs/BRIEF.md` §2 en vigueur (core headless pur, RNG seedé, data ≠ logique, TODO-BALANCE en data, 100 % client, responsive 390 → 2560 px, code EN/textes FR). Les décisions E1-E5 du brief §2 amendent la SPEC — intègre-les sans les re-poser et reporte-les dans `docs/SPEC.md`. `pnpm test:e2e` doit être réellement exécuté et vert en local à chaque ticket UI, avec captures d'écran dans `docs/SCREENSHOTS-R11/`. Coupe-circuit à 3 échecs (`docs/BLOCKED.md` + ticket suivant), ticket [playtest] jamais validé par toi, `docs/QUESTIONS.md` pour tout manque, `docs/PROGRESS.md` final obligatoire. Ne code PAS R12 (§6 : atelier UX + ComfyUI) — périmètre strict, les idées vont dans `docs/BACKLOG.md`. Toute régression = bug (test de régression + `docs/BUGS.md` à partir de B39). Commence maintenant.