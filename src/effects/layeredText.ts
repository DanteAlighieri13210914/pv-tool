// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface TextLayer {
  text: PIXI.Text;
  blurFilter: PIXI.BlurFilter;
  entryTime: number;
  targetScale: number;
  offsetX: number;
  offsetY: number;
}

export class LayeredText extends BaseEffect {
  readonly name = 'layeredText';
  private textLayers: TextLayer[] = [];
  private lastSegment = '';
  private maxLayers = 0;
  private layerIdx = 0;

  protected setup(): void {
    this.maxLayers = this.config.maxLayers ?? 4;
  }

  update(ctx: UpdateContext): void {
    const cx = ctx.screenWidth / 2;
    const cy = ctx.screenHeight / 2;
    const speed = ctx.animationSpeed;

    if (ctx.currentText && ctx.currentText !== this.lastSegment) {
      this.lastSegment = ctx.currentText;
      this.addLayer(ctx.currentText, ctx.time, cx, cy);
    }

    // Animate all layers
    for (let i = 0; i < this.textLayers.length; i++) {
      const layer = this.textLayers[i];
      const isNewest = i === this.textLayers.length - 1;
      const depth = this.textLayers.length - 1 - i;
      const elapsed = ctx.time - layer.entryTime;

      layer.text.x = cx + layer.offsetX;
      layer.text.y = cy + layer.offsetY;

      if (isNewest) {
        // Entry animation for newest
        const progress = Math.min(1, elapsed * 3 * speed);
        const eased = 1 - (1 - progress) * (1 - progress);
        const overshoot = progress < 0.8 ? 1 + 0.15 * Math.sin(progress * Math.PI * 3) : 1;

        layer.text.alpha = Math.min(1, elapsed * 5 * speed);
        layer.text.scale.set(layer.targetScale * eased * overshoot);
        layer.blurFilter.blur = 0;
        layer.text.filters = [];
      } else {
        // Older layers: blur and fade
        const targetBlur = (depth + 1) * 4;
        const currentBlur = layer.blurFilter.blur;
        layer.blurFilter.blur = currentBlur + (targetBlur - currentBlur) * Math.min(1, ctx.deltaTime * 4);

        const targetAlpha = Math.max(0.08, 0.55 - depth * 0.18);
        layer.text.alpha += (targetAlpha - layer.text.alpha) * Math.min(1, ctx.deltaTime * 3);

        layer.text.filters = [layer.blurFilter];
      }
    }
  }

  private addLayer(text: string, time: number, cx: number, cy: number): void {
    const color = resolveColor(this.config.color ?? '$primary', this.palette);
    const fontSize = this.config.fontSize ?? 80;

    // Alternating sizes for impact
    const scaleOptions = [1.0, 1.35, 0.75, 1.15];
    const targetScale = scaleOptions[this.layerIdx % scaleOptions.length];

    // Slight staggered offsets
    const offsets = [
      { x: 0, y: 0 },
      { x: -20, y: 15 },
      { x: 15, y: -10 },
      { x: -10, y: -20 },
    ];
    const off = offsets[this.layerIdx % offsets.length];

    const textObj = new PIXI.Text({
      text,
      style: {
        fontFamily: this.config.fontFamily ?? '"Noto Serif JP", serif',
        fontSize,
        fontWeight: '900' as PIXI.TextStyleFontWeight,
        fill: color,
        letterSpacing: 8,
      },
    });
    textObj.anchor.set(0.5);
    textObj.x = cx + off.x;
    textObj.y = cy + off.y;
    textObj.alpha = 0;
    textObj.scale.set(0);

    const blurFilter = new PIXI.BlurFilter();
    blurFilter.blur = 0;

    this.container.addChild(textObj);
    this.textLayers.push({
      text: textObj,
      blurFilter,
      entryTime: time,
      targetScale,
      offsetX: off.x,
      offsetY: off.y,
    });

    this.layerIdx++;

    while (this.textLayers.length > this.maxLayers) {
      const old = this.textLayers.shift()!;
      old.text.destroy(true);
    }
  }
}