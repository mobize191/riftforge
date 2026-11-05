
# RIFTFORGE — Arbres de compétences des compagnons (R11)

> Design autoritaire du ticket R11-02 : les capacités de **chaque monstre capturable** via un arbre de compétences où l'on débloque un nouveau sort à chaque **palier de lien** (1→5). Les valeurs chiffrées sont toutes `TODO-BALANCE` en data ; les noms et effets FR ci-dessous font foi.

## 1. Modèle commun (amende la SPEC §7.2 et la décision E2)

- Chaque monstre capturable des 4 familles a une **définition de compagnon** (support, arbre de 5 compétences, textes FR).
- **Déblocage par palier de lien** : la compétence N de l'arbre se débloque quand le compagnon atteint le **palier de lien N** (1→5). Le palier 5 = **capacité signature**. *(Remplace le déblocage « 1 jalon par biome » : les jalons (1 par biome) continuent de donner de l'XP de lien, mais ne débloquent plus directement de compétences.)*
- **Renfort par orbes** : une compétence débloquée se renforce en dépensant des orbes (niveaux 1→5, coûts croissants existants 3/5/10). La tension centrale est conservée : les orbes servent à créer VOS modules ET à monter EUX.
- Les compétences restent **gratuites** au lancement (pas d'énergie) et se jouent **au tour du compagnon**.
- **Éléments** : chaque compétence offensive porte un élément (feu/eau/terre/air) → les faiblesses/résistances ennemies s'appliquent, comme pour les modules du joueur.
- **Élites** : mêmes arbres, valeurs ×2 (règle R7-04 conservée).
- **Nouveaux kinds de compétences** (support core minimal à implémenter en R11-02) : `stun` (l'ennemi perd son tour), `drain` (vole des PV au profit du héros), `debuff-atk` (réduit l'ATQ ennemie), `buff-energy` (donne de l'énergie au héros), `capture-bonus` (augmente la chance de capture). Les kinds existants (heal, shield, damage, aoe, dot) sont réutilisés tels quels.
- **UI** : l'écurie affiche l'arbre par compagnon (compétences débloquées/verrouillées avec le palier requis, coûts d'orbes pour monter) ; le menu Compagnons en combat ne liste que les compétences débloquées, avec l'effet et l'élément.

## 2. Familles et supports

| Famille | Biome | Support dominant | Identité de jeu |
|---|---|---|---|
| Spore | 1 — Failles Vertes | **Soin / soutien** | Garder le héros debout |
| Gremlin | 2 — Datacathédrales | **Affaiblissement** | Pourrir la vie des ennemis |
| Élémentaire | 3 — Hauts-Fourneaux | **Dégâts de zone** | Artillerie élémentaire |
| Vermine | 4 — Fibration | **Capture / utilitaire** | Opportunisme et contrôle |

## 3. Les 16 arbres

### Famille spore

**Mousse sporulée** — *soigneur pur* (l'actuelle « Mousse recrue », arbre conservé et remis dans ce cadre)
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Soin simple | Soigne le héros (heal) |
| 2 | Antidote | Purifie poison/brûlure du héros |
| 3 | Barrière | Bouclier au héros |
| 4 | Soin rapide | Soin + régén légère sur 3 tours |
| 5 | **Soin majeur** ⭐ | Gros soin + régén ; soigne aussi le compagnon |

**Sporeling** — *régénération*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Étreinte de spores | Régén PV/tour au héros (3 tours) |
| 2 | Baume végétal | Soin + bouclier léger |
| 3 | Nuage apaisant | Efface les malus du héros |
| 4 | Pousse vitale | Soin à chaque tour du compagnon pendant 3 tours |
| 5 | **Jardin reconstitué** ⭐ | Soin et bouclier au héros ET au compagnon |

**Champignon cuirassé** — *gardien*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Carapace | Bouclier au héros |
| 2 | Provocation | La cible attaque le compagnon au tour suivant |
| 3 | Épine défensive | Riposte quand le compagnon est frappé (terre) |
| 4 | Mur sporifère | Réduit les dégâts subis par le héros ce tour |
| 5 | **Bastion** ⭐ | Gros bouclier aux deux + Provocation générale |

**Amas de spores** — *poison*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Sporulation | Poison léger sur la cible (dot) |
| 2 | Trait de spores | Dégâts terre |
| 3 | Contagion | Propage le poison aux ennemis adjacents |
| 4 | Souche robuste | Le compagnon gagne des PV max |
| 5 | **Éclosion** ⭐ | Burst de dégâts poison sur tous les ennemis empoisonnés |

### Famille gremlin

**Fouineur de données** — *voleur de stats*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Sondage | Dégâts air + révèle les faiblesses de la cible |
| 2 | Extraction | Vole de l'ATQ à la cible au profit du héros |
| 3 | Corruption légère | Réduit la défense de la cible (air) |
| 4 | Vidage mémoire | Annule le bonus ATQ de la cible + dégâts |
| 5 | **Root kit** ⭐ | Vole ATQ et PV à tous les ennemis |

**Sapeur de circuits** — *saboteur*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Câble coupé | Dégâts air + étourdit la cible (stun, 1 tour) |
| 2 | Court-circuit | Dégâts air + réduit l'ATQ de la cible |
| 3 | Mine de sapeur | Dégâts terre à l'ennemi qui attaque le héros au tour suivant |
| 4 | Sabotage lourd | Réduit l'ATQ de tous les ennemis |
| 5 | **Panne générale** ⭐ | Tous les ennemis perdent leur tour suivant (stun général) |

**Arroseur de bugs** — *contrôle liquide*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Jet d'eau | Dégâts eau |
| 2 | Refroidissement | Purge la brûlure du héros + soigne le compagnon |
| 3 | Bouclier liquide | Bouclier au héros (eau) |
| 4 | Déluge | Dégâts eau de zone |
| 5 | **Crue purificatrice** ⭐ | Zone eau + purge les malus du héros et les buffs ennemis |

**Horloge cassée** — *temps et énergie*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Tic | Petit dégât garanti (air) |
| 2 | Sursis | Donne de l'énergie au héros (buff-energy) |
| 3 | Hâte | Le compagnon agit deux fois à son tour suivant |
| 4 | Remontée | +Régén d'énergie du héros pendant 3 tours |
| 5 | **Boucle temporelle** ⭐ | Le héros rejoue immédiatement un tour complet |

### Famille élémentaire

**Brasero vivant** — *feu*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Trait de braise | Dégâts feu |
| 2 | Enflammer | Brûlure sur la cible (dot feu) |
| 3 | Fournaise | Dégâts feu de zone |
| 4 | Aura ardente | Les attaques du héros enflamment pendant 3 tours |
| 5 | **Surchauffe** ⭐ | Grosse zone feu + brûlure sur tous |

**Geyser** — *eau/air*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Jet sous pression | Dégâts eau |
| 2 | Giclage | Dégâts eau + mouille la cible |
| 3 | Éruption | Zone eau |
| 4 | Brume épaisse | Réduit l'ATQ de tous les ennemis (air) |
| 5 | **Éruption phréatique** ⭐ | Grosse zone eau + repousse (annule la prochaine attaque des cibles touchées) |

**Spectre de cendre** — *affaiblissement de zone*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Voile de cendre | Dégâts terre |
| 2 | Suffocation | DoT air sur la cible |
| 3 | Ensevelissement | Stun la cible (1 tour) |
| 4 | Nuée de cendres | Zone DoT air |
| 5 | **Tombe ardente** ⭐ | Dégâts massifs sur la cible si elle est sous 30 % PV (exécution) |

**Magmaton** — *artillerie lourde*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Poing de magma | Gros dégâts feu |
| 2 | Carapace de lave | Bouclier au compagnon + brûle qui le frappe |
| 3 | Éruption localisée | Dégâts feu + dégâts différés au tour suivant |
| 4 | Fissure | Invoque les résistances de la cible (les ignore) |
| 5 | **Colère du noyau** ⭐ | Énorme burst feu + éclats de zone |

### Famille vermine

**Wyrm de fibre** — *harceleur*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Morsure fibreuse | Dégâts terre |
| 2 | Enchevêtrement | La cible ne peut plus cibler le héros ce tour |
| 3 | Broiement | Dégâts terre + détruit le bouclier de la cible |
| 4 | Tunnels | Le compagnon esquive le prochain coup |
| 5 | **Dévoration** ⭐ | Gros dégâts terre + vole des PV pour le héros (drain) |

**Vampire du réseau** — *vol de vie*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Gorgée | Dégâts air + vole des PV pour le compagnon |
| 2 | Sang sucré | Soigne le héros du montant volé au dernier tour |
| 3 | Drain massif | Gros drain (air) vers le héros |
| 4 | Transfusion | Le compagnon donne ses PV au héros |
| 5 | **Consommation totale** ⭐ | Drain massif sur la cible + soin complet du duo |

**Drone corrompu** — *support technique*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Laser parasite | Dégâts air |
| 2 | Scan de faille | Augmente la chance de capture ce combat (capture-bonus) |
| 3 | Drone réparateur | Restaure le bouclier du héros |
| 4 | Reprogrammation | L'ennemi le plus faible attaque un autre ennemi (1 tour) |
| 5 | **Prise de contrôle** ⭐ | Capture garantie d'une cible sous 20 % PV (1 fois par combat) |

**Tisseuse de fil** — *contrôle du champ*
| Palier | Compétence | Effet |
|---|---|---|
| 1 | Fil coupant | Dégâts air |
| 2 | Toile | Stun la cible (1 tour) |
| 3 | Piège de soie | Contre-attaque automatique quand le héros est touché (3 tours) |
| 4 | Cocon | Gros bouclier au héros |
| 5 | **Métatissure** ⭐ | Toile de zone : tous les ennemis perdent leur tour suivant |

## 4. Invariants pour l'agent (tests obligatoires de R11-02)

1. **Chaque** `monsterId` capturable (16 + élites) a une def dans `COMPANION_BY_MONSTER`.
2. Chaque arbre a **exactement 5 compétences**, une par palier 1→5, palier 5 = signature.
3. Une compétence de palier N est **inutilisable** tant que le palier de lien N n'est pas atteint (test par palier).
4. Le renfort par orbes suit `SKILL_UPGRADE_ORB_COSTS` et `SKILL_MAX_LEVEL` (invariants R3-05).
5. Les kinds nouveaux (`stun`, `drain`, `debuff-atk`, `buff-energy`, `capture-bonus`) sont purs, seedés et testés unitairement.
6. Élites : mêmes arbres, valeurs ×2 (test sur au moins un échantillon par famille).
7. UI : jamais de null silencieux (E2) ; l'écurie affiche l'arbre complet avec verrous par palier.

## 5. Mapping technique (indicatif, data en `src/data/companions.ts`)

- `CompanionSkill` gagne `unlockTier: number` (1-5) ; l'ancien champ `requires` disparaît (remplacé par le palier).
- `SKILL_UPGRADE_ORB_COSTS` inchangé ; déblocage = `bondTierOf(companion) >= skill.unlockTier`.
- Les 16 defs : 4 par famille, supports répartis (§2) ; textes FR exacts de ce document.
