# DBD Overlay Studio — Beta 2.6.23

Hotfix da Beta 2.6.22.

- Corrigido erro de inicialização: `_migrated2622` era acessado antes de o estado `S` existir.
- A migração foi movida para dentro de `load()`, depois do carregamento/criação do estado.
- Nenhum layout, posição, cor, tamanho ou configuração visual da 2.6.22 foi alterado neste hotfix.
