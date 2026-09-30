# DBD Overlay Studio — Beta 2.7.0

Rebuild estrutural limpo, baseado no visual/funções aprovados das versões anteriores.

## O que foi refeito
- Estado novo em `settings-v270.json`: sem cadeia de migrações antigas.
- WinStreak e Confronto usam dimensões lógicas fixas + escala real da BrowserWindow/zoom.
- Arrastar/editar posição não altera o layout interno dos overlays.
- Resize pelas quinas altera a escala proporcionalmente.
- Inputs do editor são estáticos: digitar não reconstrói a interface nem perde o cursor.
- PT / EN / ES refeitos para a interface principal.
- Valor da WinStreak usa uma única fonte de verdade; +, -, Reset e Aplicar sincronizam painel e overlay.
- Hotkey de +1 com cooldown de 1 segundo.
- Resetar personalização restaura alinhamento canônico e valor 0, preservando posição e hotkey.
- Tamanho geral da WinStreak e do Confronto agora redimensiona janela + conteúdo juntos.
- Confronto usa base compacta 640×200 (760×200 com Killer), antes da escala.
- Killer preservado como card lateral e escala junto com o Confronto.

## Layouts WinStreak
Mantidos 8: Neon Panel, Score Tab, Round Badge, Arcade Box, Broadcast Bar, Cyber Cut, Elegant e Ribbon Core.
Removidos: Glass Pill e Minimal Line.
Mini Estilo 1/2 usam a mesma geometria do layout principal e iniciam desligados.

## Limpeza
O pacote de runtime contém apenas:
`main.js`, `preload.js`, `app.html`, renderers WinStreak/Confronto/OBS e `killers/`.
Não há pasta de mapas nem arquivos do sistema antigo de detecção.
