// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';

/**
 * Animated film grain / noise overlay.
 * Regenerates noise pattern every few frames for a living texture feel.
 */
export class FilmGrain extends BaseEffect {
  readonly name = 'filmGrain';
  override readonly heavy = true;
  private tiling!: PIXI.TilingSprite;
  private canvas!: HTMLCanvasElement;
  private ctx2d!: CanvasRenderingContext2D;
  private texture!: PIXI.Texture;
  private lastRegen = -1;

  protected setup(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx2d = this.canvas.getContext('2d')!;

    this.texture = PIXI.Texture.from(this.canvas);
    this.tiling = new PIXI.TilingSprite({
      texture: this.texture,
      width: 1920,
      height: 1080,
    });
    this.tiling.alpha = this.config.alpha ?? 0.08;
    this.container.addChild(this.tiling);

    this.regenerate();
  }

  private regenerate(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const imgData = this.ctx2d.createImageData(w, h);
    const data = imgData.data;
    const mono = this.config.mono ?? true;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = mono ? v : Math.random() * 255;
      data[i + 1] = mono ? v : Math.random() * 255;
      data[i + 2] = mono ? v : Math.random() * 255;
      data[i + 3] = 255;
    }

    this.ctx2d.putImageData(imgData, 0, 0);
    this.texture.source.update();
  }

  update(ctx: UpdateContext): void {
    const interval = this.config.updateInterval ?? 3;
    const intervalSec = interval / ctx.fps;
    if (ctx.time - this.lastRegen >= intervalSec) {
      this.lastRegen = ctx.time;
      this.regenerate();
    }

    this.tiling.width = ctx.screenWidth;
    this.tiling.height = ctx.screenHeight;
    this.tiling.alpha = this.config.alpha ?? 0.08;
  }
}