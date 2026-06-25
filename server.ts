import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve API routes in both dev and production
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Proxy to send WhatsApp messages safely from the server side (bypassing CORS)
  app.post("/api/send-whatsapp", async (req, res) => {
    try {
      const { phone, message, token, account } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ status: false, reason: "Nomor telepon dan pesan harus diisi" });
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
