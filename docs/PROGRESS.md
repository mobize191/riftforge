# RIFTFORGE — PROGRESS (session de nuit)

Dernier commit publié : à compléter à chaque ticket.

| Ticket | État | Notes |
|---|---|---|
| R0-01 | done | scaffold Next.js 15 + TS + pnpm + vitest |
| R0-02 | done | types du core |
| R0-03 | done | RNG seedé mulberry32 |
| R0-04 | done | machine à états boucle |
| R0-05 | done | sauvegarde versionnée + StoragePort |
| R0-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : boutons Nouvelle descente / Continuer, lisibilité 390 px / 2560 px |
| R0-07 | EN ATTENTE DE VALIDATION HUMAINE | playtest : déplacement clavier + rendu net 390/2560 px |
| R0-08 | EN ATTENTE DE VALIDATION HUMAINE | playtest : recharger la page -> position restaurée |
| R0-09 | done | workflow Pages, job deploy skipped (repo privé) — workflow vert vérifié sur GitHub |
| R1-01 | done | génération niveau seedée |
| R1-02 | EN ATTENTE DE VALIDATION HUMAINE | playtest : contact -> combat |
| R1-03 | done | combat à menus complet, butin conservé à la mort |
| R1-04 | done | orbes de départ + 4 modules solo gratuits |
| R1-05 | done | récolte, coffres, sortie -> sol suivant, niveaux de run |
| R1-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : boucle run -> achat -> run |
| R1-07 | done | simu 1000 runs : taux victoire sol 3 = 38.6% (possible, pas garanti) |
| R2-01 | done | portefeuille persistant crédits/essence/minerai |
| R2-02 | done | production par ticks purs Extracteur -> Forge Arcane |
| R2-03 | done | caps de stockage + entrepôt améliorable |
| R2-04 | done | labo minimal : recettes tier 1, slots 3+, fusions moins chères |
| R2-05 | done | craft d'équipement à la Forge Arcane |
| R2-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : écran Forge sans friction à 390/2560 px |
| R2-07 | done | production pendant la run, créditée au retour - entretien |
| R2-08 | done | simu 24h : minerai=100/100, essence=0/100, lingots=20/50, crédits=0 — caps tenus |
| R3-01 | done | capture (proba monotone seedée, butin) |
| R3-02 | done | compagnon générique support soin, 5 compétences |
| R3-03 | done | compétence initiale aléatoire + K.O. sans mort permanente |
| R3-04 | done | jalon à 3 choix après le 2e niveau |
| R3-05 | done | montée de niveau des compétences en orbes (3/5/10) |
| R3-06 | EN ATTENTE DE VALIDATION HUMAINE | playtest : capture -> nommage -> équipe compréhensible sans doc |
| R3-07 | done | rejeu complet déterministe depuis un seul seed (capture->...->retour Forge) |
| R4-01..R4-08 | pending | |
| R5-01..R5-07 | pending | |
| P6-A..P6-D | pending | |

## Simulations
- R1-07 : 1000 runs, taux de victoire sol 3 (kit départ) = **38.6%**, sol moyen clearé = 1.23
- R2-08 : 24 h simulées (86400 ticks) -> minerai 100/100 (cap), essence 0/100, lingots 20/50, crédits 0 : aucun enrichissement infini
- R4-08 : —
- R5-07 : —
