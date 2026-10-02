import "dotenv/config";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import type { Auth as userType } from "../types/Auth.type.js";

function UserIdentifier(user: userType) {
  const User = user._id;
  if (!User) {
    throw new Error("User id is missing");
  }

  return user._id.toString();
}

const AccessSecretToken = process.env.JWT_SECRET as string;
const RefreshSecretToken = process.env.JWT_REFRESH_SECRET as string;

if (AccessSecretToken === RefreshSecretToken) {
  throw new Error("JWT secrets must be different");
}

export const REFRESH_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function generateAccessToken(userId: string) {
  return jwt.sign({ userId, tokenType: String }, AccessSecretToken, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId, tokenType: String }, RefreshSecretToken, {
    algorithm: "HS256",
    expiresIn: "7d",
    jwtid: randomUUID(),
  });
}

function verify(
  token: string,
  secretToken: string,
  tokentype: "access" | "refresh",
) {
  const payload = jwt.verify(token, secretToken, {
    algorithms: ["HS256"],
  });

  console.log(payload);
  if (
    typeof payload === "string" ||
    payload.tokenType !== tokentype ||
    typeof payload.userId !== "string" ||
    !/^[a-f\d]{24}$/i.test(payload.userId)
  ) {
    throw new Error("Invalid token payload");
  }

  return { userId: payload.userid };
}

export function veryfyAccessToken(token: string) {
  return verify(token, AccessSecretToken, "access");
}

export function veryfyRefreshToken(token: string) {
  return verify(token, RefreshSecretToken, "refresh");
}
