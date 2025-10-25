import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { db } from "../db/db.js";
import {
  getJudge0LanguageId,
  pollJudge0,
  submitBatch,
} from "../libs/judge0.libs.js";

export const createProblem = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
  } = req.body;
  try {
    if (
      !title ||
      !description ||
      !difficulty ||
      !tags ||
      !examples ||
      !constraints ||
      !testcases ||
      !codeSnippets ||
      !referenceSolutions
    ) {
      throw new ApiError(400, `All fields are required`);
    }
    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      const languageId = getJudge0LanguageId(language);
      if (!languageId) {
        throw new ApiError(400, `${language} is not supported`);
      }
      const judge0Submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));
      const submissionResults = await submitBatch(judge0Submissions);
      if (!Array.isArray(submissionResults)) {
        throw new ApiError(500, "Invalid Judge0 response format");
      }
      const tokens = submissionResults.map((s) => s.token);
      const results = await pollJudge0(tokens);

      for (let i = 0; i < results.length; i++) {
        if (results[i].status.id !== 3) {
          throw new ApiError(400, `Testcase ${i + 1} failed for ${language}`);
        }
      }
    }
    // need to change to req.user.id
    const userId = "e9ee970c-3546-4f92-92b6-71d571d898fa";

    const problem = await db.problem.create({
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testcases,
        codeSnippets,
        referenceSolutions,
        userId,
      },
    });
    return res.status(201).json({
      success: true,
      message: "Problem created successfully",
      data: {
        problem,
      },
    });
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});
export const getProblem = asyncHandler(async (req, res) => {
  try {
    const problems = await db.problem.findMany();
    if (!problems) {
      throw new ApiError(404, "No problems found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, problems, "Problems fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});
export const getProblemsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const problem = await db.problem.findUnique({
      where: {
        id,
      },
    });
    if (!problem) {
      throw new ApiError(404, "Problem not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, problem, "Problem fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});
export const updateProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(
      400,
      "Request body cannot be empty or you must provide at least one field to update",
    );
  }

  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
    hints,
    editorial,
  } = req.body;
  try {
    // check minium one fields to update
    const allFields = {
      title,
      description,
      difficulty,
      tags,
      examples,
      constraints,
      testcases,
      codeSnippets,
      referenceSolutions,
      hints,
      editorial,
    };
    const dataToUpdate = Object.fromEntries(
      Object.entries(allFields).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );
    if (Object.keys(dataToUpdate).length === 0) {
      throw new ApiError(400, "No fields to update");
    }
    if (testcases || codeSnippets || referenceSolutions) {
      //
      for (const [language, solutionCode] of Object.entries(
        referenceSolutions,
      )) {
        const languageId = getJudge0LanguageId(language);
        if (!languageId) {
          throw new ApiError(400, `${language} is not supported`);
        }
        const judge0Submissions = testcases.map(({ input, output }) => ({
          source_code: solutionCode,
          language_id: languageId,
          stdin: input,
          expected_output: output,
        }));
        const submissionResults = await submitBatch(judge0Submissions);
        if (!Array.isArray(submissionResults)) {
          throw new ApiError(500, "Invalid Judge0 response format");
        }
        const tokens = submissionResults.map((s) => s.token);
        const results = await pollJudge0(tokens);

        for (let i = 0; i < results.length; i++) {
          if (results[i].status.id !== 3) {
            throw new ApiError(400, `Testcase ${i + 1} failed for ${language}`);
          }
        }
      }
    }
    const problem = await db.problem.update({
      where: { id },
      data: dataToUpdate,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, problem, "Problem updated successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});
export const deleteProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      throw new ApiError(400, "Problem id is required");
    }
    const problem = await db.problem.findUnique({
      where: {
        id,
      },
    });
    if (!problem) {
      throw new ApiError(404, "Problem not found");
    }
    await db.problem.delete({
      where: { id },
    });
    if (!problem) {
      throw new ApiError(404, "Problem not found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, problem, "Problem deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

export const getAllSlovedProblems = asyncHandler(async (req, res) => {});
