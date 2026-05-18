// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';
import { findGlyphShards } from '../core/ccl';

/**
 * ShatterText — splits each character into shards by 4-connected pixel
 * components (CCL) on the rasterized glyph. Multi-stroke glyphs whose
 * strokes are spatially disconnected (e.g. 林/森/二/明) split naturally
 * into per-component shards; closed glyphs (日/中/東) fly as a single
 * shard. Pieces animate from a scattered state into the assembled glyph
 * (or away, depending on mode).
 *
 * Each shard has its own random delay / duration / phase shift so the
 * gather animation never feels mechanically synchronized across the line.
 *
 * Phase ∈ [0, 1] is derived from segmentTime / time / beatIntensity so seek
 * and pause behaviour are correct without any internal accumulators.
 */

interface Shard {
  sprite: PIXI.Sprite;
  texture: PIXI.Texture;
  originX: number;
  originY: number;
  scatterX: number;
  scatterY: number;
  scatterRot: number;
  scatterScale: number;
  /** When this shard starts moving, as a fraction of gatherDuration (0..1) */
  delayFrac: number;
  /** Per-shard duration multiplier (e.g. 0.7..1.3) — randomizes finish times */
  durationMul: number;
  /** Phase offset for oscillate mode — desynchronizes per-shard sin */
  oscPhase: number;
}

const RENDER_PADDING = 8;

function hashUnit(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function hashSigned(seed: number): number {
  return hashUnit(seed) * 2 - 1;
}
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function easeOutCubic(p: number): number {
  const q = 1 - p;
  return 1 - q * q * q;
}

export class ShatterText extends BaseEffect {
  readonly name = 'shatterText';
  override readonly heavy = true;

  private shards: Shard[] = [];
  private builtForText = '';
  private builtForWidth = 0;
  private builtForHeight = 0;
  /** Per-build random salt — added to every per-shard hashUnit seed so
   *  re-selecting the same template (or repeating the same text segment)
   *  produces a fresh scatter / delay / oscillation pattern instead of
   *  the deterministic "same picture every time" behaviour. Refreshed at
   *  the top of every build(). Mirrors the buildSalt design in
   *  crayonShatter.ts. */
  private buildSalt = 0;

  protected setup(): void { /* no-op; lazy build on first update */ }

  private build(text: string, sw: number, sh: number): void {
    this.releaseShards();
    this.buildSalt = Math.floor(Math.random() * 1e6);

    this.builtForText = text;
    this.builtForWidth = sw;
    this.builtForHeight = sh;
    if (!text) return;

    const baseFontSize = this.config.fontSize ?? 120;
    const fontFamily = this.config.fontFamily ?? '"Noto Serif JP", "Yu Mincho", serif';
    const fontWeight = String(this.config.fontWeight ?? '900');
    const color = resolveColor(this.config.color ?? '$text', this.palette);
    const alphaThreshold = this.config.alphaThreshold ?? 128;
    const minAreaFrac = this.config.minAreaFrac ?? 0.001;
    const preErosionIters = Math.max(0, this.config.preErosionIters ?? 0);
    const charSpacingFrac = this.config.charSpacingFrac ?? 1.05;
    const scatterRadiusFrac = this.config.scatterRadiusFrac ?? 0.3;
    const scatterScaleMin = this.config.scatterScaleMin ?? 0.4;
    const staggerDelayPerChar = this.config.staggerDelay ?? 0.05;
    const randomDelayRange = this.config.randomDelayRange ?? 0.35;
    const durationVariation = this.config.durationVariation ?? 0.5;
    const dpr = this.renderer?.resolution ?? 1;

    const chars = [...text];
    const cy = sh * (this.config.y ?? 0.5);
    const horizontalMargin = this.config.fitMarginX ?? 0.86;
    const verticalMargin = this.config.fitMarginY ?? 0.75;
    const maxByWidth = chars.length > 1
      ? (sw * horizontalMargin) / ((chars.length - 1) * charSpacingFrac + 1)
      : sw * horizontalMargin;
    const maxByHeight = Math.max(24, Math.min(cy, sh - cy) * 2 * verticalMargin);
    const minFontSize = this.config.minFontSize ?? 24;
    const fontSize = Math.max(minFontSize, Math.min(baseFontSize, maxByWidth, maxByHeight));
    const charSpacing = charSpacingFrac * fontSize;
    const totalWidth = (chars.length - 1) * charSpacing;
    const startX = sw / 2 - totalWidth / 2;

    const cellPx = Math.ceil(fontSize * dpr) + Math.ceil(RENDER_PADDING * dpr) * 2;
    const minAreaPx = Math.max(4, Math.floor(fontSize * fontSize * minAreaFrac * dpr * dpr));
    const scatterRadius = Math.min(sw, sh) * scatterRadiusFrac;

    for (let ci = 0; ci < chars.length; ci++) {
      const char = chars[ci];
      const charCenterX = startX + ci * charSpacing;

      const off = document.createElement('canvas');
      off.width = cellPx;
      off.height = cellPx;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;
      ctx.font = `${fontWeight} ${Math.ceil(fontSize * dpr)}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, cellPx / 2, cellPx / 2);

      const imageData = ctx.getImageData(0, 0, cellPx, cellPx);
      const components = findGlyphShards(imageData.data, cellPx, cellPx, alphaThreshold, preErosionIters)
        .filter(c => c.area >= minAreaPx);
      if (components.length === 0) continue;

      const src = imageData.data;
      for (let si = 0; si < components.length; si++) {
        const comp = components[si];
        const sw2 = comp.maxX - comp.minX + 1;
        const sh2 = comp.maxY - comp.minY + 1;
        if (sw2 <= 0 || sh2 <= 0) continue;

        const shardCanvas = document.createElement('canvas');
        shardCanvas.width = sw2;
        shardCanvas.height = sh2;
        const sctx = shardCanvas.getContext('2d');
        if (!sctx) continue;

        const compImg = sctx.createImageData(sw2, sh2);
        for (const offIdx of comp.pixels) {
          const px = offIdx % cellPx;
          const py = (offIdx - px) / cellPx;
          const dx = px - comp.minX;
          const dy = py - comp.minY;
          const di = (dy * sw2 + dx) * 4;
          const sj = offIdx * 4;
          compImg.data[di] = src[sj];
          compImg.data[di + 1] = src[sj + 1];
          compImg.data[di + 2] = src[sj + 2];
          compImg.data[di + 3] = src[sj + 3];
        }
        sctx.putImageData(compImg, 0, 0);

        this.pushShard(
          shardCanvas, ci, si, cellPx, charCenterX, cy,
          comp.minX, comp.minY, comp.maxX, comp.maxY,
          dpr, scatterRadius, scatterScaleMin,
          staggerDelayPerChar, randomDelayRange, durationVariation,
        );
      }
    }
  }

  private pushShard(
    shardCanvas: HTMLCanvasElement,
    charIndex: number,
    shardIndex: number,
    cellPx: number,
    charCenterX: number,
    charCenterY: number,
    minX: number, minY: number, maxX: number, maxY: number,
    dpr: number,
    scatterRadius: number,
    scatterScaleMin: number,
    staggerDelayPerChar: number,
    randomDelayRange: number,
    durationVariation: number,
  ): void {
    const texture = PIXI.Texture.from(shardCanvas);
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);

    const shardCenterPx = (minX + maxX + 1) / 2;
    const shardCenterPy = (minY + maxY + 1) / 2;
    const offsetXLogical = (shardCenterPx - cellPx / 2) / dpr;
    const offsetYLogical = (shardCenterPy - cellPx / 2) / dpr;
    const originX = charCenterX + offsetXLogical;
    const originY = charCenterY + offsetYLogical;

    const seed = charIndex * 1009 + shardIndex * 31 + 17 + this.buildSalt;
    const angle = hashUnit(seed * 7 + 1) * Math.PI * 2;
    const dist = (0.5 + hashUnit(seed * 13 + 3) * 0.5) * scatterRadius;
    const scatterX = originX + Math.cos(angle) * dist;
    const scatterY = originY + Math.sin(angle) * dist;
    const scatterRot = hashSigned(seed * 19 + 5) * Math.PI;
    const scatterScale = scatterScaleMin + hashUnit(seed * 23 + 7) * (1 - scatterScaleMin);

    // Per-shard timing randomness — breaks mechanical sync across the line.
    const baseDelay = clamp01(charIndex * staggerDelayPerChar);
    const jitterDelay = hashUnit(seed * 31 + 11) * randomDelayRange;
    const delayFrac = clamp01(baseDelay + jitterDelay);
    const durationMul = 1 + hashSigned(seed * 37 + 13) * durationVariation;
    const oscPhase = hashUnit(seed * 41 + 19) * Math.PI * 2;

    this.shards.push({
      sprite, texture,
      originX, originY,
      scatterX, scatterY,
      scatterRot, scatterScale,
      delayFrac, durationMul, oscPhase,
    });
    this.container.addChild(sprite);
  }

  private releaseShards(): void {
    for (const s of this.shards) {
      try { this.container.removeChild(s.sprite); } catch { /* gone */ }
      try { s.sprite.destroy(); } catch { /* gone */ }
      try { s.texture.destroy(true); } catch { /* gone */ }
    }
    this.shards = [];
  }

  update(ctx: UpdateContext): void {
    const text = ctx.currentText ?? '';
    if (text !== this.builtForText
        || ctx.screenWidth !== this.builtForWidth
        || ctx.screenHeight !== this.builtForHeight) {
      this.build(text, ctx.screenWidth, ctx.screenHeight);
    }
    if (this.shards.length === 0) return;

    const mode = this.config.mode ?? 'gather';
    const speed = ctx.animationSpeed;
    const dpr = this.renderer?.resolution ?? 1;

    const gatherDuration = Math.max(0.05, this.config.gatherDuration ?? 0.8);
    const oscillateFreq = this.config.oscillateFreq ?? 0.3;
    const oscillateAmount = this.config.oscillateAmount ?? 0.08;
    const beatDispersion = this.config.beatDispersion ?? 0.6;

    for (const s of this.shards) {
      let t: number;
      if (mode === 'oscillate') {
        // Each shard sins on its own phase so the line never breathes in unison.
        const phase = 1 - Math.abs(
          Math.sin(ctx.time * oscillateFreq * speed * Math.PI * 2 + s.oscPhase),
        ) * oscillateAmount;
        t = clamp01(phase);
      } else if (mode === 'beatPulse') {
        // Beat dispersion is global; per-shard durationMul still differentiates settle time.
        const phase = clamp01(1 - ctx.beatIntensity * beatDispersion);
        t = clamp01(phase);
      } else {
        // gather — per-shard effective duration & delay
        const effDuration = Math.max(0.05, gatherDuration * s.durationMul);
        const localStart = s.delayFrac * gatherDuration;
        const elapsed = (ctx.segmentTime * speed) - localStart;
        t = clamp01(elapsed / effDuration);
      }
      const eased = easeOutCubic(t);
      s.sprite.x = lerp(s.scatterX, s.originX, eased);
      s.sprite.y = lerp(s.scatterY, s.originY, eased);
      s.sprite.rotation = lerp(s.scatterRot, 0, eased);
      const scaleMul = lerp(s.scatterScale, 1, eased) / dpr;
      s.sprite.scale.set(scaleMul);
      s.sprite.alpha = clamp01(eased * 3);
    }
  }

  destroy(): void {
    this.releaseShards();
    super.destroy();
  }
}
