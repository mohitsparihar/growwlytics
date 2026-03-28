import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase.js";

export interface AuthRequest extends Request {
  userId: string;
}

/**
 * Validates the Supabase JWT from the Authorization header and attaches
 * the verified userId to the request object.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as AuthRequest).userId = user.id;
  next();
}
