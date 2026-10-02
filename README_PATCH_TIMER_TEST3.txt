DBD Overlay Studio — Beta 2.0.0 — Timer Test 3

PATCH DE TESTE

Principais mudanças:
- Aba Posição removida do painel.
- 1v1 Timer, WinStreak e Confronto agora podem ser movidos diretamente pela própria janela do overlay.
- Cursor branco de quatro setas indica que a janela pode ser arrastada.
- WinStreak inicia desligada; o 1v1 Timer continua sendo a aba inicial do painel.
- Escala do Timer reduzida para 70%–100%.
- F1 e F2 são novamente os atalhos padrão do Timer; Resetar atalho retorna ao padrão.
- Captura de MOUSE3/MOUSE4/MOUSE5 adicionada aos atalhos (hook global no Windows via uiohook-napi).
- 6 estilos do Timer reformulados: 2 verticais, 2 horizontais e 2 Glass.
- SCORE/caixa central removidos das overlays; placar agora é texto simples e maior.
- Nomes dos players permanecem brancos; somente traço + cronômetro do player ativo recebem destaque.
- Player inativo usa branco/cinza; ativo recebe brilho/contorno.
- Arco-íris corrigido para usar o mesmo espectro completo em qualquer player ativo.
- Explicação da troca automática deixa claro que é possível operar a rodada usando apenas o atalho principal.

Substitua os arquivos do patch na raiz do repositório preservando as pastas.
