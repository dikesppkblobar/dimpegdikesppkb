import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  getBaileysStatus, 
  initBaileys, 
  logoutBaileys, 
  sendBaileysMessage 
} from "./server-baileys";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve API routes in both dev and production
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // WhatsApp Gateway status endpoint
  app.get("/api/baileys/status", async (req, res) => {
    try {
      const status = await getBaileysStatus();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to get Baileys status" });
    }
  });

  // WhatsApp Gateway connect / initialize endpoint
  app.post("/api/baileys/connect", async (req, res) => {
    try {
      // Run the initialization in the background so the HTTP response is instantaneous
      initBaileys(true).catch(err => {
        console.error("Background Baileys init error:", err);
      });
      return res.json({ success: true, status: "initializing" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to connect Baileys" });
    }
  });

  // WhatsApp Gateway disconnect / logout endpoint
  app.post("/api/baileys/disconnect", async (req, res) => {
    try {
      await logoutBaileys();
      return res.json({ success: true, status: "disconnected" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to disconnect Baileys" });
    }
  });

  // API Proxy to send WhatsApp messages safely from the server side (bypassing CORS)
  app.post("/api/send-whatsapp", async (req, res) => {
    try {
      const { phone, message, token, account, mode } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ status: false, reason: "Nomor telepon dan pesan harus diisi" });
      }

      // Check if Baileys is connected and we should use it
      const status = await getBaileysStatus();
      const preferBaileys = mode === "baileys" || status.connected;

      if (preferBaileys && status.connected) {
        console.log(`[Proxy] Sending WhatsApp message to ${phone} via Baileys API directly.`);
        try {
          await sendBaileysMessage(phone, message);
          return res.json({ status: true, method: "baileys", message: "Sent via Baileys successfully" });
        } catch (baileysErr: any) {
          console.error("[Proxy] Baileys dispatch failed, falling back to Fonnte:", baileysErr);
          // fall through to Fonnte if specified
        }
      }

      const tokenFonnte = token || 'FaRp7B4ZtDZxFP3Ck2pT';
      const accountToken = account || '142TamsyazYbMtkew74hocBQhh2BdUfF9LfbyKpgJg1S9AuN';

      // Send via urlencoded body (standard and fully trusted by Fonnte)
      const params = new URLSearchParams();
      params.append('target', phone);
      params.append('message', message);
      params.append('countryCode', '62');
      params.append('token', tokenFonnte);
      params.append('account', accountToken);

      console.log(`[Proxy] Sending WhatsApp message to: ${phone} via Fonnte`);

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': tokenFonnte,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      console.log(`[Proxy] Fonnte Response:`, responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (err) {
        return res.status(500).json({
          status: false,
          reason: `Invalid JSON response from Fonnte: ${responseText}`
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({
          status: false,
          reason: result?.reason || result?.message || `Fonnte returned HTTP ${response.status}`
        });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[Proxy] Error routing WhatsApp message:", error);
      return res.status(500).json({
        status: false,
        reason: error.message || "Internal server error during dispatch"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
