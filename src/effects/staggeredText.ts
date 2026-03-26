// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

type LayoutMode = 'diag-left' | 'diag-right' | 'vert-center' | 'vert-framed' | 'horiz-wide';

const MODES: LayoutMode[] = ['diag-left', 'diag-right', 'vert-center', 'vert-framed', 'horiz-wide'];

interface CharSlot {
  char: string;
  targetX: number;
  targetY: number;
  fontSize: number;
  rotation: number;
}

/**
 * Cycles through 5 text layout modes on a timer:
 *   1. diag-left:   diagonal staggered, left side
 *   2. diag-right:  diagonal staggered, right side
 *   3. vert-center: vertical column, centered
 *   4. vert-framed: vertical column, centered, white border frame
 *   5. horiz-wide:  horizontal, large letter spacing, centered
 */
export class StaggeredText extends BaseEffect {
  readonly name = 'staggeredText';
  private textContainer!: PIXI.Container;
  private frameGraphics!: PIXI.Graphics;
  private chars: PIXI.Text[] = [];
  private currentText = '';
  private currentMode: LayoutMode = 'diag-left';
  private modeIndex = 0;

  protected setup(): void {
    this.frameGraphics = new PIXI.Graphics();
    this.container.addChild(this.frameGraphics);
    this.textContainer = new PIXI.Container();
    this.container.addChild(this.textContainer);
  }

  private computeSlots(
    text: string, mode: LayoutMode, w: number, h: number,
  ): CharSlot[] {
    const chars = [...text];
    const baseFontSize = this.config.fontSize ?? 64;
    const slots: CharSlot[] = [];

    switch (mode) {
      case 'diag-left': {
        const startX = w * 0.12;
        const startY = h * 0.15;
        const stepX = baseFontSize * 0.4;
        const stepY = baseFontSize * 1.3;
        for (let i = 0; i < chars.length; i++) {
          const sizeVar = 0.7 + Math.sin(i * 2.3) * 0.4;
          const jitterX = Math.sin(i * 3.7) * baseFontSize * 0.3;
          const jitterY = Math.cos(i * 2.1) * baseFontSize * 0.15;
          slots.push({
            char: chars[i],
            targetX: startX + i * stepX + jitterX,
            targetY: startY + i * stepY + jitterY,
            fontSize: baseFontSize * sizeVar,
            rotation: -0.15 + Math.sin(i * 1.7) * 0.1,
          });
        }
        break;
      }

      case 'diag-right': {
        const startX = w * 0.88;
        const startY = h * 0.15;
        const stepX = -baseFontSize * 0.4;
        const stepY = baseFontSize * 1.3;
        for (let i = 0; i < chars.length; i++) {
          const sizeVar = 0.7 + Math.cos(i * 2.3) * 0.4;
          const jitterX = Math.cos(i * 3.7) * baseFontSize * 0.3;
          const jitterY = Math.sin(i * 2.1) * baseFontSize * 0.15;
          slots.push({
            char: chars[i],
            targetX: startX + i * stepX + jitterX,
            targetY: startY + i * stepY + jitterY,
            fontSize: baseFontSize * sizeVar,
            rotation: 0.15 + Math.cos(i * 1.7) * 0.1,
          });
        }
        break;
      }

      case 'vert-center':
      case 'vert-framed': {
        const colChars = this.config.colChars ?? 5;
        const cols = Math.ceil(chars.length / colChars);
        const gap = baseFontSize * 1.4;
        const colGap = baseFontSize * 1.3;
        const totalW = (cols - 1) * colGap;
        const totalH = (Math.min(chars.length, colChars) - 1) * gap;
        const ox = w / 2 + totalW / 2;
        const oy = h / 2 - totalH / 2;

        for (let i = 0; i < chars.length; i++) {
          const col = Math.floor(i / colChars);
          const row = i % colChars;
          slots.push({
            char: chars[i],
            targetX: ox - col * colGap,
            targetY: oy + row * gap,
            fontSize: baseFontSize,
            rotation: 0,
          });
        }
        break;
      }

      case 'horiz-wide': {
        const spacing = baseFontSize * 2.2;
        const totalW = (chars.length - 1) * spacing;
        const startX = (w - totalW) / 2;
        const cy = h / 2;
        for (let i = 0; i < chars.length; i++) {
          slots.push({
            char: chars[i],
            targetX: startX + i * spacing,
            targetY: cy,
            fontSize: baseFontSize * 0.95,
            rotation: 0,
          });
        }
        break;
      }
    }

    return slots;
  }

  private drawFrame(
    mode: LayoutMode, slots: CharSlot[], _w: number, _h: number, alpha: number,
  ): void {
    this.frameGraphics.clear();
    if (mode !== 'vert-framed' || slots.length === 0 || alpha < 0.01) return;

    const frameColor = resolveColor(this.config.frameColor ?? '#ffffff', this.palette);
    const frameAlpha = (this.config.frameAlpha ?? 0.6) * alpha;
    const pad = (this.config.framePadding ?? 30);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of slots) {
      minX = Math.min(minX, s.targetX - s.fontSize * 0.5);
      maxX = Math.max(maxX, s.targetX + s.fontSize * 0.5);
      minY = Math.min(minY, s.targetY - s.fontSize * 0.5);
      maxY = Math.max(maxY, s.targetY + s.fontSize * 0.5);
    }

    this.frameGraphics.rect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
    this.frameGraphics.stroke({ color: frameColor, width: 1.5, alpha: frameAlpha });
  }

  update(ctx: UpdateContext): void {
    const text = ctx.currentText ?? this.config.text ?? '';
    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    const modeDuration = this.config.modeDuration ?? 3;
    const color = resolveColor(this.config.color ?? '#ffffff', this.palette);
    const fontFamily = this.config.fontFamily ?? '"Noto Serif JP", "Yu Mincho", serif';
    const transitionDuration = this.config.transition ?? 0.4;

    // Cycle through modes based on segmentTime
    this.modeIndex = Math.floor(ctx.segmentTime / modeDuration) % MODES.length;
    this.currentMode = MODES[this.modeIndex];
    const modeElapsed = ctx.segmentTime % modeDuration;
    const fadeIn = Math.min(1, modeElapsed / transitionDuration);
    const fadeOut = Math.min(1, (modeDuration - modeElapsed) / transitionDuration);
    const alpha = Math.min(fadeIn, fadeOut);

    // Rebuild text objects if text changed
    if (text !== this.currentText) {
      this.currentText = text;
      for (const c of this.chars) {
        this.textContainer.removeChild(c);
        c.destroy();
      }
      this.chars = [];

      const chars = [...text];
      for (const char of chars) {
        const t = new PIXI.Text({
          text: char,
          style: new PIXI.TextStyle({
            fontFamily,
            fontSize: 64,
            fontWeight: 'bold',
            fill: color,
          }),
        });
        t.anchor.set(0.5);
        this.textContainer.addChild(t);
        this.chars.push(t);
      }
    }

    // Compute slots for current mode
    const slots = this.computeSlots(text, this.currentMode, w, h);

    // Animate characters toward their target positions
    const speed = ctx.animationSpeed;
    const motion = ctx.motionIntensity;

    for (let i = 0; i < this.chars.length && i < slots.length; i++) {
      const t = this.chars[i];
      const s = slots[i];

      // Stagger reveal: each char fades in slightly after the previous
      const charDelay = i * 0.04;
      const charAlpha = Math.max(0, Math.min(1, (modeElapsed - charDelay) * speed * 3));

      t.style.fontSize = s.fontSize;
      t.style.fill = color;

      // Smooth lerp to target
      const lerp = Math.min(1, 0.08 * speed * 60);
      t.x += (s.targetX - t.x) * lerp;
      t.y += (s.targetY - t.y) * lerp;
      t.rotation += (s.rotation - t.rotation) * lerp;

      // Subtle drift
      const drift = motion * 1.5;
      t.x += Math.sin(ctx.time * 0.4 + i * 1.3) * drift;
      t.y += Math.cos(ctx.time * 0.35 + i * 0.9) * drift;

      t.alpha = alpha * charAlpha;
    }

    // Hide excess chars
    for (let i = slots.length; i < this.chars.length; i++) {
      this.chars[i].alpha = 0;
    }

    // Draw frame for vert-framed mode
    this.drawFrame(this.currentMode, slots, w, h, alpha);
  }

  destroy(): void {
    for (const c of this.chars) c.destroy();
    this.chars = [];
    super.destroy();
  }
}
