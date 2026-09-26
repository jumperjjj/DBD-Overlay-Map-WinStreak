# DBD Overlay Map & WinStreak — Beta 2.0.0

Nova base do aplicativo. OCR/detecção automática foi removido do fluxo normal.

## WinStreak
- overlay transparente e always-on-top;
- click-through no modo normal;
- nome e valor personalizáveis;
- fonte, cores e escala;
- 10 estilos;
- posição e tamanho ajustáveis;
- configurações persistentes.

## Mapas
- seleção manual pesquisável;
- overlay de mapa independente;
- imagem local selecionável;
- posição e tamanho independentes.

## Botão local ⌖
Janela separada de 34x34 no canto superior esquerdo.
Abre diretamente a aba Mapas.
No Windows recebe `setContentProtection(true)` para tentar excluí-la da captura enquanto as overlays continuam capturáveis.
Isso precisa ser validado com a fonte/método usado no OBS; diferentes APIs de captura podem se comportar de modo diferente.

## Performance
Não há OCR, screenshot polling ou detector visual nesta versão. As overlays são páginas transparentes estáticas atualizadas apenas quando as configurações mudam.
