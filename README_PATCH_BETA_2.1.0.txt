DBD Overlay Studio — Beta 2.1.0 PATCH

- Mantém MD3 como formato padrão em instalações novas.
- Corrige seleção/edição dos nomes: arrastar para selecionar texto não troca o player ativo.
- Agora somente os botões P1/P2 alteram manualmente o player ativo.
- Nomes são atualizados na overlay em tempo real enquanto você digita/apaga.
- Permite nome vazio sem restaurar automaticamente PLAYER 1/PLAYER 2.
- Corrige Center Beam e Glass Ribbon: nome volta a ficar acima do cronômetro.
- De 40% até 0% de opacidade, troca o contorno duro por um glow preto bem leve em nomes, cronômetros e placar para manter legibilidade sem aparência de borda marcada.
- Mantém o safety fix iniciado na 2.0.9: remove a dependência uiohook-napi e os hooks globais nativos de mouse, principal suspeito do falso positivo Wacatac.
- Atualiza nome do artefato/installer para Beta 2.1.0.

IMPORTANTE: builds sem assinatura digital ainda podem receber alerta heurístico do Windows Defender/SmartScreen. Este patch remove o componente nativo de hook global que aumentava esse risco, mas não é possível garantir zero falso positivo sem reputação/assinatura de código.
