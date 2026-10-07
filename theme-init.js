/**
 * LS STUDIO — theme-init.js
 * Executa de forma síncrona no <head>, antes da primeira pintura.
 * Aplica tema, cor (pré-definida ou personalizada), modo RGB,
 * idioma e estado do splash salvos, evitando "flash" de conteúdo.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    var THEMES = ['dark', 'light', 'black', 'white'];
    var ACCENTS = ['purple', 'blue', 'green', 'orange', 'red', 'yellow', 'custom'];
    var LANGS = ['pt', 'en'];
    var HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;
    var META = { dark: '#07070d', light: '#f4f5fb', black: '#000000', white: '#ffffff' };

    function read(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }

    function normHex(v, fallback) {
        if (typeof v !== 'string' || !HEX.test(v.trim())) return fallback;
        v = v.trim().toLowerCase();
        if (v.length === 4) {
            v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        }
        return v;
    }

    function toRgb(hex) {
        return [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16)
        ];
    }

    function mix(h1, h2, w) {
        var a = toRgb(h1), b = toRgb(h2);
        return '#' + a.map(function (c, i) {
            var v = Math.round(c + (b[i] - c) * w);
            var s = v.toString(16);
            return s.length < 2 ? '0' + s : s;
        }).join('');
    }

    function luminance(hex) {
        var c = toRgb(hex).map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    var theme = read('ls-theme');
    var accent = read('ls-accent');
    var c1 = normHex(read('ls-c1'), '#8b5cf6');
    var c2 = normHex(read('ls-c2'), '#d946ef');
    var grad = read('ls-grad') !== '0';
    var rgb = read('ls-rgb') === '1';
    var lang = read('ls-lang') || read('language'); // compatível com a versão antiga do site

    if (THEMES.indexOf(theme) === -1) theme = 'dark';
    if (ACCENTS.indexOf(accent) === -1) accent = 'purple';
    if (LANGS.indexOf(lang) === -1) {
        lang = /^pt/i.test(navigator.language || '') ? 'pt' : 'en';
    }

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accent);
    root.setAttribute('lang', lang === 'pt' ? 'pt-BR' : 'en');
    root.className = root.className.replace('no-js', 'js');

    if (accent === 'custom') {
        var second = grad ? c2 : c1;
        root.style.setProperty('--accent', c1);
        root.style.setProperty('--accent-2', second);
        root.style.setProperty('--accent-rgb', toRgb(c1).join(', '));
        root.style.setProperty('--accent-l', mix(c1, '#ffffff', 0.45));
        root.style.setProperty('--accent-d', mix(c1, '#000000', 0.4));
        root.style.setProperty('--on-accent', luminance(c1) > 0.45 ? '#1a1300' : '#ffffff');
    }
    if (rgb) root.classList.add('rgb-on');

    try {
        if (window.sessionStorage.getItem('ls-splash-seen') === '1') {
            root.classList.add('splash-seen');
        }
    } catch (e) { /* storage indisponível: o splash simplesmente aparece */ }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', META[theme] || META.dark);
})();
