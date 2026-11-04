# RIFTFORGE — Suivi des bugs (remontés en playtest)

Légende : ✅ corrigé (commit) · 🔄 en attente de validation humaine · ❌ ouvert

| ID | Signalé | Bug | Statut | Fix |
|---|---|---|---|---|
| B1 | matin 1 | Pas de contrôles tactiles sur téléphone | ✅ | pavé ▲▼◀▶+E, `8b63179` + `e0641f6` |
| B2 | matin 1 | Flashs noirs à intervalle régulier | ✅ | recréation Phaser à chaque pas -> création unique par sol, `e0641f6` |
| B3 | matin 1 | Boutons tactiles sans effet | ✅ | le pavé pilote la scène Phaser (API impérative), `8b63179` |
| B4 | matin 2 | Monstres ne patrouillent plus après N pas | ✅ | patrouille ping-pong déterministe, `64ef038` |
| B5 | matin 2 | Ramassage sans message / objet reste affiché | ✅ | syncSprites + lastEvent HUD, `64ef038` |
| B6 | matin 2 | Orbes possédées invisibles | ✅ | pastilles d'inventaire, `64ef038` |
| B7 | matin 2 | Monstre re-affrontable à l'infini | ✅ | retiré à ENTER_COMBAT (même adjacent), `b6b6b24` + `e367df7` |
| B8 | matin 2 | Pas de sprites | ✅ | textures générées en code (formes détaillées), `64ef038` |
| B9 | matin 2 | Capturés invisibles pendant la run | ✅ | HUD « Capturés : … », `64ef038` |
| B10 | matin 2 | Ciblage manuel, attaque dans le vide | ✅ | auto-retarget 1re cible vivante (attaque + sorts), `0a62681` |
| B11 | matin 2 | Peu de choix de sorts en combat | ✅ | menu Modules complet + panneau création hors combat, `27a8428` |
| B12 | matin 3 | PV remis à fond à chaque combat | ✅ | PV persistants (soin seulement au level-up), `0a62681` |
| B13 | matin 3 | « Cibler » attaquait directement | ✅ | clic = « Sélectionner » (highlight) puis attaquer, `0a62681` |
| B14 | matin 3 | Équipement en double | ✅ | refus d'achat/craft si déjà possédé, `0a62681` |
| B15 | matin 3 | E sur autel/sortie -> retour accueil, partie bloquée | ✅ | filet de sécurité : tout ENTER_COMBAT crée l'état combat UI, `0a62681` |
| B16 | matin 3 | Combat pas auto au contact | ✅ | déclenchement case adjacente (4 dir), `0a62681` |
| B17 | matin 3 | Compagnon inactif en combat | ✅ | menu Compagnons, compétences déclenchables, `0a62681` |
| B18 | matin 3 | Essence toujours à 0 | ✅ | coffres donnent 1-3 essence + HUD butin, `0a62681` |
| B19 | matin 3 | Boutons Modules invisibles en combat | ✅ | boutons « Attaquer » et « Modules (N) » séparés, `27a8428` |
| B20 | matin 4 | Combat bloqué avec sorts combinés | ✅ | garde anti-blocage (victoire si plus d'ennemis vivants) + bot couvre tous les types de sorts, `e367df7` + ce commit |
| B21 | matin 4 | Compagnon à la fois équipe et worker | ✅ | exclusivité à double sens (échange auto), ce commit |
| B22 | matin 4 | Défis infinis | ✅ | `challengeId` persistait après le combat -> tous les combats suivants chronométrés ; remis à null à EXIT_COMBAT + autel à usage unique (sprite sync), ce commit |
| B23 | matin 4 | Quitter la Faille en pleine run = clic mort | ✅ | abandon propre (DIE -> RETURN_FORGE), `b6b6b24` |

| B24 | fuzz bot | `EXEC_GRIMOIRE` pouvait recréer un module déjà possédé (doublon + orbes perdues) | ✅ | dedupe dans EXEC_GRIMOIRE, trouvé par `tests/fuzz-bot.test.ts` |

- `e2e/smoke.spec.ts` (Playwright, IHM réelle, à lancer en local — voir PROGRESS.md).

## Bots de test (vérification automatique de chaque cas)
- `tests/fuzz-bot.test.ts` (NOUVEAU) : **bot aléatoire seedé** — 200 sessions d'actions aléatoires
  sur tout le jeu (Forge/run/combat), invariants à chaque pas : aucun crash, save round-trip OK,
  soldes jamais négatifs, pas de module en double, combat jamais bloqué en phase 'player' sans
  ennemi vivant. Résultat : 356 combats, 299 terminés (les autres = session finie en plein combat).
- `tests/ui-bot.test.ts` : rejoue les flux exacts de l'UI (BFS, contact adjacent, tous les types de
  sorts, autel, compagnon, doublons, blocage combat) — invariants à chaque étape.
- `tests/playtest-fixes*.test.ts` : régressions ciblées par bug.
- Simulations d'équilibrage : R1-07, R2-08, R4-08, R5-07 (voir PROGRESS.md).
