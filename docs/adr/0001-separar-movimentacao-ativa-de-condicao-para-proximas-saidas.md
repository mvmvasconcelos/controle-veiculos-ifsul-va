# Separar movimentação ativa da condição para próximas saídas

Uma viagem aberta (**Em Trânsito**) e a condição do veículo para novas saídas (**Disponível**, **Indisponível**, **Em manutenção**) são conceitos independentes. Antes, o status único do veículo era sobrescrito ao sair e ao retornar, o que apagaria bloqueios definidos pelo ADMIN durante uma viagem.

## Decisão

- A movimentação aberta é a fonte de verdade para "Em Trânsito"; o Dashboard conta movimentações abertas separadamente dos estados, e os totais podem se sobrepor.
- **Indisponível** e **Em manutenção** podem ser definidos enquanto há movimentação aberta. A viagem continua visível e retornável.
- O retorno torna o veículo Disponível, exceto se estiver Indisponível: esse bloqueio só sai por ação do ADMIN, que escolhe Disponível ou Em manutenção. Exclusão de uma movimentação aberta libera apenas o estado Em Trânsito.
- Se o ADMIN escolher Disponível com viagem aberta, o veículo permanece Em Trânsito até o retorno; nenhuma nova saída é aceita enquanto houver movimentação aberta.
- Não existe fase "a caminho da oficina": a ida usa uma movimentação normal com destino em texto livre.
- O motivo de Indisponível é opcional, restrito à Portaria/ADMIN (nunca no Dashboard público) e descartado ao sair do estado.

## Consequências

- O status do veículo deixa de ser derivável apenas de seu valor armazenado quando há viagem aberta; telas devem combinar estado e movimentação.
- Nova coluna do motivo adicionada de forma compatível com bancos existentes, sem migração destrutiva.
