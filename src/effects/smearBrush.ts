// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface Stroke {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  color: string;
  alpha: number;
  speed: number;
  phase: number;
  type: 'smear' | 'scrape' | 'wash';
}

/**
 * Large-area paint smear / scrape brush strokes overlay.
 * Simulates oil painting knife textures, rough brush drags, and wash effects.
 * Each stroke is rendered as clusters of offset sub-strokes for a textured feel.
 */
export class SmearBrush extends BaseEffect {
  readonly name = 'smearBrush';
  override readonly heavy = true;
  private g!: PIXI.Graphics;
  private strokes: Stroke[] = [];
  private noiseCanvas!: HTMLCanvasElement;
  private noiseSprite!: PIXI.TilingSprite;

  protected setup(): void {
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);

    // Noise texture overlay for grain within strokes
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = 256;
    this.noiseCanvas.height = 256;
    this.generateNoiseTexture();
    const tex = PIXI.Texture.from(this.noiseCanvas);
    this.noiseSprite = new PIXI.TilingSprite({ texture: tex, width: 1920, height: 1080 });
    this.noiseSprite.alpha = this.config.grainAlpha ?? 0.04;
    this.noiseSprite.blendMode = 'multiply';
    this.container.addChild(this.noiseSprite);
  }

  private generateNoiseTexture(): void {
    const ctx = this.noiseCanvas.getContext('2d')!;
    const w = this.noiseCanvas.width;
    const h = this.noiseCanvas.height;
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 180 + Math.random() * 75;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  private ensureStrokes(w: number, h: number): void {
    const count = this.config.count ?? 8;
    if (this.strokes.length === count) return;

    const colors = this.config.colors ?? [
      this.palette.primary,
      this.palette.secondary,
      this.palette.accent,
    ];

    this.strokes = [];
    for (let i = 0; i < count; i++) {
      const types: Stroke['type'][] = ['smear', 'smear', 'scrape', 'wash'];
      const type = types[Math.floor(Math.random() * types.length)];

      let length: number, width: number, alpha: number;
      switch (type) {
        case 'smear':
          length = w * (0.3 + Math.random() * 0.6);
          width = 20 + Math.random() * 80;
          alpha = 0.06 + Math.random() * 0.15;
          break;
        case 'scrape':
          length = w * (0.2 + Math.random() * 0.5);
          width = 3 + Math.random() * 10;
          alpha = 0.1 + Math.random() * 0.2;
          break;
        case 'wash':
          length = w * (0.5 + Math.random() * 0.5);
          width = 60 + Math.random() * 150;
          alpha = 0.03 + Math.random() * 0.08;
          break;
      }

      this.strokes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        angle: (Math.random() - 0.5) * 0.6 + (Math.random() < 0.3 ? Math.PI / 2 : 0),
        length,
        width,
        color: resolveColor(colors[Math.floor(Math.random() * colors.length)], this.palette),
        alpha,
        speed: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        type,
      });
    }
  }

  update(ctx: UpdateContext): void {
    const g = this.g;
    g.clear();

    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    this.ensureStrokes(w, h);

    this.noiseSprite.width = w;
    this.noiseSprite.height = h;

    const time = ctx.time * ctx.animationSpeed;

    for (const stroke of this.strokes) {
      const breathe = Math.sin(time * stroke.speed + stroke.phase) * 0.3 + 0.7;
      const currentAlpha = stroke.alpha * breathe;

      switch (stroke.type) {
        case 'smear':
          this.drawSmear(g, stroke, currentAlpha, time);
          break;
        case 'scrape':
          this.drawScrape(g, stroke, currentAlpha, time);
          break;
        case 'wash':
          this.drawWash(g, stroke, currentAlpha, time);
          break;
      }
    }
  }

  /** Broad, thick smear — simulates palette knife drag */
  private drawSmear(g: PIXI.Graphics, s: Stroke, alpha: number, time: number): void {
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const subStrokes = 6 + Math.floor(s.width / 12);
    const perpX = -sin;
    const perpY = cos;

    for (let i = 0; i < subStrokes; i++) {
      const frac = (i / subStrokes - 0.5) * 2;
      const offsetDist = frac * s.width * 0.5;
      const jitterX = (this.noise1d(i * 7.3 + time * 0.1) - 0.5) * s.width * 0.15;
      const jitterY = (this.noise1d(i * 13.7 + time * 0.1) - 0.5) * s.width * 0.1;

      const sx = s.x + perpX * offsetDist + jitterX;
      const sy = s.y + perpY * offsetDist + jitterY;
      const ex = sx + cos * s.length * (0.7 + Math.random() * 0.3);
      const ey = sy + sin * s.length * (0.7 + Math.random() * 0.3);

      const edgeFade = 1 - Math.abs(frac) * 0.6;
      const subWidth = 2 + Math.random() * 4;

      g.moveTo(sx, sy).lineTo(ex, ey);
      g.stroke({ color: s.color, width: subWidth, alpha: alpha * edgeFade });
    }
  }

  /** Thin scrape line — like a palette knife edge or scratch */
  private drawScrape(g: PIXI.Graphics, s: Stroke, alpha: number, _time: number): void {
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);

    const segments = 20;
    g.moveTo(s.x, s.y);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = s.x + cos * s.length * t + (this.noise1d(i * 5.1) - 0.5) * 4;
      const py = s.y + sin * s.length * t + (this.noise1d(i * 9.3) - 0.5) * 3;
      g.lineTo(px, py);
    }
    g.stroke({ color: s.color, width: s.width, alpha });

    // Ghost double line
    g.moveTo(s.x + 2, s.y + 1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = s.x + 2 + cos * s.length * t + (this.noise1d(i * 5.1 + 100) - 0.5) * 6;
      const py = s.y + 1 + sin * s.length * t + (this.noise1d(i * 9.3 + 100) - 0.5) * 4;
      g.lineTo(px, py);
    }
    g.stroke({ color: s.color, width: Math.max(1, s.width * 0.4), alpha: alpha * 0.4 });
  }

  /** Large translucent wash — watercolor-like broad area */
  private drawWash(g: PIXI.Graphics, s: Stroke, alpha: number, _time: number): void {
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const perpX = -sin;
    const perpY = cos;
    const hw = s.width * 0.5;

    // Build a rough quadrilateral with wobbly edges
    const topPts: { x: number; y: number }[] = [];
    const botPts: { x: number; y: number }[] = [];
    const segs = 12;

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const bx = s.x + cos * s.length * t;
      const by = s.y + sin * s.length * t;
      const wobTop = (this.noise1d(i * 3.7) - 0.5) * hw * 0.4;
      const wobBot = (this.noise1d(i * 3.7 + 50) - 0.5) * hw * 0.4;

      topPts.push({ x: bx + perpX * (hw + wobTop), y: by + perpY * (hw + wobTop) });
      botPts.push({ x: bx - perpX * (hw + wobBot), y: by - perpY * (hw + wobBot) });
    }

    g.moveTo(topPts[0].x, topPts[0].y);
    for (let i = 1; i < topPts.length; i++) g.lineTo(topPts[i].x, topPts[i].y);
    for (let i = botPts.length - 1; i >= 0; i--) g.lineTo(botPts[i].x, botPts[i].y);
    g.closePath();
    g.fill({ color: s.color, alpha });
  }

  private noise1d(x: number): number {
    const ix = Math.floor(x);
    const fx = x - ix;
    const sx = fx * fx * (3 - 2 * fx);
    const a = this.hash1d(ix);
    const b = this.hash1d(ix + 1);
    return a + (b - a) * sx;
  }

  private hash1d(n: number): number {
    let h = n * 374761393;
    h = (h ^ (h >> 13)) * 1321091407;
    h = h ^ (h >> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  }
}
