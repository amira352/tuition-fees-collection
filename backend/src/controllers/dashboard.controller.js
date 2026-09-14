import { getDashboard } from "../services/dashboard.service.js";

export const dashboardSummary = async (req, res, next) => {
  try {
    const summary = await getDashboard(req.user, req.query.institutionId);
    return res.status(200).json({ summary });
  } catch (error) {
    next(error);
  }
};
