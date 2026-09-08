import express from "express";

import {
  loginUser,
  changeUserPassword
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/loginUser", loginUser);

// Reachable with a password_change token, so a user who was just created by
// an admin can set their own password before doing anything else.
router.post(
  "/change-password",
  authenticate({ allowPasswordChangeScope: true }),
  changeUserPassword
);

export default router;
