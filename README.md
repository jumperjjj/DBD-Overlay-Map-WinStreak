# DBD Overlay Studio — Beta 2.5.0

Refatoração completa da arquitetura.

## Princípios desta build
- WinStreak e Confronto são módulos independentes.
- Cada overlay tem sua própria janela, estado, posição e tamanho.
- Nenhum `transform: scale()` é usado para redimensionar a janela desktop.
- Liga/desliga apenas controla visibilidade; não destrói a janela.
- A aba Posição é a única que libera drag/resize.
- Ao sair da aba Posição, as janelas são bloqueadas.
- Resize usa o comportamento nativo do Windows/Electron, sem polling manual do mouse.
- Snap de 12 px nas bordas; mover para dentro imediatamente libera o snap.
- Uma URL OBS 1920×1080 compõe as duas overlays.

## Confronto
Estrutura inspirada em overlays competitivas: dois times + placar no cabeçalho, até 4 linhas livres de resultado/wincon/informação e rodapé opcional.
Os campos não calculam regras: o operador escreve o que quiser.

8 estilos iniciais e controles de altura, espaçamento, tipografia e cores.

## WinStreak
12 layouts reconstruídos sobre um renderer fluido e estável.
Nome e número têm fonte, tamanho, cor e posição horizontal independentes.
