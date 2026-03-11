// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * Persona-5-style torn paper slash.
 *
 * Config:
 *   fillColor   — paper fill color (default: palette background)
 *   edgeColor   — torn edge border color (default '#000000')
 *   borderWidth — border stroke thickness (default 7)
 *   seed        — random seed (default 42)
 *   animate     — breathing animation (default true)
 */
export class PaperTear extends BaseEffect {
  readonly name = 'paperTear';
  private g!: PIXI.Graphics;
  private upperPts: { x: number; y: number }[] = [];
  private lowerPts: { x: number; y: number }[] = [];
  private lastW = 0;
  private lastH = 0;

  protected setup(): void {
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);
  }

  private hash(n: number): number {
    const x = Math.sin(n * 1321.0914 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Multi-octave noise for organic feel */
  private noise(i: number, seed: number): number {
    return (
      (this.hash(i * 7 + seed) * 2 - 1) * 0.5 +
      (this.hash(i * 13 + seed + 100) * 2 - 1) * 0.3 +
      (this.hash(i * 31 + seed + 200) * 2 - 1) * 0.2
    );
  }

  private generateEdges(w: number, h: number): void {
    const seed = this.config.seed ?? 42;

    // Left point: upper-left; Right point: lower-right
    const leftX = w * 0.03;
    const leftY = h * 0.37;
    const rightX = w * 0.97;
    const rightY = h * 0.68;

    const dx = rightX - leftX;
    const dy = rightY - leftY;

    // Gap envelope — tapers at ends, widest ~45-60%
    const gapProfile = (t: number): number => {
      if (t <= 0 || t >= 1) return 0;
      if (t < 0.08) return t / 0.08 * 0.20;
      if (t < 0.20) return 0.20 + (t - 0.08) / 0.12 * 0.50;
      if (t < 0.40) return 0.70 + (t - 0.20) / 0.20 * 0.30;
      if (t < 0.60) return 1.00;
      if (t < 0.78) return 1.00 - (t - 0.60) / 0.18 * 0.30;
      if (t < 0.90) return 0.70 - (t - 0.78) / 0.12 * 0.45;
      return 0.25 * (1 - (t - 0.90) / 0.10);
    };

    const maxGapHalf = h * 0.16;
    const segCount = 80;
    const ripScale = maxGapHalf * 0.28;

    this.upperPts = [];
    this.lowerPts = [];

    for (let i = 0; i <= segCount; i++) {
      const t = i / segCount;
      const cx = leftX + dx * t;
      const cy = leftY + dy * t;
      const gap = gapProfile(t) * maxGapHalf;
      const endFade = Math.min(t * 5, (1 - t) * 5, 1);

      // Upper edge — multi-scale noise + dramatic spikes
      let uRip = this.noise(i, seed) * ripScale * 0.6;
      if (this.hash(i * 43 + seed + 300) > 0.75) {
        uRip -= this.hash(i * 67 + seed + 400) * ripScale * 1.8;
      }
      // Secondary wobble for organic feel
      uRip += Math.sin(t * 11 + seed) * ripScale * 0.15;

      // Lower edge
      let lRip = this.noise(i, seed + 500) * ripScale * 0.55;
      if (this.hash(i * 53 + seed + 700) > 0.78) {
        lRip += this.hash(i * 71 + seed + 800) * ripScale * 1.6;
      }
      lRip += Math.sin(t * 9 + seed + 2) * ripScale * 0.12;

      this.upperPts.push({
        x: cx,
        y: cy - gap + uRip * endFade,
      });
      this.lowerPts.push({
        x: cx,
        y: cy + gap + lRip * endFade,
      });
    }

    // Paper flap protrusions — triangular bits sticking into gap
    this.insertFlaps(this.upperPts, seed, maxGapHalf * 0.14, 1);
    this.insertFlaps(this.lowerPts, seed + 500, maxGapHalf * 0.12, -1);
  }

  private insertFlaps(
    pts: { x: number; y: number }[],
    seed: number,
    flapSize: number,
    dir: number,
  ): void {
    const count = 4 + Math.floor(this.hash(seed * 3 + 77) * 4);
    const inserted: { idx: number; pt: { x: number; y: number } }[] = [];

    for (let f = 0; f < count; f++) {
      const t = 0.12 + this.hash(f * 31 + seed + 200) * 0.76;
      const idx = Math.floor(t * (pts.length - 2)) + 1;

      const base = pts[idx];
      const fLen = flapSize * (0.5 + this.hash(f * 47 + seed + 400) * 1.0);
      const fShift = (this.hash(f * 19 + seed + 600) - 0.5) * 18;

      inserted.push({
        idx: idx + inserted.length,
        pt: { x: base.x + fShift, y: base.y + fLen * dir },
      });
    }

    for (const { idx, pt } of inserted) {
      if (idx > 0 && idx < pts.length) {
        pts.splice(idx, 0, pt);
      }
    }
  }

  update(ctx: UpdateContext): void {
    const w = ctx.screenWidth;
    const h = ctx.screenHeight;

    if (this.lastW !== w || this.lastH !== h) {
      this.lastW = w;
      this.lastH = h;
      this.generateEdges(w, h);
    }

    const g = this.g;
    g.clear();

    const fillColor = this.config.fillColor
      ? resolveColor(this.config.fillColor, this.palette)
      : this.palette.background;
    const edgeColor = this.config.edgeColor ?? '#000000';
    const borderW = this.config.borderWidth ?? 7;
    const pad = Math.max(w, h) * 0.5;
    const animate = this.config.animate !== false;

    let breathe = 0;
    if (animate) {
      breathe = Math.sin(ctx.time * 0.5 * ctx.animationSpeed) * h * 0.002;
    }

    const upper = this.upperPts;
    const lower = this.lowerPts;
    if (upper.length < 2 || lower.length < 2) return;

    // === Paper fills ===
    g.moveTo(-pad, -pad);
    g.lineTo(w + pad, -pad);
    g.lineTo(w + pad, upper[upper.length - 1].y + breathe);
    for (let i = upper.length - 1; i >= 0; i--) {
      g.lineTo(upper[i].x, upper[i].y + breathe);
    }
    g.lineTo(-pad, upper[0].y + breathe);
    g.closePath();
    g.fill({ color: fillColor });

    g.moveTo(-pad, h + pad);
    g.lineTo(w + pad, h + pad);
    g.lineTo(w + pad, lower[lower.length - 1].y - breathe);
    for (let i = lower.length - 1; i >= 0; i--) {
      g.lineTo(lower[i].x, lower[i].y - breathe);
    }
    g.lineTo(-pad, lower[0].y - breathe);
    g.closePath();
    g.fill({ color: fillColor });

    // === Torn-edge border strokes ===
    g.moveTo(upper[0].x, upper[0].y + breathe);
    for (let i = 1; i < upper.length; i++) {
      g.lineTo(upper[i].x, upper[i].y + breathe);
    }
    g.stroke({ color: edgeColor, width: borderW, alpha: 1 });

    g.moveTo(lower[0].x, lower[0].y - breathe);
    for (let i = 1; i < lower.length; i++) {
      g.lineTo(lower[i].x, lower[i].y - breathe);
    }
    g.stroke({ color: edgeColor, width: borderW, alpha: 1 });
  }
}
