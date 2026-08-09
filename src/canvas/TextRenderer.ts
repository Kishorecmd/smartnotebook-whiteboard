import { TextObject, BoundingBox } from '../types';

export class TextRenderer {
  private static offscreenCanvas: HTMLCanvasElement | null = null;
  private static offscreenCtx: CanvasRenderingContext2D | null = null;

  private static getMeasureContext(): CanvasRenderingContext2D {
    if (!this.offscreenCtx) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    }
    return this.offscreenCtx;
  }

  /**
   * Computes the bounding box metrics of a multiline text string.
   */
  public static measureTextBounds(
    text: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: 'normal' | 'bold' = 'normal',
    fontStyle: 'normal' | 'italic' = 'normal',
    lineHeightMultiplier: number = 1.25,
    padding: number = 8
  ): { width: number; height: number; lines: string[]; lineHeight: number } {
    const ctx = this.getMeasureContext();
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

    const lines = text.split('\n');
    let maxLineWidth = 0;

    for (const line of lines) {
      const metrics = ctx.measureText(line || ' ');
      if (metrics.width > maxLineWidth) {
        maxLineWidth = metrics.width;
      }
    }

    const lineHeight = fontSize * lineHeightMultiplier;
    const totalTextHeight = Math.max(lines.length * lineHeight, fontSize);

    const totalWidth = Math.ceil(maxLineWidth + padding * 2);
    const totalHeight = Math.ceil(totalTextHeight + padding * 2);

    return {
      width: Math.max(30, totalWidth),
      height: Math.max(fontSize + padding * 2, totalHeight),
      lines,
      lineHeight,
    };
  }

  /**
   * Renders a TextObject onto a CanvasRenderingContext2D with rotation, alignment, and formatting.
   */
  public static renderText(ctx: CanvasRenderingContext2D, textObj: TextObject): void {
    if (!textObj.text || !textObj.visible) return;

    ctx.save();

    const padding = textObj.padding ?? 8;
    const fontSize = textObj.fontSize || 24;
    const fontFamily = textObj.fontFamily || 'Inter, sans-serif';
    const fontWeight = textObj.fontWeight || 'normal';
    const fontStyle = textObj.fontStyle || 'normal';
    const textAlign = textObj.textAlign || 'left';
    const lineHeightMultiplier = textObj.lineHeight || 1.25;
    const lineHeight = fontSize * lineHeightMultiplier;

    // Apply object rotation around its center
    if (textObj.rotation !== 0) {
      const cx = textObj.x + textObj.width / 2;
      const cy = textObj.y + textObj.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((textObj.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Draw background card if specified
    if (textObj.backgroundColor && textObj.backgroundColor !== 'transparent') {
      ctx.fillStyle = textObj.backgroundColor;
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(textObj.x, textObj.y, textObj.width, textObj.height, radius);
      ctx.fill();
    }

    // Configure text font & baseline
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textObj.color || '#1e293b';
    ctx.textBaseline = 'top';
    ctx.textAlign = textAlign;

    const lines = textObj.text.split('\n');

    lines.forEach((line, index) => {
      let x = textObj.x + padding;
      if (textAlign === 'center') {
        x = textObj.x + textObj.width / 2;
      } else if (textAlign === 'right') {
        x = textObj.x + textObj.width - padding;
      }

      const y = textObj.y + padding + index * lineHeight;

      ctx.fillText(line, x, y);

      // Underline decoration
      if (textObj.underline && line.trim().length > 0) {
        const metrics = ctx.measureText(line);
        let startX = x;
        if (textAlign === 'center') {
          startX = x - metrics.width / 2;
        } else if (textAlign === 'right') {
          startX = x - metrics.width;
        }

        const underlineY = y + fontSize + 2;
        ctx.save();
        ctx.strokeStyle = textObj.color || '#1e293b';
        ctx.lineWidth = Math.max(1.5, fontSize / 16);
        ctx.beginPath();
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(startX + metrics.width, underlineY);
        ctx.stroke();
        ctx.restore();
      }
    });

    ctx.restore();
  }

  /**
   * Computes the bounding box of a TextObject.
   */
  public static getBoundingBox(textObj: TextObject): BoundingBox {
    return {
      minX: textObj.x,
      minY: textObj.y,
      maxX: textObj.x + textObj.width,
      maxY: textObj.y + textObj.height,
      width: textObj.width,
      height: textObj.height,
    };
  }
}
