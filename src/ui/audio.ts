// R9-02 — Sons générés EN CODE (WebAudio, aucun fichier externe, aucun streaming/CDN).
// Moteur minimal : oscillateurs + bruit, volume discret et coupable (mute persistant).
// Le core n'est pas touché : l'UI déclenche les sons (présence des déclencheurs testée).

export type SoundName =
  | 'ui-click'
  | 'ui-buy'
  | 'step'
  | 'pickup'
  | 'attack'
  | 'hit-feu'
  | 'hit-eau'
  | 'hit-terre'
  | 'hit-air'
  | 'heal'
  | 'shield'
  | 'victory'
  | 'defeat'
  | 'boss'
  | 'forge';

const STORAGE_KEY = 'riftforge-muted';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = window.localStorage.getItem(STORAGE_KEY) === '1';
      } catch {
        this.muted = false;
      }
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25; // volume discret
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
    } catch {
      /* stockage indisponible : mute en mémoire uniquement */
    }
    return this.muted;
  }

  // Bip simple (fréquence, durée, type d'onde, glissando éventuel).
  private blip(freq: number, dur: number, type: OscillatorType = 'square', slideTo?: number, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Burst de bruit (percussions).
  private noise(dur: number, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  play(name: SoundName): void {
    if (this.muted) return;
    switch (name) {
      case 'ui-click':
        this.blip(660, 0.06, 'square', 440);
        break;
      case 'ui-buy':
        this.blip(520, 0.08, 'triangle', 780);
        this.blip(780, 0.1, 'triangle', undefined, 0.07);
        break;
      case 'step':
        this.noise(0.05);
        break;
      case 'pickup':
        this.blip(880, 0.09, 'sine', 1320);
        break;
      case 'attack':
        this.noise(0.08);
        this.blip(220, 0.08, 'sawtooth', 110);
        break;
      case 'hit-feu':
        this.noise(0.12);
        this.blip(180, 0.12, 'sawtooth', 90);
        break;
      case 'hit-eau':
        this.blip(500, 0.1, 'sine', 300);
        break;
      case 'hit-terre':
        this.noise(0.1);
        this.blip(140, 0.12, 'square', 70);
        break;
      case 'hit-air':
        this.blip(900, 0.08, 'triangle', 1400);
        break;
      case 'heal':
        this.blip(660, 0.1, 'sine', 990);
        this.blip(990, 0.12, 'sine', undefined, 0.08);
        break;
      case 'shield':
        this.blip(330, 0.12, 'triangle', 220);
        break;
      case 'victory':
        this.blip(523, 0.1, 'triangle');
        this.blip(659, 0.1, 'triangle', undefined, 0.1);
        this.blip(784, 0.18, 'triangle', undefined, 0.2);
        break;
      case 'defeat':
        this.blip(330, 0.15, 'sawtooth', 220);
        this.blip(220, 0.25, 'sawtooth', 110, 0.12);
        break;
      case 'boss':
        this.blip(110, 0.3, 'sawtooth', 55);
        this.noise(0.2, 0.05);
        break;
      case 'forge':
        this.noise(0.06);
        this.blip(392, 0.1, 'square', 523, 0.06);
        break;
    }
  }
}

export const soundEngine = new SoundEngine();
export function playSound(name: SoundName): void {
  soundEngine.play(name);
}
