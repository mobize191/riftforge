# RIFTFORGE — Brief d'implémentation : itérations 0 à 5 (+ préparation 6-9)

> Document à remettre à l'agent de code (Vibe Code web), conçu pour une **exécution autonome de nuit**. La référence de conception est le **Document de conception Riftforge** (canvas `riftforge-spec`), à copier tel quel dans `docs/SPEC.md` du repo avant de commencer — le brief ci-dessous cite ses sections sous la forme « §SPEC-x ».
>
> Principe directeur hérité du projet d'orchestration : **tickets atomiques, critère = commande qui prouve**. Un ticket ne doit pas obliger le modèle à deviner ; tout ce qui n'est pas écrit ici ou dans `docs/SPEC.md` est un choix libre à documenter dans le commit.

---

## 1. Mode d'emploi (pour l'humain)

1. Créer le repo GitHub `riftforge` — **il peut rester privé pendant la nuit** : le workflow build/test tourne quand même, et le job de déploiement Pages se met automatiquement en *skipped* tant que le repo est privé. Committer ce brief (`docs/BRIEF.md`) et la spec complète (`docs/SPEC.md`). Aucun geste Pages n'est nécessaire à ce stade (le réglage *Settings → Pages → Source : GitHub Actions* n'est pas disponible tant que le repo est privé sur compte gratuit).
2. Donner le **prompt de lancement** (§13) à l'agent de code — il est écrit pour une session autonome longue (une nuit).
3. L'agent exécute les tickets **dans l'ordre** en respectant les **règles d'exécution nocturne** (§11) : les dépendances sont explicites, les tickets [playtest] sont implémentés puis mis en attente de validation, jamais considérés comme validés.
4. Après chaque livraison : `git pull`, puis exécuter les commandes de preuve (§12). Les tickets marqués **[playtest]** exigent en plus une validation humaine en local : lancer `pnpm dev` et jouer — ou directement **sur téléphone via l'URL Pages** (voir geste du matin ci-dessous), qui est mise à jour à chaque commit.
5. **Rituel du matin** : lire `docs/PROGRESS.md` (état par ticket, résultats des simulations, liste des playtests en attente, `docs/BLOCKED.md` et `docs/QUESTIONS.md` si présents). **Puis geste Pages (~2 min)** : ① passer le repo en public (*Settings → Danger zone → Change visibility*) ; ② *Settings → Pages → Source : GitHub Actions* ; ③ onglet *Actions* → re-run du dernier workflow → le site est en ligne sur `https://<compte>.github.io/riftforge/` en ~2-3 min. Jouer la file de playtests → répondre aux questions → relancer ou corriger. Après les tests : repasser le repo en privé (l'URL Pages s'éteint — voir §14).
6. Tout défaut de *feel* (rythme, lisibilité, responsive) se renvoie à l'agent comme retour précis, dans le vocabulaire du ticket concerné — pas en vrac.

---

## 2. Règles transverses (non négociables)

- **Jeu 100 % client** : aucune route serveur, aucun appel réseau, tout est `"use client"`. Aucun backend en V1.
- **Core headless pur** : `src/core/` ne contient que des fonctions pures `(state, action) => state` — **zéro import** React, Phaser, DOM, `localStorage`, `fetch`, `Math.random`, `Date.now`.
  - Le hasard passe par le RNG seedé injecté (`src/core/rng.ts`).
  - L'accès au `localStorage` passe par un adaptateur injecté (interface `StoragePort`) — le core reste testable en Node.
- **Données ≠ logique** : tout contenu (orbes, recettes, monstres, biomes, objets) vit dans `src/data/` en tables TS typées, sans aucune logique.
- **Scaling téléphone → Quad HD dès l'itération 0** : résolution logique fixe + mise à l'échelle nette (Phaser `resolution`/`autoDensity`), hit-zones tactiles ≥ 44 px, aucune valeur en dur dépendant de la largeur d'écran.
- **Stack verrouillée** : Next.js (App Router) + TypeScript `strict`, Phaser 4 embarqué dans un composant React, Vitest, `pnpm`. Pas d'autre dépendance majeure sans accord explicite.
- **Assets** : placeholders gratuits uniquement (Kenney CC0 ou formes/colorsées simples générées en code). Aucun asset payant, aucun téléchargement externe non vérifié.
- **Language** : code et identifiants en anglais, textes visibles en français.

---

## 3. Structure cible du repo (§SPEC-8)

```
riftforge/
├── docs/                  # SPEC.md, BRIEF.md, PROGRESS.md, QUESTIONS.md…
├── src/
│   ├── core/              # logique PURE (voir règles transverses)
│   │   ├── run/           # génération de niveaux, déplacement, orbes au sol
│   │   ├── combat/        # tours, orbes, recettes, capture (itér. 1 : minimal)
│   │   ├── forge/         # (itér. 2+)
│   │   ├── save/          # sérialisation versionnée + StoragePort
│   │   └── rng.ts         # RNG seedé
│   ├── data/              # tables typées, aucune logique
│   ├── ui/
│   │   ├── scenes/        # canvas Phaser : carte de run
│   │   └── screens/       # écrans React DOM : titre, forge, marchand
│   └── app/               # App Router
└── tests/                 # Vitest — le core est testé à 100 %
```

---

## 4. Itération 0 — Socle

> Objectif de l'itération : **le déplacement sur une carte**. Rien d'autre. Chaque ticket = 1 commit.

### R0-01 — Scaffold du repo
- **Contenu** : `create-next-app` (TypeScript strict, App Router, ESLint, pas de CSS framework lourd), `pnpm`, Vitest installé avec un test trivial `tests/smoke.test.ts`, scripts `dev`/`build`/`test` dans `package.json`.
- **Critères** : `pnpm install && pnpm vitest run` → exit 0 ; `pnpm build` → exit 0.

### R0-02 — Types du core
- **Contenu** : `src/core/` avec les types fondamentaux vides de logique : `ElementId` (`'feu'|'eau'|'terre'|'air'`), `Orb`, `Recipe`, `Module`, `MonsterDef`, `RunState`, `GameState` (machinerie Forge/Run/Combat de §SPEC-3).
- **Critères** : `pnpm vitest run` → exit 0 ; `pnpm build` → exit 0 (vérifie `strict`).

### R0-03 — RNG seedé *(dépend de R0-02)*
- **Contenu** : `src/core/rng.ts` — PRNG déterministe (mulberry32 ou équivalent), API : `createRng(seed)`, `next()`, `int(max)`, `pick(array)`, `shuffle(array)`. Aucune autre source d'aléatoire dans tout le projet.
- **Critères** : tests dédiés : même seed → séquence identique ; seeds différents → séquences différentes ; `pick`/`shuffle` ne mutent pas l'entrée.

### R0-04 — Machine à états de la boucle *(dépend de R0-02)*
- **Contenu** : `src/core/run/state.ts` — transitions pures `(state, action) => state` pour la boucle §SPEC-3 : `FORGE → RUN`, entrée/sortie de combat, mort → `RETOUR` (butin conservé, niveaux orbes perdus), fin de biome. Pour l'instant les états sont quasi vides (pas de contenu).
- **Critères** : test de rejeu : depuis un état initial fixe, appliquer une séquence d'actions → état final déterminé ; `pnpm vitest run` → exit 0.

### R0-05 — Sauvegarde versionnée *(dépend de R0-04)*
- **Contenu** : `src/core/save/` — sérialisation `GameState`, champ `version`, migration no-op, `StoragePort` (interface), adaptateur `localStorage`, export/import **JSON** par fichier.
- **Critères** : tests : save → load → état identique ; refus propre d'une save de version inconnue ; `pnpm vitest run` → exit 0.

### R0-06 — Écran titre **[playtest]**
- **Contenu** : `src/ui/screens/` + route `/` client : titre « RIFTFORGE », bouton « Nouvelle descente » qui initialise un état, bouton « Continuer » si save présente (R0-05). Écran responsive testé à 390 px et 2560 px.
- **Critères** : `pnpm build` → exit 0 ; **playtest** : `pnpm dev` → les deux boutons fonctionnent, l'écran reste lisible aux deux extrêmes.

### R0-07 — Carte navigable Phaser **[playtest]**
- **Contenu** : composant React embarquant une scène Phaser 4 (`src/ui/scenes/`) : grille vide 32×24 tuiles, sprite joueur placeholder, déplacement case par case aux flèches/ZQSD+WASD, résolution logique fixe + `autoDensity`, caméra centrée sur le joueur.
- **Critères** : `pnpm build` → exit 0 ; **playtest** : `pnpm dev` → déplacement fluide au clavier, rendu net (pas de flou) en fenêtre 390 px et 2560 px.

### R0-08 — Persistance de session **[playtest]**
- **Contenu** : brancher R0-05 sur l'écran de jeu : la partie en cours est sauvegardée automatiquement (à chaque changement de zone logique, pas à chaque frame) et « Continuer » du titre reprend à l'identique.
- **Critères** : `pnpm vitest run` → exit 0 ; **playtest** : recharger la page → la position du joueur est restaurée.

### R0-09 — Déploiement GitHub Pages (test téléphone) *(dépend de R0-01)*
- **Contenu** : `next.config.ts` avec `output: 'export'` (site 100 % statique, jouable sans serveur — le jeu est déjà 100 % client) + `basePath: '/riftforge'` ; workflow `.github/workflows/deploy.yml` : à chaque push sur `main` → `pnpm install`, `pnpm vitest run`, `pnpm next build` (export statique). Le **job de déploiement Pages** (`actions/upload-pages-artifact` + `actions/deploy-pages`) est **conditionnel : `if: github.event.repository.private == false`** — il doit apparaître *skipped* (neutre, pas en échec) tant que le repo est privé, et se déclencher dès que le repo est public. Les assets Phaser se chargent en relatif (pas d'URL absolue), la sauvegarde `localStorage` doit fonctionner sur une page servie en HTTPS.
- **Critères** : workflow **vert** sur GitHub pendant la nuit avec le job de déploiement *skipped* (preuve : statut du run visible en ligne) ; le job de déploiement se lance dès que le repo passe en public.
- **Note** : ce ticket peut être exécuté dès que R0-01 est vert, sans attendre la fin de l'itération 0 — chaque commit suivant la nuit met à jour le build déployable ; l'URL devient accessible au moment où l'humain rend le repo public (geste du matin, §1).

---

## 5. Itération 1 — Boucle minimale

> Objectif de l'itération : **run → achat → run**. Un niveau, 3-4 monstres, combat à menus complet, retour Forge, marchand qui vend de l'équipement, re-partir avec l'équipement acheté.

### R1-01 — Génération d'un niveau *(dépend de R0-04)*
- **Contenu** : `src/core/run/generate.ts` + `src/data/biomes.ts` (biome 1 minimal) : grille avec murs/sol, entrée, sortie, placement de monstres visibles, orbes au sol et coffres — **tout via le RNG seedé**. Chiffres de la table des recettes §SPEC-5.3 non requis ici (itération 4).
- **Critères** : tests : même seed → même niveau (jusqu'aux placements) ; le niveau est toujours connexe (chemin entrée→sortie) ; `pnpm vitest run` → exit 0.

### R1-02 — Monstres sur la carte + contact **[playtest]** *(dépend de R1-01)*
- **Contenu** : patrouille simple (va-et-vient), contact avec le joueur → sélection de 1-3 monstres de la famille locale → écran de combat. `src/data/monsters.ts` : 3-4 monstres placeholder du biome 1 avec stats minimales (PV, attaque, affinité).
- **Critères** : `pnpm build` → exit 0 ; **playtest** : contact → combat ; fuir le contact impossible en marchant dessus sans déclencher.

### R1-03 — Combat à menus complet *(dépend de R1-02)*
- **Contenu** : `src/core/combat/` : tours de rôle, initiative, **Attaque** (simple), **Objets** (1-2 consommables), **Fuite** (probabilité), victoire → butin (orbes, crédits), défaite → fin de run → retour Forge avec 100 % du butin (§SPEC-3). Écran de combat React DOM simple (pas de portraits animés — itération suivante).
- **Critères** : tests core : déroulé d'un combat complet reproductible depuis un seed ; la défaite conserve le butin ; `pnpm vitest run` → exit 0.

### R1-04 — Orbes simples en combat *(dépend de R1-03)*
- **Contenu** : le joueur démarre avec 3-4 orbes aléatoires (§SPEC-5.2) et peut, dans le menu Attaque & Modules, **lancer** les 4 modules solo du §SPEC-5.3 (Trait incandescent, Jet sous pression, Écran de gravats, Souffle) — lancement gratuit, **pas de création par fusion ici** (itération 4) : les modules solo sont directement disponibles tant qu'on détient l'orbe correspondante.
- **Critères** : tests : chaque module produit son effet (dégâts/bouclier/poussée) ; `pnpm vitest run` → exit 0 ; **playtest** : le menu est lisible.

### R1-05 — Récolte et progression *(dépend de R1-01, R1-03)*
- **Contenu** : orbes visibles au sol et coffres ramassables, sortie de niveau → niveau suivant (niveaux 2-3 du biome 1 = même générateur, difficulté légèrement montée via le RNG), niveaux du joueur (1 → ~5 sur la run, perdus à la mort §SPEC-3).
- **Critères** : tests : ramasser une orbe incrémente le stock et la retire de la carte ; traverser la sortie génère le niveau suivant reproductiblement ; `pnpm vitest run` → exit 0.

### R1-06 — Forge minimale + marchand **[playtest]** *(dépend de R1-03)*
- **Contenu** : `src/core/forge/` minimal + écran React : après mort (ou fin de biome), retour Forge : affichage du butin récolté, marchand avec **2-3 équipements achetables** (crédits), l'équipement acheté **persiste entre les runs** et se porte à la suivante (c'est la préparation, §SPEC-2). Bouton « Redescendre ».
- **Critères** : tests : achat débite, l'équipement survit à deux runs ; `pnpm vitest run` → exit 0 ; **playtest** : la boucle run → achat → run se fait sans friction.

### R1-07 — Équilibrage simulé *(dépend de R1-01..R1-06)*
- **Contenu** : test de simulation : rejouer 1000 runs complètes du core avec seeds différents — mesurer le taux de victoire du niveau 3 du biome 1 avec le kit de départ. Objectif de l'itération 1 : victoire possible mais pas garantie (les cibles §SPEC-2 s'appliquent au jeu complet, pas maintenant). Aucun chiffre d'équilibrage codé en dur dans le core : tout dans `src/data/`.
- **Critères** : `pnpm vitest run` → exit 0 avec le test de simulation vert et le taux affiché dans la sortie du test.

---

## 6. Itération 2 — Forge & production

> Objectif de l'itération : **la boucle rogue-like complète** — run → butin → production/craft à la Forge → meilleure run. Toujours un seul biome.

### R2-01 — Économie de ressources persistantes *(dépend de R1-06)*
- **Contenu** : `src/core/forge/` + `src/data/items.ts` : les trois ressources communes (§SPEC-6.3) — **crédits**, **essence**, **minerai brut** — gagnées via le butin de run, portefeuille persistant entre les runs. Aucune ressource spécifique de biome ici (itération 5).
- **Critères** : tests : gain/dépense corrects, solde jamais négatif, persistance sur deux runs ; `pnpm vitest run` → exit 0.

### R2-02 — Extracteur → Forge Arcane *(dépend de R2-01)*
- **Contenu** : production par **ticks purs** : `advanceProduction(state, ticks) => state`, cadences et coûts dans `src/data/buildings.ts`. Chaîne simplifiée de l'itération (§SPEC-10 it. 2) : l'Extracteur produit du minerai brut, la Forge Arcane consomme essence + minerai. **Pas de `Date.now` dans le core** : le nombre de ticks écoulés est fourni par l'appelant (l'UI déduit les ticks de l'horloge réelle).
- **Critères** : tests : N ticks → production exacte, reproductible ; `pnpm vitest run` → exit 0.

### R2-03 — Entrepôts et caps *(dépend de R2-02)*
- **Contenu** : caps de stockage par ressource (§SPEC-6.4) dans `src/data/buildings.ts`, entrepôt améliorable ; la production s'arrête au cap (rien n'est perdu silencieusement).
- **Critères** : tests : production plafonnée au cap, amélioration = cap supérieur ; `pnpm vitest run` → exit 0.

### R2-04 — Labo de canalisation minimal *(dépend de R2-01)*
- **Contenu** : Labo **dès le départ** (§SPEC-6.3) : recettes tier 1 ne demandant que du commun (essence + minerai brut) ; **slots de canalisation 3 de base, améliorables** (§SPEC-5.2) ; fusions moins chères au Labo (malus/bonus en data).
- **Critères** : tests : recette tier 1 craftable avec les seuls communs, slots améliorables, coût réduit au Labo ; `pnpm vitest run` → exit 0.

### R2-05 — Craft d'équipement *(dépend de R2-02, R2-04)*
- **Contenu** : 2-3 équipements **craftables** à la Forge Arcane en plus des achetables du Marchand (R1-06) ; stats et coûts dans `src/data/equipment.ts` (valeurs `TODO-BALANCE` documentées, aucune logique) ; l'équipement persiste et se porte en run.
- **Critères** : tests : craft débite les ressources, l'équipement survit à deux runs ; `pnpm vitest run` → exit 0.

### R2-06 — Écran Forge **[playtest]** *(dépend de R2-01..R2-05)*
- **Contenu** : écran React DOM (`src/ui/screens/`) : bâtiments avec niveaux, production en cours, boutons craft/améliorer, portefeuille, retour au Marchand existant. Responsive 390 px / 2560 px.
- **Critères** : `pnpm build` → exit 0 ; **playtest** : les actions courantes se font sans friction aux deux extrêmes.

### R2-07 — Production pendant la run *(dépend de R2-02)*
- **Contenu** : **production en temps réel borné pendant la run** (§SPEC-6.4) : les ticks s'accumulent pendant la descente, collectés au retour ; entretien léger en crédits.
- **Critères** : tests : X ticks simulés pendant une run → production créditée au retour, entretien appliqué ; `pnpm vitest run` → exit 0.

### R2-08 — Simulation économique *(dépend de R2-02, R2-03)*
- **Contenu** : test : 24 h simulées de production → **aucun enrichissement infini** (caps tenus, entretien payé), le rythme reste borné par les caps et l'entretien.
- **Critères** : `pnpm vitest run` → exit 0, valeurs affichées dans la sortie du test.

---

## 7. Itération 3 — Captures & 1ᵉʳ compagnon

> Objectif de l'itération : **une équipe en combat** — capturer, recruter, monter des compétences par jalons.

### R3-01 — Capture *(dépend de R1-03)*
- **Contenu** : action **Capturer** en combat après affaiblissement (§SPEC-5.4) : probabilité selon PV restants + affinité, table dans `src/data/capture.ts` ; succès → le monstre rejoint le butin (compagnon potentiel / worker / matière).
- **Critères** : tests : probabilité monotone (moins de PV = mieux), tirage seedé, fuite de la capture si le monstre meurt ; `pnpm vitest run` → exit 0.

### R3-02 — Compagnon générique & support *(dépend de R3-01)*
- **Contenu** : 1 compagnon générique de type monstre, **Support = soins**, **arbre de 5 compétences** dans `src/data/companions.ts` (§SPEC-7.2) ; menu **Compagnons** en combat ; **0-2 slots d'équipe, V1 : 1** ; **ils ne fusionnent pas d'orbes** ; compétences actives gratuites (pas de mana).
- **Critères** : tests : le compagnon agit à son initiative, ses compétences soignent, aucune consommation d'orbes ; `pnpm vitest run` → exit 0.

### R3-03 — Compétence initiale aléatoire + K.O. *(dépend de R3-02)*
- **Contenu** : en début de run, **1 compétence initiale débloquée aléatoirement** (RNG) ; **K.O. → hors combat jusqu'au retour à la Forge, jamais de mort permanente** (§SPEC-7.5).
- **Critères** : tests : tirage initial seedé, K.O. → indisponibilité puis réveil au retour, pas de suppression du compagnon ; `pnpm vitest run` → exit 0.

### R3-04 — Jalon à 3 choix *(dépend de R3-02)*
- **Contenu** : **1 jalon par biome, vers le milieu** (après le 2ᵉ niveau, §SPEC-7.2) : écran à la Hades, **3 choix** = débloquer une nouvelle compétence OU faire évoluer une existante ; les options de niveau 2 n'apparaissent qu'après le niveau 1.
- **Critères** : tests : toujours 3 options valides, contrainte de prérequis respectée, choix seedé ; `pnpm vitest run` → exit 0.

### R3-05 — Montée de niveau par orbes *(dépend de R3-02)*
- **Contenu** : les compétences montent **niv. 1→5** en dépensant **les orbes du joueur** — coûts croissants **~3 puis 5 puis 10** (§SPEC-7.2, valeurs `TODO-BALANCE` en data) : c'est la tension centrale avec la création de modules (itération 4).
- **Critères** : tests : coûts exacts prélevés sur le stock d'orbes, plafond niv. 5, refus si stock insuffisant ; `pnpm vitest run` → exit 0.

### R3-06 — Écurie, nommage, workers **[playtest]** *(dépend de R3-01)*
- **Contenu** : à la Forge : liste des compagnons capturés, **nommables**, assignation à l'équipe ; assignation en **worker** à un bâtiment = petit bonus de production (données en `TODO-BALANCE`).
- **Critères** : tests : nommage persiste, worker actif → bonus appliqué ; `pnpm vitest run` → exit 0 ; **playtest** : le parcours capture → nommage → équipe est compréhensible sans doc.

### R3-07 — Intégration compagnon *(dépend de R3-01..R3-05)*
- **Contenu** : test de rejeu complet : capture → recrutement → compétence initiale → jalon → montée de niveau → K.O. → retour Forge, tout depuis un seul seed.
- **Critères** : `pnpm vitest run` → exit 0, état final déterministe.

---

## 8. Itération 4 — Fusions & codex

> Objectif de l'itération : **le vrai système de combat** — orbes → modules, codex permanent, affinités.

### R4-01 — Moteur de fusion *(dépend de R1-04)*
- **Contenu** : `src/core/combat/fuse.ts` : fusionner des orbes → **orbe composite** ; règles §SPEC-5.3 : **doubler une orbe l'amplifie**, opposition **Feu ↔ Eau** (extinction = fusion refusée), **paliers tier 1 / tier 2** (tier 2 = recettes à base de composites).
- **Critères** : tests : fusion valide consomme ses orbes, opposition refusée proprement, doublage → module amplifié, palier correct ; `pnpm vitest run` → exit 0.

### R4-02 — Table des 18 recettes *(dépend de R4-01)*
- **Contenu** : `src/data/recipes.ts` : **les 18 recettes complètes de §SPEC-5.3**, effets chiffrés en data (`TODO-BALANCE` : valeurs de dev, aucune logique) ; **la création d'un module consomme ses orbes** (§SPEC-5.2) ; tier de chaque recette marqué.
- **Critères** : tests : les 18 recettes chargent, chacune produit son effet (dégâts / bouclier / poussée / soin / DoT / contrôle), consommation d'orbes à la création ; `pnpm vitest run` → exit 0.

### R4-03 — Codex permanent *(dépend de R4-02)*
- **Contenu** : **toute recette découverte une fois est connue pour toujours** (save versionnée + migration) ; en run, l'interface liste **tous les modules réalisables avec les orbes actuelles**, avec leur palier (§SPEC-5.2) — on ne fusionne jamais à l'aveugle.
- **Critères** : tests : découverte → sauvegarde → visible dans la run suivante ; la liste ne propose que le réalisable ; `pnpm vitest run` → exit 0.

### R4-04 — Fusion hors combat / en combat *(dépend de R4-01)*
- **Contenu** : fusion **libre hors combat**, **coûte 1 tour en combat** (§SPEC-5.2).
- **Critères** : tests : hors combat → gratuit et illimité ; en combat → passe le tour une fois ; `pnpm vitest run` → exit 0.

### R4-05 — Orbes composites auto-conservées *(dépend de R4-01)*
- **Contenu** : en fin de combat, les **orbes composites non consommées sont conservées automatiquement** (§SPEC-5.2) ; à la mort, les orbes primordiales non consommées sont perdues, pas les composites (§SPEC-3).
- **Critères** : tests : fin de combat → composites conservées ; mort → primordiales perdues, composites conservées ; `pnpm vitest run` → exit 0.

### R4-06 — Affinités & faiblesses *(dépend de R1-03)*
- **Contenu** : `src/data/affinities.ts` : cycle simple à mémoriser + opposition Feu ↔ Eau + **exceptions cyber en commentaire** (virus > machines, acide > blindés — pour V2, §SPEC-5.3) ; chaque monstre du biome 1 a au moins une faiblesse exploitable.
- **Critères** : tests : multiplicateurs d'affinité appliqués dans les deux sens ; `pnpm vitest run` → exit 0.

### R4-07 — Grimoire pré-enregistré **[playtest]** *(dépend de R4-02)*
- **Contenu** : soupape anti-lenteur (§SPEC-12) : enregistrer jusqu'à 3 **compositions favorites** (fusions prédéfinies) et les exécuter en un clic ; mesure du rythme réservée au playtest.
- **Critères** : `pnpm vitest run` → exit 0 ; **playtest** : est-ce que la fusion en combat ralentit le rythme ? Noter le ressenti dans `docs/QUESTIONS.md`.

### R4-08 — Simulation « première run gagnable » *(dépend de R4-02, R4-06)*
- **Contenu** : test de simulation : 1000 runs du contenu disponible à ce stade, kit de départ seul ; le **taux de victoire est mesuré et affiché**, les cibles vivent dans `src/data/balance.ts` (`TODO-BALANCE`).
- **Critères** : `pnpm vitest run` → exit 0, taux affiché dans la sortie du test.

---

## 9. Itération 5 — Biome 1 complet

> Objectif de l'itération : **une vraie run de ~10-15 min** — 4 niveaux + boss, contrats, défis à tours limités, ressource spécifique.

### R5-01 — Boss du biome 1 *(dépend de R4-02)*
- **Contenu** : `src/data/bosses.ts` : boss des Failles Vertes, **pattern télégraphié** (idle + télégraphie des attaques, §SPEC-5.1), 2-3 phases, faiblesses ; **aucun verrou de stats** : vainquable avec le kit de départ (§SPEC-2).
- **Critères** : tests : pattern reproductible depuis un seed, victoire possible avec le kit de départ dans la simulation ; `pnpm vitest run` → exit 0.

### R5-02 — Structure de biome *(dépend de R1-05)*
- **Contenu** : **4 niveaux + boss** (§SPEC-4.1) avec générateur étendu ; **twist du biome 1 : les racines bloquent/rouvrent des passages** (§SPEC-4.1).
- **Critères** : tests : connexité garantie malgré les racines, niveaux reproductibles par seed, difficulté croissante paramétrée en data ; `pnpm vitest run` → exit 0.

### R5-03 — Ressource spécifique : spores *(dépend de R1-05)*
- **Contenu** : **nœuds de ressources visibles** (§SPEC-4.2) ; la récolte **attire les monstres voisins** ; spores = ressource propre du biome 1, usage soin (data `TODO-BALANCE`).
- **Critères** : tests : récolte incrément le stock et retire le nœud, l'attirement déclenche bien les patrouilles voisines ; `pnpm vitest run` → exit 0.

### R5-04 — Contrats du Marchand *(dépend de R5-01)*
- **Contenu** : `src/data/contracts.ts` : 2-3 **contrats à conditions** (§SPEC-6.5, ex. « vaincre le boss sans compagnon → prime rare »), vérifiés automatiquement à partir du journal de la run, primes versées au retour.
- **Critères** : tests : condition remplie → prime, condition échouée → rien, journal de run complet ; `pnpm vitest run` → exit 0.

### R5-05 — Défis à tours limités *(dépend de R1-03)*
- **Contenu** : **« vaincre en X tours »** (10-20, §SPEC-4.3) : 1 défi par niveau au choix (ex. autel de garde « survivez 15 tours ») ; compteur de tours dans le core ; **échec = pas de mort, juste pas de récompense**.
- **Critères** : tests : limite de tours respectée, récompense rare seulement en cas de succès, aucun état de mort ; `pnpm vitest run` → exit 0.

### R5-06 — Run complète biome 1 **[playtest]** *(dépend de R5-01..R5-05)*
- **Contenu** : intégration bout en bout : descente → 4 niveaux → boss → retour Forge avec 100 % du butin ; une run vise **~10-15 min**.
- **Critères** : `pnpm vitest run` → exit 0 ; `pnpm build` → exit 0 ; **playtest** : une run entière de bout en bout, noter durée et friction dans `docs/QUESTIONS.md`.

### R5-07 — Équilibrage étendu *(dépend de R5-01..R5-05)*
- **Contenu** : simulation : 1000 runs **complètes du biome 1** : taux de victoire, durée moyenne en tours, modules les plus/moins utilisés — tout affiché dans la sortie du test, cibles dans `src/data/balance.ts`.
- **Critères** : `pnpm vitest run` → exit 0, statistiques visibles dans la sortie.

---

## 10. Itérations 6-9 — préparation conditionnelle UNIQUEMENT

> **STOP explicite.** Les itérations 6-9 de la roadmap (§SPEC-10) — biomes 2-4, modificateurs, lien, polish — **ne se codent pas pendant la nuit** : elles dépendent des playtests de l'itération 5 et de réponses aux questions ouvertes (§SPEC-13). Le modèle ne doit faire, après R5-07, **que** les tickets de préparation suivants (données et squelettes, aucune logique de gameplay) :

- **P6-A** — `src/data/biomes.ts` : squelettes des biomes 2-4 (Datacathédrales/données, Hauts-Fourneaux/mercurium, Fibration/optifibre) : identité, famille de monstres, ressource, twist — en simples données descriptives.
- **P6-B** — `src/data/buildings.ts` : les ~10 bâtiments V1 (§SPEC-6.4) : noms, tiers, coûts placeholder `TODO-BALANCE`, voisins bonus décrits en data.
- **P6-C** — `src/data/bond.ts` : paliers de lien 1-5 (Étincelle→Flamme→Brasier→Fournaise→Fusion, §SPEC-7.3), marqueurs visuels, conditions d'évolution par type (§SPEC-7.4) — en data.
- **P6-D** — `docs/QUESTIONS.md` : toutes les questions d'implémentation soulevées pendant la nuit, classées par itération concernée.

**Après P6-D, la session s'arrête** (écrire `docs/PROGRESS.md` final). Toute tentative d'aller plus loin = violation du contrat.

---

## 11. Règles d'exécution nocturne

1. **Ordre strict** : les tickets s'exécutent dans l'ordre du brief ; une itération ne démarre que si les preuves automatiques de tous les tickets précédents sont vertes.
2. **Tickets [playtest]** : les implémenter, exécuter leurs preuves automatiques (`vitest`, `build`), puis les marquer **« EN ATTENTE DE VALIDATION HUMAINE »** dans `docs/PROGRESS.md` et continuer — un playtest n'est **jamais** validé par le modèle.
3. **Aucune dépendance envers un playtest** : les dépendances entre tickets sont des dépendances de code uniquement ; la file de playtests se vide le matin.
4. **Coupe-circuit** : après **3 échecs consécutifs** des preuves sur un même ticket → écrire `docs/BLOCKED.md` (ticket, erreur, hypothèses tentées) et passer au prochain ticket qui ne dépend pas du bloqué. Ne jamais contourner un test en l'affaiblissant.
5. **Manque d'information** : choisir l'option la plus simple, la documenter dans le commit, et l'inscrire dans `docs/QUESTIONS.md`. **Jamais inventer de contenu de gameplay** au-delà des valeurs `TODO-BALANCE` explicitement autorisées en data.
6. **Fin de session** (nuit terminée, blocage, ou P6-D atteint) : `docs/PROGRESS.md` complet — état par ticket (done / en attente playtest / blocked), résultats des simulations (R1-07, R2-08, R4-08, R5-07), **URL Pages déployée et dernier commit publié**, liste des choix faits et des questions posées.
7. **Un ticket = un commit**, message au format `R2-03: …`, avec la sortie des commandes de preuve dans le corps du commit.

---

## 12. Commandes de preuve (à exécuter après chaque ticket)

```
pnpm install
pnpm vitest run        # doit finir exit 0
pnpm build             # doit finir exit 0
```

Tickets **[playtest]** : en plus, `pnpm dev` et vérification humaine en local (390 px et 2560 px).

## 13. Prompt de lancement (à donner à l'agent de code)

> Tu implémentes le jeu Riftforge dans ce repo, en **session autonome de nuit**. Lis d'abord `docs/SPEC.md` (conception complète) puis `docs/BRIEF.md` (ton contrat de travail). Tu exécutes les tickets dans l'ordre **R0-01 → P6-D**, **un ticket = un commit** avec message `R0-01: …` et la sortie des commandes de preuve (§12) dans le corps du commit. Respecte strictement : les règles transverses (§2) — core headless pur, RNG seedé injecté partout, données dans `src/data/`, 100 % client, responsive dès l'itération 0 ; les règles d'exécution nocturne (§11) — coupe-circuit à 3 échecs (`docs/BLOCKED.md`), tickets [playtest] jamais validés par toi, `docs/QUESTIONS.md` pour tout manque d'information, `docs/PROGRESS.md` final obligatoire, **arrêt absolu après P6-D** (les itérations 6-9 ne se codent pas). Le ticket R0-09 (déploiement GitHub Pages) doit être exécuté dès que R0-01 est vert : l'URL de test téléphone doit exister le plus tôt possible, et tu veilles à ce que le workflow de déploiement reste vert à chaque commit. Ne dépasse jamais le périmètre du ticket en cours : les idées d'ajout vont dans `docs/BACKLOG.md` au lieu d'être codées. Si une information manque pour compléter un ticket, choisis l'option la plus simple, documente le choix dans le commit et continue.

## 14. Ce que le modèle de code ne peut pas vérifier (rôle humain)

- Le **feel** : fluidité du déplacement, lisibilité des menus, rythme du combat — c'est le playtest local, ticket par ticket [playtest].
- **Le test téléphone** : ouvrir l'URL Pages sur le téléphone réel (pas en mode desktop du navigateur) — c'est le seul vrai test de la cible 390 px : touch, hit-zones, absence de flou, sauvegarde `localStorage` sur HTTPS.
- **Le retour en privé** : quand les playtests téléphones sont finis, repasser le repo en privé (*Settings → Danger zone → Change visibility*) — l'URL Pages s'éteint alors (compte gratuit) ; les forks pris pendant la fenêtre publique, s'il y en a eu, gardent leur copie. Si le test téléphone doit reprendre ensuite : passer le repo sur Vercel ou Cloudflare Pages, qui publient les repos privés.
- Le **rendu sur ton matériel** : 390 px (téléphone) et 2560 px en fenêtre réelle, pas seulement en devtools.
- Les choix d'équilibrage « juste milieu » : les simulations (R1-07, R2-08, R4-08, R5-07) donnent les chiffres, toi seul décides s'ils sont bons — les valeurs `TODO-BALANCE` sont des repères de dev, pas des arbitrages.
- Les **réponses aux questions** : `docs/QUESTIONS.md` (et `docs/BLOCKED.md` si le coupe-circuit a tiré) sont ta première lecture du matin, avant tout relancement.