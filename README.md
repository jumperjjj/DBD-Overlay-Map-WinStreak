# DBD Overlay Studio — Beta 2.7.1

Base: rebuild limpo 2.7.0.

## WinStreak
- Botão Mostrar overlay maior.
- Mini Estilo 1/2 usam o mesmo botão grande de ativação.
- Botão "Apagar atalho" aparece quando existe atalho configurado.
- Escala preserva a posição da janela (ancorada no canto superior esquerdo).
- Painéis principais ficaram ~3 px menores em cada borda, sem reduzir fonte/número.
- +4 layouts novos: Bracket Edge, Split Blade, Top Rail e Pulse Cut.
- Total: 12 layouts.

## Confronto
- Botão Mostrar overlay usa o mesmo botão grande da WinStreak.
- SET / MAP alinhado às colunas de INFO (cor e texto); Centralizar permanece à direita.
- Card do Killer passa a ter a mesma altura real do overlay.
- Troca esquerda/direita feita por ordem CSS estável, sem mover o DOM.
- Imagem do Killer só recarrega quando o Killer muda, reduzindo piscadas.
- Escala preserva a posição da janela.
- +2 layouts novos: Centerline e Bracket HUD.
- Total: 10 layouts.
