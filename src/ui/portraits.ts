// R9-07 — Portraits IA (style anime) selon docs/ASSETS.md.
// Mapping entité (id code) -> fichier attendu dans public/assets/portraits/.
// Les fichiers sont déposés par l'humain ; tant qu'un fichier est absent, le
// fallback code-gen (SVG générés, R6-09) reste la règle — jamais d'écran vide.
// Chemins relatifs, chargement client, aucune dépendance réseau. UI uniquement.

export const PORTRAIT_DIR = 'assets/portraits';

// id code -> nom de fichier (convention docs/ASSETS.md)
export const PORTRAIT_FILE: Record<string, string> = {
  heros: 'heros.png',
  mousse: 'mousse.png',
  sporeling: 'sporeling.png',
  cuirasse: 'champignon-cuirasse.png',
  amas: 'amas-spores.png',
  'racine-mere': 'racine-mere.png',
  fouineur: 'fouineur.png',
  sapeur: 'sapeur.png',
  arroseur: 'arroseur.png',
  'horloge-cassee': 'horloge-cassee.png',
  'grand-index': 'grand-index.png',
  brasero: 'brasero.png',
  geyser: 'geyser.png',
  cendre: 'spectre-cendre.png',
  magmaton: 'magmaton.png',
  'coeur-fournaise': 'coeur-fournaise.png',
  wyrm: 'wyrm.png',
  'vampire-reseau': 'vampire-reseau.png',
  'drone-corrompu': 'drone-corrompu.png',
  tisseuse: 'tisseuse.png',
  'noeud-final': 'noeud-final.png',
  marchand: 'marchand.png',
  constructeur: 'constructeur.png',
  liaiseuse: 'liaiseuse.png', // déposé (R10-08)
};

// id d'ennemi de combat (peut être « boss:x-0 » ou « elite-mousse-0 ») -> id d'entité
export function entityIdOf(combatEnemyId: string): string {
  let id = combatEnemyId.split('-').slice(0, -1).join('-'); // retire l'index numérique
  if (id.startsWith('boss:')) id = id.slice(5);
  if (id.startsWith('elite-')) id = id.slice(6); // élite = teinte sur le portrait de base
  return id;
}

export function isEliteId(combatEnemyId: string): boolean {
  return combatEnemyId.startsWith('elite-');
}

// Chemin relatif du portrait PNG (sans extension vérifiée côté client).
// R10-08 : variante évoluée (`<base>-evo.png`) quand le compagnon est évolué (palier 4).
export function portraitUrl(entityId: string, evolved = false): string {
  const file = PORTRAIT_FILE[entityId];
  if (!file) return '';
  return `${PORTRAIT_DIR}/${evolved ? file.replace(/\.png$/, '-evo.png') : file}`;
}

// Fallback code-gen (R6-09) si le PNG est absent.
export function portraitFallbackUrl(entityId: string, telegraph = false): string {
  return `/assets/portrait-${entityId}${telegraph ? '-telegraph' : ''}.svg`;
}

// Teinte de lien par palier (R8-02) appliquée par-dessus le portrait du compagnon.
export function bondTierTint(tier: number): string {
  switch (tier) {
    case 2:
      return 'sepia(0.4) saturate(1.4) hue-rotate(-15deg)'; // teinte chaude
    case 3:
      return 'saturate(1.3) brightness(1.1) drop-shadow(0 0 4px #ffd700)'; // insigne
    case 4:
      return 'saturate(1.4) drop-shadow(0 0 8px #ff8800)'; // aura
    case 5:
      return 'saturate(1.6) hue-rotate(15deg) drop-shadow(0 0 10px #ff44ff)'; // aura signature
    default:
      return '';
  }
}

// Teinte élite (R7) : surcharge rouge sur le portrait de base.
export const ELITE_TINT = 'saturate(1.8) hue-rotate(-30deg) drop-shadow(0 0 6px #ff2244)';
