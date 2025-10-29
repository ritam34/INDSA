import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as statsService from '../services/stats.service.js';

/**
 * @route   GET /api/stats/leaderboard
 * @desc    Get global leaderboard
 * @access  Public
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 100, sortBy = 'reputation' } = req.query;
  
  const leaderboard = await statsService.getLeaderboard(
    parseInt(limit), 
    sortBy
  );
  
  return res.status(200).json(
    new ApiResponse(200, leaderboard, 'Leaderboard fetched successfully')
  );
});

/**
 * @route   POST /api/stats/update-rankings
 * @desc    Update global rankings (Admin only)
 * @access  Private (Admin)
 */
export const updateRankings = asyncHandler(async (req, res) => {
  await statsService.updateGlobalRanking();
  
  return res.status(200).json(
    new ApiResponse(200, null, 'Rankings updated successfully')
  );
});

