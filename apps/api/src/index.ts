import { createApiApp } from "./create-app.js";

const app = createApiApp();
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);

const server = app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set API_PORT in .env to a free port.`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

function shutdown(signal: string) {
  console.log(`\nAPI received ${signal}, closing…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
