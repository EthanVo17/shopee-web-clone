import mongoose from "mongoose";

export default async function connectDB() {
  const DB_URL = process.env.DB_URI as string;

  if (!DB_URL) {
    console.error("[MongoDB]: DB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    console.log("[MongoDB]: connected");
  } catch (err: any) {
    console.log("[MongoDB]: can not connect");
    console.log("[MongoDB Error]:", err.message);
    process.exit(1);
  }
}
