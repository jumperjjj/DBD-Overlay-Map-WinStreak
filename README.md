# DBD Overlay Studio — Beta 2.6.8

## WinStreak
- Glow recalibrado: muito mais suave; 1–2% agora é realmente discreto.
- Caixas visuais dos 12 estilos foram compactadas.
- Record movido para baixo/esquerda e passa a herdar a geometria do estilo atual.
- Record mantém cores independentes e ganhou `Destaque` independente.

## Confronto
- Killer corrigido estruturalmente: selecionar uma imagem aumenta a BrowserWindow em 140 px e cria uma baia lateral real, sem reduzir a largura do placar.
- A baia pode ficar à esquerda ou à direita.
- Portrait é absoluto dentro da baia e centralizado verticalmente pela altura real do painel.
- Bordas do cabeçalho são forçadas para Time A à esquerda / Time B à direita.
- Fonte do texto sobre o placar é independente.
- Sliders de altura, linhas, espaço, margem, times e placar foram religados e tiveram alcance ampliado.
- Footer SET / MAP usa altura mínima para não cortar em overlays compactas.
- Minimal e Gradient removidos. Restam 5 estilos: Broadcast, Dark Bar, Split Center, Slanted e Panels.
- Aba Confronto compactada em três colunas na parte Visual.

## Posição
- Sem alterações.
