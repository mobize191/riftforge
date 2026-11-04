import type { ElementId, Orb } from '../types';

export type FuseResult =
  | { ok: true; orb: Orb }
  | { ok: false; reason: 'opposition' | 'invalid' };

// Opposition de base (§SPEC-5.3) : Feu <-> Eau s'annulent -> fusion refusée.
const OPPOSITIONS: [ElementId, ElementId][] = [['feu', 'eau']];

export function isOpposition(a: ElementId, b: ElementId): boolean {
  return OPPOSITIONS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function compositeId(elements: ElementId[]): string {
  return 'composite-' + [...elements].sort().join('-');
}

// Fusionne les orbes sélectionnées en UNE orbe composite. Règles (§SPEC-5.3) :
// - opposition Feu/Eau -> refusée proprement
// - doubler une orbe (même élément x2) -> orbe amplifiée (tier + 1)
// - sinon -> orbe composite de palier 2
// La fusion consomme ses orbes.
export function fuseOrbs(orbs: Orb[], indices: number[]): FuseResult {
  if (indices.length < 2) return { ok: false, reason: 'invalid' };
  const picked = indices.map((i) => orbs[i]);
  if (picked.some((o) => o === undefined)) return { ok: false, reason: 'invalid' };
  const elements = picked.map((o) => o.element).filter((e): e is ElementId => e !== null);
  if (elements.length !== picked.length) return { ok: false, reason: 'invalid' }; // composites non re-fusionnables ici
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      if (isOpposition(elements[i], elements[j])) return { ok: false, reason: 'opposition' };
    }
  }
  const allSame = elements.every((e) => e === elements[0]);
  const baseTier = Math.max(...picked.map((o) => o.tier));
  const tier = allSame ? baseTier + 1 : 2;
  return {
    ok: true,
    orb: {
      id: compositeId(elements),
      kind: 'composite',
      element: null,
      tier,
    },
  };
}

// Retire les orbes consommées et ajoute le résultat.
export function applyFusion(orbs: Orb[], indices: number[]): { ok: true; orbs: Orb[] } | FuseResult {
  const result = fuseOrbs(orbs, indices);
  if (!result.ok) return result;
  const consumed = new Set(indices);
  return { ok: true, orbs: [...orbs.filter((_, i) => !consumed.has(i)), result.orb] };
}
