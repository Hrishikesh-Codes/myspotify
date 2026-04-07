import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";

/**
 * Validates the session and attaches the Mongoose user document to req.user.
 * Returns 401 if the session is missing or the user no longer exists in DB.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = user;
  next();
}
