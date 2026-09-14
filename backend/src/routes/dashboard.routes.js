import express from "express";

import { dashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate(), requireRole("back_office", "admin", "institution"));

router.get("/summary", dashboardSummary);

export default router;
