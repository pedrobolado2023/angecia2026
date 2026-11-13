const express = require("express");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.WACLI_API_KEY || process.env.WACLI_TOKEN || "";
const STORE_DIR = process.env.WACLI_STORE_DIR || "/data/store";

let currentQrCode = null;
let currentRawQr = null;
let qrTimestamp = 0;
let authStatus = "initializing"; // "unauthenticated", "waiting_scan", "connected"
let linkedJid = null;
let activeAuthProc = null;

// Garante que o diretório persistente existe
if (!fs.existsSync(STORE_DIR)) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

// Mata processo de autenticação ativo se existir
function killActiveAuth() {
  if (activeAuthProc) {
    try {
      activeAuthProc.kill("SIGTERM");
    } catch {
      // ignore
    }
    activeAuthProc = null;
  }
}

// Inicia processo de autenticação para extrair o QR Code
function triggerAuth(force = false) {
  if (authStatus === "connected" && !force) return;
  if (activeAuthProc && !force) return;

  killActiveAuth();
  console.log("[WACLI GATEWAY] Executando 'wacli auth --qr-format text'...");

  try {
    activeAuthProc = spawn("wacli", ["auth", "--qr-format", "text"], {
      env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
    });

    const handleData = async (data) => {
      const text = data.toString().trim();
      console.log(`[WACLI AUTH STDOUT/STDERR] ${text.slice(0, 80)}`);

      // Se o wacli enviar o código bruto do QR (geralmente formato '2@...'):
      if (text.length > 15 && !text.includes("error") && !text.includes("Error")) {
        currentRawQr = text;
        try {
          currentQrCode = await QRCode.toDataURL(text, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 280,
          });
          qrTimestamp = Date.now();
          authStatus = "waiting_scan";
          console.log("[WACLI GATEWAY] Novo QR Code capturado e convertido com sucesso!");
        } catch (err) {
          console.error("[WACLI GATEWAY] Erro ao converter QR para imagem:", err);
        }
      }
    };

    activeAuthProc.stdout.on("data", handleData);
    activeAuthProc.stderr.on("data", handleData);

    activeAuthProc.on("close", (code) => {
      console.log(`[WACLI AUTH] Processo finalizado com código ${code}`);
      activeAuthProc = null;
      checkAuthStatus();
    });

    activeAuthProc.on("error", (err) => {
      console.error("[WACLI AUTH ERROR]", err);
      activeAuthProc = null;
    });
  } catch (e) {
    console.error("[WACLI TRIGGER AUTH ERROR]", e);
    activeAuthProc = null;
  }
}

// Verifica status real diretamente via wacli doctor
async function checkAuthStatus() {
  try {
    const { stdout, stderr } = await execAsync("wacli doctor", {
      env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
      timeout: 8000,
    }).catch((e) => ({ stdout: "", stderr: e.message }));

    const doc = (stdout || stderr || "").trim();
    if (doc.includes("AUTHENTICATED     true") || doc.includes("AUTHENTICATED: true")) {
      authStatus = "connected";
      currentQrCode = null;
      killActiveAuth();

      const jidMatch = doc.match(/LINKED_JID\s+([^\s]+)/);
      if (jidMatch) {
        linkedJid = jidMatch[1];
      }
      return { isAuthenticated: true, doc, linkedJid };
    }

    authStatus = "waiting_scan";
    linkedJid = null;
    return { isAuthenticated: false, doc, linkedJid: null };
  } catch {
    return { isAuthenticated: false, doc: "", linkedJid: null };
  }
}

// Middleware de validação do Bearer Token
function authMiddleware(req, res, next) {
  if (!API_SECRET) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized. Token WACLI inválido." });
  }
  next();
}

// Endpoint de Envio de Mensagens
app.post("/send", authMiddleware, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Parâmetros 'to' e 'message' são obrigatórios." });
  }

  const cleanPhone = to.replace(/\D/g, "");
  const target = cleanPhone.includes("@") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

  try {
    console.log(`[WACLI SEND] Disparando WhatsApp para ${target}...`);
    const { stdout, stderr } = await execAsync(
      `wacli send text --to "${target}" --message "${message.replace(/"/g, '\\"')}"`,
      {
        env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
        timeout: 25000,
      }
    );

    return res.json({
      success: true,
      messageId: `WACLI-${Date.now()}`,
      output: (stdout || stderr || "").trim(),
    });
  } catch (err) {
    console.error("[WACLI SEND ERROR]", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Endpoint JSON para polling dinâmico do QR Code no Frontend
app.get("/api/qr", async (req, res) => {
  const force = req.query.force === "true" || req.query.force === "1";
  const authInfo = await checkAuthStatus();

  if (authInfo.isAuthenticated) {
    return res.json({
      authenticated: true,
      linkedJid: authInfo.linkedJid,
      status: "connected",
      qr: null,
    });
  }

  // Se o QR estiver ausente ou expirado (> 45s) ou forçado:
  const isExpired = !currentQrCode || Date.now() - qrTimestamp > 45000;
  if ((isExpired || force) && !activeAuthProc) {
    triggerAuth(true);
  }

  return res.json({
    authenticated: false,
    linkedJid: null,
    status: authStatus,
    qr: currentQrCode,
    timestamp: qrTimestamp,
  });
});

// Endpoint de Pareamento via Código de Telefone (8 dígitos no celular)
app.post("/pair", async (req, res) => {
  const rawPhone = (req.body.phone || "").replace(/\D/g, "");
  if (!rawPhone || rawPhone.length < 10) {
    return res.status(400).json({
      error: "Informe um telefone válido com DDD (ex: 62993473656 ou 5562993473656)",
    });
  }

  killActiveAuth();

  const formattedPhone = rawPhone.startsWith("55") ? `+${rawPhone}` : `+55${rawPhone}`;

  try {
    console.log(`[WACLI PAIR] Solicitando pareamento por código para ${formattedPhone}...`);
    const { stdout, stderr } = await execAsync(
      `wacli auth --phone "${formattedPhone}"`,
      {
        env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
        timeout: 30000,
      }
    );

    const output = (stdout || stderr || "").trim();
    console.log(`[WACLI PAIR RESPOSTA] ${output}`);
    return res.json({ success: true, code: output });
  } catch (err) {
    console.error("[WACLI PAIR ERROR]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint de Reset / Logout / Limpeza de Sessão
app.get("/reset", async (req, res) => {
  killActiveAuth();
  currentQrCode = null;
  authStatus = "initializing";

  try {
    await execAsync("wacli auth logout", {
      env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
      timeout: 10000,
    }).catch(() => {});
  } catch {
    // ignore
  }

  triggerAuth(true);
  res.redirect("/qr");
});

// Endpoint de Diagnóstico e Saúde
app.get("/status", async (req, res) => {
  try {
    const authInfo = await checkAuthStatus();
    const versionCheck = await execAsync("wacli --version", {
      env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
    }).catch((e) => ({ stdout: "", stderr: e.message }));

    res.json({
      status: authStatus,
      authenticated: authInfo.isAuthenticated,
      linkedJid: authInfo.linkedJid,
      storeDir: STORE_DIR,
      wacliVersion: (versionCheck.stdout || versionCheck.stderr || "").trim(),
      doctor: authInfo.doc,
      hasQr: Boolean(currentQrCode),
      qrAgeSeconds: qrTimestamp ? Math.floor((Date.now() - qrTimestamp) / 1000) : null,
    });
  } catch (e) {
    res.json({ status: authStatus, error: e.message });
  }
});

// Tela Web Simples & Elegante para Escanear o QR Code no Celular
app.get("/qr", async (req, res) => {
  const authInfo = await checkAuthStatus();
  if (!authInfo.isAuthenticated && !currentQrCode && !activeAuthProc) {
    triggerAuth();
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conectar WhatsApp • Hóspede Club</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0B0F13;
          color: #E6EDF3;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px 16px;
        }
        .card {
          background: #141C24;
          border: 1px solid #23313F;
          border-radius: 24px;
          padding: 36px 28px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6);
        }
        h1 {
          font-size: 22px;
          color: #D4AF37;
          margin: 14px 0 8px 0;
          letter-spacing: -0.02em;
        }
        p {
          font-size: 13px;
          color: #8B98A5;
          margin: 0 0 24px 0;
          line-height: 1.6;
        }
        .qr-wrapper {
          background: #FFFFFF;
          padding: 16px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.35);
          min-width: 280px;
          min-height: 280px;
          position: relative;
        }
        .qr-wrapper img {
          display: block;
          width: 280px;
          height: 280px;
          border-radius: 8px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .connected { background: #123524; color: #4ADE80; border: 1px solid #1C5438; }
        .waiting { background: #3B2A10; color: #FBBF24; border: 1px solid #5C4119; }
        .btn-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 6px;
        }
        .btn {
          display: inline-block;
          background: #B8863B;
          color: #FFFFFF;
          padding: 11px 22px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover { background: #9A6D28; transform: translateY(-1px); }
        .btn-outline {
          background: transparent;
          border: 1px solid #334455;
          color: #8B98A5;
        }
        .btn-outline:hover {
          background: #1C2733;
          color: #FFF;
          border-color: #556677;
        }
        .pair-section {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid #23313F;
          text-align: left;
        }
        .pair-section h2 {
          font-size: 12px;
          color: #D4AF37;
          margin: 0 0 6px 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .spinner {
          border: 3px solid #E2D9C8;
          border-top: 3px solid #B8863B;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="card">
        <span id="statusBadge" class="status-badge ${authInfo.isAuthenticated ? 'connected' : 'waiting'}">
          ${authInfo.isAuthenticated ? '✓ WhatsApp Conectado' : 'Aguardando Leitura do QR'}
        </span>
        
        <h1>Hóspede Club • WACLI</h1>
        <p id="statusDesc">
          ${authInfo.isAuthenticated 
            ? 'Seu WhatsApp (' + (authInfo.linkedJid ? '+' + authInfo.linkedJid.replace('@s.whatsapp.net', '') : 'Conectado') + ') está autenticado e pronto para disparar confirmações de reservas e códigos VIP!' 
            : 'No seu WhatsApp, toque em <strong>Configurações &rarr; Aparelhos Conectados &rarr; Conectar um Aparelho</strong> e aponte a câmera:'}
        </p>

        <div class="qr-wrapper" id="qrContainer">
          ${
            authInfo.isAuthenticated
              ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4ADE80;padding:24px;">
                   <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                   <span style="font-weight:700;margin-top:14px;font-size:16px;color:#FFFFFF;">Sessão Ativa & Pronta</span>
                   <span style="font-size:12px;color:#8B98A5;margin-top:4px;">Disparos automáticos operacionais</span>
                 </div>`
              : currentQrCode
              ? `<img id="qrImg" src="${currentQrCode}" alt="QR Code WhatsApp WACLI">`
              : `<div id="loadingQr" style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8B98A5;font-size:12px;">
                   <div class="spinner"></div>
                   <span>Gerando novo QR Code...</span>
                 </div>`
          }
        </div>

        <div class="btn-group">
          <button type="button" onclick="refreshQr(true)" class="btn">🔄 Atualizar QR Code</button>
          <a href="/reset" class="btn btn-outline" onclick="return confirm('Deseja realmente desconectar e reiniciar a sessão do WhatsApp?');">Desconectar</a>
        </div>

        <div class="pair-section" id="pairSection" style="${authInfo.isAuthenticated ? 'display:none;' : ''}">
          <h2>Alternativa: Conectar com Número de Telefone</h2>
          <p style="font-size:11px;color:#8B98A5;margin:0 0 12px 0;">Se a câmera não ler, digite o número do WhatsApp da agência para gerar um código de 8 dígitos:</p>
          <form onsubmit="event.preventDefault(); pairPhone();" style="display:flex;gap:8px;">
            <input id="phoneInput" type="text" placeholder="Ex: 62993473656" style="flex:1;background:#0B0F12;border:1px solid #334455;color:#FFF;padding:10px 12px;border-radius:10px;font-size:12px;outline:none;">
            <button type="submit" id="pairBtn" class="btn" style="padding:10px 16px;font-size:12px;">Gerar Código</button>
          </form>
          <div id="pairResult" style="margin-top:12px;"></div>
        </div>
      </div>

      <script>
        // Polling contínuo automático a cada 2.5 segundos
        let isConnected = ${authInfo.isAuthenticated ? 'true' : 'false'};

        async function checkStatus() {
          if (isConnected) return;
          try {
            const res = await fetch('/api/qr');
            const data = await res.json();

            if (data.authenticated) {
              isConnected = true;
              document.getElementById('statusBadge').className = 'status-badge connected';
              document.getElementById('statusBadge').innerText = '✓ WhatsApp Conectado';
              document.getElementById('statusDesc').innerHTML = 'Seu WhatsApp (' + (data.linkedJid ? '+' + data.linkedJid.replace('@s.whatsapp.net', '') : 'Conectado') + ') foi autenticado com sucesso!';
              document.getElementById('qrContainer').innerHTML = 
                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4ADE80;padding:24px;">' +
                '<svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' +
                '<span style="font-weight:700;margin-top:14px;font-size:16px;color:#FFFFFF;">Sessão Ativa & Pronta</span>' +
                '<span style="font-size:12px;color:#8B98A5;margin-top:4px;">Disparos automáticos operacionais</span>' +
                '</div>';
              document.getElementById('pairSection').style.display = 'none';
              return;
            }

            if (data.qr) {
              const container = document.getElementById('qrContainer');
              let img = document.getElementById('qrImg');
              if (!img) {
                container.innerHTML = '<img id="qrImg" src="' + data.qr + '" alt="QR Code WhatsApp WACLI">';
              } else if (img.src !== data.qr) {
                img.src = data.qr;
              }
            }
          } catch (e) {
            console.warn('Erro ao checar status:', e);
          }
        }

        async function refreshQr(force) {
          const container = document.getElementById('qrContainer');
          container.innerHTML = 
            '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8B98A5;font-size:12px;">' +
            '<div class="spinner"></div>' +
            '<span>Solicitando novo QR Code ao WhatsApp...</span>' +
            '</div>';
          try {
            await fetch('/api/qr?force=' + (force ? 'true' : 'false'));
            setTimeout(checkStatus, 1500);
          } catch(e) {
            console.error(e);
          }
        }

        async function pairPhone() {
          const phone = document.getElementById('phoneInput').value;
          const resDiv = document.getElementById('pairResult');
          const btn = document.getElementById('pairBtn');
          if (!phone) return;

          btn.disabled = true;
          btn.innerText = 'Aguarde...';
          resDiv.innerHTML = '<span style="font-size:12px;color:#FBBF24;">Solicitando código de pareamento...</span>';

          try {
            const res = await fetch('/pair', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone })
            });
            const data = await res.json();
            if (data.success) {
              resDiv.innerHTML = 
                '<div style="background:#1B2631;border:1px solid #B8863B;border-radius:12px;padding:14px;text-align:center;">' +
                '<span style="font-size:11px;color:#8B98A5;text-transform:uppercase;letter-spacing:0.06em;">Código de Pareamento</span><br>' +
                '<strong style="font-size:24px;letter-spacing:4px;color:#FBBF24;display:inline-block;margin:8px 0;">' + data.code + '</strong><br>' +
                '<span style="font-size:11px;color:#E6EDF3;">No seu celular: toque na notificação do WhatsApp ou vá em <strong>Aparelhos Conectados &rarr; Conectar com número de telefone</strong> e digite o código acima.</span>' +
                '</div>';
            } else {
              resDiv.innerHTML = '<span style="font-size:12px;color:#F87171;">Erro: ' + (data.error || 'Falha ao solicitar código') + '</span>';
            }
          } catch(e) {
            resDiv.innerHTML = '<span style="font-size:12px;color:#F87171;">Erro de conexão: ' + e.message + '</span>';
          } finally {
            btn.disabled = false;
            btn.innerText = 'Gerar Código';
          }
        }

        setInterval(checkStatus, 2500);
      </script>
    </body>
    </html>
  `);
});

// Inicialização do Servidor HTTP
app.listen(PORT, () => {
  console.log(`[WACLI GATEWAY] Servidor ativo e ouvindo requisições na porta ${PORT}`);
  checkAuthStatus().then((info) => {
    if (info.isAuthenticated) {
      console.log(`[WACLI GATEWAY] Sessão autenticada ativa detectada para: ${info.linkedJid}`);
    } else {
      console.log("[WACLI GATEWAY] Sessão não autenticada. Gerando QR Code inicial...");
      triggerAuth();
    }
  });
});
