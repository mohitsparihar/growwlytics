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
const port = Number(process.env.PORT ?? 3000);
// Always bind all interfaces. Render/K8s set HOSTNAME to an internal pod name — using it for
// listen() would not accept traffic from the platform load balancer (blank page / connection issues).
const bindHost = "0.0.0.0";

const nextApp = next({
  dev: false,
  hostname: bindHost,
  port,
  dir: webDir,
});

const handle = nextApp.getRequestHandler();

await nextApp.prepare();

const server = express();
server.use(createApiApp());
server.all("*", (req, res) => handle(req, res));

server.listen(port, bindHost, () => {
  console.log(`Listening on ${bindHost}:${port} (public URL is your Render hostname)`);
});
