import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "book-notes-secret-key-change-in-prod";

export interface JwtPayload {
  userId: number;
  email: string;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
