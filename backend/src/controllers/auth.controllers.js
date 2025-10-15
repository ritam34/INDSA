import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler.js";
import {db} from '../db/db.js';
import jwt from 'jsonwebtoken';



export const registerUser =asyncHandler(async (req, res) => {
    const {name, email, password} = req.body
});

export const loginUser = asyncHandler(async (req, res) => {});
export const logoutUser = asyncHandler(async (req, res) => {});
export const getUser = asyncHandler(async (req, res) => {});
