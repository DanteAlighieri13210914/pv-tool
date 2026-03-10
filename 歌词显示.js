// ==UserScript==
// @name         Now Playing → pixjam 实时歌词
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  从 Now Playing (localhost:9863) 直接调用 V.setText() 注入歌词
// @match        https://pv.pixjam.cn/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ── 第一步：在 pixjam 代码运行前拦截 addEventListener ──
    // 当 pixjam 注册那个含 V.setText 的 input 监听器时，我们把它偷出来
    const _origAddEL = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
        if (type === 'input' && typeof fn === 'function' && fn.toString().includes('setText')) {
            // 绕过 pixjam 的 400ms 防抖，临时把 setTimeout 延迟强制为 0
            window.__pjInject = (text) => {
                const origST = window.setTimeout;
                window.setTimeout = (cb, _delay) => origST(cb, 0);
                fn({ target: { value: text } });
                window.setTimeout = origST;
            };
            console.log('[pj-lyric] ✅ 捕获到 V.setText 入口（防抖已绕过）');
        }
        return _origAddEL.call(this, type, fn, opts);
    };

    // ── 第二步：等页面加载完再开始轮询 ──────────────────
    window.addEventListener('load', () => {

        const NP_BASE       = 'http://localhost:9863';
        const LYRIC_REFRESH = 5000;
        const POSITION_POLL = 300;

        let lrcLines  = [];
        let cachedLrc = '';
        let lastLine  = '';

        function parseLRC(str) {
            const re = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.+)/g;
            const lines = [];
            let m;
            while ((m = re.exec(str)) !== null) {
                const ms = (parseInt(m[1]) * 60 + parseInt(m[2])) * 1000
                         + parseInt(m[3].padEnd(3, '0'));
                const text = m[4].trim();
                if (text) lines.push({ ms, text });
            }
            return lines.sort((a, b) => a.ms - b.ms);
        }

        function getLineAt(posMs) {
            let result = '';
            for (const { ms, text } of lrcLines) {
                if (posMs >= ms) result = text;
                else break;
            }
            return result;
        }

        function inject(text) {
            if (!text || text === lastLine) return;
            lastLine = text;
            if (typeof window.__pjInject === 'function') {
                window.__pjInject(text);
            }
        }

        function npGet(path, cb) {
            GM_xmlhttpRequest({
                method: 'GET', url: NP_BASE + path, timeout: 800,
                onload:    r => { try { cb(JSON.parse(r.responseText)); } catch(_){} },
                onerror:   () => {},
                ontimeout: () => {},
            });
        }

        function refreshLyric() {
            npGet('/api/lyric', d => {
                if (d.lrc && d.lrc !== cachedLrc) {
                    cachedLrc = d.lrc;
                    lrcLines  = parseLRC(d.lrc);
                    lastLine  = '';
                    console.log('[pj-lyric] 歌词加载:', lrcLines.length, '行');
                }
            });
        }

        function pollPosition() {
            if (!lrcLines.length) return;
            npGet('/api/query/progress', d => {
                inject(getLineAt(d.progress ?? 0));
            });
        }

        // Worker 计时，防主线程节流
        const worker = new Worker(URL.createObjectURL(new Blob([`
            setInterval(() => postMessage('lyric'), ${LYRIC_REFRESH});
            setInterval(() => postMessage('pos'),   ${POSITION_POLL});
        `], { type: 'text/javascript' })));

        worker.onmessage = e => {
            if (e.data === 'lyric') refreshLyric();
            if (e.data === 'pos')   pollPosition();
        };

        refreshLyric();

        if (!window.__pjInject) {
            console.warn('[pj-lyric] ⚠️ 未捕获到 V.setText，可能页面结构已变');
        }
    });
})();
