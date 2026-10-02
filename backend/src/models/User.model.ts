import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import type { Auth } from "../types/Auth.type.js";

const UserSchema = new mongoose.Schema<Auth>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: null,
    },

    email: {
      type: String,
      trim: true,
      required: true,
      lowercase: true,
      default: null,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    avatar: {
      type: String,
    },

    addresses: [
      {
        street: { type: String, required: true },
        ward: { type: String, required: true },
        district: { type: String, required: true },
        city: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    role: {
      type: String,
      enum: ["user", "admin", "seller"],
      default: "user",
    },

    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        quantity: {
          type: Number,
          min: 1,
          default: 1,
          required: true,
        },
      },
    ],

    loginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },

    locked: {
      type: Date,
    },

    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const saltRound = 10;
  const salt = await bcrypt.genSalt(saltRound);
  this.password = await bcrypt.hash(this.password, salt);
});

const UserModel = mongoose.model<Auth>("user", UserSchema);

export default UserModel;
