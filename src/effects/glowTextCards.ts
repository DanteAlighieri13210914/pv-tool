// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface CharCard {
  container: PIXI.Container;
  targetX: number;
  targetY: number;
  targetScale: number;
  delay: number;
}

/**
 * Displays each character of the current text as an individual card
 * with white background and outer glow, in a staggered grid layout.
 * Characters have varying sizes. Text fades in with a stagger delay.
 */
export class GlowTextCards extends BaseEffect {
  readonly name = 'glowTextCards';
  private cards: CharCard[] = [];
  private currentText = '';

  protected setup(): void {}

  private rebuild(text: string, ctx: UpdateContext): void {
    for (const c of this.cards) {
      this.container.removeChild(c.container);
      c.container.destroy({ children: true });
    }
    this.cards = [];
    this.currentText = text;

    if (!text || text.length === 0) return;

    const cardColor = this.config.cardColor ?? '#ffffff';
    const textColor = resolveColor(this.config.textColor ?? '#1a1a1a', this.palette);
    const glowAlpha = this.config.glowAlpha ?? 0.6;
    const fontFamily = this.config.fontFamily ?? '"Noto Serif JP", "Yu Mincho", serif';
    const baseFontSize = this.config.fontSize ?? 70;
    const charsPerRow = this.config.charsPerRow ?? 5;
    const sizeVariance = this.config.sizeVariance ?? 0.3;
    const staggerX = this.config.staggerX ?? 12;
    const staggerY = this.config.staggerY ?? 8;
    const cardPadding = this.config.cardPadding ?? 18;

    const rows: string[] = [];
    for (let i = 0; i < text.length; i += charsPerRow) {
      rows.push(text.slice(i, i + charsPerRow));
    }

    const cx = ctx.screenWidth * (this.config.x ?? 0.5);
    const cy = ctx.screenHeight * (this.config.y ?? 0.5);

    const totalRows = rows.length;
    let charIdx = 0;

    for (let row = 0; row < totalRows; row++) {
      const chars = rows[row];
      const totalCols = chars.length;

      for (let col = 0; col < totalCols; col++) {
        const char = chars[col];

        // Size variation: some characters are larger, some smaller
        const sizeFactor = 1 + (Math.sin(charIdx * 2.7 + 0.5) * sizeVariance);
        const fontSize = baseFontSize * sizeFactor;
        const size = fontSize + cardPadding * 2;

        const cardContainer = new PIXI.Container();

        // Glow layer (larger blurred white rectangle behind the card)
        const glowCanvas = document.createElement('canvas');
        const glowPad = 25;
        const glowW = size + glowPad * 2;
        const glowH = size + glowPad * 2;
        glowCanvas.width = glowW;
        glowCanvas.height = glowH;
        const gctx = glowCanvas.getContext('2d')!;

        // Draw a soft white glow
        const gradient = gctx.createRadialGradient(
          glowW / 2, glowH / 2, size * 0.3,
          glowW / 2, glowH / 2, glowW / 2,
        );
        gradient.addColorStop(0, `rgba(255,255,255,${glowAlpha})`);
        gradient.addColorStop(0.5, `rgba(200,220,255,${glowAlpha * 0.4})`);
        gradient.addColorStop(1, 'rgba(150,180,255,0)');
        gctx.fillStyle = gradient;
        gctx.fillRect(0, 0, glowW, glowH);

        const glowTex = PIXI.Texture.from(glowCanvas);
        const glowSprite = new PIXI.Sprite(glowTex);
        glowSprite.anchor.set(0.5);
        cardContainer.addChild(glowSprite);

        // White card background
        const bg = new PIXI.Graphics();
        bg.rect(-size / 2, -size / 2, size, size);
        bg.fill({ color: cardColor });
        cardContainer.addChild(bg);

        // Character text
        const style = new PIXI.TextStyle({
          fontFamily,
          fontSize,
          fontWeight: 'bold',
          fill: textColor,
        });
        const t = new PIXI.Text({ text: char, style });
        t.anchor.set(0.5);
        cardContainer.addChild(t);

        // Compute position: staggered grid centered on (cx, cy)
        const baseSize = baseFontSize + cardPadding * 2;
        const gap = baseSize * 0.08;
        const gridW = totalCols * (baseSize + gap);
        const gridH = totalRows * (baseSize + gap);
        const startX = cx - gridW / 2 + (baseSize + gap) / 2;
        const startY = cy - gridH / 2 + (baseSize + gap) / 2;

        const targetX = startX + col * (baseSize + gap) + (Math.sin(charIdx * 1.3) * staggerX);
        const targetY = startY + row * (baseSize + gap) + (Math.cos(charIdx * 1.7) * staggerY);
        const targetScale = 1.0;

        cardContainer.x = targetX;
        cardContainer.y = targetY;
        cardContainer.scale.set(0);
        cardContainer.alpha = 0;

        this.container.addChild(cardContainer);
        this.cards.push({
          container: cardContainer,
          targetX,
          targetY,
          targetScale,
          delay: charIdx * (this.config.staggerDelay ?? 0.06),
        });

        charIdx++;
      }
    }
  }

  update(ctx: UpdateContext): void {
    const text = ctx.currentText ?? this.config.text ?? '';

    if (text !== this.currentText) {
      this.rebuild(text, ctx);
    }

    const speed = ctx.animationSpeed;
    for (const card of this.cards) {
      const elapsed = (ctx.segmentTime - card.delay) * speed;
      if (elapsed < 0) {
        card.container.scale.set(0);
        card.container.alpha = 0;
        continue;
      }

      // Quick ease-in with overshoot
      const t = Math.min(elapsed * 3, 1);
      const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
      const overshoot = t < 1 ? 1 + Math.sin(t * Math.PI) * 0.05 : 1;

      card.container.scale.set(card.targetScale * ease * overshoot);
      card.container.alpha = Math.min(ease * 1.2, 1);

      // Subtle float
      const drift = ctx.motionIntensity * 2;
      card.container.x = card.targetX + Math.sin(ctx.time * 0.3 + card.delay * 10) * drift;
      card.container.y = card.targetY + Math.cos(ctx.time * 0.25 + card.delay * 8) * drift;
    }
  }

  destroy(): void {
    for (const c of this.cards) c.container.destroy({ children: true });
    this.cards = [];
    super.destroy();
  }
}