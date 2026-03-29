import "./load-env.js";
import express from "express";
import cors from "cors";
import creditsRouter from "./routes/credits.js";
import plansRouter from "./routes/plans.js";
import authRouter from "./routes/auth.js";
import instagramRouter from "./routes/instagram.js";

/** Express app with JSON API routes (no listen). Used by the standalone API and the unified web+API server. */
export function createApiApp() {
  const app = express();

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : [process.env.APP_URL ?? "http://localhost:3000"];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no origin) and listed origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/instagram", instagramRouter);

  return app;
}
