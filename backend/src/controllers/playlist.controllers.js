import {db} from '../db/db.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/apiError.js';
import {ApiResponse} from '../utils/apiResponse.js';

export const getPlaylists = asyncHandler(async (req, res) => {
    try {
        const UserId="e9ee970c-3546-4f92-92b6-71d571d898fa";
        const playlists = await db.playlist.findMany({
            where: {
                userId: UserId
            },
            include: {
                problems: {
                    include: {
                        problem: true
                    }
                }
            }
        })
        if (!playlists) {
            throw new ApiError(404, "No playlists found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const getPlaylistById = asyncHandler(async (req, res) => {
    try {
        const {playlistId} = req.params;
        const playlist = await db.playlist.findUnique({
            where: {
                userId: "e9ee970c-3546-4f92-92b6-71d571d898fa",
                id: playlistId
            },
            include: {
                problems: {
                    include: {
                        problem: true
                    }
                }
            }
        })
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const createPlaylist = asyncHandler(async (req, res) => {
    try {
        const { name, description } = req.body;
        const userId="e9ee970c-3546-4f92-92b6-71d571d898fa";
        const playlist = await db.playlist.create({
            data: {
                name,
                description,
                userId
            }
        })
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Playlist created successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const updatePlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { name, description } = req.body;
        const playlist = await db.playlist.update({
            where: {
                id: playlistId
            },
            data: {
                name,
                description
            }
        })
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const deletePlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params;
        const playlist = await db.playlist.delete({
            where: {
                id: playlistId
            }
        })
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Playlist deleted successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const addProblemsToPlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { problemIds } = req.body;
        if (!problemIds || problemIds.length === 0) {
            throw new ApiError(
                400,
                "Request body cannot be empty or you must provide at least one problem id",
            );
        }
        const problemInPlaylist = await db.problemInPlaylist.createMany({
            data: problemIds.map((problemId) => ({
                problemId,
                playlistId
            }))
        })
        if (!problemInPlaylist) {
            throw new ApiError(404, "Error adding problems to playlist");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, problemInPlaylist, "Problems added to playlist successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});
export const removeProblemsFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { problemIds } = req.body;
    try {
        if (!problemIds || problemIds.length === 0) {
            throw new ApiError(
                400,
                "Request body cannot be empty or you must provide at least one problem id",
            );
        }
        const deleteProblemFromPlaylist = await db.problemInPlaylist.deleteMany({
            where: {
                playlistId,
                problemId: {
                    in: problemIds
                }
            }
        })
        if (!deleteProblemFromPlaylist) {
            throw new ApiError(404, "Error removing problems from playlist");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, deleteProblemFromPlaylist, "Problems removed from playlist successfully"));
    } catch (error) {
        throw new ApiError(500, error.message);
    }
});