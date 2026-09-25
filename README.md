# DBD Overlay Map & WinStreak — Beta 1.1.1

Correções:
- remove `screenshot-desktop`, eliminando o erro do `screenCapture_1.3.2.bat`;
- usa `desktopCapturer` nativo do Electron;
- OCR focado somente no canto inferior esquerdo, onde o DBD mostra o nome do mapa;
- frequência reduzida para uma tentativa a cada 1,5 s;
- para imediatamente se a captura falhar;
- para ao detectar o mapa ou após 45 s;
- exibe CPU, RAM, capturas e tentativas OCR.

## Teste
Abra o programa antes da Trial. Clique em **Iniciar detecção** pouco antes da tela em que o nome do mapa aparece.
