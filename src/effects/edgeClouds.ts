// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface CloudCluster {
  x: number;
  y: number;
  circles: { offsetX: number; offsetY: number; radius: number }[];
  phase: number;
  speed: number;
}

/**
 * Edge Clouds - Decorative clouds made of circles positioned at screen edges.
 * Creates soft, fluffy cloud formations at top, bottom, left, and right edges.
 */
export class EdgeClouds extends BaseEffect {
  readonly name = 'edgeClouds';
  private graphics!: PIXI.Graphics;
  private topClouds: CloudCluster[] = [];
  private bottomClouds: CloudCluster[] = [];
  private leftClouds: CloudCluster[] = [];
  private rightClouds: CloudCluster[] = [];
  private lastW = 0;
  private lastH = 0;

  protected setup(): void {
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  private hash(n: number): number {
    const x = Math.sin(n * 1321.0914 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  private initClouds(w: number, h: number): void {
    const cloudCount = this.config.cloudCount ?? 5;
    const minCircles = this.config.minCircles ?? 6;
    const maxCircles = this.config.maxCircles ?? 10;
    const seed = this.config.seed ?? 42;

    this.topClouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.topClouds.push(this.createCloud(
        (i + 0.5) * (w / cloudCount), -40,
        minCircles, maxCircles, seed + i,
      ));
    }

    this.bottomClouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.bottomClouds.push(this.createCloud(
        (i + 0.5) * (w / cloudCount), h + 40,
        minCircles, maxCircles, seed + 100 + i,
      ));
    }

    this.leftClouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.leftClouds.push(this.createCloud(
        -40, (i + 0.5) * (h / cloudCount),
        minCircles, maxCircles, seed + 200 + i,
      ));
    }

    this.rightClouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.rightClouds.push(this.createCloud(
        w + 40, (i + 0.5) * (h / cloudCount),
        minCircles, maxCircles, seed + 300 + i,
      ));
    }

    this.lastW = w;
    this.lastH = h;
  }

  private createCloud(
    x: number, y: number,
    minCircles: number, maxCircles: number,
    seed: number,
  ): CloudCluster {
    const circleCount = minCircles + Math.floor(this.hash(seed) * (maxCircles - minCircles + 1));
    const circles: { offsetX: number; offsetY: number; radius: number }[] = [];
    const baseRadius = this.config.baseRadius ?? 100;

    for (let i = 0; i < circleCount; i++) {
      const angle = this.hash(seed * 13 + i * 7) * Math.PI * 2;
      const distance = this.hash(seed * 17 + i * 11) * baseRadius * 1.8;
      circles.push({
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance * 0.7,
        radius: baseRadius * (0.7 + this.hash(seed * 23 + i * 19) * 0.8),
      });
    }

    return {
      x, y, circles,
      phase: this.hash(seed * 31) * Math.PI * 2,
      speed: 0.3 + this.hash(seed * 37) * 0.4,
    };
  }

  update(ctx: UpdateContext): void {
    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    if (this.lastW !== w || this.lastH !== h) {
      this.initClouds(w, h);
    }

    const g = this.graphics;
    g.clear();

    const color = resolveColor(this.config.color ?? '#ffffff', this.palette);
    const alpha = this.config.alpha ?? 1.0;
    const animate = this.config.animate !== false;
    const animSpeed = (this.config.animSpeed ?? 0.3) * ctx.animationSpeed;

    const shadowOffsetX = this.config.shadowOffsetX ?? 4;
    const shadowOffsetY = this.config.shadowOffsetY ?? 4;
    const shadowAlpha = this.config.shadowAlpha ?? 0.5;
    const shadowColor = this.config.shadowColor ?? '#ead9ecff';

    const allClouds = [
      ...this.topClouds,
      ...this.bottomClouds,
      ...this.leftClouds,
      ...this.rightClouds,
    ];

    // Shadow pass
    for (const cloud of allClouds) {
      const floatX = animate ? Math.sin(ctx.time * animSpeed * cloud.speed + cloud.phase) * 10 : 0;
      const floatY = animate ? Math.cos(ctx.time * animSpeed * cloud.speed * 0.7 + cloud.phase) * 5 : 0;

      for (const circle of cloud.circles) {
        const breathe = animate ? 1 + Math.sin(ctx.time * animSpeed * 2 + cloud.phase) * 0.05 : 1;
        g.circle(
          cloud.x + circle.offsetX + floatX + shadowOffsetX,
          cloud.y + circle.offsetY + floatY + shadowOffsetY,
          circle.radius * breathe,
        );
      }
    }
    g.fill({ color: shadowColor, alpha: shadowAlpha });

    // Main pass
    for (const cloud of allClouds) {
      const floatX = animate ? Math.sin(ctx.time * animSpeed * cloud.speed + cloud.phase) * 10 : 0;
      const floatY = animate ? Math.cos(ctx.time * animSpeed * cloud.speed * 0.7 + cloud.phase) * 5 : 0;

      for (const circle of cloud.circles) {
        const breathe = animate ? 1 + Math.sin(ctx.time * animSpeed * 2 + cloud.phase) * 0.05 : 1;
        g.circle(
          cloud.x + circle.offsetX + floatX,
          cloud.y + circle.offsetY + floatY,
          circle.radius * breathe,
        );
      }
    }
    g.fill({ color, alpha });
  }
}
