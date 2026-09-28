# DBD Overlay Studio — Beta 2.6.0

## Confronto
- Modo Manual: mantém as 4 linhas de texto livre.
- Modo Automático: operador informa Stages e, opcionalmente, Fresh (1–4).
- Regra automática implementada para desempate por Fresh:
  - 3 Stages + 2 Fresh -> wincon 3 Stages + 3 Fresh
  - 4 Stages + 4 Fresh -> wincon 5 Stages
  - Fresh desligado: wincon = Stages + 1
- Cada rótulo/linha tem uma única cor própria.
- Linhas 1 e 2 começam com cores distintas; linhas 3 e 4 são configuráveis.
- Todas as escolhas de cor usam swatch visual + seletor + botão OK.
- Card do Killer com imagem obrigatória e nome opcional.
- Pasta `killers/` criada para PNG/JPG/JPEG/WEBP.

## Posição
- Entrar na aba Posição já libera drag/resize.
- Pode arrastar repetidamente sem precisar salvar entre movimentos.
- Salvar bloqueia.
- Ao sair da aba, bloqueia.
- Bounds são mantidos dentro do monitor.
- Snap suave de 12 px é aplicado ao final do movimento, sem prender a janela permanentemente.
- Botão Reabrir overlays removido.
