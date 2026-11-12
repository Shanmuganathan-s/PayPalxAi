let context: AudioContext | null = null;
let muted = false;

type AudioContextConstructor = typeof AudioContext;

function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}

function getContext(): AudioContext | null {
  if (muted) return null;
  const Constructor = audioContextConstructor();
  if (!Constructor) return null;
  if (!context) context = new Constructor();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  startFrequency: number,
  endFrequency: number,
  duration: number,
  gainValue: number,
  startOffset = 0,
  filterFrequency?: number,
): void {
  const start = ctx.currentTime + startOffset;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, start);
  if (endFrequency !== startFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      start + duration,
    );
  }
  gain.gain.setValueAtTime(Math.max(0.0001, gainValue), start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  if (filterFrequency) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFrequency, start);
    oscillator.connect(filter);
    filter.connect(gain);
  } else {
    oscillator.connect(gain);
  }
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function setSoundMuted(value: boolean): void {
  muted = value;
}

export function isSoundMuted(): boolean {
  return muted;
}

export function playKeyTick(): void {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, "triangle", 800, 800, 0.018, 0.03);
}

export function playCursorClick(): void {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, "triangle", 1200, 1200, 0.018, 0.06);
  tone(ctx, "sine", 600, 600, 0.035, 0.045, 0.018);
}

export function playApiSuccess(): void {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, "sine", 523.25, 523.25, 0.16, 0.05);
  tone(ctx, "sine", 783.99, 783.99, 0.18, 0.04, 0.14);
}

export function playSceneTransition(): void {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, "sawtooth", 180, 90, 0.16, 0.035, 0, 620);
}
