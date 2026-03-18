// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

export function showToast(msg: string) {
  const el = document.createElement('div');
  el.className = 'pv-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/**
 * Attach dismiss behaviour (click-outside + Escape) to a modal overlay.
 * Listeners are automatically cleaned up when the overlay is removed.
 */
export function attachModalDismiss(overlay: HTMLElement): void {
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', onEsc);
      overlay.remove();
    }
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.removeEventListener('keydown', onEsc);
      overlay.remove();
    }
  });
  document.addEventListener('keydown', onEsc);
}
