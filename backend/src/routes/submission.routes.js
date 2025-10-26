import Router from "express";

import {
    getSubmission,
    getSubmissionForProblem,
    getSubmissionCount,
} from "../controllers/submission.controllers.js";

const router = Router();

router.route("/").get(getSubmission);
router.route("/:id").get(getSubmissionForProblem);
router.route("/submission-count/:id").get(getSubmissionCount);

export default router;