import { Router } from "express";
import { castVote, getVoteResults } from "../controllers/vote.controller.js";
import { authenticateUser, authorizeRoles } from "../middlewares/validate.user.middleware.js";

const router = Router();

router.get("/:milestoneId", getVoteResults);

router.post("/:milestoneId", authenticateUser, (req, res, next) => {
  console.log("User role:", req.user.role);
  next();
}, authorizeRoles("Donor"), castVote);

export default router;