// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

export class WaveText extends BaseEffect {
  readonly name = 'waveText';
  private charTexts: PIXI.Text[] = [];
  private charBaseY: number[] = [];
  private charContainer!: PIXI.Container;
  private prevText = '';
  private staggerY = 0;

  protected setup(): void {
    this.staggerY = this.config.staggerY ?? 18;
    this.charContainer = new PIXI.Container();
    this.charContainer.blendMode = this.config.blendMode ?? 'difference';
    this.container.addChild(this.charContainer);
  }

  private rebuildChars(text: string, cx: number, cy: number, screenW: number): void {
    this.charContainer.removeChildren().forEach(c => c.destroy());
    this.charTexts = [];
    this.charBaseY = [];

    const chars = [...text];
    if (chars.length === 0) return;

    const spreadFrac = this.config.charSpreadFrac ?? 0.5;
    const totalSpread = screenW * spreadFrac;
    const spacing = chars.length > 1 ? totalSpread / (chars.length - 1) : 0;
    const startX = cx - totalSpread / 2;
    const fontSize = this.config.fontSize ?? 52;
    const color = resolveColor(this.config.color ?? '#ffffff', this.palette);
    const fontFamily = this.config.fontFamily ?? '"Noto Serif JP", serif';

    for (let i = 0; i < chars.length; i++) {
      const ct = new PIXI.Text({
        text: chars[i],
        style: {
          fontFamily,
          fontSize,
          fontWeight: (this.config.fontWeight ?? '900') as PIXI.TextStyleFontWeight,
          fill: color,
        },
      });
      ct.anchor.set(0.5);
      ct.x = startX + i * spacing;
      const baseY = cy + (i % 2 === 0 ? -this.staggerY : this.staggerY);
      ct.y = baseY + 60;
      ct.alpha = 0;
      ct.scale.set(0);
      this.charContainer.addChild(ct);
      this.charTexts.push(ct);
      this.charBaseY.push(baseY);
    }
  }

  update(ctx: UpdateContext): void {
    const cx = ctx.screenWidth / 2;
    const cy = ctx.screenHeight / 2;

    if (ctx.currentText !== this.prevText) {
      this.prevText = ctx.currentText;
      this.rebuildChars(ctx.currentText, cx, cy, ctx.screenWidth);
    }

    const elapsed = ctx.segmentTime;
    for (let i = 0; i < this.charTexts.length; i++) {
      const delay = i * 0.15;
      const t = Math.max(0, elapsed - delay);

      const raw = Math.min(1, t * 3);
      const elastic = raw < 1
        ? raw * (1 + 0.4 * Math.sin(raw * Math.PI * 3) * (1 - raw))
        : 1;

      const yProgress = Math.min(1, t * 4);
      const yEased = 1 - (1 - yProgress) * (1 - yProgress);

      this.charTexts[i].alpha = Math.min(1, t * 5);
      this.charTexts[i].scale.set(elastic * 1.1);
      this.charTexts[i].y = this.charBaseY[i] + 60 * (1 - yEased);
      this.charTexts[i].rotation = (1 - Math.min(1, t * 2.5)) * 0.6 * (i % 2 === 0 ? 1 : -1);
    }
  }
}
