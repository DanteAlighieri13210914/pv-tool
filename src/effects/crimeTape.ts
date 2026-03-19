// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface TapeStrip {
  container: PIXI.Container;
  graphics: PIXI.Graphics;
  texts: PIXI.Text[];
  /** 垂直基准位置（归一化 0~1） */
  yBase: number;
  /** 水平偏移量，用于滚动 */
  scrollOffset: number;
  /** 滚动速度（px/s），正负决定方向 */
  scrollSpeed: number;
  /** 倾斜角度 rad */
  angle: number;
  tapeWidth: number;
  tapeColor: string;
  textColor: string;
  tapeText: string;
  /** 相邻文字间距（px） */
  spacing: number;
}

export class CrimeTape extends BaseEffect {
  readonly name = 'crimeTape';
  private strips: TapeStrip[] = [];
  private initialized = false;

  protected setup(): void {}

  private initStrips(width: number, height: number): void {
    if (this.initialized) return;
    this.initialized = true;

    const count = this.config.count ?? 5;
    const tapeText: string = this.config.text ?? 'POLICE LINE DO NOT CROSS';
    const tapeColor = resolveColor(this.config.tapeColor ?? '#f5c800', this.palette);
    const textColor = resolveColor(this.config.textColor ?? '#000000', this.palette);
    const tapeWidth: number = this.config.tapeWidth ?? 52;
    const speed: number = this.config.speed ?? 80;
    const angleRange: number = this.config.angleRange ?? 0.18;

    for (let i = 0; i < count; i++) {
      const yBase = (i + 0.5) / count;
      const angle = (Math.random() - 0.5) * angleRange * 2;
      const dir = i % 2 === 0 ? 1 : -1;
      const stripSpeed = (speed * 0.6 + Math.random() * speed * 0.8) * dir;

      const container = new PIXI.Container();
      container.y = yBase * height;
      container.rotation = angle;

      const graphics = new PIXI.Graphics();
      container.addChild(graphics);

      this.container.addChild(container);

      const strip: TapeStrip = {
        container,
        graphics,
        texts: [],
        yBase,
        scrollOffset: Math.random() * 400,
        scrollSpeed: stripSpeed,
        angle,
        tapeWidth,
        tapeColor,
        textColor,
        tapeText,
        spacing: 0,
      };

      this.buildTexts(strip, width);
      this.strips.push(strip);
    }
  }

  private buildTexts(strip: TapeStrip, width: number): void {
    // 销毁旧文字
    for (const t of strip.texts) t.destroy();
    strip.texts = [];

    const fontSize = strip.tapeWidth * 0.52;
    const spacing = strip.tapeText.length * fontSize * 0.62 + 60;
    strip.spacing = spacing;
    // 文字数量：覆盖屏幕宽度 + 左右各多一个，保证任何偏移下都无缝
    const count = Math.ceil(width / spacing) + 3;

    for (let i = 0; i < count; i++) {
      const t = new PIXI.Text({
        text: '  ' + strip.tapeText + '  ✦',
        style: {
          fontFamily: 'Arial Black, Impact, sans-serif',
          fontSize,
          fontWeight: '900',
          fill: strip.textColor,
          align: 'left',
        },
      });
      t.anchor.set(0, 0.5);
      t.y = 0;
      strip.container.addChild(t);
      strip.texts.push(t);
    }
  }

  private drawTape(strip: TapeStrip, width: number): void {
    const g = strip.graphics;
    g.clear();

    // 带子主体（延伸超出屏幕两侧）
    const hw = strip.tapeWidth / 2;
    const overrun = width * 1.5;
    g.rect(-overrun, -hw, width + overrun * 2, strip.tapeWidth)
      .fill({ color: strip.tapeColor });

    // 顶部和底部细边（深色加深感）
    g.rect(-overrun, -hw, width + overrun * 2, strip.tapeWidth * 0.06)
      .fill({ color: 0x000000, alpha: 0.25 });
    g.rect(-overrun, hw - strip.tapeWidth * 0.06, width + overrun * 2, strip.tapeWidth * 0.06)
      .fill({ color: 0x000000, alpha: 0.25 });
  }

  update(ctx: UpdateContext): void {
    this.initStrips(ctx.screenWidth, ctx.screenHeight);

    const dt = ctx.deltaTime;

    for (const strip of this.strips) {
      // 更新垂直位置（跟随 screenHeight）
      strip.container.y = strip.yBase * ctx.screenHeight;

      // 滚动
      strip.scrollOffset += strip.scrollSpeed * dt * ctx.animationSpeed;

      // 重绘带子
      this.drawTape(strip, ctx.screenWidth);

      // 以单个 spacing 为周期取模，第一个文字始终在屏幕左侧一格内，保证全程无缝
      const sp = strip.spacing;
      const phase = ((strip.scrollOffset % sp) + sp) % sp;
      for (let i = 0; i < strip.texts.length; i++) {
        strip.texts[i].x = phase - sp + i * sp;
      }
    }
  }
}
