import type { ElementId } from '../core/types';

export interface ElementDef {
  id: ElementId;
  name: string;
  color: string;
}

export const ELEMENTS: Record<ElementId, ElementDef> = {
  feu: { id: 'feu', name: 'Feu', color: '#ff5533' },
  eau: { id: 'eau', name: 'Eau', color: '#3399ff' },
  terre: { id: 'terre', name: 'Terre', color: '#aa7744' },
  air: { id: 'air', name: 'Air', color: '#dddddd' },
};

export const PRIMORDIAL_ELEMENTS: ElementId[] = ['feu', 'eau', 'terre', 'air'];
