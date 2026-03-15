// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * Kawaii pixel-style window with title bar and content area
 * Can render multiple windows when windowsData is provided
 */
export class PixelWindow extends BaseEffect {
  readonly name = 'pixelWindow';
  private graphics: PIXI.Graphics[] = [];
  private titleTexts: PIXI.Text[] = [];
  private contentTexts: PIXI.Text[] = [];
  private iconGraphics: PIXI.Graphics[] = [];

  protected setup(): void {
    // Check if this is a multi-window setup
    const windowsData = this.config.windowsData as any[] | undefined;
    
    if (windowsData && Array.isArray(windowsData)) {
      // Multi-window mode: create multiple windows
      windowsData.forEach(() => {
        const g = new PIXI.Graphics();
        const iconG = new PIXI.Graphics();
        this.graphics.push(g);
        this.iconGraphics.push(iconG);
        this.container.addChild(g);
        this.container.addChild(iconG);
      });
    } else {
      // Single window mode
      const g = new PIXI.Graphics();
      const iconG = new PIXI.Graphics();
      this.graphics.push(g);
      this.iconGraphics.push(iconG);
      this.container.addChild(g);
      this.container.addChild(iconG);
    }
  }

  update(ctx: UpdateContext): void {
    const windowsData = this.config.windowsData as any[] | undefined;
    
    if (windowsData && Array.isArray(windowsData)) {
      // Multi-window mode
      windowsData.forEach((windowConfig, index) => {
        this.renderWindow(ctx, windowConfig, index);
      });
    } else {
      // Single window mode
      this.renderWindow(ctx, this.config, 0);
    }
  }

  private renderWindow(ctx: UpdateContext, config: Record<string, any>, index: number): void {
    const g = this.graphics[index];
    if (!g) return;
    
    g.clear();

    const x = ((config.x ?? 0.5) * ctx.screenWidth);
    const y = ((config.y ?? 0.5) * ctx.screenHeight);
    const width = config.width ?? 280;
    const height = config.height ?? 200;
    const borderWidth = config.borderWidth ?? 4;
    const titleBarHeight = config.titleBarHeight ?? 28;

    const bgColor = resolveColor(config.bgColor ?? '#ffffff', this.palette);
    const borderColor = resolveColor(config.borderColor ?? '$primary', this.palette);
    const titleBgColor = resolveColor(config.titleBgColor ?? '$primary', this.palette);
    const alpha = config.alpha ?? 0.95;

    // Calculate window position
    const anchorX = config.anchorX ?? 0.5;
    const anchorY = config.anchorY ?? 0.5;
    const winX = x - width * anchorX;
    const winY = y - height * anchorY;

    // Outer border
    g.rect(winX, winY, width, height);
    g.fill({ color: borderColor, alpha });

    // Title bar background
    g.rect(winX + borderWidth, winY + borderWidth, width - borderWidth * 2, titleBarHeight);
    g.fill({ color: titleBgColor, alpha });

    // Content area background
    g.rect(
      winX + borderWidth,
      winY + borderWidth + titleBarHeight,
      width - borderWidth * 2,
      height - borderWidth * 2 - titleBarHeight
    );
    g.fill({ color: bgColor, alpha });

    // Window control buttons (X button)
    const btnSize = 16;
    const btnX = winX + width - borderWidth - btnSize - 6;
    const btnY = winY + borderWidth + (titleBarHeight - btnSize) / 2;
    
    const iconG = this.iconGraphics[index];
    if (iconG) {
      iconG.clear();
      // X button background
      iconG.rect(btnX, btnY, btnSize, btnSize);
      iconG.fill({ color: '#ffffff', alpha: 0.3 });
      
      // X mark
      const xPad = 4;
      iconG.moveTo(btnX + xPad, btnY + xPad);
      iconG.lineTo(btnX + btnSize - xPad, btnY + btnSize - xPad);
      iconG.moveTo(btnX + btnSize - xPad, btnY + xPad);
      iconG.lineTo(btnX + xPad, btnY + btnSize - xPad);
      iconG.stroke({ color: '#ffffff', width: 2, alpha: 0.8 });

      // Draw icon if specified
      if (config.icon) {
        this.drawIcon(iconG, winX + borderWidth + 8, winY + borderWidth + titleBarHeight + 15, config);
      }
    }

    // Create or update title text
    if (!this.titleTexts[index]) {
      const fontFamily = config.fontFamily ?? '"Courier New", monospace';
      const titleColor = resolveColor(config.titleColor ?? '#ffffff', this.palette);
      
      const titleText = new PIXI.Text({
        text: config.title ?? 'Window',
        style: {
          fontFamily,
          fontSize: 14,
          fill: titleColor,
          fontWeight: 'bold',
        },
      });
      this.titleTexts[index] = titleText;
      this.container.addChild(titleText);
    }
    
    const titleText = this.titleTexts[index];
    titleText.x = winX + borderWidth + 8;
    titleText.y = winY + borderWidth + (titleBarHeight - titleText.height) / 2;

    // Create or update content text if exists
    if (config.content) {
      if (!this.contentTexts[index]) {
        const fontFamily = config.fontFamily ?? '"Courier New", monospace';
        const contentColor = resolveColor(config.contentColor ?? '$text', this.palette);
        
        const contentText = new PIXI.Text({
          text: config.content,
          style: {
            fontFamily,
            fontSize: 12,
            fill: contentColor,
            wordWrap: true,
            wordWrapWidth: width - 20,
          },
        });
        this.contentTexts[index] = contentText;
        this.container.addChild(contentText);
      }
      
      const contentText = this.contentTexts[index];
      contentText.text = config.content;
      contentText.x = winX + borderWidth + 10;
      contentText.y = winY + borderWidth + titleBarHeight + 10;
    }
  }

  private drawIcon(iconG: PIXI.Graphics, x: number, y: number, config: Record<string, any>): void {
    const iconType = config.icon;
    const iconColor = resolveColor(config.iconColor ?? '$primary', this.palette);
    const size = config.iconSize ?? 60;

    if (iconType === 'heart') {
      // Pixel heart
      const pixels = [
        [0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [0,1,1,1,1,1,0],
        [0,0,1,1,1,0,0],
        [0,0,0,1,0,0,0],
      ];
      const pixelSize = size / 7;
      for (let row = 0; row < pixels.length; row++) {
        for (let col = 0; col < pixels[row].length; col++) {
          if (pixels[row][col]) {
            iconG.rect(
              x + col * pixelSize,
              y + row * pixelSize,
              pixelSize,
              pixelSize
            );
            iconG.fill({ color: iconColor, alpha: 0.8 });
          }
        }
      }
    } else if (iconType === 'paint') {
      // Simple paint palette icon
      iconG.circle(x + size/2, y + size/2, size/2);
      iconG.fill({ color: iconColor, alpha: 0.3 });
      
      // Color dots
      const colors = ['#ffb3d9', '#b3e5fc', '#c8f7dc', '#fff9b3'];
      const dotSize = size / 6;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const radius = size / 4;
        iconG.circle(
          x + size/2 + Math.cos(angle) * radius,
          y + size/2 + Math.sin(angle) * radius,
          dotSize
        );
        iconG.fill({ color: colors[i], alpha: 0.8 });
      }
    }
  }
}
