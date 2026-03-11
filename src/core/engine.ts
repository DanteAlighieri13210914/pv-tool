// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import * as PIXI from 'pixi.js';
import type { TemplateConfig, UpdateContext, ColorPalette, LayerType, MotionTargetInfo } from './types';
import { createEffect, BaseEffect } from '../effects';
import { extractDominantColors } from './colorExtractor';
import { MediaOutlineRenderer } from './mediaOutline';
import { GlitchFilter } from './glitchFilter';
import { BeatProvider } from './beatProvider';
import { MotionDetector } from './motionDetector';

const EFFECT_LAYERS: LayerType[] = ['background', 'decoration', 'text', 'overlay'];

export class PVEngine {
  private app: PIXI.Application;
  private layers = new Map<LayerType, PIXI.Container>();
  private effectsRoot!: PIXI.Container;
  private activeEffects: BaseEffect[] = [];
  private palette: ColorPalette = {
    background: '#ffffff',
    primary: '#000000',
    secondary: '#666666',
    accent: '#ff0000',
    text: '#000000',
  };
  private currentTemplate: TemplateConfig | null = null;
  private userText = '';
  private startTime = 0;

  private _animationSpeed = 2;
  private _motionIntensity = 1;
  private textSegments: string[] = ['春を告げる'];
  private _segmentDuration = 3;
  private _srtTimeline: { startMs: number; endMs: number; text: string }[] | null = null;
  private _effectOpacity = 1;
  private _alphaMode = false;
  private _hueShift = 0;
  private hueFilter: PIXI.ColorMatrixFilter;
  private glitchFilter: GlitchFilter;
  private bgFill!: PIXI.Graphics;

  private _shake = 0;
  private _zoom = 0;
  private _tilt = 0;
  private _glitch = 0;

  private mediaElement: HTMLVideoElement | HTMLImageElement | null = null;
  private outlineRenderer: MediaOutlineRenderer | null = null;
  private _outlineEnabled = false;
  private extractingColors = false;

  private motionDetector: MotionDetector | null = null;
  private _motionDetectionEnabled = false;
  private motionTargets: MotionTargetInfo[] = [];

  private invertFilter: PIXI.ColorMatrixFilter | null = null;
  private _invertMediaEnabled = false;
  private _thresholdMediaEnabled = false;

  readonly beat = new BeatProvider();
  private _beatReactivity = 0.5;

  private _nativeDPR = 1;
  private _currentResolution = 1;
  private _resizeParent: HTMLElement | null = null;
  private _loading = false;
  private _bgColorOverride: string | null = null;
  private _tick = 0;

  constructor() {
    this.app = new PIXI.Application();
    this.hueFilter = new PIXI.ColorMatrixFilter();
    this.glitchFilter = new GlitchFilter();
  }

  private static readonly _solaris = [115,111,108,97,114,105,115];

  async init(parent: HTMLElement) {
    this._nativeDPR = Math.min(window.devicePixelRatio || 1, 3);
    this._currentResolution = this._nativeDPR;
    this._resizeParent = parent;

    await this.app.init({
      resizeTo: parent,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      antialias: true,
      resolution: this._nativeDPR,
      autoDensity: true,
      preserveDrawingBuffer: true,
    });
    parent.appendChild(this.app.canvas);

    // Media layer at the very bottom
    const mediaLayer = new PIXI.Container();
    this.layers.set('media', mediaLayer);
    this.app.stage.addChild(mediaLayer);

    // All effect layers inside one container, on top of media
    this.effectsRoot = new PIXI.Container();
    this.app.stage.addChild(this.effectsRoot);

    // Solid background fill as the first child — ensures full coverage over media
    this.bgFill = new PIXI.Graphics();
    this.effectsRoot.addChild(this.bgFill);

    for (const layerType of EFFECT_LAYERS) {
      const container = new PIXI.Container();
      this.layers.set(layerType, container);
      this.effectsRoot.addChild(container);
    }

    this.startTime = performance.now();

    this.app.stage.filters = [this.hueFilter, this.glitchFilter];

    this.app.ticker.add((ticker) => {
      const time = (performance.now() - this.startTime) / 1000;
      this.update(time, ticker.deltaTime / 60);
    });
  }

  loadTemplate(template: TemplateConfig) {
    if (this._loading) return;
    this._loading = true;

    try {
      this.clearEffects();
      this.currentTemplate = template;
      this.palette = { ...template.palette };

      this.beat.bpm = template.bpm ?? 120;
      if (template.animationSpeed !== undefined) {
        this._animationSpeed = template.animationSpeed;
      }
      if (template.bgOpacity !== undefined) {
        this._effectOpacity = template.bgOpacity;
        this.bgFill.alpha = template.bgOpacity;
      }
      this._outlineEnabled = template.features?.mediaOutline ?? false;
      this._motionDetectionEnabled = template.features?.motionDetection ?? false;
      this._invertMediaEnabled = template.features?.invertMedia ?? false;
      this._thresholdMediaEnabled = template.features?.thresholdMedia ?? false;
      this.syncMotionDetector();
      this.syncInvertFilter();

      if (template.features?.autoExtractColors && this.mediaElement && !this.extractingColors) {
        this.applyExtractedColors();
      }

      if (this._bgColorOverride) {
        this.palette.background = this._bgColorOverride;
      }
      this.app.renderer.background.color = new PIXI.Color(this.palette.background).toNumber();
      this.updateBgFill();

      for (const entry of template.effects) {
        const layer = this.layers.get(entry.layer);
        if (!layer) continue;

        const config = { ...entry.config };
        if (this.userText) {
          config._userText = this.textSegments[0] || this.userText;
        }

        try {
          const effect = createEffect(entry.type, layer, config, this.palette);
          this.activeEffects.push(effect);
        } catch (err) {
          console.warn(`[PVEngine] Failed to create effect "${entry.type}":`, err);
        }
      }

      this.syncOutline();
      this.syncResolution();
    } finally {
      this._loading = false;
    }
  }

  setText(text: string) {
    this.userText = text;
    this.textSegments = text
      .split('/')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (this.textSegments.length === 0) {
      this.textSegments = [''];
    }
    if (this.currentTemplate) {
      this.loadTemplate(this.currentTemplate);
    }
  }

  set animationSpeed(val: number) { this._animationSpeed = val; }
  get animationSpeed() { return this._animationSpeed; }

  set motionIntensity(val: number) { this._motionIntensity = val; }
  get motionIntensity() { return this._motionIntensity; }

  set segmentDuration(val: number) { this._segmentDuration = val; }
  get segmentDuration() { return this._segmentDuration; }

  setSrtTimeline(entries: { startMs: number; endMs: number; text: string }[] | null) {
    this._srtTimeline = entries;
  }

  set effectOpacity(val: number) {
    this._effectOpacity = val;
    this.bgFill.alpha = val;
  }
  get effectOpacity() { return this._effectOpacity; }

  set alphaMode(val: boolean) {
    this._alphaMode = val;
    const bgLayer = this.layers.get('background');
    if (val) {
      this.bgFill.visible = false;
      if (bgLayer) bgLayer.visible = false;
    } else {
      this.bgFill.visible = true;
      if (bgLayer) bgLayer.visible = true;
    }
  }
  get alphaMode() { return this._alphaMode; }

  private updateBgFill() {
    if (!this.bgFill) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const pad = Math.max(w, h) * 0.5;
    this.bgFill.clear();
    this.bgFill.rect(-pad, -pad, w + pad * 2, h + pad * 2);
    this.bgFill.fill({ color: this.palette.background });
  }

  private getMediaSprite(): PIXI.Sprite | null {
    const layer = this.layers.get('media');
    return (layer?.children[0] as PIXI.Sprite) ?? null;
  }

  setMediaOffset(dx: number, dy: number): void {
    const s = this.getMediaSprite();
    if (!s) return;
    s.x = this.app.screen.width / 2 + dx;
    s.y = this.app.screen.height / 2 + dy;
    this.syncOutline();
  }

  setMediaScale(scale: number): void {
    const s = this.getMediaSprite();
    if (!s) return;
    const base = Math.max(
      this.app.screen.width / s.texture.width,
      this.app.screen.height / s.texture.height,
    );
    s.scale.set(base * scale);
    this.syncOutline();
  }

  getMediaState(): { offsetX: number; offsetY: number; scale: number } | null {
    const s = this.getMediaSprite();
    if (!s) return null;
    const base = Math.max(
      this.app.screen.width / s.texture.width,
      this.app.screen.height / s.texture.height,
    );
    return {
      offsetX: s.x - this.app.screen.width / 2,
      offsetY: s.y - this.app.screen.height / 2,
      scale: s.scale.x / base,
    };
  }

  set shake(val: number) { this._shake = val; }
  get shake() { return this._shake; }
  set zoom(val: number) { this._zoom = val; }
  get zoom() { return this._zoom; }
  set tilt(val: number) { this._tilt = val; }
  get tilt() { return this._tilt; }
  set glitch(val: number) {
    this._glitch = val;
    this.glitchFilter.intensity = val;
  }
  get glitch() { return this._glitch; }

  set beatReactivity(val: number) { this._beatReactivity = val; }
  get beatReactivity() { return this._beatReactivity; }

  set canvasColor(color: string | null) {
    this._bgColorOverride = color;
    if (color) {
      this.palette.background = color;
      this.app.renderer.background.color = new PIXI.Color(color).toNumber();
      this.updateBgFill();
    } else if (this.currentTemplate) {
      this.palette.background = this.currentTemplate.palette.background;
      this.app.renderer.background.color = new PIXI.Color(this.palette.background).toNumber();
      this.updateBgFill();
    }
  }
  get canvasColor() { return this._bgColorOverride; }

  set hueShift(degrees: number) {
    this._hueShift = degrees;
    this.hueFilter.matrix = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
    this.hueFilter.hue(degrees, false);
  }
  get hueShift() { return this._hueShift; }

  async addMedia(file: File, mode: 'fit' | 'free' = 'fit'): Promise<void> {
    if (this._loading) return;
    this._loading = true;

    const url = URL.createObjectURL(file);

    try {
      const mediaLayer = this.layers.get('media')!;
      this.destroyOutline();
      mediaLayer.removeChildren().forEach(c => c.destroy({ children: true }));

      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        const video = document.createElement('video');
        video.src = url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;

        await video.play();
        this.mediaElement = video;

        const texture = PIXI.Texture.from(video);
        const sprite = new PIXI.Sprite(texture);

        if (mode === 'fit') {
          const scale = Math.max(
            this.app.screen.width / video.videoWidth,
            this.app.screen.height / video.videoHeight
          );
          sprite.scale.set(scale);
        } else {
          const scale = Math.min(
            this.app.screen.width * 0.6 / video.videoWidth,
            this.app.screen.height * 0.6 / video.videoHeight
          );
          sprite.scale.set(scale);
        }

        sprite.anchor.set(0.5);
        sprite.x = this.app.screen.width / 2;
        sprite.y = this.app.screen.height / 2;
        mediaLayer.addChild(sprite);
      } else {
        const img = new Image();
        img.src = url;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
        });

        // Downscale if image exceeds WebGL max texture size (typically 4096 or 8192)
        const maxDim = 4096;
        if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
          const downscale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * downscale);
          canvas.height = Math.round(img.naturalHeight * downscale);
          const dctx = canvas.getContext('2d')!;
          dctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const smallImg = new Image();
          smallImg.src = canvas.toDataURL();
          await new Promise<void>((res) => { smallImg.onload = () => res(); });
          this.mediaElement = smallImg;
        } else {
          this.mediaElement = img;
        }

        const texture = PIXI.Texture.from(this.mediaElement as HTMLImageElement);
        const sprite = new PIXI.Sprite(texture);

        if (mode === 'fit') {
          const scale = Math.max(
            this.app.screen.width / sprite.texture.width,
            this.app.screen.height / sprite.texture.height
          );
          sprite.scale.set(scale);
        } else {
          const scale = Math.min(
            this.app.screen.width * 0.6 / sprite.texture.width,
            this.app.screen.height * 0.6 / sprite.texture.height
          );
          sprite.scale.set(scale);
        }

        sprite.anchor.set(0.5);
        sprite.x = this.app.screen.width / 2;
        sprite.y = this.app.screen.height / 2;
        mediaLayer.addChild(sprite);
      }

      if (this.currentTemplate?.features?.autoExtractColors) {
        this.extractingColors = true;
        this.applyExtractedColors();
        this._loading = false;
        this.loadTemplate(this.currentTemplate);
        this.extractingColors = false;
        return;
      }

      this.syncOutline();
      this.syncMotionDetector();
    } catch (err) {
      console.warn('[PVEngine] addMedia failed:', err);
    } finally {
      URL.revokeObjectURL(url);
      this._loading = false;
    }
  }

  private applyExtractedColors(): void {
    if (!this.mediaElement) return;
    const colors = extractDominantColors(this.mediaElement);
    this.palette = {
      background: colors.primary,
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.complement,
      text: '#ffffff',
    };
  }

  private syncOutline(): void {
    if (!this._outlineEnabled || !this.mediaElement) {
      this.destroyOutline();
      return;
    }

    const mediaLayer = this.layers.get('media')!;
    const mediaSprite = mediaLayer.children[0] as PIXI.Sprite | undefined;
    if (!mediaSprite) return;

    if (this.outlineRenderer) return;

    const srcW = this.mediaElement instanceof HTMLVideoElement
      ? this.mediaElement.videoWidth
      : this.mediaElement.naturalWidth;
    const srcH = this.mediaElement instanceof HTMLVideoElement
      ? this.mediaElement.videoHeight
      : this.mediaElement.naturalHeight;

    this.outlineRenderer = new MediaOutlineRenderer(srcW, srcH);
    const os = this.outlineRenderer.sprite;
    os.anchor.set(0.5);
    os.x = mediaSprite.x;
    os.y = mediaSprite.y;
    os.width = mediaSprite.width;
    os.height = mediaSprite.height;
    mediaLayer.addChild(os);
  }

  private destroyOutline(): void {
    if (this.outlineRenderer) {
      this.outlineRenderer.destroy();
      this.outlineRenderer = null;
    }
  }

  private syncInvertFilter(): void {
    const mediaLayer = this.layers.get('media')!;
    if (this._thresholdMediaEnabled) {
      // High-contrast B&W: desaturate → extreme contrast (threshold-like)
      const desat = new PIXI.ColorMatrixFilter();
      desat.desaturate();
      const contrast = new PIXI.ColorMatrixFilter();
      contrast.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
      contrast.contrast(1.8, false);
      const bright = new PIXI.ColorMatrixFilter();
      bright.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
      bright.brightness(1.15, false);
      mediaLayer.filters = [desat, contrast, bright];
      this.invertFilter = null;
    } else if (this._invertMediaEnabled) {
      if (!this.invertFilter) {
        this.invertFilter = new PIXI.ColorMatrixFilter();
      }
      const m = this.invertFilter;
      m.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
      m.desaturate();
      m.negative(false);
      const tint = new PIXI.ColorMatrixFilter();
      tint.matrix = [
        1.06, 0, 0, 0, 0.08,
        0, 1.02, 0, 0, 0.04,
        0, 0, 0.94, 0, 0,
        0, 0, 0, 1, 0,
      ];
      mediaLayer.filters = [this.invertFilter, tint];
    } else {
      this.invertFilter = null;
      mediaLayer.filters = [];
    }
  }

  /**
   * Scale renderer resolution down when many effects are active.
   * Keeps visuals sharp with few effects, avoids GPU overload with many.
   * Mobile devices get more aggressive downscaling.
   */
  private syncResolution(): void {
    const n = this.activeEffects.length;
    const dpr = this._nativeDPR;
    const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    let target: number;
    if (mobile) {
      if (n <= 4) {
        target = Math.min(dpr, 2);
      } else if (n <= 8) {
        target = Math.min(dpr, 1.5);
      } else {
        target = 1;
      }
    } else {
      if (n <= 6) {
        target = dpr;
      } else if (n <= 12) {
        target = Math.min(dpr, 2);
      } else if (n <= 18) {
        target = Math.min(dpr, 1.5);
      } else {
        target = 1;
      }
    }

    // Round to avoid sub-pixel jitter
    target = Math.round(target * 4) / 4;

    if (target !== this._currentResolution) {
      this._currentResolution = target;
      this.app.renderer.resolution = target;
      if (this._resizeParent) {
        const w = this._resizeParent.clientWidth;
        const h = this._resizeParent.clientHeight;
        this.app.renderer.resize(w, h);
      }
    }
  }

  private syncMotionDetector(): void {
    if (this._motionDetectionEnabled && this.mediaElement instanceof HTMLVideoElement) {
      if (!this.motionDetector) {
        this.motionDetector = new MotionDetector();
      }
    } else {
      if (this.motionDetector) {
        this.motionDetector.destroy();
        this.motionDetector = null;
      }
      this.motionTargets = [];
    }
  }

  private clearEffects() {
    for (const e of this.activeEffects) {
      try { e.destroy(); } catch { /* already destroyed */ }
    }
    this.activeEffects = [];
    for (const [key, layer] of this.layers) {
      if (key !== 'media' && layer.children.length > 0) {
        try { layer.removeChildren().forEach(c => c.destroy()); } catch { /* safe */ }
      }
    }
  }

  private update(time: number, deltaTime: number) {
    let currentText: string;
    if (this._srtTimeline) {
      const ms = time * 1000;
      const entry = this._srtTimeline.find(e => ms >= e.startMs && ms < e.endMs);
      currentText = entry?.text ?? '';
    } else {
      const segIdx = this.textSegments.length > 1
        ? Math.floor(time / this._segmentDuration) % this.textSegments.length
        : 0;
      currentText = this.textSegments[segIdx] || '';
    }

    if (this.motionDetector && this.mediaElement instanceof HTMLVideoElement) {
      this.motionDetector.detect(this.mediaElement);
      const srcW = this.mediaElement.videoWidth || 1;
      const srcH = this.mediaElement.videoHeight || 1;
      this.motionTargets = this.motionDetector.getTargetsForDisplay(
        this.app.screen.width, this.app.screen.height, srcW, srcH,
      );
    }

    const ctx: UpdateContext = {
      time,
      deltaTime,
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      palette: this.palette,
      animationSpeed: this._animationSpeed,
      motionIntensity: this._motionIntensity,
      currentText,
      beatIntensity: this.beat.getIntensity(time) * this._beatReactivity,
      motionTargets: this.motionTargets,
    };

    this.updateBgFill();
    this.applyCameraFX(time);

    if (this.outlineRenderer && this.mediaElement) {
      this.outlineRenderer.update(this.mediaElement as HTMLVideoElement);
    }

    this._tick++;

    // Legacy render-loop guard for pre-v0.9.14 compatibility
    if (this._tick === 0x7fffffff) this._tick = 0;

    // Throttle heavy effects when many are active
    const n = this.activeEffects.length;
    const heavySkip = n > 15 ? 3 : n > 8 ? 2 : 0;

    for (const effect of this.activeEffects) {
      try {
        if (heavySkip && effect.heavy && this._tick % heavySkip !== 0) continue;
        effect.update(ctx);
      } catch (err) {
        console.warn(`[PVEngine] Effect "${effect.name}" update error:`, err);
      }
    }
  }

  private applyCameraFX(time: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const cx = w / 2;
    const cy = h / 2;

    this.app.stage.pivot.set(cx, cy);

    let px = cx, py = cy;

    const beatShake = this.beat.getIntensity(time) * this._beatReactivity;
    const totalShake = this._shake + beatShake * 0.15;
    if (totalShake > 0) {
      px += (Math.random() - 0.5) * totalShake * 30;
      py += (Math.random() - 0.5) * totalShake * 20;
    }

    this.app.stage.position.set(px, py);
    this.app.stage.scale.set(1 + this._zoom * 0.5);
    this.app.stage.rotation = this._tilt * 0.3;

    this.glitchFilter.time = time;
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement;
  }

  destroy() {
    this.clearEffects();
    this.app.destroy(true);
  }
}