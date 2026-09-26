# DBD Overlay Studio — Beta 2.5.1

Build focada no bug em que as overlays não apareciam.

## Correção principal
As janelas transparentes agora são criadas ocultas e só são exibidas depois de o renderer emitir `did-finish-load`.
Antes, a aplicação chamava show/hide imediatamente após `loadFile()`, sem sincronizar a visibilidade com o término real do carregamento da janela.

## Estado ao iniciar
Toda vez que o aplicativo abre:
- WinStreak: LIGADA
- Confronto: DESLIGADO

O botão do Confronto continua podendo ligá-lo normalmente depois.

## Recuperação
A aba Posição agora possui `Reabrir overlays`. O botão destrói somente as duas janelas transparentes e as recria com o estado atual, sem fechar o editor.

## Arquitetura mantida
WinStreak e Confronto continuam independentes, sem mapas e sem transform de escala duplicada.
