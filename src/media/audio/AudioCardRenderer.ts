import { AudioObject, ImageAudioObject } from '../../types';

/**
 * Draws the audio card and the player strip of an image+audio object onto the
 * board canvas.
 *
 * These are painted rather than built from DOM so they pan, zoom, rotate and
 * export exactly like every other object -- the same reason YouTube is drawn as
 * a poster rather than an iframe.
 */

export interface AudioCardState {
  playing: boolean;
  /** 0..1 through the track. */
  progress: number;
  currentTime: number;
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

/** Play triangle or pause bars, sized to the button. */
function drawTransport(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  playing: boolean
): void {
  ctx.fillStyle = '#ffffff';
  if (playing) {
    const barW = size * 0.22;
    const barH = size * 0.72;
    ctx.fillRect(cx - barW * 1.1, cy - barH / 2, barW, barH);
    ctx.fillRect(cx + barW * 0.1, cy - barH / 2, barW, barH);
    return;
  }
  const t = size * 0.36;
  ctx.beginPath();
  ctx.moveTo(cx - t * 0.55, cy - t);
  ctx.lineTo(cx - t * 0.55, cy + t);
  ctx.lineTo(cx + t * 0.85, cy);
  ctx.closePath();
  ctx.fill();
}

/**
 * The waveform, drawn from peaks captured at import. Bars before the playhead
 * are highlighted, which doubles as the progress indicator.
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  peaks: number[] | undefined,
  progress: number
): void {
  if (!peaks || peaks.length === 0) {
    // No analysis available: a plain progress bar still communicates position.
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    roundedRect(ctx, x, y + h / 2 - 3, w, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#6366f1';
    roundedRect(ctx, x, y + h / 2 - 3, Math.max(2, w * progress), 6, 3);
    ctx.fill();
    return;
  }

  const gap = 1.5;
  const barW = Math.max(1.5, w / peaks.length - gap);
  const playedUpTo = x + w * progress;

  for (let i = 0; i < peaks.length; i++) {
    const barX = x + i * (barW + gap);
    const barH = Math.max(2, peaks[i] * h);
    const barY = y + (h - barH) / 2;
    ctx.fillStyle = barX <= playedUpTo ? '#6366f1' : 'rgba(148, 163, 184, 0.45)';
    roundedRect(ctx, barX, barY, barW, barH, barW / 2);
    ctx.fill();
  }
}

export class AudioCardRenderer {
  /** Hit regions, in object-local coordinates, so input can map taps to controls. */
  public static layout(width: number, height: number) {
    const pad = Math.min(12, height * 0.14);
    const buttonSize = Math.min(44, height - pad * 2);
    return {
      pad,
      button: { x: pad, y: (height - buttonSize) / 2, size: buttonSize },
      wave: {
        x: pad + buttonSize + pad,
        y: pad,
        w: Math.max(10, width - (pad * 3 + buttonSize) - 46),
        h: height - pad * 2,
      },
      time: { x: width - 42, y: height / 2 },
    };
  }

  public static renderAudioCard(
    ctx: CanvasRenderingContext2D,
    obj: AudioObject,
    state: AudioCardState
  ): void {
    const { width, height } = obj;
    const l = this.layout(width, height);

    ctx.save();
    ctx.translate(obj.x, obj.y);
    if (obj.rotation) {
      ctx.translate(width / 2, height / 2);
      ctx.rotate(obj.rotation);
      ctx.translate(-width / 2, -height / 2);
    }

    // Card
    ctx.fillStyle = '#0f172a';
    roundedRect(ctx, 0, 0, width, height, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Transport button
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(l.button.x + l.button.size / 2, l.button.y + l.button.size / 2, l.button.size / 2, 0, Math.PI * 2);
    ctx.fill();
    drawTransport(ctx, l.button.x + l.button.size / 2, l.button.y + l.button.size / 2, l.button.size, state.playing);

    // Title above the waveform when the card is tall enough to carry it
    if (height > 70) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `600 ${Math.min(13, height * 0.16)}px Inter, sans-serif`;
      ctx.textBaseline = 'top';
      const maxChars = Math.max(6, Math.floor(l.wave.w / 7));
      const title = obj.title.length > maxChars ? obj.title.slice(0, maxChars - 1) + '…' : obj.title;
      ctx.fillText(title, l.wave.x, l.pad);
      drawWaveform(ctx, l.wave.x, l.pad + 18, l.wave.w, l.wave.h - 18, obj.showVisualizer ? obj.waveform : undefined, state.progress);
    } else {
      drawWaveform(ctx, l.wave.x, l.wave.y, l.wave.w, l.wave.h, obj.showVisualizer ? obj.waveform : undefined, state.progress);
    }

    // Remaining / elapsed time
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.min(12, height * 0.15)}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(state.playing ? state.currentTime : obj.durationSeconds), width - 10, height / 2);

    // Muted marker
    if (obj.muted) {
      ctx.fillStyle = '#f87171';
      ctx.font = `700 ${Math.min(11, height * 0.14)}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('MUTED', l.wave.x, height - 8);
    }

    ctx.restore();
  }

  /** The player strip drawn under the picture of an image+audio object. */
  public static renderImageAudioStrip(
    ctx: CanvasRenderingContext2D,
    obj: ImageAudioObject,
    state: AudioCardState
  ): void {
    const stripH = obj.playerHeight;
    const stripY = obj.height - stripH;
    const width = obj.width;
    const l = this.layout(width, stripH);

    ctx.save();
    ctx.translate(0, stripY);

    ctx.fillStyle = '#0f172a';
    roundedRect(ctx, 0, 0, width, stripH, 10);
    ctx.fill();

    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(l.button.x + l.button.size / 2, l.button.y + l.button.size / 2, l.button.size / 2, 0, Math.PI * 2);
    ctx.fill();
    drawTransport(ctx, l.button.x + l.button.size / 2, l.button.y + l.button.size / 2, l.button.size, state.playing);

    drawWaveform(ctx, l.wave.x, l.wave.y, l.wave.w, l.wave.h, undefined, state.progress);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.min(12, stripH * 0.28)}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(state.playing ? state.currentTime : obj.durationSeconds), width - 10, stripH / 2);

    ctx.restore();
  }
}
