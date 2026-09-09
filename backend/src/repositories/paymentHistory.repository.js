import { supabase } from "../config/supabase.js";

// payment_items is !inner so a child or institution filter can reach through
// it. Every payment has at least one item, so it changes nothing when no
// filter is given. receipts stays a plain embed - a failed payment has none.
const HISTORY_FIELDS = `
  id,
  amount,
  payment_type,
  status,
  failure_reason,
  created_at,
  parents ( id, name ),
  receipts ( receipt_number, issued_at ),
  payment_items!inner (
    amount,
    fees!inner (
      fee_type,
      period,
      children!inner ( id, name, student_code, institution_id,
                       institutions ( name ) )
    )
  ),
  payment_tenders ( method, account_ref, amount, status, provider_ref )
`;

export const findPayments = async ({
  parentId,
  childId,
  institutionId,
  status,
  from,
  to,
  limit,
  offset
}) => {
  let query = supabase
    .from("payments")
    .select(HISTORY_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (parentId) {
    query = query.eq("parent_id", parentId);
  }

  if (childId) {
    query = query.eq("payment_items.fees.children.id", childId);
  }

  if (institutionId) {
    query = query.eq("payment_items.fees.children.institution_id", institutionId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { rows: data || [], total: count || 0 };
};
