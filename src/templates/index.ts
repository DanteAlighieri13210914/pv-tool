// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { TemplateConfig } from '../core/types';
import { blueBoldTemplate } from './blueBold';
import { kineticSplitTemplate } from './kineticSplit';
import { bluePlaneTemplate } from './bluePlane';
import { rainCityTemplate } from './rainCity';
import { geometricTemplate } from './geometric';
import { cyberpunkHudTemplate } from './cyberpunkHud';
import { emotionCinemaTemplate } from './emotionCinema';
import { hystericNightTemplate } from './hystericNight';
import { cyberGrungeTemplate } from './cyberGrunge';
import { spiderWebTemplate } from './spiderWeb';
import { staggeredTextTplTemplate } from './staggeredTextTpl';
import { calmVillainTemplate } from './calmVillain';
import { girlyCloudTemplate } from './girlyClouds';
import { sweetPinkTemplate } from './sweetPink';
import { flyMeToTheMoonTemplate } from './flyMeToTheMoon';
import { kawaiPixelTemplate } from './kawaiPixel';

export const templates: TemplateConfig[] = [
  blueBoldTemplate,          // 0  蓝色冲击
  kineticSplitTemplate,      // 1  斩击
  bluePlaneTemplate,         // 2  蓝色构成(建议配合视频使用)
  cyberGrungeTemplate,       // 3  赛博废墟
  geometricTemplate,         // 4  几何
  rainCityTemplate,          // 5  黑客帝国
  cyberpunkHudTemplate,      // 6  夜之城监控(建议配合视频使用)
  emotionCinemaTemplate,     // 7  情绪电影(建议配合视频使用)
  hystericNightTemplate,     // 8  歇斯底里之夜(光敏慎点)
  spiderWebTemplate,         // 9  蛛网
  staggeredTextTplTemplate,  // 10 错落文字
  calmVillainTemplate,       // 11 冷静的反派
  girlyCloudTemplate,        // 12 少女云朵
  sweetPinkTemplate,         // 13 格子花边
  flyMeToTheMoonTemplate,    // 14 Fly Me to the Moon
  kawaiPixelTemplate,        // 15 Kawaii像素
];

export function getTemplate(name: string): TemplateConfig | undefined {
  return templates.find(t => t.name === name);
}