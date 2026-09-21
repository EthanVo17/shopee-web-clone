import mongoose from "mongoose";

export interface Auth {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: number;
  avatar: string[];
  addresses: string[];
  role: string;
  cart: string[];
  loginAttempts: number;
  locked?: Date;
  tokens?: string[];
  phoneNumber: number;
  password: string;
}
