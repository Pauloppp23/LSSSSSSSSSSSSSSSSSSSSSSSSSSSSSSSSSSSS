/**
 * LS STUDIO — pix.js
 * Gera o payload Pix "copia e cola" (BR Code / EMV®) e o QR Code em SVG.
 * Tudo roda localmente no navegador; nenhum dado é enviado a servidores.
 * Expõe: window.LS_PIX
 */
(function (global) {
    'use strict';

    var CONFIG = {
        key: 'f169b69e-8bb1-45df-ad22-d682314ea27e', // Chave Pix aleatória (Nubank)
        merchantName: 'LS STUDIO',                    // máx. 25 caracteres
        merchantCity: 'BRASIL'                        // máx. 15 caracteres
    };

    /** Monta um campo TLV (ID + tamanho com 2 dígitos + valor). */
    function tlv(id, value) {
        var len = String(value.length);
        if (len.length < 2) len = '0' + len;
        return id + len + value;
    }

    /** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), exigido pelo BR Code. */
    function crc16(str) {
        var crc = 0xFFFF;
        for (var i = 0; i < str.length; i++) {
            crc ^= (str.charCodeAt(i) & 0xFF) << 8;
            for (var b = 0; b < 8; b++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
        }
        var hex = crc.toString(16).toUpperCase();
        while (hex.length < 4) hex = '0' + hex;
        return hex;
    }

    /**
     * @param {number|null} amount valor em reais (opcional). Sem valor, o doador escolhe no app do banco.
     * @returns {string} payload Pix completo (com CRC)
     */
    function buildPayload(amount) {
        var account = tlv('00', 'br.gov.bcb.pix') + tlv('01', CONFIG.key);
        var payload =
            tlv('00', '01') +                 // versão do payload
            tlv('01', '11') +                 // 11 = QR reutilizável
            tlv('26', account) +              // dados da conta Pix
            tlv('52', '0000') +               // categoria do comerciante
            tlv('53', '986');                 // moeda: BRL
        if (typeof amount === 'number' && isFinite(amount) && amount > 0) {
            payload += tlv('54', amount.toFixed(2));
        }
        payload +=
            tlv('58', 'BR') +
            tlv('59', CONFIG.merchantName) +
            tlv('60', CONFIG.merchantCity) +
            tlv('62', tlv('05', '***')) +     // identificador da transação
            '6304';
        return payload + crc16(payload);
    }

    /**
     * Renderiza o QR Code como SVG escalável dentro de um container.
     * @returns {boolean} true se renderizou
     */
    function renderQR(container, text) {
        if (!container) return false;
        if (typeof global.qrcode !== 'function') {
            container.textContent = '';
            return false;
        }
        var qr = global.qrcode(0, 'M');
        qr.addData(text);
        qr.make();

        var count = qr.getModuleCount();
        var quiet = 4;
        var size = count + quiet * 2;
        var d = '';
        for (var r = 0; r < count; r++) {
            for (var c = 0; c < count; c++) {
                if (qr.isDark(r, c)) {
                    d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
                }
            }
        }
        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
        svg.setAttribute('shape-rendering', 'crispEdges');
        svg.setAttribute('aria-hidden', 'true');
        var bg = document.createElementNS(NS, 'rect');
        bg.setAttribute('width', size);
        bg.setAttribute('height', size);
        bg.setAttribute('fill', '#ffffff');
        var path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', '#000000');
        svg.appendChild(bg);
        svg.appendChild(path);

        container.textContent = '';
        container.appendChild(svg);
        return true;
    }

    global.LS_PIX = {
        key: CONFIG.key,
        crc16: crc16,
        buildPayload: buildPayload,
        renderQR: renderQR
    };
})(window);
