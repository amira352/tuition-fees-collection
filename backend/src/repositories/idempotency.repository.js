import { supabase } from "../config/supabase.js";

const UNIQUE_VIOLATION = "23505";

// Tries to claim the key. Returns null if somebody else already has it -
// the primary key is what decides, so two requests arriving at the same
// moment can never both win.
export const claimKey = async (key, fingerprint) => {
  const { data, error } = await supabase
    .from("payment_idempotency")
    .insert({ idempotency_key: key, request_fingerprint: fingerprint })
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
};

export const findKey = async (key) => {
  const { data, error } = await supabase
    .from("payment_idempotency")
    .select("idempotency_key, request_fingerprint, payment_id, status")
    .eq("idempotency_key", key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const completeKey = async (key, paymentId) => {
  const { error } = await supabase
    .from("payment_idempotency")
    .update({ status: "completed", payment_id: paymentId })
    .eq("idempotency_key", key);

  if (error) {
    throw new Error(error.message);
  }
};

// The payment failed, so let the same key be used again. Otherwise a
// declined card would burn the key and the agent could never retry.
export const releaseKey = async (key) => {
  await supabase
    .from("payment_idempotency")
    .delete()
    .eq("idempotency_key", key);
};
