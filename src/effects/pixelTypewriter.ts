// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

/**
 * Pixel-style typewriter text effect - characters appear one by one
 * with pixelated rendering and split layout (left and right)
 */
export class PixelTypewriter extends BaseEffect {
  readonly name = 'pixelTypewriter';
  private leftTextObj!: PIXI.Text;
  private rightTextObj!: PIXI.Text;
  private cursorObj!: PIXI.Graphics;
  private currentText: string = '';
  private targetText: string = '';
  private charIndex: number = 0;
  private lastCharTime: number = 0;
  private showCursor: boolean = true;
  private lastCursorBlink: number = 0;
  private leftContainer!: PIXI.Container;
  private rightContainer!: PIXI.Container;

  protected setup(): void {
    const fontFamily = this.config.fontFamily ?? '"Courier New", monospace';
    const fillColor = resolveColor(this.config.fillColor ?? '$text', this.palette);
    const fontSize = this.config.fontSize ?? 64;
    const strokeColor = resolveColor(this.config.strokeColor ?? '#ffffff', this.palette);
    const strokeWidth = this.config.strokeWidth ?? 6;
    const pixelSize = this.config.pixelSize ?? 1;

    const textStyle = {
      fontFamily,
      fontSize,
      fill: fillColor,
      fontWeight: '900',
      letterSpacing: this.config.letterSpacing ?? 3,
      stroke: { color: strokeColor, width: strokeWidth },
      dropShadow: {
        color: resolveColor(this.config.shadowColor ?? '$primary', this.palette),
        blur: this.config.shadowBlur ?? 0,
        distance: Math.sqrt(
          Math.pow(this.config.shadowOffsetX ?? 3, 2) + 
          Math.pow(this.config.shadowOffsetY ?? 3, 2)
        ),
        angle: Math.atan2(
          this.config.shadowOffsetY ?? 3,
          this.config.shadowOffsetX ?? 3
        ),
      },
    };

    // Left text
    this.leftTextObj = new PIXI.Text({
      text: '',
      style: textStyle as any,
    });
    this.leftTextObj.anchor.set(0, 0.5); // Left-aligned

    // Right text
    this.rightTextObj = new PIXI.Text({
      text: '',
      style: textStyle as any,
    });
    this.rightTextObj.anchor.set(0, 0.5); // Left-aligned

    // Apply pixelation if needed
    if (pixelSize > 1) {
      this.leftTextObj.scale.set(1 / pixelSize);
      this.rightTextObj.scale.set(1 / pixelSize);
      
      this.leftContainer = new PIXI.Container();
      this.leftContainer.addChild(this.leftTextObj);
      this.leftContainer.scale.set(pixelSize);
      this.container.addChild(this.leftContainer);
      
      this.rightContainer = new PIXI.Container();
      this.rightContainer.addChild(this.rightTextObj);
      this.rightContainer.scale.set(pixelSize);
      this.container.addChild(this.rightContainer);
    } else {
      this.container.addChild(this.leftTextObj);
      this.container.addChild(this.rightTextObj);
    }

    this.cursorObj = new PIXI.Graphics();
    this.container.addChild(this.cursorObj);
  }

  update(ctx: UpdateContext): void {
    const y = (this.config.y ?? 0.5) * ctx.screenHeight;
    const charDelay = this.config.charDelay ?? 0.08;
    const cursorBlinkSpeed = this.config.cursorBlinkSpeed ?? 0.5;
    const pixelSize = this.config.pixelSize ?? 1;
    
    // Calculate left and right positions with gap in middle
    const leftX = (this.config.leftX ?? 0.25) * ctx.screenWidth;
    const rightX = (this.config.rightX ?? 0.75) * ctx.screenWidth;
    const maxCharsPerSide = this.config.maxCharsPerSide ?? 10;

    // Update target text
    if (ctx.currentText !== this.targetText) {
      this.targetText = ctx.currentText;
      this.charIndex = 0;
      this.currentText = '';
      this.lastCharTime = ctx.time;
    }

    // Add characters one by one
    if (this.charIndex < this.targetText.length) {
      if (ctx.time - this.lastCharTime >= charDelay) {
        this.currentText += this.targetText[this.charIndex];
        this.charIndex++;
        this.lastCharTime = ctx.time;
        
        // Split text between left and right
        this.updateTextSplit(maxCharsPerSide);
      }
    }

    // Position containers
    if (pixelSize > 1) {
      this.leftContainer.x = leftX;
      this.leftContainer.y = y;
      this.rightContainer.x = rightX;
      this.rightContainer.y = y;
    } else {
      this.leftTextObj.x = leftX;
      this.leftTextObj.y = y;
      this.rightTextObj.x = rightX;
      this.rightTextObj.y = y;
    }

    // Draw cursor
    this.drawCursor(ctx, leftX, rightX, y, cursorBlinkSpeed, pixelSize, maxCharsPerSide);
  }

  private updateTextSplit(maxCharsPerSide: number): void {
    const totalLength = this.currentText.length;
    
    if (totalLength <= maxCharsPerSide) {
      // All text on left side
      this.leftTextObj.text = this.currentText;
      this.rightTextObj.text = '';
    } else {
      // Split between left and right
      this.leftTextObj.text = this.currentText.substring(0, maxCharsPerSide);
      this.rightTextObj.text = this.currentText.substring(maxCharsPerSide);
    }
  }

  private drawCursor(ctx: UpdateContext, leftX: number, rightX: number, y: number, blinkSpeed: number, pixelSize: number, maxCharsPerSide: number): void {
    this.cursorObj.clear();

    const isTyping = this.charIndex < this.targetText.length;
    
    if (isTyping || this.config.showCursorWhenDone) {
      if (ctx.time - this.lastCursorBlink >= blinkSpeed) {
        this.showCursor = !this.showCursor;
        this.lastCursorBlink = ctx.time;
      }

      if (this.showCursor) {
        const cursorColor = resolveColor(this.config.cursorColor ?? '$primary', this.palette);
        const fontSize = this.config.fontSize ?? 44;
        const cursorWidth = this.config.cursorWidth ?? 4;
        const cursorHeight = fontSize * 0.8;

        let cursorX: number;
        
        if (this.currentText.length <= maxCharsPerSide) {
          // Cursor on left side (after text)
          const textWidth = this.leftTextObj.width * pixelSize;
          cursorX = leftX + textWidth + 5;
        } else {
          // Cursor on right side (after text)
          const textWidth = this.rightTextObj.width * pixelSize;
          cursorX = rightX + textWidth + 5;
        }
        
        const cursorY = y - cursorHeight / 2;

        this.cursorObj.rect(cursorX, cursorY, cursorWidth, cursorHeight);
        this.cursorObj.fill({ color: cursorColor, alpha: 0.8 });
      }
    }
  }
}
