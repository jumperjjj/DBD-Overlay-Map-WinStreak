DBD Overlay Studio — Beta 2.0.0 / Timer Test 1
================================================

Este patch é a PRIMEIRA etapa da reformulação geral.
WinStreak e Confronto antigos foram preservados de propósito nesta etapa.
O foco deste patch é testar o novo 1v1 Timer antes de refazer os outros módulos.

ARQUIVOS PARA SUBSTITUIR:
- package.json
- preload.js
- obs.html
- .github/workflows/build-windows.yml

ARQUIVOS NOVOS:
- main-v2.js
- timer-ui.js
- timer.html
- obs-timer.html
- timer-render.js
- timer-render.css

NÃO APAGUE:
- main.js
- app.html
- streak.html
- match.html
- obs-streak.html
- obs-match.html
- assets/
- killers/

O que testar:
1. Abra o app. A aba 1V1 TIMER deve aparecer primeiro.
2. Digite os dois nomes.
3. Selecione P1 ou P2 clicando no card do player.
4. F1 inicia / para / compara e pontua quando os dois tempos estiverem concluídos.
5. F2 troca o player selecionado.
6. Os milissegundos não aparecem, mas são usados internamente para comparar.
7. Teste os 3 presets: Vertical, Horizontal e Glass.
8. Teste opacidade do fundo de 0% a 100%.
9. Teste escala de 50% a 200%.
10. Teste as 5 cores rápidas e a cor personalizada.
11. Ative "Mostrar overlay" e use "Editar posição" para arrastar a janela.
12. OBS continua usando: http://127.0.0.1:17384/overlay

Observação:
O Timer usa internamente a porta local 17385, mas o usuário não precisa adicionar
um segundo link no OBS. O link principal 17384/overlay já inclui o Timer.
