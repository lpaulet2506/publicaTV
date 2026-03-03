import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // In-memory storage for the active URL
  let activeExcelUrl = process.env.DEFAULT_EXCEL_URL || "";

  // API to get the current active URL
  app.get("/api/config", (req, res) => {
    res.json({ url: activeExcelUrl });
  });

  // API to set the active URL
  app.post("/api/config", (req, res) => {
    const { url } = req.body;
    if (url) {
      activeExcelUrl = url;
      console.log("Nueva URL configurada:", activeExcelUrl);
      res.json({ status: "ok", url: activeExcelUrl });
    } else {
      res.status(400).json({ error: "URL requerida" });
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
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
