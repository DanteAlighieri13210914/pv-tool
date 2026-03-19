// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/** 简单的伪随机，保证同 seed 下图形一致 */
class SeededRng {
  private s: number;
  constructor(seed: number) { this.s = seed; }
  next(): number {
    this.s = (this.s * 16807 + 0) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(lo: number, hi: number) { return lo + this.next() * (hi - lo); }
  int(lo: number, hi: number) { return Math.floor(this.range(lo, hi + 1)); }
}

export class BloodSplatter extends BaseEffect {
  readonly name = 'bloodSplatter';
  private initialized = false;

  protected setup(): void {}

  private initSplatters(width: number, height: number): void {
    if (this.initialized) return;
    this.initialized = true;

    const count   = this.config.count   ?? 4;
    const color   = resolveColor(this.config.color ?? '#8b0000', this.palette);
    const alpha   = this.config.alpha   ?? 0.92;
    const baseSize = this.config.size   ?? 1.0;
    const seed    = this.config.seed    ?? 42;

    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      // 位置随机分布，允许靠近边缘
      const x = width  * (Math.random() * 0.9 + 0.05);
      const y = height * (Math.random() * 0.9 + 0.05);
      // 尺寸差异更大：最小 0.3x，最大 2.2x
      const s = baseSize * (0.3 + Math.random() * 1.9);
      const rotation = Math.random() * Math.PI * 2;
      // 各血迹透明度也略有差异
      const a = alpha * (0.75 + Math.random() * 0.25);

      g.x = x;
      g.y = y;
      g.rotation = rotation;
      g.alpha = a;

      // 形状细节用 seed+i 保证可复现，但每个血迹形状不同
      const rng = new SeededRng(seed + i * 1000);
      this.drawSplatter(g, s, color, rng);
      this.container.addChild(g);
    }
  }

  private drawSplatter(g: PIXI.Graphics, s: number, color: string, rng: SeededRng): void {
    const fill = { color };

    // ── 主血迹：中心圆 + 若干随机偏移圆形叠加形成不规则血池 ──
    const blobCount = rng.int(5, 9);
    const mainR = rng.range(28, 48) * s;

    g.circle(0, 0, mainR).fill(fill);

    for (let i = 0; i < blobCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist  = rng.range(mainR * 0.2, mainR * 0.85);
      const r     = rng.range(mainR * 0.3, mainR * 0.7);
      g.circle(Math.cos(angle) * dist, Math.sin(angle) * dist, r).fill(fill);
    }

    // ── 飞溅射线：从中心向外的细长滴 ──
    const rayCount = rng.int(5, 10);
    for (let i = 0; i < rayCount; i++) {
      const angle  = rng.range(0, Math.PI * 2);
      const len    = rng.range(mainR * 0.8, mainR * 2.2) * s;
      const w      = rng.range(3, 9) * s;
      const startD = mainR * rng.range(0.5, 0.9);

      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      const nx = -cy, ny = cx; // 法线

      // 从靠近中心开始，到末端收尖
      const x0 = cx * startD + nx * w;
      const y0 = cy * startD + ny * w;
      const x1 = cx * startD - nx * w;
      const y1 = cy * startD - ny * w;
      const tipX = cx * (startD + len);
      const tipY = cy * (startD + len);

      g.moveTo(x0, y0).lineTo(x1, y1).lineTo(tipX, tipY).closePath().fill(fill);

      // 末端小液滴
      const dropR = rng.range(w * 0.4, w * 1.1);
      g.circle(tipX, tipY, dropR).fill(fill);
    }

    // ── 散落小液滴 ──
    const dotCount = rng.int(6, 14);
    for (let i = 0; i < dotCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist  = rng.range(mainR * 1.0, mainR * 3.0) * s;
      const r     = rng.range(2, 10) * s;
      // 椭圆以模拟斜向落下的液滴
      const rx = r;
      const ry = r * rng.range(0.4, 1.0);
      g.ellipse(Math.cos(angle) * dist, Math.sin(angle) * dist, rx, ry).fill(fill);
    }

    // ── 竖向滴落（1~2 条从主血迹向下延伸的细流）──
    const dripCount = rng.int(1, 3);
    for (let i = 0; i < dripCount; i++) {
      const ox  = rng.range(-mainR * 0.5, mainR * 0.5);
      const len = rng.range(mainR * 0.8, mainR * 2.0) * s;
      const w   = rng.range(4, 10) * s;

      // 细流体
      g.moveTo(ox - w / 2, mainR * 0.7)
        .lineTo(ox + w / 2, mainR * 0.7)
        .lineTo(ox + w * 0.3, mainR * 0.7 + len)
        .lineTo(ox - w * 0.3, mainR * 0.7 + len)
        .closePath()
        .fill(fill);

      // 末端泪滴
      g.ellipse(ox, mainR * 0.7 + len + w * 0.6, w * 0.55, w * 0.75).fill(fill);
    }
  }

  update(ctx: UpdateContext): void {
    this.initSplatters(ctx.screenWidth, ctx.screenHeight);
  }
}
