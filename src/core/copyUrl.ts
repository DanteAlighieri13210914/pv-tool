// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

import { t } from '../i18n';
import { showToast, attachModalDismiss } from './uiHelpers';

export function initCopyUrlButton(
  copyUrlBtn: HTMLButtonElement,
  templateSelect: HTMLSelectElement,
  npListenToggle: HTMLInputElement,
): void {
  copyUrlBtn.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'pv-modal-overlay';
    overlay.innerHTML = `
      <div class="pv-modal-box">
        <div class="pv-modal-body">
          <p class="pv-modal-title">${t('copy_url_settings')}</p>
          <label class="effect-toggle" style="margin-bottom:8px">
            <input type="checkbox" id="copy-url-bg-check" checked>
            <span>${t('copy_url_transparent_bg')}</span>
          </label>
          <label class="effect-toggle" style="margin-bottom:8px">
            <input type="checkbox" id="copy-url-tpl-check" checked>
            <span>${t('copy_url_use_template')}</span>
          </label>
        </div>
        <div class="pv-modal-footer">
          <button class="btn pv-modal-confirm">${t('copy_url_copy_btn')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const confirmBtn = overlay.querySelector('.pv-modal-confirm')!;
    confirmBtn.addEventListener('click', async () => {
      const bgCheck = overlay.querySelector('#copy-url-bg-check') as HTMLInputElement;
      const tplCheck = overlay.querySelector('#copy-url-tpl-check') as HTMLInputElement;

      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams();
      params.set('panel', '0');
      if (bgCheck.checked) params.set('bg', '0');
      if (tplCheck.checked) params.set('t', templateSelect.value);
      if (npListenToggle.checked) params.set('np', '1');
      const url = baseUrl + '?' + params.toString();

      try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
      overlay.remove();
      showToast(t('url_copied'));
    });

    attachModalDismiss(overlay);
  });
}
