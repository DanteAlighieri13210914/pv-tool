// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const crimeSceneTemplate: TemplateConfig = {
  name: 'Crime Scene',
  nameKey: 'tpl_crimeScene',
  palette: {
    background: '#0a0a0a',
    primary: '#cccccc',
    secondary: '#666666',
    accent: '#8b0000',
    text: '#ffffff',
  },
  animationSpeed: 2.5,
  effects: [
    {
      type: 'victimOutline',
      layer: 'background',
      config: {
        color: '#ffffff',
        alpha: 0.88,
        scale: 1.5,
        lineWidth: 5,
        seed: 914,
      },
    },
    {
      type: 'bloodSplatter',
      layer: 'background',
      config: {
        count: 5,
        color: '#8b0000',
        alpha: 0.85,
        size: 1.1,
        seed: 914,
      },
    },
    {
      type: 'textureBackground',
      layer: 'background',
      config: {
        pattern: 'dots',
      },
    },
    {
      type: 'staggeredText',
      layer: 'text',
      config: {
        color: '#ffffff',
        fontSize: 64,
        modeDuration: 3.5,
      },
    },
    {
      type: 'crimeTape',
      layer: 'decoration',
      config: {
        count: 6,
        tapeColor: '#f5c800',
        textColor: '#000000',
        tapeWidth: 52,
        speed: 70,
        text: 'POLICE LINE DO NOT CROSS',
        angleRange: 0.22,
      },
    },
    {
      type: 'vignette',
      layer: 'overlay',
      config: {
        color: '#000000',
        alpha: 0.72,
        radius: 0.65,
      },
    },
  ],
  postfx: {
    shake: 0,
    zoom: 0,
    tilt: 0,
    glitch: 0,
    hueShift: 0,
  },
};
