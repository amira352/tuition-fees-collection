import express from "express";

import {
  uploadFeesCsv,
  downloadUploadErrors
} from "../controllers/institutionFeeUpload.controller.js";

import {
  getInstitutionEppPlansController
} from "../controllers/institutionEppPlans.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

import {
  authorizeRoles
} from "../middleware/role.middleware.js";

import {
  authorizeInstitutionAccess
} from "../middleware/institutionAccess.middleware.js";

import {
  uploadXlsx,
} from "../middleware/upload.middleware.js";

import {
  getInstitutionFeesController, createInstitutionFeeController, editInstitutionFeeController, deleteInstitutionFeeController
} from "../controllers/institutionFees.controller.js";

import {
  deactivateChildController
} from "../controllers/children.controller.js";


const router = express.Router();


router.post(
  "/:id/fees/upload",

  authenticate(),

  authorizeRoles("institution"),

  authorizeInstitutionAccess,

  uploadXlsx.single("file"),
  
  uploadFeesCsv
);


router.get(
  "/:id/uploads/:uploadId/errors",

  authenticate(),

  authorizeRoles("institution"),

  authorizeInstitutionAccess,

  downloadUploadErrors
);


router.get(
  "/:id/fees",
  authenticate(),
  authorizeRoles("institution"),
  authorizeInstitutionAccess,
  getInstitutionFeesController
);

router.post(
  "/:id/fees",
  authenticate(),
  authorizeRoles("institution"),
  authorizeInstitutionAccess,
  createInstitutionFeeController
);

router.put(
  "/:id/fees/:feeId",
  authenticate(),
  authorizeRoles("institution"),
  authorizeInstitutionAccess,
  editInstitutionFeeController
);

router.delete(
  "/:id/fees/:feeId",
  authenticate(),
  authorizeRoles("institution"),
  authorizeInstitutionAccess,
  deleteInstitutionFeeController
);

router.put(
  "/:id/children/:childId/deactivate",
  authenticate(),
  authorizeRoles("institution"),
  authorizeInstitutionAccess,
  deactivateChildController
);

router.get(
  "/:id/epp-plans",

  authenticate(),

  authorizeRoles("institution", "back_office", "admin"),

  getInstitutionEppPlansController
);

export default router;