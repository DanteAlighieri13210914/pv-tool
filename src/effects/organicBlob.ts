// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

type BlobShape = 'blob' | 'wave' | 'cloud';

interface BlobInstance {
  x: number;
  y: number;
  baseRadius: number;
  phase: number;
  speed: number;
}

/**
 * Organic / liquid shape effect supporting multiple shape modes:
 *   - blob: Soft, liquid metaball-like shapes with noise-deformed radii
 *   - wave: Layered ocean wave (Hokusai-inspired) with animated flow
 *   - cloud: Soft cloud formations
 *
 * Uses value noise for organic deformation.
 */
export class OrganicBlob extends BaseEffect {
  readonly name = 'organicBlob';
  override readonly heavy = true;
  private g!: PIXI.Graphics;
  private instances: BlobInstance[] = [];

  protected setup(): void {
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);
  }

  update(ctx: UpdateContext): void {
    const g = this.g;
    g.clear();

    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    const shape = (this.config.shape ?? 'blob') as BlobShape;
    const color = resolveColor(this.config.color ?? '$primary', this.palette);
    const alpha = this.config.alpha ?? 0.25;
    const filled = this.config.filled ?? true;
    const lineWidth = this.config.lineWidth ?? 2;
    const spd = ctx.animationSpeed;

    switch (shape) {
      case 'blob':
        this.drawBlobs(g, w, h, color, alpha, filled, lineWidth, ctx.time, spd);
        break;
      case 'wave':
        this.drawWave(g, w, h, color, alpha, filled, lineWidth, ctx.time, spd);
        break;
      case 'cloud':
        this.drawClouds(g, w, h, color, alpha, filled, lineWidth, ctx.time, spd);
        break;
    }
  }

  private ensureInstances(count: number, w: number, h: number): void {
    if (this.instances.length === count) return;
    this.instances = [];
    for (let i = 0; i < count; i++) {
      this.instances.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseRadius: 60 + Math.random() * 120,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      });
    }
  }

  private drawBlobs(
    g: PIXI.Graphics, w: number, h: number,
    color: string, alpha: number, filled: boolean, lw: number,
    time: number, spd: number,
  ): void {
    const count = this.config.count ?? 3;
    this.ensureInstances(count, w, h);
    const points = this.config.points ?? 80;
    const noiseScale = this.config.noiseScale ?? 3;
    const noiseAmp = this.config.noiseAmp ?? 0.35;
    const scale = this.config.scale ?? 1;

    for (const inst of this.instances) {
      const cx = inst.x;
      const cy = inst.y;
      const r = inst.baseRadius * scale;

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const n = this.noise2d(
          Math.cos(angle) * noiseScale + time * spd * inst.speed * 0.4,
          Math.sin(angle) * noiseScale + inst.phase,
        );
        const deform = 1 + n * noiseAmp;
        const px = cx + Math.cos(angle) * r * deform;
        const py = cy + Math.sin(angle) * r * deform;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();

      if (filled) {
        g.fill({ color, alpha });
      }
      g.stroke({ color, width: lw, alpha: filled ? alpha * 0.6 : alpha });
    }
  }

  private drawWave(
    g: PIXI.Graphics, w: number, h: number,
    color: string, alpha: number, filled: boolean, lw: number,
    time: number, spd: number,
  ): void {
    const layers = this.config.layers ?? 4;
    const baseY = h * (this.config.waveY ?? 0.6);
    const amplitude = this.config.amplitude ?? 40;
    const foamColor = resolveColor(this.config.foamColor ?? '#ffffff', this.palette);

    for (let layer = 0; layer < layers; layer++) {
      const layerFrac = layer / layers;
      const layerY = baseY + layer * (amplitude * 0.8);
      const layerAlpha = alpha * (1 - layerFrac * 0.4);
      const freq = 0.004 + layerFrac * 0.002;
      const amp = amplitude * (1 - layerFrac * 0.3);
      const phaseOffset = layer * 1.2;
      const speed = (0.8 + layerFrac * 0.5) * spd;

      // Wave path
      g.moveTo(0, layerY);
      for (let x = 0; x <= w; x += 3) {
        const y = layerY
          + Math.sin(x * freq + time * speed + phaseOffset) * amp
          + Math.sin(x * freq * 2.3 + time * speed * 0.7 + phaseOffset + 1) * amp * 0.3
          + this.noise2d(x * 0.008, time * speed * 0.2 + layer) * amp * 0.25;
        g.lineTo(x, y);
      }

      if (filled) {
        g.lineTo(w, h);
        g.lineTo(0, h);
        g.closePath();
        g.fill({ color, alpha: layerAlpha });
      }
      g.stroke({ color, width: lw * (1 - layerFrac * 0.3), alpha: layerAlpha });

      // Foam / crest highlights on the front layers
      if (layer < 2) {
        for (let x = 0; x <= w; x += 3) {
          const y = layerY
            + Math.sin(x * freq + time * speed + phaseOffset) * amp
            + Math.sin(x * freq * 2.3 + time * speed * 0.7 + phaseOffset + 1) * amp * 0.3
            + this.noise2d(x * 0.008, time * speed * 0.2 + layer) * amp * 0.25;
          // Crest threshold: highlight near the peaks
          const localSlope = Math.cos(x * freq + time * speed + phaseOffset) * amp * freq;
          if (Math.abs(localSlope) < 0.08 && Math.sin(x * freq + time * speed + phaseOffset) < -0.5) {
            const foamSize = 2 + Math.random() * 3;
            g.circle(x, y - 2, foamSize);
          }
        }
        g.fill({ color: foamColor, alpha: layerAlpha * 0.5 });
      }
    }
  }

  private drawClouds(
    g: PIXI.Graphics, w: number, h: number,
    color: string, alpha: number, filled: boolean, lw: number,
    time: number, spd: number,
  ): void {
    const count = this.config.count ?? 3;
    this.ensureInstances(count, w, h);
    const scale = this.config.scale ?? 1;

    for (const inst of this.instances) {
      const lobes = 5 + Math.floor(Math.random() * 4);
      const baseR = inst.baseRadius * scale * 0.6;

      for (let l = 0; l < lobes; l++) {
        const angle = (l / lobes) * Math.PI * 2 + inst.phase;
        const dist = baseR * (0.3 + Math.random() * 0.5);
        const r = baseR * (0.5 + this.noise2d(l * 2 + time * spd * 0.2, inst.phase) * 0.3);
        const cx = inst.x + Math.cos(angle) * dist;
        const cy = inst.y + Math.sin(angle) * dist * 0.5;

        g.circle(cx, cy, r);
      }

      if (filled) {
        g.fill({ color, alpha });
      }
      g.stroke({ color, width: lw, alpha: filled ? alpha * 0.4 : alpha });
    }
  }

  /** Simple 2D value noise using hash function */
  private noise2d(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = this.hash(ix, iy);
    const n10 = this.hash(ix + 1, iy);
    const n01 = this.hash(ix, iy + 1);
    const n11 = this.hash(ix + 1, iy + 1);

    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;

    return nx0 + (nx1 - nx0) * sy;
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1321091407;
    h = h ^ (h >> 16);
    return (h & 0x7fffffff) / 0x7fffffff * 2 - 1;
  }
}