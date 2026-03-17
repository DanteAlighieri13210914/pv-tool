// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { ColorPalette } from '../core/types';

import { TextureBackground } from './textureBackground';
import { HeroText } from './heroText';
import { Vignette } from './vignette';
import { ConcentricCircles } from './concentricCircles';
import { DiamondShapes } from './diamondShapes';
import { FlowingLines } from './flowingLines';
import { ScatteredText } from './scatteredText';
import { CrossPattern } from './crossPattern';
import { ScatteredShapes } from './scatteredShapes';
import { HalftoneBlocks } from './halftoneBlocks';
import { TextStrip } from './textStrip';
import { ColorMask } from './colorMask';
import { ChromaticAberration } from './chromaticAberration';
import { GlitchBars } from './glitchBars';
import { TextCards } from './textCards';
import { DiagonalFill } from './diagonalFill';
import { ParallelogramStripes } from './parallelogramStripes';
import { DashedGuideLines } from './dashedGuideLines';
import { DiagonalHatch } from './diagonalHatch';
import { ScreenBorder } from './screenBorder';
import { CenteredSquares } from './centeredSquares';
import { DiagonalSplit } from './diagonalSplit';
import { LayeredText } from './layeredText';
import { FallingText } from './fallingText';
import { GradientOverlay } from './gradientOverlay';
import { ShadowShapes } from './shadowShapes';
import { BigOutlineText } from './bigOutlineText';
import { CuteOutlineText } from './cuteOutlineText';
import { GlowRing } from './glowRing';
import { TargetGuide } from './targetGuide';
import { LightSpot } from './lightSpot';
import { TriangleGrid } from './triangleGrid';
import { Scanlines } from './scanlines';
import { BurstLines } from './burstLines';
import { MotionBrackets } from './motionBrackets';
import { FormulaText } from './formulaText';
import { BalancingCircles } from './balancingCircles';
import { BackgroundBlocks } from './backgroundBlocks';
import { DiagonalStructure } from './diagonalStructure';
import { HudCorners } from './hudCorners';
import { HudStatusText } from './hudStatusText';
import { HudInfoPanel } from './hudInfoPanel';
import { GlowTextCards } from './glowTextCards';
import { VerticalSubText } from './verticalSubText';
import { RadialRectangles } from './radialRectangles';
import { RulerGuide } from './rulerGuide';
import { BreathingBlocks } from './breathingBlocks';
import { FilmGrain } from './filmGrain';
import { DotScreen } from './dotScreen';
import { Checkerboard } from './checkerboard';
import { PerspectiveGrid } from './perspectiveGrid';
import { CompositionGuides } from './compositionGuides';
import { OrganicBlob } from './organicBlob';
import { NoiseText } from './noiseText';
import { DataMonitors } from './dataMonitors';
import { SmearBrush } from './smearBrush';
import { WebLines } from './webLines';
import { StaggeredText } from './staggeredText';
import { EdgeClouds } from './edgeClouds';
import { PinkStripes } from './pinkStripes';
import { PinkGrid } from './pinkGrid';
import { ScalloppedBorder } from './scalloppedBorder';
import { PulsingCircle } from './pulsingCircle';
import { JigsawGrid } from './jigsawGrid';
import { PaperTear } from './paperTear';
import { StarTrail } from './starTrail';
import { Planet } from './planet';
import { PixelWindow } from './pixelWindow';
import { DesktopIcon } from './desktopIcon';
import { PixelBackground } from './pixelBackground';
import { PixelTypewriter } from './pixelTypewriter';
import { HeartVoice } from './heartVoice';

type EffectConstructor = new () => BaseEffect;

const registry = new Map<string, EffectConstructor>();

function register(name: string, ctor: EffectConstructor) {
  registry.set(name, ctor);
}

register('textureBackground', TextureBackground);
register('heroText', HeroText);
register('vignette', Vignette);
register('concentricCircles', ConcentricCircles);
register('diamondShapes', DiamondShapes);
register('flowingLines', FlowingLines);
register('scatteredText', ScatteredText);
register('crossPattern', CrossPattern);
register('scatteredShapes', ScatteredShapes);
register('halftoneBlocks', HalftoneBlocks);
register('textStrip', TextStrip);
register('colorMask', ColorMask);
register('chromaticAberration', ChromaticAberration);
register('glitchBars', GlitchBars);
register('textCards', TextCards);
register('diagonalFill', DiagonalFill);
register('parallelogramStripes', ParallelogramStripes);
register('dashedGuideLines', DashedGuideLines);
register('diagonalHatch', DiagonalHatch);
register('screenBorder', ScreenBorder);
register('centeredSquares', CenteredSquares);
register('diagonalSplit', DiagonalSplit);
register('layeredText', LayeredText);
register('fallingText', FallingText);
register('gradientOverlay', GradientOverlay);
register('shadowShapes', ShadowShapes);
register('bigOutlineText', BigOutlineText);
register('cuteOutlineText', CuteOutlineText);
register('glowRing', GlowRing);
register('targetGuide', TargetGuide);
register('lightSpot', LightSpot);
register('triangleGrid', TriangleGrid);
register('scanlines', Scanlines);
register('burstLines', BurstLines);
register('motionBrackets', MotionBrackets);
register('formulaText', FormulaText);
register('balancingCircles', BalancingCircles);
register('backgroundBlocks', BackgroundBlocks);
register('diagonalStructure', DiagonalStructure);
register('hudCorners', HudCorners);
register('hudStatusText', HudStatusText);
register('hudInfoPanel', HudInfoPanel);
register('glowTextCards', GlowTextCards);
register('verticalSubText', VerticalSubText);
register('radialRectangles', RadialRectangles);
register('rulerGuide', RulerGuide);
register('breathingBlocks', BreathingBlocks);
register('filmGrain', FilmGrain);
register('dotScreen', DotScreen);
register('checkerboard', Checkerboard);
register('perspectiveGrid', PerspectiveGrid);
register('compositionGuides', CompositionGuides);
register('organicBlob', OrganicBlob);
register('noiseText', NoiseText);
register('dataMonitors', DataMonitors);
register('smearBrush', SmearBrush);
register('webLines', WebLines);
register('staggeredText', StaggeredText);
register('edgeClouds', EdgeClouds);
register('pinkStripes', PinkStripes);
register('pinkGrid', PinkGrid);
register('scalloppedBorder', ScalloppedBorder);
register('pulsingCircle', PulsingCircle);
register('jigsawGrid', JigsawGrid);
register('paperTear', PaperTear);
register('starTrail', StarTrail);
register('planet', Planet);
register('pixelWindow', PixelWindow);
register('desktopIcon', DesktopIcon);
register('pixelBackground', PixelBackground);
register('pixelTypewriter', PixelTypewriter);
register('heartVoice', HeartVoice);

export function createEffect(
  type: string,
  container: PIXI.Container,
  config: Record<string, any>,
  palette: ColorPalette
): BaseEffect {
  const Ctor = registry.get(type);
  if (!Ctor) throw new Error(`Unknown effect type: ${type}`);
  const effect = new Ctor();
  effect.init(container, config, palette);
  return effect;
}

export { BaseEffect };