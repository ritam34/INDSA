import badgeService from "../services/badge.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

/**
 * Get all badges
 * @route GET /api/badges
 */
export const getAllBadges = asyncHandler(async (req, res) => {
  const { type, rarity, isActive } = req.query;

  const badges = await badgeService.getAllBadges({
    type,
    rarity,
    isActive: isActive === "false" ? false : true,
  });

  res
    .status(200)
    .json(new ApiResponse(200, badges, "Badges retrieved successfully"));
});

/**
 * Get badge by ID
 * @route GET /api/badges/:id
 */
export const getBadgeById = asyncHandler(async (req, res) => {
  const badge = await badgeService.getBadgeById(req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, badge, "Badge retrieved successfully"));
});

/**
 * Get current user's badges
 * @route GET /api/badges/my-badges
 */
export const getMyBadges = asyncHandler(async (req, res) => {
  const { type, rarity, includeProgress } = req.query;

  const badges = await badgeService.getUserBadges(req.user.id, {
    category: type,
    rarity,
    includeProgress: includeProgress === "true",
  });

  res
    .status(200)
    .json(new ApiResponse(200, badges, "User badges retrieved successfully"));
});

/**
 * Get user badges by username
 * @route GET /api/badges/user/:username
 */
export const getUserBadges = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { type, rarity } = req.query;

  // Get user by username
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const badges = await badgeService.getUserBadges(user.id, {
    category: type,
    rarity,
    includeProgress: false,
  });

  res
    .status(200)
    .json(new ApiResponse(200, badges, "User badges retrieved successfully"));
});

/**
 * Check and award eligible badges
 * @route POST /api/badges/check-eligibility
 */
export const checkEligibility = asyncHandler(async (req, res) => {
  const newBadges = await badgeService.checkAndAwardBadges(req.user.id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        newBadgesCount: newBadges.length,
        badges: newBadges,
      },
      newBadges.length > 0
        ? `Congratulations! You earned ${newBadges.length} new badge(s)!`
        : "No new badges earned",
    ),
  );
});

/**
 * Get badge progress
 * @route GET /api/badges/:id/progress
 */
export const getBadgeProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const badge = await badgeService.getBadgeById(id);
  const progress = await badgeService.calculateBadgeProgress(
    req.user.id,
    badge,
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, progress, "Badge progress retrieved successfully"),
    );
});

/**
 * Get badge leaderboard
 * @route GET /api/badges/leaderboard
 */
export const getBadgeLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const leaderboard = await badgeService.getBadgeLeaderboard(parseInt(limit));

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        leaderboard,
        "Badge leaderboard retrieved successfully",
      ),
    );
});

/**
 * Get rarity statistics
 * @route GET /api/badges/statistics/rarity
 */
export const getRarityStatistics = asyncHandler(async (req, res) => {
  const stats = await badgeService.getRarityStatistics();

  res
    .status(200)
    .json(
      new ApiResponse(200, stats, "Rarity statistics retrieved successfully"),
    );
});

/**
 * Create new badge
 * @route POST /api/badges
 * @access Admin
 */
export const createBadge = asyncHandler(async (req, res) => {
  const badge = await badgeService.createBadge(req.body);

  res
    .status(201)
    .json(new ApiResponse(201, badge, "Badge created successfully"));
});

/**
 * Update badge
 * @route PATCH /api/badges/:id
 * @access Admin
 */
export const updateBadge = asyncHandler(async (req, res) => {
  const badge = await badgeService.updateBadge(req.params.id, req.body);

  res
    .status(200)
    .json(new ApiResponse(200, badge, "Badge updated successfully"));
});

/**
 * Delete badge
 * @route DELETE /api/badges/:id
 * @access Admin
 */
export const deleteBadge = asyncHandler(async (req, res) => {
  await badgeService.deleteBadge(req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Badge deleted successfully"));
});