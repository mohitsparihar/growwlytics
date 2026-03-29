/**
 * Vercel catch-all serverless function for the Express API.
 * Routes all /api/* requests to the Express app.
 * Uses createRequire for CJS interop since apps/api compiles to CommonJS.
 * The dist/ output is created during Vercel's buildCommand.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createApiApp } = require("../apps/api/dist/create-app.js");
export default createApiApp();
