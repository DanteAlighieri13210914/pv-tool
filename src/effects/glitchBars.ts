// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface GlitchBar {
  graphics: PIXI.Graphics;
  y: number;
  width: number;
  height: number;
  speed: number;
  lifetime: number;
  born: number;
  startX: number;
}

export class GlitchBars extends BaseEffect {
  readonly name = 'glitchBars';
  private bars: GlitchBar[] = [];
  private lastSpawn = 0;

  protected setup(): void {}

  update(ctx: UpdateContext): void {
    const spawnRate = this.config.spawnRate ?? 0.15;
    const maxBars = this.config.maxBars ?? 8;
    const color = resolveColor(this.config.color ?? '$primary', this.palette);
    const barAlpha = this.config.alpha ?? 0.9;
    const minHeight = this.config.minHeight ?? 2;
    const maxHeight = this.config.maxHeight ?? 12;
    const speed = ctx.animationSpeed;

    // Spawn new bars. The `ctx.time < lastSpawn` clamp protects against
    // backward seek (timeline scrubbing) — without it, after seeking back
    // the gate `time - lastSpawn > interval` stays false until time
    // catches up to the historical lastSpawn, freezing spawning.
    if (ctx.time < this.lastSpawn) this.lastSpawn = ctx.time;
    if (ctx.time - this.lastSpawn > spawnRate / speed && this.bars.length < maxBars) {
      this.lastSpawn = ctx.time;
      const g = new PIXI.Graphics();
      const h = minHeight + Math.random() * (maxHeight - minHeight);
      const w = ctx.screenWidth * (0.3 + Math.random() * 0.7);
      const x = Math.random() * (ctx.screenWidth - w);
      const y = Math.random() * ctx.screenHeight;

      g.rect(0, 0, w, h);
      g.fill({ color, alpha: barAlpha });
      g.x = x;
      g.y = y;

      this.container.addChild(g);
      this.bars.push({
        graphics: g,
        y,
        width: w,
        height: h,
        speed: (Math.random() - 0.5) * 200 * ctx.motionIntensity,
        lifetime: 0.08 + Math.random() * 0.2,
        born: ctx.time,
        startX: x,
      });
    }

    // Update and remove expired bars. `age < 0` covers backward seek:
    // existing bars whose `born > ctx.time` would otherwise survive
    // (lifetime check fails) and render at startX + speed*age (negative
    // offset) with alpha clamped to 1 → ghost bar at wrong position.
    this.bars = this.bars.filter(bar => {
      const age = ctx.time - bar.born;
      if (age < 0 || age > bar.lifetime) {
        this.container.removeChild(bar.graphics);
        bar.graphics.destroy();
        return false;
      }
      bar.graphics.x = bar.startX + bar.speed * age;
      bar.graphics.alpha = 1 - (age / bar.lifetime);
      return true;
    });
  }

  destroy(): void {
    for (const b of this.bars) {
      try { b.graphics.destroy(); } catch { /* already destroyed */ }
    }
    this.bars = [];
    super.destroy();
  }
}