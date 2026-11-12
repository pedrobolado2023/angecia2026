# WACLI Gateway (Hóspede Club)

Microserviço Docker pronto para o **Easypanel** que integra o binário oficial [`openclaw/wacli`](https://github.com/openclaw/wacli) ao site do Hóspede Club.

---

## 🚀 Como Instalar no Easypanel (Passo a Passo)

### 1. Criar o Serviço no Easypanel
1. Acesse o seu painel do Easypanel.
2. Dentro do seu Projeto, clique em **+ Service** &rarr; **App**.
3. Defina o nome do serviço como: `hospede-wacli`.

### 2. Configurar a Fonte (Source)
- **Source**: `Git`
- **Repository**: `https://github.com/pedrobolado2023/angecia2026.git` (ou o seu repositório oficial)
- **Branch**: `main`
- **Build Type**: `Dockerfile`
- **Dockerfile Path**: `services/wacli/Dockerfile`

### 3. Configurar Volume Persistente (ESSENCIAL)
*Para que você não precise escanear o QR Code toda vez que o container reiniciar ou atualizar:*
- Vá na aba **Volumes** do serviço `hospede-wacli`.
- Adicionar novo volume:
  - **Mount Path**: `/data`

### 4. Configurar Porta e Domínio
- **Port**: `3001`
- **Domains**: Adicione um domínio ou subdomínio (ex: `wacli.q-aura.com.br`) com SSL ativado.

### 5. Conectar o WhatsApp (Escanear QR Code)
1. Clique em **Deploy** no Easypanel e aguarde o build concluir.
2. Abra a URL do serviço no navegador: `https://wacli.q-aura.com.br/qr` (ou a porta pública do Easypanel).
3. No seu celular, abra o WhatsApp:
   - Vá em **Aparelhos Conectados** &rarr; **Conectar um Aparelho**.
   - Aponte a câmera para o QR Code na tela.
4. O status mudará automaticamente para **✓ WhatsApp Conectado**.

---

## 🔗 Conectar ao Next.js do Hóspede Club

No seu serviço do site principal no Easypanel (`agentesia-frontagencia2026`):

1. Vá na aba **Environment**:
2. Adicione a variável:
   ```env
   WACLI_ENDPOINT="http://hospede-wacli:3001/send"
   ```
   *(Ou a URL pública `https://wacli.q-aura.com.br/send`)*
3. Clique em **Save & Redeploy**.

Pronto! Todas as mensagens de:
- Código de ativação VIP de 6 dígitos;
- Confirmação e emissão de vouchers de reservas;
- Notificações de pagamento aprovado;

serão disparadas automaticamente pelo seu número de WhatsApp corporativo através do `wacli`!

