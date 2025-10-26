import { db } from "../db/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  submitBatch,
  pollJudge0,
  getJudge0LanguageName,
} from "../libs/judge0.libs.js";

export const executeCode = asyncHandler(async (req, res) => {
  const { source_code, stdin, language_id, expected_output, problemId } =
    req.body;
    const userId="e9ee970c-3546-4f92-92b6-71d571d898fa";
  try {
    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_output) ||
      expected_output.length !== stdin.length
    ) {
      throw new ApiError(400, "Invalid stdin or expected output format");
    }

    // const userId = req.user.id;
    const judge0Submissions = stdin.map((input, index) => ({
      source_code,
      language_id,
      stdin: input,
    }));
    const submissionResults = await submitBatch(judge0Submissions);
    const tokens = submissionResults.map((s) => s.token);
    const results = await pollJudge0(tokens);

    let allPassed = true;
    const detailsResults = results.map((result, i) => {
      const stdout = result.stdout?.trim();
      const expectedOutput = expected_output[i]?.trim();
      const passed = stdout === expectedOutput;
      allPassed = allPassed && passed;
      return {
        testcase: i + 1,
        passed,
        stdout,
        stderr: result.stderr || null,
        expectedOutput: expectedOutput,
        compileOutput: result.compile_output || null,
        memory: result.memory ? `${result.memory} KB` : undefined,
        time: result.time ? `${result.time} s` : undefined,
        status: result.status.description,
      };
    });

    const submission = await db.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: source_code,
        language: getJudge0LanguageName(language_id),
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(detailsResults.map((r) => r.stdout)),
        stderr: detailsResults.some((r) => r.stderr)
          ? JSON.stringify(detailsResults.map((r) => r.stderr))
          : null,
        compileOutput:  detailsResults.some((r) => r.compileOutput)
          ? JSON.stringify(detailsResults.map((r) => r.compileOutput))
          : null,
        status: allPassed ? "Accepted" : "Wrong Answer",
        memory: detailsResults.some((r) => r.memory)
          ? JSON.stringify(detailsResults.map((r) => r.memory))
          : null,
        time: detailsResults.some((r) => r.time)
          ? JSON.stringify(detailsResults.map((r) => r.time))
          : null,
      },
    });

    if(allPassed){
        await db.problemSolved.upsert({
            where: {
                userId_problemId: {
                    userId,
                    problemId
                }
            },
            update: {},
            create: {
                userId,
                problemId
            }
        });
    }
    const testCaseResults = detailsResults.map((result) => ({
        submissionId: submission.id,
        testcase: result.testcase,
        passed: result.passed,
        stdout: result.stdout,
        stderr: result.stderr,
        expectedOutput: result.expectedOutput,
        compileOutput: result.compileOutput,
        memory: result.memory,
        time: result.time,
        status: result.status
      }));

    await db.testcaseResult.createMany({
      data: testCaseResults,
    });

    const submissionWithDetails = await db.submission.findUnique({
      where: {
        id: submission.id,
      },
      include: {
        testcases: true,
      },
    })
    return res
      .status(200)
      .json(new ApiResponse(200, submissionWithDetails, "Code executed successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});
