// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface CharItem {
  text: PIXI.Text;
  targetX: number;
  targetY: number;
  delay: number;
  appeared: boolean;
}

export class BigOutlineText extends BaseEffect {
  readonly name = 'bigOutlineText';
  private chars: CharItem[] = [];
  private built = false;
  private lastText = '';

  protected setup(): void {}

  private build(text: string, sw: number, sh: number): void {
    if (this.built && text === this.lastText) return;

    for (const c of this.chars) c.text.destroy();
    this.chars = [];
    this.container.removeChildren();
    this.built = true;
    this.lastText = text;

    if (!text) return;

    const fillColor = resolveColor(this.config.color ?? '#e0e0e0', this.palette);
    const strokeColor = resolveColor(this.config.strokeColor ?? '#ffffff', this.palette);
    const fontFamily = this.config.fontFamily ?? '"Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif';
    const baseFontSize = this.config.fontSize ?? 0;

    const charArr = text.split('');
    const count = charArr.length;

    const fontSize = baseFontSize > 0
      ? baseFontSize
      : Math.min(sh * 0.35, sw / Math.max(count, 1) * 0.7);

    const staggerDelay = this.config.staggerDelay ?? 0.15;
    const spacingFrac = this.config.spacingFrac ?? 1.3;
    const staggerY = this.config.staggerY ?? (fontSize * 0.25);

    const spacing = fontSize * spacingFrac;
    const totalWidth = (count - 1) * spacing;
    const startX = (sw - totalWidth) / 2;

    for (let i = 0; i < count; i++) {
      const style = new PIXI.TextStyle({
        fontFamily,
        fontSize,
        fill: fillColor,
        fontWeight: '900',
        stroke: { color: strokeColor, width: Math.max(3, fontSize * 0.03) },
      });

      const t = new PIXI.Text({ text: charArr[i], style });
      t.anchor.set(0.5);

      const tx = startX + i * spacing;
      const ty = sh / 2 + (i % 2 === 0 ? -1 : 1) * staggerY;

      t.x = tx;
      t.y = ty + 80;
      t.alpha = 0;
      t.scale.set(0);

      this.chars.push({
        text: t,
        targetX: tx,
        targetY: ty,
        delay: i * staggerDelay,
        appeared: false,
      });

      this.container.addChild(t);
    }
  }

  update(ctx: UpdateContext): void {
    this.build(ctx.currentText, ctx.screenWidth, ctx.screenHeight);

    const spd = ctx.animationSpeed;

    for (const c of this.chars) {
      const t = Math.max(0, ctx.segmentTime * spd * 2.5 - c.delay * spd);

      if (t <= 0) {
        c.text.alpha = 0;
        c.text.scale.set(0);
        continue;
      }

      const progress = Math.min(1, t / 0.6);

      // Elastic ease-out
      const p = progress;
      const elastic = p === 0 ? 0 : p === 1 ? 1
        : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1;

      const beatPulse = ctx.beatIntensity * 0.06;
      c.text.alpha = Math.min(1, t * 3);
      c.text.scale.set(elastic * 1.05 + beatPulse);
      c.text.y = c.targetY + 80 * (1 - elastic);
      c.text.rotation = (1 - elastic) * 0.4 * (c.delay % 2 === 0 ? 1 : -1);
    }
  }
}