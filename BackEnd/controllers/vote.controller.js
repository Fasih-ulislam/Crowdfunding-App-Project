import * as voteService from "../services/vote.service.js";
import ResponseError from "../utils/customError.js";
import { voteSchema } from "../utils/validation.js";

export async function castVote(req, res, next) {
  try {
    const { error } = voteSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const milestoneId = req.params.milestoneId;
    const donorId = req.user.id;
    const { vote } = req.body;

    // The service handles inserting the vote.
    // If the database trigger fails (e.g., user didn't donate), it will throw an error 
    // that our globalErrorHandler will catch.
    const newVote = await voteService.submitVote(donorId, milestoneId, vote);

    res.status(201).json({
      message: "Vote cast successfully",
      vote: newVote,
    });
  } catch (err) {
    // If the error comes from our PostgreSQL trigger regarding eligibility
    if (err.message && err.message.includes('Donor has not donated')) {
      next(new ResponseError("You must donate to this milestone before you can vote.", 403));
    } else {
      next(err);
    }
  }
}

export async function getVoteResults(req, res, next) {
  try {
    const milestoneId = req.params.milestoneId;

    // Fetch the results and counts from the service
    const results = await voteService.getVoteResults(milestoneId);

    if (!results) {
      return res.status(200).json({ message: "No final vote results yet or milestone does not exist." });
    }

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
}
