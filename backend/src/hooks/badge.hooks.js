import badgeService from '../services/badge.service.js';

export const checkBadgesAfterSubmission = async (userId) => {
  try {
    const newBadges = await badgeService.checkAndAwardBadges(userId);
    return newBadges;
  } catch (error) {
    console.error('Error checking badges after submission:', error);
    return [];
  }
};

export const checkBadgesAfterContest = async (userId) => {
  try {
    const newBadges = await badgeService.checkAndAwardBadges(userId);
    return newBadges;
  } catch (error) {
    console.error('Error checking badges after contest:', error);
    return [];
  }
};

export const checkBadgesAfterCommunityActivity = async (userId) => {
  try {
    const newBadges = await badgeService.checkAndAwardBadges(userId);
    return newBadges;
  } catch (error) {
    console.error('Error checking badges after community activity:', error);
    return [];
  }
};

export const checkStreakBadges = async (userId) => {
  try {
    const newBadges = await badgeService.checkAndAwardBadges(userId);
    return newBadges;
  } catch (error) {
    console.error('Error checking streak badges:', error);
    return [];
  }
};