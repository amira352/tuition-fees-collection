import express from "express";

import { getQuotes, createPlan } from "../controllers/epp.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate(), requireRole("back_office", "admin"));

router.get("/quotes", getQuotes);
router.post("/", createPlan);

export default router;
