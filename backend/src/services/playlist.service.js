import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import { generateSlug, generateSlugWithRandom } from "../utils/slug.utils.js";
import {
  sanitizePaginationParams,
  createPaginatedResponse,
} from "../utils/pagination.utils.js";
import logger from "../utils/logger.js";

export const createPlaylist = async (playlistData, userId) => {
  const { name, description, isPublic } = playlistData;
  let slug = generateSlug(name);

  const existingPlaylist = await prisma.playlist.findFirst({
    where: {
      userId,
      slug,
      deletedAt: null,
    },
  });

  if (existingPlaylist) {
    slug = generateSlugWithRandom(name);
  }

  const playlist = await prisma.playlist.create({
    data: {
      name,
      slug,
      description,
      isPublic,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  logger.info("Playlist created", { playlistId: playlist.id, userId });

  return playlist;
};

export const getUserPlaylists = async (
  username,
  filters,
  currentUserId = null,
) => {
  const { page, limit, search } = filters;

  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    userId: user.id,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(currentUserId !== user.id && { isPublic: true }),
  };

  const [playlists, total] = await Promise.all([
    prisma.playlist.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            problems: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageLimit,
    }),
    prisma.playlist.count({ where }),
  ]);

  const playlistsWithCount = playlists.map((p) => ({
    ...p,
    problemCount: p._count.problems,
  }));

  return createPaginatedResponse(playlistsWithCount, page, limit, total);
};

export const getPlaylistById = async (playlistId, currentUserId = null) => {
  const playlist = await prisma.playlist.findUnique({
    where: {
      id: playlistId,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
      problems: {
        where: { deletedAt: null },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              tags: true,
              acceptanceRate: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.isPublic && playlist.userId !== currentUserId) {
    throw new ApiError(403, "You do not have access to this playlist");
  }

  if (currentUserId) {
    const solvedProblemIds = await prisma.problemSolved.findMany({
      where: {
        userId: currentUserId,
        deletedAt: null,
      },
      select: { problemId: true },
    });

    const solvedIds = new Set(solvedProblemIds.map((p) => p.problemId));

    playlist.problems = playlist.problems.map((pp) => ({
      ...pp,
      problem: {
        ...pp.problem,
        isSolved: solvedIds.has(pp.problem.id),
      },
    }));
  }

  return playlist;
};

export const getPlaylistBySlug = async (
  username,
  slug,
  currentUserId = null,
) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await prisma.playlist.findFirst({
    where: {
      userId: user.id,
      slug,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
      problems: {
        where: { deletedAt: null },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              tags: true,
              acceptanceRate: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.isPublic && playlist.userId !== currentUserId) {
    throw new ApiError(403, "You do not have access to this playlist");
  }
  if (currentUserId) {
    const solvedProblemIds = await prisma.problemSolved.findMany({
      where: {
        userId: currentUserId,
        deletedAt: null,
      },
      select: { problemId: true },
    });

    const solvedIds = new Set(solvedProblemIds.map((p) => p.problemId));

    playlist.problems = playlist.problems.map((pp) => ({
      ...pp,
      problem: {
        ...pp.problem,
        isSolved: solvedIds.has(pp.problem.id),
      },
    }));
  }

  return playlist;
};

export const updatePlaylist = async (playlistId, updateData, userId) => {
  const existingPlaylist = await prisma.playlist.findUnique({
    where: {
      id: playlistId,
      deletedAt: null,
    },
  });

  if (!existingPlaylist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (existingPlaylist.userId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to update this playlist",
    );
  }
  if (updateData.name) {
    let slug = generateSlug(updateData.name);
    const slugExists = await prisma.playlist.findFirst({
      where: {
        userId,
        slug,
        id: { not: playlistId },
        deletedAt: null,
      },
    });

    if (slugExists) {
      slug = generateSlugWithRandom(updateData.name);
    }

    updateData.slug = slug;
  }

  const updatedPlaylist = await prisma.playlist.update({
    where: { id: playlistId },
    data: updateData,
  });

  logger.info("Playlist updated", { playlistId, userId });

  return updatedPlaylist;
};

export const deletePlaylist = async (playlistId, userId) => {
  const playlist = await prisma.playlist.findUnique({
    where: {
      id: playlistId,
      deletedAt: null,
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.userId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to delete this playlist",
    );
  }

  await prisma.playlist.update({
    where: { id: playlistId },
    data: { deletedAt: new Date() },
  });

  logger.info("Playlist deleted", { playlistId, userId });

  return { message: "Playlist deleted successfully" };
};

export const addProblemToPlaylist = async (playlistId, problemData, userId) => {
  const { problemId, notes } = problemData;
  const playlist = await prisma.playlist.findUnique({
    where: {
      id: playlistId,
      deletedAt: null,
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.userId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to modify this playlist",
    );
  }
  const problem = await prisma.problem.findUnique({
    where: {
      id: problemId,
      deletedAt: null,
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }
  const existingProblem = await prisma.problemInPlaylist.findFirst({
    where: {
      playlistId,
      problemId,
      deletedAt: null,
    },
  });

  if (existingProblem) {
    throw new ApiError(400, "Problem already exists in this playlist");
  }

  const lastProblem = await prisma.problemInPlaylist.findFirst({
    where: {
      playlistId,
      deletedAt: null,
    },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const nextOrder = lastProblem ? lastProblem.order + 1 : 1;

  const problemInPlaylist = await prisma.problemInPlaylist.create({
    data: {
      playlistId,
      problemId,
      order: nextOrder,
      notes: notes || null,
    },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          tags: true,
        },
      },
    },
  });

  logger.info("Problem added to playlist", { playlistId, problemId, userId });

  return problemInPlaylist;
};

export const removeProblemFromPlaylist = async (
  playlistId,
  problemId,
  userId,
) => {
  const playlist = await prisma.playlist.findUnique({
    where: {
      id: playlistId,
      deletedAt: null,
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.userId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to modify this playlist",
    );
  }
  const problemInPlaylist = await prisma.problemInPlaylist.findFirst({
    where: {
      playlistId,
      problemId,
      deletedAt: null,
    },
  });

  if (!problemInPlaylist) {
    throw new ApiError(404, "Problem not found in this playlist");
  }

  await prisma.problemInPlaylist.update({
    where: { id: problemInPlaylist.id },
    data: { deletedAt: new Date() },
  });

  logger.info("Problem removed from playlist", {
    playlistId,
    problemId,
    userId,
  });

  return { message: "Problem removed from playlist successfully" };
};

export const reorderProblems = async (playlistId, problemOrders, userId) => {
  const playlist = await prisma.playlist.findUnique({
    where: {
      id: playlistId,
      deletedAt: null,
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.userId !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to modify this playlist",
    );
  }

  await Promise.all(
    problemOrders.map(({ problemInPlaylistId, order }) =>
      prisma.problemInPlaylist.update({
        where: { id: problemInPlaylistId },
        data: { order },
      }),
    ),
  );

  logger.info("Playlist problems reordered", { playlistId, userId });

  return { message: "Problems reordered successfully" };
};

export const getPublicPlaylists = async (filters) => {
  const { page, limit, search } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    isPublic: true,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [playlists, total] = await Promise.all([
    prisma.playlist.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            problems: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageLimit,
    }),
    prisma.playlist.count({ where }),
  ]);

  const playlistsWithCount = playlists.map((p) => ({
    ...p,
    problemCount: p._count.problems,
  }));

  return createPaginatedResponse(playlistsWithCount, page, limit, total);
};