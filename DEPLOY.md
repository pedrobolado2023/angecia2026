# 🚀 Guia de Deploy — Hóspede Club (Frontend e Backend Separados)

Este repositório possui arquitetura segregada entre **Frontend (Next.js)** e **Backend (FastAPI - Python)**. Ambos podem ser implantados de forma totalmente independente e gratuita.

---

## 📌 Visão Geral das Estratégias de Deploy

| Componente | Tecnologias | Hospedagens Recomendadas (Plano Gratuito) |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS | **Vercel** (Recomendado) ou **Render** |
| **Backend** | FastAPI, Python 3.11+, Uvicorn, Omnibees Middleware | **Render** (Recomendado), **Railway** ou **Fly.io** |
| **Containers** | Docker, Docker Compose | Qualquer VPS (DigitalOcean, AWS, GCP, Hetzner) |

---

## 🅰️ Opção 1: Deploy Separado (Vercel para Front + Render para Back) — *Mais Recomendado*

### 1. Deploy do Backend no Render
1. Acesse [render.com](https://render.com) e conecte sua conta do GitHub.
2. Clique em **New +** → **Web Service**.
3. Selecione o repositório `pedrobolado2023/angecia2026`.
4. Configure os campos:
   - **Name:** `hospede-backend`
   - **Root Directory:** `backend` *(MUITO IMPORTANTE)*
   - **Environment:** `Python 3`
   - **Region:** Ohio (US East) ou Oregon (US West)
   - **Branch:** `main`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
5. Em **Environment Variables**, adicione (conforme seu `.env`):
   - `ALLOWED_ORIGINS`: `*` (ou a URL que a Vercel gerar para seu frontend)
   - `OMNIBEES_ENVIRONMENT`: `sandbox` (ou `production`)
   - `OMNIBEES_ENDPOINT_URL`: `https://cert.api.omnibees.com/ota2014b/PullService.svc`
   - `OMNIBEES_REQUESTOR_ID`: sua credencial
   - `OMNIBEES_USERNAME`: seu usuário
   - `OMNIBEES_API_KEY`: sua chave de API
   - `HOSPEDE_ADMIN_PASSCODE`: sua senha de gestor
6. Clique em **Create Web Service**. Ao finalizar, o Render fornecerá a URL pública do seu backend (ex: `https://hospede-backend.onrender.com`).

---

### 2. Deploy do Frontend na Vercel
1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **Add New...** → **Project**.
3. Importe o repositório `pedrobolado2023/angecia2026`.
4. Deixe o **Framework Preset** como `Next.js` e **Root Directory** como `./`.
5. Em **Environment Variables**, adicione:
   - `BACKEND_API_URL`: A URL do seu backend no Render (ex: `https://hospede-backend.onrender.com`)
   - Demais variáveis do `.env.example` necessárias para suas integrações.
6. Clique em **Deploy**.
7. Pronto! A Vercel cuidará das rotas estáticas, SSR e proxy reverso para o backend FastAPI.

---

## 🅱️ Opção 2: Deploy Automático via Blueprint Render (`render.yaml`)

O repositório já inclui o arquivo `render.yaml`. Com ele, o Render sobe os dois serviços de uma vez:

1. No Render, clique em **New +** → **Blueprint**.
2. Conecte o repositório `pedrobolado2023/angecia2026`.
3. O Render detectará automaticamente:
   - O serviço web do **Backend** (em `backend/` com Python).
   - O serviço web do **Frontend** (na raiz com Node/Next.js).
4. Basta clicar em **Apply** e preencher as variáveis secretas solicitadas no painel.

---

## 🅲️ Opção 3: Deploy com Docker Compose (Servidor Próprio / VPS / Local)

Se preferir rodar em uma máquina virtual (VPS) ou testar em ambiente idêntico a produção localmente:

```bash
# Iniciar ambos os serviços em segundo plano
docker compose up -d --build

# Verificar logs
docker compose logs -f

# Acessos:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000 (Swagger docs: http://localhost:8000/docs)
```

---

## 🅳️ Opção 4: Deploy no Easypanel (Frontend e Backend Separados)

O Easypanel roda sobre Docker Swarm / Traefik. No seu projeto do Easypanel, você pode criar **2 Apps separados** (o modo mais flexível) ou um **Compose Service**:

### Método 1: Criando 2 Apps Separados (Recomendado)

#### 1. Backend no Easypanel
1. Dentro do seu Projeto no Easypanel, clique em **+ New Service** → selecione **App**.
2. Dê o nome de `backend`.
3. Na aba **Source**:
   - Tipo: **GitHub** (ou Git)
   - Repository: `pedrobolado2023/angecia2026` (ou a URL completa do Git)
   - Branch: `main`
4. Na aba **Build**:
   - Build Method: selecione **Dockerfile**
   - Context Path: `/backend`
   - Dockerfile Path: `/backend/Dockerfile`
   *(Alternativa com Nixpacks: selecione Nixpacks e coloque Root Directory: `/backend`)*
5. Na aba **Environment**:
   - `PORT`: `8000`
   - `ALLOWED_ORIGINS`: `*` (ou o domínio do seu frontend)
   - `OMNIBEES_ENVIRONMENT`: `sandbox` (ou `production`)
   - `OMNIBEES_ENDPOINT_URL`: `https://cert.api.omnibees.com/ota2014b/PullService.svc`
   - `OMNIBEES_REQUESTOR_ID`: sua credencial
   - `OMNIBEES_USERNAME`: seu usuário
   - `OMNIBEES_API_KEY`: sua chave de API
   - `HOSPEDE_ADMIN_PASSCODE`: sua senha mestra
6. Na aba **Domains**:
   - Adicione o domínio da sua API (ex: `api.seudominio.com`).
   - Container Port: `8000`.
   - O Easypanel gerará o certificado SSL (HTTPS) automaticamente via Let's Encrypt.
7. Clique em **Deploy**.

---

#### 2. Frontend no Easypanel
1. No mesmo Projeto, clique em **+ New Service** → selecione **App**.
2. Dê o nome de `frontend`.
3. Na aba **Source**:
   - Repository: `pedrobolado2023/angecia2026`
   - Branch: `main`
4. Na aba **Build**:
   - Build Method: selecione **Dockerfile** (Context Path: `/` e Dockerfile Path: `/Dockerfile`) OU **Nixpacks** (Root Directory: `/`).
5. Na aba **Environment**:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `BACKEND_API_URL`: `http://backend:8000` (se estiver no mesmo projeto do Easypanel, a comunicação interna pela rede Docker funciona direto pelo nome do serviço!) ou use o domínio público `https://api.seudominio.com`.
6. Na aba **Domains**:
   - Adicione o domínio do seu site (ex: `seudominio.com` ou `app.seudominio.com`).
   - Container Port: `3000`.
7. Clique em **Deploy**.

---

### Método 2: Usando o Compose Service do Easypanel
1. No seu Projeto no Easypanel, clique em **+ New Service** → **Compose**.
2. Conecte ao repositório `pedrobolado2023/angecia2026`.
3. Aponte para o arquivo `docker-compose.yml`.
4. Configure `POSTGRES_PASSWORD` e `DATABASE_URL` antes do deploy. A URL deve usar o host interno `postgres`, o usuário e o banco do serviço. Codifique caracteres especiais da senha na URL.
5. O PostgreSQL fica acessível na rede interna do Compose. Para bancos gerenciados externos, configure `sslmode=verify-full` e a CA do provedor quando necessário. Para o serviço privado do Easypanel, use o endereço interno fornecido em **Credentials**.

---

## 🔒 Segurança Zero-Leak

### Catálogo Hotelbeds no PostgreSQL

O serviço web grava o conteúdo completo dos hotéis consultados no PostgreSQL, incluindo descrições, imagens, facilidades, categorias e quartos. Dados de teste e produção ficam separados. Hotéis ausentes ou com conteúdo vencido são consultados pela operação de detalhes da Content API. Se essa consulta falhar, o último conteúdo salvo continua disponível.

Para ativar a carga inicial do catálogo brasileiro e sua atualização semanal no Easypanel, configure `HOTELBEDS_CATALOG_SYNC_ENABLED=true` no `frontagencia2026`, com `HOTELBEDS_ENVIRONMENT=production`, credenciais Hotelbeds de produção e `DATABASE_URL`. Faça o deploy da branch atual. As tabelas `hotelbeds_catalog` e `hotelbeds_catalog_sync` são criadas automaticamente. A rotina usa a Content API no host `HOTELBEDS_ENDPOINT_URL`, normalmente `https://api.hotelbeds.com` em produção.

O servidor verifica o agendamento a cada minuto e processa até 500 hotéis por etapa. O progresso é salvo junto de cada página e é retomado após reinícios. Um bloqueio no PostgreSQL permite apenas uma etapa simultânea entre réplicas. A próxima carga completa é programada para sete dias após o início da anterior. Hotéis removidos pelo fornecedor são marcados como inativos apenas após a conclusão verificada da carga. A busca por nome passa a consultar o índice persistido quando a primeira carga termina.

No ambiente Hotelbeds de teste, a varredura nacional automática fica desativada para preservar a cota. Os hotéis efetivamente consultados pelo site continuam sendo gravados e reutilizados entre deploys.

No console do serviço web do Easypanel, consulte o progresso sem consumir chamadas da Hotelbeds com `node scripts/hotelbeds-catalog.mjs status`. Para executar uma etapa que já esteja agendada, use `node scripts/hotelbeds-catalog.mjs step`. Esses comandos usam a variável de sessão administrativa já configurada no serviço, `HOSPEDE_ADMIN_SESSION_SECRET`. O endpoint administrativo autenticado é `/api/admin/hotelbeds/catalog`, com GET para status e POST para uma etapa.

Respostas 400, 401, 403 e 404 suspendem as novas tentativas por 24 horas. Outras falhas suspendem por pelo menos 15 minutos, respeitando um `Retry-After` maior de até 24 horas. Os logs mostram o estado e o progresso com o prefixo `[Hotelbeds Catálogo]`. Uma falha mantém os registros anteriores e o ponto de retomada.

### Checkout Mercado Pago e Hotelbeds

- Para habilitar o mTLS de Booking no serviço web, configure `HOTELBEDS_MTLS_ENABLED=true`. O host mTLS é escolhido por `HOTELBEDS_ENVIRONMENT`. Mantenha `HOTELBEDS_ENDPOINT_URL` com o host configurado para a Content API.
- Para o certificado, preencha `HOTELBEDS_MTLS_CERT_PATH` com o caminho visível dentro do contêiner ou `HOTELBEDS_MTLS_CERT_PEM` com seu conteúdo. Para a chave privada, use `HOTELBEDS_MTLS_KEY_PATH` ou `HOTELBEDS_MTLS_KEY_PEM`. Se a chave for criptografada, configure `HOTELBEDS_MTLS_KEY_PASSWORD`. Carregue esses valores em variáveis privadas ou arquivos montados no serviço web.

- Cadastre uma aplicação **Checkout Transparente via Orders** no Mercado Pago. Em homologação, use `CHECKOUT_MODE=test`, `HOTELBEDS_ENVIRONMENT=test`, `MERCADOPAGO_TEST_ACCESS_TOKEN` e `MERCADOPAGO_TEST_PUBLIC_KEY` com as credenciais da aba de teste dessa aplicação. O prefixo `APP_USR-` aparece também em credenciais de teste.
- Em produção, habilite `CHECKOUT_MODE=live` somente com credenciais de produção dos dois provedores e depois de homologar Pix e cartão. Não misture cobrança real com reservas de teste.
- No painel do Mercado Pago, configure o evento **Orders** com a URL HTTPS completa do endpoint `/api/webhooks/payment`. Use o segredo de assinatura da configuração de teste em `MERCADOPAGO_TEST_WEBHOOK_SECRET` e o da configuração de produção em `MERCADOPAGO_WEBHOOK_SECRET`. Em produção, use `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY` da aplicação.
- Acompanhe pedidos pagos sem voucher em `checkout_orders`. O estado `review` exige conciliar o pagamento no Mercado Pago e verificar a reserva na Hotelbeds antes de confirmar ou estornar. Pedidos parados em `confirming` após falha de execução também exigem conciliação. O checkout não tenta uma segunda reserva automaticamente nesses casos.

- Arquivos `.env` e `.env.local` estão estritamente no `.gitignore` e **nunca** vão para o GitHub.
- Todas as credenciais de produção devem ser inseridas exclusivamente no painel da plataforma de hospedagem (Vercel / Render / Railway).
