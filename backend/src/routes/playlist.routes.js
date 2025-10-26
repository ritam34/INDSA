import Router  from "express";

import {
    getPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addProblemsToPlaylist,
    removeProblemsFromPlaylist
} from "../controllers/playlist.controllers.js";

const router = Router();

router.route("/").get(getPlaylists).post(createPlaylist);
router.route("/:playlistId").get(getPlaylistById).put(updatePlaylist).delete(deletePlaylist);
router.route("/:playlistId/add-problems").post(addProblemsToPlaylist);
router.route("/:playlistId/remove-problems").delete(removeProblemsFromPlaylist);

export default router;