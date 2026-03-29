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

export default app;
