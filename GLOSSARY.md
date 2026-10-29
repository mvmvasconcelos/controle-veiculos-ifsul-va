# Gestão de Veículos

Este contexto acompanha a disponibilidade dos veículos e suas viagens, da saída ao retorno.

## Disponibilidade do veículo e andamento da viagem

**Disponível**:
Veículo elegível para uma nova saída.

**Indisponível**:
Veículo temporariamente bloqueado para novas saídas por um motivo diferente de manutenção. O bloqueio pode ser definido durante uma viagem ativa e permanece após o retorno; o motivo é opcional e, quando informado, fica visível à Portaria.

**Em manutenção**:
Veículo temporariamente retirado do uso regular para receber manutenção. ADMIN registra esse estado; se houver uma movimentação ativa, ela permanece aberta e o retorno registrado torna o veículo disponível novamente.

**Em Trânsito**:
Movimentação iniciada por uma saída e ainda não encerrada por um retorno. Pode coexistir com um bloqueio de indisponibilidade para a próxima saída.
