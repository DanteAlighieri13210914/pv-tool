// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

/**
 * 冷静的反派 — Calm Villain
 * 冷峻、精密、压迫感。深邃暗蓝背景，透视地格暗示掌控感，
 * 公式文字与构成线强调理性，故障条与扫描线注入危险气息，
 * 深色卡片主文字搭配冷光晕，整体克制而不失力量。
 */
export const calmVillainTemplate: TemplateConfig = {
  name: '冷静的反派',
  nameKey: 'tpl_calmVillain',
  palette: {
    background: '#f5c6d0',
    primary: '#2255cc',
    secondary: '#1a3388',
    accent: '#3377ff',
    text: '#1a2266',
  },
  effects: [
    // ── Background ──────────────────────────────
    { type: 'textureBackground', layer: 'background',
      config: { pattern: 'dots', color: '$secondary', alpha: 0.6 } },
    { type: 'checkerboard', layer: 'background',
      config: { cellSize: 64, color1: '#f0b8c4', color2: '#e8a0b0', alpha: 0.08 } },

    // ── Decoration ──────────────────────────────
    { type: 'perspectiveGrid', layer: 'decoration',
      config: { color: '$line', alpha: 0.5, lineWidth: 1.5, mode: 'floor', scrollSpeed: 0.25 } },
    { type: 'burstLines', layer: 'decoration',
      config: { color: '$line', alpha: 0.35, rayCount: 20, lineWidth: 2.5, rotSpeed: 0.03 } },
    { type: 'diagonalHatch', layer: 'decoration',
      config: { color: '$line', alpha: 0.28, spacing: 18, lineWidth: 1.2 } },
    { type: 'compositionGuides', layer: 'decoration',
      config: { color: '$line', alpha: 0.35, lineWidth: 1.5, guides: ['thirds'] } },
    { type: 'compositionGuides', layer: 'decoration',
      config: { color: '$line', alpha: 0.4, lineWidth: 1.8, guides: ['goldenSpiral'], rotSpeed: 0.06 } },
    { type: 'screenBorder', layer: 'decoration',
      config: { color: '$line', lineWidth: 2, alpha: 0.75, margin: 20, gap: 6, starSize: 4, edgeStarCount: 4, edgeStarCountV: 2 } },

    // ── Text ────────────────────────────────────
    { type: 'formulaText', layer: 'text',
      config: { color: '$line', count: 14, alpha: 0.4 } },
    { type: 'glowTextCards', layer: 'text',
      config: {
        cardColor: '#ffffff', textColor: '$text',
        glowColor: '$accent', glowAlpha: 0.6,
        fontSize: 68, charsPerRow: 5,
        sizeVariance: 0.18, staggerX: 8, staggerY: 5,
        cardPadding: 16, staggerDelay: 0.06,
        x: 0.47, y: 0.48,
        fontFamily: '"Noto Serif JP", "Yu Mincho", serif',
      } },
    { type: 'verticalSubText', layer: 'text',
      config: { color: '$line', fontSize: 12, x: 0.7, y: 0.3,
        fontFamily: '"Noto Serif JP", "Yu Mincho", serif' } },

    // ── Overlay ─────────────────────────────────
    { type: 'lightSpot', layer: 'overlay',
      config: { color: '#ffffff', x: 0.5, y: 0.08, alpha: 0.5, radius: 0.4 } },
    { type: 'dotScreen', layer: 'overlay',
      config: { spacing: 10, dotRadius: 1, color: '$line', alpha: 0.07, angle: 20 } },
    { type: 'scanlines', layer: 'overlay',
      config: { color: '#002244', alpha: 0.18, spacing: 4 } },
    { type: 'glitchBars', layer: 'overlay',
      config: { color: '$accent', alpha: 0.28 } },
    { type: 'vignette', layer: 'overlay',
      config: { color: '#d898a8', alpha: 0.5 } },
  ],
};
