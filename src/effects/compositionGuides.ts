// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

type GuideName = 'thirds' | 'phi' | 'goldenSpiral' | 'diagonal' | 'center' | 'baroque';

/**
 * Classical composition guide overlays used in photography, painting, and graphic design.
 *
 * Configurable guides:
 *   - thirds: Rule of thirds grid
 *   - phi: Golden ratio (φ ≈ 1.618) grid
 *   - goldenSpiral: Fibonacci / Golden spiral curve
 *   - diagonal: Diagonal method lines
 *   - center: Center crosshair
 *   - baroque: Baroque diagonal (Sinister + Baroque)
 */
export class CompositionGuides extends BaseEffect {
  readonly name = 'compositionGuides';
  private g!: PIXI.Graphics;
  private drawn = false;
  private lastW = 0;
  private lastH = 0;
  private lastBg = '';

  protected setup(): void {
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);
  }

  update(ctx: UpdateContext): void {
    const rotSpeed = this.config.rotSpeed ?? 0;
    const needsRedraw = rotSpeed !== 0;

    const bg = ctx.palette.background;
    if (!needsRedraw && this.drawn && this.lastW === ctx.screenWidth && this.lastH === ctx.screenHeight && this.lastBg === bg) return;
    this.drawn = true;
    this.lastW = ctx.screenWidth;
    this.lastH = ctx.screenHeight;
    this.lastBg = bg;

    const g = this.g;
    g.clear();

    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    const color = resolveColor(this.config.color ?? '$text', this.palette);
    const alpha = this.config.alpha ?? 0.2;
    const lw = this.config.lineWidth ?? 1;
    const guides: GuideName[] = this.config.guides ?? ['goldenSpiral'];
    const spiralQuadrant = this.config.spiralQuadrant ?? 0;

    if (rotSpeed !== 0) {
      this.container.pivot.set(w / 2, h / 2);
      this.container.position.set(w / 2, h / 2);
      this.container.rotation = ctx.time * rotSpeed * ctx.animationSpeed;
    }

    for (const guide of guides) {
      switch (guide) {
        case 'thirds':
          this.drawThirds(g, w, h, color, alpha, lw);
          break;
        case 'phi':
          this.drawPhiGrid(g, w, h, color, alpha, lw);
          break;
        case 'goldenSpiral':
          this.drawGoldenSpiral(g, w, h, color, alpha * 1.5, lw * 1.2, spiralQuadrant);
          break;
        case 'diagonal':
          this.drawDiagonals(g, w, h, color, alpha, lw);
          break;
        case 'center':
          this.drawCenter(g, w, h, color, alpha, lw);
          break;
        case 'baroque':
          this.drawBaroque(g, w, h, color, alpha, lw);
          break;
      }
    }
  }

  private drawThirds(g: PIXI.Graphics, w: number, h: number, color: string, alpha: number, lw: number): void {
    for (let i = 1; i <= 2; i++) {
      g.moveTo(w * i / 3, 0).lineTo(w * i / 3, h);
      g.moveTo(0, h * i / 3).lineTo(w, h * i / 3);
    }
    g.stroke({ color, width: lw, alpha });
  }

  private drawPhiGrid(g: PIXI.Graphics, w: number, h: number, color: string, alpha: number, lw: number): void {
    const phi = 1 / 1.6180914;
    const lines = [phi, 1 - phi];
    for (const f of lines) {
      g.moveTo(w * f, 0).lineTo(w * f, h);
      g.moveTo(0, h * f).lineTo(w, h * f);
    }
    g.stroke({ color, width: lw, alpha });
  }

  /**
   * Golden / Fibonacci spiral using quarter-circle arcs in shrinking golden rectangles.
   * spiralQuadrant: 0=bottom-right, 1=bottom-left, 2=top-left, 3=top-right
   */
  private drawGoldenSpiral(
    g: PIXI.Graphics, w: number, h: number,
    color: string, alpha: number, lw: number,
    quadrant: number,
  ): void {
    const iterations = 10;

    let rx = 0, ry = 0, rw = w, rh = h;

    // Also draw the golden rectangle subdivisions
    for (let i = 0; i < iterations; i++) {
      const dir = (i + quadrant) % 4;
      let squareSize: number;
      let cx: number, cy: number;
      let startAngle: number;

      if (rw > rh) {
        squareSize = rh;
      } else {
        squareSize = rw;
      }

      switch (dir) {
        case 0: // right
          cx = rx + squareSize;
          cy = ry + squareSize;
          startAngle = Math.PI;
          g.rect(rx, ry, squareSize, rh);
          rx += squareSize;
          rw -= squareSize;
          break;
        case 1: // top
          cx = rx;
          cy = ry + squareSize;
          startAngle = Math.PI * 1.5;
          g.rect(rx, ry, rw, squareSize);
          ry += squareSize;
          rh -= squareSize;
          break;
        case 2: // left
          cx = rx + rw - squareSize;
          cy = ry;
          startAngle = 0;
          g.rect(rx + rw - squareSize, ry, squareSize, rh);
          rw -= squareSize;
          break;
        case 3: // bottom
          cx = rx + rw;
          cy = ry + rh - squareSize;
          startAngle = Math.PI * 0.5;
          g.rect(rx, ry + rh - squareSize, rw, squareSize);
          rh -= squareSize;
          break;
        default:
          continue;
      }

      g.stroke({ color, width: lw * 0.4, alpha: alpha * 0.35 });

      // Draw quarter arc
      const arcSteps = 30;
      const endAngle = startAngle + Math.PI / 2;
      for (let s = 0; s <= arcSteps; s++) {
        const t = startAngle + (endAngle - startAngle) * (s / arcSteps);
        const px = cx + Math.cos(t) * squareSize;
        const py = cy + Math.sin(t) * squareSize;
        if (s === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke({ color, width: lw, alpha });
    }
  }

  private drawDiagonals(g: PIXI.Graphics, w: number, h: number, color: string, alpha: number, lw: number): void {
    g.moveTo(0, 0).lineTo(w, h);
    g.moveTo(w, 0).lineTo(0, h);
    g.stroke({ color, width: lw, alpha });
  }

  private drawCenter(g: PIXI.Graphics, w: number, h: number, color: string, alpha: number, lw: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const sz = Math.min(w, h) * 0.03;

    g.moveTo(cx - sz, cy).lineTo(cx + sz, cy);
    g.moveTo(cx, cy - sz).lineTo(cx, cy + sz);
    g.stroke({ color, width: lw, alpha });

    g.circle(cx, cy, sz * 0.6);
    g.stroke({ color, width: lw * 0.7, alpha: alpha * 0.7 });
  }

  /** Baroque diagonal: from corners to 1/3 points on opposite edges */
  private drawBaroque(g: PIXI.Graphics, w: number, h: number, color: string, alpha: number, lw: number): void {
    // Sinister diagonal and reciprocals
    g.moveTo(0, 0).lineTo(w, h);
    g.moveTo(0, h / 3).lineTo(w * 2 / 3, h);
    g.moveTo(w / 3, 0).lineTo(w, h * 2 / 3);

    // Baroque diagonal and reciprocals
    g.moveTo(w, 0).lineTo(0, h);
    g.moveTo(w, h / 3).lineTo(w / 3, h);
    g.moveTo(w * 2 / 3, 0).lineTo(0, h * 2 / 3);

    g.stroke({ color, width: lw, alpha: alpha * 0.8 });
  }
}