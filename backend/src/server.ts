import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import RootRoute from "./routes/route.js";

const app: express.Express = express();

const port = process.env.PORT;

const corsOptions = {
  origin: `http://localhost:${port}`,
  credentials: true,
};

const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        `http://localhost:${port}`,
        `http://localhost:${port}`,
      ],
    },
  },
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(morgan("combined"));
app.use(cors(corsOptions));
app.use(helmet(helmetOptions));

RootRoute(app);

app.listen(port, () => {
  console.log(`[server]: Backend đang chạy tại http://localhost:${port}`);
});
