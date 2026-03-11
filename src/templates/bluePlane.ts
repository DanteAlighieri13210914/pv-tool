// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

/**
 * Faithful reproduction of reference BluePlaneTheme:
 * - Inverted/negative video (grayscale → invert → warm tint)
 * - Background blocks (random gray rectangles at 50% opacity)
 * - Concentric structural circles from center (5 rings, 100-500 radius)
 * - Diagonal structure lines (top-right to bottom-left grid)
 * - Burst lines (8 radial lines from center, 45° spacing)
 * - Target nodes with connections and dynamic trails
 * - Balancing circles (Klein blue/white circles with glow in periphery)
 * - 18 scattered physics formula text elements
 */
export const bluePlaneTemplate: TemplateConfig = {
  name: '蓝色构成(建议配合视频使用)',
  nameKey: 'tpl_bluePlane',
  palette: {
    background: '#f0ece6',
    primary: '#0028B4',
    secondary: '#c8c8c8',
    accent: '#3264E6',
    text: '#141414',
  },
  features: {
    motionDetection: true,
    invertMedia: true,
  },
  effects: [
    // Layer 0.5: Background blocks (random gray rectangles)
    {
      type: 'backgroundBlocks',
      layer: 'background',
      config: { count: 7, alpha: 0.5 },
    },
    // Structure: concentric circles from center
    {
      type: 'concentricCircles',
      layer: 'decoration',
      config: {
        count: 5, maxRadius: 500, x: 0.5, y: 0.5,
        color: '$secondary', strokeWidth: 1, alpha: 0.4,
        animation: 'none',
      },
    },
    // Structure: diagonal lines grid (i,0) → (0,i)
    {
      type: 'diagonalStructure',
      layer: 'decoration',
      config: { color: '#f0f0f0', alpha: 0.3, step: 100 },
    },
    // Burst: 8 radial lines from center (every 45°)
    {
      type: 'burstLines',
      layer: 'decoration',
      config: {
        color: '#b4b4b4', alpha: 0.25,
        rayCount: 8, innerRadius: 0.08, outerRadius: 0.65,
        rotSpeed: 0, x: 0.5, y: 0.5,
      },
    },
    // Target detection: node markers + skeleton connections + trails
    {
      type: 'motionBrackets',
      layer: 'overlay',
      config: {
        color: '$text', alpha: 0.7, lineWidth: 1, style: 'medium',
        showNodes: true, showConnections: true, showTrails: true,
        nodeColor: '#3264E6', connColor: '#888888', trailColor: '#3264E6',
        connMaxDist: 350,
      },
    },
    // Balancing circles: blue/white spheres with glow in periphery
    {
      type: 'balancingCircles',
      layer: 'decoration',
      config: {
        count: 5, blueColor: '#0028B4', whiteColor: '#ffffff', glowAlpha: 0.4,
      },
    },
    // Typography: 18 scattered physics formula strings
    {
      type: 'formulaText',
      layer: 'text',
      config: {
        color: '$text', count: 18, formulaRatio: 0.65,
        fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
      },
    },
    // Glowing text cards — characters as individual white cards
    {
      type: 'glowTextCards',
      layer: 'text',
      config: {
        cardColor: '#ffffff', textColor: '$text',
        fontSize: 72, glowAlpha: 0.5, charsPerRow: 5,
        x: 0.5, y: 0.45,
      },
    },
  ],
};