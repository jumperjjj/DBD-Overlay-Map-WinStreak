# DBD Overlay Map & WinStreak — Beta 1.0.2

Esta beta diagnostica os bytes brutos do `DeadByDaylight.log` em vez de assumir UTF-8.

O teste anterior mostrou alta quantidade de dados ilegíveis. Esta versão mede:
- percentual de bytes imprimíveis;
- bytes nulos;
- entropia;
- primeiros bytes (magic);
- prévia ASCII sanitizada.

Ela limita a quantidade salva no diagnóstico e não tenta descriptografar, injetar código ou ler memória do jogo.

## Teste
Abra o programa, clique em Nova captura, deixe o DBD gerar novos dados por 10–20 segundos e exporte o diagnóstico.
