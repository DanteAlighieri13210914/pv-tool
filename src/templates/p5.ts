// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';

export const p5Template: TemplateConfig = {
  name: 'P5',
  nameKey: 'tpl_p5',
  palette: {
    background: '#ffffff',
    primary: '#000000',
    secondary: '#333333',
    accent: '#ED1C24',
    text: '#000000',
  },
  bgOpacity: 0,
  effects: [
    { type: 'paperTear', layer: 'overlay', config: {
      fillColor: '#ED1C24',
      edgeColor: '#000000',
      borderWidth: 7,
      seed: 42,
    }},
  ],
};
