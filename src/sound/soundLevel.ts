/** Relative microphone level, not calibrated sound-pressure decibels. */
export function soundLevel(samples: Float32Array, sensitivity = 1): number {
  if (!samples.length) return 0;
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  const power = samples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / samples.length;
  const rms = Math.sqrt(power) * sensitivity;
  return Math.max(0, Math.min(100, (20 * Math.log10(Math.max(rms, 0.001)) + 60) / 60 * 100));
}

/** Sustained noise triggers once; sustained quiet rearms the monitor. */
export class NoiseLimit {
  private aboveSince: number | null = null;
  private quietSince: number | null = null;
  private armed = true;
  private lastAlert = -Infinity;
  update(level: number, limit: number, now: number): boolean {
    if (level >= limit) {
      this.quietSince = null;
      this.aboveSince ??= now;
      if (this.armed && now - this.aboveSince >= 1200 && now - this.lastAlert >= 5000) {
        this.armed = false;
        this.lastAlert = now;
        return true;
      }
    } else {
      this.aboveSince = null;
      if (level < limit - 5) {
        this.quietSince ??= now;
        if (now - this.quietSince >= 1000) this.armed = true;
      } else this.quietSince = null;
    }
    return false;
  }
}
