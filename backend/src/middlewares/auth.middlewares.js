import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async.handler.js";
import { db } from "../libs/db.js";

export const protect = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies.jwt || (req.headers.authorization && req.headers.authorization.startsWith("Bearer") ? req.headers.authorization.split(" ")[1] : null);
        if (!token) {
            throw new ApiError(401, "Not authorized, token missing");
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            throw new ApiError(401, "Not authorized, user not found");
        }
        user.password = undefined; // remove password from user object
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, "Not authorized");
    }
});