import { db } from "../db/db.js";

export const getSubmission = asyncHandler(async (req, res) => {
    try {
        const userId = "e9ee970c-3546-4f92-92b6-71d571d898fa"
        const submissions = await db.submission.findMany({
            where:{
                userId
            }
        });
        if (!submissions) {
            throw new ApiError(404, "No submissions found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, submissions, "Submissions fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const getSubmissionForProblem = asyncHandler(async (req, res) => {
    try {
        const userId="e9ee970c-3546-4f92-92b6-71d571d898fa";
        const problemId = req.params.problemId;
        const submissions = await db.submission.findMany({
            where: {
                userId,
                problemId
            }
        })
        if (!submissions) {
            throw new ApiError(404, "No submissions found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, submissions, "Submissions fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const getSubmissionCount = asyncHandler(async (req, res) => {
    try {
        const problemId = req.params.problemId;
        const submissions = await db.submission.count({
            where: {
                problemId
            }
        })
        if (!submissions) {
            throw new ApiError(404, "No submissions found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, {count:submissions}, "Submissions fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});