import { queues } from "../config/queue/queue.config.js";
import { prisma } from "../config/database.config.js";
import {
  submitToJudge0,
  getSubmissionResult,
} from "../services/judge.service.js";
import { checkUserBadges } from "../jobs/statsQueue.js";
import { sendNotification } from "../jobs/statsQueue.js";
import logger from "../utils/logger.js";

const processSubmission = async (job) => {
  const { submissionId, code, languageId, problemId, userId, testCases } =
    job.data;

  try {
    logger.info(`Processing submission ${submissionId}`);

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "PROCESSING" },
    });

    job.progress(10);

    const results = [];
    let allPassed = true;
    let totalTime = 0;
    let totalMemory = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      const judgeResult = await submitToJudge0(
        code,
        languageId,
        testCase.input,
        testCase.expectedOutput,
      );

      let result = judgeResult;
      let attempts = 0;

      while (result.status.id <= 2 && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await getSubmissionResult(result.token);
        attempts++;
      }

      const passed = result.status.id === 3;

      if (!passed) {
        allPassed = false;
      }

      totalTime += result.time || 0;
      totalMemory += result.memory || 0;

      results.push({
        testCaseId: testCase.id,
        passed,
        status: result.status.description,
        executionTime: result.time,
        memory: result.memory,
        output: result.stdout,
        error: result.stderr || result.compile_output,
      });

      job.progress(10 + (i + 1) * (80 / testCases.length));
    }

    const finalStatus = allPassed
      ? "ACCEPTED"
      : results.some((r) => r.status === "Wrong Answer")
        ? "WRONG_ANSWER"
        : results.some((r) => r.status === "Time Limit Exceeded")
          ? "TIME_LIMIT_EXCEEDED"
          : results.some((r) => r.status.includes("Error"))
            ? "RUNTIME_ERROR"
            : "COMPILATION_ERROR";

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: finalStatus,
        executionTime: Math.round(totalTime / testCases.length),
        memory: Math.round(totalMemory / testCases.length),
        testResults: results,
        passedTests: results.filter((r) => r.passed).length,
        totalTests: testCases.length,
      },
    });

    if (finalStatus === "ACCEPTED") {
      const existingSolve = await prisma.problemSolved.findUnique({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
      });

      if (!existingSolve) {
        await prisma.problemSolved.create({
          data: {
            userId,
            problemId,
            solvedAt: new Date(),
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            totalSolved: { increment: 1 },
          },
        });

        await prisma.problem.update({
          where: { id: problemId },
          data: {
            totalAccepted: { increment: 1 },
          },
        });

        checkUserBadges(userId).catch((err) =>
          logger.error("Badge check failed:", err),
        );

        sendNotification({
          userId,
          type: "PROBLEM_SOLVED",
          title: "Problem Solved!",
          message: "Congratulations! You solved a problem.",
          data: { problemId, submissionId },
        }).catch((err) => logger.error("Notification send failed:", err));
      }
    }

    await prisma.problem.update({
      where: { id: problemId },
      data: {
        totalSubmissions: { increment: 1 },
      },
    });

    job.progress(100);

    logger.info(`Submission ${submissionId} processed: ${finalStatus}`);

    return {
      submissionId,
      status: finalStatus,
      passedTests: results.filter((r) => r.passed).length,
      totalTests: testCases.length,
    };
  } catch (error) {
    logger.error(`Error processing submission ${submissionId}:`, error);

    await prisma.submission
      .update({
        where: { id: submissionId },
        data: {
          status: "SYSTEM_ERROR",
          error: error.message,
        },
      })
      .catch((err) => logger.error("Failed to update submission error:", err));

    throw error;
  }
};

export const startSubmissionWorker = () => {
  queues.submission.process("process-submission", 5, processSubmission);

  logger.info("Submission worker started (concurrency: 5)");
};

export default startSubmissionWorker;
