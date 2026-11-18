# Conta de membro gratuita e administração

## Mudanças e deploy

- A conta de membro não tem mensalidade nem prazo de teste. Cadastros antigos,
  inclusive expirados, são apresentados como `MEMBER`. A mudança mantém os clientes,
  reservas, senhas e a verificação de WhatsApp. Não há migração que exclua cadastros.
- A rota antiga de assinatura retorna 410, não ativa plano nem gera Pix. O modal
  e a função de cobrança simulada foram retirados. Não foi criado sistema de pontos
  ou cupons nesta etapa; essa é uma evolução futura, com regras ainda a definir.
- Sessões administrativas são tokens aleatórios de 256 bits. O banco guarda apenas
  o HMAC do token e a validade de oito horas; logout revoga a sessão no servidor.
  O cookie usa HttpOnly, Secure e SameSite=Strict em produção, com prefixo __Host-.
  Cookies antigos que continham o segredo estático não são mais aceitos.
- Todas as rotas administrativas existentes usam a mesma validação, incluindo CRM,
  campanhas, catálogo e acesso administrativo às reservas. Mutações por cookie
  verificam a origem. Respostas privadas administrativas usam no-store.
- Login permite dez tentativas por origem de IP a cada quinze minutos e cem no total
  nesse período; contadores são persistidos e compartilhados entre réplicas/reinícios.
  As regras de proxy/firewall continuam importantes, especialmente para limitar
  conexões antes de chegarem ao aplicativo e fornecer um IP de origem confiável.
- O CRM administrativo não retorna hash da senha nem código de verificação.

Publicar a branch `codex/checkout-seguro` no serviço frontend `frontagencia2026`.
As tabelas `admin_sessions` e `admin_login_attempts` são criadas automaticamente no
primeiro acesso que precisa delas. O usuário do banco precisa poder criar essas tabelas;
se o banco estiver indisponível, a administração recusa autenticação.

O gestor precisará entrar novamente após o deploy. A senha administrativa atual é
mantida em `HOSPEDE_ADMIN_PASSCODE` (ou aliases já existentes). O segredo privado para
os tokens vem de `HOSPEDE_ADMIN_SESSION_SECRET`; quando ausente, usa o
`CUSTOMER_SESSION_SECRET` já necessário ao login dos clientes. Nenhum segredo foi
alterado ou incluído no repositório.

O cabeçalho privado já usado pelo script de catálogo continua funcionando com
`HOSPEDE_ADMIN_SESSION_SECRET`, nos endpoints que já aceitavam esse mecanismo.
Ele não é um cookie e deve permanecer exclusivamente em integrações do servidor.

## Verificação após deploy

1. Entrar em `/privado` com a senha atual, abrir o CRM e sair. Confirmar que recarregar
   a página após sair pede autenticação novamente.
2. Acessar uma conta antiga que tinha trial expirado: deve aparecer como membro,
   sem proposta de mensalidade ou renovação. Conferir as reservas anteriores.
3. Sem login, histórico e PDF de reservas devem continuar respondendo 401.
4. Não fazer força bruta ou pagamentos reais para testar esses controles na produção.

## O que é necessário para revisar o PostgreSQL real

Não precisa enviar `DATABASE_URL`, senha, chave SSH ou abrir a porta do PostgreSQL.
Pode abrir o terminal já autenticado do Easypanel/VPS, ou executar os comandos e
compartilhar somente os resultados. Não executar `docker inspect` completo, `env`
ou `printenv`, pois podem revelar credenciais.

### 1. Console do frontend, depois deste deploy

```sh
node scripts/check-postgres-security.mjs
```

O script faz uma transação somente de leitura e informa versão, TLS da conexão,
privilégios do usuário da aplicação e, quando permitido, contagens de regras de
autenticação. Não lê dados de hóspedes nem altera configurações ou registros.
Não concede privilégio extra se alguma consulta não estiver disponível.

Esse diagnóstico não valida isolamento de rede, firewall ou backups sozinho.
TLS desligado em conexão interna precisa ser avaliado junto da rede efetiva;
`listen_addresses=*` também não comprova exposição pública por si só.

### 2. Terminal da VPS, fora dos contêineres

```sh
docker ps --format 'table {{.Names}}\t{{.Ports}}'
docker service ls --format 'table {{.Name}}\t{{.Ports}}'
ss -lnt
```

O segundo comando se aplica a instalações com Docker Swarm, como as usadas pelo
Easypanel. Compartilhar essas saídas permite identificar portas publicadas e portas
em escuta; ainda precisamos da configuração do firewall/provedor para concluir.

Informar também a data do último backup bem-sucedido, onde é armazenado (sem link
secreto) e se já houve teste de restauração em banco separado. Um teste de restauração
deve usar um banco descartável, nunca sobrescrever o banco do site.

## Validação local realizada

```powershell
node scripts/test-hotelbeds-certification.cjs
node scripts/test-member-admin.cjs
npm run build
```

O segundo teste usa PostgreSQL descartável PGlite, sem banco/credenciais de produção.
Para prepará-lo fora do projeto no Windows:

```powershell
npm install --prefix "$env:TEMP/hospede-security-test" --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.16
```

Também aceita `PGLITE_TEST_MODULE` apontando para uma instalação local do pacote.
Não é dependência do servidor nem muda o package-lock do aplicativo.

## Pendências mantidas

Limitação de abuso da busca pública Hotelbeds, CSP compatível com checkout e auditoria
de exposição/configuração da VPS continuam pendentes. A troca das credenciais ficou
para a entrada em produção, conforme a decisão do responsável. Não afirmar que a
segurança integral do site foi concluída apenas por este deploy.

Referências: [cookies seguros](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
e [regras PostgreSQL](https://www.postgresql.org/docs/current/view-pg-hba-file-rules.html).
