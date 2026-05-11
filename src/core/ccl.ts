// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

/**
 * CCL + optional pre-erosion for splitting a rasterized glyph into shards.
 *
 * - `floodFill4` is the raw 4-connected component pass on an RGBA bitmap.
 * - `findGlyphShards` is the primary entry: it can optionally erode the
 *   alpha mask N pixels first to break thin AA bridges (where two visually
 *   independent strokes touch only via anti-aliased edge pixels), then run
 *   CCL on the eroded mask and reclaim the eroded border pixels back to
 *   the nearest sub-component via multi-source BFS so the visible outline
 *   is preserved.
 *
 * `preErosionIters = 0` is the default; the function then degenerates to a
 * plain `floodFill4` call. `1` is enough for typical AA bridges; `2-3` is
 * for unusually thick AA halos. Higher values start cutting real strokes
 * — that's not what this option is for.
 */

export interface Component {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  /** Pixel offsets into the source row-major grid (y * width + x). */
  pixels: number[];
}

/**
 * Flood-fill all alpha>=threshold pixels into 4-connected components.
 * 4-neighbour (not 8) is intentional: it makes anti-aliased edges less
 * likely to bridge visually separate strokes.
 */
export function floodFill4(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = 128,
): Component[] {
  const total = width * height;
  if (rgba.length < total * 4) {
    throw new Error(`floodFill4: rgba too short (${rgba.length}, expected >= ${total * 4})`);
  }

  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components: Component[] = [];

  for (let y0 = 0; y0 < height; y0++) {
    for (let x0 = 0; x0 < width; x0++) {
      const seedOff = y0 * width + x0;
      if (visited[seedOff]) continue;
      if (rgba[seedOff * 4 + 3] < alphaThreshold) {
        visited[seedOff] = 1;
        continue;
      }

      let head = 0;
      let tail = 0;
      queue[tail++] = seedOff;
      visited[seedOff] = 1;

      let minX = x0, maxX = x0, minY = y0, maxY = y0;
      const pixels: number[] = [];

      while (head < tail) {
        const off = queue[head++];
        pixels.push(off);
        const x = off % width;
        const y = (off - x) / width;
        if (x < minX) minX = x; else if (x > maxX) maxX = x;
        if (y < minY) minY = y; else if (y > maxY) maxY = y;

        if (x > 0) {
          const n = off - 1;
          if (!visited[n] && rgba[n * 4 + 3] >= alphaThreshold) { visited[n] = 1; queue[tail++] = n; }
        }
        if (x < width - 1) {
          const n = off + 1;
          if (!visited[n] && rgba[n * 4 + 3] >= alphaThreshold) { visited[n] = 1; queue[tail++] = n; }
        }
        if (y > 0) {
          const n = off - width;
          if (!visited[n] && rgba[n * 4 + 3] >= alphaThreshold) { visited[n] = 1; queue[tail++] = n; }
        }
        if (y < height - 1) {
          const n = off + width;
          if (!visited[n] && rgba[n * 4 + 3] >= alphaThreshold) { visited[n] = 1; queue[tail++] = n; }
        }
      }

      components.push({ minX, minY, maxX, maxY, area: pixels.length, pixels });
    }
  }

  return components;
}

// ─────────────────────────── Internal helpers ───────────────────────────

function buildAlphaMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): Uint8Array {
  const total = width * height;
  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (rgba[i * 4 + 3] >= alphaThreshold) mask[i] = 1;
  }
  return mask;
}

/**
 * One pass of 8-connected morphological erosion on a binary mask.
 * Border pixels are always eroded (treated as bordering background).
 * 8-neighbour erosion is best for breaking anti-aliased bridges, which
 * are typically diagonal-rich.
 */
function erodeMaskOnce(
  mask: Uint8Array,
  out: Uint8Array,
  width: number,
  height: number,
): void {
  const w = width, h = height;
  for (let x = 0; x < w; x++) { out[x] = 0; out[(h - 1) * w + x] = 0; }
  for (let y = 1; y < h - 1; y++) { out[y * w] = 0; out[y * w + w - 1] = 0; }
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const off = row + x;
      if (!mask[off]) { out[off] = 0; continue; }
      out[off] = (
        mask[off - 1] & mask[off + 1] &
        mask[off - w] & mask[off + w] &
        mask[off - w - 1] & mask[off - w + 1] &
        mask[off + w - 1] & mask[off + w + 1]
      ) as 0 | 1;
    }
  }
}

/**
 * Erode the alpha-thresholded mask by N 8-connected iterations. `iterations <= 0`
 * returns the raw thresholded mask unchanged.
 *
 * 1 iteration peels 1 pixel of border in every direction. For breaking AA
 * bridges between visually independent strokes that's usually enough; 2-3
 * is for unusually thick AA halos at very large font sizes.
 */
function erodeAlphaMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
  iterations: number,
): Uint8Array {
  let mask: Uint8Array = buildAlphaMask(rgba, width, height, alphaThreshold);
  if (iterations <= 0) return mask;
  let next: Uint8Array = new Uint8Array(width * height);
  for (let i = 0; i < iterations; i++) {
    erodeMaskOnce(mask, next, width, height);
    const tmp = mask; mask = next; next = tmp;
  }
  return mask;
}

/** 4-connected component labeling on a binary 0/1 mask. */
function floodFillMask(mask: Uint8Array, width: number, height: number): Component[] {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components: Component[] = [];

  for (let y0 = 0; y0 < height; y0++) {
    for (let x0 = 0; x0 < width; x0++) {
      const seedOff = y0 * width + x0;
      if (visited[seedOff]) continue;
      if (!mask[seedOff]) { visited[seedOff] = 1; continue; }

      let head = 0;
      let tail = 0;
      queue[tail++] = seedOff;
      visited[seedOff] = 1;

      let minX = x0, maxX = x0, minY = y0, maxY = y0;
      const pixels: number[] = [];

      while (head < tail) {
        const off = queue[head++];
        pixels.push(off);
        const x = off % width;
        const y = (off - x) / width;
        if (x < minX) minX = x; else if (x > maxX) maxX = x;
        if (y < minY) minY = y; else if (y > maxY) maxY = y;

        if (x > 0) {
          const n = off - 1;
          if (!visited[n] && mask[n]) { visited[n] = 1; queue[tail++] = n; }
        }
        if (x < width - 1) {
          const n = off + 1;
          if (!visited[n] && mask[n]) { visited[n] = 1; queue[tail++] = n; }
        }
        if (y > 0) {
          const n = off - width;
          if (!visited[n] && mask[n]) { visited[n] = 1; queue[tail++] = n; }
        }
        if (y < height - 1) {
          const n = off + width;
          if (!visited[n] && mask[n]) { visited[n] = 1; queue[tail++] = n; }
        }
      }

      components.push({ minX, minY, maxX, maxY, area: pixels.length, pixels });
    }
  }
  return components;
}

/**
 * Multi-source BFS pixel reclamation.
 *
 * `subs` are erosion-carved components (subset of the original alpha mask).
 * Returns one Component per sub containing all original-alpha pixels that
 * are 4-neighbour-closer to that sub than to any other (geodesic Voronoi).
 * Eroded-away border pixels rejoin their nearest stroke, so the visible
 * glyph outline is preserved.
 */
function reclaimPixelsToSubs(
  subs: Component[],
  alphaMask: Uint8Array,
  width: number,
  height: number,
): Component[] {
  if (subs.length === 0) return [];
  const total = width * height;
  const labelMap = new Int32Array(total);
  for (let i = 0; i < total; i++) labelMap[i] = -1;

  // Count original alpha pixels for queue sizing.
  let alphaCount = 0;
  for (let i = 0; i < total; i++) if (alphaMask[i]) alphaCount++;
  const queue = new Int32Array(alphaCount);
  let head = 0;
  let tail = 0;

  for (let si = 0; si < subs.length; si++) {
    const sub = subs[si];
    for (let i = 0; i < sub.pixels.length; i++) {
      const p = sub.pixels[i];
      if (!alphaMask[p] || labelMap[p] >= 0) continue;
      labelMap[p] = si;
      queue[tail++] = p;
    }
  }

  while (head < tail) {
    const off = queue[head++];
    const lbl = labelMap[off];
    const x = off % width;
    const y = (off - x) / width;
    if (x > 0) {
      const n = off - 1;
      if (alphaMask[n] && labelMap[n] < 0) { labelMap[n] = lbl; queue[tail++] = n; }
    }
    if (x < width - 1) {
      const n = off + 1;
      if (alphaMask[n] && labelMap[n] < 0) { labelMap[n] = lbl; queue[tail++] = n; }
    }
    if (y > 0) {
      const n = off - width;
      if (alphaMask[n] && labelMap[n] < 0) { labelMap[n] = lbl; queue[tail++] = n; }
    }
    if (y < height - 1) {
      const n = off + width;
      if (alphaMask[n] && labelMap[n] < 0) { labelMap[n] = lbl; queue[tail++] = n; }
    }
  }

  const out: Component[] = [];
  for (let i = 0; i < subs.length; i++) {
    out.push({
      minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
      area: 0, pixels: [],
    });
  }
  for (let p = 0; p < total; p++) {
    if (!alphaMask[p]) continue;
    const lbl = labelMap[p];
    if (lbl < 0) continue;
    const c = out[lbl];
    c.pixels.push(p);
    const x = p % width;
    const y = (p - x) / width;
    if (x < c.minX) c.minX = x;
    if (x > c.maxX) c.maxX = x;
    if (y < c.minY) c.minY = y;
    if (y > c.maxY) c.maxY = y;
  }
  for (let i = 0; i < out.length; i++) out[i].area = out[i].pixels.length;
  return out.filter(c => c.area > 0);
}

// ────────────────────────────── Main entry ──────────────────────────────

/**
 * Find glyph shards: optional pre-erosion to unbridge anti-aliased
 * touches between visually independent strokes, then 4-connected CCL.
 *
 * Pipeline:
 *   - `preErosionIters <= 0`: equivalent to plain `floodFill4`.
 *   - otherwise: build alpha mask → erode N times → CCL on eroded mask
 *     → multi-source-BFS-reclaim the original alpha pixels back to the
 *     nearest sub. Each shard ends up containing all the AA-edge pixels
 *     it visually owns, so the glyph outline stays intact while AA
 *     bridges are broken.
 *
 * Heads-up: `preErosionIters` peels real strokes too. 1 px is the safe
 * default for AA-bridge breaking; higher values start eating thin strokes
 * outright. Combine with sane `alphaThreshold` (140-ish for crisp glyphs).
 */
export function findGlyphShards(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = 128,
  preErosionIters: number = 0,
): Component[] {
  if (preErosionIters <= 0) {
    return floodFill4(rgba, width, height, alphaThreshold);
  }

  const alphaMask = buildAlphaMask(rgba, width, height, alphaThreshold);
  const erodedMask = erodeAlphaMask(rgba, width, height, alphaThreshold, preErosionIters);
  const subs = floodFillMask(erodedMask, width, height);

  if (subs.length === 0) {
    // Eroded into oblivion — fall back to raw CCL on the original mask.
    return floodFill4(rgba, width, height, alphaThreshold);
  }

  return reclaimPixelsToSubs(subs, alphaMask, width, height);
}
