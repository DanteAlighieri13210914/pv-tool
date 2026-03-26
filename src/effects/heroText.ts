// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

export class HeroText extends BaseEffect {
  readonly name = 'heroText';
  private textObj!: PIXI.Text;
  private initialRotation = 0;

  private displayedText = '';
  private pendingText = '';
  private textAlpha = 1;
  private fadeState: 'idle' | 'fadeOut' | 'fadeIn' = 'idle';

  protected setup(): void {
    const text = this.config._userText ?? this.config.text ?? '';
    const fontSize = this.config.fontSize ?? 120;
    const fontFamily = this.config.fontFamily ?? '"Noto Serif JP", "Yu Mincho", "MS Mincho", serif';
    const color = resolveColor(this.config.color ?? '$text', this.palette);

    const style = new PIXI.TextStyle({
      fontFamily,
      fontSize,
      fontWeight: this.config.fontWeight ?? 'bold',
      fill: color,
      letterSpacing: this.config.letterSpacing ?? 8,
    });

    this.textObj = new PIXI.Text({ text, style });
    this.textObj.anchor.set(0.5);
    this.displayedText = text;

    this.initialRotation = (this.config.rotation ?? 0) * Math.PI / 180;
    this.textObj.rotation = this.initialRotation;

    this.container.addChild(this.textObj);
  }

  update(ctx: UpdateContext): void {
    const newText = ctx.currentText ?? this.config.text ?? '';

    if (newText !== this.displayedText && this.fadeState === 'idle') {
      if (ctx.deltaTime === 0) {
        this.textObj.text = newText;
        this.displayedText = newText;
        this.textAlpha = 1;
      } else {
        this.pendingText = newText;
        this.fadeState = 'fadeOut';
      }
    }

    const fadeSpeed = 4 * Math.max(ctx.animationSpeed, 0.5);
    if (this.fadeState === 'fadeOut') {
      this.textAlpha -= ctx.deltaTime * fadeSpeed;
      if (this.textAlpha <= 0) {
        this.textAlpha = 0;
        this.textObj.text = this.pendingText;
        this.displayedText = this.pendingText;
        this.fadeState = 'fadeIn';
      }
    } else if (this.fadeState === 'fadeIn') {
      this.textAlpha += ctx.deltaTime * fadeSpeed;
      if (this.textAlpha >= 1) {
        this.textAlpha = 1;
        this.fadeState = 'idle';
      }
    }
    this.textObj.alpha = this.textAlpha;

    const px = this.config.x ?? 0.5;
    const py = this.config.y ?? 0.5;
    this.textObj.x = px * ctx.screenWidth;
    this.textObj.y = py * ctx.screenHeight;

    const animation = this.config.animation ?? 'breathe';
    if (animation === 'breathe') {
      const speed = (this.config.animationSpeed ?? 0.5) * ctx.animationSpeed;
      const amount = (this.config.animationAmount ?? 0.03) * ctx.motionIntensity;
      const beatPulse = ctx.beatIntensity * 0.08;
      const scale = 1 + Math.sin(ctx.time * speed * Math.PI * 2) * amount + beatPulse;
      this.textObj.scale.set(scale);
    } else if (animation === 'rotate') {
      const rotSpeed = (this.config.rotationSpeed ?? 0.1) * ctx.animationSpeed;
      this.textObj.rotation = this.initialRotation + ctx.time * rotSpeed;
    }
  }
}