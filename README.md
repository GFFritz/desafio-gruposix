# Desafio Técnico — Dashboard Analítico | Grupo Six

Dashboard analítico que consome dados de pedidos de uma API externa, processa métricas financeiras e exibe em um painel interativo com gráficos e tabelas.

## Stack

| Camada   | Tecnologia                          |
| -------- | ----------------------------------- |
| Backend  | PHP 8+ / Laravel 10+               |
| Frontend | React 18 + Inertia.js               |
| Estilo   | Tailwind CSS                        |
| Gráficos | Chart.js + react-chartjs-2          |
| Cache    | Redis (driver obrigatório)          |

## Arquitetura

```
app/
 ├── Integrations/
 │    └── OrdersApiClient.php      # Cliente HTTP para a API externa
 │
 ├── DTOs/
 │    └── OrderDTO.php             # Mapeamento e conversão dos dados
 │
 ├── Services/
 │    ├── OrderService.php         # Cache Redis + busca de dados
 │    └── MetricsService.php       # Cálculo de todas as métricas
 │
 └── Http/Controllers/
      └── DashboardController.php  # Orquestração (sem lógica)
```

### Separação de Responsabilidades

- **OrdersApiClient**: Apenas faz a chamada HTTP à API (URL configurável via `ORDERS_API_URL` no `.env`). Sem cache, sem lógica.
- **OrderDTO**: Mapeia os campos necessários do JSON bruto. Converte strings monetárias para float. Fornece helpers para conversão USD/BRL.
- **OrderService**: Implementa o fluxo de cache Redis (verificar → buscar → armazenar → fallback).
- **MetricsService**: Recebe a Collection de DTOs e calcula todas as métricas (básicas, intermediárias e avançadas).
- **DashboardController**: Instancia os services e passa os dados para o Inertia. Zero lógica de cálculo.

## Estratégia de Redis

| Parâmetro | Valor            |
| --------- | ---------------- |
| Driver    | `redis` (predis) |
| TTL       | 600 segundos     |
| Chave     | `orders.raw.v1`  |

**Fluxo:**

1. Verificar se a chave `orders.raw.v1` existe no Redis
2. Se existir → retornar dados do cache
3. Se não existir → chamar a API externa
4. Salvar resposta bruta no Redis com TTL de 600s
5. Mapear para DTOs
6. Se a API falhar → retornar último cache válido

**Regras:**
- A API **nunca** é chamada a cada request
- Cache apenas dos dados brutos, **não** das métricas
- Cache gerenciado no `OrderService`, não no controller nem no ApiClient

## Como Rodar Localmente

### Pré-requisitos

- PHP 8.1+
- Composer
- Node.js 18+
- Redis rodando na porta 6379

### Instalação

```bash
# 1. Clonar o repositório
git clone git@github.com:GFFritz/desafio-gruposix.git
cd desafio-gruposix

# 2. Instalar dependências PHP
composer install

# 3. Instalar dependências JS
npm install

# 4. Copiar e configurar o .env
cp .env.example .env
php artisan key:generate
```

Edite o `.env` e garanta:

```
ORDERS_API_URL=https://dev-crm.ogruposix.com/candidato-teste-pratico-backend-dashboard/test-orders

CACHE_STORE=redis
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Execução

```bash
# Terminal 1 — Backend
php artisan serve

# Terminal 2 — Frontend (Vite dev server)
npm run dev
```

Acesse: [http://localhost:8000](http://localhost:8000)

## Deploy

### Opção 1 — Servidor Tradicional (VPS)

```bash
composer install --optimize-autoloader --no-dev
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Configurar Nginx/Apache apontando para `public/`. Garantir que Redis está instalado e rodando.

### Opção 2 — Docker

Criar `docker-compose.yml` com serviços: `app` (PHP + Laravel), `redis`.

### Métricas Implementadas

**Básicas:** Total de Pedidos, Receita Total (USD/BRL), Pedidos Entregues, Clientes Únicos, Resumo Financeiro, Taxa de Reembolso, Produto Mais Vendido, Tabela de Pedidos.

**Intermediárias:** Top 5 Produtos por Receita, Ticket Médio, Conversão por Forma de Pagamento, Top 10 Cidades.

**Avançadas:** Análise Temporal de Vendas, Produtos com Alta Taxa de Reembolso.
