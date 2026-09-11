import express from "express";

import {
  addBackOfficeUser,
  addInstitutionUser,
  listUsers,
  deleteInstitutionController,
  deleteBankEmployeeController
} from "../controllers/admin.controller.js";

import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// Everything below is admin only.
router.use(authenticate(), requireRole("admin"));

router.post("/users/back-office", addBackOfficeUser);

router.post("/users/institution", addInstitutionUser);

router.get("/users", listUsers);


router.delete(
  "/institutions/:institutionId", deleteInstitutionController);



router.delete(
  "/bank-employees/:employeeId", deleteBankEmployeeController);

export default router;
