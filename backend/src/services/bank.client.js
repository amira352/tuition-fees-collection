import axios from "axios";

// Same physical service as MOI validation (wit-mock-services) — card
// payments, MOI checks, and EPP all live behind this one mock server.
const bankClient = axios.create({
  baseURL: process.env.MOI_BASE_URL,
  headers: {
    "X-API-Key": process.env.MOI_API_KEY,
    "Content-Type": "application/json"
  },
  timeout: 10000
});

/**
 * Authorises money from one funding source for one payment leg.
 *
 * IMPORTANT for the team: this only receives {accountRef, amount}, per the
 * current tender shape in payment.service.js. wit-mock-services has no
 * same-bank "debit an account" endpoint at all — only MOI validation, card
 * payments, and EPP — so a plain account debit is honestly simulated below,
 * the same way a real CIB account-debit endpoint doesn't exist yet to call.
 *
 * Real card charging needs far more than {accountRef, amount} — a full
 * card number, holder name, expiry, CVV, the customer's national ID, and
 * an idempotency key — none of which fit in the current tender shape.
 * See authoriseCard() below: it's ready and calls the real mock, but
 * nothing wires into it yet, because that needs payment.service.js's
 * tender validation extended to carry a `card` object first. That's a
 * decision for whoever owns that file, not something to guess at here.
 */
export const authoriseFromAccount = async ({ accountRef, amount }) => {
  if (accountRef === "DECLINE") {
    return { approved: false, reason: "Insufficient funds" };
  }

  // --- SIMULATED — no real same-bank account-debit endpoint exists yet ---
  return {
    approved: true,
    providerRef: `SIMULATED-ACCT-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  };
};

export const reverseAuthorisation = async (providerRef) => {
  if (providerRef?.startsWith("SIMULATED-ACCT-")) {
    return { reversed: true, providerRef };
  }

  try {
    // void only works on a charge the bank has authorised but not yet taken.
    // We charge with capture: true, so most charges are already CAPTURED and
    // the money has to come back as a refund instead. Try void first because
    // it leaves nothing on the customer's statement; fall back to refund.
    let response;

    try {
      response = await bankClient.post(`/api/v1/payments/cards/${providerRef}/void`);
    } catch (voidError) {
      const state = voidError.response?.data?.error?.code;

      if (state !== "INVALID_PAYMENT_STATE") {
        throw voidError;
      }

      response = await bankClient.post(`/api/v1/payments/cards/${providerRef}/refund`);
    }
    return { reversed: true, providerRef, data: response.data };
  } catch (error) {
    console.error("Bank service error (void):", error.response?.data || error.message);
    const serviceError = new Error("Unable to reverse authorisation with the bank");
    serviceError.statusCode = 502;
    throw serviceError;
  }
};

/**
 * BE-3 item 3: real card charge against wit-mock-services. Not wired into
 * createPayment yet — see the note above authoriseFromAccount for why. A
 * timeout or no response at all is treated as genuinely UNKNOWN, never as
 * a decline — reporting "approved: false" here would wrongly tell the
 * caller it's safe to retry, when actually the charge might have gone
 * through and we just never heard back.
 */
export const authoriseCard = async ({ card, amount, orderReference, nationalId, mobile }) => {
  try {
    const response = await bankClient.post(
      "/api/v1/payments/cards",
      {
        card,
        amount: { value: amount, currency: "EGP" },
        order_reference: orderReference,
        customer: { national_id: nationalId, mobile },
        description: "Fee payment",
        capture: true
      },
      { headers: { "Idempotency-Key": orderReference } }
    );
    return {
      approved: response.data.status === "CAPTURED",
      status: response.data.status, // "CAPTURED" | "PENDING_3DS"
      providerRef: response.data.payment_id,
      raw: response.data
    };
  } catch (error) {
    const noResponse = error.code === "ECONNABORTED" || !error.response;
    if (noResponse) {
      const serviceError = new Error(
        "The bank did not confirm or deny this charge — outcome unknown, do not retry automatically"
      );
      serviceError.statusCode = 502;
      serviceError.outcomeUnknown = true;
      throw serviceError;
    }

    if (error.response.status === 402) {
      return { approved: false, reason: error.response.data?.error?.message || "Card declined" };
    }

    // The issuer itself broke. The bank answered, but it does not know the
    // outcome either - the charge may or may not have gone through. That is
    // the same situation as no answer at all, so it must not be reported as
    // a failure the caller can safely retry.
    if (error.response.status === 502 || error.response.status === 504) {
      const serviceError = new Error(
        error.response.data?.error?.message ||
          "The bank could not complete this charge and did not confirm the outcome"
      );
      serviceError.statusCode = 502;
      serviceError.outcomeUnknown = true;
      throw serviceError;
    }

    // The bank answered - it just did not accept what we sent. Saying
    // "unable to reach the bank" here sends whoever is debugging it looking
    // at the network, when the real problem is in our own request.
    const detail = error.response.data && error.response.data.error;
    const fields = detail && detail.details && detail.details.fields;

    console.error(
      `Bank rejected the card charge (HTTP ${error.response.status}):`,
      JSON.stringify(error.response.data)
    );

    const because = fields && fields.length
      ? fields.map((f) => `${f.field} - ${f.message}`).join("; ")
      : (detail && detail.message) || `HTTP ${error.response.status}`;

    const serviceError = new Error(`The bank rejected this charge: ${because}`);
    serviceError.statusCode = 502;
    serviceError.code = "BANK_REJECTED_REQUEST";
    throw serviceError;
  }
};

/** Confirms a PENDING_3DS card charge with the OTP the customer received. */
export const confirmCard3ds = async (providerRef, otp) => {
  try {
    const response = await bankClient.post(`/api/v1/payments/cards/${providerRef}/3ds`, { otp });
    return {
      approved: response.data.status === "CAPTURED",
      status: response.data.status,
      providerRef,
      raw: response.data
    };
  } catch (error) {
    console.error("Bank service error (3DS confirm):", error.response?.data || error.message);
    const serviceError = new Error("Unable to confirm 3D Secure with the bank");
    serviceError.statusCode = 502;
    throw serviceError;
  }
};

/**
 * BE-3 item 1: given a national ID, return the customer's accounts/cards
 * so the back office can pick one. wit-mock-services has no such endpoint
 * (only MOI validation, card charges, and EPP) — this is honestly
 * simulated, deterministic per national ID so the same customer sees the
 * same accounts across calls.
 */
export const getCustomerAccounts = async (nationalId) => {
  const seed = parseInt(nationalId.slice(-4), 10);
  return {
    accounts: [
      {
        account_id: `acc_${nationalId.slice(-6)}`,
        type: "CURRENT",
        iban_masked: `EG•• •••• •••• ${seed}`,
        currency: "EGP"
      }
    ],
    cards: [
      {
        card_id: `card_${nationalId.slice(-6)}`,
        masked_number: `4111 •••• •••• ${seed}`,
        scheme: "VISA",
        type: seed % 5 === 0 ? "DEBIT" : "CREDIT"
      }
    ]
  };
};

/** BE-3 items 5, 6, 7: quotes and plan creation, real calls to the mock. */
export const getEppQuotes = async (amount) => {
  try {
    const response = await bankClient.get(`/api/v1/epp/quotes?amount=${amount}`);
    return response.data;
  } catch (error) {
    console.error("Bank service error (EPP quotes):", error.response?.data || error.message);
    const serviceError = new Error("Unable to reach the bank for EPP quotes");
    serviceError.statusCode = 502;
    throw serviceError;
  }
};

export const createEppPlan = async ({ providerPaymentId, tenorMonths }) => {
  try {
    const response = await bankClient.post("/api/v1/epp", {
      payment_id: providerPaymentId,
      tenor_months: tenorMonths,
      product_name: "Tuition"
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 422) {
      const serviceError = new Error(error.response.data?.error?.message || "Not eligible for instalments");
      serviceError.statusCode = 422;
      serviceError.code = error.response.data?.error?.code || "CARD_NOT_ELIGIBLE";
      throw serviceError;
    }
    console.error("Bank service error (EPP create):", error.response?.data || error.message);
    const serviceError = new Error("Unable to reach the bank to create the instalment plan");
    serviceError.statusCode = 502;
    throw serviceError;
  }
};
