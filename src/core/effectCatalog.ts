// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import type { LayerType } from './types';

export interface EffectPreset {
  type: string;
  label: string;
  category: string;
  layer: LayerType;
  config: Record<string, any>;
}

export const effectCatalog: EffectPreset[] = [
  // 背景 Background
  { type: 'textureBackground', label: '纹理背景 Texture BG', category: '背景', layer: 'background', config: { pattern: 'dots' } },
  { type: 'gradientOverlay', label: '渐变蒙版 Gradient', category: '背景', layer: 'background', config: { colorTop: '#003838', colorBottom: '#001020', alpha: 0.5 } },
  { type: 'triangleGrid', label: '三角网格 TriGrid', category: '背景', layer: 'background', config: { color: '$secondary', alpha: 0.2, cols: 10 } },
  { type: 'backgroundBlocks', label: '背景色块 Blocks', category: '背景', layer: 'background', config: { count: 7, alpha: 0.5 } },
  { type: 'breathingBlocks', label: '呼吸方块 Blocks', category: '背景', layer: 'background', config: { count: 8 } },
  { type: 'checkerboard', label: '棋盘格 Checker', category: '背景', layer: 'background', config: { cellSize: 40, color1: '#000000', color2: '#ffffff', alpha: 0.08 } },

  // 几何装饰 Geometry
  { type: 'concentricCircles', label: '同心圆 Circles', category: '几何装饰', layer: 'decoration', config: { color: '$secondary', count: 5 } },
  { type: 'diamondShapes', label: '菱形 Diamonds', category: '几何装饰', layer: 'decoration', config: { color: '$secondary' } },
  { type: 'crossPattern', label: '十字图案 Cross', category: '几何装饰', layer: 'decoration', config: { color: '$secondary' } },
  { type: 'scatteredShapes', label: '散布形状 Shapes', category: '几何装饰', layer: 'decoration', config: { color: '$secondary' } },
  { type: 'halftoneBlocks', label: '半调色块 Halftone', category: '几何装饰', layer: 'decoration', config: { color: '$accent' } },
  { type: 'shadowShapes', label: '阴影形状 Shadow', category: '几何装饰', layer: 'decoration', config: { color: '#ffffff', shadowColor: '#000055' } },
  { type: 'centeredSquares', label: '居中方块 Squares', category: '几何装饰', layer: 'decoration', config: {} },
  { type: 'balancingCircles', label: '平衡圆 Circles', category: '几何装饰', layer: 'decoration', config: { count: 5, blueColor: '#0028B4' } },
  { type: 'radialRectangles', label: '放射矩形 RadialRect', category: '几何装饰', layer: 'decoration', config: { count: 14, baseColor: '#1133aa', edgeColor: '#cccc00' } },

  // 线条结构 Lines
  { type: 'flowingLines', label: '流动线条 Lines', category: '线条结构', layer: 'decoration', config: { color: '$secondary', count: 20 } },
  { type: 'diagonalFill', label: '斜线填充 Diagonal', category: '线条结构', layer: 'decoration', config: { color: '$secondary' } },
  { type: 'diagonalHatch', label: '斜线网格 Hatch', category: '线条结构', layer: 'decoration', config: { color: '$secondary', alpha: 0.3 } },
  { type: 'parallelogramStripes', label: '平行四边形 Stripes', category: '线条结构', layer: 'decoration', config: {} },
  { type: 'diagonalSplit', label: '对角分割 Split', category: '线条结构', layer: 'decoration', config: { color: '$accent', alpha: 1, rotSpeed: 0.25 } },
  { type: 'diagonalStructure', label: '对角线结构 DiagStruct', category: '线条结构', layer: 'decoration', config: { color: '#f0f0f0', alpha: 0.3, step: 100 } },
  { type: 'burstLines', label: '放射线 Burst', category: '线条结构', layer: 'decoration', config: { color: '$secondary', alpha: 0.2, rayCount: 24 } },
  { type: 'screenBorder', label: '屏幕边框 Border', category: '线条结构', layer: 'decoration', config: { color: '$primary' } },
  { type: 'dashedGuideLines', label: '虚线参考 Dashed', category: '线条结构', layer: 'decoration', config: { color: '$accent' } },
  { type: 'perspectiveGrid', label: '透视网格 PerspGrid', category: '线条结构', layer: 'decoration', config: { color: '$primary', alpha: 0.3, mode: 'floor', scrollSpeed: 0.5 } },
  { type: 'compositionGuides', label: '构成线 CompGuide', category: '线条结构', layer: 'decoration', config: { color: '$text', alpha: 0.2, guides: ['goldenSpiral'] } },
  { type: 'webLines', label: '蛛网线 WebLines', category: '线条结构', layer: 'decoration', config: { count: 22, color: '#ff2222', glowColor: '#ff4444', focalX: 0.5, focalY: 0.45, spread: 0.25 } },

  // 文字 Text
  { type: 'heroText', label: '主标题 Hero', category: '文字', layer: 'text', config: { color: '$text' } },
  { type: 'scatteredText', label: '散布文字 Scattered', category: '文字', layer: 'text', config: { color: '$secondary' } },
  { type: 'textStrip', label: '文字条 Strip', category: '文字', layer: 'text', config: { color: '$text', bgColor: '$accent' } },
  { type: 'textCards', label: '文字卡片 Cards', category: '文字', layer: 'text', config: { color: '$text' } },
  { type: 'bigOutlineText', label: '大字描边 BigText', category: '文字', layer: 'text', config: { color: '#e0e0e0', strokeColor: '#ffffff' } },
  { type: 'layeredText', label: '叠层文字 Layered', category: '文字', layer: 'text', config: { color: '$text' } },
  { type: 'glowTextCards', label: '发光卡片字 GlowCards', category: '文字', layer: 'text', config: { cardColor: '#ffffff', textColor: '#1a1a1a', fontSize: 68 } },
  { type: 'verticalSubText', label: '竖排副文字 VertSub', category: '文字', layer: 'text', config: { color: '#ffffff', fontSize: 13 } },
  { type: 'formulaText', label: '公式文字 Formula', category: '文字', layer: 'text', config: { color: '$text', count: 18 } },
  { type: 'fallingText', label: '文字雨 Falling', category: '文字', layer: 'decoration', config: { color: '$accent', count: 30 } },
  { type: 'staggeredText', label: '错落文字 Staggered', category: '文字', layer: 'text', config: { color: '#ffffff', fontSize: 64, modeDuration: 3.5 } },

  // 叠加效果 Overlay
  { type: 'colorMask', label: '颜色蒙版 Mask', category: '叠加效果', layer: 'overlay', config: { color: '$accent', alpha: 0.3 } },
  { type: 'chromaticAberration', label: '色差 Chromatic', category: '叠加效果', layer: 'overlay', config: { offset: 3 } },
  { type: 'glitchBars', label: '故障条 Glitch', category: '叠加效果', layer: 'overlay', config: { color: '$accent' } },
  { type: 'vignette', label: '暗角 Vignette', category: '叠加效果', layer: 'overlay', config: { color: '#000000', alpha: 0.6 } },
  { type: 'scanlines', label: '扫描线 Scanlines', category: '叠加效果', layer: 'overlay', config: { color: '#003333', alpha: 0.12, spacing: 4 } },
  { type: 'filmGrain', label: '胶片噪点 Grain', category: '叠加效果', layer: 'overlay', config: { alpha: 0.08, mono: true, updateInterval: 3 } },
  { type: 'dotScreen', label: '网点纹理 Dots', category: '叠加效果', layer: 'overlay', config: { spacing: 8, dotRadius: 1.5, color: '$text', alpha: 0.12, angle: 15 } },

  // HUD
  { type: 'hudCorners', label: 'HUD角框 Corners', category: 'HUD', layer: 'decoration', config: { color: '$primary', margin: 20, armLength: 40 } },
  { type: 'hudStatusText', label: 'HUD状态 Status', category: 'HUD', layer: 'text', config: { textColor: '$text', alertColor: '$accent' } },
  { type: 'hudInfoPanel', label: 'HUD信息卡 Panel', category: 'HUD', layer: 'overlay', config: { primaryColor: '$primary', alertColor: '$accent' } },
  { type: 'rulerGuide', label: '标尺 Ruler', category: 'HUD', layer: 'decoration', config: { color: '#ffffff', alpha: 0.5 } },
  { type: 'targetGuide', label: '瞄准线 Target', category: 'HUD', layer: 'decoration', config: { color: '#6666cc' } },
  { type: 'motionBrackets', label: '运动框 Motion', category: 'HUD', layer: 'overlay', config: { color: '#00ffcc', alpha: 0.8, style: 'high' } },

  // 有机形态 Organic
  { type: 'glowRing', label: '光圈 GlowRing', category: '有机形态', layer: 'decoration', config: { colorInner: '#4444ff', colorOuter: '#cc22aa' } },
  { type: 'lightSpot', label: '亮光 LightSpot', category: '有机形态', layer: 'overlay', config: { color: '#ffffff', x: 0.5, y: 0.1, alpha: 0.45 } },
  { type: 'organicBlob', label: '有机Blob Blob', category: '有机形态', layer: 'decoration', config: { shape: 'blob', color: '$primary', alpha: 0.25, count: 3 } },
  { type: 'organicBlob', label: '海浪 Wave', category: '有机形态', layer: 'decoration', config: { shape: 'wave', color: '$primary', alpha: 0.3, layers: 4, amplitude: 40, waveY: 0.6 } },
  { type: 'organicBlob', label: '云团 Cloud', category: '有机形态', layer: 'decoration', config: { shape: 'cloud', color: '$secondary', alpha: 0.2, count: 3 } },
  { type: 'smearBrush', label: '涂抹笔触 Smear', category: '有机形态', layer: 'decoration', config: { count: 8, grainAlpha: 0.04 } },

  // 数字废墟 Digital Grunge
  { type: 'noiseText', label: '乱码文字 NoiseText', category: '数字废墟', layer: 'decoration', config: { count: 10, color: '#ffffff', bgColor: '#000000' } },
  { type: 'dataMonitors', label: '数据终端 Monitors', category: '数字废墟', layer: 'decoration', config: { count: 4, borderColor: '#ffffff', fillColor: '#000000', dataColor: '#ffffff', alpha: 0.7 } },

  // 特殊形状 Special Shape
  { type: 'paperTear', label: '撕裂纸张 PaperTear', category: '特殊形状', layer: 'overlay', config: { seed: 914, borderWidth: 7 } },
  { type: 'jigsawGrid', label: '拼图网格 Jigsaw', category: '特殊形状', layer: 'decoration', config: { cols: 8, rows: 5, color: '$line', alpha: 0.5, lineWidth: 2 } },

  // 云朵条纹 Clouds & Stripes
  { type: 'edgeClouds', label: '边缘云朵 EdgeClouds', category: '云朵条纹', layer: 'decoration', config: { color: '#ffffff', alpha: 1.0, cloudCount: 5, baseRadius: 100, seed: 914 } },
  { type: 'pinkStripes', label: '粉色条纹 PinkStripes', category: '云朵条纹', layer: 'background', config: { pinkColor: '#fbbdbe', stripeWidth: 150, speed: 0.3, angle: -45 } },
];