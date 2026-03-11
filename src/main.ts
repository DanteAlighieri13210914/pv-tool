// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import './style.css';
import { PVEngine } from './core/engine';
import { templates } from './templates';
import { effectCatalog } from './core/effectCatalog';
import type { TemplateConfig } from './core/types';
import { t } from './i18n';


console.log('%cPV Tool%c solaris:0914', 'color:#6688cc;font-weight:bold', 'color:#888');

const app = document.querySelector<HTMLDivElement>('#app')!;

function tplName(tpl: TemplateConfig): string {
  if (tpl.nameKey) {
    return t(tpl.nameKey as any);
  }
  return tpl.name;
}

app.innerHTML = `
  <div class="panels-wrapper" id="panels-wrapper">
    <div class="controls">
      <div class="control-group">
        <label>${t('template')}</label>
        <select id="template-select">
          ${templates.map((tp, i) => `<option value="${i}">${tplName(tp)}</option>`).join('')}
          <option value="custom">${t('custom')}</option>
        </select>
      </div>

      <div class="control-group">
        <label>${t('canvas_color')}</label>
        <div class="color-swatches" id="canvas-color-swatches">
          <button class="swatch swatch-active" data-color="" title="${t('follow_template')}">
            <span class="swatch-auto">A</span>
          </button>
          <button class="swatch" data-color="#ffffff" title="${t('white')}" style="background:#ffffff"></button>
          <button class="swatch" data-color="#000000" title="${t('black')}" style="background:#000000"></button>
          <button class="swatch" data-color="#1122ee" title="${t('blue')}" style="background:#1122ee"></button>
          <button class="swatch" data-color="#8b1a1a" title="${t('red')}" style="background:#8b1a1a"></button>
          <button class="swatch" data-color="#EEDD11" title="${t('yellow')}" style="background:#EEDD11"></button>
          <button class="swatch" data-color="#f5c6d0" title="${t('pink')}" style="background:#f5c6d0"></button>
          <button class="swatch" data-color="#ED1C24" title="${t('p5red')}" style="background:#ED1C24"></button>
        </div>
      </div>

      <div class="control-group">
        <label>${t('text_label')}</label>
        <textarea id="text-input" rows="1" placeholder="深夜東京/の6畳半夢">深夜東京/の6畳半夢/を見てた/灯りの灯らない蛍光灯/明日には消えてる電脳城/に/開幕戦/打ち上げて/いなくなんないよね/ここには誰もいない/ここには誰もいないから</textarea>
      </div>

      <div class="control-group">
        <label>${t('seg_duration')} <span id="seg-val">3.0s</span></label>
        <input type="range" id="seg-slider" min="1" max="10" step="0.5" value="3">
      </div>

      <div class="control-group">
        <label>${t('anim_speed')} <span id="speed-val">2.0x</span></label>
        <input type="range" id="speed-slider" min="0" max="4" step="0.1" value="2">
      </div>

      <div class="control-group">
        <label>${t('motion_intensity')} <span id="motion-val">1.0x</span></label>
        <input type="range" id="motion-slider" min="0" max="2" step="0.1" value="1">
      </div>

      <div class="control-group">
        <label>${t('bg_opacity')} <span id="opacity-val">100%</span></label>
        <input type="range" id="opacity-slider" min="0" max="1" step="0.05" value="1">
      </div>

      <div class="control-group">
        <label>${t('media')}</label>
        <div class="file-pick">
          <button class="btn btn-sm" id="media-pick-btn">${t('choose_file')}</button>
          <span class="file-pick-name" id="media-pick-name">${t('no_file')}</span>
          <input type="file" id="media-input" accept="image/*,video/mp4,video/webm,video/mov" hidden>
        </div>
      </div>

      <div class="control-group" id="media-mode-group" style="display:none">
        <label>${t('media_mode')}</label>
        <select id="media-mode">
          <option value="fit">${t('auto_fit')}</option>
          <option value="free">${t('free_mode')}</option>
        </select>
        <button id="media-apply" class="btn">${t('apply')}</button>
      </div>

      <div class="control-group">
        <label>${t('audio')}</label>
        <div class="file-pick">
          <button class="btn btn-sm" id="audio-pick-btn">${t('choose_file')}</button>
          <span class="file-pick-name" id="audio-pick-name">${t('no_file')}</span>
          <input type="file" id="audio-input" accept="audio/*" hidden>
        </div>
      </div>

      <div class="control-group" id="audio-controls" style="display:none">
        <div class="audio-row">
          <button id="audio-toggle" class="btn">${t('pause')}</button>
          <span id="audio-status" class="audio-status">${t('playing')}</span>
        </div>
      </div>

      <div class="control-group">
        <label>${t('bpm')} <span id="bpm-val">120</span></label>
        <input type="range" id="bpm-slider" min="30" max="240" step="1" value="120">
      </div>

      <div class="control-group">
        <label>${t('beat_react')} <span id="beat-val">0.5</span></label>
        <input type="range" id="beat-slider" min="0" max="1" step="0.05" value="0.5">
      </div>
    </div>

    <div class="controls controls-right">
      <div class="panel-title">${t('postfx')}</div>

      <div class="control-group">
        <label>${t('shake')} <span id="shake-val">0</span></label>
        <input type="range" id="shake-slider" min="0" max="1" step="0.05" value="0">
      </div>

      <div class="control-group">
        <label>${t('zoom')} <span id="zoom-val">0</span></label>
        <input type="range" id="zoom-slider" min="-1" max="1" step="0.05" value="0">
      </div>

      <div class="control-group">
        <label>${t('tilt')} <span id="tilt-val">0°</span></label>
        <input type="range" id="tilt-slider" min="-1" max="1" step="0.05" value="0">
      </div>

      <div class="control-group">
        <label>${t('glitch')} <span id="glitch-val">0</span></label>
        <input type="range" id="glitch-slider" min="0" max="1" step="0.05" value="0">
      </div>

      <div class="control-group">
        <label>${t('hue_shift')} <span id="hue-val">0°</span></label>
        <input type="range" id="hue-slider" min="-180" max="180" step="5" value="0">
      </div>

      <div class="control-group" id="media-pos-group" style="display:none">
        <label>${t('media_position')}</label>
        <div class="slider-row">
          <span class="slider-label">${t('offset_x')}</span>
          <input type="range" id="media-x" min="-500" max="500" step="5" value="0">
          <span id="media-x-val">0</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">${t('offset_y')}</span>
          <input type="range" id="media-y" min="-500" max="500" step="5" value="0">
          <span id="media-y-val">0</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">${t('scale')}</span>
          <input type="range" id="media-scale" min="0.5" max="3" step="0.05" value="1">
          <span id="media-scale-val">1.0x</span>
        </div>
      </div>

      <div class="control-group">
        <label class="effect-toggle">
          <input type="checkbox" id="alpha-toggle">
          <span>${t('alpha_export')}</span>
        </label>
      </div>

      <div class="control-group rec-group">
        <button id="rec-btn" class="btn rec-btn" title="${t('rec')}">
          <span class="rec-icon"></span>
          <span id="rec-label">${t('rec')}</span>
        </button>
        <span id="rec-timer" class="rec-timer"></span>
      </div>
    </div>

    <div class="controls controls-bottom" id="custom-panel" style="display:none">
      <div class="panel-title">${t('effects_library')}</div>
      <div id="effect-grid">
        ${(() => {
          function fxKey(e: typeof effectCatalog[0]): string {
            if (e.type === 'organicBlob') return 'fx_organicBlob_' + (e.config.shape ?? 'blob');
            return 'fx_' + e.type;
          }
          const cats: Record<string, { idx: number; key: string; fallback: string }[]> = {};
          effectCatalog.forEach((e, i) => {
            (cats[e.category] ??= []).push({ idx: i, key: fxKey(e), fallback: e.label });
          });
          return Object.entries(cats).map(([cat, items]) => `
            <details class="effect-category" open>
              <summary class="effect-category-title">${t(('ecat_' + cat) as any) || cat}</summary>
              <div class="effect-grid">
                ${items.map(it => `
                  <label class="effect-toggle">
                    <input type="checkbox" data-effect-idx="${it.idx}">
                    <span>${t(it.key as any) || it.fallback}</span>
                  </label>
                `).join('')}
              </div>
            </details>
          `).join('');
        })()}
      </div>
    </div>
  </div>

  <button class="mobile-toggle" id="mobile-toggle" title="☰">☰</button>
  <div id="pv-container"></div>
`;

const engine = new PVEngine();
const container = document.getElementById('pv-container')!;

engine.init(container).then(() => {
  engine.setText('深夜東京/の6畳半夢/を見てた/灯りの灯らない蛍光灯/明日には消えてる電脳城/に/開幕戦/打ち上げて/いなくなんないよね/ここには誰もいない/ここには誰もいないから');
  engine.loadTemplate(templates[0]);
  templateSelect.value = '0';
  syncSpeedSlider();
  syncOpacitySlider();

  // OBS 透明模式
  if (new URLSearchParams(window.location.search).get('obs') === '1') {
    engine.alphaMode = true;
  }
});

// Mobile toggle
const mobileToggle = document.getElementById('mobile-toggle')!;
const panelsWrapper = document.getElementById('panels-wrapper')!;
const isMobile = window.matchMedia('(max-width: 768px)').matches;
if (isMobile) {
  panelsWrapper.classList.add('panels-hidden');
}
mobileToggle.addEventListener('click', () => {
  const hidden = panelsWrapper.classList.contains('panels-hidden');
  panelsWrapper.classList.toggle('panels-hidden', !hidden);
  mobileToggle.textContent = hidden ? '✕' : '☰';
});

// Canvas color swatches
const swatchContainer = document.getElementById('canvas-color-swatches')!;
swatchContainer.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.swatch') as HTMLButtonElement | null;
  if (!btn) return;
  swatchContainer.querySelectorAll('.swatch').forEach(s => s.classList.remove('swatch-active'));
  btn.classList.add('swatch-active');
  const color = btn.dataset.color;
  engine.canvasColor = color || null;
});

// Template
const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
const customPanel = document.getElementById('custom-panel')!;
const effectGrid = document.getElementById('effect-grid')!;

let isCustomMode = false;

function buildCustomTemplate(): TemplateConfig {
  const checks = effectGrid.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  const effects: TemplateConfig['effects'] = [];
  checks.forEach((cb) => {
    if (cb.checked) {
      const idx = parseInt(cb.dataset.effectIdx!);
      const preset = effectCatalog[idx];
      effects.push({ type: preset.type, layer: preset.layer, config: { ...preset.config } });
    }
  });
  return {
    name: 'Custom',
    palette: {
      background: '#ffffff',
      primary: '#000000',
      secondary: '#888888',
      accent: '#ff3366',
      text: '#000000',
    },
    effects,
  };
}

function syncSpeedSlider() {
  const v = engine.animationSpeed;
  speedSlider.value = String(v);
  speedVal.textContent = `${v.toFixed(1)}x`;
}

function syncOpacitySlider() {
  const v = engine.effectOpacity;
  opacitySlider.value = String(v);
  opacityVal.textContent = `${Math.round(v * 100)}%`;
}

templateSelect.addEventListener('change', () => {
  const val = templateSelect.value;
  if (val === 'custom') {
    isCustomMode = true;
    customPanel.style.display = '';
    engine.loadTemplate(buildCustomTemplate());
  } else {
    isCustomMode = false;
    customPanel.style.display = 'none';
    engine.loadTemplate(templates[parseInt(val)]);
    syncSpeedSlider();
    syncOpacitySlider();
  }
});

let customRebuildTimer: ReturnType<typeof setTimeout>;
effectGrid.addEventListener('change', () => {
  if (isCustomMode) {
    clearTimeout(customRebuildTimer);
    customRebuildTimer = setTimeout(() => {
      try {
        engine.loadTemplate(buildCustomTemplate());
      } catch (err) {
        console.warn('[PV] Custom template rebuild failed:', err);
      }
    }, 300);
  }
});

// Text input with auto-expand on focus
const textInput = document.getElementById('text-input') as HTMLTextAreaElement;

textInput.addEventListener('focus', () => {
  textInput.rows = 6;
  textInput.classList.add('text-expanded');
});

textInput.addEventListener('blur', () => {
  textInput.rows = 1;
  textInput.classList.remove('text-expanded');
});

let textTimer: ReturnType<typeof setTimeout>;
textInput.addEventListener('input', () => {
  clearTimeout(textTimer);
  textTimer = setTimeout(() => {
    engine.setText(textInput.value);
  }, 400);
});

// Segment duration
const segSlider = document.getElementById('seg-slider') as HTMLInputElement;
const segVal = document.getElementById('seg-val')!;
segSlider.addEventListener('input', () => {
  const v = parseFloat(segSlider.value);
  engine.segmentDuration = v;
  segVal.textContent = `${v.toFixed(1)}s`;
});

// Animation speed
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedVal = document.getElementById('speed-val')!;
speedSlider.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  engine.animationSpeed = v;
  speedVal.textContent = `${v.toFixed(1)}x`;
});

// Motion intensity
const motionSlider = document.getElementById('motion-slider') as HTMLInputElement;
const motionVal = document.getElementById('motion-val')!;
motionSlider.addEventListener('input', () => {
  const v = parseFloat(motionSlider.value);
  engine.motionIntensity = v;
  motionVal.textContent = `${v.toFixed(1)}x`;
});

// Effect opacity
const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
const opacityVal = document.getElementById('opacity-val')!;
opacitySlider.addEventListener('input', () => {
  const v = parseFloat(opacitySlider.value);
  engine.effectOpacity = v;
  opacityVal.textContent = `${Math.round(v * 100)}%`;
});

// --- Post FX panel ---
const shakeSlider = document.getElementById('shake-slider') as HTMLInputElement;
const shakeVal = document.getElementById('shake-val')!;
shakeSlider.addEventListener('input', () => {
  const v = parseFloat(shakeSlider.value);
  engine.shake = v;
  shakeVal.textContent = v.toFixed(2);
});

const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;
const zoomVal = document.getElementById('zoom-val')!;
zoomSlider.addEventListener('input', () => {
  const v = parseFloat(zoomSlider.value);
  engine.zoom = v;
  zoomVal.textContent = v.toFixed(2);
});

const tiltSlider = document.getElementById('tilt-slider') as HTMLInputElement;
const tiltVal = document.getElementById('tilt-val')!;
tiltSlider.addEventListener('input', () => {
  const v = parseFloat(tiltSlider.value);
  engine.tilt = v;
  tiltVal.textContent = `${(v * 17.2).toFixed(0)}°`;
});

const glitchSlider = document.getElementById('glitch-slider') as HTMLInputElement;
const glitchVal = document.getElementById('glitch-val')!;
glitchSlider.addEventListener('input', () => {
  const v = parseFloat(glitchSlider.value);
  engine.glitch = v;
  glitchVal.textContent = v.toFixed(2);
});

const hueSlider = document.getElementById('hue-slider') as HTMLInputElement;
const hueVal = document.getElementById('hue-val')!;
hueSlider.addEventListener('input', () => {
  const v = parseFloat(hueSlider.value);
  engine.hueShift = v;
  hueVal.textContent = `${v}°`;
});

// File pick button triggers
document.getElementById('media-pick-btn')!.addEventListener('click', () => mediaInput.click());
document.getElementById('audio-pick-btn')!.addEventListener('click', () => audioInput.click());

// Audio upload
const audioInput = document.getElementById('audio-input') as HTMLInputElement;
const audioControls = document.getElementById('audio-controls')!;
const audioToggle = document.getElementById('audio-toggle') as HTMLButtonElement;
const audioStatus = document.getElementById('audio-status')!;

audioInput.addEventListener('change', async () => {
  const file = audioInput.files?.[0];
  if (!file) return;
  document.getElementById('audio-pick-name')!.textContent = file.name;
  await engine.beat.loadAudio(file);
  audioControls.style.display = 'flex';
  audioStatus.textContent = t('playing');
  audioToggle.textContent = t('pause');
});

audioToggle.addEventListener('click', () => {
  if (engine.beat.paused) {
    engine.beat.resume();
    audioToggle.textContent = t('pause');
    audioStatus.textContent = t('playing');
  } else {
    engine.beat.pause();
    audioToggle.textContent = t('play');
    audioStatus.textContent = t('paused');
  }
});


// BPM (used when no audio is loaded)
const bpmSlider = document.getElementById('bpm-slider') as HTMLInputElement;
const bpmVal = document.getElementById('bpm-val')!;
bpmSlider.addEventListener('input', () => {
  const v = parseInt(bpmSlider.value);
  engine.beat.bpm = v;
  bpmVal.textContent = String(v);
});

// Beat reactivity
const beatSlider = document.getElementById('beat-slider') as HTMLInputElement;
const beatVal = document.getElementById('beat-val')!;
beatSlider.addEventListener('input', () => {
  const v = parseFloat(beatSlider.value);
  engine.beatReactivity = v;
  beatVal.textContent = v.toFixed(2);
});

// Media upload
const mediaInput = document.getElementById('media-input') as HTMLInputElement;
const mediaModeGroup = document.getElementById('media-mode-group')!;
const mediaModeSelect = document.getElementById('media-mode') as HTMLSelectElement;
const mediaApplyBtn = document.getElementById('media-apply')!;

let pendingFile: File | null = null;

mediaInput.addEventListener('change', () => {
  const file = mediaInput.files?.[0];
  if (file) {
    pendingFile = file;
    document.getElementById('media-pick-name')!.textContent = file.name;
    mediaModeGroup.style.display = 'flex';
  }
});

const mediaPosGroup = document.getElementById('media-pos-group')!;
const mediaXSlider = document.getElementById('media-x') as HTMLInputElement;
const mediaYSlider = document.getElementById('media-y') as HTMLInputElement;
const mediaScaleSlider = document.getElementById('media-scale') as HTMLInputElement;
const mediaXVal = document.getElementById('media-x-val')!;
const mediaYVal = document.getElementById('media-y-val')!;
const mediaScaleVal = document.getElementById('media-scale-val')!;

function resetMediaSliders() {
  mediaXSlider.value = '0';
  mediaYSlider.value = '0';
  mediaScaleSlider.value = '1';
  mediaXVal.textContent = '0';
  mediaYVal.textContent = '0';
  mediaScaleVal.textContent = '1.0x';
}

mediaXSlider.addEventListener('input', () => {
  const x = parseFloat(mediaXSlider.value);
  const y = parseFloat(mediaYSlider.value);
  mediaXVal.textContent = String(x);
  engine.setMediaOffset(x, y);
});
mediaYSlider.addEventListener('input', () => {
  const x = parseFloat(mediaXSlider.value);
  const y = parseFloat(mediaYSlider.value);
  mediaYVal.textContent = String(y);
  engine.setMediaOffset(x, y);
});
mediaScaleSlider.addEventListener('input', () => {
  const s = parseFloat(mediaScaleSlider.value);
  mediaScaleVal.textContent = `${s.toFixed(1)}x`;
  engine.setMediaScale(s);
});

mediaApplyBtn.addEventListener('click', async () => {
  if (pendingFile) {
    const mode = mediaModeSelect.value as 'fit' | 'free';
    try {
      await engine.addMedia(pendingFile, mode);
      engine.effectOpacity = 0.7;
      opacitySlider.value = '0.7';
      opacityVal.textContent = '70%';
      mediaPosGroup.style.display = 'flex';
      resetMediaSliders();
    } catch (err) {
      console.warn('[PV] Media load failed:', err);
    }
    pendingFile = null;
  }
});

// --- Alpha mode ---
const alphaToggle = document.getElementById('alpha-toggle') as HTMLInputElement;
alphaToggle.addEventListener('change', () => {
  engine.alphaMode = alphaToggle.checked;
});

// --- Recording ---
const recBtn = document.getElementById('rec-btn')!;
const recLabel = document.getElementById('rec-label')!;
const recTimer = document.getElementById('rec-timer')!;

const templateSlugs = [
  'blueBold', 'kineticSplit', 'bluePlane', 'cyberGrunge', 'geometric',
  'rainCity', 'cyberpunkHud', 'emotionCinema', 'hystericNight',
  'spiderWeb', 'staggeredText', 'calmVillain', 'girlyClouds',
];

function getTemplateSlug(): string {
  const val = templateSelect.value;
  if (val === 'custom') return 'custom';
  const idx = parseInt(val);
  return templateSlugs[idx] ?? 'unknown';
}

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recStartTime = 0;
let recTimerInterval: ReturnType<typeof setInterval> | null = null;

// PNG sequence capture for alpha mode
let pngFrames: Blob[] = [];
let pngCaptureRaf = 0;
let pngRecording = false;
const PNG_FPS = 30;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function capturePngFrame(canvas: HTMLCanvasElement) {
  if (!pngRecording) return;
  canvas.toBlob((blob) => {
    if (blob && pngRecording) pngFrames.push(blob);
  }, 'image/png');
  setTimeout(() => capturePngFrame(canvas), 1000 / PNG_FPS);
}

async function finishPngExport(slug: string) {
  recLabel.textContent = t('packing');
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('frames')!;
  for (let i = 0; i < pngFrames.length; i++) {
    folder.file(`frame_${String(i).padStart(5, '0')}.png`, pngFrames[i]);
  }
  zip.file('.pv', JSON.stringify({ v: '0914', t: Date.now(), fps: PNG_FPS, f: pngFrames.length }));
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pv-${slug}-${PNG_FPS}fps-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  pngFrames = [];
  recLabel.textContent = t('rec');
}

recBtn.addEventListener('click', () => {
  const useAlpha = engine.alphaMode;
  const slug = getTemplateSlug();

  // --- Alpha mode: PNG sequence capture ---
  if (useAlpha) {
    if (pngRecording) {
      pngRecording = false;
      if (recTimerInterval) { clearInterval(recTimerInterval); recTimerInterval = null; }
      recBtn.classList.remove('recording');
      finishPngExport(slug);
      return;
    }

    pngFrames = [];
    pngRecording = true;
    recStartTime = performance.now();
    recBtn.classList.add('recording');
    recLabel.textContent = t('stop');
    recTimerInterval = setInterval(() => {
      recTimer.textContent = formatTime(performance.now() - recStartTime);
    }, 500);
    capturePngFrame(engine.canvas);
    return;
  }

  // --- Normal mode: MediaRecorder ---
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }

  const canvas = engine.canvas;
  const stream = canvas.captureStream(60);

  if (engine.beat.audioContext && engine.beat.sourceNode) {
    const dest = engine.beat.audioContext.createMediaStreamDestination();
    engine.beat.sourceNode.connect(dest);
    for (const track of dest.stream.getAudioTracks()) {
      stream.addTrack(track);
    }
  }

  const mp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1');
  const mimeType = mp4Supported
    ? 'video/mp4;codecs=avc1'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
  const ext = mp4Supported ? 'mp4' : 'webm';

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    if (recTimerInterval) { clearInterval(recTimerInterval); recTimerInterval = null; }
    recBtn.classList.remove('recording');
    recLabel.textContent = t('rec');
    recTimer.textContent = '';

    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pv-${slug}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start(100);
  recStartTime = performance.now();
  recBtn.classList.add('recording');
  recLabel.textContent = t('stop');
  recTimerInterval = setInterval(() => {
    recTimer.textContent = formatTime(performance.now() - recStartTime);
  }, 500);
});

// ══════════════════════════════════════════════════════════
//  OBS 透明输出模式  (?obs=1)
//  本地运行: npm run dev
//  OBS 浏览器源 URL: http://localhost:5173/?obs=1
// ══════════════════════════════════════════════════════════

if (new URLSearchParams(window.location.search).get('obs') === '1') {

  // 隐藏所有 UI 面板
  (document.getElementById('panels-wrapper') as HTMLElement).style.display = 'none';
  (document.getElementById('mobile-toggle') as HTMLElement).style.display = 'none';

  // 等 engine 初始化完成后开启透明模式


  // ── Now Playing 歌词同步 ──
  const NP_BASE       = 'http://localhost:9863';
  const LYRIC_REFRESH = 5000;
  const POSITION_POLL = 150;

  let lrcLines:  { ms: number; text: string }[] = [];
  let cachedLrc  = '';
  let lastLine   = '';

  function parseLRC(str: string) {
    const re = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.+)/g;
    const lines: { ms: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) {
      const ms = (parseInt(m[1]) * 60 + parseInt(m[2])) * 1000
               + parseInt(m[3].padEnd(3, '0'));
      const text = m[4].trim();
      if (text) lines.push({ ms, text });
    }
    return lines.sort((a, b) => a.ms - b.ms);
  }

  function getLineAt(posMs: number): string {
    let result = '';
    for (const { ms, text } of lrcLines) {
      if (posMs >= ms) result = text;
      else break;
    }
    return result;
  }

  function injectLyric(text: string) {
    if (!text || text === lastLine) return;
    lastLine = text;
    engine.setText(text + '/' + text);
  }

  async function refreshLyric() {
    try {
      const r = await fetch(`${NP_BASE}/api/lyric`, { signal: AbortSignal.timeout(800) });
      const d = await r.json();
      if (d.lrc && d.lrc !== cachedLrc) {
        cachedLrc = d.lrc;
        lrcLines  = parseLRC(d.lrc);
        lastLine  = '';
        console.log('[obs-lyric] 歌词加载:', lrcLines.length, '行');
      }
    } catch (_) {}
  }

  async function pollPosition() {
    if (!lrcLines.length) return;
    try {
      const r = await fetch(`${NP_BASE}/api/query/progress`, { signal: AbortSignal.timeout(800) });
      const d = await r.json();
      injectLyric(getLineAt(d.progress ?? 0));
    } catch (_) {}
  }

  // Worker 计时防主线程节流
  const worker = new Worker(URL.createObjectURL(new Blob([`
    setInterval(() => postMessage('lyric'), ${LYRIC_REFRESH});
    setInterval(() => postMessage('pos'),   ${POSITION_POLL});
  `], { type: 'text/javascript' })));

  worker.onmessage = (e: MessageEvent) => {
    if (e.data === 'lyric') refreshLyric();
    if (e.data === 'pos')   pollPosition();
  };

  refreshLyric();
  console.log('[obs-lyric] OBS 透明模式启动');
}
