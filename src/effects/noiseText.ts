// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext } from '../core/types';
import { resolveColor } from '../core/types';

interface TextBlock {
  x: number;
  y: number;
  lines: string[];
  fontSize: number;
  alpha: number;
  lifetime: number;  // seconds
  born: number;      // ctx.time at spawn
  hasBackground: boolean;
  inverted: boolean;
  /** Last triggered corruption "step" (Math.floor(age / 0.083)). Used so
   *  corruption fires once per step (rising edge) instead of every frame
   *  the floor stays at a multiple-of-5 — the deltaTime migration's
   *  `Math.floor(age / 0.083) % 5 === 0` check is a 5-frame "burst" gate
   *  at 60fps because each floor unit covers 5 frames. -1 = never fired. */
  lastCorruptStep: number;
}

const GARBLED_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!?<>/\\|[]{}=+-_.:;';
const SYSTEM_FRAGMENTS = [
  'SIGNAL LOST', 'ERR:0x00FF', 'NO CARRIER', 'OVERFLOW', 'FATAL',
  'MEMORY DUMP', 'SECTOR 7-G', 'NULL PTR', 'TIMEOUT', 'CORRUPT',
  'SCAN FAILED', 'REBOOT', 'SYS HALT', 'DEADLOCK', 'ACCESS DENIED',
  'EOF REACHED', 'BAD ALLOC', 'SEGFAULT', 'KERNEL PANIC', 'DATA LOST',
  'CHECKSUM ERR', 'BUS ERROR', 'STACK OVERFLOW', 'ABORT', 'UNDEFINED',
];

/**
 * Corrupted / garbled text blocks that flicker and regenerate,
 * simulating corrupted digital displays and information overload.
 */
export class NoiseText extends BaseEffect {
  readonly name = 'noiseText';
  override readonly heavy = true;
  private g!: PIXI.Graphics;
  private blocks: TextBlock[] = [];
  protected setup(): void {
    this.g = new PIXI.Graphics();
    this.container.addChild(this.g);
  }

  private randomString(len: number): string {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += GARBLED_CHARS[Math.floor(Math.random() * GARBLED_CHARS.length)];
    }
    return s;
  }

  private spawnBlock(w: number, h: number, time: number): TextBlock {
    const lineCount = 1 + Math.floor(Math.random() * 5);
    const lines: string[] = [];
    const useSystem = Math.random() < 0.35;

    for (let i = 0; i < lineCount; i++) {
      if (useSystem && i === 0) {
        lines.push(SYSTEM_FRAGMENTS[Math.floor(Math.random() * SYSTEM_FRAGMENTS.length)]);
      } else {
        const len = 4 + Math.floor(Math.random() * 18);
        lines.push(this.randomString(len));
      }
    }

    return {
      x: Math.random() * w * 0.9,
      y: Math.random() * h * 0.9,
      lines,
      fontSize: 10 + Math.floor(Math.random() * 14),
      alpha: 0.5 + Math.random() * 0.5,
      lifetime: 0.5 + Math.random() * 2,
      born: time,
      hasBackground: Math.random() < 0.6,
      inverted: Math.random() < 0.3,
      lastCorruptStep: -1,
    };
  }

  update(ctx: UpdateContext): void {
    const g = this.g;
    g.clear();

    const w = ctx.screenWidth;
    const h = ctx.screenHeight;
    const count = this.config.count ?? 12;
    const color = resolveColor(this.config.color ?? '#ffffff', this.palette);
    const bgColor = resolveColor(this.config.bgColor ?? '#000000', this.palette);

    // Spawn new blocks to maintain count
    while (this.blocks.length < count) {
      this.blocks.push(this.spawnBlock(w, h, ctx.time));
    }

    // Update and render
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      const age = ctx.time - block.born;  // seconds

      if (age > block.lifetime || age < 0) {
        this.blocks[i] = this.spawnBlock(w, h, ctx.time);
        continue;
      }

      // Flicker: occasionally skip rendering
      if (ctx.deltaTime > 0 && Math.random() < 0.08) continue;

      // Occasionally corrupt a character. Trigger on the RISING EDGE of
      // each ~0.083s step (one chance per step, NOT per frame within a
      // step). The old `tick % 5 === 0` worked at 60fps because tick
      // monotonically increased and only one frame per 5 satisfied the
      // gate; under deltaTime, `step = floor(age/0.083)` IS the per-step
      // index, so we must promote the rising-edge guard with
      // `lastCorruptStep` BEFORE the random roll — otherwise unsuccessful
      // rolls within the same step keep retrying every frame (5 retries ×
      // p=0.3 ≈ 83 % chance per step → ~10/sec instead of ~3.6/sec).
      // Setting lastCorruptStep unconditionally on each step transition
      // restores the old 12 steps/sec × 0.3 ≈ 3.6 corruptions/sec rate.
      const step = Math.floor(age / 0.083);
      if (step !== block.lastCorruptStep) {
        block.lastCorruptStep = step;
        if (Math.random() < 0.3) {
          const lineIdx = Math.floor(Math.random() * block.lines.length);
          const line = block.lines[lineIdx];
          const charIdx = Math.floor(Math.random() * line.length);
          block.lines[lineIdx] =
            line.substring(0, charIdx) +
            GARBLED_CHARS[Math.floor(Math.random() * GARBLED_CHARS.length)] +
            line.substring(charIdx + 1);
        }
      }

      const fadeIn = Math.min(1, age / 0.083);
      const fadeOut = Math.min(1, (block.lifetime - age) / 0.133);
      const a = block.alpha * fadeIn * fadeOut;

      const textCol = block.inverted ? bgColor : color;
      const bgCol = block.inverted ? color : bgColor;

      const lineH = block.fontSize * 1.3;
      const maxLineW = Math.max(...block.lines.map(l => l.length)) * block.fontSize * 0.62;
      const blockH = block.lines.length * lineH + 4;

      if (block.hasBackground) {
        g.rect(block.x - 2, block.y - 2, maxLineW + 4, blockH);
        g.fill({ color: bgCol, alpha: a * 0.85 });
      }

      for (let li = 0; li < block.lines.length; li++) {
        const text = block.lines[li];
        const tx = block.x;
        const ty = block.y + li * lineH;

        // Render each character as a rectangle (monospace simulation)
        for (let ci = 0; ci < text.length; ci++) {
          const cx = tx + ci * block.fontSize * 0.62;
          const char = text[ci];
          const charCode = char.charCodeAt(0);

          // Use char code to deterministically fill pixels in a small grid
          const cellW = block.fontSize * 0.55;
          const cellH = block.fontSize * 0.9;
          const gridCols = 4;
          const gridRows = 6;
          const pixW = cellW / gridCols;
          const pixH = cellH / gridRows;

          for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
              const bit = ((charCode * 7 + row * 13 + col * 31 + ci * 3) % 5);
              if (bit < 3) {
                g.rect(cx + col * pixW, ty + row * pixH, pixW - 0.5, pixH - 0.5);
              }
            }
          }
        }
      }
      g.fill({ color: textCol, alpha: a });
    }
  }
}
