import "dotenv/config";
import express from "express";
import cors from "cors";
import creditsRouter from "./routes/credits.js";
import plansRouter from "./routes/plans.js";
import authRouter from "./routes/auth.js";
import instagramRouter from "./routes/instagram.js";

const app = express();
const PORT = process.env.API_PORT ?? 4000;

app.use(cors({ origin: process.env.APP_URL ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/credits", creditsRouter);
app.use("/api/plans", plansRouter);
app.use("/api/instagram", instagramRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

export default app;
