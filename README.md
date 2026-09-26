# DBD WinStreak & Match Overlay — Beta 2.4.1

Esta build corrige a 2.4.0 e reconstrói a overlay de confronto.

## Mapas
O recurso de mapas continua totalmente removido.

## WinStreak
- Corrigido o double-scale que deformava a overlay.
- O tamanho da janela agora é o tamanho real da overlay; o conteúdo não recebe uma segunda escala.
- Mantidas as personalizações e os 14 estilos.
- Corrigido estilo que ainda tinha fundo hardcoded e ignorava a cor escolhida.

## Confronto / Times
A referência visual é a estrutura de transmissão competitiva: cabeçalho com os dois times e placar, linhas de informações/resultados abaixo e linha inferior opcional. Não é uma cópia da referência.

### Conteúdo livre
Há 4 linhas independentes. Cada linha possui:
- Mostrar/ocultar;
- Rótulo livre;
- Valor livre para o Time A;
- Valor livre para o Time B.

Assim, quem opera a transmissão pode escrever coisas como:
- SURVIVOR RESULT | 7 STAGES - 3F | 6 STAGES - 2F
- KILLER WINCON | 6 STAGES | 7 STAGES
ou qualquer outro texto.

Também há texto livre acima do placar e uma linha inferior opcional.

### Personalização
- nomes e placar dos dois times;
- cores independentes dos times;
- fundo;
- cor das linhas;
- cor principal e secundária do texto;
- altura do cabeçalho;
- altura das linhas;
- altura do rodapé;
- margem interna;
- espaço entre linhas;
- tamanho do nome dos times;
- tamanho do placar;
- tamanho geral e posição pela aba Posição;
- resize pelas bordas/quinas durante a edição.

### 8 estilos iniciais
1. Broadcast Stack
2. Stage Board
3. Compact TV
4. Esports Cut
5. Minimal Result
6. Split Color
7. Glass Match
8. Sharp Arena

## OBS
A URL única 1920x1080 continua exibindo WinStreak, Confronto ou ambos.
O render do Browser Source também foi reconstruído para evitar a escala duplicada.
