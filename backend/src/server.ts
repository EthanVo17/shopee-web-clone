import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import RootRoute from "./routes/RootRoute.js";
import connectDB from "./config/database.js";
import UserModel from "./models/User.model.js";
import RefreshTokenModel from "./models/RefreshToken.model.js";
import { ErrorHandler } from "./middlewares/ErrorHandler.js";

const app: express.Express = express();

const port = Number(process.env.PORT ?? 3000);
const frontendURL = process.env.FRONTEND_URL;

const corsOptions = {
  origin: frontendURL,
  credentials: true,
};

const helmetOptions = {};

app.use(cors(corsOptions));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        `http://localhost:${port}`,
        `http://localhost:${port}`,
      ],
      // reportUri: "/api/csp-violation-report",
    },
    reportOnly: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));

RootRoute(app);

app.use(ErrorHandler);

async function Start() {
  connectDB();

  await UserModel.createIndexes();
  await RefreshTokenModel.createIndexes();

  app.listen(port, () => {
    console.log(`[server]: Backend đang chạy tại http://localhost:${port}`);
  });
}

Start();
