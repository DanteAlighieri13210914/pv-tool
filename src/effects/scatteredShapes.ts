// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface ShapeParticle {
  graphics: PIXI.Graphics;
  baseX: number;
  baseY: number;
  driftPhase: number;
  rotationSpeed: number;
}

export class ScatteredShapes extends BaseEffect {
  readonly name = 'scatteredShapes';
  private particles: ShapeParticle[] = [];
  private initialized = false;

  protected setup(): void {}

  private initShapes(width: number, height: number): void {
    if (this.initialized) return;
    this.initialized = true;

    const count = this.config.count ?? 12;
    const color = resolveColor(this.config.color ?? '$primary', this.palette);
    const alpha = this.config.alpha ?? 0.5;
    const minSize = this.config.minSize ?? 10;
    const maxSize = this.config.maxSize ?? 40;
    const types: string[] = this.config.shapes ?? ['square', 'diamond'];

    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const size = minSize + Math.random() * (maxSize - minSize);
      const type = types[Math.floor(Math.random() * types.length)];
      const half = size / 2;

      if (type === 'square') {
        g.rect(-half, -half, size, size);
      } else if (type === 'diamond') {
        g.moveTo(0, -half).lineTo(half, 0).lineTo(0, half).lineTo(-half, 0).closePath();
      } else if (type === 'dot') {
        g.circle(0, 0, size / 3);
      }

      const filled = Math.random() > 0.5;
      if (filled) {
        g.fill({ color, alpha: alpha * 0.3 });
      }
      g.stroke({ color, width: 1.5, alpha });

      const baseX = Math.random() * width;
      const baseY = Math.random() * height;
      g.x = baseX;
      g.y = baseY;

      this.particles.push({
        graphics: g,
        baseX,
        baseY,
        driftPhase: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });

      this.container.addChild(g);
    }
  }

  update(ctx: UpdateContext): void {
    this.initShapes(ctx.screenWidth, ctx.screenHeight);

    for (const p of this.particles) {
      const drift = ctx.motionIntensity;
      const spd = ctx.animationSpeed;
      p.graphics.x = p.baseX + Math.sin(ctx.time * 0.2 * spd + p.driftPhase) * 8 * drift;
      p.graphics.y = p.baseY + Math.cos(ctx.time * 0.15 * spd + p.driftPhase) * 6 * drift;
      p.graphics.rotation = ctx.time * p.rotationSpeed * spd;
    }
  }
}