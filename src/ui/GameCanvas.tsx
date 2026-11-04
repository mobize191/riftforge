'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type Phaser from 'phaser';
import type { Position } from '../core/types';
import type { LevelMap } from '../core/run/generate';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './scenes/mapConfig';
import type { MapScene } from './scenes/MapScene';

export interface GameCanvasApi {
  move: (dx: number, dy: number) => void;
  interact: () => void;
}

const GameCanvas = forwardRef<
  GameCanvasApi,
  {
    gameKey: string;
    levelRef: React.MutableRefObject<LevelMap>;
    initialPos: Position;
    seed: number;
    floor: number;
    familyIds: string[];
    palette: { floor: string; wall: string; accent: string; monster: string };
    onMove: (pos: Position) => void;
    onEncounter: (enemies: string[]) => void;
    onInteract: () => void;
  }
>(function GameCanvas(
  { gameKey, levelRef, initialPos, seed, floor, familyIds, palette, onMove, onEncounter, onInteract },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MapScene | null>(null);
  const onMoveRef = useRef(onMove);
  const onEncounterRef = useRef(onEncounter);
  const onInteractRef = useRef(onInteract);
  const familyIdsRef = useRef(familyIds);
  onMoveRef.current = onMove;
  onEncounterRef.current = onEncounter;
  onInteractRef.current = onInteract;
  familyIdsRef.current = familyIds;

  // API tactile : on pilote la scène (source de vérité de la position), pas l'état React directement.
  useImperativeHandle(ref, () => ({
    move: (dx, dy) => sceneRef.current?.tryMove(dx, dy),
    interact: () => sceneRef.current?.interact(),
  }));

  // Le jeu Phaser n'est créé/détruit QUE quand on change de sol (gameKey) :
  // jamais à chaque déplacement, sinon flash noir à chaque pas.
  useEffect(() => {
    let disposed = false;
    void import('phaser').then((PhaserNS) => {
      return import('./scenes/MapScene').then(({ MapScene }) => {
        if (disposed || gameRef.current || !containerRef.current) return;
        const scene = new MapScene(
          levelRef,
          initialPos,
          seed,
          floor,
          familyIdsRef.current,
          palette,
          (p) => onMoveRef.current(p),
          (e) => onEncounterRef.current(e),
          () => onInteractRef.current(),
        );
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
          scene: [scene],
        });
        sceneRef.current = scene;
        gameRef.current = game;
      });
    });
    return () => {
      disposed = true;
      sceneRef.current = null;
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
});

export default GameCanvas;
