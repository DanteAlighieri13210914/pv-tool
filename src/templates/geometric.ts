// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const geometricTemplate: TemplateConfig = {
  name: '几何',
  nameKey: 'tpl_geometric',
  palette: {
    background: '#ffee00',
    primary: '#1a1a1a',
    secondary: '#ffffff',
    accent: '#888888',
    text: '#ffffff',
  },
  effects: [
    {
      type: 'diagonalHatch',
      layer: 'background',
      config: { spacing: 8, lineWidth: 0.7, color: '$accent', alpha: 0.14 },
    },
    {
      type: 'screenBorder',
      layer: 'decoration',
      config: { color: '$primary', lineWidth: 1.5, alpha: 0.6, margin: 22, gap: 6, starSize: 5, edgeStarCount: 5, edgeStarCountV: 3 },
    },
    {
      type: 'centeredSquares',
      layer: 'decoration',
      config: {
        outerSize: 320,
        midSize: 240,
        innerSize: 170,
        borderColor: '$primary',
        midColor: '$primary',
        innerColor: '$secondary',
        fontSize: 52,
        charSpreadFrac: 0.5,
        staggerY: 18,
      },
    },
    {
      type: 'vignette',
      layer: 'overlay',
      config: { intensity: 0.35 },
    },
  ],
};