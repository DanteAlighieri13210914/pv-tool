// ==UserScript==
// @name         pixjam 面板隐藏
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  按 H 键切换隐藏/显示 pixjam 左右面板，直播录屏用
// @author       你
// @match        https://pv.pixjam.cn/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        /* 左侧面板：视觉隐藏但保留渲染，Vue 响应式不断 */
        body.pj-hide .controls {
            opacity: 0 !important;
            pointer-events: none !important;
            position: fixed !important;
            left: -9999px !important;
        }
        /* 右侧面板 */
        body.pj-hide .controls-right {
            opacity: 0 !important;
            pointer-events: none !important;
            position: fixed !important;
            right: -9999px !important;
        }
        /* 强制绿幕背景（色度键用） */
        body, #pv-container, canvas {
            background: #00ff00 !important;
            background-color: #00ff00 !important;
        }
        /* 提示角标 */
        #pj-hint {
            position: fixed;
            bottom: 12px;
            right: 12px;
            background: rgba(0,0,0,0.55);
            color: #fff;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            z-index: 99999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.4s;
        }
    `;
    document.head.appendChild(style);

    const hint = document.createElement('div');
    hint.id = 'pj-hint';
    document.body.appendChild(hint);

    let hintTimer;
    function showHint(msg) {
        hint.textContent = msg;
        hint.style.opacity = '1';
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => hint.style.opacity = '0', 1500);
    }

    let hidden = false;

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'h' && e.key !== 'H') return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

        hidden = !hidden;
        document.body.classList.toggle('pj-hide', hidden);
        showHint(hidden ? '面板已隐藏 · H 恢复' : '面板已显示');
    });

    showHint('H 键隐藏/显示面板');
})();
