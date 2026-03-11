// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

/**
 * Based on reference frame_0002.jpg:
 * Dark background with radially arranged blue gradient rectangles
 * (yellow glowing edges), main text as individual character cards
 * with white backgrounds and glow, previous text as small vertical
 * white columns, all under a black→deep-blue→light-blue radial mask.
 *
 * Animation: rectangles rotate radially and grow; text cards appear
 * with staggered fade-in.
 */
export const hystericNightTemplate: TemplateConfig = {
  name: '歇斯底里之夜(光敏慎点)',
  nameKey: 'tpl_hystericNight',
  palette: {
    background: '#ffffff',
    primary: '#1133aa',
    secondary: '#2244cc',
    accent: '#cccc00',
    text: '#1a1a1a',
  },
  bpm: 130,
  effects: [
    // Radially arranged blue gradient rectangles with yellow edges
    {
      type: 'radialRectangles',
      layer: 'decoration',
      config: {
        count: 14,
        baseColor: '#1133aa',
        edgeColor: '#cccc00',
        edgeBlur: 8,
        x: 0.47, y: 0.48,
        rotSpeed: 0.08,
        growSpeed: 0.03,
      },
    },
    // Radial gradient overlay: transparent center → deep blue → black edges
    {
      type: 'gradientOverlay',
      layer: 'overlay',
      config: {
        mode: 'radial',
        colorTop: '#0a1535',
        colorBottom: '#000000',
        alpha: 0.55,
      },
    },
    // Main text: individual character cards with white bg + glow
    {
      type: 'glowTextCards',
      layer: 'text',
      config: {
        cardColor: '#ffffff',
        textColor: '#1a1a1a',
        glowColor: '#ffffff',
        glowAlpha: 0.6,
        fontSize: 68,
        charsPerRow: 5,
        sizeVariance: 0.25,
        staggerX: 10,
        staggerY: 6,
        cardPadding: 16,
        staggerDelay: 0.07,
        x: 0.47, y: 0.48,
        fontFamily: '"Noto Serif JP", "Yu Mincho", serif',
      },
    },
    // Previous line text: small vertical white columns
    {
      type: 'verticalSubText',
      layer: 'text',
      config: {
        color: '#ffffff',
        fontSize: 13,
        x: 0.65, y: 0.33,
        charsPerCol: 5,
        fontFamily: '"Noto Serif JP", "Yu Mincho", serif',
      },
    },
    // Subtle vignette to darken edges further
    {
      type: 'vignette',
      layer: 'overlay',
      config: { color: '#000000', alpha: 0.45 },
    },
    // Small scattered decorative dots
    {
      type: 'scatteredShapes',
      layer: 'decoration',
      config: {
        count: 30, color: '#4466cc',
        shapes: ['circle'], minSize: 1, maxSize: 3, alpha: 0.3,
      },
    },
  ],
};