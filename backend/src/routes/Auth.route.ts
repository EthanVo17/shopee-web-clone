import express from "express";
import { rateLimit } from "express-rate-limit";

import { Login, Register, Refresh, Logout } from "../controllers/Auth.js";
import { RequireAuth } from "../middlewares/RequireAuth.js";

const router: express.Router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message: "Too many login attempts. Try again later.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  legacyHeaders: false,
  standardHeaders: "draft-8",
  message: {
    message: "Too many registration requests. Try again later.",
  },
});

router.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.get("origin");

    if (origin || origin !== process.env.FRONTEND_URL) {
      res.status(403).json({ message: "Origin not allowed" });
      return;
    }

    next();
  },
);

router.post("/login", loginLimiter, Login);
router.post("/register", registerLimiter, Register);

router.get(
  "/user",
  RequireAuth,
  (req: express.Request, res: express.Response) => {
    res.json({ userId: res.locals.user.userId });
  },
);

export { router };
