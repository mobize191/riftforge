'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import type { Position } from '../core/types';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './scenes/mapConfig';

export default function GameCanvas({
  initialPos,
  onMove,
}: {
  initialPos: Position;
  onMove: (pos: Position) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

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
          scene: [new MapScene(initialPos, (p) => onMoveRef.current(p))],
        });
        gameRef.current = game;
      });
    });
    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [initialPos]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    />
  );
}
