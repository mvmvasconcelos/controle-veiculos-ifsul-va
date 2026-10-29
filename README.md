# Controle de Veículos - IFSul Venâncio Aires

Sistema desenvolvido para substituir o registro manual em papel e planilhas na portaria do câmpus IFSul Venâncio Aires, permitindo o acompanhamento em tempo real da frota de veículos oficiais da instituição.

---

## Funcionalidades Principais

### Dashboard Público
- Exibe o status da frota em tempo real (Disponível, Em Trânsito, Indisponível ou Em manutenção), sem expor o motivo de indisponibilidade.
- Mostra quais veículos estão fora do câmpus, com informações sobre o motorista, destino e horário de saída.
- Lista os destinos mais frequentes e estatísticas gerais da frota sem exigir autenticação.

### Painel da Portaria
- Registro rápido de saídas: selecione o veículo, escolha o motorista (ou cadastre um novo na hora) e informe o destino.
- Sugestão automática do odômetro de saída com base no último registro do veículo.
- Alerta visual caso a quilometragem percorrida informada no retorno ultrapasse 2.000 km, prevenindo erros de digitação.
- Registro de retorno com atualização automática da quilometragem atual do veículo.

### Painel Administrativo
- Controle de acesso por permissões (Administrador vs Portaria).
- Gerenciamento completo (cadastro, edição e exclusão) de veículos, motoristas e usuários.
- Alteração do estado dos veículos (Disponível, Em manutenção ou Indisponível, com motivo opcional visível só à Portaria).
- Histórico completo de movimentações com exportação dos dados em formato CSV.

---

## Estrutura Técnica

- Backend: FastAPI (Python 3.11) com SQLAlchemy.
- Banco de Dados: SQLite.
- Frontend: Single Page Application (SPA) em HTML, CSS responsivo (mobile-first) e Javascript nativo.
- Containerização: Docker e Docker Compose.

---

## Como Executar o Projeto

1. Certifique-se de que o Docker e o Docker Compose estão instalados no ambiente.
2. No diretório raiz do projeto, execute o script de inicialização:
   ```bash
   ./start.sh
   ```
3. O serviço estará acessível nos seguintes endereços:
   - Acesso local: http://localhost:8096
   - Acesso em produção (proxy reverso Nginx): https://ifva.duckdns.org/controle-veiculos/

## Testes do frontend

Execute os testes das regras de estado usadas pela Portaria em um container Node isolado:

```bash
docker compose run --rm frontend-tests
```
