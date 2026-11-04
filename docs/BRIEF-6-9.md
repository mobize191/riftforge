# RIFTFORGE — Brief d'implémentation : itérations 6 à 9

> Deuxième brief à remettre à l'agent de code (Vibe Code web), pour une **session autonome unique** couvrant les itérations 6-9. Le premier brief (`docs/BRIEF.md`, itérations 0-5) est **terminé** : tous ses tickets sont done, audités dans `docs/VERIFICATION.md`. Ne rien refaire de 0-5.
>
> Références : `docs/SPEC.md` (conception, cité « §SPEC-x »), `docs/BRIEF.md` (règles transverses d'origine, toujours en vigueur), `docs/BACKLOG.md` (contenu attendu), `docs/QUESTIONS.md` (questions — celles listées en §3 ci-dessous sont tranchées).

---

## 1. Mode d'emploi (pour l'humain)

1. Committer ce brief dans le repo en `docs/BRIEF-6-9.md` (le repo existe, Pages est en ligne — pas de geste d'infra à refaire).
2. Donner le **prompt de lancement** (§10) à l'agent de code.
3. Après la session : `git pull`, lire `docs/PROGRESS.md` (mis à jour pour la phase 6-9), jouer les tickets **[playtest]**, répondre à `docs/QUESTIONS.md`, tester sur téléphone via l'URL Pages.
4. Après validation : repasser le repo en privé si souhaité (l'URL Pages s'éteint alors).

## 2. Règles transverses (toutes celles du premier brief restent en vigueur, plus celles-ci)

- **Ne pas retoucher les itérations 0-5** au-delà de ce qu'un ticket 6-9 exige ; toute régression des tests existants = bug à traiter (test de régression + entrée `docs/BUGS.md`).
- **Assets** : désormais autorisés — **Kenney CC0 uniquement** (kenney.nl), fichiers commités dans le repo (`public/assets/`), fichier licence accompagnant chaque pack, chemins relatifs, chargement en client. **Fallback obligatoire** : si un pack ne peut pas être téléchargé depuis l'environnement, le documenter dans `docs/QUESTIONS.md`, générer l'asset en code (style et palette du biome), et noter la substitution pour remplacement humain ultérieur. Aucune autre source, aucun asset payant, aucune dépendance réseau au runtime.
- **Audio** (itération 9) : sons générés en local (jsfxr) ou fichiers libres commités — jamais de streaming/CDN.
- Les autres règles du premier brief §2 (core pur, RNG seedé, data ≠ logique, 100 % client, responsive, TODO-BALANCE en data, code EN/textes FR) s'appliquent telles quelles.

## 3. Décisions tranchées (à intégrer sans les re-poser)

- **Q0-1 ✅** : l'adaptateur `localStorage` dans `src/ui/storage.ts` est l'emplacement définitif.
- **Q2-2 ✅** : les « lingots » restent l'intermédiaire de la Forge Arcane — nom conservé, usage documenté en data (input des tiers supérieurs).
- **Q3-1 ✅** : compagnon piloté via menu « Compagnons » — conservé en V1.
- **Q4-2 ✅** : les recettes à base de composites dépliées en 3 primordiales (palier 3) — conservé.
- **Q0-4/Q6-1 ✅** : vrais assets Kenney CC0 dès l'itération 6 (décision utilisateur).
- **Q6-2 ✅** : Liaiseuse en V1 avec dialogues minimaux (2-3 lignes par événement, FR, aucune histoire).
- **Q5-2 ⚠️ reformulé** : le 0,00 % de R5-07 est un artefact du bot naïf (l'humain finit le biome 1). L'équilibrage passe d'abord par un **bot compétent** (R6-00) ; les valeurs `TODO-BALANCE` ne se règlent qu'après re-mesure.
- Q1-1 : le Marchand passe de 3 à 5-6 équipements achetables (ticket R6-09).

## 4. Itération 6 — Biomes 2-4 & chaîne Forge complète

> Objectif : **la run complète ~30 min à travers 4 biomes** + la ville complète. Une itération = un livrable jouable.

### R6-00 — Bot de simulation compétent + re-mesure *(priorité absolue, rien d'autre avant)*
- **Contenu** : nouveau bot de simulation qui joue comme un humain correct : fabrique les modules de soin dès que possible (Sève synthétique, Condensation), utilise les spores, exploite les faiblesses d'affinité, fuit/réfléchit sous 30 % PV, équilibre création de modules vs montée de compagnon. Rejouer 1000 runs du biome 1 et publier le taux.
- **Critères** : taux de victoire du bot compétent sur le biome 1 affiché dans la sortie du test, **> 20 %** (la cible haute est indicative, l'humain sert de référence) ; si le taux est < 20 %, ajuster **uniquement** `src/data/balance.ts` (PV, soin, drops) jusqu'à l'atteindre ; `pnpm vitest run` → exit 0.

### R6-01 — Biome 2 : les Datacathédrales *(dépend de R6-00)*
- **Contenu** : `src/data/biomes.ts` squelette → playable : famille **gremlins** (3-4 monstres avec faiblesses), ressource **données**, 4 niveaux + boss télégraphié, **twist : les circuits modifient la carte** — des murs/portes se rouvrent/ferment à des déclencheurs (connexité BFS garantie à chaque état, même seed = même séquence). Données chiffrées `TODO-BALANCE`.
- **Critères** : tests : niveaux seedés et connexes dans tous les états de circuits, boss reproductible, ressource données ramassable et transférée à la Forge ; `pnpm vitest run` → exit 0.

### R6-02 — Biome 3 : les Hauts-Fourneaux *(dépend de R6-00)*
- **Contenu** : famille **élémentaires**, ressource **mercurium**, 4 niveaux + boss, **twist : sol brûlant** — zones de dégâts par tour visibles (télégraphiées), évitables, marchables au prix de PV (`TODO-BALANCE`).
- **Critères** : tests : zones de sol infligent leurs dégâts exacts par tour, seedées et visibles en data ; `pnpm vitest run` → exit 0.

### R6-03 — Biome 4 : la Fibration *(dépend de R6-00)*
- **Contenu** : famille **vermine des réseaux** (wyrms, vampires du réseau), ressource **optifibre**, 4 niveaux + boss, **twist : zones accélérées/ralenties** — le joueur et les monstres se déplacent à 1 ou 2 cases (ou sautent un tour) selon la zone ; victoire sur ce boss = **victoire de run** (écran dédié, pas de 5ᵉ biome en V1).
- **Critères** : tests : zones de vitesse appliquées aux deux camps, seedées ; victoire de run → RETOUR avec butin + flag `runCompleted` ; `pnpm vitest run` → exit 0.

### R6-04 — Continuité inter-biomes *(dépend de R6-01..R6-03)*
- **Contenu** : **une seule grande run** traverse les 4 biomes (§SPEC-4.1) : battre le boss ouvre le biome suivant sans retour à la Forge ; les jalons compagnon restent **1 par biome** ; cible de durée ~30 min (paramétrée par le contenu en data, mesurable en tours). Le retour Forge ne se fait qu'à la mort ou à la victoire finale.
- **Critères** : test de rejeu : une run traversant les 4 biomes depuis un seed unique, état final déterministe ; à la mort en biome N, retour Forge avec 100 % du butin ; `pnpm vitest run` → exit 0.

### R6-05 — Chaîne matière complète *(dépend de R6-00)*
- **Contenu** : **Purificateur** et **Nanolathe** jouables (déjà en data `BUILDINGS_V1`) : Extracteur → Purificateur → Nanolathe améliore les intrants disponibles pour Forge et Labo (§SPEC-6.3), avec voisinage bonus (`NEIGHBOR_BONUSES` en data → appliqué réellement : four à côté de la mine etc.).
- **Critères** : tests : la chaîne transforme les intrants par ticks purs, le voisinage applique ses bonus, le retrait d'un bâtiment retire le bonus ; `pnpm vitest run` → exit 0.

### R6-06 — Tiers supérieurs Forge & Labo *(dépend de R6-05)*
- **Contenu** : tiers 2+ des recettes Forge/Labo exigent lingots puis composants puis **ressources de biomes profonds** (mercurium, optifibre) ; le tier 1 reste accessible aux communs (§SPEC-6.3, à ne jamais briser) ; 5-6 équipements au Marchand (Q1-1) + 2-3 craftables de plus.
- **Critères** : tests : tier 1 toujours craftable avec les seuls communs, tiers 2+ refusés sans les intrants, sauvegarde versionnée + migration si le schema de save change ; `pnpm vitest run` → exit 0.

### R6-07 — Maison du héros *(dépend de R6-05)*
- **Contenu** : rangements d'équipement (plusieurs sets, un porté), repos (texte léger), affichage des trophées (boss vaincus, contrats remplis, codex complet).
- **Critères** : tests : changement d'équipement persistant, trophées dérivés de l'état réel ; `pnpm vitest run` → exit 0.

### R6-08 — Contrats étendus *(dépend de R6-01..R6-03)*
- **Contenu** : 6-8 contrats multi-biomes à conditions vérifiables (journal de run) : « vaincre le boss des Datacathédrales sans compagnon », « traverser les Hauts-Fourneaux sans marcher sur une case brûlante », etc. Primes en ressources spécifiques.
- **Critères** : tests : chaque condition évaluée depuis le journal, prime versée une seule fois ; `pnpm vitest run` → exit 0.

### R6-09 — Assets Kenney CC0 **[playtest]** *(peut démarrer dès R6-01, par biome)*
- **Contenu** : intégrer les packs Kenney CC0 (tiles de décors, monstres, portraits) pour les 4 biomes et la Forge ; chaque pack commité avec sa licence ; palette/identité par biome ; fallback code-gen si téléchargement impossible (règle §2). L'écran de combat gagne des **portraits ennemis** (idle + télégraphie, §SPEC-5.1).
- **Critères** : `pnpm build` → exit 0, aucun asset non-CC0, licences commitées ; **playtest** : cohérence visuelle des 4 biomes à 390 px et 2560 px.

### R6-10 — Simulation run complète *(dépend de R6-04, R6-00)*
- **Contenu** : 1000 runs des 4 biomes avec le bot compétent : taux de victoire, durée moyenne en tours, palier de mort dominant — affichés. Indicateur de référence, pas de cible stricte (la cible §SPEC-2 s'arbitre en R9-01).
- **Critères** : `pnpm vitest run` → exit 0, statistiques visibles dans la sortie.

## 5. Itération 7 — Modificateurs de Faille

> Objectif : **le challenge volontaire** — débloqué seulement après une première complétion des 4 biomes (§SPEC-4.4).

### R7-01 — Déblocage et écran d'activation *(dépend de R6-04)*
- **Contenu** : flag persistant `allBiomesCleared` (set à la première victoire de run complète) ; avant chaque plongée, écran de sélection **par biome** des modificateurs actifs ; tant que le flag est absent, le jeu de base reste strictement identique (aucune jauge visible).
- **Critères** : tests : sans flag → aucun modificateur possible, jeu inchangé ; avec flag → activation par biome persistante ; `pnpm vitest run` → exit 0.

### R7-02 — Jauge d'instabilité *(dépend de R7-01)*
- **Contenu** : monte à chaque action (combat, récolte) en data (`TODO-BALANCE`) ; seuils → dangers puis **élites qui traquent le joueur** ; se purge aux **sanctuaires** (bâtiment déjà en data, nœuds en carte ou à la Forge selon le plus simple) ; visible en HUD seulement quand le modificateur est actif.
- **Critères** : tests : jauge monotone seedée, seuils déclenchent élites, purge au sanctuaire, aucun effet sans le modificateur ; `pnpm vitest run` → exit 0.

### R7-03 — Modificateurs restants *(dépend de R7-01)*
- **Contenu** : **+niveaux de monstres**, **élites** (monstres buffés visiblement), **affinités brouillées** (multiplicateurs mélangés seedés), **orbes plus rares** (drops réduits en data).
- **Critères** : tests : chaque modificateur change exactement ce qu'il annonce, combinables, reproductibles par seed ; `pnpm vitest run` → exit 0.

### R7-04 — Récompenses exclusives *(dépend de R7-02, R7-03)*
- **Contenu** : ressources spéciales exclusives, **élites capturables** (compagnons à stats supérieures), bonus de butin — versés en fin de run selon les modificateurs activés.
- **Critères** : tests : récompenses uniquement avec modificateurs, élite capturé = compagnon distingué en data ; `pnpm vitest run` → exit 0.

## 6. Itération 8 — Lien

> Objectif : **la méta-progression compagnons** — paliers 1-5, marqueurs visuels, évolutions, Liaiseuse. Les données `src/data/bond.ts` (`BOND_TIERS`, `EVOLUTION_CONDITIONS`) sont prêtes.

### R8-01 — Sources de lien *(dépend de R6-04)*
- **Contenu** : le lien se nourrit : combats partagés (victoires avec le compagnon vivant), **cadeaux** (objets achetés/offerts, préférences par compagnon en data), moments à la Forge (repos, quêtes) ; accumulation en XP de lien pur, seedé.
- **Critères** : tests : chaque source ajoute son gain exact, palier franchi au bon seuil, persistant ; `pnpm vitest run` → exit 0.

### R8-02 — Paliers 1-5 et marqueurs visuels *(dépend de R8-01)*
- **Contenu** : effets des paliers en data (§SPEC-7.3) : stats, passif d'équipe, nouvelle branche au 3, **évolution au 4**, capacité signature au 5 ; **marqueur visuel par palier** (teinte/insigne/aura sur le sprite et le portrait).
- **Critères** : tests : franchissement des 5 paliers reproductible, bonus appliqués en run uniquement si compagnon de l'équipe ; `pnpm vitest run` → exit 0.

### R8-03 — Évolutions au palier 4 *(dépend de R8-02)*
- **Contenu** : conditions par type (§SPEC-7.4, en data) : monstres (vaincre X de la même race, fusion DQ-Monsters pour l'un des chemins), robots (module rare), humanoïdes (quête personnelle), fées (rituel d'essences) ; l'évolution change le sprite nettement et applique le bonus majeur.
- **Critères** : tests : chaque condition évaluable depuis l'état, évolution irreversible, sprite/marqueur mis à jour ; `pnpm vitest run` → exit 0.

### R8-04 — La Liaiseuse **[playtest]** *(dépend de R8-01)*
- **Contenu** : PNJ permanent à la Forge : gère quêtes de lien et paliers, conseille les évolutions ; **dialogues minimaux** (2-3 lignes par événement, FR, aucune histoire — Q6-2) ; ses quêtes = sources de lien.
- **Critères** : tests : quêtes acceptables/complétées/verrouillées selon l'état ; `pnpm vitest run` → exit 0 ; **playtest** : le rôle de la Liaiseuse est compréhensible sans doc.

## 7. Itération 9 — Polish & équilibrage

> Objectif : **le jeu** — V1.x complète, équilibrée, sonorisée, exportable.

### R9-01 — Équilibrage final par simulation *(dépend de R6-10, R7-04)*
- **Contenu** : arbitrer les valeurs `TODO-BALANCE` restantes avec le bot compétent : victoire première-run du jeu complet (4 biomes, kit de départ) dans la bande **0,1-0,2 %** (§SPEC-2 : 1/500-1/1000) ; biome 1 franchissable par un joueur correct ; modules peu/moins utilisés identifiés (R6-10) remontés en data. **Toutes les valeurs en `src/data/`, jamais en dur dans le core.**
- **Critères** : test : 1000 runs, taux mesuré affiché dans la bande cible (ajuster les data jusqu'à l'atteindre) ; `pnpm vitest run` → exit 0.

### R9-02 — Audio *(dépend de rien)*
- **Contenu** : sons générés (jsfxr) ou libres CC0 commités : UI (menus, achats), carte (pas, ramassage), combat (attaques, modules par élément, victoire/défaite), boss, Forge ; volume discret, coupable ; aucun streaming.
- **Critères** : `pnpm build` → exit 0, aucun CDN ; lecture testée par e2e (présence des déclencheurs, pas d'exception).

### R9-03 — Juice **[playtest]**
- **Contenu** : flashs d'impact par élément, tremblement léger sur gros dégâts, animations d'attaque (télégraphie des ennemis déjà en place), transitions d'écrans, messages de palier/franchissement.
- **Critères** : `pnpm build` → exit 0 ; **playtest** : le combat « vit » sans masquer la lisibilité (390 px inclus).

### R9-04 — Responsive final *(dépend de R6-09)*
- **Contenu** : passe complète 390 px → 2560 px avec les vrais assets : tailles, hit-zones ≥ 44 px, lisibilité des HUD multi-ressources, portraits de combat à l'écran étroit.
- **Critères** : e2e vert sur les deux tailles ; **playtest** : téléphone réel + écran large.

### R9-05 — Export/import de save *(dépend de rien)*
- **Contenu** : boutons dans l'écran titre : **télécharger la save** (JSON versionné — fonctions core existantes) et **charger un fichier** (validation + refus propre des versions inconnues).
- **Critères** : tests : round-trip export → import → état identique ; `pnpm vitest run` → exit 0 ; e2e du parcours boutons.

### R9-06 — Passe finale V1.x *(dépend de tout)*
- **Contenu** : checklist §SPEC-9 V1.x ligne par ligne (biomes 2-4, ~10 bâtiments, chaîne, voisinage, contrats, Maison, 6-8 compagnons génériques nommables, paliers 1-5, modificateurs, défis) — écarts listés dans `docs/PROGRESS.md` avec leur ticket manquant ; mise à jour de `docs/VERIFICATION.md` (re-exécution fraîche de toutes les preuves, format existant).
- **Critères** : `pnpm install && pnpm vitest run && pnpm build` → exit 0 ; CI verte ; `docs/VERIFICATION.md` re-exécuté.

## 8. Règles d'exécution de session (identiques à la nuit, adaptées)

1. **Ordre strict** des tickets, une itération après l'autre ; R6-00 avant tout.
2. **Tickets [playtest]** : implémentés, preuves auto exécutées, marqués « EN ATTENTE DE VALIDATION HUMAINE » dans `docs/PROGRESS.md`, puis continuer.
3. **Coupe-circuit** : 3 échecs consécutifs → `docs/BLOCKED.md` + ticket non dépendant suivant ; jamais affaiblir un test pour passer.
4. **Manque d'info** : option la plus simple, commit documenté, `docs/QUESTIONS.md`.
5. **Fin de session** : `docs/PROGRESS.md` complet pour la phase 6-9 (état par ticket, simulations R6-00/R6-10/R9-01, URL Pages, dernier commit, choix, questions).
6. **Un ticket = un commit** (`R6-01: …`) avec sorties des commandes de preuve.

## 9. Commandes de preuve (après chaque ticket)

```
pnpm install
pnpm vitest run        # exit 0
pnpm build             # exit 0
```

Tickets **[playtest]** : en plus, `pnpm dev` (et URL Pages sur téléphone réel) — 390 px et 2560 px.

## 10. Prompt de lancement (à donner à l'agent de code)

> Tu continues le jeu Riftforge dans ce repo, en session autonome. Les itérations 0-5 sont TERMINÉES et validées — ne les refais pas, ne les refactorise pas. Lis d'abord `docs/BRIEF-6-9.md` (ton contrat de travail), `docs/SPEC.md` (conception) et `docs/PROGRESS.md` (état actuel). Puis exécute les tickets dans l'ordre strict R6-00 → R9-06, un ticket = un commit au format « R6-00: … » avec la sortie de `pnpm install && pnpm vitest run && pnpm build` dans le corps du commit. Règles absolues : toutes les règles transverses de `docs/BRIEF.md` §2 et de `docs/BRIEF-6-9.md` §2 restent en vigueur (core headless pur, RNG seedé, data ≠ logique, TODO-BALANCE en data, 100 % client, responsive, assets Kenney CC0 uniquement avec fallback code-gen documenté). Coupe-circuit à 3 échecs (`docs/BLOCKED.md` + ticket suivant), tickets [playtest] jamais validés par toi, `docs/QUESTIONS.md` pour tout manque, `docs/PROGRESS.md` final obligatoire après R9-06. Toute régression d'un test existant = bug (test de régression + `docs/BUGS.md`). Ne dépasse jamais le périmètre du ticket : les idées vont dans `docs/BACKLOG.md`. R6-00 passe avant tout le reste. Commence maintenant.

## 11. Ce que le modèle de code ne peut pas vérifier (rôle humain)

- **La cohérence visuelle** des packs Kenney mixés entre biomes (R6-09) — c'est la question ouverte §SPEC-13.
- **Le feel** : durée réelle d'une run 4 biomes (~30 min ?), rythme des modificateurs, juice (R9-03).
- **Les arbitrages d'équilibrage** : R6-00 et R9-01 donnent des taux mesurés ; toi seul décides s'ils sont bons.
- **Le téléphone réel** : toujours l'URL Pages, 390 px, touch, save en HTTPS.