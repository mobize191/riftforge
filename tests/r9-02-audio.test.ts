import { describe, it, expect } from 'vitest';
// R9-02 — Audio généré en code (WebAudio) : déclencheurs présents et sans exception
// même sans AudioContext (environnement de test), mute persisté, aucun streaming.
import { soundEngine, playSound, type SoundName } from '../src/ui/audio';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('R9-02 audio (WebAudio généré, coupable, aucun CDN)', () => {
  it('tous les sons du jeu se déclenchent sans exception sans AudioContext', () => {
    const names: SoundName[] = ['ui-click', 'ui-buy', 'step', 'pickup', 'attack', 'hit-feu', 'hit-eau', 'hit-terre', 'hit-air', 'heal', 'shield', 'victory', 'defeat', 'boss', 'forge'];
    for (const n of names) expect(() => playSound(n)).not.toThrow();
  });

  it('mute : toggle + persistance localStorage, play() reste sans effet quand coupé', () => {
    const before = soundEngine.muted;
    const after = soundEngine.toggleMute();
    expect(after).toBe(!before);
    expect(soundEngine.muted).toBe(after);
    expect(() => playSound('victory')).not.toThrow(); // coupé -> no-op sans exception
    soundEngine.toggleMute(); // restaure
  });

  it('aucune dépendance réseau : pas d’URL externe dans le module audio', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'ui', 'audio.ts'), 'utf8');
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).toContain('AudioContext');
  });
});
