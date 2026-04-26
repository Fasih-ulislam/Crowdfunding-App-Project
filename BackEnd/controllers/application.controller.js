import * as applicationService from "../services/application.service.js";
import { applicationSchema, applicationApprovalSchema } from "../utils/validation.js";
import ResponseError from "../utils/customError.js";
import { queueNotificationJob } from "../services/queueService.js";

// 🟩 Submit a new application
export async function submitApplication(req, res, next) {
  try {
    const { error } = applicationSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const data = req.user;
    const application = await applicationService.submitApplication(data.id, req.body);
    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (err) {
    next(err);
  }
}

// 🟦 Get my applications
export async function getMyApplications(req, res, next) {
  try {
    const data = req.user;
    const applications = await applicationService.getMyApplications(data.id);
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

// 🟨 Get all applications (admin only)
export async function getAllApplications(req, res, next) {
  try {
    const applications = await applicationService.getAllApplications();
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

// 🟧 Approve or reject application (admin only)
export async function approveOrRejectApplication(req, res, next) {
  try {
    const { error } = applicationApprovalSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const applicationId = req.params.id;
    const admin = req.user;
    const application = await applicationService.approveOrRejectApplication(
      applicationId,
      { ...req.body, reviewed_by: admin.id }
    );
    if (!application) throw new ResponseError("Application doesn't exist", 404);
    res.json({ message: "Application updated successfully", application });

    // Queue notification
    await queueNotificationJob("ROLE_APPLICATION_UPDATED", {
      userId: application.user_id,
      type: "SYSTEM_ALERT",
      message: `Your creator application has been ${req.body.status}.`,
      metadata: { status: req.body.status },
    });
  } catch (err) {
    next(err);
  }
}
