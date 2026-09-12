import express from "express";

import {
  uploadFeesCsv,
  downloadUploadErrors
} from "../controllers/institutionFeeUpload.controller.js";

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
  getInstitutionFeesController
} from "../controllers/institutionFees.controller.js";


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
  getInstitutionFeesController
);


export default router;