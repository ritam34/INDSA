import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as submissionService from "../services/submission.service.js";

/**
 * @route   POST /api/submissions/run
 * @desc    Run code with public test cases or custom input
 * @access  Private
 */
export const runCode = asyncHandler(async (req, res) => {
  const { problemSlug, sourceCode, language, stdin } = req.body;

  const result = await submissionService.runCode(
    problemSlug,
    sourceCode,
    language,
    stdin,
    req.user.id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Code executed successfully"));
});

/**
 * @route   POST /api/submissions/submit
 * @desc    Submit solution (run all test cases)
 * @access  Private
 */
export const submitSolution = asyncHandler(async (req, res) => {
  const { problemSlug, sourceCode, language } = req.body;

  const result = await submissionService.submitSolution(
    problemSlug,
    sourceCode,
    language,
    req.user.id,
  );

  let message = "Submission processed";

  if (result.submission.status === "ACCEPTED") {
    message = "Accepted";

    if (result.newBadgesEarned && result.newBadgesEarned.length > 0) {
      const badgeNames = result.newBadgesEarned
        .map((b) => b.badge.name)
        .join(", ");
      message += ` | You earned ${result.newBadgesEarned.length} new badge(s): ${badgeNames}`;
    }
  } else {
    message = result.submission.status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  const responseData = {
    id: result.submission.id,
    status: result.submission.status,
    language: result.submission.language,
    passedTests: result.submission.passedTests,
    totalTests: result.submission.totalTests,
    time: result.submission.time,
    memory: result.submission.memory,
    createdAt: result.submission.createdAt,
    problem: result.submission.problem,
    testcases: result.submission.testcases,
    newBadgesEarned: result.newBadgesEarned || [],
  };

  return res.status(201).json(new ApiResponse(201, responseData, message));
});

/**
 * @route   GET /api/submissions/:id
 * @desc    Get submission by ID
 * @access  Private
 */
export const getSubmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const submission = await submissionService.getSubmissionById(id, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, submission, "Submission fetched successfully"));
});

/**
 * @route   GET /api/submissions/user/me
 * @desc    Get current user's submissions
 * @access  Private
 */
export const getMySubmissions = asyncHandler(async (req, res) => {
  const submissions = await submissionService.getUserSubmissions(
    req.user.id,
    req.query,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, submissions, "Submissions fetched successfully"),
    );
});

/**
 * @route   GET /api/submissions/problem/:slug
 * @desc    Get submissions for a specific problem
 * @access  Private
 */
export const getProblemSubmissions = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const submissions = await submissionService.getProblemSubmissions(
    slug,
    req.user.id,
    req.query,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        submissions,
        "Problem submissions fetched successfully",
      ),
    );
});

/**
 * @route   GET /api/submissions/languages
 * @desc    Get supported languages
 * @access  Public
 */
export const getSupportedLanguages = asyncHandler(async (req, res) => {
  const languages = [
    { id: "javascript", name: "JavaScript", extension: "js" },
    { id: "python", name: "Python 3", extension: "py" },
    { id: "java", name: "Java", extension: "java" },
    { id: "cpp", name: "C++", extension: "cpp" },
    { id: "c", name: "C", extension: "c" },
    { id: "csharp", name: "C#", extension: "cs" },
    { id: "go", name: "Go", extension: "go" },
    { id: "rust", name: "Rust", extension: "rs" },
    { id: "typescript", name: "TypeScript", extension: "ts" },
    { id: "php", name: "PHP", extension: "php" },
    { id: "ruby", name: "Ruby", extension: "rb" },
    { id: "swift", name: "Swift", extension: "swift" },
    { id: "kotlin", name: "Kotlin", extension: "kt" },
  ];

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        languages,
        "Supported languages fetched successfully",
      ),
    );
});