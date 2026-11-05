# Skills importés pour l'agent de code

Compilations de skills agents (format SKILL.md + références), importées pour guider les
sessions autonomes de Riftforge. **À consulter selon le ticket en cours** (le brief de la
session indique quand chacun est pertinent) ; ils ne remplacent jamais `docs/SPEC.md`,
les briefs ni les règles transverses de `docs/BRIEF.md` §2.

| Skill | Source | Licence | Tickets R11 typiques |
|---|---|---|---|
| `engine-phaser/` | [ehartye/agent-phaser](https://github.com/ehartye/agent-phaser) | MIT | Tout ce qui touche Phaser 4 (le jeu est sur **4.2.1**, la version épinglée du skill) : boot/config, scale responsive 390→2560 px, chargement d'assets, pièges du cycle de vie des scènes (cf. B36) |
| `phaser-verification/` | [ehartye/agent-phaser](https://github.com/ehartye/agent-phaser) | MIT | Preuves e2e : tests déterministes, assertions pixel, **fuites au restart de scène**, Playwright real-GPU et CI |
| `phaser-input/` | [ehartye/agent-phaser](https://github.com/ehartye/agent-phaser) | MIT | Clavier, pavé tactile, hit-zones ≥ 44 px, replay d'entrée en test |
| `phaser-pixel-ui/` | [ehartye/agent-phaser](https://github.com/ehartye/agent-phaser) | MIT | Menus de combat et écrans de la Forge : layout, focus clavier, overlays DOM |
| `game-ui-ux/` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache 2.0 | HUD/menus responsive, pile d'écrans, HUD piloté par événements (écurie, Labo, R12) |
| `save-systems/` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache 2.0 | Versionnage de schéma + migrations de save (R11-05) |
| `roguelike/` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache 2.0 | Économie de run, tables de butin, rareté des orbes (R11-01, R11-06) |
| `rpg/` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache 2.0 | Courbes de niveau, formules de dégâts, progression (R11-03, R11-04) |

Attribution : chaque skill conserve son contenu original (SKILL.md + references/ + scripts/).
Licences MIT (agent-phaser, © 2026 ehartye) et Apache 2.0 (awesome-gamedev-agent-skills).
