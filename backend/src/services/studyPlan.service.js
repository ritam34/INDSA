import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import { generateSlug, generateSlugWithRandom } from "../utils/slug.utils.js";
import logger from "../utils/logger.js";

export const getAllStudyPlans = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    difficulty,
    category,
    isPremium,
    search,
    sortBy = "popularity",
    order = "desc",
  } = filters;

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const where = {
    isPublic: true,
    deletedAt: null,
  };

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (category) {
    where.category = category;
  }

  if (isPremium !== undefined) {
    where.isPremium = isPremium === "true";
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderByMap = {
    popularity: { enrolledCount: order },
    recent: { createdAt: order },
    difficulty: { difficulty: order },
  };

  const [studyPlans, total] = await Promise.all([
    prisma.studyPlan.findMany({
      where,
      skip,
      take,
      orderBy: orderByMap[sortBy] || orderByMap.popularity,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        difficulty: true,
        category: true,
        estimatedWeeks: true,
        enrolledCount: true,
        completedCount: true,
        isPremium: true,
        tags: true,
        createdAt: true,
        _count: {
          select: {
            problems: true,
          },
        },
      },
    }),
    prisma.studyPlan.count({ where }),
  ]);

  return {
    studyPlans: studyPlans.map((plan) => ({
      ...plan,
      problemCount: plan._count.problems,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalStudyPlans: total,
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
};

export const getStudyPlanBySlug = async (slug, userId = null) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { slug, deletedAt: null },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              acceptanceRate: true,
            },
          },
        },
        orderBy: [
          { weekNumber: "asc" },
          { dayNumber: "asc" },
          { order: "asc" },
        ],
      },
    },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  let enrollment = null;
  if (userId) {
    enrollment = await prisma.studyPlanEnrollment.findUnique({
      where: {
        userId_studyPlanId: {
          userId,
          studyPlanId: studyPlan.id,
        },
      },
      include: {
        progress: {
          select: {
            problemId: true,
            completed: true,
          },
        },
      },
    });
  }

  return {
    ...studyPlan,
    isEnrolled: !!enrollment,
    enrollment: enrollment
      ? {
          enrolledAt: enrollment.enrolledAt,
          startDate: enrollment.startDate,
          completedAt: enrollment.completedAt,
          progress: enrollment.progress,
        }
      : null,
  };
};

export const createStudyPlan = async (studyPlanData, userId) => {
  const {
    title,
    description,
    difficulty,
    estimatedWeeks,
    category,
    prerequisites,
    tags,
    isPremium,
    isPublic,
    problems,
  } = studyPlanData;

  let slug = generateSlug(title);
  const existingPlan = await prisma.studyPlan.findUnique({
    where: { slug },
  });

  if (existingPlan) {
    slug = generateSlugWithRandom(title);
  }

  const problemIds = problems.map((p) => p.problemId);
  const existingProblems = await prisma.problem.findMany({
    where: { id: { in: problemIds } },
    select: { id: true },
  });

  if (existingProblems.length !== problemIds.length) {
    throw new ApiError(400, "One or more problems do not exist");
  }

  const studyPlan = await prisma.studyPlan.create({
    data: {
      title,
      slug,
      description,
      difficulty,
      estimatedWeeks,
      category,
      prerequisites,
      tags,
      isPremium,
      isPublic,
      createdById: userId,
      problems: {
        create: problems.map((p) => ({
          problemId: p.problemId,
          weekNumber: p.weekNumber,
          dayNumber: p.dayNumber,
          order: p.order,
          isOptional: p.isOptional || false,
          notes: p.notes || null,
        })),
      },
    },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  logger.info("Study plan created", {
    studyPlanId: studyPlan.id,
    slug,
    userId,
  });

  return studyPlan;
};

export const updateStudyPlan = async (studyPlanId, updateData, userId) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { id: studyPlanId, deletedAt: null },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  let slug = studyPlan.slug;
  if (updateData.title && updateData.title !== studyPlan.title) {
    slug = generateSlug(updateData.title);
    const existingPlan = await prisma.studyPlan.findUnique({
      where: { slug },
    });
    if (existingPlan && existingPlan.id !== studyPlanId) {
      slug = generateSlugWithRandom(updateData.title);
    }
  }

  const updated = await prisma.studyPlan.update({
    where: { id: studyPlanId },
    data: {
      ...updateData,
      slug,
      updatedAt: new Date(),
    },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  logger.info("Study plan updated", { studyPlanId, userId });

  return updated;
};

export const deleteStudyPlan = async (studyPlanId, userId) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { id: studyPlanId, deletedAt: null },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  await prisma.studyPlan.update({
    where: { id: studyPlanId },
    data: { deletedAt: new Date() },
  });

  logger.info("Study plan deleted", { studyPlanId, userId });

  return { message: "Study plan deleted successfully" };
};

export const enrollInStudyPlan = async (
  slug,
  userId,
  startDate = new Date(),
) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { slug, deletedAt: null },
    include: {
      problems: {
        select: { problemId: true },
      },
    },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  const existingEnrollment = await prisma.studyPlanEnrollment.findUnique({
    where: {
      userId_studyPlanId: {
        userId,
        studyPlanId: studyPlan.id,
      },
    },
  });

  if (existingEnrollment) {
    throw new ApiError(400, "Already enrolled in this study plan");
  }

  const enrollment = await prisma.studyPlanEnrollment.create({
    data: {
      userId,
      studyPlanId: studyPlan.id,
      startDate,
      progress: {
        create: studyPlan.problems.map((p) => ({
          problemId: p.problemId,
          completed: false,
        })),
      },
    },
    include: {
      studyPlan: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  });

  await prisma.studyPlan.update({
    where: { id: studyPlan.id },
    data: { enrolledCount: { increment: 1 } },
  });

  logger.info("User enrolled in study plan", {
    userId,
    studyPlanId: studyPlan.id,
  });

  return enrollment;
};

export const unenrollFromStudyPlan = async (slug, userId) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { slug, deletedAt: null },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  const enrollment = await prisma.studyPlanEnrollment.findUnique({
    where: {
      userId_studyPlanId: {
        userId,
        studyPlanId: studyPlan.id,
      },
    },
  });

  if (!enrollment) {
    throw new ApiError(400, "Not enrolled in this study plan");
  }

  await prisma.studyPlanEnrollment.delete({
    where: {
      userId_studyPlanId: {
        userId,
        studyPlanId: studyPlan.id,
      },
    },
  });

  await prisma.studyPlan.update({
    where: { id: studyPlan.id },
    data: { enrolledCount: { decrement: 1 } },
  });

  logger.info("User unenrolled from study plan", {
    userId,
    studyPlanId: studyPlan.id,
  });

  return { message: "Successfully unenrolled from study plan" };
};

export const getStudyPlanProgress = async (slug, userId) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { slug, deletedAt: null },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  const enrollment = await prisma.studyPlanEnrollment.findUnique({
    where: {
      userId_studyPlanId: {
        userId,
        studyPlanId: studyPlan.id,
      },
    },
    include: {
      progress: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
            },
          },
        },
      },
      studyPlan: {
        include: {
          problems: {
            include: {
              problem: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  difficulty: true,
                },
              },
            },
            orderBy: [
              { weekNumber: "asc" },
              { dayNumber: "asc" },
              { order: "asc" },
            ],
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new ApiError(400, "Not enrolled in this study plan");
  }

  const totalProblems = enrollment.studyPlan.problems.length;
  const completedProblems = enrollment.progress.filter(
    (p) => p.completed,
  ).length;
  const progressPercentage =
    totalProblems > 0
      ? Math.round((completedProblems / totalProblems) * 100)
      : 0;

  return {
    studyPlan: {
      title: enrollment.studyPlan.title,
      slug: enrollment.studyPlan.slug,
      estimatedWeeks: enrollment.studyPlan.estimatedWeeks,
    },
    enrollment: {
      enrolledAt: enrollment.enrolledAt,
      startDate: enrollment.startDate,
      completedAt: enrollment.completedAt,
    },
    progress: {
      totalProblems,
      completedProblems,
      progressPercentage,
      problems: enrollment.studyPlan.problems.map((sp) => {
        const progressItem = enrollment.progress.find(
          (p) => p.problemId === sp.problemId,
        );
        return {
          ...sp.problem,
          weekNumber: sp.weekNumber,
          dayNumber: sp.dayNumber,
          order: sp.order,
          isOptional: sp.isOptional,
          notes: sp.notes,
          completed: progressItem?.completed || false,
          completedAt: progressItem?.completedAt,
        };
      }),
    },
  };
};

export const completeProblem = async (
  slug,
  userId,
  problemId,
  submissionId = null,
  notes = null,
) => {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { slug, deletedAt: null },
  });

  if (!studyPlan) {
    throw new ApiError(404, "Study plan not found");
  }

  const enrollment = await prisma.studyPlanEnrollment.findUnique({
    where: {
      userId_studyPlanId: {
        userId,
        studyPlanId: studyPlan.id,
      },
    },
    include: {
      progress: true,
    },
  });

  if (!enrollment) {
    throw new ApiError(400, "Not enrolled in this study plan");
  }

  const progressItem = await prisma.studyPlanProgress.updateMany({
    where: {
      enrollmentId: enrollment.id,
      problemId,
    },
    data: {
      completed: true,
      completedAt: new Date(),
      submissionId,
      notes,
    },
  });

  if (progressItem.count === 0) {
    throw new ApiError(404, "Problem not found in study plan");
  }
  const allProgress = await prisma.studyPlanProgress.findMany({
    where: { enrollmentId: enrollment.id },
  });

  const allCompleted = allProgress.every((p) => p.completed);

  if (allCompleted && !enrollment.completedAt) {
    await prisma.studyPlanEnrollment.update({
      where: { id: enrollment.id },
      data: { completedAt: new Date() },
    });

    await prisma.studyPlan.update({
      where: { id: studyPlan.id },
      data: { completedCount: { increment: 1 } },
    });

    logger.info("User completed study plan", {
      userId,
      studyPlanId: studyPlan.id,
    });
  }

  return { message: "Problem marked as complete", allCompleted };
};

export const getUserStudyPlans = async (userId) => {
  const enrollments = await prisma.studyPlanEnrollment.findMany({
    where: { userId },
    include: {
      studyPlan: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          estimatedWeeks: true,
          _count: {
            select: {
              problems: true,
            },
          },
        },
      },
      progress: {
        where: { completed: true },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return enrollments.map((enrollment) => ({
    studyPlan: enrollment.studyPlan,
    enrolledAt: enrollment.enrolledAt,
    startDate: enrollment.startDate,
    completedAt: enrollment.completedAt,
    totalProblems: enrollment.studyPlan._count.problems,
    completedProblems: enrollment.progress.length,
    progressPercentage:
      enrollment.studyPlan._count.problems > 0
        ? Math.round(
            (enrollment.progress.length /
              enrollment.studyPlan._count.problems) *
              100,
          )
        : 0,
  }));
};
