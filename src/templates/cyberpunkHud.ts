// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

/**
 * Faithful reproduction of reference CyberpunkTheme:
 *
 * Render pipeline (original order):
 * 1. Triangle grid background (30% overlay, step = width/8.5, grid_color)
 * 2. Static elements:
 *    - Scanlines every 4px in dark teal
 *    - L-shaped corner brackets at 4 corners (primary, 40px arms, 2px)
 *    - "SYS.MONITOR // ONLINE" center-top (text color)
 *    - "NETWATCH // PROTOCOL V.2.0.77" right-top (alert color)
 * 3. Target markers (3 priority levels):
 *    - Low: gray triangle + vertical line
 *    - Medium: corner brackets (primary, 1px)
 *    - High: extended brackets with offset + "NO MATCH" header bar +
 *            X crosshair + warning triangle "!" + callout "MATCH: XX%"
 * 4. Detail card panel for primary target (right side):
 *    - Semi-transparent dark panel with accent bar
 *    - TARGET ID, avatar placeholder, NAME/GENDER/HEIGHT/THREAT/NOTES
 *    - "ARASAKA INTEL // CLASSIFIED" footer
 *
 * Original colors (from config, BGR→RGB):
 *   primary: (0,255,255) → #FFFF00 Yellow
 *   alert:   (0,0,255)   → #FF0000 Red
 *   text:    (255,255,255)→ #FFFFFF White
 *   grid:    (0,50,50)   → #323200 Dark olive
 */
export const cyberpunkHudTemplate: TemplateConfig = {
  name: '夜之城监控(建议配合视频使用)',
  nameKey: 'tpl_cyberpunkHud',
  palette: {
    background: '#0a0a0a',
    primary: '#FFFF00',
    secondary: '#323200',
    accent: '#FF0000',
    text: '#FFFFFF',
  },
  bpm: 140,
  features: {
    motionDetection: true,
  },
  effects: [
    // 1. Triangle grid background (30% opacity, ~8.5 columns)
    {
      type: 'triangleGrid',
      layer: 'background',
      config: { color: '$secondary', alpha: 0.3, cols: 9 },
    },
    // 2a. Scanlines every 4px
    {
      type: 'scanlines',
      layer: 'overlay',
      config: { color: '#001414', alpha: 0.15, spacing: 4 },
    },
    // 2b. L-shaped corner brackets at screen edges
    {
      type: 'hudCorners',
      layer: 'decoration',
      config: {
        color: '$primary', alpha: 0.9,
        margin: 20, armLength: 40, lineWidth: 2,
      },
    },
    // 2c. System status text
    {
      type: 'hudStatusText',
      layer: 'text',
      config: {
        textColor: '$text',
        alertColor: '$accent',
        centerText: 'SYS.MONITOR // ONLINE',
        rightText: 'NETWATCH // PROTOCOL V.2.0.77',
        fontSize: 13,
      },
    },
    // 3. Target markers (high priority style with full decorations)
    {
      type: 'motionBrackets',
      layer: 'overlay',
      config: {
        color: '$accent', alpha: 0.85, lineWidth: 2, style: 'high',
      },
    },
    // 4. Detail card panel (right side)
    {
      type: 'hudInfoPanel',
      layer: 'overlay',
      config: {
        primaryColor: '$primary',
        alertColor: '$accent',
        textColor: '$text',
        gridColor: '#323200',
        panelWidth: 240, panelHeight: 420,
      },
    },
    // Main text at bottom
    {
      type: 'heroText',
      layer: 'text',
      config: {
        fontSize: 36, x: 0.5, y: 0.92,
        color: '$primary', fontWeight: 'bold',
        fontFamily: '"Courier New", monospace',
        animation: 'breathe', animationSpeed: 0.5, animationAmount: 0.03,
      },
    },
  ],
};