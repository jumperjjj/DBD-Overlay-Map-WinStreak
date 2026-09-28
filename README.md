# DBD Overlay Studio — Beta 2.6.3

Foco: corrigir Posição e Killer.

## Posição
- Removido o drag dependente de `-webkit-app-region`.
- Drag agora usa pointer capture + IPC, mantendo o modo de edição ativo depois de soltar o mouse.
- WinStreak e Confronto ficam temporariamente visíveis e interativos enquanto o modo Posição está ativado, mesmo se um deles estiver desligado no uso normal.
- As duas overlays usam a mesma implementação de drag.
- Limite do monitor é aplicado durante o movimento.
- Ímã leve de 10 px nas bordas.
- Resize por bordas/quinas continua separado do drag.
- O modo só termina ao Salvar/Bloquear ou trocar de aba.

## Killer
- Corrigida a URL das imagens no renderer desktop: agora usa explicitamente o servidor local `127.0.0.1:17384`.
- Imagem permanece transparente (PNG sem painel atrás).
- Checkbox `Imagem do Killer à esquerda`: marcado = esquerda; desmarcado = direita.
- Campo Nome do Killer usa atualização local + debounce para não perder a digitação durante atualizações de estado.
- Mostrar nome na overlay continua independente da imagem.
