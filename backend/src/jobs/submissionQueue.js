import { queues } from "../config/queue/queue.config.js";
import logger from "../utils/logger.js";

export const addSubmissionJob = async (submissionData) => {
  try {
    const job = await queues.submission.add(
      "process-submission",
      submissionData,
      {
        attempts: 5,
        timeout: 60000,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    logger.info("Submission job added", {
      jobId: job.id,
      submissionId: submissionData.submissionId,
    });

    return job;
  } catch (error) {
    logger.error("Failed to add submission job:", error);
    throw error;
  }
};

export const addBatchSubmissionJobs = async (submissions) => {
  try {
    const jobs = submissions.map((submission) => ({
      name: "process-submission",
      data: submission,
      opts: {
        attempts: 5,
        timeout: 60000,
      },
    }));

    const addedJobs = await queues.submission.addBulk(jobs);

    logger.info(`Added ${addedJobs.length} submission jobs`);

    return addedJobs;
  } catch (error) {
    logger.error("Failed to add batch submission jobs:", error);
    throw error;
  }
};

export const getSubmissionJobStatus = async (jobId) => {
  try {
    const job = await queues.submission.getJob(jobId);

    if (!job) {
      return { status: "not_found" };
    }

    const state = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason;

    return {
      id: job.id,
      status: state,
      progress,
      failedReason,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  } catch (error) {
    logger.error("Failed to get submission job status:", error);
    throw error;
  }
};

export const cancelSubmissionJob = async (jobId) => {
  try {
    const job = await queues.submission.getJob(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    await job.remove();

    logger.info("Submission job cancelled", { jobId });

    return { message: "Job cancelled successfully" };
  } catch (error) {
    logger.error("Failed to cancel submission job:", error);
    throw error;
  }
};

export const retrySubmissionJob = async (jobId) => {
  try {
    const job = await queues.submission.getJob(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    await job.retry();

    logger.info("Submission job retried", { jobId });

    return { message: "Job retry initiated" };
  } catch (error) {
    logger.error("Failed to retry submission job:", error);
    throw error;
  }
};