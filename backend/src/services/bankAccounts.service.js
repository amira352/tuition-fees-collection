import { createNationalIdHmac } from "../utils/hmac.js";
import { createNationalIdLookupAudit } from "../repositories/nationalIdAudit.repository.js";
import { validateNationalIdWithMOI } from "./external/moi.service.js";
import { getCustomerAccounts } from "./bank.client.js";

/**
 * BE-3 item 1: given a national ID, return that customer's accounts and
 * cards so the back office can choose one. Follows the exact same
 * validate-then-audit pattern as searchById.service.js, reusing the same
 * HMAC utility and audit repository rather than inventing a second path.
 */
export const lookupCustomerAccounts = async ({ nationalId, bankEmployeeId }) => {
  if (!/^\d{14}$/.test(nationalId)) {
    const error = new Error("National ID must contain exactly 14 digits");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.field = "nationalId";
    throw error;
  }

  const moiResult = await validateNationalIdWithMOI(nationalId);
  const nationalIdHmac = createNationalIdHmac(nationalId);

  if (!moiResult.valid) {
    await createNationalIdLookupAudit({ bankEmployeeId, nationalIdHmac, resultFound: false });
    const error = new Error("National ID could not be verified");
    error.statusCode = 400;
    error.code = "VERIFICATION_FAILED";
    error.field = "nationalId";
    error.details = moiResult.reasons;
    throw error;
  }

  const result = await getCustomerAccounts(nationalId);
  await createNationalIdLookupAudit({ bankEmployeeId, nationalIdHmac, resultFound: true });

  return result;
};
