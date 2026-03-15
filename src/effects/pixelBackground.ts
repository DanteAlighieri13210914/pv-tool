// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * Kawaii pixel background combining checkerboard, dots, and scattered shapes
 */
export class PixelBackground extends BaseEffect {
  readonly name = 'pixelBackground';
  private checkerboardG!: PIXI.Graphics;
  private dotsG!: PIXI.Graphics;
  private shapesG!: PIXI.Graphics;
  private shapePositions: Array<{ x: number; y: number; size: number; speed: number; offset: number }> = [];

  protected setup(): void {
    this.checkerboardG = new PIXI.Graphics();
    this.dotsG = new PIXI.Graphics();
    this.shapesG = new PIXI.Graphics();
    
    this.container.addChild(this.checkerboardG);
    this.container.addChild(this.dotsG);
    this.container.addChild(this.shapesG);

    // Initialize scattered shapes positions
    const pinkCount = this.config.pinkCount ?? 6;
    const yellowCount = this.config.yellowCount ?? 8;
    const totalCount = pinkCount + yellowCount;

    for (let i = 0; i < totalCount; i++) {
      this.shapePositions.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * (20 - 12) + 12,
        speed: (Math.random() * 0.1 + 0.15) * (i < pinkCount ? 1 : 0.75),
        offset: Math.random() * Math.PI * 2,
      });
    }
  }

  update(ctx: UpdateContext): void {
    this.drawCheckerboard(ctx);
    this.drawDots(ctx);
    this.drawScatteredShapes(ctx);
  }

  private drawCheckerboard(ctx: UpdateContext): void {
    const g = this.checkerboardG;
    g.clear();

    const color1 = resolveColor(this.config.checkerColor1 ?? '#ffffff', this.palette);
    const color2 = resolveColor(this.config.checkerColor2 ?? '#fef5f8', this.palette);
    const cellSize = this.config.checkerCellSize ?? 40;
    const alpha = this.config.checkerAlpha ?? 0.3;

    const cols = Math.ceil(ctx.screenWidth / cellSize) + 1;
    const rows = Math.ceil(ctx.screenHeight / cellSize) + 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isEven = (row + col) % 2 === 0;
        const color = isEven ? color1 : color2;
        
        g.rect(col * cellSize, row * cellSize, cellSize, cellSize);
        g.fill({ color, alpha });
      }
    }
  }

  private drawDots(ctx: UpdateContext): void {
    const g = this.dotsG;
    g.clear();

    const color = resolveColor(this.config.dotColor ?? '#ffb3d9', this.palette);
    const dotSize = this.config.dotSize ?? 4;
    const spacing = this.config.dotSpacing ?? 12;
    const alpha = this.config.dotAlpha ?? 0.15;

    const cols = Math.ceil(ctx.screenWidth / spacing) + 1;
    const rows = Math.ceil(ctx.screenHeight / spacing) + 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing;
        const y = row * spacing;
        
        g.rect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
        g.fill({ color, alpha });
      }
    }
  }

  private drawScatteredShapes(ctx: UpdateContext): void {
    const g = this.shapesG;
    g.clear();

    const pinkColor = resolveColor(this.config.pinkColor ?? '#ffb3d9', this.palette);
    const yellowColor = resolveColor(this.config.yellowColor ?? '#fff9b3', this.palette);
    const pinkAlpha = this.config.pinkAlpha ?? 0.5;
    const yellowAlpha = this.config.yellowAlpha ?? 0.6;
    const pinkCount = this.config.pinkCount ?? 6;

    this.shapePositions.forEach((shape, i) => {
      const isPink = i < pinkCount;
      const color = isPink ? pinkColor : yellowColor;
      const alpha = isPink ? pinkAlpha : yellowAlpha;

      // Animate position
      const animOffset = Math.sin(ctx.time * shape.speed + shape.offset) * 0.02;
      const x = (shape.x + animOffset) * ctx.screenWidth;
      const y = (shape.y + Math.cos(ctx.time * shape.speed * 0.7 + shape.offset) * 0.02) * ctx.screenHeight;

      // Draw circle
      g.circle(x, y, shape.size / 2);
      g.fill({ color, alpha });
    });
  }
}
