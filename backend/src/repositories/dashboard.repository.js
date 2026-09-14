import { supabase } from "../config/supabase.js";

export const fetchDashboardSummary = async ({
  employeeId,
  institutionId,
  timezone
}) => {
  const { data, error } = await supabase.rpc("dashboard_summary", {
    p_employee_id: employeeId,
    p_institution_id: institutionId || null,
    p_timezone: timezone
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
