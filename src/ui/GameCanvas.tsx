'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import type { Position } from '../core/types';
import type { LevelMap } from '../core/run/generate';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './scenes/mapConfig';

export default function GameCanvas({
  gameKey,
  levelRef,
  initialPos,
  seed,
  floor,
  familyIds,
  onMove,
  onEncounter,
  onInteract,
}: {
  gameKey: string;
  levelRef: React.MutableRefObject<LevelMap>;
  initialPos: Position;
  seed: number;
  floor: number;
  familyIds: string[];
  onMove: (pos: Position) => void;
  onEncounter: (enemies: string[]) => void;
  onInteract: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onMoveRef = useRef(onMove);
  const onEncounterRef = useRef(onEncounter);
  const onInteractRef = useRef(onInteract);
  const familyIdsRef = useRef(familyIds);
  onMoveRef.current = onMove;
  onEncounterRef.current = onEncounter;
  onInteractRef.current = onInteract;
  familyIdsRef.current = familyIds;

  // Le jeu Phaser n'est créé/détruit QUE quand on change de sol (gameKey) :
  // jamais à chaque déplacement, sinon flash noir à chaque pas.
  useEffect(() => {
    let disposed = false;
    void import('phaser').then((PhaserNS) => {
      return import('./scenes/MapScene').then(({ MapScene }) => {
        if (disposed || gameRef.current || !containerRef.current) return;
        const game = new PhaserNS.Game({
          type: PhaserNS.AUTO,
          parent: containerRef.current,
          backgroundColor: '#0a0e1a',
          scale: {
            mode: PhaserNS.Scale.FIT,
            autoCenter: PhaserNS.Scale.CENTER_BOTH,
            width: LOGICAL_WIDTH,
            height: LOGICAL_HEIGHT,
          },
          render: { pixelArt: true, antialias: false },
          scene: [
            new MapScene(
              levelRef,
              initialPos,
              seed,
              floor,
              familyIdsRef.current,
              (p) => onMoveRef.current(p),
              (e) => onEncounterRef.current(e),
              () => onInteractRef.current(),
            ),
          ],
        });
        gameRef.current = game;
      });
    });
    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    />
  );
}
