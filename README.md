# DBD Overlay Studio — Beta 2.6.10

## WinStreak
- Renderers restaurados diretamente da Beta 2.6.8.
- Classic Arrow não aparece mais na lista; os 11 layouts restantes apontam para os estilos originais da 2.6.8 sem renumerar/regravar o CSS.
- Record renomeado para Mini Estilo 1.
- Mini Estilo 1: texto, valor, cores, destaque, posição horizontal e vertical.
- Mini Estilo 2: mesma estrutura, desligado por padrão e texto vazio.
- Os mini estilos usam a geometria visual do layout atual, mantendo cores independentes.

## Confronto
- Corrigido o broadcast de alterações ao vivo.
- Sliders de cabeçalho, linhas, espaço, margem, times e placar agora aplicam dimensões diretamente no DOM, além das variáveis CSS.
- Cores separadas e explicitadas: Time A/placar A, Time B/placar B, INFOs, CAMPEONATO, separador ':', SET/MAP e fundo SET/MAP.
- Removidos overrides antigos que faziam texto superior/inferior herdar a cor secundária.
- Botão OK dos seletores de cor reduzido.
- Times continuam em formato compacto.
