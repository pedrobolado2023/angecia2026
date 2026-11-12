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
let authStatus = "initializing"; // "unauthenticated", "waiting_scan", "connected"
let syncProcess = null;

// Garante que o diretório persistente existe
if (!fs.existsSync(STORE_DIR)) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

// Inicia o daemon contínuo de sincronização do WhatsApp
function startSyncDaemon() {
  if (syncProcess) return;
  console.log("[WACLI GATEWAY] Iniciando daemon 'wacli sync --follow'...");
  syncProcess = spawn("wacli", ["sync", "--follow"], {
    env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
  });

  syncProcess.stdout.on("data", (data) => {
    const text = data.toString();
    console.log(`[WACLI DAEMON] ${text.trim()}`);
    if (text.toLowerCase().includes("connected") || text.toLowerCase().includes("syncing")) {
      authStatus = "connected";
      currentQrCode = null;
    }
  });

  syncProcess.stderr.on("data", (data) => {
    const errText = data.toString();
    console.error(`[WACLI DAEMON ERR] ${errText.trim()}`);
    if (errText.toLowerCase().includes("not logged in") || errText.toLowerCase().includes("unauthorized")) {
      authStatus = "unauthenticated";
      triggerAuth();
    }
  });

  syncProcess.on("close", (code) => {
    console.warn(`[WACLI DAEMON] Encerrado com código ${code}. Reiniciando em 5 segundos...`);
    syncProcess = null;
    setTimeout(startSyncDaemon, 5000);
  });
}

// Inicia processo de autenticação para extrair o QR Code
function triggerAuth() {
  if (authStatus === "connected") return;
  console.log("[WACLI GATEWAY] Executando 'wacli auth' para gerar QR Code...");
  const authProc = spawn("wacli", ["auth", "--qr-format", "text"], {
    env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
  });

  authProc.stdout.on("data", async (data) => {
    const str = data.toString().trim();
    if (str.length > 20) {
      currentRawQr = str;
      try {
        currentQrCode = await QRCode.toDataURL(str);
        authStatus = "waiting_scan";
        console.log("[WACLI GATEWAY] Novo QR Code capturado com sucesso!");
      } catch (err) {
        console.error("Erro ao converter QR Code para imagem:", err);
      }
    }
  });

  authProc.on("close", (code) => {
    console.log(`[WACLI AUTH] Processo de autenticação concluído com código ${code}`);
    setTimeout(startSyncDaemon, 1000);
  });
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

// Endpoint de envio de mensagem (chamado pelo Next.js em /api/auth/* e /api/bookings)
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
        timeout: 15000,
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

// Endpoint de Diagnóstico e Saúde
app.get("/status", async (req, res) => {
  try {
    const { stdout } = await execAsync("wacli doctor", {
      env: { ...process.env, WACLI_STORE_DIR: STORE_DIR },
    }).catch((e) => ({ stdout: e.message }));

    res.json({
      status: authStatus,
      daemonActive: Boolean(syncProcess),
      storeDir: STORE_DIR,
      doctor: stdout ? stdout.trim() : "OK",
    });
  } catch (e) {
    res.json({ status: authStatus, error: e.message });
  }
});

// Tela Web Simples & Elegante para Escanear o QR Code no Celular
app.get("/qr", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conectar WhatsApp • Hóspede Club</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0D1217;
          color: #E6EDF3;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .card {
          background: #161F28;
          border: 1px solid #283747;
          border-radius: 20px;
          padding: 32px 24px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        h1 {
          font-size: 20px;
          color: #D4AF37;
          margin: 12px 0 6px 0;
        }
        p {
          font-size: 13px;
          color: #8B98A5;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        .qr-wrapper {
          background: #FFFFFF;
          padding: 16px;
          border-radius: 16px;
          display: inline-block;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .qr-wrapper img {
          display: block;
          width: 250px;
          height: 250px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .connected { background: #123524; color: #4ADE80; border: 1px solid #1C5438; }
        .waiting { background: #3B2A10; color: #FBBF24; border: 1px solid #5C4119; }
        .btn {
          display: inline-block;
          background: #B8863B;
          color: #FFFFFF;
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn:hover { background: #9A6D28; }
      </style>
      <meta http-equiv="refresh" content="7">
    </head>
    <body>
      <div class="card">
        <span class="status-badge ${authStatus === 'connected' ? 'connected' : 'waiting'}">
          ${authStatus === 'connected' ? '✓ WhatsApp Conectado' : 'Aguardando Leitura do QR'}
        </span>
        
        <h1>Hóspede Club • WACLI</h1>
        <p>
          ${authStatus === 'connected' 
            ? 'Seu WhatsApp está autenticado e pronto para disparar confirmações de reservas e códigos VIP!' 
            : 'No seu WhatsApp, toque em <strong>Aparelhos Conectados &rarr; Conectar um Aparelho</strong> e aponte para o QR Code:'}
        </p>

        <div class="qr-wrapper">
          ${
            authStatus === 'connected'
              ? `<div style="width:250px;height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0F5257;">
                   <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0F5257" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                   <span style="font-weight:600;margin-top:12px;font-size:14px;color:#182026;">Sessão Ativa</span>
                 </div>`
              : currentQrCode
              ? `<img src="${currentQrCode}" alt="QR Code WhatsApp WACLI">`
              : `<div style="width:250px;height:250px;display:flex;align-items:center;justify-content:center;color:#666;font-size:12px;">Gerando novo QR Code...</div>`
          }
        </div>

        <div>
          <a href="/qr" class="btn">Atualizar Status</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Inicia o servidor HTTP
app.listen(PORT, () => {
  console.log(`[WACLI GATEWAY] Ouvindo requisições na porta ${PORT}`);
  if (fs.existsSync(path.join(STORE_DIR, "wacli.db"))) {
    console.log("[WACLI GATEWAY] Sessão detectada em /data/store. Iniciando sincronização...");
    startSyncDaemon();
  } else {
    console.log("[WACLI GATEWAY] Sessão não encontrada. Gerando QR Code inicial...");
    triggerAuth();
  }
});
