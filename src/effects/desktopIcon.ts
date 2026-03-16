// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * Desktop icon with pixel art style
 * Can render multiple icons when iconsData is provided
 */
export class DesktopIcon extends BaseEffect {
  readonly name = 'desktopIcon';
  private graphics: PIXI.Graphics[] = [];
  private labelTexts: PIXI.Text[] = [];

  protected setup(): void {
    // Check if this is a multi-icon setup
    const iconsData = this.config.iconsData as any[] | undefined;
    
    if (iconsData && Array.isArray(iconsData)) {
      // Multi-icon mode: create multiple icons
      iconsData.forEach(() => {
        const g = new PIXI.Graphics();
        this.graphics.push(g);
        this.container.addChild(g);
      });
    } else {
      // Single icon mode
      const g = new PIXI.Graphics();
      this.graphics.push(g);
      this.container.addChild(g);
    }
  }

  update(_ctx: UpdateContext): void {
    const iconsData = this.config.iconsData as any[] | undefined;
    
    if (iconsData && Array.isArray(iconsData)) {
      // Multi-icon mode
      iconsData.forEach((iconConfig, index) => {
        this.renderIcon(iconConfig, index);
      });
    } else {
      // Single icon mode
      this.renderIcon(this.config, 0);
    }
  }

  private renderIcon(config: Record<string, any>, index: number): void {
    const g = this.graphics[index];
    if (!g) return;
    
    g.clear();

    const x = config.x ?? 60;
    const y = config.y ?? 60;
    const size = config.size ?? 64;
    const iconType = config.iconType ?? 'paint';

    // Draw icon based on type
    if (iconType === 'paint') {
      this.drawPaintIcon(g, x, y, size);
    } else if (iconType === 'notes') {
      this.drawNotesIcon(g, x, y, size);
    }

    // Create or update label text
    if (!this.labelTexts[index]) {
      const fontFamily = config.fontFamily ?? '"Courier New", monospace';
      const labelColor = resolveColor(config.labelColor ?? '$text', this.palette);
      
      const labelText = new PIXI.Text({
        text: config.label ?? 'Icon',
        style: {
          fontFamily,
          fontSize: 11,
          fill: labelColor,
          fontWeight: 'bold',
          align: 'center',
        },
      });
      this.labelTexts[index] = labelText;
      this.container.addChild(labelText);
    }
    
    const labelText = this.labelTexts[index];
    labelText.text = config.label ?? 'Icon';
    labelText.anchor.set(0.5, 0);
    labelText.x = x + size / 2;
    labelText.y = y + size + 4;
  }

  private drawPaintIcon(g: PIXI.Graphics, x: number, y: number, size: number): void {
    
    // Icon background (gradient effect with two colors)
    const bgGradient = [
      ['#b3d9ff', '#6bb3ff'],
      ['#ffb3d9', '#ff80bf'],
    ];
    const colors = bgGradient[0];
    
    // Top half
    g.rect(x, y, size, size / 2);
    g.fill({ color: colors[0], alpha: 1 });
    
    // Bottom half
    g.rect(x, y + size / 2, size, size / 2);
    g.fill({ color: colors[1], alpha: 1 });
    
    // Border
    g.rect(x, y, size, size);
    g.stroke({ color: '#000000', width: 2 });
    
    // Paint palette symbol (simplified)
    const paletteSize = size * 0.6;
    const paletteX = x + (size - paletteSize) / 2;
    const paletteY = y + (size - paletteSize) / 2;
    
    g.circle(paletteX + paletteSize / 2, paletteY + paletteSize / 2, paletteSize / 2);
    g.fill({ color: '#ffffff', alpha: 0.9 });
    
    // Color dots on palette
    const dotColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf'];
    const dotSize = paletteSize / 8;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const radius = paletteSize / 4;
      g.circle(
        paletteX + paletteSize / 2 + Math.cos(angle) * radius,
        paletteY + paletteSize / 2 + Math.sin(angle) * radius,
        dotSize
      );
      g.fill({ color: dotColors[i], alpha: 1 });
    }
  }

  private drawNotesIcon(g: PIXI.Graphics, x: number, y: number, size: number): void {
    
    // Paper background (yellow notepad)
    g.rect(x, y, size, size);
    g.fill({ color: '#fffacd', alpha: 1 });
    
    // Border
    g.rect(x, y, size, size);
    g.stroke({ color: '#000000', width: 2 });
    
    // Folded corner
    const cornerSize = size * 0.25;
    g.moveTo(x + size - cornerSize, y);
    g.lineTo(x + size, y + cornerSize);
    g.lineTo(x + size - cornerSize, y + cornerSize);
    g.lineTo(x + size - cornerSize, y);
    g.fill({ color: '#f0e68c', alpha: 1 });
    g.stroke({ color: '#000000', width: 2 });
    
    // Lines on paper
    const lineCount = 4;
    const lineSpacing = (size * 0.6) / lineCount;
    const lineStartY = y + size * 0.25;
    const lineMargin = size * 0.15;
    
    for (let i = 0; i < lineCount; i++) {
      const lineY = lineStartY + i * lineSpacing;
      g.moveTo(x + lineMargin, lineY);
      g.lineTo(x + size - lineMargin, lineY);
      g.stroke({ color: '#8b7355', width: 1.5, alpha: 0.6 });
    }
  }
}
