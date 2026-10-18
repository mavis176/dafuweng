// Web Audio API Sound and Music Engine for Family Monopoly
// Completely self-contained, zero-network latency, works seamlessly on mobile and desktop browsers.

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private currentStep: number = 0;
  private isMuted: boolean = true; // Default muted as requested

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.28; // Pleasant background volume
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6; // Clear SFX volume
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- Background Music (Gentle, relaxing, acoustic lo-fi piano / kalimba loop) ---
  // A heartwarming 8-bar chord progression in C Major:
  // Cmaj7 -> G/B -> Am7 -> Em/G -> Fmaj7 -> C/E -> Dm7 -> G7sus4 -> G7
  private chordProgression = [
    { root: 261.63, chord: [261.63, 329.63, 392.0, 493.88], bass: 130.81 }, // Cmaj7
    { root: 246.94, chord: [246.94, 293.66, 392.0, 493.88], bass: 123.47 }, // G/B
    { root: 220.0, chord: [220.0, 261.63, 329.63, 392.0], bass: 110.0 },     // Am7
    { root: 196.0, chord: [196.0, 246.94, 329.63, 392.0], bass: 98.0 },      // Em/G
    { root: 174.61, chord: [174.61, 220.0, 261.63, 329.63], bass: 87.31 },   // Fmaj7
    { root: 164.81, chord: [164.81, 196.0, 261.63, 329.63], bass: 82.41 },   // C/E
    { root: 146.83, chord: [146.83, 174.61, 220.0, 261.63], bass: 73.42 },   // Dm7
    { root: 196.0, chord: [196.0, 261.63, 293.66, 392.0], bass: 98.0 },      // G7sus
  ];

  private melodyNotes = [
    523.25, 659.25, 783.99, 987.77, 783.99, 659.25,
    587.33, 493.88, 392.0, 493.88, 587.33, 783.99,
    440.0, 523.25, 659.25, 523.25, 659.25, 880.0,
    392.0, 493.88, 587.33, 659.25, 587.33, 493.88,
    349.23, 440.0, 523.25, 659.25, 523.25, 440.0,
    329.63, 392.0, 523.25, 392.0, 523.25, 659.25,
    293.66, 349.23, 440.0, 523.25, 440.0, 349.23,
    392.0, 493.88, 587.33, 783.99, 659.25, 587.33,
  ];

  public isBgmActive(): boolean {
    return this.bgmPlaying;
  }

  public toggleBgm(): boolean {
    if (this.bgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  public startBgm() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (this.bgmPlaying) return;

    this.bgmPlaying = true;
    this.isMuted = false;

    if (this.bgmGain) {
      this.bgmGain.gain.cancelScheduledValues(ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(0, ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.2);
    }

    this.currentStep = 0;
    this.scheduleNextBgmBeat();
  }

  public stopBgm() {
    const ctx = this.getAudioContext();
    if (ctx && this.bgmGain) {
      this.bgmGain.gain.cancelScheduledValues(ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    }
    if (this.bgmTimer) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmPlaying = false;
    this.isMuted = true;
  }

  private scheduleNextBgmBeat() {
    if (!this.bgmPlaying) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const tempoMs = 520; // Relaxing slow groove (~115 BPM half time)
    const barIndex = Math.floor(this.currentStep / 4) % this.chordProgression.length;
    const beatInBar = this.currentStep % 4;

    const chordInfo = this.chordProgression[barIndex];

    // On beat 0: Play warm soft acoustic bass note
    if (beatInBar === 0) {
      this.playWarmBass(chordInfo.bass, 1.8);
    }

    // Play soft arpeggiated piano/marimba chord harmony
    const chordTone = chordInfo.chord[beatInBar % chordInfo.chord.length];
    this.playSoftBell(chordTone, 0.9, 0.12);

    // Occasional gentle top melody note
    if (this.currentStep % 2 === 0) {
      const melodyIndex = (this.currentStep / 2) % this.melodyNotes.length;
      const melodyFreq = this.melodyNotes[melodyIndex];
      this.playSoftBell(melodyFreq, 0.7, 0.14);
    }

    this.currentStep = (this.currentStep + 1) % (this.chordProgression.length * 4);
    this.bgmTimer = window.setTimeout(() => {
      this.scheduleNextBgmBeat();
    }, tempoMs);
  }

  private playWarmBass(freq: number, duration: number) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.bgmGain || !this.bgmPlaying) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playSoftBell(freq: number, duration: number, volume: number = 0.1) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.bgmGain || !this.bgmPlaying) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Warm subtle harmonic
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
  }

  // --- 1. 掷骰子音效 (Realistic dice clatter & wooden rattle) ---
  public playDiceRoll() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const clatterCount = 7;

    for (let i = 0; i < clatterCount; i++) {
      const delay = i * 0.06 + Math.random() * 0.02;
      const hitTime = now + delay;
      const decay = 0.05 + Math.random() * 0.04;

      // Noise click for rattle
      const bufferSize = ctx.sampleRate * decay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.2));
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1200 + Math.random() * 1400, hitTime);
      noiseFilter.Q.setValueAtTime(3.0, hitTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, hitTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, hitTime + decay);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noiseSource.start(hitTime);

      // Resonant wood block body tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + Math.random() * 300, hitTime);
      oscGain.gain.setValueAtTime(0.2, hitTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, hitTime + decay * 0.8);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);

      osc.start(hitTime);
      osc.stop(hitTime + decay);
    }
  }

  // --- 2. 购买地块 / 建造房屋音效 (Cheerful coin chimes + uplifting fanfare) ---
  public playBuyProperty() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Upbeat celebratory cash register chime (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.32, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.45);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      oscHarmonic.start(noteTime);
      osc.stop(noteTime + 0.45);
      oscHarmonic.stop(noteTime + 0.45);
    });

    // Metallic coin shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2093.0, now + 0.28); // C7
    shimmerGain.gain.setValueAtTime(0.2, now + 0.28);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmer.start(now + 0.28);
    shimmer.stop(now + 0.65);
  }

  // --- 3. 交钱 / 扣钱 / 付租金音效 (Metallic coin drop + descending coin thud) ---
  public playPayRent() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Two coin clinks (high pitch to low pitch)
    const clinks = [
      { freq: 1174.66, time: now, duration: 0.18 },       // D6
      { freq: 987.77, time: now + 0.1, duration: 0.25 },  // B5
      { freq: 659.25, time: now + 0.2, duration: 0.35 },  // E5
    ];

    clinks.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time);
      osc.stop(time + duration);
    });

    // Soft coin purse thud
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(220, now + 0.18);
    thud.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    thudGain.gain.setValueAtTime(0.3, now + 0.18);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);

    thud.start(now + 0.18);
    thud.stop(now + 0.45);
  }

  // --- 4. 游戏回合切换提示音 (Clean, crisp friendly turn alert chime) ---
  public playTurnSwitch() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    // Pleasant dual-tone bell (E5 -> B5)
    const notes = [
      { freq: 659.25, time: now, dur: 0.25 },
      { freq: 987.77, time: now + 0.08, dur: 0.4 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.22, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time);
      osc.stop(time + dur);
    });
  }

  // --- 5. 游戏结束结算音效 (Triumphant victory fanfare & celebration chords) ---
  public playGameOver() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Victory arpeggio (C4 - E4 - G4 - C5 - E5 - G5 with sustained final major chord)
    const fanfareNotes = [
      { freq: 261.63, delay: 0.0, dur: 0.2 },
      { freq: 329.63, delay: 0.15, dur: 0.2 },
      { freq: 392.0, delay: 0.3, dur: 0.2 },
      { freq: 523.25, delay: 0.45, dur: 0.3 },
      { freq: 659.25, delay: 0.65, dur: 0.35 },
      { freq: 783.99, delay: 0.85, dur: 0.8 },
      { freq: 1046.5, delay: 1.05, dur: 1.2 },
    ];

    fanfareNotes.forEach(({ freq, delay, dur }) => {
      const noteTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + dur);
    });

    // Final sparkling chord resolution
    const chord = [523.25, 659.25, 783.99, 1046.5];
    const chordTime = now + 1.2;
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.001, chordTime);
      gain.gain.linearRampToValueAtTime(0.18, chordTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 1.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(chordTime);
      osc.stop(chordTime + 1.4);
    });
  }

  // Optional: subtle gentle footstep tap when pawn moves
  public playStep() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Optional: magical chance card chime
  public playChanceCard() {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const notes = [783.99, 987.77, 1174.66, 1567.98]; // G5, B5, D6, G6
    notes.forEach((freq, i) => {
      const t = now + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }
}

export const soundManager = new SoundManager();
