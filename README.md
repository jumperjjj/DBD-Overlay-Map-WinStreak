# DBD Overlay Map & WinStreak — Beta 1.2.0

Primeira beta automática do detector de mapa.

## Arquitetura
- ARMED: sentinela visual, sem OCR.
- OCR: acorda Tesseract apenas quando a região parece conter o título.
- SLEEP: após detectar o mapa, detector fica inativo.

## Desempenho
A sentinela reduz o recorte a apenas 160×36 pixels para análise simples de contraste/bordas.
A verificação-alvo ocorre aproximadamente a cada 3 segundos.
O OCR pesado só é usado numa janela curta de até 9 segundos.

## Importante nesta beta
O rearme após o fim da Trial ainda não tenta inferir menus/configurações. O botão `Forçar nova detecção` existe para diagnóstico. Depois de validarmos o gatilho leve, implementaremos um sinal específico e seguro de nova Trial.
