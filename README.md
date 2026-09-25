# DBD Overlay Map / WinStreak

## Map Detector — Beta 1.0.0

Esta primeira beta existe para testar se a versão atual do Dead by Daylight expõe informação suficiente no log local para identificarmos automaticamente o mapa da partida.

### Segurança da prova de conceito

A beta:
- lê somente o arquivo local `DeadByDaylight.log`;
- não injeta DLL no jogo;
- não lê memória do processo;
- não altera arquivos do Dead by Daylight.

## Como gerar o EXE pelo GitHub

1. Extraia este ZIP.
2. Abra seu repositório `DBD-Overlay-Map-WinStreak` no GitHub.
3. Envie **o conteúdo desta pasta** para a raiz do repositório, inclusive a pasta `.github`.
4. Faça o commit.
5. Abra a aba **Actions**.
6. Aguarde `Build Windows EXE` terminar.
7. Abra a execução concluída.
8. Em **Artifacts**, baixe `DBD-Map-Detector-Beta-1.0.0`.
9. Extraia o artifact e execute o instalador `.exe`.

## Como testar

1. Abra o DBD Map Detector.
2. Abra o Dead by Daylight.
3. Clique em `Nova captura` antes de entrar na partida.
4. Entre em uma partida pública.
5. Espere o mapa carregar.
6. Veja se aparece algo em `Mapa / candidato`.
7. Depois clique em `Exportar diagnóstico`.
8. Se a detecção não estiver correta, envie o TXT gerado para análise.

O arquivo monitorado normalmente é:

`%LOCALAPPDATA%\DeadByDaylight\Saved\Logs\DeadByDaylight.log`

Esta beta é deliberadamente diagnóstica. O próximo passo será mapear os identificadores reais encontrados no teste para os nomes dos mapas ou, se necessário, usar reconhecimento de tela.
