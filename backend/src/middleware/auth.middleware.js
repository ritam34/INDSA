// jwt middlwware
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";

export const protect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1]
    }
    if (!token) {
        return next(new ApiError(401, "Not authorized to access this route"))
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = await db.user.findUnique({
            where: {
                id: decoded.id
            }
        })
        next()
    } catch (error) {
        return next(new ApiError(401, "Not authorized to access this route"))
    }
})