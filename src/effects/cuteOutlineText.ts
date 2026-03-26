// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * 可爱描边文字效果 - 粉色填充 + 白色描边
 */
export class CuteOutlineText extends BaseEffect {
  readonly name = 'cuteOutlineText';
  private textObj!: PIXI.Text;
  private displayedText = '';
  private pendingText = '';
  private textAlpha = 1;
  private fadeState: 'idle' | 'fadeOut' | 'fadeIn' = 'idle';

  protected setup(): void {
    const text = this.config._userText ?? this.config.text ?? '';
    const fontSize = this.config.fontSize ?? 80;
    const fontFamily = this.config.fontFamily ?? '"Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif';
    const fillColor = resolveColor(this.config.fillColor ?? '#fab2b5', this.palette);
    const strokeColor = resolveColor(this.config.strokeColor ?? '#ffffff', this.palette);
    const strokeWidth = this.config.strokeWidth ?? 8;

    const style = new PIXI.TextStyle({
      fontFamily,
      fontSize,
      fontWeight: this.config.fontWeight ?? '900',
      fill: fillColor,
      stroke: { color: strokeColor, width: strokeWidth },
      letterSpacing: this.config.letterSpacing ?? 4,
    });

    this.textObj = new PIXI.Text({ text, style });
    this.textObj.anchor.set(0.5);
    this.displayedText = text;

    this.container.addChild(this.textObj);
  }

  update(ctx: UpdateContext): void {
    const newText = ctx.currentText ?? this.config.text ?? '';

    // 文字切换淡入淡出效果
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

    // 位置
    const px = this.config.x ?? 0.5;
    const py = this.config.y ?? 0.5;
    this.textObj.x = px * ctx.screenWidth;
    this.textObj.y = py * ctx.screenHeight;

    // 呼吸动画 + 节拍反应
    const speed = (this.config.animationSpeed ?? 0.5) * ctx.animationSpeed;
    const amount = (this.config.animationAmount ?? 0.02) * ctx.motionIntensity;
    const beatPulse = ctx.beatIntensity * 0.05;
    const scale = 1 + Math.sin(ctx.time * speed * Math.PI * 2) * amount + beatPulse;
    this.textObj.scale.set(scale);
  }
}
