// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const kineticSplitTemplate: TemplateConfig = {
  name: '斩击',
  nameKey: 'tpl_kineticSplit',
  palette: {
    background: '#f0ece8',
    primary: '#1a1a1a',
    secondary: '#ffffff',
    accent: '#8b1a1a',
    text: '#1a1a1a',
  },
  effects: [
    {
      type: 'diagonalHatch',
      layer: 'background',
      config: { spacing: 7, lineWidth: 0.6, color: '$accent', alpha: 0.1 },
    },
    {
      type: 'diagonalSplit',
      layer: 'decoration',
      config: {
        color: '$accent',
        alpha: 1,
        rotSpeed: 0.25,
        baseHalfAngle: 0.6,
        angleVariation: 0.3,
        initRotation: -1.5708,
        hatchSpacing: 6,
        centerSize: 12,
        centerColor: '$primary',
      },
    },
    {
      type: 'screenBorder',
      layer: 'decoration',
      config: { color: '$primary', lineWidth: 1.5, alpha: 0.5, margin: 18, gap: 5, starSize: 4, edgeStarCount: 4, edgeStarCountV: 2 },
    },
    {
      type: 'layeredText',
      layer: 'text',
      config: {
        color: '$primary',
        fontSize: 90,
        maxLayers: 4,
      },
    },
    {
      type: 'vignette',
      layer: 'overlay',
      config: { intensity: 0.3 },
    },
  ],
};