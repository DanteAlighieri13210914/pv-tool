// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';

export class TextureBackground extends BaseEffect {
  readonly name = 'textureBackground';
  private tiling!: PIXI.TilingSprite;

  protected setup(): void {
    const intensity = this.config.intensity ?? 0.15;
    const w = 512;
    const h = 512;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(w, h);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = Math.floor(intensity * 255);
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = PIXI.Texture.from(canvas);
    this.tiling = new PIXI.TilingSprite({ texture, width: 1920, height: 1080 });

    this.container.addChild(this.tiling);
  }

  update(ctx: UpdateContext): void {
    this.tiling.width = ctx.screenWidth;
    this.tiling.height = ctx.screenHeight;

    const speed = (this.config.driftSpeed ?? 0.5) * ctx.animationSpeed * ctx.motionIntensity;
    this.tiling.tilePosition.x = ctx.time * speed;
    this.tiling.tilePosition.y = ctx.time * speed * 0.7;
  }
}