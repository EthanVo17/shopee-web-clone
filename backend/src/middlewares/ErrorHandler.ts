import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";

export const ErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    res.status(409).json({
      message: "An account with these details already exists",
    });
    return;
  }

  if (
    err instanceof mongoose.Error.ValidationError ||
    err instanceof mongoose.Error.CastError
  ) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  if (err?.type === "entity.too.large") {
    res.status(413).json({ message: "Request body is too large" });
    return;
  }

  // Avoid logging submitted credentials or complete documents.
  console.error("Unhandled request error:", err?.name ?? "Error");

  res.status(500).json({
    message: "An unexpected server error occurred",
  });
};
