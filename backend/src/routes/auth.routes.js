import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  refreshAccessToken,
  changeCurrentPassword,
  forgotPasswordRequest,
  resetForgottenPassword,
  getProfile,
  getAllUsers,
} from "../controllers/auth.controllers.js";
import { protect } from "../middlewares/auth.middlewares.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout",protect, logoutUser);
// router.post("/verify/:token", verifyEmail); //http://localhost:4000/api/v1/auth/verify/844cb44704489c54cbc1d5fd37a2390a208dfabe74bf3bb6b41ec17ce9f3926a
// router.post("/refresh-accesstoken", refreshAccessToken);
// router.post("/changepassword", changeCurrentPassword);
// router.post("/forgotpassword", forgotPasswordRequest);
// router.post("/resetpassword/:token", resetForgottenPassword);
router.get("/profile",protect, getProfile);
router.get("/all", getAllUsers);

export default router;
