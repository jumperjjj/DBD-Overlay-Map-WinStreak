# DBD Overlay Studio — Beta 2.6.24

Patch de estabilidade e controles.

- Valor da WinStreak agora usa uma ação dedicada: +, -, Reset e Aplicar atualizam o estado numericamente.
- Resetar personalização também zera a WinStreak e restaura alinhamento/escala padrão.
- Definir atalho agora captura a tecla/combinação diretamente; não usa mais prompt.
- Escala das janelas locais agora é aplicada pelo Electron (zoomFactor), não apenas por CSS.
- OBS continua recebendo a escala correspondente via CSS.
- Barra da WinStreak: 60–140%, com 100% exatamente no meio.
- Confronto reduzido para base 700x210; escala 60–130%, padrão 100%.
- Barras de escala e brilho do Confronto foram encurtadas visualmente.
- Caixa/imagem do Killer não foi redesenhada.
- Migrações agora são persistidas/carregadas corretamente para não reaplicar correções antigas a cada abertura.
