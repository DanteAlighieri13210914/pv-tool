// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const rainCityTemplate: TemplateConfig = {
  name: '黑客帝国',
  nameKey: 'tpl_rainCity',
  palette: {
    background: '#000000',
    primary: '#003b00',
    secondary: '#005500',
    accent: '#00ff41',
    text: '#00ff41',
  },
  effects: [
    {
      type: 'gradientOverlay',
      layer: 'background',
      config: {
        colorTop: '#003838',
        colorMid: '#004848',
        colorBottom: '#001020',
        alpha: 0.5,
        mode: 'linear',
      },
    },
    {
      type: 'fallingText',
      layer: 'decoration',
      config: {
        color: '$accent',
        count: 35,
        minSize: 24,
        maxSize: 68,
        fontFamily: '"Noto Serif JP", "Yu Mincho", serif',
      },
    },
    {
      type: 'chromaticAberration',
      layer: 'overlay',
      config: {
        offset: 4,
        flickerSpeed: 1.5,
      },
    },
    {
      type: 'vignette',
      layer: 'overlay',
      config: {
        color: '#000000',
        alpha: 0.7,
        radius: 0.6,
      },
    },
  ],
};