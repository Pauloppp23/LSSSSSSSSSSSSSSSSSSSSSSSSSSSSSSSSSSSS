# LS STUDIO

Central de criação de conteúdo, projetos, inovações e ferramentas. Site estático (HTML + CSS + JS), sem backend. Todos os arquivos ficam soltos na mesma pasta.

## Arquivos

```
index.html          Estrutura (HTML semântico, sem CSS/JS embutido)
style.css           Design system, temas, animações e responsividade
theme-init.js       Aplica tema/idioma salvos antes da 1ª pintura
i18n.js             Traduções PT/EN + Termos e Privacidade
pix.js              Payload Pix (BR Code + CRC16) e QR Code em SVG
app.js              Abas, tema, idioma, menu, modais, doação, cursor
qrcode.js           qrcode-generator (MIT, Kazuhiko Arase)
favicon.svg         Ícone do site
goku-black.jpg      Foto da equipe: Paulo Victor (LS PAULO)
gojo.jpg            Foto da equipe: Vini Luiz (VNX)
goku-ui.jpg         Foto da equipe: Rick
lucas-daiello.jpg   Foto da equipe: Lucas Daiello
netlify.toml        Cabeçalhos de segurança/cache (deploy no Netlify)
robots.txt
```

## Como rodar

Abra `index.html` direto no navegador ou use o Live Server. Para publicar, envie todos os arquivos (Netlify, GitHub Pages etc.).

## Onde editar

- **Textos / idiomas:** `i18n.js` (`dict.pt`, `dict.en`, `legal`). Cada texto do HTML usa `data-i18n="chave"`.
- **Chave Pix:** `pix.js` → `CONFIG.key`.
- **Links do Discord, redes e botões:** `index.html`.
- **Cores / tema:** `style.css` (seção 01).
