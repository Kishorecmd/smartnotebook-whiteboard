/**
 * Gentle sounds and spoken words for the games. Tones are generated, so there
 * are no audio files to download; speech uses the device's own voice.
 */
const SOUND_KEY = 'jhw_games_sound_v1';

export function soundOn(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}

export function setSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* Preference lasts for this page only. */ }
  if (!on) globalThis.speechSynthesis?.cancel();
}

let audio: AudioContext | null = null;
function tones(notes: [frequency: number, start: number, length: number][], type: OscillatorType, volume: number) {
  if (!soundOn()) return;
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    for (const [frequency, start, length] of notes) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = type; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + start); osc.stop(now + start + length + 0.05);
    }
  } catch { /* No audio on this device. */ }
}

export const playRight = () => tones([[523, 0, 0.18], [659, 0.12, 0.25]], 'triangle', 0.18);
/** Dice rattling across the table, then settling: short, quiet clicks. */
export const playRattle = () => tones(Array.from({ length: 9 }, (_, i) => [180 + ((i * 97) % 140), i * 0.085, 0.04] as [number, number, number]), 'square', 0.035);
/** One soft click as a name flicks past in Random name. */
export const playTick = () => tones([[880, 0, 0.03]], 'sine', 0.05);
export const playTryAgain = () => tones([[220, 0, 0.22]], 'sine', 0.12);
export const playFinish = () => tones([[523, 0, 0.2], [659, 0.15, 0.2], [784, 0.3, 0.4]], 'triangle', 0.18);

export function say(text: string) {
  const speech = globalThis.speechSynthesis;
  if (!soundOn() || !speech || typeof SpeechSynthesisUtterance === 'undefined') return;
  speech.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-IN'; utterance.rate = 0.85;
  speech.speak(utterance);
}
