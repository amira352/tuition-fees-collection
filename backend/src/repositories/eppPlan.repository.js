import { supabase } from "../config/supabase.js";

export const createEppPlanRecord = async ({
  paymentId,
  providerPlanId,
  tenorMonths,
  principal,
  interest,
  adminFee,
  totalAmount,
  monthlyInstalment,
  startDate,
  annualRate
}) => {
  const { data, error } = await supabase
    .from("epp_plans")
    .insert({
      payment_id: paymentId,
      provider_plan_id: providerPlanId,
      tenor_months: tenorMonths,
      principal,
      interest,
      admin_fee: adminFee,
      total_amount: totalAmount,
      monthly_instalment: monthlyInstalment,
      start_date: startDate,
      annual_rate: annualRate,
      instalments_paid: 0
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const findEppPlanByPaymentId = async (paymentId) => {
  const { data, error } = await supabase
    .from("epp_plans")
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
