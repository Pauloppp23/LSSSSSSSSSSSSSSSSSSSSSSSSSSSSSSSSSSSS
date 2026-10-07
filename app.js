/**
 * LS STUDIO — app.js
 * Lógica da interface: roteamento por abas, i18n, tema, menu, modais,
 * doação Pix, animações de entrada e splash.
 * Sem dependências além do qrcode-generator (vendor) via pix.js.
 */
(function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /* Utilitários                                                         */
    /* ------------------------------------------------------------------ */
    var I18N = window.LS_I18N;
    var PIX = window.LS_PIX;
    var root = document.documentElement;
    var body = document.body;

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    var store = {
        get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
        sget: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
        sset: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
    };

    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var PAGES = ['inicio', 'servicos', 'creditos', 'equipe', 'atualizacoes', 'sobre'];
    var PAGE_NAV_KEY = {
        servicos: 'nav.services', creditos: 'nav.credits', equipe: 'nav.team',
        atualizacoes: 'nav.updates', sobre: 'nav.about'
    };
    var THEMES = ['dark', 'light', 'black', 'white'];
    var ACCENTS = ['purple', 'blue', 'green', 'orange', 'red', 'yellow', 'custom'];
    var LANG_LABEL = { pt: 'Português', en: 'English' };
    var THEME_COLOR = { dark: '#07070d', light: '#f4f5fb', black: '#000000', white: '#ffffff' };
    var HEX_RE = /^#(?:[0-9a-f]{3}){1,2}$/i;

    function normHex(v, fallback) {
        if (typeof v !== 'string' || !HEX_RE.test(v.trim())) return fallback;
        v = v.trim().toLowerCase();
        if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        return v;
    }

    function hexToRgb(hex) {
        return [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16)
        ];
    }

    function mixHex(h1, h2, w) {
        var a = hexToRgb(h1), b = hexToRgb(h2);
        return '#' + a.map(function (c, i) {
            var v = Math.round(c + (b[i] - c) * w);
            var s = v.toString(16);
            return s.length < 2 ? '0' + s : s;
        }).join('');
    }

    function hexLuminance(hex) {
        var c = hexToRgb(hex).map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    var state = {
        lang: root.getAttribute('lang') === 'en' ? 'en' : 'pt',
        theme: THEMES.indexOf(root.getAttribute('data-theme')) > -1 ? root.getAttribute('data-theme') : 'dark',
        accent: ACCENTS.indexOf(root.getAttribute('data-accent')) > -1 ? root.getAttribute('data-accent') : 'purple',
        c1: normHex(store.get('ls-c1'), '#8b5cf6'),
        c2: normHex(store.get('ls-c2'), '#d946ef'),
        grad: store.get('ls-grad') !== '0',
        rgb: store.get('ls-rgb') === '1',
        page: 'inicio'
    };

    function t(key) {
        var d = I18N.dict;
        if (d[state.lang] && d[state.lang][key] != null) return d[state.lang][key];
        if (d.pt[key] != null) return d.pt[key];
        return key;
    }

    /** Mostra/oculta uma camada (popover/modal) com animação via classe .open. */
    function toggleLayer(el, on) {
        if (!el) return;
        window.clearTimeout(el._hideTimer);
        if (on) {
            el.hidden = false;
            void el.offsetWidth; // força reflow para disparar a transição
            el.classList.add('open');
        } else {
            el.classList.remove('open');
            el._hideTimer = window.setTimeout(function () { el.hidden = true; }, 260);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Toast                                                               */
    /* ------------------------------------------------------------------ */
    var toastEl = $('#toast');
    var toastTimer;
    function toast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
    }

    /* ------------------------------------------------------------------ */
    /* Conteúdo legal                                                      */
    /* ------------------------------------------------------------------ */
    function renderLegal(target, data, titleId) {
        if (!target || !data) return;
        target.textContent = '';
        var h2 = document.createElement('h2');
        h2.id = titleId;
        h2.textContent = data.title;
        target.appendChild(h2);

        var upd = document.createElement('p');
        upd.className = 'legal-updated';
        upd.textContent = data.updated;
        target.appendChild(upd);

        data.sections.forEach(function (s) {
            var h3 = document.createElement('h3');
            h3.textContent = s.h;
            target.appendChild(h3);
            (s.p || []).forEach(function (txt) {
                var p = document.createElement('p');
                p.textContent = txt;
                target.appendChild(p);
            });
            if (s.ul) {
                var ul = document.createElement('ul');
                s.ul.forEach(function (li) {
                    var el = document.createElement('li');
                    el.textContent = li;
                    ul.appendChild(el);
                });
                target.appendChild(ul);
            }
        });
    }

    function renderAllLegal() {
        var L = I18N.legal[state.lang] || I18N.legal.pt;
        renderLegal($('#terms-content'), L.terms, 'terms-title');
        renderLegal($('#privacy-content'), L.privacy, 'privacy-title');
    }

    /* ------------------------------------------------------------------ */
    /* Idioma (i18n)                                                       */
    /* ------------------------------------------------------------------ */
    function updateTitle() {
        var key = PAGE_NAV_KEY[state.page];
        document.title = key ? t(key) + ' · LS STUDIO' : t('meta.title');
    }

    function updateHamburgerLabel() {
        var h = $('#hamburger');
        if (h) h.setAttribute('aria-label', body.classList.contains('nav-open') ? t('ui.menuClose') : t('ui.menu'));
    }

    function applyI18n() {
        $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
        $$('[data-i18n-attr]').forEach(function (el) {
            el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
                var i = pair.indexOf(':');
                if (i < 1) return;
                el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim()));
            });
        });
        root.setAttribute('lang', state.lang === 'pt' ? 'pt-BR' : 'en');
        var desc = $('meta[name="description"]');
        if (desc) desc.setAttribute('content', t('meta.desc'));

        var cur = $('#lang-current');
        if (cur) cur.textContent = LANG_LABEL[state.lang];
        $$('#lang-list [data-lang]').forEach(function (li) {
            li.setAttribute('aria-selected', li.getAttribute('data-lang') === state.lang ? 'true' : 'false');
        });

        updateTitle();
        updateHamburgerLabel();
        renderAllLegal();
    }

    function setLang(lang, silent) {
        if (!I18N.dict[lang]) lang = 'pt';
        state.lang = lang;
        store.set('ls-lang', lang);
        applyI18n();
        if (!silent) {
            splash.restartTyping();
            if (typeof heroRotator !== 'undefined' && heroRotator) heroRotator.restart();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Tema e cor                                                          */
    /* ------------------------------------------------------------------ */
    var themingTimer;
    function softTransition() {
        if (reducedMotion) return;
        root.classList.add('theming');
        window.clearTimeout(themingTimer);
        themingTimer = window.setTimeout(function () { root.classList.remove('theming'); }, 500);
    }

    function setTheme(theme, silent) {
        if (THEMES.indexOf(theme) < 0) theme = 'dark';
        if (!silent) softTransition();
        state.theme = theme;
        root.setAttribute('data-theme', theme);
        store.set('ls-theme', theme);
        var meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
        $$('[data-theme-choice]').forEach(function (b) {
            b.setAttribute('aria-pressed', b.getAttribute('data-theme-choice') === theme ? 'true' : 'false');
        });
    }

    var CUSTOM_PROPS = ['--accent', '--accent-2', '--accent-rgb', '--accent-l', '--accent-d', '--on-accent'];

    function clearCustomVars() {
        CUSTOM_PROPS.forEach(function (p) { root.style.removeProperty(p); });
    }

    /** Aplica a cor personalizada (Cor 1 + Cor 2, com ou sem degradê). */
    function applyCustomVars() {
        var second = state.grad ? state.c2 : state.c1;
        root.style.setProperty('--accent', state.c1);
        root.style.setProperty('--accent-2', second);
        root.style.setProperty('--accent-rgb', hexToRgb(state.c1).join(', '));
        root.style.setProperty('--accent-l', mixHex(state.c1, '#ffffff', 0.45));
        root.style.setProperty('--accent-d', mixHex(state.c1, '#000000', 0.4));
        root.style.setProperty('--on-accent', hexLuminance(state.c1) > 0.45 ? '#1a1300' : '#ffffff');
    }

    function setAccent(accent, silent) {
        if (ACCENTS.indexOf(accent) < 0) accent = 'purple';
        if (!silent) softTransition();
        state.accent = accent;
        root.setAttribute('data-accent', accent);
        store.set('ls-accent', accent);
        if (accent === 'custom') applyCustomVars(); else clearCustomVars();
        $$('[data-accent-choice]').forEach(function (b) {
            var on = b.getAttribute('data-accent-choice') === accent;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
        });
        syncCustomUI();
    }

    function setRgb(on, silent) {
        state.rgb = !!on;
        store.set('ls-rgb', state.rgb ? '1' : '0');
        root.classList.toggle('rgb-on', state.rgb);
        var sw = $('#rgb-toggle');
        if (sw) sw.setAttribute('aria-checked', state.rgb ? 'true' : 'false');
        if (!silent) softTransition();
    }

    function setGradient(on) {
        state.grad = !!on;
        store.set('ls-grad', state.grad ? '1' : '0');
        var sw = $('#gradient-toggle');
        if (sw) sw.setAttribute('aria-checked', state.grad ? 'true' : 'false');
        if (state.accent === 'custom') { softTransition(); applyCustomVars(); }
    }

    function syncCustomUI() {
        var c1 = $('#custom-c1'), c2 = $('#custom-c2');
        var h1 = $('#custom-hex1'), h2 = $('#custom-hex2');
        if (c1) c1.value = state.c1;
        if (c2) c2.value = state.c2;
        if (h1 && document.activeElement !== h1) h1.value = state.c1.toUpperCase();
        if (h2 && document.activeElement !== h2) h2.value = state.c2.toUpperCase();
        var g = $('#gradient-toggle');
        if (g) g.setAttribute('aria-checked', state.grad ? 'true' : 'false');
        var r = $('#rgb-toggle');
        if (r) r.setAttribute('aria-checked', state.rgb ? 'true' : 'false');
    }

    function showCustomError(on) {
        var err = $('#custom-error');
        if (!err) return;
        /* Reserva o espaço com visibility (sem display:none): mostrar ou
           esconder o erro não desloca os interruptores abaixo. */
        err.classList.toggle('visible', !!on);
        err.textContent = on ? t('set.invalidHex') : '';
    }

    /** Troca para a cor personalizada a partir dos campos (chamado ao editar Cor 1/Cor 2). */
    function useCustomColors(c1, c2) {
        state.c1 = c1;
        state.c2 = c2;
        store.set('ls-c1', c1);
        store.set('ls-c2', c2);
        showCustomError(false);
        setAccent('custom');
    }

    /* ------------------------------------------------------------------ */
    /* Animações de entrada (reveal)                                       */
    /* ------------------------------------------------------------------ */
    var revealObserver = null;
    if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    }

    function initReveal(page) {
        var els = $$('.reveal', page);
        els.forEach(function (el, i) {
            el.classList.remove('in');
            el.style.setProperty('--rd', Math.min(i, 10) * 70 + 'ms');
            if (revealObserver) {
                revealObserver.observe(el);
            } else {
                el.classList.add('in');
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* Roteamento por abas                                                 */
    /* ------------------------------------------------------------------ */
    function showPage(id, opts) {
        if (PAGES.indexOf(id) < 0) id = 'inicio';
        var changed = id !== state.page || !$('.page.active');
        state.page = id;

        $$('.page').forEach(function (p) {
            var on = p.getAttribute('data-page') === id;
            p.classList.toggle('active', on);
            if (on && changed) initReveal(p);
        });

        $$('.nav-link, .footer-col a[data-route]').forEach(function (a) {
            var on = a.getAttribute('data-route') === id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        });

        updateTitle();
        if (changed && !(opts && opts.keepScroll)) {
            window.scrollTo(0, 0);
        }
    }

    function navigate(id) {
        if (PAGES.indexOf(id) < 0) return;
        if (window.location.hash !== '#' + id) {
            try { window.history.pushState(null, '', '#' + id); } catch (e) { window.location.hash = id; }
        }
        showPage(id);
    }

    function onHashChange() {
        var h = window.location.hash.replace(/^#/, '');
        if (h === 'termos') { showPage(state.page, { keepScroll: true }); modal.open('terms-modal'); return; }
        if (h === 'privacidade') { showPage(state.page, { keepScroll: true }); modal.open('privacy-modal'); return; }
        if (modal.current) modal.close(true);
        if (PAGES.indexOf(h) > -1) {
            showPage(h);
        } else {
            showPage('inicio');
            if (h) { try { window.history.replaceState(null, '', '#inicio'); } catch (e) { /* ignore */ } }
        }
    }

    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[data-route]') : null;
        if (!a) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        nav.close();
        settings.close();
        navigate(a.getAttribute('data-route'));
    });

    /* ------------------------------------------------------------------ */
    /* Menu mobile                                                         */
    /* ------------------------------------------------------------------ */
    var nav = {
        btn: $('#hamburger'),
        el: $('#nav'),
        overlay: $('#nav-overlay'),
        isOpen: function () { return body.classList.contains('nav-open'); },
        open: function () {
            body.classList.add('nav-open');
            this.btn.setAttribute('aria-expanded', 'true');
            updateHamburgerLabel();
        },
        close: function () {
            if (!this.isOpen()) return;
            body.classList.remove('nav-open');
            this.btn.setAttribute('aria-expanded', 'false');
            updateHamburgerLabel();
        }
    };
    nav.btn.addEventListener('click', function () { nav.isOpen() ? nav.close() : nav.open(); });
    nav.overlay.addEventListener('click', function () { nav.close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) nav.close(); });

    /* ------------------------------------------------------------------ */
    /* Configurações                                                       */
    /* ------------------------------------------------------------------ */
    var settings = {
        btn: $('#settings-btn'),
        panel: $('#settings-panel'),
        isOpen: function () { return !this.panel.hidden && this.panel.classList.contains('open'); },
        open: function () {
            toggleLayer(this.panel, true);
            this.btn.setAttribute('aria-expanded', 'true');
        },
        close: function () {
            if (!this.isOpen()) return;
            toggleLayer(this.panel, false);
            this.btn.setAttribute('aria-expanded', 'false');
        }
    };
    settings.btn.addEventListener('click', function (e) {
        e.stopPropagation();
        settings.isOpen() ? settings.close() : settings.open();
    });

    $('#theme-toggle').addEventListener('click', function () {
        var i = (THEMES.indexOf(state.theme) + 1) % THEMES.length;
        setTheme(THEMES[i]);
    });
    $$('[data-theme-choice]').forEach(function (b) {
        b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme-choice')); });
    });
    $$('[data-accent-choice]').forEach(function (b) {
        b.addEventListener('click', function () { showCustomError(false); setAccent(b.getAttribute('data-accent-choice')); });
        b.addEventListener('keydown', function (e) {
            var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
            if (!dir) return;
            e.preventDefault();
            var presets = ACCENTS.filter(function (a) { return a !== 'custom'; });
            var cur = presets.indexOf(state.accent);
            if (cur < 0) cur = 0;
            var next = presets[(cur + dir + presets.length) % presets.length];
            showCustomError(false);
            setAccent(next);
            var el = $('[data-accent-choice="' + next + '"]');
            if (el) el.focus();
        });
    });

    /* Cor personalizada: seletores de cor + campos hex + degradê + RGB */
    (function initCustomColors() {
        var c1 = $('#custom-c1'), c2 = $('#custom-c2');
        var h1 = $('#custom-hex1'), h2 = $('#custom-hex2');
        if (!c1 || !c2) return;
        syncCustomUI();
        c1.addEventListener('input', function () {
            useCustomColors(normHex(c1.value, state.c1), state.c2);
            if (h1) h1.value = state.c1.toUpperCase();
        });
        c2.addEventListener('input', function () {
            useCustomColors(state.c1, normHex(c2.value, state.c2));
            if (h2) h2.value = state.c2.toUpperCase();
        });
        function commitHex(input, which) {
            var v = normHex(input.value, null);
            if (v === null) {
                showCustomError(true);
                input.value = (which === 1 ? state.c1 : state.c2).toUpperCase();
                input.focus();
                input.select();
                return;
            }
            if (which === 1) useCustomColors(v, state.c2);
            else useCustomColors(state.c1, v);
        }
        if (h1) h1.addEventListener('change', function () { commitHex(h1, 1); });
        if (h2) h2.addEventListener('change', function () { commitHex(h2, 2); });
        var g = $('#gradient-toggle');
        if (g) g.addEventListener('click', function () { setGradient(!state.grad); });
        var r = $('#rgb-toggle');
        if (r) r.addEventListener('click', function () { setRgb(!state.rgb); });
    })();

    /* ------------------------------------------------------------------ */
    /* Seletor de idioma (rodapé)                                          */
    /* ------------------------------------------------------------------ */
    var lang = {
        btn: $('#lang-btn'),
        list: $('#lang-list'),
        isOpen: function () { return !this.list.hidden && this.list.classList.contains('open'); },
        options: function () { return $$('#lang-list [role="option"]'); },
        open: function (focusSelected) {
            toggleLayer(this.list, true);
            this.btn.setAttribute('aria-expanded', 'true');
            if (focusSelected) {
                var sel = $('#lang-list [aria-selected="true"]') || this.options()[0];
                if (sel) sel.focus();
            }
        },
        close: function (returnFocus) {
            if (!this.isOpen()) return;
            toggleLayer(this.list, false);
            this.btn.setAttribute('aria-expanded', 'false');
            if (returnFocus) this.btn.focus();
        },
        choose: function (code) {
            setLang(code);
            this.close(true);
        }
    };
    lang.btn.addEventListener('click', function (e) {
        e.stopPropagation();
        lang.isOpen() ? lang.close() : lang.open(false);
    });
    lang.btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); lang.open(true); }
    });
    lang.options().forEach(function (li) {
        li.addEventListener('click', function () { lang.choose(li.getAttribute('data-lang')); });
        li.addEventListener('keydown', function (e) {
            var opts = lang.options();
            var i = opts.indexOf(li);
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lang.choose(li.getAttribute('data-lang')); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
            else if (e.key === 'Home') { e.preventDefault(); opts[0].focus(); }
            else if (e.key === 'End') { e.preventDefault(); opts[opts.length - 1].focus(); }
            else if (e.key === 'Tab') { lang.close(false); }
        });
    });

    document.addEventListener('click', function (e) {
        if (settings.isOpen() && !e.target.closest('.settings')) settings.close();
        if (lang.isOpen() && !e.target.closest('.lang')) lang.close();
    });

    /* ------------------------------------------------------------------ */
    /* Modais                                                              */
    /* ------------------------------------------------------------------ */
    var modal = {
        current: null,
        lastFocus: null,
        open: function (id) {
            var m = document.getElementById(id);
            if (!m) return;
            if (this.current === m) return;
            if (this.current) this.close(true);
            this.lastFocus = document.activeElement;
            this.current = m;
            toggleLayer(m, true);
            body.classList.add('modal-open');
            var box = $('.modal-box', m);
            if (box) { box.scrollTop = 0; box.focus({ preventScroll: true }); }
            if (id === 'donate-modal') donate.render();
        },
        close: function (immediate) {
            var m = this.current;
            if (!m) return;
            this.current = null;
            toggleLayer(m, false);
            if (immediate) { window.clearTimeout(m._hideTimer); m.hidden = true; }
            body.classList.remove('modal-open');
            var h = window.location.hash;
            if (h === '#termos' || h === '#privacidade') {
                try { window.history.replaceState(null, '', '#' + state.page); } catch (e) { /* ignore */ }
            }
            if (this.lastFocus && this.lastFocus.focus && document.contains(this.lastFocus)) {
                this.lastFocus.focus({ preventScroll: true });
            }
        }
    };

    document.addEventListener('click', function (e) {
        var opener = e.target.closest ? e.target.closest('[data-open-modal]') : null;
        if (opener) {
            e.preventDefault();
            nav.close();
            modal.open(opener.getAttribute('data-open-modal'));
            return;
        }
        if (e.target.closest && e.target.closest('[data-close-modal]')) modal.close();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (modal.current) { modal.close(); return; }
            if (lang.isOpen()) { lang.close(true); return; }
            if (settings.isOpen()) { settings.close(); settings.btn.focus(); return; }
            if (nav.isOpen()) { nav.close(); nav.btn.focus(); return; }
            return;
        }
        if (e.key === 'Tab' && modal.current) {
            var items = $$(FOCUSABLE, modal.current).filter(function (el) { return el.offsetParent !== null; });
            if (!items.length) return;
            var first = items[0];
            var last = items[items.length - 1];
            var box = $('.modal-box', modal.current);
            if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        }
    });

    /* ------------------------------------------------------------------ */
    /* Doação Pix                                                          */
    /* ------------------------------------------------------------------ */
    var donate = {
        amount: null,
        payload: '',
        qr: $('#qr'),
        keyEl: $('#pix-key'),
        input: $('#amount-input'),
        error: $('#amount-error'),
        chips: $$('#amount-chips [data-amount]'),

        parse: function (raw) {
            var s = String(raw).replace(/\s|R\$/gi, '');
            if (!s) return { empty: true };
            if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
            if (!/^\d{1,5}(\.\d{1,2})?$/.test(s)) return { invalid: true };
            var n = parseFloat(s);
            if (!(n >= 1 && n <= 10000)) return { invalid: true };
            return { value: Math.round(n * 100) / 100 };
        },
        setChips: function (activeAmount) {
            this.chips.forEach(function (c) {
                var v = c.getAttribute('data-amount');
                c.setAttribute('aria-pressed', activeAmount !== undefined && v === activeAmount ? 'true' : 'false');
            });
        },
        showError: function (on) {
            this.error.hidden = !on;
            this.error.textContent = on ? t('don.invalid') : '';
            this.input.setAttribute('aria-invalid', on ? 'true' : 'false');
        },
        render: function () {
            this.payload = PIX.buildPayload(this.amount);
            if (this.keyEl) this.keyEl.textContent = PIX.key;
            PIX.renderQR(this.qr, this.payload);
        },
        copy: function (text) {
            function done(ok) { toast(ok ? t('don.copied') : t('don.copyFail')); }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback()); });
            } else {
                done(fallback());
            }
            function fallback() {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                var ok = false;
                try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
                document.body.removeChild(ta);
                return ok;
            }
        },
        init: function () {
            var self = this;
            this.chips.forEach(function (c) {
                c.addEventListener('click', function () {
                    var v = c.getAttribute('data-amount');
                    self.amount = v ? parseFloat(v) : null;
                    self.input.value = '';
                    self.showError(false);
                    self.setChips(v);
                    self.render();
                });
            });
            this.input.addEventListener('input', function () {
                var r = self.parse(self.input.value);
                if (r.empty) {
                    self.amount = null; self.showError(false); self.setChips(''); self.render();
                } else if (r.invalid) {
                    self.showError(true); self.setChips(undefined);
                } else {
                    self.amount = r.value; self.showError(false); self.setChips(undefined); self.render();
                }
            });
            $('#copy-code').addEventListener('click', function () { self.copy(self.payload || PIX.buildPayload(self.amount)); });
            $('#copy-key').addEventListener('click', function () { self.copy(PIX.key); });
        }
    };

    /* ------------------------------------------------------------------ */
    /* Splash (boas-vindas)                                                */
    /* ------------------------------------------------------------------ */
    var splash = (function () {
        var el = $('#splash');
        var typingEl = $('#splash-typing');
        var enterBtn = $('#splash-enter');
        var token = 0;
        var timer = null;
        var active = !!el && !root.classList.contains('splash-seen');

        function stop() { token++; window.clearTimeout(timer); }

        function startTyping() {
            stop();
            if (!active || !typingEl) return;
            var lines = [t('splash.s1'), t('splash.s2'), t('splash.s3'), t('splash.s4')];
            if (reducedMotion) { typingEl.textContent = lines[0]; return; }
            var my = token;
            var li = 0, ci = 0, del = false;
            (function step() {
                if (my !== token) return;
                var line = lines[li];
                ci += del ? -1 : 1;
                typingEl.textContent = line.slice(0, ci);
                var wait = del ? 26 : 52;
                if (!del && ci === line.length) { wait = 2200; del = true; }
                else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 450; }
                timer = window.setTimeout(step, wait);
            })();
        }

        function dismiss() {
            if (!active) return;
            active = false;
            stop();
            store.sset('ls-splash-seen', '1');
            el.classList.add('hide');
            body.classList.remove('splash-open');
            window.setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
                var main = $('#main');
                if (main) main.focus({ preventScroll: true });
            }, reducedMotion ? 0 : 650);
        }

        function init() {
            try {
                if (!el) return;
                if (!active) { if (el.parentNode) el.parentNode.removeChild(el); return; }
                body.classList.add('splash-open');
                if (enterBtn) {
                    enterBtn.addEventListener('click', dismiss);
                    enterBtn.focus({ preventScroll: true });
                }
                document.addEventListener('keydown', function (e) { if (active && e.key === 'Escape') dismiss(); });
                el.setAttribute('tabindex', '-1');
                startTyping();
            } catch (err) {
                /* Falha na entrada nunca pode prender o usuário: libera o site. */
                if (el && el.parentNode) el.parentNode.removeChild(el);
                body.classList.remove('splash-open');
            }
        }

        return { init: init, restartTyping: startTyping };
    })();

    /* Texto rotativo do inicio (efeito maquina de escrever)                */
    /* ------------------------------------------------------------------ */
    var heroRotator = (function () {
        var el = $('#hero-rotator');
        var token = 0;
        var timer = null;

        function lines() {
            return [t('hero.r1'), t('hero.r2'), t('hero.r3'), t('hero.r4')];
        }

        function stop() { token++; window.clearTimeout(timer); }

        function start() {
            stop();
            if (!el) return;
            var list = lines();
            if (reducedMotion) { el.textContent = list[0]; return; }
            var my = token;
            var li = 0, ci = 0, del = false;
            (function step() {
                if (my !== token) return;
                var line = list[li];
                ci += del ? -1 : 1;
                el.textContent = line.slice(0, ci);
                var wait = del ? 26 : 52;
                if (!del && ci === line.length) { wait = 2200; del = true; }
                else if (del && ci === 0) { del = false; li = (li + 1) % list.length; wait = 450; }
                timer = window.setTimeout(step, wait);
            })();
        }

        return { start: start, restart: start };
    })();

    /* Efeitos: holofote nos cards, barra de rolagem, cabeçalho            */
    /* ------------------------------------------------------------------ */
    window.addEventListener('pointermove', function (e) {
        var card = e.target.closest ? e.target.closest('.glow-card') : null;
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    var header = $('#site-header');
    var progress = $('#scroll-progress');
    var scrollTicking = false;
    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(function () {
            var y = window.pageYOffset || root.scrollTop;
            var max = Math.max(1, root.scrollHeight - window.innerHeight);
            header.classList.toggle('scrolled', y > 8);
            progress.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
            scrollTicking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    /* ------------------------------------------------------------------ */
    /* Inicialização                                                       */
    /* ------------------------------------------------------------------ */
    function init() {
        var yearEl = $('#year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        setTheme(state.theme, true);
        setAccent(state.accent, true);
        setRgb(state.rgb, true);
        donate.init();
        applyI18n();
        heroRotator.start();
        splash.init();

        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('popstate', onHashChange);
        onHashChange();
        onScroll();

        root.classList.add('ready');
    }

    init();
})();
