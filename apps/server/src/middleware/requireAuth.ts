import type { NextFunction, Request, Response } from "express";
import { verifyToken, type AuthTokenPayload } from "../auth/service.js";

export interface AuthedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token." });
  }
  try {
    req.auth = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
