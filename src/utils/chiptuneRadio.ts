export interface Note {
  pitch: string;
  duration: number;
}

export const NOTE_FREQ: Record<string, number> = {
  "REST": 0,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
  "C6": 1046.50, "D6": 1174.66, "E6": 1318.51, "G6": 1567.98
};

const ROUTE_1_MELODY: Note[] = [
  { pitch: "D5", duration: 0.5 },
  { pitch: "E5", duration: 0.5 },
  { pitch: "F#5", duration: 1 },
  { pitch: "A5", duration: 1 },
  { pitch: "G5", duration: 0.5 },
  { pitch: "F#5", duration: 0.5 },
  { pitch: "E5", duration: 1 },
  { pitch: "D5", duration: 1 },
  { pitch: "B4", duration: 0.5 },
  { pitch: "C5", duration: 0.5 },
  { pitch: "D5", duration: 1 },
  { pitch: "G5", duration: 1 },
  { pitch: "F#5", duration: 1 },
  { pitch: "E5", duration: 1 },
  { pitch: "D5", duration: 0.5 },
  { pitch: "E5", duration: 0.5 },
  { pitch: "F#5", duration: 1 },
  { pitch: "A5", duration: 1 },
  { pitch: "G5", duration: 0.5 },
  { pitch: "F#5", duration: 0.5 },
  { pitch: "E5", duration: 1 },
  { pitch: "A5", duration: 1 },
  { pitch: "B5", duration: 1 },
  { pitch: "A5", duration: 1 },
  { pitch: "G5", duration: 1 },
  { pitch: "F#5", duration: 1 },
  { pitch: "E5", duration: 2 }
];

const PKMN_CENTER_MELODY: Note[] = [
  { pitch: "C5", duration: 0.5 },
  { pitch: "E5", duration: 0.5 },
  { pitch: "G5", duration: 0.5 },
  { pitch: "C6", duration: 0.5 },
  { pitch: "B5", duration: 0.5 },
  { pitch: "A5", duration: 0.5 },
  { pitch: "G5", duration: 1 },
  { pitch: "A5", duration: 0.5 },
  { pitch: "F5", duration: 0.5 },
  { pitch: "A5", duration: 0.5 },
  { pitch: "D6", duration: 0.5 },
  { pitch: "C6", duration: 0.5 },
  { pitch: "B5", duration: 0.5 },
  { pitch: "A5", duration: 0.5 },
  { pitch: "G5", duration: 0.5 },
  { pitch: "C5", duration: 0.5 },
  { pitch: "E5", duration: 0.5 },
  { pitch: "G5", duration: 0.5 },
  { pitch: "C6", duration: 0.5 },
  { pitch: "B5", duration: 0.5 },
  { pitch: "A5", duration: 0.5 },
  { pitch: "G5", duration: 1 },
  { pitch: "A5", duration: 0.5 },
  { pitch: "G5", duration: 0.5 },
  { pitch: "F5", duration: 0.5 },
  { pitch: "E5", duration: 0.5 },
  { pitch: "D5", duration: 0.5 },
  { pitch: "E5", duration: 0.5 },
  { pitch: "C5", duration: 2.0 }
];

const LAVENDER_MELODY: Note[] = [
  { pitch: "C5", duration: 1 },
  { pitch: "G5", duration: 1 },
  { pitch: "B5", duration: 1 },
  { pitch: "F#5", duration: 1 },
  { pitch: "C5", duration: 1 },
  { pitch: "G5", duration: 1 },
  { pitch: "B5", duration: 1 },
  { pitch: "F#5", duration: 1 },
  { pitch: "D5", duration: 1 },
  { pitch: "A5", duration: 1 },
  { pitch: "C6", duration: 1 },
  { pitch: "G5", duration: 1 }
];

export type Station = "off" | "route1" | "center" | "lavender";

export class ChiptuneRadio {
  private static audioCtx: AudioContext | null = null;
  private static gainNode: GainNode | null = null;
  private static currentStation: Station = "off";
  private static volume: number = 0.08;
  private static melodyInterval: any = null;
  private static noteIndex = 0;

  private static getContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
  }

  public static setVolume(volPercent: number) {
    this.volume = (volPercent / 100) * 0.08;
    const ctx = this.getContext();
    if (this.gainNode && ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    }
  }

  public static selectStation(station: Station) {
    this.currentStation = station;
    this.stopMelody();

    if (station === "off") return;

    this.playMelody();
  }

  private static playMelody() {
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
    }
    this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);

    const melody = this.getMelodyForStation(this.currentStation);
    if (!melody || !melody.length) return;

    this.noteIndex = 0;
    const bpm = 135;
    const beatDuration = 60 / bpm;

    const playNextNote = () => {
      if (this.currentStation === "off" || !ctx) {
        this.stopMelody();
        return;
      }

      const note = melody[this.noteIndex];
      if (!note) return;
      const freq = NOTE_FREQ[note.pitch] ?? 0;
      const durationSec = note.duration * beatDuration;

      if (freq > 0) {
        try {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          
          oscGain.gain.setValueAtTime(1.0, ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec - 0.02);
          
          osc.connect(oscGain);
          oscGain.connect(this.gainNode!);
          
          osc.start();
          osc.stop(ctx.currentTime + durationSec);
        } catch {}
      }

      this.noteIndex = (this.noteIndex + 1) % melody.length;
      this.melodyInterval = setTimeout(playNextNote, durationSec * 1000);
    };

    playNextNote();
  }

  private static stopMelody() {
    if (this.melodyInterval) {
      clearTimeout(this.melodyInterval);
      this.melodyInterval = null;
    }
  }

  private static getMelodyForStation(station: Station): Note[] {
    switch (station) {
      case "route1": return ROUTE_1_MELODY;
      case "center": return PKMN_CENTER_MELODY;
      case "lavender": return LAVENDER_MELODY;
      default: return [];
    }
  }
}
