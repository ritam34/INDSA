import { db } from "../libs/db.js";
import { UserRole } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async.handler.js";

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await db.user.findMany();
  return res
    .status(200)
    .json(new ApiResponse(200, users, "All users fetched successfully"));
});
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  // check if user already exists
  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(400, "User already exists with this email");
    }
    // hash the password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
    );
    // create new user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: UserRole.USER,
      },
    });
    // send verification email
    // generate a crypto token
    // const verificationToken = crypto.randomBytes(32).toString("hex");
    // const hashedToken = crypto
    //   .createHash("sha256")
    //   .update(verificationToken)

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    });
    res.status(201).json(
      new ApiResponse(201, "User registered successfully", {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        image: newUser.image,
        token,
      })
    );
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(400, "Invalid email or password");
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid email or password");
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    });
    res.status(200).json(
      new ApiResponse(200, "User logged in successfully", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      })
    );
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});
export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
  });
  res
    .status(200)
    .json(new ApiResponse(200, "User logged out successfully", null));
});
// have to implement email verification logic
// use nodemailer and crypto
// send email with verification link to user
export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.params.token;
  try {
    if (!token) {
      throw new ApiError(401, "Not a valid link");
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await db.user.findUnique({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      throw new ApiError(401, "Not a valid Token");
    }
    if (user.emailVerificationTokenExpiry < Date.now()) {
      user.emailVerificationTokenExpiry = undefined;
      user.emailVerificationToken = undefined;
      await user.save();
      return res.status(300).json(new ApiResponse(300, null, "Link exprired"));
    }
    user.isEmailVerified = true;
    user.emailVerificationTokenExpiry = undefined;
    user.emailVerificationToken = undefined;
    await user.save();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Email verified succesfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", error.message));
  }
});
export const refreshAccessToken = asyncHandler(async (req, res) => {});
export const changeCurrentPassword = asyncHandler(async (req, res) => {});
export const forgotPasswordRequest = asyncHandler(async (req, res) => {});
export const resetForgottenPassword = asyncHandler(async (req, res) => {});
export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  // pull userId from cookie
//   const token = req.cookies.jwt;
//   if (!token) {
//     throw new ApiError(401, "Not authorized");
//   }
//   const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
//   const userId = decodedToken.id;
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    user.password = undefined; // remove password from user object
    return res
      .status(200)
      .json(new ApiResponse(200, user, "User profile fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});
