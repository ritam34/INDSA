import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import { executeCodeWithTestCases } from "./judge.service.js";
import logger from "../utils/logger.js";

export const submitContestSolution = async (
  contestId,
  problemId,
  sourceCode,
  language,
  userId,
) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
    include: {
      problems: {
        where: { problemId },
      },
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  const now = new Date();
  if (now < contest.startTime) {
    throw new ApiError(400, "Contest has not started yet");
  }

  if (now >= contest.endTime) {
    throw new ApiError(400, "Contest has ended");
  }

  const participant = await prisma.contestParticipant.findUnique({
    where: {
      contestId_userId: {
        contestId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new ApiError(
      403,
      "You must register for the contest before submitting",
    );
  }

  if (contest.problems.length === 0) {
    throw new ApiError(400, "Problem not found in this contest");
  }

  const contestProblem = contest.problems[0];

  const problem = await prisma.problem.findUnique({
    where: {
      id: problemId,
      deletedAt: null,
    },
    include: {
      testCases: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  const submission = await prisma.submission.create({
    data: {
      userId,
      problemId,
      sourceCode,
      language,
      status: "PENDING",
      passedTests: 0,
      totalTests: problem.testCases.length,
    },
  });

  try {
    const results = await executeCodeWithTestCases(
      sourceCode,
      language,
      problem.testCases.map((tc) => ({
        input: tc.input,
        output: tc.output,
      })),
    );

    await Promise.all(
      results.map((result) =>
        prisma.testcaseResult.create({
          data: {
            submissionId: submission.id,
            testcase: result.testcase,
            passed: result.passed,
            stdout: result.stdout,
            stderr: result.stderr,
            expectedOutput: result.expectedOutput,
            actualOutput: result.actualOutput,
            compileOutput: result.compile_output,
            memory: result.memory?.toString(),
            time: result.time?.toString(),
            status: result.status,
          },
        }),
      ),
    );

    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === results.length;

    const finalStatus = allPassed
      ? "ACCEPTED"
      : results.find((r) => !r.passed).status;

    const avgTime =
      results.reduce((sum, r) => sum + (parseFloat(r.time) || 0), 0) /
      results.length;
    const avgMemory =
      results.reduce((sum, r) => sum + (parseInt(r.memory) || 0), 0) /
      results.length;

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        passedTests: passedCount,
        time: avgTime.toFixed(3),
        memory: Math.round(avgMemory).toString(),
      },
    });

    let points = 0;
    let penalty = 0;

    if (allPassed) {
      points = contestProblem.points;
      const contestElapsed = Math.floor((now - contest.startTime) / 60000);
      penalty = contestElapsed;
    } else {
      penalty = 5;
    }

    const contestSubmission = await prisma.contestSubmission.create({
      data: {
        contestId,
        userId,
        problemId,
        submissionId: submission.id,
        points,
        penalty,
      },
    });

    await updateParticipantScore(contestId, userId);

    logger.info("Contest submission processed", {
      contestId,
      userId,
      problemId,
      status: finalStatus,
      points,
    });

    return {
      submission: updatedSubmission,
      contestSubmission,
      points,
      penalty,
    };
  } catch (error) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "INTERNAL_ERROR",
        stderr: error.message,
      },
    });

    logger.error("Contest submission failed", {
      submissionId: submission.id,
      error: error.message,
    });

    throw error;
  }
};

async function updateParticipantScore(contestId, userId) {
  const submissions = await prisma.contestSubmission.findMany({
    where: {
      contestId,
      userId,
    },
    include: {
      submission: {
        select: { status: true },
      },
    },
  });
  const problemScores = new Map();
  const problemPenalties = new Map();

  for (const sub of submissions) {
    const problemId = sub.problemId;

    if (!problemScores.has(problemId)) {
      problemScores.set(problemId, 0);
      problemPenalties.set(problemId, 0);
    }

    if (sub.submission.status === "ACCEPTED") {
      const currentPoints = problemScores.get(problemId);
      if (sub.points > currentPoints) {
        problemScores.set(problemId, sub.points);
        problemPenalties.set(problemId, sub.penalty);
      }
    } else {
      const currentPenalty = problemPenalties.get(problemId);
      problemPenalties.set(problemId, currentPenalty + sub.penalty);
    }
  }

  const totalScore = Array.from(problemScores.values()).reduce(
    (sum, points) => sum + points,
    0,
  );
  const totalPenalty = Array.from(problemPenalties.values()).reduce(
    (sum, pen) => sum + pen,
    0,
  );

  const lastAC = submissions
    .filter((s) => s.submission.status === "ACCEPTED")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  await prisma.contestParticipant.update({
    where: {
      contestId_userId: {
        contestId,
        userId,
      },
    },
    data: {
      score: totalScore,
      penalty: totalPenalty,
      finishTime: lastAC ? lastAC.createdAt : null,
    },
  });

  await updateContestRanks(contestId);
}

async function updateContestRanks(contestId) {
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    orderBy: [{ score: "desc" }, { penalty: "asc" }, { finishTime: "asc" }],
  });

  for (let i = 0; i < participants.length; i++) {
    await prisma.contestParticipant.update({
      where: { id: participants[i].id },
      data: { rank: i + 1 },
    });
  }
}
