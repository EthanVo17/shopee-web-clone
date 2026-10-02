import express from "express";

import { router as AuthenticationRoute } from "./Auth.route.js";

function RootRoute(app: express.Application) {
  app.use("/auth", AuthenticationRoute);
}

export default RootRoute;
