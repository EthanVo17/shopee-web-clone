import express from "express";

import { veryfyAccessToken } from "../jwt/jwt.js";

export const RequireAuth: express.RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json("Please log in");
    return;
  }

  const token = authorization.slice(7);

  try {
    res.locals.user = veryfyAccessToken(token);
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  next();
};
