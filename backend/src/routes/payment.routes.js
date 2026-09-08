import express from "express";

import { payFees } from "../controllers/payment.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate(), requireRole("back_office", "admin"));

router.post("/", payFees);

export default router;
