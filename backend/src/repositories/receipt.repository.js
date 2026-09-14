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

// Lighter than RECEIPT_FIELDS. The search result is a table, not a printed
// receipt, so it does not need the bank references or who issued it - the
// counter picks a row and opens the receipt, which already has all that.
const RECEIPT_SUMMARY_FIELDS = `
  receipt_number,
  issued_at,
  payments!inner (
    id,
    parent_id,
    amount,
    created_at,
    payment_items (
      amount,
      fees ( fee_type, period,
             children ( name, student_code, institutions ( name ) ) )
    ),
    payment_tenders ( method )
  )
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

// !inner on payments is what makes the filter below actually filter. Without
// it PostgREST still returns every receipt in the table and simply nulls out
// the payments that did not match - so you get the whole table back and think
// the query worked.
export const findReceiptsByParentId = async (
  parentId,
  { limit, offset }
) => {
  const { data, error, count } = await supabase
    .from("receipts")
    .select(RECEIPT_SUMMARY_FIELDS, { count: "exact" })
    .eq("payments.parent_id", parentId)
    .order("issued_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return { rows: data || [], total: count || 0 };
};
