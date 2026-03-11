// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * Draws a jigsaw puzzle grid across the entire canvas.
 * Each internal edge has a classic puzzle tab/blank shape.
 * Config:
 *   cols, rows  — grid dimensions (default 8×5)
 *   color       — line color
 *   alpha       — line opacity
 *   lineWidth   — stroke width
 *   tabScale    — tab size relative to cell (default 0.2)
 *   seed        — randomize tab directions
 */
export class JigsawGrid extends BaseEffect {
  readonly name = 'jigsawGrid';
  private g!: PIXI.Graphics;
  private drawn = false;
  private lastW = 0;
  private lastH = 0;
  private lastBg = '';

  protected setup(): void {
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);
  }

  /**
   * Deterministic pseudo-random: returns 1 or -1 for a given edge.
   * Ensures the pattern is stable across frames.
   */
  private tabDir(col: number, row: number, axis: number): number {
    const seed = this.config.seed ?? 914;
    const n = (col * 7 + row * 13 + axis * 31 + seed * 1321) & 0xffff;
    return (n % 2 === 0) ? 1 : -1;
  }

  /**
   * Draw a jigsaw-shaped edge from (x1,y1) to (x2,y2).
   * `tab`: 1 = bump outward (relative to normal), -1 = indent inward.
   */
  private drawPuzzleEdge(
    g: PIXI.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    tab: number,
    tabScale: number,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    // Unit vectors: along edge (e) and perpendicular normal (n)
    const ex = dx / len;
    const ey = dy / len;
    const nx = -ey * tab;
    const ny = ex * tab;

    const tabH = len * tabScale;
    const neckDip = len * 0.025;

    // Parametric helper: position along edge + perpendicular offset
    const px = (t: number, perp: number) => x1 + ex * len * t + nx * perp;
    const py = (t: number, perp: number) => y1 + ey * len * t + ny * perp;

    // Straight to neck start
    g.lineTo(px(0.34, 0), py(0.34, 0));

    // Left half: neck dip → tab bulge → tab peak
    g.bezierCurveTo(
      px(0.34, -neckDip), py(0.34, -neckDip),
      px(0.32, tabH * 0.8), py(0.32, tabH * 0.8),
      px(0.5, tabH), py(0.5, tabH),
    );

    // Right half: tab peak → tab bulge → neck dip → edge
    g.bezierCurveTo(
      px(0.68, tabH * 0.8), py(0.68, tabH * 0.8),
      px(0.66, -neckDip), py(0.66, -neckDip),
      px(0.66, 0), py(0.66, 0),
    );

    // Straight to end
    g.lineTo(x2, y2);
  }

  update(ctx: UpdateContext): void {
    const bg = ctx.palette.background;
    if (this.drawn && this.lastW === ctx.screenWidth && this.lastH === ctx.screenHeight && this.lastBg === bg) return;
    this.drawn = true;
    this.lastW = ctx.screenWidth;
    this.lastH = ctx.screenHeight;
    this.lastBg = bg;

    const g = this.g;
    g.clear();

    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    const cols = this.config.cols ?? 8;
    const rows = this.config.rows ?? 5;
    const color = resolveColor(this.config.color ?? '$line', this.palette);
    const alpha = this.config.alpha ?? 0.5;
    const lineWidth = this.config.lineWidth ?? 2;
    const tabScale = this.config.tabScale ?? 0.2;

    const cellW = w / cols;
    const cellH = h / rows;

    // Horizontal edges
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x1 = col * cellW;
        const y = row * cellH;
        const x2 = (col + 1) * cellW;

        g.moveTo(x1, y);
        if (row === 0 || row === rows) {
          g.lineTo(x2, y);
        } else {
          this.drawPuzzleEdge(g, x1, y, x2, y, this.tabDir(col, row, 0), tabScale);
        }
      }
    }

    // Vertical edges
    for (let col = 0; col <= cols; col++) {
      for (let row = 0; row < rows; row++) {
        const x = col * cellW;
        const y1 = row * cellH;
        const y2 = (row + 1) * cellH;

        g.moveTo(x, y1);
        if (col === 0 || col === cols) {
          g.lineTo(x, y2);
        } else {
          this.drawPuzzleEdge(g, x, y1, x, y2, this.tabDir(col, row, 1), tabScale);
        }
      }
    }

    g.stroke({ color, width: lineWidth, alpha });
  }
}
