# Beta 1.2.1

Objetivo: detector automático mais clean e de baixo impacto.

- não exige clique para iniciar;
- sentinela solicita uma captura reduzida de 640 px de largura já na origem;
- análise barata em apenas 150x42 pixels;
- sentinela roda a cada 2,5 s;
- OCR usa captura de 960 px somente numa janela curta quando há gatilho visual;
- após detectar o mapa, dorme por 90 s;
- rearma automaticamente depois do descanso, sem tentar interpretar pause/settings como fim da Trial;
- interface principal simplificada; diagnóstico fica recolhido.

Nesta beta o rearme de 90 s é deliberadamente conservador. Ele evita depender de uma transição visual genérica, que poderia confundir Settings com fim da partida. O objetivo do teste é validar detecção automática repetida e consumo.
