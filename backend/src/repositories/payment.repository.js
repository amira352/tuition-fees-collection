import { supabase } from "../config/supabase.js";

// anything raised inside the postgres function arrives here as error.message.
// those are all validation failures, so 400 rather than 500.
const fromDatabase = (error) => {
  const err = new Error(error.message);
  err.statusCode = 400;
  return err;
};

export const createPendingPayment = async ({
  parentId,
  employeeId,
  paymentType,
  items,
  tenders
}) => {
  const { data, error } = await supabase.rpc("create_pending_payment", {
    p_parent_id: parentId,
    p_employee_id: employeeId,
    p_payment_type: paymentType,
    p_items: items,
    p_tenders: tenders
  });

  if (error) {
    throw fromDatabase(error);
  }

  return data;
};

export const settlePayment = async (paymentId, tenderRefs) => {
  const { error } = await supabase.rpc("settle_payment", {
    p_payment_id: paymentId,
    p_tender_refs: tenderRefs
  });

  if (error) {
    throw fromDatabase(error);
  }
};

export const findTendersByPayment = async (paymentId) => {
  const { data, error } = await supabase
    .from("payment_tenders")
    .select("id, method, account_ref, amount, status")
    .eq("payment_id", paymentId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const markPaymentFailed = async (paymentId) => {
  await supabase
    .from("payment_tenders")
    .update({ status: "failed" })
    .eq("payment_id", paymentId)
    .eq("status", "pending");

  const { error } = await supabase
    .from("payments")
    .update({ status: "failed" })
    .eq("id", paymentId);

  if (error) {
    throw new Error(error.message);
  }
};

export const findPaymentById = async (paymentId) => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      payment_type,
      status,
      created_at,
      payment_items ( fee_id, amount ),
      payment_tenders ( id, method, account_ref, amount, status, provider_ref )
    `)
    .eq("id", paymentId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
