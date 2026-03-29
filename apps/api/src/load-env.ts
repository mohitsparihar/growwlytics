import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// npm workspace cwd is often apps/api; repo .env is at monorepo root
let dir = process.cwd();
for (let i = 0; i < 6; i++) {
  const envPath = path.join(dir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
