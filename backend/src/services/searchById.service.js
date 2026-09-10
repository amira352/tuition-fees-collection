import {
  findParentByNationalIdHmac,
  getParentChildrenWithFees
} from "../repositories/parent.repository.js";

import {
  createNationalIdLookupAudit
} from "../repositories/nationalIdAudit.repository.js";

import {
  validateNationalIdWithMOI
} from "./external/moi.service.js";

import {
  createNationalIdHmac
} from "../utils/hmac.js";


export const searchParentByNationalId = async ({
  nationalId,
  bankEmployeeId
}) => {

  // 1. Validate format
  if (!/^\d{14}$/.test(nationalId)) {
    const error = new Error(
      "National ID must contain exactly 14 digits"
    );

    error.statusCode = 400;

    throw error;
  }


  // 2. Call MOI FIRST
  const moiResult =
    await validateNationalIdWithMOI(
      nationalId
    );


  // 3. Create HMAC
  const nationalIdHmac =
    createNationalIdHmac(nationalId);


  // 4. If MOI says invalid
  if (!moiResult.valid) {

    await createNationalIdLookupAudit({
      bankEmployeeId,
      nationalIdHmac,
      resultFound: false
    });

    const error = new Error(
      "National ID could not be verified"
    );

    error.statusCode = 400;

    error.details = moiResult.reasons;

    throw error;
  }


  // 5. Search YOUR database
  const parent =
    await findParentByNationalIdHmac(
      nationalIdHmac
    );


  // 6. Parent not found in tuition system
  if (!parent) {

    await createNationalIdLookupAudit({
      bankEmployeeId,
      nationalIdHmac,
      resultFound: false
    });

    return {
      found: false,
      message:
        "National ID is valid, but no tuition fee records were found"
    };
  }


  // 7. Get children + fees
  const children =
    await getParentChildrenWithFees(
      parent.id
    );


  // 8. Audit successful lookup
  await createNationalIdLookupAudit({
    bankEmployeeId,
    nationalIdHmac,
    resultFound: true
  });


  // 9. Return result
  return {
    found: true,

    parent: {
      id: parent.id,
      name: parent.name,
      is_cib_customer:
        parent.is_cib_customer
    },

    children
  };
};