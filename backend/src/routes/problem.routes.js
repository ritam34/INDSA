import { Router } from "express";
import {
  createProblem,
  getProblem,
  getProblemsById,
  deleteProblem,
  updateProblem,
  getAllSlovedProblems
} from "../controllers/problem.controllers.js";

const router = Router();

router.route("/").post(createProblem).get(getProblem);
router
  .route("/:id")
  .get(getProblemsById)
  .put(updateProblem)
  .delete(deleteProblem);

router.route("/solved").get(getAllSlovedProblems);

export default router;
