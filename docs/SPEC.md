# RIFTFORGE — Document de conception & Roadmap

> Roguelike à biomes avec fusions d'orbes élémentaires, ville d'automatisation entre les runs, et compagnons qui évoluent par le lien.
>
> Statut : spécification V1 · revue n°2 après brainstorming détaillé · à implémenter en local (Next.js + TypeScript).
>
> Références assumées : **Hades** (structure roguelike, modificateurs, bonus de run à 3 choix), **Magicka** (combinaisons d'éléments), **Little Alchemy / Doodle God** (découverte par fusion d'éléments primordiaux), **Final Fantasy Pixel Remaster** (vue du dessus, combats à menus), **Dragon Quest Monsters** (fusion de monstres), **Palworld** (monstres-workers), **Against the Storm** / **Loop Hero** (management × roguelike), **The Blood of Dawnwalker** (timer, réservé au mode Chronoforge post-V1).

---

## 1. Vision

Un monde **cyberpunk avec une pointe de fantasy** — la magie y est chimie et technologie, pas sorcellerie : énergie, fluides, matériaux, signaux, données. Vous êtes un·e **technomancien·ne** qui tient **la Forge**, un campement à la lisière des **Failles** — des zones instables infestées de créatures technomagiques. Chaque descente est un roguelike : on récolte des orbes, des matériaux, des monstres. Chaque retour est du management : chaînes de production, équipement, compagnons, liens. La Forge rend la prochaine plongée plus riche — jamais la victoire automatique.

**La phrase-clef :** *Descendre doit toujours être un défi ; revenir doit toujours être un progrès.*

---

## 2. Piliers de design (non négociables)

1. **Gagnable dès la première run, mais très rare** — de l'ordre de **1/500 à 1/1000** : les étoiles doivent être alignées. Aucun verrou de statistiques : tout boss est vainquable avec le kit de départ. La puissance vient du choix des orbes (skill), pas des chiffres.
2. **Chaque run repart de zéro côté run** : niveau 1, grimoire de la run vide, orbes vides. En revanche on **entre avec l'équipement forgé à la Forge** — c'est ça, la préparation.
3. **Les fusions d'orbes sont l'expression du skill.** Combattre = choisir, combiner, connaître les faiblesses ennemies.
4. **Le lien, pas les niveaux.** Les compagnons évoluent via le système de lien — méta et persistant — jamais via l'XP de run.
5. **Difficulté volontaire.** Le jeu de base est calme et constant ; les **Modificateurs de Faille** (dont la jauge d'instabilité) ne s'activent qu'après avoir complété tous les biomes une première fois, et ré-équilibrent le challenge contre des récompenses exclusives.

---

## 3. Boucle de jeu & notion de session

```
FORGE (préparation : équipement, bâtiments, liens)
   ──▶ FAILLE (run : on avance jusqu'à la mort ou la fin du dernier biome)
   ──▶ RETRAIT à la Forge avec TOUT le butin récolté
   ──▶ FORGE (dépense : production, craft, compagnons, contrats) ──▶ …
```

- **On ne rentre que si on meurt** (ou si on achève le dernier biome). Pas de retraite volontaire : cela force à aller au bout, et aller plus loin rapporte toujours plus (ressources de biomes profonds, contrats, déblocages).
- **Mort = fin de la run, pas du butin.** On conserve 100 % de ce qui a été récolté (matières, orbes stabilisées, captures, contrats remplis). Ce qui est perdu : les niveaux de la run, les orbes non consommées et les sorts improvisés non enregistrés.
- **Une session = un cycle Forge + run, ~30-45 min** ; une run complète vise **~30 min** (15 min pour les runs rapides/expertes).
- **Structure de jeu continue** : la Forge ne reset jamais. (Le concept « tout recommencer à intervalle fixe » façon Dawnwalker est un autre jeu : réservé au mode Chronoforge, post-V1.)

---

## 4. Les runs — la Faille

### 4.1 Structure

- **Une seule grande run** composée de **4 biomes** en V1 (le 5ᵉ et suivants : post-V1 ; un 2ᵉ parcours façon NG+ : idée notée).
- **Amendement E3 (R11) — niveaux 1→12 sur les 4 biomes** : `LEVEL_XP_THRESHOLDS` = 12 seuils (data) à courbe croissante, **~3 niveaux par biome** ; niveau max 12. Gains par niveau relevés (`HP_PER_LEVEL` x~1,5, `ATK_PER_LEVEL` x2, data TODO-BALANCE) pour rendre chaque niveau perceptible. **XP des monstres/boss croissante en profondeur** (`XP_PER_KILL_BY_BIOME`, `XP_BOSS_BONUS_BY_BIOME`, data). HUD de run : niveau (max 12) + jauge d'XP visibles.
- Chaque biome : **3-4 niveaux + 1 boss**. Battre le boss ouvre le biome suivant.
- Chaque biome a : une **famille de monstres** dominante, **1 ressource spécifique** (2 en V2), un **twist de gameplay**, une identité visuelle forte.
- Biomes proposés (noms de travail) :
  1. **Les Failles Vertes** — égouts chimiques envahis de spores ; tutorial doux ; ressource : **spores** (soins). Twist : les racines bloquent/rouvrent des passages.
  2. **Les Datacathédrales** — serveurs gothiques hantés de gremlins ; ressource : **données**. Twist : circuits qui modifient la carte.
  3. **Les Hauts-Fourneaux** — forges habitées par des élémentaires ; ressource : **mercurium**. Twist : sol brûlant, zones de dégâts.
  4. **La Fibration** — tunnels de fibre optique, wyrms et vampires du réseau ; ressource : **optifibre**. Twist : zones accélérées/ralenties.

### 4.2 Présentation

- **Vue du dessus 2D à sprites** (façon FF Pixel Remaster), grille de déplacement, brouillard partiel.
- **Monstres visibles sur la carte** (patrouilles simples) ; contact → rencontre avec **1 à 3 monstres** tirés de la famille locale → écran de combat.
- **Nœuds de ressources visibles** (filons, nodules, épaves) ; récolte = action sur place, attirable par les monstres voisins.
- **Orbes élémentaires visibles** — la récolte principale (voir §5.2).

### 4.3 Défis à tours limités (remplacent les salles chronométrées)

En tour par tour, pas de chrono : les défis sont **« vaincre en X tours »** (10-20 selon le défi). Réussite = ressource rare ou orbe composite ; échec = pas de mort, juste pas de récompense. Exemple : autel verrouillé — « survivez 15 tours à la garde ».

### 4.4 Modificateurs de Faille (difficulté volontaire)

- **Déblocage : après avoir complété tous les biomes une première fois.** Avant cela, le jeu de base est toujours le même — pas de jauge, pas d'élites surprises.
- Modulateurs activables par biome (avant de plonger) :
  - **Instabilité** : la jauge monte à chaque action (combat, récolte) ; seuils → dangers puis élites qui traquent le joueur ; se purge aux sanctuaires.
  - **+niveaux de monstres**, **élites**, **affinités brouillées**, **orbes plus rares**, etc.
- Récompenses : ressources spéciales exclusives, monstres élites capturables, bonus de butin.

---

## 5. Le combat

### 5.1 Format

- **Tours de rôle à menus** : **Attaque & Modules** (menu fusionné — l'arme et les modules sont deux faces de la même canalisation), **Objets**, **Compagnons**, **Fuite**.
- Initiative par personnage, max 3 monstres ennemis à l'écran, joueur + 0-2 compagnons.
- Ennemis en **grands portraits 2D animés** (idle + télégraphie des attaques), effets et flashs.

### 5.2 Orbes & modules (l'âme du jeu)

**Les orbes** sont la matière première : de petites boules colorées **accumulables tout au long de la run**. **Les modules** sont les compétences qu'on en tire — pas des « sorts » magiques : des **évolutions technologiques** (attaque acide, décharge plasma, infestation virale…).

**Règle centrale : les orbes se sacrifient à la CRÉATION, pas au lancement.**

- Lancer un module acquis est **gratuit en orbes — pas de consommable de mana**. La ressource rare, c'est la création.
- **Amendement D1 (R10) — Énergie de combat** : lancer un module n'est plus gratuit en *tours-effectifs*. Chaque round, le joueur régénère **+E énergie** (data, `BALANCE.COMBAT_ENERGY_REGEN`) ; l'énergie se conserve **au sein d'un combat** (plafond `COMBAT_ENERGY_MAX`) et revient au niveau de départ (`COMBAT_ENERGY_START`) **à chaque nouveau combat**. Coûts (data) : attaque de base = 1 ; module palier 1 = 2, palier 2 = 5, palier 3 = 8. **Invariant : aucun module de palier ≥ 2 ne peut être lancé à chaque tour** (coût > régénération, testé sur toute la table des recettes). Le compagnon n'est pas soumis à l'énergie (compétences déjà payées en orbes) ; la fusion d'orbes en combat coûte toujours son tour mais aucune énergie.
- **Amendement D2 (R10) — modules indexés sur l'attaque** : dégâts/effets d'un module = base (data) + **ATQ du joueur × ratio par palier** (`BALANCE.MODULE_ATK_SCALING_BY_TIER`, ratios croissants). En contrepartie l'arme est nerfée : **le meilleur équipement tier 1 (commun) tue un trash du biome 1 en 2-3 coups, jamais en un seul** (invariant testé). Sur chaque module de dégâts, le log affiche le retour d'affinité : « **Faiblesse !** » (multiplicateur > 1, rendu accentué) ou « **Résisté !** » (multiplicateur < 1, rendu atténué).
- **Amendement E1 (R11) — fusion module + module, cœur du jeu** : les paliers supérieurs se construisent en **fusionnant des modules entre eux**. Palier 1 = créé depuis les orbes (inchangé) ; **palier 2 = fusion de 2 modules palier 1 distincts** ; **palier 3 = fusion incluant un module palier 2 (+ orbes, data)**. La fusion **consomme les modules sources**. Hors combat : libre ; en combat : coûte le tour (comme la fusion d'orbes). **Aucun module de palier ≥ 2 ne se crée depuis les orbes seules** (refus `fusion-only` dans le core). Le codex liste les fusions **réalisables avec les modules et orbes actuels** — la « bonne combinaison » change à chaque run, plus jamais de liste figée. Invariant D1 conservé (aucun palier ≥ 2 lançable à chaque tour).
- **Créer un module consomme ses orbes** ; le module est ensuite **gardé jusqu'à la fin de la run**.
- En entrant dans la Faille : **3-4 orbes aléatoires** offertes. Récolte ensuite : butin de combats, coffres, orbes visibles sur la carte — l'abondance va croissant, donc **le choix de création s'élargit en avançant**.
- **Orbes composites** : fusionner des orbes produit une orbe composite (conservée **automatiquement** en fin de combat), ingrédient de modules encore plus puissants. En profondeur, on en trouve déjà toutes faites.
- **Slots de canalisation : 3 au départ, jusqu'à ~10** (équipement, Labo) → fusions de plus en plus vastes.

**Le codex permanent — l'accumulation de connaissances :**

- Toute recette découverte une fois est connue **pour toujours**.
- En run, l'interface liste **tous les modules et fusions réalisables avec les orbes ET les modules actuels** (E1) — on ne re-fusionne jamais à l'aveugle les bases (Vapeur = Feu+Eau, etc.) : on clique, c'est créé.
- C'est la méta-progression du joueur : chaque run démarre plus vite grâce aux découvertes précédentes. **La victoire en première run = créer les bons modules avec les orbes du début.**
- Fusion possible à tout moment : hors combat c'est libre, en combat ça coûte un tour (réflexion permise, rythme à soi).
- **Recettes prédictibles et documentées** au codex. Pas de visée façon Magicka.

### 5.3 Les éléments

- **V1 : le classique minimal — Feu, Eau, Terre, Air.** Tout le reste se crée par fusion, par **paliers de découverte** (esprit Little Alchemy : 4 primordiaux → 720 éléments). Règle transverse : **doubler une orbe l'amplifie**.
- **Pas d'élément « Donnée »** : collision avec la ressource du biome 2 — on garde « données » côté ressources uniquement.
- **Pivot cyber-chimique en V2+** : au fil des nouveaux biomes, on glisse vers **Acide, Base, Plasma, Virus, Signal, Nanite**… Le ton reste chimie/technologie, jamais sorcellerie ; la table des recettes marie le classique (Vapeur = Feu+Eau) et le techno (Corrosion, Infestation…).
- Un **module de soin** doit être accessible dès le premier biome.
- **Affinités/faiblesses** par ennemi, cycle simple à mémoriser + exceptions cyber (virus > machines, acide > blindés…).
- **Amendement D3 (R10) — courbe ennemie continue** : PV et dégâts des monstres **monotones (croissants) sur les 4 biomes**, boss = pics nets. **Invariant testé sur toute la table : aucun trash du biome N+1 n'a plus de PV que le boss du biome N** (`tests/r10-04-courbe-ennemie.test.ts`). Le kit de départ encaisse plusieurs coups au biome 1.
- **Supports/vecteurs (post-V1)** : idée notée — les armes ont un **type conducteur** (métal, virus, signal…) qui porte et modifie les modules canalisés ; couche de profondeur trop riche pour la V1.
- **Terminologie** : on dit **modules** (évolutions technologiques), pas sorts.

**Table V1 — 18 recettes (proposition validée en revue n°3, à affiner en dev) :**

| Orbes | Module | Effet |
|---|---|---|
| Feu | Trait incandescent | Dégâts simples, enflamme |
| Eau | Jet sous pression | Dégâts + mouille (sensible à l'électrique en V2) |
| Terre | Écran de gravats | Défense / bouclier |
| Air | Souffle | Repousse / pousse |
| Feu+Feu | Combustion | Burst de dégâts (gros) |
| Eau+Eau | Condensation | Soins légers, purifie la brûlure |
| Terre+Terre | Plaque blindée | Bouclier lourd d'équipe |
| Air+Air | Cyclone | Repousse tous les ennemis |
| Feu+Eau | Vapeur | Zone brûlante qui mouille |
| Feu+Terre | Magma | DoT au sol persistant |
| Feu+Air | Souffle thermique | AoE, étend le feu |
| Eau+Terre | Boue | Ralentit / immobilise |
| Eau+Air | Cryo-brume | Gèle / ralentit fortement |
| Terre+Air | Poussière | Aveugle, baisse la précision ennemie |
| Eau+Terre+Eau | Sève synthétique | **Le module de soin du premier biome** |
| Vapeur+Terre | Brume corrosive | DoT + baisse la défense ennemie |
| Magma+Eau | Obsidienne | Éclats perforants, ignore l'armure |
| Combustion+Terre | Déflagration | Burst de zone |

- Opposition de base : **Feu ↔ Eau** (extinction). En V2 : Acide ↔ Base, Virus ↔ Nanite.
- Paliers : tier 1 = orbes primordiales seules ; tier 2 = avec composites (Vapeur, Magma, Combustion…) ; le codex affiche le palier de chaque recette.

### 5.4 Capture

- Affaiblir un monstre puis **Capturer** (probabilité selon PV restants + affinité). Capturé = compagnon potentiel, worker à la Forge, ou **matière** (fusion de monstres, voir §7.3).
- Système éprouvé sur le prototype mini-roguelike.

---

## 6. La Forge (la ville)

### 6.1 Croissance

- Trois paliers visuels : **Campement → Avant-poste → Quartier**.
- Vue 2D par couches (sol → bâtiments → workers animés), illustrations pré-rendues par couche.

### 6.2 PNJ permanents

- **Le Marchand** : achète/vent, vend des compagnons génériques, propose des **contrats** (« tuez le boss des Datacathédrales sans compagnon → prime rare »).
- **Le Constructeur** : bâtit et améliore ; certains bâtiments **bonusent leurs voisins** (four à côté de la mine).
- **La Liaiseuse** : gère les quêtes et paliers de lien, conseille les évolutions.

### 6.3 Économie des ressources

- **Ressources communes à tous les biomes** (récoltables partout, comme les cristaux du Miroir de Hades) :
  - **Crédits** (or) · **Essence** (mana) · **Minerai brut** (matière de base).
- **1 ressource spécifique par biome** (spores, données, mercurium, optifibre) ; 2ᵉ ressource par biome en V2.
- **Ressources rares** : butin des défis à tours limités et des Modificateurs.
- **Amendement D4 (R10) — économie ralentie** : production ralentie (cadences ×2-3), caps de stockage plus stricts, coûts des bâtiments et équipements multipliés (×3), butin de combat réduit (montants en data). **Le haut de gamme exige des quantités de mercurium/optifibre inaccessibles sans avoir atteint les biomes 3-4** (invariant testé par simulation : 20 morts au biome 1 = haut de gamme inaccessible). Cible : équipement complet ≈ 15-20 runs. Le tier 1 reste accessible aux seuls communs (§SPEC-6.3).
- **Forge Arcane et Labo de canalisation existent dès le début** — ils ne sont pas au bout de la chaîne :
  - Tier 1 : leurs recettes ne demandent que du commun (essence + minerai brut). *« Tant que vous n'avez que du minerai, la forge se contente du minerai. »*
  - Tiers supérieurs : ils exigent des lingots, puis des composants, puis les ressources de biomes profonds.
  - La **chaîne matière** (Extracteur → Purificateur → Nanolathe) sert à *améliorer les intrants* disponibles pour la Forge et le Labo.

### 6.4 Bâtiments (V1 : ~10)

- **Chaîne matière** : Extracteur → Purificateur → Nanolathe.
- **Forge Arcane** (équipement) et **Labo de canalisation** (recettes, slots, fusions moins chères) — dès le départ, besoin d'essence + matière + rares.
- **Support** : Écurie (workers), Entrepôts (caps), Sanctuaire (bonus de départ), Atelier des androïdes (modules), **Maison du héros** (rangements d'équipement, repos, affichage des trophées).
- **Production en temps réel borné pendant la run** ; entretien léger en crédits.

### 6.5 Les décisions qui font réfléchir

| Levier | Référence | Dans Riftforge |
|---|---|---|
| Allocation de ressources rares | Miroir de la Nuit (Hades) | Le mercurium va à la Forge OU au Labo — jamais aux deux |
| **Équipement = style de run** | Keepsakes (Hades), Manoir (Rogue Legacy) | Ce sont **les équipements craftés** (et les éléments choisis en run) qui définissent le style — pas les bâtiments eux-mêmes |
| Contrats à conditions | Against the Storm, Darkest Dungeon | Le Marchand récompense les exploits sous contrainte |
| Placement et voisinage | Loop Hero | Bonus de voisinage entre bâtiments |
| **Choix non linéaires en run** | Boons (Hades) | La non-linéarité vit dans les runs (orbes, jalons compagnons), pas dans un arbre de tech géant — à la Forge, on peut tout débloquer à terme |

---

## 7. Compagnons & système de lien

> **Amendement D5 (R10) — compagnon = bug, pas redesign** : le système prévu était bon ; la cassure venait du flux UI/état (R10-01 : parcours complet capture → écurie → équipe → combat → compétence prouvé en unitaire, e2e local 390 px et captures d'écran commitées). Aucune reconception.

> L'évolution ne repose **pas sur les niveaux de run** (qui reset), mais sur le **lien** — méta, persistant, nourri dans les runs ET à la Forge.

### 7.1 Roster

- Types : **monstres/bêtes**, **robots/androïdes**, **humains/humanoïdes**, **êtres féeriques/élémentaires**.
- Deux populations :
  - **Génériques** (capturés, achetés) : assez nombreux, **nommables**, remplaçables — ce sont les workers et les combattants de seconde ligne.
  - **Personnages à histoire** : **aucun en V1** (l'écriture est le poste le plus lourd) ; en V2, on en introduit **un par type**, puis on fait grandir.
- Acquisition : capture, achat, récompense de contrat.

### 7.2 En combat — arbre de compétences et jalons à 3 choix

- **Amendement E2 (R11) — tous les monstres capturables sont jouables** : chaque monstre des 4 familles a une définition de compagnon (support, arbre de 5 compétences, textes FR) — design autoritatif dans `docs/COMPANIONS-R11.md`. **Une compétence par palier de lien** : la compétence N se débloque au palier de lien N (1→5), le palier 5 = capacité signature ⬔ ; `unlockTier` remplace l'ancien prérequis en chaîne `requires`. Les jalons (1 par biome) continuent de donner de l'XP de lien mais ne débloquent plus directement de compétences. Les orbes renforcent ensuite les compétences débloquées (coûts existants 3/5/10). Nouveaux kinds de compétences : `stun`, `drain`, `debuff-atk`, `buff-energy`, `capture-bonus` (+ `purify`). Élites : mêmes arbres, valeurs ×2. **Plus jamais de null silencieux** : un compagnon d'équipe sans def = refus explicite (message FR) au départ en run et marqueur visible à l'écurie.
- 0-2 compagnons accompagnent le joueur (slots d'équipe).
- **Chaque compagnon a un Support** — sa spécialité : **soins**, **dégâts de zone**, **affaiblissements**, **capture**… — et un **arbre de compétences propre** (**5 compétences en V1**, ~7-8 à terme). **Ils ne fusionnent pas d'orbes.**
- **Pas de mana** (cohérent avec le joueur) : leurs compétences actives sont gratuites une fois débloquées.
- **Déroulé d'une run :**
  - Au départ : **1 compétence initiale débloquée aléatoirement**.
  - **1 jalon par biome** (vers le milieu, après le 2ᵉ-3ᵉ niveau) : écran à la Hades — **3 choix** : débloquer une nouvelle compétence OU faire évoluer une compétence existante. Plus on avance, plus les choix proposés sont profonds (les options de niveau 2 n'apparaissent qu'après le niveau 1).
  - Exemple (soigneur) : soin de zone / soin individuel / buff de bouclier → puis buff de bouclier niv.2 / antidote / soin individuel niv.2 → …
- **Les orbes montent les niveaux** : les compétences débloquées se renforcent (niv. 1→5) en dépensant **les orbes du joueur** (coûts croissants, ~3 puis 5 puis 10). **Tension centrale** : les orbes servent à créer VOS modules ET à monter EUX — et une compétence niv. 1 pèse peu face aux boss des biomes 3-4.
- Sur 4 biomes, on débloque ~4-5 compétences sur les 5-8 existantes : jamais tout, toujours des arbitrages.

### 7.3 Paliers de lien (thème forge)

| Palier | Nom | Effet |
|---|---|---|
| 1 | **Étincelle** | Recruté ; jouable, dialogues de base |
| 2 | **Flamme** | +stats, ligne de dialogue, 1ᵉʳ bonus passif d'équipe |
| 3 | **Brasier** | Nouvelle branche de support, quête de lien |
| 4 | **Fournaise** | **Évolution**, bonus passif majeur, cadeaux ×2 |
| 5 | **Fusion** | Capacité signature, symbiose/romance (post-V1 pour les humanoïdes) |

- **Chaque palier a un marqueur visuel sur le sprite** (V1 : petit changement — teinte, insigne, aura ; V2 : vraies variantes graphiques par palier). L'évolution au palier 4 change l'apparence nettement.
- Le lien se nourrit : combats partagés, cadeaux (préférences par personnage), quêtes, moments à la Forge.
- Les bonus s'appliquent en run quand le compagnon est de l'équipe, certains à la Forge (remise du Marchand lié, production bonus).

### 7.4 Évolution par le lien (remplace l'évolution par niveau)

Au palier 4, selon des **conditions propres au type** :

- **Monstres** : vaincre X monstres de la même race · offrir un équipement précis · accomplir une tâche · **fusionner avec un autre monstre** (façon DQ Monsters) · accouplement dirigé (post-V1).
- **Robots/androïdes** : installer un module rare · réparation spéciale · récupérer des données en Faille · Atelier de niveau suffisant. Thème : *gagner en humanité*.
- **Humains/humanoïdes** : quête personnelle · dialogues récurrents · cadeaux préférés · romance (post-V1).
- **Fées/élémentaires** : rituel de fusion d'essences · lieu spécial en Faille.

### 7.5 Mort des compagnons (recommandation à valider en playtest)

- **Reco V1 : pas de mort permanente.** K.O. en combat → le compagnon est **hors combat jusqu'au retour à la Forge** (réveil automatique, soins éventuels). Le système de lien est le cœur du jeu : le punir d'une mort priverait de sa raison d'être.
- Les workers **génériques** restent remplaçables (et nommables).
- **Mort permanente = Modificateur de Faille post-V1** (« Faille Mortelle ») pour les joueurs qui veulent l'enjeu.

---

## 8. Architecture technique (Next.js + TypeScript)

```
riftforge/
├── src/
│   ├── core/          # logique de jeu PURE — zéro import React
│   │   ├── run/       # génération de niveaux, déplacement, orbes au sol
│   │   ├── combat/    # tours, orbes, fusions, recettes, affinités, capture
│   │   ├── forge/     # production, chaînes, voisinage, économie
│   │   ├── bond/      # compagnons, liens, évolutions, conditions, supports
│   │   ├── save/      # sérialisation, migrations, export/import JSON
│   │   └── rng.ts     # RNG seedé (runs reproductibles, tests)
│   ├── data/          # CONTENU en tables TS typées (aucune logique)
│   │   ├── elements.ts / recipes.ts / affinities.ts / codex.ts
│   │   ├── monsters.ts / companions.ts / supports.ts / bondQuests.ts
│   │   ├── buildings.ts / biomes.ts / contracts.ts / items.ts
│   ├── ui/
│   │   ├── scenes/    # canvas **Phaser 4** : carte de run + combat
│   │   └── screens/   # écrans React DOM : Forge, marchand, codex, dialogues
│   └── app/           # App Router (routes)
└── tests/             # Vitest — le core est testable à 100 %
```

- **Jeu 100 % client** (`"use client"`), aucun backend en V1.
- **Core headless** : `(state, action) => state` en fonctions pures — équilibrage rejoué en tests (capture, fusions, économie, « première run gagnable »).
- **Scènes Phaser 4** embarquées dans un composant React ; écrans de gestion en React DOM.
- **Scaling multi-écrans (exigence forte)** : jouable **sur téléphone ET sur écran Quad HD**. Résolution logique fixe + mise à l'échelle nette (Phaser `resolution`/`autoDensity`, assets haute résolution, UI responsive, tailles de hit-zones tactiles).
- **Sauvegarde** : localStorage + export/import JSON versionnée (partage de saves).
- **Assets** : étude dédiée des packs existants (Kenney, itch.io, CraftPix, OpenGameArt) pour monstres/portraits/décor ; génération IA (Mistral, Stable Diffusion) en complément ; illustrations pré-rendues par couche plutôt que pixel art strict.

---

## 9. Périmètre V1 vs suite

**V1 — le premier jouable complet (volontairement petit)**
- **1 biome** (3-4 niveaux + boss), 3-4 monstres
- **Feu, Eau, Terre, Air + les 18 recettes** de la table §5.3
- Capture, **1-2 compagnons** avec support et jalons à 3 choix
- Chaîne simplifiée (Extracteur → Forge), Labo minimal, marchand, équipement craftable
- Sauvegarde, responsive desktop/mobile

**V1.x — itérations qui complètent le jeu**
- Biomes 2-4 + bosses + ressources spécifiques + tiers de Forge
- ~10 bâtiments, chaîne matière complète, voisinage, contrats, Maison
- 6-8 compagnons génériques nommables, paliers de lien 1-5, évolutions par condition, marqueurs visuels par palier
- Modificateurs de Faille (instabilité, élites, tours limités)
- Défis à tours limités

**Post-V1 (idées validées, planifiées séparément)**
- Personnages à histoire (un par type, puis plus), romances scénarisées, VN complet
- 5ᵉ biome (Le Cœur) + boss final, 2ᵉ parcours NG+, 6-7ᵉ biomes
- Supports/vecteurs d'armes, accouplement dirigé complet, fusions étendues
- Mode **Chronoforge** (le temps = des actions/tours : X actions pour aller au bout, chaque action coûte — pas de temps réel)
- Modificateur « Faille Mortelle » (compagnons perdus définitivement)

---

## 10. Roadmap itérative

> Principe : **le jeu doit être jouable à chaque itération.** On joue, on voit les défauts, on corrige, on ajoute. Chaque étape = un livrable jouable de bout en bout.

| # | Itération | Contenu | Jouable dès |
|---|---|---|---|
| 0 | **Socle** | Repo Next.js+TS, core headless squelette, RNG seedé, save, écran titre, carte navigable vide | Le déplacement sur une carte |
| 1 | **Boucle minimale** | 1 niveau, 3-4 monstres, combat à menus complet (attaque, 4-6 orbes simples, fuite), retour Forge, **marchand qui vend de l'équipement**, re-partir | Run → achat → run |
| 2 | **Forge & production** | Extracteur → Forge, Labo minimal, entrepôt, essence/crédits, **craft** d'équipement | La boucle rogue-like complète |
| 3 | **Captures & 1ᵉʳ compagnon** | Affaiblir + capture, compagnon générique à support (soin), jalons à 3 choix | Équipe en combat |
| 4 | **Fusions & codex** | Fusion d'orbes → modules, codex permanent, ~15-20 recettes, affinités | Le vrai système de combat |
| 5 | **Biome 1 complet** | 3-4 niveaux + boss, contrats du marchand, défis à tours limités | Une vraie run de ~10-15 min |
| 6 | **Biomes 2-4** | Boss, ressources spécifiques, tiers de Forge/Labo, chaîne matière complète, Maison | La run complète ~30 min |
| 7 | **Modificateurs** | Déblocage après complétion, instabilité, élites, +niveaux | Le challenge volontaire |
| 8 | **Lien** | Paliers 1-5, marqueurs visuels, conditions d'évolution, Liaiseuse, compagnons nommables | La méta-progression compagnons |
| 9 | **Polish & équilibrage** | Simulation « première run gagnable » en tests, responsive mobile/QuadHD, audio (jsfxr/freesound), juice, export de save | Le jeu |

---

## 11. Travaux de recherche — état des lieux

- **Systèmes d'éléments (recherche faite, revue n°3)** :
  - **Magicka** : 8 éléments primaires + 3 sous-éléments formés avec l'eau (Vapeur, Glace, Brume), des **paires opposées** qui s'annulent, ~1123 combinaisons — preuve qu'un petit socle engendre une profondeur énorme ([Magickapedia](https://magicka.fandom.com/wiki/Elements), [Combinaisons](https://magicka.fandom.com/wiki/Possible_spell_combinations)).
  - **Little Alchemy 2** : 4 primordiaux (air, terre, feu, eau) → 720 éléments par **paliers de découverte** (tier 1 = uniquement depuis les primordiaux, tier 2 = depuis le tier 1, etc.) — le modèle de cadence à imiter ([Fandom LA](https://little-alchemy.fandom.com/wiki/Elements_(Little_Alchemy_2)), [IGN](https://www.ign.com/wikis/little-alchemy-2/Little_Alchemy_2_Cheats_-_List_of_All_Combinations)).
  - **Chimie comme gamedev** : catégoriser les effets — **corrosifs = dégâts sur la durée**, **explosifs = burst**, **acide/base = opposition** — pour donner un langage cohérent aux modules V2 ([BGDF](https://www.bgdf.com/forum/game-creation/new-game-ideas/educational-chemistry-game), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/AcidAttack)).
  - **Doodle God** : déblocage par « générations » d'éléments — utile pour cadencer les découvertes ([Doodle God Wiki](https://doodlegod.fandom.com/wiki/Doodle_God_(PC))).
- **Packs d'assets** : inventaire de ce qui existe (monstres cyber/fantasy, portraits, tiles) vs ce qu'il faut générer par IA — décider pixel/illustration par catégorie.
- **Équilibrage première-run** : écrire une simulation en tests du core (probabilité de victoire en 1ʳᵉ run < ~1/500, > 0).

## 12. Risques & vigilances

- **Scope creep** : respecter strictement le périmètre « premier jouable », puis V1.x — chaque idée nouvelle va en post-V1.
- **Le volume d'écriture/dialogues** est le poste le plus lourd : V1 sans personnage à histoire, dialogues légers.
- **Scaling mobile → Quad HD** : à concevoir dès l'itération 0 (résolution logique), pas en fin de projet.
- **La fusion en combat peut ralentir le rythme** : l'option grimoire pré-enregistré est la soupape — la mesurer en playtest dès l'itération 4.

## 13. Questions ouvertes restantes

- **Table des recettes** : base validée (§5.3) — à affiner en dev : effets chiffrés, coûts en orbes, résistances ennemies.
- Cohérence visuelle des packs d'assets mixés vs génération IA (après l'étude §11)
- Équilibrage première-run : à calibrer en simulation dès les premières runs jouables

*(Résolus à la revue n°3 : conservation automatique des orbes composites ; 1 jalon compagnon par biome + compétence initiale aléatoire ; 5 compétences par compagnon en V1 ; pas de mort permanente en V1 ; pas de mana — les orbes se consomment à la création des modules.)*