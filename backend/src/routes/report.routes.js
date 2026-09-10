import express from "express";

import { getDailyReport } from "../controllers/report.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/institutions/:id/reports/daily",
  authenticate(),
  requireRole("back_office", "admin"),
  getDailyReport
);

export default router;
