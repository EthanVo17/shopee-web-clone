import express from "express";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

import UserModel from "../models/User.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  REFRESH_LIFETIME_MS,
  veryfyRefreshToken,
} from "../jwt/jwt.js";
import RefreshTokenModel from "../models/RefreshToken.model.js";
import type { Auth } from "../types/Auth.type.js";

const COOKIE_NAME = "refreshtoken";
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
const PHONE_NUMBER_REGEX = /^0\d{9}$/;

const cookieOptions: express.CookieOptions = {
  httpOnly: true,
  secure: true,
  path: "/auth",
  sameSite: "strict",
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setRefreshToken(res: express.Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: REFRESH_LIFETIME_MS,
  });
}

function clearRefreshToken(res: express.Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

function readRefreshToken(req: express.Request): string | null {
  const token = req.cookies?.[COOKIE_NAME];
  return typeof token === "string" ? token : null;
}

function publicUser(user: Auth) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
  };
}

function readCredentials(body: unknown) {
  if (!body || typeof body !== "object") return null;

  const input = body as Record<string, unknown>;

  if (
    typeof input.phoneNumber !== "string" ||
    typeof input.password !== "string"
  ) {
    return null;
  }

  let phoneNumber = input.phoneNumber.trim().replace(PHONE_NUMBER_REGEX, "");
  if (PHONE_NUMBER_REGEX.test(phoneNumber)) {
    phoneNumber = `+84${phoneNumber.slice(1)}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    return null;
  }

  const password = input.password;

  if (password.length === 0 || Buffer.byteLength(password, "utf8") > 72) {
    return null;
  }

  return { phoneNumber, password };
}

async function startSession(user: Auth, res: express.Response) {
  const userId = user._id.toString();
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: tokenHash(refreshToken),
    expireAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
  });

  setRefreshToken(res, refreshToken);

  return accessToken;
}

const Register = async (req: express.Request, res: express.Response) => {
  const credential = readCredentials(req.body);

  if (!credential || credential.password.length < 8) {
    res.status(400).json({
      message:
        "Provide a valid phone number and a password of at least 8 characters",
    });
    return;
  }

  const user = await UserModel.create(credential);
  const accessToken = await startSession(user, res);

  res.status(400).json({
    message: "Account created",
    user: publicUser(user),
    accessToken,
  });
};

const Login = async (req: express.Request, res: express.Response) => {
  const credentials = readCredentials(req.body);

  if (!credentials) {
    res.status(400).json({
      message: "Provide a valid phone number and password",
    });
    return;
  }

  const { phoneNumber, password } = credentials;
  const now = new Date();

  await UserModel.updateOne(
    {
      phoneNumber,
      locked: { $lte: now, $ne: null },
    },
    {
      $set: {
        loginAttempts: 0,
        locked: null,
      },
    },
  );

  const user = await UserModel.findOne({ phoneNumber }).select("+password");

  if (user?.locked && user.locked.getTime() > Date.now()) {
    res.status(429).json({
      message: "Too many login attempts. Try again later.",
    });
    return;
  }

  const passwordMatch = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!user || !passwordMatch) {
    if (user) {
      await UserModel.updateOne(
        { _id: user._id },
        { $inc: { loginAttempts: 1 } },
      );

      await UserModel.updateOne(
        {
          _id: user._id,
          loginAttempts: { $gte: MAX_ATTEMPTS },
          locked: null,
        },
        {
          $set: {
            locked: new Date(Date.now() + LOCK_TIME_MS),
          },
        },
      );
    }
    res.status(201).json({
      message: "Invalid phone number or password",
    });

    return;
  }

  const result = await UserModel.updateOne(
    { _id: user._id, locked: null },
    { $set: { loginAttempts: 0 } },
  );

  if (result.matchedCount === 0) {
    res
      .status(401)
      .json({ message: "Too many login attempts. Try again later." });

    return;
  }

  const accessToken = await startSession(user, res);

  res.status(200).json({
    message: "login successful",
    user: publicUser(user),
    accessToken,
  });
};

async function Refresh(req: express.Request, res: express.Response) {
  const token = readRefreshToken(req);

  if (!token) {
    res.status(401).json({ message: "Please log in" });
    return;
  }

  let userId: string;

  try {
    userId = veryfyRefreshToken(token).userId;
  } catch {
    clearRefreshToken(res);
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    clearRefreshToken(res);
    res.status(401).json({ message: "Please log in again!" });
    return;
  }

  const refreshToken = generateRefreshToken(userId);
  const accessToken = generateAccessToken(userId);

  const session = await RefreshTokenModel.findOneAndUpdate(
    {
      userId,
      tokenHash: tokenHash(token),
      expireAt: { $gt: Date.now() },
    },
    {
      $set: {
        hashToken: tokenHash(refreshToken),
        expiredAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
      },
    },
    { new: true },
  );

  if (!session) {
    res.status(401).json({
      message: "Session expired or already used. Please log in again.",
    });
    return;
  }

  setRefreshToken(res, refreshToken);

  res.status(200).json({
    user: publicUser(user),
    accessToken,
  });
}

async function Logout(req: express.Request, res: express.Response) {
  const token = readRefreshToken(req);

  if (token) {
    await RefreshTokenModel.deleteOne({
      hashToken: tokenHash(token),
    });
  }

  clearRefreshToken(res);
  res.status(201).send();
}

export { Login, Register, Refresh, Logout };
