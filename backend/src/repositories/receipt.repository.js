import { supabase } from "../config/supabase.js";

// Issues the receipt, or hands back the one this payment already has.
export const issueReceipt = async (paymentId, employeeId) => {
  const { data, error } = await supabase.rpc("issue_receipt", {
    p_payment_id: paymentId,
    p_employee_id: employeeId
  });

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 400;
    err.code = "RECEIPT_NOT_ISSUED";
    throw err;
  }

  return data;
};

// Everything a receipt has to print, in one query. The nested selects walk
// payment -> items -> fee -> child, and payment -> tenders.
const RECEIPT_FIELDS = `
  id,
  receipt_number,
  issued_at,
  payments (
    id,
    amount,
    payment_type,
    status,
    created_at,
    parents ( name ),
    payment_items (
      amount,
      fees ( fee_type, period,
             children ( name, student_code, institutions ( name ) ) )
    ),
    payment_tenders ( method, account_ref, amount, status, provider_ref )
  ),
  bank_employees:issued_by ( full_name, branch )
`;

export const findReceiptByPaymentId = async (paymentId) => {
  const { data, error } = await supabase
    .from("receipts")
    .select(RECEIPT_FIELDS)
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const findReceiptByNumber = async (receiptNumber) => {
  const { data, error } = await supabase
    .from("receipts")
    .select(RECEIPT_FIELDS)
    .eq("receipt_number", receiptNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
