import { Router } from "express";
import { castVote, getVoteResults } from "../controllers/vote.controller.js";
import { authenticateUser } from "../middlewares/validate.user.middleware.js";

const router = Router();

// Public route to view vote results/status for a milestone
router.get("/:milestoneId", getVoteResults);

// Protected route for a donor to cast their vote
router.post("/:milestoneId", authenticateUser, castVote);

export default router;
