// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import './style.css';
import { PVEngine } from './core/engine';
import { parseLrc } from './core/lrc';
import { templates } from './templates';
import { effectCatalog } from './core/effectCatalog';
import type { TemplateConfig } from './core/types';
import { t } from './i18n';
import {
  loadCustomTemplates,
  saveCustomTemplates,
  encodeShareCode,
  decodeShareCode,
} from './core/templateStore';

console.log('%cPV Tool%c solaris:0914', 'color:#6688cc;font-weight:bold', 'color:#888');

document.title = t('page_title');

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
      <details class="collapsible-section" open>
        <summary class="panel-title">${t('template')}</summary>
      <div class="control-group">
          <select id="template-select">
            ${templates.map((tp, i) => `<option value="${i}">${tplName(tp)}</option>`).join('')}
            <option value="custom">${t('custom')}</option>
          </select>
          <div class="template-actions">
            <button class="btn btn-sm" id="tpl-delete" title="${t('delete_tpl')}" style="display:none">${t('delete_tpl')}</button>
            <button class="btn btn-sm" id="tpl-export" title="${t('export_code')}" style="display:none">${t('export_code')}</button>
          </div>
          <div id="tpl-delete-confirm" class="tpl-inline-input" style="display:none">
            <span class="tpl-confirm-text" id="tpl-delete-text"></span>
            <button class="btn btn-sm btn-danger" id="tpl-delete-ok">${t('delete_tpl')}</button>
            <button class="btn btn-sm" id="tpl-delete-cancel">${t('cancel')}</button>
          </div>
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
        <label>LRC</label>
        <div class="file-pick">
          <button class="btn btn-sm" id="lrc-pick-btn">导入 LRC</button>
          <span class="file-pick-name" id="lrc-pick-name">未选择文件</span>
          <input type="file" id="lrc-input" accept=".lrc,text/plain" hidden>
        </div>
      </div>

      <div class="control-group">
        <label>计时 Time</label>
        <div id="playback-time">00:00 / 00:00</div>
      </div>

      <div class="control-group">
        <label>${t('bpm')} <span id="bpm-val">120</span></label>
        <input type="range" id="bpm-slider" min="30" max="240" step="1" value="120">
      </div>

      <div class="control-group">
        <label>${t('beat_react')} <span id="beat-val">0.5</span></label>
        <input type="range" id="beat-slider" min="0" max="1" step="0.05" value="0.5">
      </div>
      </details>
    </div>

    <div class="controls controls-right">
      <details class="collapsible-section" open>
        <summary class="panel-title">${t('postfx')}</summary>

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
      </details>
    </div>

    <div class="controls controls-bottom" id="custom-panel" style="display:none">
      <details class="collapsible-section" open>
        <summary class="panel-title">${t('effects_library')}</summary>
        <div class="control-group">
          <div class="template-actions">
            <button class="btn btn-sm" id="tpl-save" title="${t('save_tpl')}">${t('save_tpl')}</button>
            <button class="btn btn-sm" id="tpl-import" title="${t('import_code')}">${t('import_code')}</button>
          </div>
        </div>
        <div class="control-group" id="tpl-save-input" style="display:none">
          <div class="tpl-inline-input">
            <input type="text" id="tpl-name-input" placeholder="${t('tpl_name_placeholder')}">
            <button class="btn btn-sm" id="tpl-save-ok">${t('confirm')}</button>
            <button class="btn btn-sm" id="tpl-save-cancel">${t('cancel')}</button>
          </div>
        </div>
        <div class="control-group" id="share-code-group" style="display:none">
          <label id="share-code-label">${t('share_code')}</label>
          <input type="text" id="share-code-text" placeholder="${t('paste_code')}">
          <div class="template-actions">
            <button class="btn btn-sm" id="share-code-ok">${t('confirm')}</button>
            <button class="btn btn-sm" id="share-code-cancel">${t('cancel')}</button>
          </div>
        </div>
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
      </details>
    </div>
  </div>

  <button class="mobile-toggle" id="mobile-toggle" title="☰">☰</button>
  <div id="pv-container"></div>
`;

const engine = new PVEngine();
const container = document.getElementById('pv-container')!;

engine.init(container).then(() => {
  engine.setText('深夜東京/の6畳半夢/を見てた/灯りの灯らない蛍光灯/明日には消えてる電脳城/に/開幕戦/打ち上げて/いなくなんないよね/ここには誰もいない/ここには誰もいないから');

  // OBS 透明模式
  if (new URLSearchParams(window.location.search).get('obs') === '1') {
    engine.alphaMode = true;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
  }

  // URL参数指定模板 (?t=0 or ?t=custom)
  const tParam = new URLSearchParams(window.location.search).get('t');
  if (tParam === 'custom') {
    templateSelect.value = 'custom';
    customPanel.style.display = '';
    isCustomMode = true;
  } else {
    const tIdx = tParam !== null && !isNaN(parseInt(tParam)) ? parseInt(tParam) : 0;
    engine.loadTemplate(templates[tIdx]);
    templateSelect.value = String(tIdx);
  }

  syncSpeedSlider();
  syncOpacitySlider();
  syncPostfxSliders();
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

function syncPostfxSliders() {
  const sk = document.getElementById('shake-slider') as HTMLInputElement;
  const sv = document.getElementById('shake-val')!;
  const zm = document.getElementById('zoom-slider') as HTMLInputElement;
  const zv = document.getElementById('zoom-val')!;
  const tl = document.getElementById('tilt-slider') as HTMLInputElement;
  const tv = document.getElementById('tilt-val')!;
  const gl = document.getElementById('glitch-slider') as HTMLInputElement;
  const gv = document.getElementById('glitch-val')!;
  const hu = document.getElementById('hue-slider') as HTMLInputElement;
  const hv = document.getElementById('hue-val')!;
  sk.value = String(engine.shake); sv.textContent = engine.shake.toFixed(2);
  zm.value = String(engine.zoom); zv.textContent = engine.zoom.toFixed(2);
  tl.value = String(engine.tilt); tv.textContent = `${(engine.tilt * 17.2).toFixed(0)}°`;
  gl.value = String(engine.glitch); gv.textContent = engine.glitch.toFixed(2);
  hu.value = String(engine.hueShift); hv.textContent = `${engine.hueShift.toFixed(0)}°`;
}

templateSelect.addEventListener('change', () => {
  const val = templateSelect.value;
  if (val === 'custom') {
    isCustomMode = true;
    customPanel.style.display = '';
    engine.loadTemplate(buildCustomTemplate());
  } else if (val.startsWith('user-')) {
    isCustomMode = false;
    customPanel.style.display = 'none';
    const idx = parseInt(val.split('-')[1]);
    engine.loadTemplate(customTemplates[idx]);
    syncSpeedSlider();
    syncPostfxSliders();
  } else {
    isCustomMode = false;
    customPanel.style.display = 'none';
    engine.loadTemplate(templates[parseInt(val)]);
    syncSpeedSlider();
    syncOpacitySlider();
    syncPostfxSliders();
  }
  updateTemplateButtons();
});

// ── Custom template management ──
let customTemplates = loadCustomTemplates();

function rebuildTemplateSelect() {
  const builtInHtml = templates.map((tp, i) => `<option value="${i}">${tplName(tp)}</option>`).join('');
  const customHtml = customTemplates.map((tp, i) =>
    `<option value="user-${i}">⭐ ${tp.name}</option>`
  ).join('');
  templateSelect.innerHTML = builtInHtml + customHtml + `<option value="custom">${t('custom')}</option>`;
}

function updateTemplateButtons() {
  const val = templateSelect.value;
  const isUser = val.startsWith('user-');
  tplDeleteBtn.style.display = isUser ? '' : 'none';
  tplExportBtn.style.display = isUser ? '' : 'none';
  tplSaveInput.style.display = 'none';
  tplDeleteConfirm.style.display = 'none';
}

const tplSaveBtn = document.getElementById('tpl-save')!;
const tplDeleteBtn = document.getElementById('tpl-delete')!;
const tplExportBtn = document.getElementById('tpl-export')!;
const tplImportBtn = document.getElementById('tpl-import')!;
const tplSaveInput = document.getElementById('tpl-save-input')!;
const tplNameInput = document.getElementById('tpl-name-input') as HTMLInputElement;
const tplSaveOk = document.getElementById('tpl-save-ok')!;
const tplSaveCancel = document.getElementById('tpl-save-cancel')!;
const tplDeleteConfirm = document.getElementById('tpl-delete-confirm')!;
const tplDeleteText = document.getElementById('tpl-delete-text')!;
const tplDeleteOk = document.getElementById('tpl-delete-ok')!;
const tplDeleteCancel = document.getElementById('tpl-delete-cancel')!;
const shareCodeGroup = document.getElementById('share-code-group')!;
const shareCodeLabel = document.getElementById('share-code-label')!;
const shareCodeText = document.getElementById('share-code-text') as HTMLInputElement;
const shareCodeOk = document.getElementById('share-code-ok')!;
const shareCodeCancel = document.getElementById('share-code-cancel')!;

let shareCodeMode: 'import' | 'export' = 'import';

tplSaveBtn.addEventListener('click', () => {
  tplSaveInput.style.display = '';
  tplNameInput.value = '';
  tplNameInput.focus();
});

tplSaveCancel.addEventListener('click', () => {
  tplSaveInput.style.display = 'none';
});

function doSave() {
  const name = tplNameInput.value.trim();
  if (!name) return;
  const tpl = { ...buildCustomTemplate(), name };
  customTemplates.push(tpl);
  saveCustomTemplates(customTemplates);
  rebuildTemplateSelect();
  templateSelect.value = `user-${customTemplates.length - 1}`;
  isCustomMode = false;
  customPanel.style.display = 'none';
  engine.loadTemplate(tpl);
  updateTemplateButtons();
  syncSpeedSlider();
}

tplSaveOk.addEventListener('click', doSave);
tplNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSave();
  if (e.key === 'Escape') tplSaveInput.style.display = 'none';
});

tplDeleteBtn.addEventListener('click', () => {
  const val = templateSelect.value;
  if (!val.startsWith('user-')) return;
  const idx = parseInt(val.split('-')[1]);
  tplDeleteText.textContent = `${t('confirm_delete')} "${customTemplates[idx].name}"？`;
  tplDeleteConfirm.style.display = '';
});

tplDeleteCancel.addEventListener('click', () => {
  tplDeleteConfirm.style.display = 'none';
});

tplDeleteOk.addEventListener('click', () => {
  const val = templateSelect.value;
  if (!val.startsWith('user-')) return;
  const idx = parseInt(val.split('-')[1]);
  customTemplates.splice(idx, 1);
  saveCustomTemplates(customTemplates);
  rebuildTemplateSelect();
  templateSelect.value = '0';
  engine.loadTemplate(templates[0]);
  updateTemplateButtons();
  syncSpeedSlider();
  tplDeleteConfirm.style.display = 'none';
});

tplExportBtn.addEventListener('click', async () => {
  const val = templateSelect.value;
  if (!val.startsWith('user-')) return;
  const idx = parseInt(val.split('-')[1]);
  shareCodeMode = 'export';
  shareCodeLabel.textContent = `${t('share_code')} (${t('code_copied')})`;
  const code = await encodeShareCode(customTemplates[idx]);
  shareCodeText.value = code;
  shareCodeGroup.style.display = '';
  shareCodeText.readOnly = true;
  shareCodeOk.textContent = t('copy');
  try { await navigator.clipboard.writeText(code); } catch { /* fallback */ }
});

tplImportBtn.addEventListener('click', () => {
  shareCodeMode = 'import';
  shareCodeLabel.classList.remove('label-error');
  shareCodeLabel.textContent = t('import_code');
  shareCodeText.value = '';
  shareCodeText.readOnly = false;
  shareCodeOk.textContent = t('import_btn');
  shareCodeGroup.style.display = '';
});

shareCodeOk.addEventListener('click', async () => {
  if (shareCodeMode === 'export') {
    try { await navigator.clipboard.writeText(shareCodeText.value); } catch { /* noop */ }
    shareCodeGroup.style.display = 'none';
    return;
  }
  const code = shareCodeText.value.trim();
  if (!code) return;
  try {
    const tpl = await decodeShareCode(code);
    customTemplates.push(tpl);
    saveCustomTemplates(customTemplates);
    rebuildTemplateSelect();
    const newIdx = customTemplates.length - 1;
    templateSelect.value = `user-${newIdx}`;
    isCustomMode = false;
    customPanel.style.display = 'none';
    engine.loadTemplate(tpl);
    updateTemplateButtons();
    syncSpeedSlider();
    shareCodeGroup.style.display = 'none';
  } catch (err) {
    shareCodeLabel.textContent = t('code_invalid');
    shareCodeLabel.classList.add('label-error');
    console.warn('[PV] Share code decode failed:', err);
    return;
  }
});

shareCodeCancel.addEventListener('click', () => {
  shareCodeGroup.style.display = 'none';
});

rebuildTemplateSelect();

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

function applyTextInput(rawText: string): void {
  const hasTimestamps = /\[\d{1,2}:\d{2}/.test(rawText);
  if (hasTimestamps) {
    const parsed = parseLrc(rawText);
    if (parsed.length > 0) {
      engine.setLyricTimeline(parsed);
      return;
    }
  }
  engine.setText(rawText.replace(/\r?\n/g, '/'));
}

textInput.addEventListener('input', () => {
  clearTimeout(textTimer);
  textTimer = setTimeout(() => {
    applyTextInput(textInput.value);
  }, 400);
});

const lrcInput = document.getElementById('lrc-input') as HTMLInputElement;
const lrcPickBtn = document.getElementById('lrc-pick-btn') as HTMLButtonElement;
const lrcPickName = document.getElementById('lrc-pick-name')!;

lrcPickBtn.addEventListener('click', () => lrcInput.click());

lrcInput.addEventListener('change', async () => {
  const file = lrcInput.files?.[0];
  if (!file) return;
  lrcPickName.textContent = file.name;
  const content = await file.text();
  textInput.value = content;
  applyTextInput(content);
  lrcInput.value = '';
});

const playbackTimeEl = document.getElementById('playback-time')!;

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updatePlaybackTimer(): void {
  const current = engine.playbackTime;
  const total = engine.timelineDuration;
  playbackTimeEl.textContent = `${formatClock(current)} / ${formatClock(total)}`;
  requestAnimationFrame(updatePlaybackTimer);
}

requestAnimationFrame(updatePlaybackTimer);

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

// BPM
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

let pngFrameBuffer: Record<number, Blob> = {};
let pngFrameIndex = 0;
let pngCaptureRaf = 0;
let pngRecording = false;
let pngLastCaptureTime = 0;
const PNG_FPS = 30;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function capturePngFrame(canvas: HTMLCanvasElement) {
  if (!pngRecording) return;
  const now = performance.now();
  const interval = 1000 / PNG_FPS;
  if (now - pngLastCaptureTime >= interval) {
    pngLastCaptureTime = now;
    const idx = pngFrameIndex++;
    canvas.toBlob((blob) => {
      if (blob) pngFrameBuffer[idx] = blob;
    }, 'image/png');
  }
  pngCaptureRaf = requestAnimationFrame(() => capturePngFrame(canvas));
}

async function finishPngExport(slug: string) {
  recLabel.textContent = t('packing');
  await new Promise(r => setTimeout(r, 200));
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('frames')!;
  const totalFrames = pngFrameIndex;
  for (let i = 0; i < totalFrames; i++) {
    if (pngFrameBuffer[i]) {
      folder.file(`frame_${String(i).padStart(5, '0')}.png`, pngFrameBuffer[i]);
    }
  }
  zip.file('.pv', JSON.stringify({ v: '0914', t: Date.now(), fps: PNG_FPS, f: totalFrames }));
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pv-${slug}-${PNG_FPS}fps-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  pngFrameBuffer = {};
  pngFrameIndex = 0;
  recLabel.textContent = t('rec');
}

recBtn.addEventListener('click', () => {
  const useAlpha = engine.alphaMode;
  const slug = getTemplateSlug();

  if (useAlpha) {
    if (pngRecording) {
      pngRecording = false;
      cancelAnimationFrame(pngCaptureRaf);
      if (recTimerInterval) { clearInterval(recTimerInterval); recTimerInterval = null; }
      recBtn.classList.remove('recording');
      finishPngExport(slug);
      return;
    }
    pngFrameBuffer = {};
    pngFrameIndex = 0;
    pngLastCaptureTime = 0;
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
//  OBS 浏览器源 URL: https://mamayu1.github.io/pv-tool/?obs=1
//  可选参数: &t=模板编号  &offset=歌词偏移ms(默认200)
// ══════════════════════════════════════════════════════════

if (new URLSearchParams(window.location.search).get('obs') === '1') {

  // 隐藏面板
  (document.getElementById('panels-wrapper') as HTMLElement).style.display = 'none';
  (document.getElementById('mobile-toggle') as HTMLElement).style.display = 'none';

  // 按 H 键切换面板显示
  document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
      const panels = document.getElementById('panels-wrapper')!;
      const toggle = document.getElementById('mobile-toggle')!;
      const hidden = panels.style.display === 'none';
      panels.style.display = hidden ? '' : 'none';
      toggle.style.display = hidden ? '' : 'none';
    }
  });

  // 歌词偏移参数
  const OFFSET_MS = parseInt(new URLSearchParams(window.location.search).get('offset') ?? '200');

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
    engine.setTextLive(text + '/' + text);
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
      injectLyric(getLineAt((d.progress ?? 0) + OFFSET_MS));
    } catch (_) {}
  }

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
