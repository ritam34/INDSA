import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { db } from "../db/db.js";
import jwt from "jsonwebtoken";

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      throw new ApiError(400, `All fields are required`);
    }
    const user = await db.user.create({
      data: {
        name,
        email,
        password: bcrypt.hashSync(password, 10),
      },
    });
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

export const loginUser = asyncHandler(async (req, res) => {});
export const logoutUser = asyncHandler(async (req, res) => {});
export const getUser = asyncHandler(async (req, res) => {});
