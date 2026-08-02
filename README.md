# iServ — Plataforma SaaS para Prestadores de Serviços

Plataforma multi-tenant moderna para gerenciamento de empresas prestadoras de serviços. Um único código atende eletricistas, barbearias, mecânicos, lava-jatos e qualquer outro tipo de serviço — ativando apenas os módulos necessários.

O iServ é composto por **duas experiências completamente separadas**:

| Experiência | Quem acessa | Onde vive o código |
|-------------|-------------|---------------------|
| **PUBLIC** — Cliente Final | Cliente da empresa (não loga no painel) | `sites/<slug-da-empresa>/` (HTML/CSS/JS estático) |
| **PRIVATE** — Empresário | Dono/equipe da empresa, autenticado | `frontend/` (React — painel administrativo) |

---

## Estrutura do projeto

```
iserv/
├── backend/                    # API Node.js + Express + Prisma (compartilhada pelas 2 experiências)
├── frontend/                   # PRIVATE — Painel administrativo (React 19 + Vite + Tailwind)
├── sites/
│   ├── _template/              # PUBLIC — Template neutro de Landing Page (ponto de partida)
│   │   ├── index.html
│   │   └── assets/ (styles.css, site.js)
│   └── soma-contabilidade/     # PUBLIC — Exemplo real de Landing Page (Escritório de Contabilidade)
│       ├── index.html
│       └── assets/ (styles.css, site.js)
├── docker-compose.yml
└── README.md
```

### PUBLIC — Experiência do Cliente Final

Cada empresa cliente do iServ possui sua própria Landing Page em `sites/<slug-da-empresa>/`,
servida como site estático (HTML + Bootstrap + JS vanilla, sem build step). O cliente final:

- Conhece a empresa e visualiza os serviços oferecidos;
- Solicita orçamento e envia mensagens pelo formulário de contato;
- Conversa com o assistente de IA (widget flutuante, hoje um placeholder que já
  captura leads e está pronto para evoluir para atendimento completo);
- Inicia atendimento direto pelo botão flutuante do WhatsApp;
- É direcionado ao painel administrativo apenas através do link "Área do Cliente"
  (que na prática leva o **empresário**, não o cliente final, para o login do iServ).

Toda submissão de formulário/lead chama `POST /public/:slug/leads` da API, que cria
um `Cliente` vinculado à empresa — refletindo automaticamente no painel administrativo.

Para criar a landing page de uma nova empresa, duplique `sites/_template/`, ajuste:
1. As variáveis `--brand-*` em `assets/styles.css` (identidade visual);
2. `EMPRESA_SLUG`, `WHATSAPP_NUMBER` e demais constantes em `assets/site.js`;
3. Os textos e serviços em `index.html`.

### PRIVATE — Experiência do Empresário

Após autenticação (`/login`), o empresário acessa o painel administrativo em `frontend/`,
onde gerencia Clientes, Agenda, Ordens de Serviço, Orçamentos, Financeiro, Produtos,
Usuários, Relatórios, Configurações e Integrações. O layout é mobile-first e responsivo
(sidebar colapsável em desktop, menu overlay em mobile, tabelas convertidas em cards
em telas pequenas — ver `frontend/src/components/ResourceList.jsx`).

---

## Jornada do Cliente Final (PUBLIC)

Toda Landing Page (Soma Contabilidade e o `_template`) guia o cliente final pelos
mesmos 5 passos, apresentados visualmente na seção **"Como funciona"**:

1. **Conheça a empresa** — rola a página e vê serviços/diferenciais.
2. **Fale com a gente** — usa o assistente de IA (widget flutuante), o botão de
   WhatsApp, ou o formulário de contato (seção "Contato").
3. **Agende seu atendimento** — seção **"Agendar"**: formulário com serviço, data
   e turno preferenciais. Ao enviar, os dados são registrados como um `Cliente`
   no iServ via `POST /public/:slug/leads` (aparece automaticamente no painel
   administrativo da empresa).
4. **Receba seu protocolo** — a página gera um protocolo (ex.: `AG-2026-6699`) e
   exibe um botão para copiá-lo. O cliente deve guardá-lo.
5. **Acompanhe tudo** — seção **"Acompanhar"**: o cliente informa o protocolo e
   vê o status, serviço, data/turno e data da solicitação.

**Persistência real (implementado):** o agendamento feito pelo cliente na
Landing Page cria um `Agendamento` de verdade no banco (mesma tabela usada
pela tela "Agenda" do painel administrativo), através de:

- `POST /public/:slug/agendamentos` — cria (ou reaproveita, por e-mail/telefone)
  um `Cliente` e cria um `Agendamento` vinculado a ele. O protocolo retornado
  (ex.: `AG-IDPKC2S2`) é derivado do próprio ID do agendamento no backend —
  não depende de `localStorage`, então funciona em qualquer navegador/dispositivo.
- `GET /public/:slug/agendamentos/:protocolo` — consulta pública do status,
  título, data/hora e data de criação do agendamento.

Isso significa que, assim que o empresário confirma/conclui o atendimento no
painel administrativo (mudando o status do Agendamento), o cliente já vê o
novo status ao consultar o protocolo — sem nenhuma sincronização manual.
Ambas as rotas estão em `backend/src/routes/public.js`.

O widget de **assistente de IA** hoje é um placeholder de conversa guiada que já
captura leads pela mesma rota pública — pronto para ser substituído por uma
integração real de IA que também acione o agendamento automaticamente.


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
