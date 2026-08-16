// Naxxivo Interactive Sound Effects Engine
// Powered by SFX Library & Web Audio Synthesis Fallback

export type SfxType = 
  | 'resonantHit' // 01_Resonant_Tonal_Hit.wav (Success, Completion, Level Up)
  | 'chime'       // 02_Metallic_Chime_Sting.wav (Copy prompt, Confirmed, Bookmark)
  | 'glitch'      // 03_Digital_Glitch_Burst.wav (AI Generating, Scanning, Randomize)
  | 'ticks'       // 04_Rapid_Electronic_Ticks.wav (Tabs, Buttons, Click, Subtle UI)
  | 'whoosh'      // 05_Cinematic_Whoosh_Impact.wav (Download, Launch, CTA)
  | 'staticHit'   // 06_Sharp_Static_Hit.wav (Error, Clear, Reset, Delete)
  | 'bassDrop'    // 07_Deep_Bass_Drop.wav (Theme change, Dark mode, Special action)
  | 'wobble';     // 08_Cartoon_Wobble_Bounce.wav (Like, Heart, Fun bounce)

const SOUND_FILES: Record<SfxType, string> = {
  resonantHit: '/sounds/01_Resonant_Tonal_Hit.wav',
  chime: '/sounds/02_Metallic_Chime_Sting.wav',
  glitch: '/sounds/03_Digital_Glitch_Burst.wav',
  ticks: '/sounds/04_Rapid_Electronic_Ticks.wav',
  whoosh: '/sounds/05_Cinematic_Whoosh_Impact.wav',
  staticHit: '/sounds/06_Sharp_Static_Hit.wav',
  bassDrop: '/sounds/07_Deep_Bass_Drop.wav',
  wobble: '/sounds/08_Cartoon_Wobble_Bounce.wav'
};

const SOUND_META: Record<SfxType, { name: string; description: string; tag: string }> = {
  resonantHit: { name: 'Resonant Tonal Hit', description: 'AI generation complete, task success & unlocks', tag: 'Success' },
  chime: { name: 'Metallic Chime Sting', description: 'Copy prompt, clipboard, & bookmark confirmation', tag: 'Action' },
  glitch: { name: 'Digital Glitch Burst', description: 'AI processing start, analyzer scan, & randomize', tag: 'Sci-Fi' },
  ticks: { name: 'Rapid Electronic Ticks', description: 'Interactive button clicks, tabs, & tool selection', tag: 'UI' },
  whoosh: { name: 'Cinematic Whoosh Impact', description: 'Download 4K thumbnail, export files, & hero CTA', tag: 'Impact' },
  staticHit: { name: 'Sharp Static Hit', description: 'Form reset, clear history, delete & validation alerts', tag: 'Alert' },
  bassDrop: { name: 'Deep Bass Drop', description: 'Dark/Light theme toggle & atmospheric highlights', tag: 'Bass' },
  wobble: { name: 'Cartoon Wobble Bounce', description: 'Like prompt, heart reaction & playful micro-actions', tag: 'Fun' }
};

class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.45;
  private audioCache: Map<SfxType, HTMLAudioElement> = new Map();
  private audioCtx: AudioContext | null = null;
  private initialized: boolean = false;
  private listeners: Set<(enabled: boolean, volume: number) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('naxxivo_sfx_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
      const savedVolume = localStorage.getItem('naxxivo_sfx_volume');
      if (savedVolume !== null) {
        const parsed = parseFloat(savedVolume);
        if (!isNaN(parsed)) this.volume = Math.max(0, Math.min(1, parsed));
      }

      // Unlock Web Audio context on first user interaction
      const unlockAudio = () => {
        if (!this.initialized) {
          this.initAudio();
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  private initAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      this.initialized = true;
    } catch {
      // Ignore
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('naxxivo_sfx_enabled', String(enabled));
    }
    this.notifyListeners();
  }

  public toggleSound(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.play('chime');
    }
    return this.enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('naxxivo_sfx_volume', String(this.volume));
    }
    this.notifyListeners();
  }

  public subscribe(listener: (enabled: boolean, volume: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.enabled, this.volume));
  }

  public getMeta(type: SfxType) {
    return SOUND_META[type];
  }

  public getAllSounds(): Array<{ type: SfxType; path: string } & typeof SOUND_META[SfxType]> {
    return (Object.keys(SOUND_FILES) as SfxType[]).map((type) => ({
      type,
      path: SOUND_FILES[type],
      ...SOUND_META[type]
    }));
  }

  /**
   * Play SFX by identifier
   */
  public play(type: SfxType, customVolumeMultiplier = 1) {
    if (!this.enabled || this.volume <= 0) return;

    try {
      const filePath = SOUND_FILES[type];
      let audio = this.audioCache.get(type);

      if (!audio) {
        audio = new Audio(filePath);
        audio.preload = 'auto';
        this.audioCache.set(type, audio);
      }

      // Clone or reset to allow rapid consecutive plays
      const playPromise = audio.currentTime === 0 
        ? audio.play() 
        : (() => {
            const clone = audio.cloneNode() as HTMLAudioElement;
            clone.volume = Math.min(1, this.volume * customVolumeMultiplier);
            return clone.play();
          })();

      audio.volume = Math.min(1, this.volume * customVolumeMultiplier);

      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If HTML5 Audio fails to play (empty file / decode error / policy), synthesize realistic Web Audio fallback!
          this.playSynthesizedFallback(type);
        });
      }
    } catch {
      this.playSynthesizedFallback(type);
    }
  }

  /**
   * High quality algorithmic fallback synthesis in Web Audio API
   */
  private playSynthesizedFallback(type: SfxType) {
    try {
      if (!this.audioCtx) {
        this.initAudio();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.4, now);
      masterGain.connect(ctx.destination);

      switch (type) {
        case 'resonantHit': {
          // Dual sine chime harmonic
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
          osc2.frequency.setValueAtTime(1174.66, now); // D6
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.6);
          osc2.stop(now + 0.6);
          break;
        }

        case 'chime': {
          // Crisp metallic ding
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(2400, now + 0.04);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }

        case 'glitch': {
          // Futuristic digital burst
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(1600, now + 0.05);
          osc.frequency.linearRampToValueAtTime(400, now + 0.12);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'ticks': {
          // Mechanical micro-tick
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1800, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }

        case 'whoosh': {
          // Low pass frequency sweep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(650, now + 0.12);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.5, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case 'staticHit': {
          // Crisp static alert
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.setValueAtTime(220, now + 0.04);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.18);
          break;
        }

        case 'bassDrop': {
          // Deep punchy bass wave
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }

        case 'wobble': {
          // Cartoon bouncy wobble
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.linearRampToValueAtTime(700, now + 0.08);
          osc.frequency.linearRampToValueAtTime(420, now + 0.15);
          osc.frequency.linearRampToValueAtTime(800, now + 0.22);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        }
      }
    } catch {
      // Audio synthesis fallback silent catch
    }
  }
}

export const soundManager = new SoundManager();

/**
 * Convenient Shortcut Methods
 */
export const sound = {
  // Common UI actions
  click: () => soundManager.play('ticks', 0.8),
  tab: () => soundManager.play('ticks', 0.6),
  
  // Feedback and completions
  success: () => soundManager.play('resonantHit', 1.0),
  copy: () => soundManager.play('chime', 1.0),
  bookmark: () => soundManager.play('chime', 0.9),
  
  // Operations
  generate: () => soundManager.play('glitch', 0.9),
  scan: () => soundManager.play('glitch', 0.85),
  download: () => soundManager.play('whoosh', 1.0),
  launch: () => soundManager.play('whoosh', 0.9),
  
  // Modifiers & system
  error: () => soundManager.play('staticHit', 1.0),
  clear: () => soundManager.play('staticHit', 0.85),
  delete: () => soundManager.play('staticHit', 0.9),
  theme: () => soundManager.play('bassDrop', 0.85),
  like: () => soundManager.play('wobble', 0.95),
  bounce: () => soundManager.play('wobble', 0.9),
  
  // Direct access
  play: (type: SfxType) => soundManager.play(type),
  toggle: () => soundManager.toggleSound(),
  isEnabled: () => soundManager.isEnabled(),
  setVolume: (v: number) => soundManager.setVolume(v)
};
