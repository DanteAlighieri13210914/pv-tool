// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const spiderWebTemplate: TemplateConfig = {
  name: '蛛网',
  nameKey: 'tpl_spiderWeb',
  palette: {
    background: '#000000',
    primary: '#ff2222',
    secondary: '#cc0000',
    accent: '#ff4444',
    text: '#ffffff',
  },
  effects: [
    // Dense red scanlines — horizontal stripe texture
    { type: 'scanlines', layer: 'overlay', config: {
      color: '#cc0000', alpha: 0.18, spacing: 3,
    }},

    // Halftone dot screen — subtle print texture
    { type: 'dotScreen', layer: 'overlay', config: {
      spacing: 7, dotRadius: 1.8, color: '#ff2222', alpha: 0.1, angle: 30,
    }},

    // Primary web lines — tangled red threads converging to center
    { type: 'webLines', layer: 'decoration', config: {
      count: 24, color: '#ff2222', glowColor: '#ff4444',
      focalX: 0.5, focalY: 0.45, spread: 0.2,
      rebuildChance: 0.01,
    }},

    // Secondary web lines — sparser, wider spread for depth
    { type: 'webLines', layer: 'decoration', config: {
      count: 8, color: '#cc0000', glowColor: '#ff2222',
      focalX: 0.5, focalY: 0.5, spread: 0.6,
      rebuildChance: 0.005,
    }},

    // Chromatic aberration — RGB split for aggressive impact
    { type: 'chromaticAberration', layer: 'overlay', config: {
      amount: 4, angle: 0.2,
    }},

    // Glitch bars — occasional horizontal disruption
    { type: 'glitchBars', layer: 'overlay', config: {
      color: '#ff1111', alpha: 0.35,
    }},

    // Lyrics
    { type: 'heroText', layer: 'text', config: {
      color: '#ffffff', fontSize: 52,
      strokeColor: '#000000', strokeWidth: 2,
      letterSpacing: 8,
    }},

    // Vignette — dark edges
    { type: 'vignette', layer: 'overlay', config: {
      color: '#000000', alpha: 0.5,
    }},
  ],
};
