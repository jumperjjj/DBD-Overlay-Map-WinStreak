# Beta 1.1.3
Foco: reduzir CPU e falsos positivos.

- recorte reduzido para a faixa do título no canto inferior esquerdo;
- OCR a cada 2,2 segundos;
- largura processada limitada a 700 px;
- sem upscale pesado da 1.1.2;
- threshold de candidato aumentado para 88%;
- detecção normalmente exige duas leituras consecutivas;
- correspondência quase exata (>=97%) pode confirmar imediatamente;
- mantém timeout e captura nativa do Electron.
