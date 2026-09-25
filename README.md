# DBD Overlay Map & WinStreak — Beta 1.0.1

Beta diagnóstica para descobrir como a versão atual do Dead by Daylight registra o carregamento da Trial/mapa.

## Mudanças da 1.0.1
- Novo nome: DBD Overlay Map & WinStreak.
- Corrigido o diagnóstico gigantesco da 1.0.0.
- A captura começa no fim do log e lê somente eventos novos.
- O TXT exportado guarda no máximo 4.000 linhas relevantes.
- Também guarda amostras periódicas para encontrar eventos que não usam palavras óbvias como "map".
- Contadores de linhas, dados lidos, eventos relevantes e amostras.
- Workflow já inclui `--publish never`.

## Atualização no GitHub
Substitua `package.json`, `main.js`, `preload.js`, `index.html` e `.github/workflows/build-windows.yml` pelos arquivos desta versão. Faça commit na `main`. O Actions gerará o artifact `DBD-Overlay-Map-WinStreak-Beta-1.0.1`.

## Teste
1. Abra o programa.
2. Abra o DBD.
3. Clique em `Nova captura` pouco antes de entrar/procurar a partida.
4. Entre na Trial e espere 20–30 segundos após poder se mover.
5. Clique em `Exportar diagnóstico compacto`.
6. Envie o TXT gerado para análise.
