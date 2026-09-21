import jwt from "jsonwebtoken";

import type { Auth as userType } from "../types/Auth.type.js";

function UserIdentifier(user: userType) {
  const User = user._id;
  if (!User) {
    throw new Error("User id is missing");
  }

  return user._id.toString();
}

const AccessSecretToken = process.env.JWT_SECRET as string;

export function generateAccessToken(user: userType) {
  const payload = { userid: UserIdentifier(user) };
  return jwt.sign(payload, AccessSecretToken, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

export function veryfyAccessToken(token: string) {
  return jwt.verify(token, AccessSecretToken, {
    algorithms: ["HS256"],
  });
}
