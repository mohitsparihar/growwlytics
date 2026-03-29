/**
 * Single-process production server: Express API (/api/*, /health) + Next.js (everything else).
 * Use `npm start` after `npm run build`. Render/Railway set PORT automatically.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import next from "next";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createApiApp } = require("./apps/api/dist/create-app.js");

const webDir = path.join(__dirname, "apps", "web");
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const nextApp = next({
  dev: false,
  hostname,
  port,
  dir: webDir,
});

const handle = nextApp.getRequestHandler();

await nextApp.prepare();

const server = express();
server.use(createApiApp());
server.all("*", (req, res) => handle(req, res));

server.listen(port, hostname, () => {
  console.log(`Ready on http://${hostname}:${port}`);
});
