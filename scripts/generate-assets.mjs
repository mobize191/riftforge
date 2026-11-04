// R6-09 — Génération EN CODE des assets (fallback du brief §2 : le téléchargement des
// packs Kenney CC0 est impossible depuis l'environnement de build ; substitution
// documentée dans docs/QUESTIONS.md et public/assets/LICENSE.md, à remplacer par les
// vrais packs Kenney CC0 + licence lors d'une session avec accès réseau).
// Assets SVG commités dans public/assets/ : tuiles par biome, monstres, boss
// (portrait idle + télégraphie), joueur, icônes de la Forge. Aucune source externe.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
mkdirSync(root, { recursive: true });

// Palettes par biome (identité visuelle propre).
export const BIOME_PALETTES = {
  'failles-vertes': { floor: '#1d3320', wall: '#2f5231', accent: '#66ff99', monster: '#4caf50', name: 'Les Failles Vertes' },
  datacathedrales: { floor: '#14243d', wall: '#274a7a', accent: '#66d9ff', monster: '#3399ff', name: 'Les Datacathédrales' },
  'hauts-fourneaux': { floor: '#3d1c10', wall: '#7a3a1e', accent: '#ffb066', monster: '#ff5533', name: 'Les Hauts-Fourneaux' },
  fibration: { floor: '#241238', wall: '#4a2a7a', accent: '#e08cff', monster: '#b44aff', name: 'La Fibration' },
};

const MONSTERS = [
  'mousse', 'sporeling', 'cuirasse', 'amas',
  'fouineur', 'sapeur', 'arroseur', 'horloge-cassee',
  'brasero', 'geyser', 'cendre', 'magmaton',
  'wyrm', 'vampire-reseau', 'drone-corrompu', 'tisseuse',
];
const BOSSES = ['racine-mere', 'grand-index', 'coeur-fournaise', 'noeud-final'];
const FAMILY_OF = {
  mousse: 'failles-vertes', sporeling: 'failles-vertes', cuirasse: 'failles-vertes', amas: 'failles-vertes',
  fouineur: 'datacathedrales', sapeur: 'datacathedrales', arroseur: 'datacathedrales', 'horloge-cassee': 'datacathedrales',
  brasero: 'hauts-fourneaux', geyser: 'hauts-fourneaux', cendre: 'hauts-fourneaux', magmaton: 'hauts-fourneaux',
  wyrm: 'fibration', 'vampire-reseau': 'fibration', 'drone-corrompu': 'fibration', tisseuse: 'fibration',
  'racine-mere': 'failles-vertes', 'grand-index': 'datacathedrales', 'coeur-fournaise': 'hauts-fourneaux', 'noeud-final': 'fibration',
};

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`;
}

function tile(biome, kind) {
  const p = BIOME_PALETTES[biome];
  const c = kind === 'floor' ? p.floor : p.wall;
  const deco =
    kind === 'floor'
      ? `<circle cx="8" cy="8" r="1.5" fill="${p.accent}" opacity="0.25"/><circle cx="24" cy="22" r="1.2" fill="${p.accent}" opacity="0.2"/>`
      : `<rect x="2" y="2" width="28" height="28" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.6"/><rect x="10" y="10" width="12" height="12" fill="${p.accent}" opacity="0.25"/>`;
  return svg(32, 32, `<rect width="32" height="32" fill="${c}"/>${deco}`);
}

function monsterSprite(id, boss = false) {
  const p = BIOME_PALETTES[FAMILY_OF[id]];
  const s = boss ? 64 : 32;
  const r = boss ? 24 : 11;
  const body = `<rect width="${s}" height="${s}" fill="none"/>
    <circle cx="${s / 2}" cy="${s / 2 + 2}" r="${r}" fill="${p.monster}" stroke="${p.accent}" stroke-width="${boss ? 3 : 2}"/>
    <circle cx="${s / 2 - r / 3}" cy="${s / 2}" r="${boss ? 5 : 3}" fill="#fff"/>
    <circle cx="${s / 2 + r / 3}" cy="${s / 2}" r="${boss ? 5 : 3}" fill="#fff"/>
    <circle cx="${s / 2 - r / 3}" cy="${s / 2}" r="${boss ? 2.5 : 1.5}" fill="#111"/>
    <circle cx="${s / 2 + r / 3}" cy="${s / 2}" r="${boss ? 2.5 : 1.5}" fill="#111"/>
    <path d="M ${s / 2 - r / 2} ${s / 2 + r / 2 + 4} Q ${s / 2} ${s / 2 + r / 2 + (boss ? 10 : 7)} ${s / 2 + r / 2} ${s / 2 + r / 2 + 4}" stroke="#111" stroke-width="2" fill="none"/>`;
  return svg(s, s, body);
}

// Portrait télégraphié : même silhouette + halo rouge d'annonce d'attaque (§SPEC-5.1).
function portraitTelegraph(id) {
  const p = BIOME_PALETTES[FAMILY_OF[id]];
  return svg(
    64,
    64,
    `<rect width="64" height="64" rx="8" fill="#2a0a12"/>
     <circle cx="32" cy="34" r="26" fill="none" stroke="#ff2244" stroke-width="4" opacity="0.9"/>
     <circle cx="32" cy="34" r="20" fill="${p.monster}" stroke="#ff2244" stroke-width="2"/>
     <circle cx="25" cy="32" r="4" fill="#fff"/><circle cx="39" cy="32" r="4" fill="#fff"/>
     <circle cx="25" cy="32" r="2" fill="#111"/><circle cx="39" cy="32" r="2" fill="#111"/>
     <path d="M 22 44 Q 32 50 42 44" stroke="#ff2244" stroke-width="2.5" fill="none"/>`,
  );
}

function portraitIdle(id) {
  const p = BIOME_PALETTES[FAMILY_OF[id]];
  return svg(
    64,
    64,
    `<rect width="64" height="64" rx="8" fill="#101828"/>
     <circle cx="32" cy="34" r="20" fill="${p.monster}" stroke="${p.accent}" stroke-width="2.5"/>
     <circle cx="25" cy="32" r="4" fill="#fff"/><circle cx="39" cy="32" r="4" fill="#fff"/>
     <circle cx="25" cy="32" r="2" fill="#111"/><circle cx="39" cy="32" r="2" fill="#111"/>
     <path d="M 24 43 Q 32 47 40 43" stroke="#111" stroke-width="2" fill="none"/>`,
  );
}

for (const [biome] of Object.entries(BIOME_PALETTES)) {
  writeFileSync(join(root, `tile-${biome}-floor.svg`), tile(biome, 'floor'));
  writeFileSync(join(root, `tile-${biome}-wall.svg`), tile(biome, 'wall'));
}
for (const id of MONSTERS) writeFileSync(join(root, `monster-${id}.svg`), monsterSprite(id));
for (const id of BOSSES) {
  writeFileSync(join(root, `monster-${id}.svg`), monsterSprite(id, true));
  writeFileSync(join(root, `portrait-${id}.svg`), portraitIdle(id));
  writeFileSync(join(root, `portrait-${id}-telegraph.svg`), portraitTelegraph(id));
}
for (const id of MONSTERS) {
  writeFileSync(join(root, `portrait-${id}.svg`), portraitIdle(id));
  writeFileSync(join(root, `portrait-${id}-telegraph.svg`), portraitTelegraph(id));
}
// joueur + icône Forge
writeFileSync(
  join(root, 'player.svg'),
  svg(32, 32, `<rect width="32" height="32" fill="none"/><rect x="6" y="10" width="20" height="16" rx="5" fill="#4f7cff"/><rect x="12" y="13" width="8" height="4" fill="#0a0e1a"/><rect x="13" y="14" width="6" height="2" fill="#9fc0ff"/>`),
);
writeFileSync(
  join(root, 'forge.svg'),
  svg(32, 32, `<rect width="32" height="32" fill="none"/><path d="M 8 26 L 16 6 L 24 26 Z" fill="#ff8833"/><rect x="6" y="24" width="20" height="4" fill="#7a3a1e"/>`),
);
writeFileSync(
  join(root, 'LICENSE.md'),
  `# Licences des assets (public/assets/)

## Substitution documentée (R6-09, fallback brief §2)

Les packs **Kenney CC0** prévus par le brief n'ont PAS pu être téléchargés depuis
l'environnement de build (kenney.nl inaccessible) -> **assets générés en code** par
\`scripts/generate-assets.mjs\` (SVG, palettes par biome), AUCUNE source externe,
aucun streaming/CDN au runtime. À remplacer par les vrais packs Kenney CC0
(kenney.nl, licence CC0 jointe) lors d'une session avec accès réseau — voir
docs/QUESTIONS.md (Q6-3).

Les SVG générés sont placés dans le domaine public (CC0) en attendant.
`,
);
console.log('assets générés dans public/assets/');
