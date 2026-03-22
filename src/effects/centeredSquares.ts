// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface SquareLayer {
  container: PIXI.Container;
  phaseOffset: number;
  rotSpeed: number;
  scalePhase: number;
}

export class CenteredSquares extends BaseEffect {
  readonly name = 'centeredSquares';
  private layers: SquareLayer[] = [];
  private charTexts: PIXI.Text[] = [];
  private charBaseY: number[] = [];
  private charContainer!: PIXI.Container;
  private prevText = '';
  private textChangeTime = -10;
  private staggerY = 0;

  protected setup(): void {
    const outerSize = this.config.outerSize ?? 300;
    const midSize = this.config.midSize ?? 220;
    const innerSize = this.config.innerSize ?? 160;
    const borderColor = resolveColor(this.config.borderColor ?? '$primary', this.palette);
    const midColor = resolveColor(this.config.midColor ?? '$primary', this.palette);
    const innerColor = resolveColor(this.config.innerColor ?? '$secondary', this.palette);

    this.staggerY = this.config.staggerY ?? 18;

    // Layer 0: outer frame — no fill, irregular border widths
    const outerC = new PIXI.Container();
    const outerG = new PIXI.Graphics();
    const ho = outerSize / 2;
    outerG.moveTo(-ho, -ho).lineTo(ho, -ho);
    outerG.stroke({ color: borderColor, width: 4, alpha: 0.75 });
    outerG.moveTo(ho, -ho).lineTo(ho, ho);
    outerG.stroke({ color: borderColor, width: 1.5, alpha: 0.45 });
    outerG.moveTo(ho, ho).lineTo(-ho, ho);
    outerG.stroke({ color: borderColor, width: 2.8, alpha: 0.6 });
    outerG.moveTo(-ho, ho).lineTo(-ho, -ho);
    outerG.stroke({ color: borderColor, width: 5, alpha: 0.8 });
    outerC.addChild(outerG);
    this.container.addChild(outerC);
    this.layers.push({ container: outerC, phaseOffset: 0, rotSpeed: 0.7, scalePhase: 0 });

    // Layer 1: mid — black solid diamond
    const midC = new PIXI.Container();
    const midG = new PIXI.Graphics();
    const hm = midSize / 2;
    midG.rect(-hm, -hm, midSize, midSize);
    midG.fill({ color: midColor, alpha: 1 });
    midC.addChild(midG);
    this.container.addChild(midC);
    this.layers.push({ container: midC, phaseOffset: 1.0, rotSpeed: 0.55, scalePhase: 1.2 });

    // Layer 2: inner — white solid diamond
    const innerC = new PIXI.Container();
    const innerG = new PIXI.Graphics();
    const hi = innerSize / 2;
    innerG.rect(-hi, -hi, innerSize, innerSize);
    innerG.fill({ color: innerColor, alpha: 1 });
    innerC.addChild(innerG);
    this.container.addChild(innerC);
    this.layers.push({ container: innerC, phaseOffset: 2.0, rotSpeed: 0.4, scalePhase: 2.4 });

    // Character container — difference blend for auto color inversion
    this.charContainer = new PIXI.Container();
    this.charContainer.blendMode = 'difference';
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
    const fontFamily = this.config.fontFamily ?? '"Noto Serif JP", serif';

    for (let i = 0; i < chars.length; i++) {
      const ct = new PIXI.Text({
        text: chars[i],
        style: {
          fontFamily,
          fontSize,
          fontWeight: '900' as PIXI.TextStyleFontWeight,
          fill: '#ffffff',
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
    const speed = ctx.animationSpeed;
    const intensity = ctx.motionIntensity;

    for (const layer of this.layers) {
      layer.container.x = cx;
      layer.container.y = cy;

      const rot = ctx.time * layer.rotSpeed * speed;
      layer.container.rotation = rot;

      const scalePulse = 0.75 + Math.abs(Math.sin(ctx.time * 0.4 * speed + layer.scalePhase)) * 0.55 * intensity;
      layer.container.scale.set(scalePulse);
    }

    if (ctx.currentText !== this.prevText) {
      this.prevText = ctx.currentText;
      this.textChangeTime = ctx.time;
      this.rebuildChars(ctx.currentText, cx, cy, ctx.screenWidth);
    }

    const elapsed = ctx.time - this.textChangeTime;
    for (let i = 0; i < this.charTexts.length; i++) {
      const delay = i * 0.15;
      const t = Math.max(0, elapsed - delay);

      // Scale: elastic overshoot
      const raw = Math.min(1, t * 3);
      const elastic = raw < 1
        ? raw * (1 + 0.4 * Math.sin(raw * Math.PI * 3) * (1 - raw))
        : 1;

      // Y: fly up from below
      const yProgress = Math.min(1, t * 4);
      const yEased = 1 - (1 - yProgress) * (1 - yProgress);

      this.charTexts[i].alpha = Math.min(1, t * 5);
      this.charTexts[i].scale.set(elastic * 1.1);
      this.charTexts[i].y = this.charBaseY[i] + 60 * (1 - yEased);
      this.charTexts[i].rotation = (1 - Math.min(1, t * 2.5)) * 0.6 * (i % 2 === 0 ? 1 : -1);
    }
  }
}