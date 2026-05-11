// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

import * as PIXI from 'pixi.js';
import { BaseEffect } from './base';
import type { UpdateContext, ColorPalette } from '../core/types';
import { resolveColor } from '../core/types';
import { findGlyphShards } from '../core/ccl';

/**
 * CrayonShatter — CCL pipeline as ShatterText, but:
 *   1. Text body is perfectly static and crisp.
 *   2. A random fraction of shards is recoloured from a soft accent
 *      palette; selected glyphs get replaced with hand-drawn elements
 *      (sun, star, heart, cloud, snowflake, flower, drop).
 *   3. Recoloured / replacement shards get a comic-style **vector outline**
 *      (Moore-boundary contour + double-layer jitter stroke à la
 *      victimOutline), regenerated every `outlineRedrawInterval` seconds
 *      so the rim wiggles like an animated pencil scratch.
 *   4. Recoloured / replacement shards also get a tiny in-place wobble
 *      (sub-pixel translation + slight rotation) so they feel alive
 *      against the static body.
 */

interface CrayonShard {
  wrapper: PIXI.Container;
  /** Sprite is null on outline-only shards (whole-char comic line). */
  sprite: PIXI.Sprite | null;
  texture: PIXI.Texture | null;
  outline: PIXI.Graphics | null;
  /** Cached contour list — re-used by hold-frame outline redraws. */
  contours: number[][][] | null;
  shardCenterX: number;
  shardCenterY: number;
  outlineScale: number;
  outlineColorHex: string;
  outlineLineWidth: number;
  outlineJitter: number;
  outlineSeed: number;
  outlineHalo: boolean;
  /** Last rendered outline frame index (for hold-frame switches). */
  frameIdx: number;
  /** Optional Graphics layer that spins (e.g. sun rays around a disc).
   *  Lives in `spinRaysParent` (uncached sibling container) — NOT in the
   *  shard wrapper — so its per-boil-tick rotation does not trigger
   *  cacheAsTexture invalidation on the shard wrapper. */
  spinRays: PIXI.Graphics | null;
  /** Uncached sibling container that hosts spinRays at the same position
   *  + staticAngle as the shard wrapper. Tracked separately so it can be
   *  removed/destroyed in releaseShards. */
  spinRaysParent: PIXI.Container | null;
  /** Spin step in radians per boil-frame (replaces continuous spinSpeed
   *  — continuous rotation per frame can't co-exist with cacheAsTexture). */
  spinStepRad: number;
  /** Element-driven boil animation. None of these need cache invalidate
   *  (they're applied via wrapper-level display transforms / alpha) so
   *  they're cheap. spin-rays is the exception (rotates inner Graphics)
   *  and triggers cache refresh. */
  elementAnim: 'none' | 'spin-rays' | 'rotate' | 'pulse' | 'blink' | 'swing';
  /** Static rotation set at build (wrapper.rotation baseline; element
   *  animations layer on top). */
  staticBaseAngle: number;
}

const RENDER_PADDING = 14;

const DEFAULT_BASE_COLOR = '#5a3a5a';

/** Soft, chalky crayon palette — desaturated and muted, not neon. */
const DEFAULT_PALETTE = [
  '#d97a7a', '#e0b96a', '#83b07c', '#7faecc',
  '#c89bba', '#d49d6f', '#9c89c4', '#7fb6c4',
];

const DEFAULT_REPLACEMENTS: Record<string, string> = {
  // Round dots → sun
  '。': 'sun', '.': 'sun', '·': 'sun', '•': 'sun',
  '○': 'sun', '◯': 'sun', '◎': 'sun', '⚪': 'sun', '☉': 'sun',
  // Comma-shaped / dot strokes → drop
  '丶': 'drop', '、': 'drop', ',': 'drop', '，': 'drop',
  // Stars / hearts / weather
  '☆': 'star', '★': 'star', '✦': 'star', '✧': 'star',
  '♥': 'heart', '♡': 'heart',
  '☁': 'cloud',
  '❄': 'snowflake', '❅': 'snowflake', '❆': 'snowflake',
  '✿': 'flower', '❀': 'flower', '❁': 'flower', '❂': 'flower',
  // Moons / shapes / notes
  '☾': 'moon', '☽': 'moon', '🌙': 'moon',
  '◆': 'diamond', '◇': 'diamond', '♦': 'diamond',
  '♪': 'note', '♫': 'note', '♬': 'note', '♩': 'note',
};

/** Pool used when a shard is rolled for random replacement (independent of
 *  glyph→element character map). Only small / medium shards are eligible
 *  (handled in build) so we don't smother main strokes.
 *
 *  Excludes elements whose elementAnim drives `wrapper.rotation` /
 *  `wrapper.scale` per boil tick (snowflake / flower / diamond → 'rotate',
 *  star / heart → 'pulse'). The char-level outline is baked from a static
 *  compose canvas (staticAngle only) and lives in a SEPARATE wrapperOutline
 *  at charCenter, so it cannot follow per-tick wrapper transforms — using
 *  rotate/pulse elements here would visibly de-sync the sprite from the
 *  ink line (sprite spins ±83° while outline stays still). swing is
 *  tolerated because its amplitude is already capped at ±5° (see
 *  SWING_POSES in update()) and `note` is the only swing element.
 *  Char-level explicit replacements (user typed `❄`, `★`, …) still get the
 *  full anim set — their outline lives INSIDE wrapperCl so it inherits
 *  every wrapper transform automatically. */
const RANDOM_ELEMENT_POOL = [
  'sun', 'drop', 'moon', 'note',
];

function hashUnit(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function hashSigned(seed: number): number { return hashUnit(seed) * 2 - 1; }
function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }

function hexToTint(hex: string): number {
  const cleaned = hex.replace(/^#/, '');
  const v = parseInt(cleaned.length === 3
    ? cleaned.split('').map(c => c + c).join('')
    : cleaned, 16);
  return Number.isFinite(v) ? v : 0xffffff;
}
function tintToHex(tint: number): string {
  return '#' + tint.toString(16).padStart(6, '0');
}

function resolveColorList(input: unknown, palette: ColorPalette): number[] {
  const arr = Array.isArray(input) && input.length > 0
    ? input.map(String) : DEFAULT_PALETTE;
  return arr.map(c => hexToTint(resolveColor(c, palette)));
}

// ──────────────────────────── Element drawing ────────────────────────────

function drawCrayonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, cy: number,
  fontSizePx: number,
  fontFamily: string,
  fontWeight: string,
  passes: number,
  jitterPx: number,
): void {
  ctx.font = `${fontWeight} ${Math.ceil(fontSizePx)}px ${fontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let pass = 0; pass < passes; pass++) {
    const dx = (Math.random() * 2 - 1) * jitterPx;
    const dy = (Math.random() * 2 - 1) * jitterPx;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.45;
    ctx.fillText(text, cx + dx, cy + dy);
  }
  ctx.globalAlpha = 1.0;
}

function drawSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Center disc only — rays are drawn separately as a PIXI.Graphics layer
  // that orbits the disc (build() wires up `spinRays`).
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 3; pass++) {
    const j = pass === 0 ? 0 : R * 0.05;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.beginPath();
    ctx.arc(cx + jx, cy + jy, R * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

/** Disc-radius / elementSize ratio inside drawSun (R = size*0.42, fill arc
 *  is R*0.62). Used by build() to size the orbiting rays so they start
 *  just outside the visible disc. */
const SUN_DISC_FRAC = 0.42 * 0.62;

/** Draw sun rays directly on a PIXI.Graphics so they can spin around the
 *  disc without sub-pixel raster shimmer. `discRadius` is the visible disc
 *  radius (in the same coord space as the Graphics — usually wrapper-local
 *  logical px). Rays start just outside the disc and reach 1.7× outward. */
function drawSunRaysToGraphics(
  g: PIXI.Graphics,
  discRadius: number,
  color: string,
  rayCount: number = 10,
): void {
  g.clear();
  // Rays start with a visible gap from the disc edge — looks more like
  // emitted light, less like a gear.
  const r1 = discRadius * 1.22;
  const r2 = discRadius * 1.85;
  for (let k = 0; k < rayCount; k++) {
    const angle = (k * Math.PI * 2) / rayCount;
    g.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
    g.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
  }
  g.stroke({
    color,
    width: Math.max(2, discRadius * 0.20),
    cap: 'round',
    alpha: 1,
  });
}

function drawDrop(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Symmetric raindrop: pointed apex (top), bulbous bottom.
  // Two bezier curves; each handles one side from apex to bottom centre.
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.04;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + jx, cy - R * 1.05 + jy);
    // right side: apex → widest point → bottom
    ctx.bezierCurveTo(
      cx + R * 0.18 + jx, cy - R * 0.55 + jy,
      cx + R * 0.85 + jx, cy + R * 0.18 + jy,
      cx + jx,            cy + R * 0.85 + jy,
    );
    // left side: bottom → widest point (mirror) → apex
    ctx.bezierCurveTo(
      cx - R * 0.85 + jx, cy + R * 0.18 + jy,
      cx - R * 0.18 + jx, cy - R * 0.55 + jy,
      cx + jx,            cy - R * 1.05 + jy,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.04;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? R * 0.95 : R * 0.4;
      const x = cx + (Math.random() * 2 - 1) * j + Math.cos(angle) * r;
      const y = cy + (Math.random() * 2 - 1) * j + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Classic heart: notch at top, two round lobes, sharp apex at bottom.
  // Pure-bezier cardioid-ish path; symmetric L↔R.
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.04;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    ctx.beginPath();
    const notchY = cy - R * 0.40 + jy;
    const apexY  = cy + R * 0.95 + jy;
    ctx.moveTo(cx + jx, notchY);
    // Right half: notch → bulge top-right → middle-right → apex.
    ctx.bezierCurveTo(
      cx + R * 0.95 + jx, cy - R * 1.20 + jy,  // pull up-right (top of right lobe)
      cx + R * 1.20 + jx, cy + R * 0.10 + jy,  // mid-right side
      cx + jx,            apexY,
    );
    // Left half: apex → middle-left → bulge top-left → notch.
    ctx.bezierCurveTo(
      cx - R * 1.20 + jx, cy + R * 0.10 + jy,
      cx - R * 0.95 + jx, cy - R * 1.20 + jy,
      cx + jx,            notchY,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.04;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.arc(cx + jx, cy + jy, R * 0.5, 0, Math.PI * 2);
    ctx.arc(cx - R * 0.45 + jx, cy + R * 0.1 + jy, R * 0.4, 0, Math.PI * 2);
    ctx.arc(cx + R * 0.45 + jx, cy + R * 0.1 + jy, R * 0.4, 0, Math.PI * 2);
    ctx.arc(cx - R * 0.2 + jx, cy - R * 0.2 + jy, R * 0.36, 0, Math.PI * 2);
    ctx.arc(cx + R * 0.2 + jx, cy - R * 0.2 + jy, R * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawSnowflake(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Smaller, chunkier flake — arms reach 0.78R (was full R) and stroke is
  // wider (R*0.22 vs R*0.13) so the silhouette stays crisp at small sizes.
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, R * 0.22);
  const armLen = R * 0.78;
  const branchAt = armLen * 0.55;
  const branchLen = R * 0.22;
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    for (let k = 0; k < 6; k++) {
      const angle = k * Math.PI / 3;
      const ex = cx + Math.cos(angle) * armLen;
      const ey = cy + Math.sin(angle) * armLen;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const bx = cx + Math.cos(angle) * branchAt;
      const by = cy + Math.sin(angle) * branchAt;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(angle + Math.PI / 4) * branchLen, by + Math.sin(angle + Math.PI / 4) * branchLen);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(angle - Math.PI / 4) * branchLen, by + Math.sin(angle - Math.PI / 4) * branchLen);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;
}

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  ctx.fillStyle = '#ffffff';
  const petals = 6;
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    for (let k = 0; k < petals; k++) {
      const angle = k * (Math.PI * 2 / petals);
      const px = cx + Math.cos(angle) * R * 0.5;
      const py = cy + Math.sin(angle) * R * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, R * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Waxing gibbous: large disc minus a smaller, deeper-offset disc — leaves
  // a fat crescent + most of the body, reads as "moon" not as "fingernail".
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.04;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.arc(cx + jx, cy + jy, R * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx + R * 0.55, cy - R * 0.02, R * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Tall diamond / rhombus — height ≈ 2R, width ≈ 1.7R (≈ √3 / 2 * 2R)
  // so it reads as an upright gem, not a flattened lozenge.
  ctx.fillStyle = '#ffffff';
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.04;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + jx, cy - R + jy);
    ctx.lineTo(cx + R * 0.85 + jx, cy + jy);
    ctx.lineTo(cx + jx, cy + R + jy);
    ctx.lineTo(cx - R * 0.85 + jx, cy + jy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawNote(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  // Quarter note: shorter stem (head + stem fits within ~1.4R total height).
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, R * 0.18);
  for (let pass = 0; pass < 2; pass++) {
    const j = pass === 0 ? 0 : R * 0.03;
    const jx = (Math.random() * 2 - 1) * j;
    const jy = (Math.random() * 2 - 1) * j;
    ctx.globalAlpha = pass === 0 ? 1.0 : 0.5;
    // stem (~0.95R tall, head at +0.45R, top at -0.50R)
    ctx.beginPath();
    ctx.moveTo(cx + R * 0.35 + jx, cy + R * 0.45 + jy);
    ctx.lineTo(cx + R * 0.35 + jx, cy - R * 0.50 + jy);
    ctx.stroke();
    // flag at top of stem
    ctx.beginPath();
    ctx.moveTo(cx + R * 0.35 + jx, cy - R * 0.50 + jy);
    ctx.quadraticCurveTo(
      cx + R * 0.95 + jx, cy - R * 0.20 + jy,
      cx + R * 0.55 + jx, cy + R * 0.18 + jy,
    );
    ctx.stroke();
    // note head (oval, slightly tilted)
    ctx.beginPath();
    ctx.ellipse(cx + jx, cy + R * 0.45 + jy, R * 0.40, R * 0.30, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  type: string,
  cx: number, cy: number,
  size: number,
): void {
  const R = size * 0.42;
  switch (type) {
    case 'sun':       drawSun(ctx, cx, cy, R); break;
    case 'drop':      drawDrop(ctx, cx, cy, R * 0.85); break;
    case 'star':      drawStar(ctx, cx, cy, R); break;
    case 'heart':     drawHeart(ctx, cx, cy, R); break;
    case 'cloud':     drawCloud(ctx, cx, cy, R); break;
    case 'snowflake': drawSnowflake(ctx, cx, cy, R); break;
    case 'flower':    drawFlower(ctx, cx, cy, R); break;
    case 'moon':      drawMoon(ctx, cx, cy, R); break;
    case 'diamond':   drawDiamond(ctx, cx, cy, R); break;
    case 'note':      drawNote(ctx, cx, cy, R); break;
    default:          drawSun(ctx, cx, cy, R);
  }
}

// ─────────────────────── Moore boundary contour ───────────────────────

/**
 * Extract every contour line in `imageData` as a closed polygon walk along
 * INTER-PIXEL boundary edges (not pixel centres). For each foreground
 * pixel (alpha ≥ threshold) we emit the 4 cell sides that face background,
 * oriented so the foreground sits on the right of the directed edge.
 * Walking start→end gives one closed loop per visually distinct boundary:
 *   - filled blob            → 1 outer contour (full perimeter, not just corners)
 *   - blob with hole         → 1 outer + 1 inner (hole auto-detected because
 *                              foreground pixels around it emit edges facing
 *                              the hole — no separate Pass 2 needed)
 *   - 2 components, diagonal → 2 outer contours (no spurious bridging)
 *
 * The previous Moore-neighbor implementation (NB8 walk among foreground
 * pixels) was broken — for a 4×4 filled rectangle it returned ONLY the 4
 * corner pixels (verified via Node test). That's why the comic outline
 * kept showing only a tiny inner fragment regardless of how the upstream
 * raster was built.
 */
function extractContours(
  imageData: ImageData,
  alphaThreshold: number,
  simplifyEvery: number = 2,
  smoothIters: number = 0,
  minComponentArea: number = 0,
): number[][][] {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;
  const total = w * h;

  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] >= alphaThreshold) mask[i] = 1;
  }

  // Optional component-area filter: BFS to label each fg region and tally
  // its pixel count. Edges from regions below threshold are skipped so
  // tiny CCLs (氵 dots / AA crumbs) don't get outlined.
  let regionLabel: Int32Array | null = null;
  const regionAreas: number[] = [];
  if (minComponentArea > 0) {
    regionLabel = new Int32Array(total);
    for (let i = 0; i < total; i++) regionLabel[i] = -1;
    const queue = new Int32Array(total);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i] || regionLabel[i] !== -1) continue;
        const lbl = regionAreas.length;
        let head = 0, tail = 0;
        queue[tail++] = i;
        regionLabel[i] = lbl;
        let area = 0;
        while (head < tail) {
          const off = queue[head++];
          area++;
          const px = off % w;
          const py = (off - px) / w;
          if (px > 0 && mask[off - 1] && regionLabel[off - 1] === -1) {
            regionLabel[off - 1] = lbl; queue[tail++] = off - 1;
          }
          if (px < w - 1 && mask[off + 1] && regionLabel[off + 1] === -1) {
            regionLabel[off + 1] = lbl; queue[tail++] = off + 1;
          }
          if (py > 0 && mask[off - w] && regionLabel[off - w] === -1) {
            regionLabel[off - w] = lbl; queue[tail++] = off - w;
          }
          if (py < h - 1 && mask[off + w] && regionLabel[off + w] === -1) {
            regionLabel[off + w] = lbl; queue[tail++] = off + w;
          }
        }
        regionAreas.push(area);
      }
    }
  }

  // Build directed boundary edges. Vertices live on the integer grid
  // [0..w] × [0..h] (cell corners). Direction codes:
  //   0 = top    edge, going right (foreground BELOW edge)
  //   1 = right  edge, going down  (foreground LEFT  of edge)
  //   2 = bottom edge, going left  (foreground ABOVE edge)
  //   3 = left   edge, going up    (foreground RIGHT of edge)
  // The interior always sits on the right of the directed edge → walking
  // closes outer contours clockwise (in screen coords) and inner-hole
  // contours counter-clockwise. Either is fine for stroke rendering.
  type Edge = {
    x1: number; y1: number; x2: number; y2: number;
    dir: number; visited: boolean;
  };
  const edges: Edge[] = [];
  const edgeMap = new Map<number, Edge[]>();
  const vKey = (x: number, y: number): number => y * (w + 1) + x;
  const isFg = (x: number, y: number): boolean =>
    x >= 0 && x < w && y >= 0 && y < h && mask[y * w + x] === 1;
  const addEdge = (
    x1: number, y1: number, x2: number, y2: number, dir: number,
  ): void => {
    const e: Edge = { x1, y1, x2, y2, dir, visited: false };
    edges.push(e);
    const k = vKey(x1, y1);
    let arr = edgeMap.get(k);
    if (!arr) { arr = []; edgeMap.set(k, arr); }
    arr.push(e);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (regionLabel) {
        const lbl = regionLabel[y * w + x];
        if (regionAreas[lbl] < minComponentArea) continue;
      }
      if (!isFg(x,     y - 1)) addEdge(x,     y,     x + 1, y,     0);
      if (!isFg(x + 1, y    )) addEdge(x + 1, y,     x + 1, y + 1, 1);
      if (!isFg(x,     y + 1)) addEdge(x + 1, y + 1, x,     y + 1, 2);
      if (!isFg(x - 1, y    )) addEdge(x,     y + 1, x,     y,     3);
    }
  }

  // Walk edges. At each junction prefer right-turn → straight → left-turn
  // → back; this resolves shared-vertex ambiguities consistently and
  // prevents two diagonally-touching components from accidentally bridging.
  const TURN = [1, 0, 3, 2];
  const finalize = (raw: number[][]): number[][] | null => {
    if (raw.length < 4) return null;
    const simplified = simplifyEvery > 1
      ? raw.filter((_, idx) => idx % simplifyEvery === 0)
      : raw;
    if (simplified.length < 3) return null;
    return smoothIters > 0 ? chaikinSmooth(simplified, smoothIters) : simplified;
  };
  const contours: number[][][] = [];
  for (const e0 of edges) {
    if (e0.visited) continue;
    const pts: number[][] = [[e0.x1, e0.y1]];
    const sx = e0.x1, sy = e0.y1;
    let e: Edge | null = e0;
    let safety = edges.length + 4;
    while (e && safety-- > 0) {
      e.visited = true;
      pts.push([e.x2, e.y2]);
      if (e.x2 === sx && e.y2 === sy) {
        pts.pop();
        break;
      }
      const arr = edgeMap.get(vKey(e.x2, e.y2));
      let next: Edge | null = null;
      if (arr) {
        for (const rel of TURN) {
          const dir = (e.dir + rel) & 3;
          for (const cand of arr) {
            if (!cand.visited && cand.dir === dir) { next = cand; break; }
          }
          if (next) break;
        }
        if (!next) {
          for (const cand of arr) if (!cand.visited) { next = cand; break; }
        }
      }
      e = next;
    }
    const out = finalize(pts);
    if (out) contours.push(out);
  }

  return contours;
}

/**
 * One pass of Chaikin's corner-cutting on a closed polygon. Each edge
 * P_i → P_{i+1} is replaced by two interpolated points
 *   Q_i = 0.75·P_i + 0.25·P_{i+1}
 *   R_i = 0.25·P_i + 0.75·P_{i+1}
 * Vertex count doubles each iteration; after 1-2 passes a Marching-Squares
 * style raster contour stops looking like pixel stairsteps and reads as a
 * smooth pen sweep — which is exactly what we want for the comic outline.
 */
function chaikinSmooth(contour: number[][], iterations: number): number[][] {
  if (iterations <= 0 || contour.length < 3) return contour;
  let pts = contour;
  for (let iter = 0; iter < iterations; iter++) {
    const out: number[][] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}

/**
 * Render a comic-style outline. Single bold stroke by default; an optional
 * halo (toggle via `drawHalo`) lays a faint wider stroke under it for a
 * "doubled-up crayon" look but tends to muddy the line on small shards.
 *
 * `frameIdx` selects one of an effectively-infinite family of jitter
 * patterns: each integer frame shifts every vertex's sin phase, so calling
 * this with `frameIdx = 0,1,2,...` and redrawing on a low-frequency tick
 * produces the classic "limited animation hold" look.
 */
function drawJitteredOutline(
  g: PIXI.Graphics,
  contours: number[][][],
  centerX: number,
  centerY: number,
  scale: number,
  color: string,
  lineWidth: number,
  jitter: number,
  seedBase: number,
  frameIdx: number = 0,
  drawHalo: boolean = false,
): void {
  g.clear();
  if (contours.length === 0) return;

  const frameShift = frameIdx * 17.31;
  const offsetAt = (vSeed: number, axis: 0 | 1, mag: number): number => {
    const a = (vSeed + axis * 11.13 + frameShift) * 0.731;
    const b = (vSeed + axis * 7.49 + frameShift * 1.379) * 1.213;
    return Math.sin(a) * mag * 0.55 + Math.sin(b) * mag * 0.35;
  };

  // Main stroke
  let vCounter = seedBase;
  for (const contour of contours) {
    if (contour.length < 3) continue;
    const x0 = (contour[0][0] - centerX) * scale + offsetAt(vCounter, 0, jitter);
    const y0 = (contour[0][1] - centerY) * scale + offsetAt(vCounter, 1, jitter);
    g.moveTo(x0, y0);
    vCounter++;
    for (let i = 1; i < contour.length; i++) {
      const px = (contour[i][0] - centerX) * scale + offsetAt(vCounter, 0, jitter);
      const py = (contour[i][1] - centerY) * scale + offsetAt(vCounter, 1, jitter);
      g.lineTo(px, py);
      vCounter++;
    }
    g.closePath();
  }
  g.stroke({ color, width: lineWidth, alpha: 1, cap: 'round', join: 'round' });

  if (!drawHalo) return;

  // Optional halo stroke: stays close to main path (≤ 0.6× jitter offset),
  // same hue but lower alpha + slightly thinner — reads as a doubled-up
  // crayon stroke. Off by default because it tends to muddy small shards.
  vCounter = seedBase + 9999;
  const j2 = jitter * 0.6;
  for (const contour of contours) {
    if (contour.length < 3) continue;
    const x0 = (contour[0][0] - centerX) * scale + offsetAt(vCounter, 0, j2);
    const y0 = (contour[0][1] - centerY) * scale + offsetAt(vCounter, 1, j2);
    g.moveTo(x0, y0);
    vCounter++;
    for (let i = 1; i < contour.length; i++) {
      const px = (contour[i][0] - centerX) * scale + offsetAt(vCounter, 0, j2);
      const py = (contour[i][1] - centerY) * scale + offsetAt(vCounter, 1, j2);
      g.lineTo(px, py);
      vCounter++;
    }
    g.closePath();
  }
  g.stroke({ color, width: lineWidth * 0.7, alpha: 0.55, cap: 'round', join: 'round' });
}

// ─────────────────────── Shard shape analysis ───────────────────────

/**
 * Inspect a CCL component and decide whether its shape suggests a hand-drawn
 * element replacement:
 *   - Small + near-square + mostly filled (fill ≥ π/4 minus AA slack) → sun
 *     (the round dot of `。 . ・` etc., but also any incidental round shard).
 *   - Small/medium + elongated bbox + diagonal principal axis (PCA) → drop
 *     (the comma/捺/丶 brush stroke shape).
 * Returns null when the shard should stay as plain text.
 */
function analyzeShardShape(
  comp: { minX: number; maxX: number; minY: number; maxY: number; area: number; pixels: number[] },
  cellPx: number,
  fontSizePxDpr: number,
): 'sun' | 'drop' | null {
  const sw = comp.maxX - comp.minX + 1;
  const sh = comp.maxY - comp.minY + 1;
  const bboxArea = sw * sh;
  if (bboxArea === 0) return null;
  const fillRatio = comp.area / bboxArea;
  const aspect = sw / sh;
  const maxDim = Math.max(sw, sh);
  const sizeFrac = maxDim / fontSizePxDpr;

  // Round dot → sun. fillRatio upper bound 0.92 excludes nearly-solid rectangular
  // shards (fillRatio ≈ 1.0) which were getting misclassified as round dots.
  // Real round dots sit around fillRatio ≈ π/4 ≈ 0.785.
  if (sizeFrac >= 0.08 && sizeFrac <= 0.40
      && aspect >= 0.70 && aspect <= 1.43
      && fillRatio >= 0.62 && fillRatio <= 0.92) {
    return 'sun';
  }

  // Diagonal stroke → drop. Bbox elongated, PCA confirms principal axis is
  // 22°–75° from horizontal (rules out plain horizontal/vertical strokes
  // like 一 / 丨 which have similar bbox aspect but axis-aligned).
  if (sizeFrac >= 0.10 && sizeFrac <= 0.45
      && fillRatio >= 0.35 && fillRatio <= 0.80
      && (aspect < 0.65 || aspect > 1.55)) {
    let mx = 0, my = 0;
    for (let i = 0; i < comp.pixels.length; i++) {
      const p = comp.pixels[i];
      const px = p % cellPx;
      const py = (p - px) / cellPx;
      mx += px;
      my += py;
    }
    const inv = 1 / comp.area;
    mx *= inv; my *= inv;
    let mxx = 0, myy = 0, mxy = 0;
    for (let i = 0; i < comp.pixels.length; i++) {
      const p = comp.pixels[i];
      const px = p % cellPx;
      const py = (p - px) / cellPx;
      const dx = px - mx;
      const dy = py - my;
      mxx += dx * dx;
      myy += dy * dy;
      mxy += dx * dy;
    }
    mxx *= inv; myy *= inv; mxy *= inv;
    const tr = mxx + myy;
    const det = mxx * myy - mxy * mxy;
    const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const lambda1 = tr / 2 + disc;
    const lambda2 = tr / 2 - disc;
    if (lambda2 < 1e-6) return null;
    const elongation = Math.sqrt(lambda1 / lambda2);
    if (elongation < 1.5) return null;
    const theta = 0.5 * Math.atan2(2 * mxy, mxx - myy);
    const absDeg = Math.abs(theta * 180 / Math.PI);
    if (absDeg >= 22 && absDeg <= 75) return 'drop';
  }

  return null;
}

/** Visual upscale factor when generating a replacement element so its
 *  visible silhouette roughly matches the original shard's bbox. The numbers
 *  account for `drawElement`'s internal R formulas (`R = size * 0.42`, plus
 *  per-element multipliers). */
const ELEMENT_SIZE_SCALE: Record<string, number> = {
  sun: 1.18,
  drop: 1.50,
  star: 1.10,
  heart: 1.10,
  cloud: 1.10,
  snowflake: 1.15,
  flower: 1.10,
  moon: 1.10,
  diamond: 1.10,
  note: 1.20,
};

// ─────────────────────────────── Effect ───────────────────────────────

export class CrayonShatter extends BaseEffect {
  readonly name = 'crayonShatter';
  override readonly heavy = true;

  private shards: CrayonShard[] = [];
  private builtForText = '';
  private builtForWidth = 0;
  private builtForHeight = 0;
  /** Per-build random salt — added to every hashUnit seed so re-selecting
   *  the same template produces a fresh shard layout / colour / element
   *  combination instead of the deterministic "same picture every time"
   *  the user got. Refreshed at the top of every build(). */
  private buildSalt = 0;

  protected setup(): void { /* lazy build */ }

  private build(text: string, sw: number, sh: number): void {
    this.releaseShards();
    this.buildSalt = Math.floor(Math.random() * 1e6);
    this.builtForText = text;
    this.builtForWidth = sw;
    this.builtForHeight = sh;
    if (!text) return;

    const fontSize = this.config.fontSize ?? 130;
    const fontFamily = this.config.fontFamily
      ?? '"Yu Gothic", "Hiragino Sans", "Helvetica Neue", Arial, sans-serif';
    const fontWeight = String(this.config.fontWeight ?? '700');
    const alphaThreshold = this.config.alphaThreshold ?? 60;
    const minAreaFrac = this.config.minAreaFrac ?? 0.001;
    const preErosionIters = Math.max(0, this.config.preErosionIters ?? 0);
    const charSpacing = (this.config.charSpacingFrac ?? 1.05) * fontSize;
    // Two-column vertical layout: first half of the string in the right
    // column (read first, traditional CJK reading order), second half in
    // the left column. colSpacingFrac controls inter-column gap.
    const colSpacing = (this.config.colSpacingFrac ?? 1.4) * fontSize;
    const dpr = this.renderer?.resolution ?? 1;

    const colorList = resolveColorList(this.config.colors, this.palette);
    const baseColor = hexToTint(resolveColor(
      String(this.config.baseColor ?? DEFAULT_BASE_COLOR), this.palette,
    ));
    const replacements: Record<string, string> = {
      ...DEFAULT_REPLACEMENTS,
      ...((this.config.replacements as Record<string, string> | undefined) ?? {}),
    };

    // ── Two-stage shard rolling ───────────────────────────────────────
    // Stage 1: each character spends a small "pick budget" (per-char
    // distribution: 25% 0 / 55% 1 / 15% 2 / 5% 3) sampled by size weight
    // (small shards favoured) — so most chars have just one decorated
    // shard and the readable backbone stays intact.
    //
    // Stage 2: picked shards roll four independent sub-effects.
    // (Recolour is implicit on every picked shard.) char-level
    // replacements (e.g. user typed `☆`) auto-pick.
    const replaceProb = clamp01(this.config.replaceProb ?? 0.35);
    const offsetProb  = clamp01(this.config.offsetProb  ?? 0.55);
    const rotateProb  = clamp01(this.config.rotateProb  ?? 0.55);
    const outlineProb = clamp01(this.config.outlineProb ?? 0.65);
    // swingProb: probability that a picked NON-element-replacement shard
    // gets the per-boil-frame swing animation (small left-right rotation
    // wobble around staticBaseAngle). Element-replaced shards already use
    // their own elementAnim — swing roll is skipped for them.
    const swingProb   = clamp01(this.config.swingProb   ?? 0);
    const maxOffsetPx = Math.max(0, this.config.maxOffsetPx ?? 5);
    const maxRotateDeg = Math.max(0, this.config.maxRotateDeg ?? 14);
    // Random replacement only on small/medium shards so it doesn't smother
    // main strokes.
    const randomReplaceMaxSizeFrac = Math.max(
      0, this.config.randomReplaceMaxSizeFrac ?? 0.32,
    );

    // Outline knobs. Hold-frame outline animation switches frame index every
    // `frameHoldSec`; vertex jitter must stay much smaller than vertex
    // spacing or stroke paths self-cross and the line frays into a fuzzy
    // mess. Chaikin smoothing rounds off pixel stairsteps so the comic line
    // reads as a pen sweep.
    // Defaults below mirror what the catalog sets (effectCatalog.ts) and
    // what the previous demo template used: 1.5 / 0.6 / 6 / 2. Two
    // diverging defaults (catalog vs code) used to mean callsite-specific
    // surprises if anyone ever stripped the catalog config — keep them
    // aligned so behaviour is identical regardless of who supplies cfg.
    const outlineLineWidth = this.config.outlineLineWidth ?? 1.5;
    const outlineJitter = this.config.outlineJitter ?? 0.6;
    const outlineSimplify = Math.max(1, Math.floor(this.config.outlineSimplify ?? 6));
    const outlineSmoothIters = Math.max(0, Math.floor(this.config.outlineSmoothIters ?? 2));
    const outlineHalo = this.config.outlineHalo === true;        // default OFF
    // outlineColor: 'tint' (same as sprite — old behaviour, low contrast),
    // 'base' (use baseColor — looks like a comic ink line over coloured
    // shards), or any hex string ('#000000', '#5a3a5a', ...).
    const outlineColorMode = String(this.config.outlineColor ?? 'base');
    const baseColorHex = String(this.config.baseColor ?? DEFAULT_BASE_COLOR);
    const customColorHex = outlineColorMode.startsWith('#')
      ? outlineColorMode : null;

    const chars = [...text];
    // Two-column vertical, both columns horizontally centered as a pair.
    // Right column = first half (read first), left column = second half.
    // Layout knobs:
    //   colRowPhase  — fraction of charSpacing the LEFT column shifts down
    //                  vs right, so rows interlock like brickwork instead
    //                  of forming a rigid grid (default 0.45).
    //   layoutJitter — per-char deterministic ± nudge in BOTH axes, in
    //                  fractions of fontSize. Rounded to integer px so it
    //                  does not break sprite raster stability (default 0.05
    //                  ≈ ±5 px on a 100 px font).
    const colCenterX = sw * (this.config.x ?? 0.5);
    const colCenterY = sh * (this.config.y ?? 0.5);
    const half = Math.ceil(chars.length / 2);
    const colCounts = [half, chars.length - half];          // [right, left]
    const colXOffset = chars.length > 1
      ? [+colSpacing / 2, -colSpacing / 2]                  // right, left
      : [0, 0];                                             // single char → centered
    const colRowPhase = chars.length > 1
      ? [0, this.config.colRowPhase ?? 0.45]                // left column drops by half a row
      : [0, 0];
    const layoutJitterPx = (this.config.layoutJitter ?? 0.05) * fontSize;

    const cellPx = Math.ceil(fontSize * dpr) + Math.ceil(RENDER_PADDING * dpr) * 2;
    const minAreaPx = Math.max(4, Math.floor(fontSize * fontSize * minAreaFrac * dpr * dpr));

    for (let ci = 0; ci < chars.length; ci++) {
      const char = chars[ci];
      // Column 0 = right (first half), column 1 = left (second half).
      // Both columns share the same top edge, with the left column phased
      // down by colRowPhase × charSpacing for a brickwork interlock.
      // Per-char deterministic jitter (hashed on ci + buildSalt) breaks
      // the rigid grid feel; rounded to int px to preserve raster stability.
      const colIdx = ci < half ? 0 : 1;
      const rowIdx = ci < half ? ci : ci - half;
      const maxRows = Math.max(colCounts[0], colCounts[1]);
      const totalH = (maxRows - 1) * charSpacing;
      const topY = colCenterY - totalH / 2;
      const layoutSeed = ci * 73 + this.buildSalt + 91;
      const charJX = Math.round(hashSigned(layoutSeed * 17 + 3) * layoutJitterPx);
      const charJY = Math.round(hashSigned(layoutSeed * 23 + 5) * layoutJitterPx);
      const charCenterX = colCenterX + colXOffset[colIdx] + charJX;
      const charCenterY = topY + (rowIdx + colRowPhase[colIdx]) * charSpacing + charJY;

      const replType = replacements[char];
      const isReplacement = !!replType;

      // ── Char-level replacement: skip CCL, build ONE element wrapper.
      // Going through CCL split a sun into [centre disc + 8 ray strokes],
      // each treated as an inert sub-shard, so the element ended up frozen.
      // Building a single wrapper with the element's full canvas + its
      // proper elementAnim restores the spin / pulse / rotate / swing /
      // … animations on char-level inputs.
      if (replType) {
        const seedCl = ci * 1009 + 17 + this.buildSalt;
        const colorPickCl = hashUnit(seedCl * 71 + 13);
        const offsetXSeedCl = hashSigned(seedCl * 11 + 27);
        const offsetYSeedCl = hashSigned(seedCl * 17 + 29);
        const rotateSeedCl = hashSigned(seedCl * 19 + 31);
        const offsetRollCl = hashUnit(seedCl * 47 + 13);
        const rotateRollCl = hashUnit(seedCl * 41 + 19);
        const outlineRollCl = hashUnit(seedCl * 37 + 23);

        const tintCl = colorList.length > 0
          ? colorList[Math.floor(colorPickCl * colorList.length)]
          : baseColor;
        const offX = offsetRollCl < offsetProb ? offsetXSeedCl * maxOffsetPx : 0;
        const offY = offsetRollCl < offsetProb ? offsetYSeedCl * maxOffsetPx : 0;
        const angCl = rotateRollCl < rotateProb
          ? rotateSeedCl * (maxRotateDeg * Math.PI / 180) : 0;
        const hasOutlineCl = outlineRollCl < outlineProb;

        const baseDimPxCl = fontSize * dpr;
        const elementSizeCl = baseDimPxCl * (ELEMENT_SIZE_SCALE[replType] ?? 1.15);
        const padCl = Math.max(4, Math.ceil(elementSizeCl * 0.15));
        const cwCl = Math.ceil(elementSizeCl) + padCl * 2;

        const elCanvas = document.createElement('canvas');
        elCanvas.width = cwCl;
        elCanvas.height = cwCl;
        const ectx = elCanvas.getContext('2d');
        if (!ectx) continue;
        drawElement(ectx, replType, cwCl / 2, cwCl / 2, elementSizeCl);
        const elImg = ectx.getImageData(0, 0, cwCl, cwCl);

        const wrapperCl = new PIXI.Container();
        wrapperCl.x = Math.round(charCenterX + offX);
        wrapperCl.y = Math.round(charCenterY + offY);
        wrapperCl.rotation = angCl;

        const texCl = PIXI.Texture.from(elCanvas);
        texCl.source.scaleMode = 'nearest';
        const spriteCl = new PIXI.Sprite(texCl);
        spriteCl.anchor.set(0.5);
        spriteCl.tint = tintCl;
        spriteCl.scale.set(1 / dpr);
        spriteCl.roundPixels = true;
        wrapperCl.addChild(spriteCl);

        const outlineColorCl = customColorHex
          ?? (outlineColorMode === 'tint' ? tintToHex(tintCl) : baseColorHex);
        let outlineGCl: PIXI.Graphics | null = null;
        let contoursCl: number[][][] | null = null;
        if (hasOutlineCl) {
          contoursCl = extractContours(
            elImg, Math.max(20, alphaThreshold * 0.6),
            outlineSimplify, outlineSmoothIters,
          );
          outlineGCl = new PIXI.Graphics();
          drawJitteredOutline(
            outlineGCl, contoursCl,
            cwCl / 2, cwCl / 2, 1 / dpr,
            outlineColorCl,
            outlineLineWidth, outlineJitter,
            seedCl * 0.137, 0, outlineHalo,
          );
          wrapperCl.addChild(outlineGCl);
        }

        let spinRaysCl: PIXI.Graphics | null = null;
        let spinRaysParentCl: PIXI.Container | null = null;
        let spinStepRadCl = 0;
        let elementAnimCl: CrayonShard['elementAnim'] = 'none';
        if (replType === 'sun') {
          // Sun: spinRays in uncached sibling container (see CCL-loop sun
          // branch for the full rationale). Avoids per-tick wrapper cache
          // refresh when the rays rotate.
          const discR = elementSizeCl * SUN_DISC_FRAC / dpr;
          spinRaysCl = new PIXI.Graphics();
          drawSunRaysToGraphics(spinRaysCl, discR, tintToHex(tintCl));
          spinRaysParentCl = new PIXI.Container();
          spinRaysParentCl.x = wrapperCl.x;
          spinRaysParentCl.y = wrapperCl.y;
          spinRaysParentCl.rotation = angCl;
          spinRaysParentCl.addChild(spinRaysCl);
          const spinScale = this.config.spinSpeedScale ?? 1;
          spinStepRadCl = (0.18 + Math.abs(rotateSeedCl) * 0.18)
            * (rotateSeedCl >= 0 ? 1 : -1) * spinScale;
          elementAnimCl = 'spin-rays';
        } else if (replType === 'snowflake' || replType === 'flower' || replType === 'diamond') {
          elementAnimCl = 'rotate';
        } else if (replType === 'star' || replType === 'heart') {
          elementAnimCl = 'pulse';
        } else if (replType === 'note') {
          elementAnimCl = 'swing';
        }

        this.container.addChild(wrapperCl);
        wrapperCl.cacheAsTexture(true);
        if (spinRaysParentCl) this.container.addChild(spinRaysParentCl);
        this.shards.push({
          wrapper: wrapperCl, sprite: spriteCl, texture: texCl,
          outline: outlineGCl, contours: contoursCl,
          shardCenterX: cwCl / 2,
          shardCenterY: cwCl / 2,
          outlineScale: 1 / dpr,
          outlineColorHex: outlineColorCl,
          outlineLineWidth, outlineJitter,
          outlineSeed: seedCl * 0.137,
          outlineHalo,
          frameIdx: 0,
          spinRays: spinRaysCl, spinRaysParent: spinRaysParentCl,
          spinStepRad: spinStepRadCl,
          elementAnim: elementAnimCl,
          staticBaseAngle: angCl,
        });
        continue;  // skip the CCL pipeline entirely for this char.
      }

      const off = document.createElement('canvas');
      off.width = cellPx;
      off.height = cellPx;
      const ctx2d = off.getContext('2d', { willReadFrequently: true });
      if (!ctx2d) continue;

      drawCrayonText(
        ctx2d, char, cellPx / 2, cellPx / 2,
        fontSize * dpr, fontFamily, fontWeight,
        1, 0,
      );

      const imageData = ctx2d.getImageData(0, 0, cellPx, cellPx);

      const components = findGlyphShards(imageData.data, cellPx, cellPx, alphaThreshold, preErosionIters)
        .filter(c => c.area >= minAreaPx);
      if (components.length === 0) continue;

      const src = imageData.data;

      // ── Per-char pick budget ────────────────────────────────────────
      // Each character independently rolls how many of its CCL shards get
      // decorated. Distribution per char:
      //   0 picked → 25%, 1 → 55%, 2 → 15%, 3 → 5%.
      // Within the budget we sample shards via roulette wheel weighted
      // by size (small shards weight higher → small dots / side strokes
      // get picked more often than main strokes), so the readable bones
      // of the glyph stay intact.
      const pickedSet = new Set<number>();
      if (components.length > 0) {
        const charSeed = ci * 99 + this.buildSalt;
        const distR = hashUnit(charSeed * 41 + 7);
        const targetCount = distR < 0.25 ? 0
                          : distR < 0.80 ? 1
                          : distR < 0.95 ? 2
                          :                3;
        if (targetCount > 0) {
          const weights: number[] = new Array(components.length);
          let totalW = 0;
          for (let i = 0; i < components.length; i++) {
            const c = components[i];
            const dim = Math.max(c.maxX - c.minX + 1, c.maxY - c.minY + 1);
            const sf = dim / (fontSize * dpr);
            const w = Math.max(0.25, 1.8 - sf * 2.0);
            weights[i] = w;
            totalW += w;
          }
          const remaining = weights.slice();
          let remainTotal = totalW;
          const pickN = Math.min(targetCount, components.length);
          for (let k = 0; k < pickN; k++) {
            if (remainTotal <= 0) break;
            const r = hashUnit(charSeed * 71 + k * 13) * remainTotal;
            let acc = 0;
            for (let i = 0; i < components.length; i++) {
              if (pickedSet.has(i)) continue;
              acc += remaining[i];
              if (acc >= r) {
                pickedSet.add(i);
                remainTotal -= remaining[i];
                remaining[i] = 0;
                break;
              }
            }
          }
        }
      }

      // ── Char-level outline ─────────────────────────────────────────
      // Strategy: paint every shard's POST-TRANSFORM, POST-REPLACEMENT
      // shape into a cellPx-sized alpha canvas (same coord system as the
      // original glyph raster), then extract contours from that canvas
      // and draw ONE outline Graphics on a char-level wrapper at
      // (charCenterX, charCenterY). The outline therefore traces what
      // is actually displayed, not the original raster — picked shards
      // can offset / rotate freely without breaking outline alignment,
      // and element replacements (sun / heart / etc.) get outlined as
      // their replacement silhouette instead of the original stroke.
      const charOutlineSeed = ci * 257 + this.buildSalt + 53;
      const outlineEnabledForChar = hashUnit(charOutlineSeed) < outlineProb;
      let outlineComposeCanvas: HTMLCanvasElement | null = null;
      let outlineComposeCtx: CanvasRenderingContext2D | null = null;
      if (outlineEnabledForChar) {
        outlineComposeCanvas = document.createElement('canvas');
        outlineComposeCanvas.width = cellPx;
        outlineComposeCanvas.height = cellPx;
        outlineComposeCtx = outlineComposeCanvas.getContext('2d');
      }

      for (let si = 0; si < components.length; si++) {
        const comp = components[si];
        const sw2 = comp.maxX - comp.minX + 1;
        const sh2 = comp.maxY - comp.minY + 1;
        if (sw2 <= 0 || sh2 <= 0) continue;

        const seed = ci * 1009 + si * 31 + 17 + this.buildSalt;

        // ── Stage 1: pick (or not) ────────────────────────────────────
        // char-level replacement (user typed `☆`) is auto-picked.
        const isPicked = isReplacement || pickedSet.has(si);

        // Sub-rolls (only consulted if isPicked).
        const replaceRoll = hashUnit(seed * 53 + 9);
        const offsetRoll  = hashUnit(seed * 47 + 13);
        const rotateRoll  = hashUnit(seed * 41 + 19);
        const outlineRoll = hashUnit(seed * 37 + 23);
        const colorPick   = hashUnit(seed * 71 + 13);
        const elementPick = hashUnit(seed * 23 + 5);
        const offsetXSeed = hashSigned(seed * 11 + 27);
        const offsetYSeed = hashSigned(seed * 17 + 29);
        const rotateSeed  = hashSigned(seed * 19 + 31);

        // Shape-driven replacement (sun for round dots, drop for diagonal
        // brush strokes) takes priority over the random replacement roll —
        // these mappings give the symbol a meaningful identity.
        const shardShapeType: 'sun' | 'drop' | null = (isPicked && !isReplacement)
          ? analyzeShardShape(comp, cellPx, fontSize * dpr)
          : null;

        // Random replacement only on small shards so we don't smother main
        // strokes; pulls from RANDOM_ELEMENT_POOL instead of the shape map.
        const baseDimPx = Math.max(sw2, sh2);
        const sizeFracHere = baseDimPx / (fontSize * dpr);
        let randomReplType: string | null = null;
        if (isPicked && !isReplacement && !shardShapeType
            && sizeFracHere <= randomReplaceMaxSizeFrac
            && replaceRoll < replaceProb
            && RANDOM_ELEMENT_POOL.length > 0) {
          const idx = Math.floor(elementPick * RANDOM_ELEMENT_POOL.length);
          randomReplType = RANDOM_ELEMENT_POOL[Math.min(idx, RANDOM_ELEMENT_POOL.length - 1)];
        }

        const shardReplType: string | null = shardShapeType ?? randomReplType;
        const isShardReplacement = shardReplType !== null;

        const shardCanvas = document.createElement('canvas');
        const sctx = shardCanvas.getContext('2d');
        if (!sctx) continue;

        let compImg: ImageData;
        let canvasW: number;
        let canvasH: number;
        if (isShardReplacement && shardReplType) {
          const elementSize = baseDimPx * (ELEMENT_SIZE_SCALE[shardReplType] ?? 1.15);
          const padding = Math.max(4, Math.ceil(elementSize * 0.15));
          canvasW = Math.ceil(elementSize) + padding * 2;
          canvasH = canvasW;
          shardCanvas.width = canvasW;
          shardCanvas.height = canvasH;
          drawElement(sctx, shardReplType, canvasW / 2, canvasH / 2, elementSize);
          compImg = sctx.getImageData(0, 0, canvasW, canvasH);
        } else {
          canvasW = sw2;
          canvasH = sh2;
          shardCanvas.width = canvasW;
          shardCanvas.height = canvasH;
          compImg = sctx.createImageData(sw2, sh2);
          for (const offIdx of comp.pixels) {
            const px = offIdx % cellPx;
            const py = (offIdx - px) / cellPx;
            const dx = px - comp.minX;
            const dy = py - comp.minY;
            const di = (dy * sw2 + dx) * 4;
            const sj = offIdx * 4;
            compImg.data[di] = src[sj];
            compImg.data[di + 1] = src[sj + 1];
            compImg.data[di + 2] = src[sj + 2];
            compImg.data[di + 3] = src[sj + 3];
          }
          sctx.putImageData(compImg, 0, 0);
        }

        // Recolour: only on picked shards. Untouched shards stay as the
        // base hue so the word remains readable.
        const tint = (isPicked && colorList.length > 0)
          ? colorList[Math.floor(colorPick * colorList.length)]
          : baseColor;

        // Static offset / rotation: BOTH apply to picked shards including
        // element replacements. Earlier element-replaced shards opted out
        // of static offset because the old char-level outline traced the
        // original raster — translating an element broke alignment with
        // the outline. With the compose-canvas pipeline the outline is
        // extracted from the POST-TRANSFORM raster, so an offset element
        // gets its outline at the offset position too — no misalignment,
        // no reason to suppress.
        const hasStaticOffset = isPicked && offsetRoll < offsetProb;
        const offsetX = hasStaticOffset ? offsetXSeed * maxOffsetPx : 0;
        const offsetY = hasStaticOffset ? offsetYSeed * maxOffsetPx : 0;

        const hasStaticRotation = isPicked && rotateRoll < rotateProb;
        const staticAngle = hasStaticRotation
          ? rotateSeed * (maxRotateDeg * Math.PI / 180)
          : 0;

        // Paint this shard's POST-TRANSFORM, POST-REPLACEMENT shape into
        // the char's outline-compose canvas. The compose canvas is in the
        // same cellPx coord system as the original glyph raster, so
        // contour extraction yields the actual visible silhouette of the
        // char as displayed (with picked-shard offsets and replacements
        // baked in). offsetX/Y are in display logical px → multiply by
        // dpr to land in cellPx coords. Rotation pivots around the shard
        // centre, matching the sprite (anchor 0.5, wrapper.rotation).
        if (outlineComposeCtx) {
          outlineComposeCtx.save();
          const cx = (comp.minX + comp.maxX + 1) / 2;
          const cy = (comp.minY + comp.maxY + 1) / 2;
          outlineComposeCtx.translate(cx + offsetX * dpr, cy + offsetY * dpr);
          if (staticAngle !== 0) outlineComposeCtx.rotate(staticAngle);
          outlineComposeCtx.drawImage(shardCanvas, -canvasW / 2, -canvasH / 2);
          outlineComposeCtx.restore();
        }

        // Per-shard outline roll removed — outline is now char-level
        // (drawn once around the whole glyph at the end of the ci loop).
        // outlineRoll var below is left dead (cheap) to keep seed indices
        // stable across builds.
        void outlineRoll;

        // Wrapper container — all transforms are static. Position is
        // SNAPPED to integer pixels so the GPU's sprite vertex shader lands
        // on whole-texel positions every frame, killing sub-pixel
        // bilinear-sampling shimmer (the actual root cause of the multi-
        // char 60Hz flicker).
        const wrapper = new PIXI.Container();
        const shardCenterPx = (comp.minX + comp.maxX + 1) / 2;
        const shardCenterPy = (comp.minY + comp.maxY + 1) / 2;
        const offsetXLogical = (shardCenterPx - cellPx / 2) / dpr;
        const offsetYLogical = (shardCenterPy - cellPx / 2) / dpr;
        wrapper.x = Math.round(charCenterX + offsetXLogical + offsetX);
        wrapper.y = Math.round(charCenterY + offsetYLogical + offsetY);
        wrapper.rotation = staticAngle;

        const texture = PIXI.Texture.from(shardCanvas);
        // PIXI v8 defaults to linear filtering on canvas-backed textures;
        // with sprite.scale = 1/dpr that lets sub-pixel sample drift cause
        // 60Hz edge shimmer. Force nearest sampling + integer-pixel snap.
        texture.source.scaleMode = 'nearest';
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.tint = tint;
        sprite.scale.set(1 / dpr);
        sprite.roundPixels = true;
        wrapper.addChild(sprite);

        // outlineColorResolved: lets each shard's tint flavour the
        // colour-mode='tint' path. For 'base' / hex it's char-invariant.
        const outlineColorResolved =
          customColorHex ??
          (outlineColorMode === 'tint' ? tintToHex(tint) : baseColorHex);

        // Per-shard outline removed: the comic line is char-level (drawn
        // ONCE per char from the post-transform compose canvas — see end
        // of ci-loop). Each shard wrapper carries no outline of its own.
        const outline: PIXI.Graphics | null = null;
        const contours: number[][][] | null = null;

        // Element-specific decorative animation. Each element type picks a
        // boil animation style — these are applied per boil-frame in
        // update(), in lockstep with the outline boil cadence so the whole
        // effect feels like one cohesive limited-animation pass.
        let spinRays: PIXI.Graphics | null = null;
        let spinRaysParent: PIXI.Container | null = null;
        let spinStepRad = 0;
        let elementAnim: CrayonShard['elementAnim'] = 'none';
        if (shardReplType === 'sun') {
          // Sun: rays spin around the disc. spinRays must NOT be a child
          // of the cached shard wrapper — otherwise every boil-tick
          // rotation change forces wrapper.updateCacheTexture(), which
          // re-rasterises the entire ~270×270 cached quad. With multiple
          // suns ticking on the same frame this stacks into a visible
          // GPU stall ("画面会频闪"). Instead we host spinRays in an
          // uncached sibling container at the same (post-offset)
          // position + staticAngle as the shard wrapper; rotating
          // spinRays only modifies Graphics state, no cache to refresh.
          const elemSizeForRays = baseDimPx * (ELEMENT_SIZE_SCALE['sun'] ?? 1.18);
          const discR = elemSizeForRays * SUN_DISC_FRAC / dpr;
          spinRays = new PIXI.Graphics();
          drawSunRaysToGraphics(spinRays, discR, tintToHex(tint));
          spinRaysParent = new PIXI.Container();
          spinRaysParent.x = wrapper.x;
          spinRaysParent.y = wrapper.y;
          spinRaysParent.rotation = staticAngle;
          spinRaysParent.addChild(spinRays);
          const spinScale = this.config.spinSpeedScale ?? 1;
          spinStepRad = (0.18 + Math.abs(rotateSeed) * 0.18)
            * (rotateSeed >= 0 ? 1 : -1)
            * spinScale;
          elementAnim = 'spin-rays';
        } else if (shardReplType === 'snowflake'
                || shardReplType === 'flower'
                || shardReplType === 'diamond') {
          // Whole element rotates one boil-step at a time.
          elementAnim = 'rotate';
        } else if (shardReplType === 'star'
                || shardReplType === 'heart') {
          // Pulse — scale wobble synced with boil ticks (heartbeat).
          elementAnim = 'pulse';
        } else if (shardReplType === 'note') {
          // Swing — small left-right tilt per boil-step; reads as a
          // metronome / musical sway, not as flicker.
          elementAnim = 'swing';
        } else if (isPicked && hashUnit(seed * 89 + 11) < swingProb) {
          // Plain shading shard (no element replacement) eligible for the
          // swing animation. Roll once per shard so each picked stroke
          // independently decides; staticBaseAngle is preserved as the
          // baseline so this composes with any random initial rotation.
          // Cheap to animate — wrapper.rotation is a display transform,
          // PIXI applies it on top of the cached quad (no cache refresh).
          elementAnim = 'swing';
        }
        // Other element types (drop / cloud / moon) stay visually still —
        // they read fine as static decoration.

        this.container.addChild(wrapper);

        // Cache EVERY wrapper (animated or not). Multi-char flicker came
        // from N independent sprite raster calls every frame — wrapping
        // each shard in its own cached quad collapses them to N quad
        // blits with no per-frame raster drift. Animated wrappers
        // invalidate + re-cache once per boil tick (in update()), so
        // outline boil and sun-ray step still play but the in-between
        // frames stay rock-stable.
        wrapper.cacheAsTexture(true);

        // spinRaysParent (sun only) is the uncached sibling that hosts
        // the spinning rays Graphics — added AFTER wrapper so rays
        // render on top of the cached sprite.
        if (spinRaysParent) this.container.addChild(spinRaysParent);

        this.shards.push({
          wrapper, sprite, texture, outline, contours,
          shardCenterX: canvasW / 2,
          shardCenterY: canvasH / 2,
          outlineScale: 1 / dpr,
          outlineColorHex: outlineColorResolved,
          outlineLineWidth, outlineJitter,
          outlineSeed: seed * 0.137,
          outlineHalo,
          frameIdx: 0,
          spinRays, spinRaysParent, spinStepRad,
          elementAnim,
          staticBaseAngle: staticAngle,
        });
      }

      // ── Char-level comic outline ────────────────────────────────────
      // The si loop above painted every shard's POST-TRANSFORM, POST-
      // REPLACEMENT silhouette into outlineComposeCanvas (cellPx ×
      // cellPx, same coord system as the original glyph raster). Now
      // extract contours from that compose canvas and draw ONE outline
      // Graphics on a char-level wrapper centred at charCenterX/Y. The
      // outline therefore traces what is actually displayed — picked-
      // shard offsets / rotations / element replacements are all
      // already baked into the compose canvas, so the line aligns with
      // every visible piece without per-shard parenting tricks.
      if (outlineEnabledForChar && outlineComposeCanvas && outlineComposeCtx) {
        // No minComponentArea filter: compose canvas already only holds
        // shards that survived findGlyphShards' minAreaPx (~53 px²
        // default). Earlier we filtered at outline-side too, because
        // outline-on-raw-raster would draw outlines at original raster
        // positions even when sprites had drifted off — so a small CCL's
        // outline could appear "凭空" (in empty space). With compose
        // canvas (post-transform) the outline is always on top of the
        // visible sprite, so any CCL worth drawing is worth outlining.
        const composeImg = outlineComposeCtx.getImageData(0, 0, cellPx, cellPx);
        const charContours = extractContours(
          composeImg,
          Math.max(20, alphaThreshold * 0.6),
          outlineSimplify,
          outlineSmoothIters,
          0,
        );
        if (charContours.length > 0) {
          // outlineColorMode resolution at char-level:
          //   '#xxx' (custom hex) → use as-is
          //   'tint'              → pick a colorList entry deterministic
          //                         in the char (so the whole-glyph ink
          //                         line carries one of the same hues
          //                         that picked shards may use). Without
          //                         this branch the 'tint' mode silently
          //                         fell through to baseColor — divergent
          //                         from the per-shard path which honours
          //                         'tint' via tintToHex(tint).
          //   anything else / 'base' → baseColor (default ink line)
          let outlineColorForChar: string;
          if (customColorHex) {
            outlineColorForChar = customColorHex;
          } else if (outlineColorMode === 'tint' && colorList.length > 0) {
            const idx = Math.floor(hashUnit(charOutlineSeed * 191 + 7)
              * colorList.length) % colorList.length;
            outlineColorForChar = tintToHex(colorList[idx]);
          } else {
            outlineColorForChar = baseColorHex;
          }
          const outlineG = new PIXI.Graphics();
          drawJitteredOutline(
            outlineG, charContours,
            cellPx / 2, cellPx / 2,
            1 / dpr,
            outlineColorForChar,
            outlineLineWidth, outlineJitter,
            charOutlineSeed * 0.137,
            0,
            outlineHalo,
          );
          const wrapperOutline = new PIXI.Container();
          wrapperOutline.x = Math.round(charCenterX);
          wrapperOutline.y = Math.round(charCenterY);
          wrapperOutline.addChild(outlineG);
          this.container.addChild(wrapperOutline);
          // NOT cacheAsTexture'd: a Graphics-only container has no sprite
          // bounds, and PIXI 8 cacheAsTexture on such a wrapper bakes an
          // empty quad → the outline disappears. Vector Graphics doesn't
          // have the sub-pixel raster shimmer problem that needed caching
          // in the first place.

          this.shards.push({
            wrapper: wrapperOutline,
            sprite: null,
            texture: null,
            outline: outlineG,
            contours: charContours,
            shardCenterX: cellPx / 2,
            shardCenterY: cellPx / 2,
            outlineScale: 1 / dpr,
            outlineColorHex: outlineColorForChar,
            outlineLineWidth, outlineJitter,
            outlineSeed: charOutlineSeed * 0.137,
            outlineHalo,
            frameIdx: 0,
            spinRays: null,
            spinRaysParent: null,
            spinStepRad: 0,
            elementAnim: 'none',
            staticBaseAngle: 0,
          });
        }
      }
    }
  }

  private releaseShards(): void {
    for (const s of this.shards) {
      try { this.container.removeChild(s.wrapper); } catch { /* gone */ }
      try { s.sprite?.destroy(); } catch { /* gone */ }
      try { s.texture?.destroy(true); } catch { /* gone */ }
      if (s.outline) {
        try { s.outline.destroy(); } catch { /* gone */ }
      }
      if (s.spinRays) {
        try { s.spinRays.destroy(); } catch { /* gone */ }
      }
      if (s.spinRaysParent) {
        try { this.container.removeChild(s.spinRaysParent); } catch { /* gone */ }
        try { s.spinRaysParent.destroy(); } catch { /* gone */ }
      }
      try { s.wrapper.destroy(); } catch { /* gone */ }
    }
    this.shards = [];
  }

  update(ctx: UpdateContext): void {
    const text = ctx.currentText ?? '';
    if (text !== this.builtForText
        || ctx.screenWidth !== this.builtForWidth
        || ctx.screenHeight !== this.builtForHeight) {
      this.build(text, ctx.screenWidth, ctx.screenHeight);
    }
    if (this.shards.length === 0) return;

    // Hold-frame outline boil: redraws happen ONLY when the integer frame
    // index changes (≈ once every frameHoldSec). Setting frameHoldSec <= 0
    // freezes the outline as a print.
    // Per-shard time offset (`shardTOffset`) STAGGERS the boil ticks so
    // not every shard re-tessellates on the same frame. Without staggering,
    // all N outline Graphics re-tessellate together once per frameHoldSec
    // → one big GPU stall every ~11 frames at 60Hz, visible as flicker
    // when N is large ("字多了会闪"). With per-shard offset spread across
    // [0, frameHoldSec * frameCount), each frame only ~N/(frameHoldSec*60)
    // shards retick → peak per-frame redraw work is roughly N → ~1/N of
    // before.
    const frameHoldSec = this.config.frameHoldSec ?? 0.18;
    const frameCount = Math.max(2, Math.floor(this.config.frameCount ?? 4));
    const speed = ctx.animationSpeed;
    const t = ctx.time * speed;
    const cyclePeriod = frameHoldSec * frameCount;

    for (const s of this.shards) {
      // Boil tick: outline jitter + element animation step. Display-level
      // wrapper transforms (alpha / rotation / scale) don't need cache
      // invalidate — PIXI applies them on top of the cached quad. Inner
      // child changes (outline redraw, spinRays.rotation) DO need
      // updateCacheTexture() to push the new state into the cache.
      const shardTOffset = frameHoldSec > 0
        ? (Math.abs(s.outlineSeed) * 0.0731) % cyclePeriod
        : 0;
      const targetFrame = frameHoldSec > 0
        ? Math.floor((t + shardTOffset) / frameHoldSec) % frameCount
        : 0;
      if (frameHoldSec > 0 && targetFrame !== s.frameIdx) {
        let needsCacheRefresh = false;

        // 1) Outline boil (inner Graphics redraw → cache refresh).
        if (s.outline && s.contours) {
          drawJitteredOutline(
            s.outline, s.contours,
            s.shardCenterX, s.shardCenterY,
            s.outlineScale,
            s.outlineColorHex,
            s.outlineLineWidth, s.outlineJitter,
            s.outlineSeed,
            targetFrame,
            s.outlineHalo,
          );
          needsCacheRefresh = true;
        }

        // 2) Element animation. Each animation kind uses a NON-uniform
        // 4-pose base (pose array is deliberately uneven — uniform steps
        // read as a clock hand, uneven ones read as hand-drawn) plus a
        // tiny per-(shard, frame) deterministic jitter so neighbouring
        // shards on the same frame show slightly different positions.
        // The jitter is hashed on (seed, frame), not random, so the same
        // frame always renders the same pose → still no flicker.
        // Shards with elementAnim === 'none' (the majority — plain
        // shading shards without sun/note/heart/etc. replacement) skip
        // the whole element-anim section. Used to compute phaseFrame +
        // declare fjit per tick on every shard, then fall through the
        // switch with no matching case — wasted CPU on the hot path.
        if (s.elementAnim !== 'none') {
        const phaseFrame = (targetFrame + (s.outlineSeed * 7 | 0)) % 4;
        const fjit = (mag: number) =>
          hashSigned(s.outlineSeed * 137 + targetFrame * 53) * mag;

        switch (s.elementAnim) {
          case 'spin-rays':
            // sun: rays step around the disc, with tiny per-frame wiggle
            // so it doesn't tick like a second hand. spinRays now lives
            // in spinRaysParent (uncached sibling), so rotating it does
            // NOT need wrapper.updateCacheTexture — the rotation just
            // applies on the Graphics directly. This is what killed the
            // multi-sun "画面会频闪" stall.
            if (s.spinRays) {
              s.spinRays.rotation =
                targetFrame * s.spinStepRad + fjit(0.18);
            }
            break;
          case 'rotate': {
            // Whole element snaps between 4 hand-drawn poses + jitter.
            // Angles are uneven on purpose (not 0/π/4/π/2/3π/4).
            const ROT_POSES = [0, 0.38, 0.95, 1.45];
            s.wrapper.rotation =
              s.staticBaseAngle + ROT_POSES[phaseFrame] + fjit(0.14);
            break;
          }
          case 'pulse': {
            // Heartbeat — punchy on beat 1 + 2, recover on 3, undershoot
            // on 4 (uneven recovery is the part that reads as drawn).
            const PULSE_POSES = [1.00, 1.12, 1.03, 0.92];
            s.wrapper.scale.set(PULSE_POSES[phaseFrame] + fjit(0.04));
            break;
          }
          case 'blink': {
            // Alpha modulation (currently unused after note moved to swing,
            // kept for future elements).
            const BLINK_POSES = [1.00, 0.35, 0.85, 0.55];
            const a = BLINK_POSES[phaseFrame] + fjit(0.10);
            s.wrapper.alpha = a < 0 ? 0 : a > 1 ? 1 : a;
            break;
          }
          case 'swing': {
            // Note: small left-right wobble around static base angle,
            // tilts about ±8°. Reads as musical metronome, not flicker.
            // Reduced amplitude (was [-0.10, 0.14, -0.06, 0.18] ≈ ±10°)
            // — at the larger amp shading shards drifted noticeably from
            // the static char-level outline at peak pose. ±5° keeps the
            // motion legible without obvious outline mis-alignment.
            const SWING_POSES = [-0.05, 0.07, -0.03, 0.09];
            s.wrapper.rotation = s.staticBaseAngle + SWING_POSES[phaseFrame] + fjit(0.025);
            break;
          }
        }
        }

        s.frameIdx = targetFrame;

        if (needsCacheRefresh) {
          // PIXI v8: invalidate + re-bake the cache so outline / inner
          // Graphics changes show up in the next blit.
          s.wrapper.updateCacheTexture();
        }
      }
    }
  }

  destroy(): void {
    this.releaseShards();
    super.destroy();
  }
}
