// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const girlyCloudTemplate: TemplateConfig = {
  name: '少女云朵',
  palette: {
    background: '#fef5f8',
    primary: '#fbbdbe',
    secondary: '#f8d7da',
    accent: '#ff9eb5',
    text: '#5a3a3f',
  },
  bpm: 120,
  animationSpeed: 1.5,
  effects: [
    {
      type: 'pinkStripes',
      layer: 'background',
      config: {
        pinkColor: '#fbbdbe',
        stripeWidth: 150,
        speed: 0.3,
        angle: -45,
        alpha: 1.0,
      },
    },
    {
      type: 'edgeClouds',
      layer: 'decoration',
      config: {
        color: '#ffffff',
        alpha: 1.0,
        cloudCount: 5,
        baseRadius: 100,
        minCircles: 6,
        maxCircles: 10,
        shadowOffsetX: 4,
        shadowOffsetY: 4,
        shadowAlpha: 0.25,
        shadowColor: '#fbbdbe',
      },
    },
    {
      type: 'heroText',
      layer: 'text',
      config: {
        color: '#5a3a3f',
        fontSize: 72,
        fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif',
      },
    },
  ],
};
