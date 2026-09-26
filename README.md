# DBD Overlay Studio — Beta 2.5.2

## Correção crítica
A causa real das overlays invisíveis foi encontrada no empacotamento.

`package.json -> build.files` ainda continha a lista antiga da época do módulo de mapas:
- overlay.html
- map-overlay.html
- control.html
- browser-overlay.html
- maps.js
- maps/**/*

Por isso o electron-builder criava o instalador sem os renderers novos:
- streak.html
- match.html
- obs.html
- obs-streak.html
- obs-match.html

O editor abria porque app.html estava no pacote, mas as janelas transparentes tentavam carregar arquivos que não existiam dentro do aplicativo instalado.

A whitelist foi corrigida e o workflow agora verifica a presença de todos os arquivos de runtime antes de construir o EXE.

Ao abrir:
- WinStreak: ligada
- Confronto: desligado
