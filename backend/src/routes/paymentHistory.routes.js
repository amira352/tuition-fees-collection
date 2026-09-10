import express from "express";

import { paymentHistory } from "../controllers/paymentHistory.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate(), requireRole("back_office", "admin"));

router.get("/", paymentHistory);

export default router;
