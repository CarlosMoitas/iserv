# iServ — Plataforma SaaS para Prestadores de Serviços

Plataforma multi-tenant moderna para gerenciamento de empresas prestadoras de serviços. Um único código atende eletricistas, barbearias, mecânicos, lava-jatos e qualquer outro tipo de serviço — ativando apenas os módulos necessários.

---

## Estrutura do projeto

```
iserv/
├── backend/          # API Node.js + Express + Prisma
├── frontend/         # React 19 + Vite + Tailwind CSS
├── docker-compose.yml
└── README.md
```

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|---------------|
| Node.js    | 20+           |
| npm        | 10+           |
| Docker     | 24+           |

---

## Como executar localmente

### 1. Subir o banco de dados PostgreSQL

```bash
docker compose up -d
```

Aguarde o container ficar saudável (10–15 s). Verifique:

```bash
docker compose ps
```

### 2. Configurar o backend

As variáveis de ambiente já estão configuradas em `backend/.env` para desenvolvimento local. Para personalizar, edite o arquivo:

```
backend/.env
```

### 3. Criar as tabelas (migração)

```bash
npm run db:migrate --prefix backend
```

Quando solicitado o nome da migração, digite: `initial`

### 4. Popular o banco com dados de demonstração

```bash
npm run db:seed --prefix backend
```

Credenciais criadas:
- **Slug da empresa:** `demo`
- **E-mail:** `admin@demo.com`
- **Senha:** `senha123456`

### 5. Iniciar o backend

```bash
npm run dev --prefix backend
```

API disponível em: **http://localhost:3333**

Verifique com: `curl http://localhost:3333/health`

### 6. Configurar o frontend

```bash
copy frontend\.env.example frontend\.env
```

O arquivo `.env` já aponta para `http://localhost:3333` por padrão.

### 7. Iniciar o frontend

```bash
npm run dev --prefix frontend
```

Aplicação disponível em: **http://localhost:5173**

---

## Scripts disponíveis

### Backend (`/backend`)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento com watch |
| `npm run start` | Inicia em modo produção |
| `npm run db:generate` | Gera o cliente Prisma |
| `npm run db:migrate` | Executa as migrações |
| `npm run db:seed` | Popula o banco com dados demo |

### Frontend (`/frontend`)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Visualiza o build localmente |

---

## API REST

Base URL: `http://localhost:3333`

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Cadastro da empresa + admin |
| POST | `/auth/login` | Login e geração de token JWT |
| POST | `/auth/forgot-password` | Solicitação de recuperação de senha |

Todas as demais rotas exigem o header:
```
Authorization: Bearer <token>
```

### Módulos (padrão REST)

| Recurso | Endpoint |
|---------|----------|
| Clientes | `/clientes` |
| Serviços | `/servicos` |
| Agendamentos | `/agendamentos` |
| Ordens de Serviço | `/ordens-servico` |
| Orçamentos | `/orcamentos` |
| Produtos | `/produtos` |
| Pagamentos | `/pagamentos` |
| Usuários | `/usuarios` |
| Configurações | `/configuracoes` |
| Integrações | `/integracoes` |
| Dashboard | `/dashboard` |

Cada módulo suporta: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`

Parâmetros de listagem: `?page=1&pageSize=20&search=termo`

---

## Multi-Tenant

- Cada empresa é identificada pelo `slug` (ex.: `barbearia-joao`)
- Todos os dados são isolados por `empresa_id`
- O JWT carrega `usuarioId` e `empresaId` — nenhuma rota autenticada acessa dados de outra empresa
- Módulos podem ser habilitados/desabilitados por empresa na tabela `modulos_empresa`

---

## Tecnologias

**Backend:** Node.js · Express 5 · Prisma ORM · PostgreSQL · JWT · bcrypt · Zod

**Frontend:** React 19 · Vite · React Router 7 · Tailwind CSS · Lucide React · React Hook Form · Axios

---

## Módulos disponíveis

| Chave | Descrição |
|-------|-----------|
| `dashboard` | Visão geral e métricas |
| `clientes` | Cadastro e gestão de clientes |
| `agenda` | Agendamentos |
| `ordens-servico` | Ordens de serviço |
| `orcamentos` | Orçamentos |
| `financeiro` | Entradas e saídas financeiras |
| `produtos` | Controle de estoque |
| `relatorios` | Relatórios (em breve) |
| `usuarios` | Gestão de usuários |
| `configuracoes` | Configurações da empresa |
| `integracoes` | Integrações externas |
| `whatsapp` | Integração WhatsApp (em breve) |

---

## Parar o banco de dados

```bash
docker compose down
```

Para remover os dados persistidos:

```bash
docker compose down -v
