// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under Non-Commercial License. See LICENSE for terms.

/**
 * templateDropdown.ts
 *
 * Renders a custom div-based dropdown to replace the native <select> for
 * template selection. Works in OBS browser source (which cannot interact
 * with native <select> elements) while looking identical to a dropdown in
 * normal browsers.
 *
 * The hidden <select id="template-select"> is kept for state management —
 * all existing JS logic continues to drive it normally. This component
 * only handles the visual layer.
 */

import { templates } from '../templates';
import type { TemplateConfig } from './types';
import { t } from '../i18n';

function tplName(tpl: TemplateConfig): string {
  return tpl.nameKey ? t(tpl.nameKey as any) : tpl.name;
}

let dropdownContainer: HTMLElement | null = null;
let getCustom: (() => TemplateConfig[]) | null = null;
let selectEl: HTMLSelectElement | null = null;

function getLabelForValue(val: string): string {
  if (val === 'custom') return t('custom');
  if (val.startsWith('user-')) {
    const idx = parseInt(val.split('-')[1]);
    const customs = getCustom?.() ?? [];
    return customs[idx] ? `⭐ ${customs[idx].name}` : val;
  }
  const idx = parseInt(val);
  return templates[idx] ? tplName(templates[idx]) : val;
}

function syncLabel(): void {
  if (!dropdownContainer || !selectEl) return;
  const label = dropdownContainer.querySelector<HTMLElement>('.tpl-dd-label');
  if (label) label.textContent = getLabelForValue(selectEl.value);

  dropdownContainer.querySelectorAll<HTMLElement>('.tpl-dd-item').forEach(item => {
    item.classList.toggle('tpl-dd-item-active', item.dataset.idx === selectEl!.value);
  });
}

function buildList(): void {
  if (!dropdownContainer || !selectEl) return;
  const list = dropdownContainer.querySelector<HTMLElement>('.tpl-dd-list')!;
  const custom = getCustom?.() ?? [];

  list.innerHTML = [
    ...templates.map((tp, i) =>
      `<button class="tpl-dd-item" data-idx="${i}">${tplName(tp)}</button>`),
    ...custom.map((tp, i) =>
      `<button class="tpl-dd-item" data-idx="user-${i}">⭐ ${tp.name}</button>`),
    `<button class="tpl-dd-item" data-idx="custom">${t('custom')}</button>`,
  ].join('');

  syncLabel();
}

function closeDropdown(): void {
  dropdownContainer?.classList.remove('tpl-dd-open');
}

export function initTemplateDropdown(
  templateSelect: HTMLSelectElement,
  getCustomTemplates: () => TemplateConfig[],
): void {
  selectEl = templateSelect;
  getCustom = getCustomTemplates;

  // Hide the native select
  templateSelect.style.display = 'none';

  // Build the custom dropdown
  const container = document.createElement('div');
  container.className = 'tpl-dd';
  container.innerHTML = `
    <button class="tpl-dd-trigger" type="button">
      <span class="tpl-dd-label"></span>
      <span class="tpl-dd-arrow">▾</span>
    </button>
    <div class="tpl-dd-list"></div>
  `;
  templateSelect.parentElement!.insertBefore(container, templateSelect);
  dropdownContainer = container;

  buildList();

  // Toggle open/close on trigger click
  container.querySelector('.tpl-dd-trigger')!.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.toggle('tpl-dd-open');
  });

  // Item click → drive hidden select → fire change
  container.querySelector('.tpl-dd-list')!.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.tpl-dd-item');
    if (!item) return;
    templateSelect.value = item.dataset.idx!;
    templateSelect.dispatchEvent(new Event('change'));
    closeDropdown();
  });

  // Keep label in sync when hidden select changes by code
  templateSelect.addEventListener('change', syncLabel);

  // Close on outside click
  document.addEventListener('click', closeDropdown);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });
}

export function rebuildTemplateDropdown(): void {
  if (dropdownContainer) {
    buildList();
  }
}
